import appConfig from '@config/app.config';
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { Session, User } from 'db';
import { Provider } from 'db';
import type { Request, Response } from 'express';
import { ILoginDto, ISignupDto } from 'shared';

import { IJwtAccessPayload } from '../../common/types/jwt-payload.interface';
import { PrismaService } from '../../infra/database/prisma.service';
import { SesService } from '../../infra/email/ses.service';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  BCRYPT_SALT_ROUNDS,
  OTP_LOCKOUT_WINDOW_MS,
  OTP_MAX_ATTEMPTS,
  OTP_VALIDITY_MS,
  REFRESH_TOKEN_COOKIE_NAME,
  TOKEN_VALIDITY_MAP,
} from './constants';
import { IJwtRefreshPayload, JwtTokenType } from './types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly SesService: SesService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async signup(createUserDto: ISignupDto, req: Request, res: Response): Promise<User> {
    const { password, userInfo } = createUserDto;

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        ...userInfo,
        accounts: {
          create: {
            provider: Provider.LOCAL,
            providerId: userInfo.email,
            hashedPassword,
          },
        },
      },
      include: {
        accounts: true,
      },
    });

    await this.sendOtp(user.id);

    await this.getTokensAndUpsertSession(
      user.id,
      crypto.randomUUID(),
      false,
      Provider.LOCAL,
      req,
      res,
    );

    return user;
  }

  async sendOtp(userId: User['id']): Promise<void> {
    const otp = crypto.randomInt(100000, 1000000);

    this.logger.debug(`Generated otp ${otp}`);

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const otpHash = this.hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_VALIDITY_MS);

    await this.prisma.verifyOtp.upsert({
      where: {
        userId,
      },
      update: {
        otpHash,
        expiresAt,
      },
      create: {
        otpHash,
        expiresAt,
        userId,
      },
    });

    await this.SesService.sendVerificationOtp(user.email, otp);
  }

  async resendOtp(userId: User['id']): Promise<void> {
    await this.registerOtpAttempt(userId);
    await this.sendOtp(userId);
  }

  async verifyOtp(userId: User['id'], otp: number, req: Request, res: Response): Promise<void> {
    const record = await this.registerOtpAttempt(userId);

    const otpHash = this.hashOtp(otp);
    if (record.otpHash !== otpHash || record.expiresAt.getTime() < Date.now()) {
      throw new UnprocessableEntityException('Invalid otp received!');
    }

    const account = await this.prisma.account.update({
      where: {
        provider_userId: {
          provider: Provider.LOCAL,
          userId,
        },
      },
      data: {
        emailVerified: new Date(),
      },
    });

    await this.getTokensAndUpsertSession(
      account.userId,
      crypto.randomUUID(),
      !!account.emailVerified,
      account.provider,
      req,
      res,
    );

    await this.prisma.verifyOtp.delete({ where: { userId } });
  }

  /**
   * Shared abuse guard for both verify-otp and resend-otp: caps combined
   * attempts at OTP_MAX_ATTEMPTS within a rolling OTP_LOCKOUT_WINDOW_MS
   * window, so resending can't be used to reset a verify lockout.
   */
  private async registerOtpAttempt(userId: User['id']) {
    const record = await this.prisma.verifyOtp.findUnique({ where: { userId } });

    if (!record) {
      throw new NotFoundException('No verification in progress for this user');
    }

    const now = Date.now();
    const windowActive =
      record.firstAttemptAt !== null &&
      now - record.firstAttemptAt.getTime() < OTP_LOCKOUT_WINDOW_MS;

    if (windowActive && record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new HttpException(
        'Too many otp attempts, try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return this.prisma.verifyOtp.update({
      where: { userId },
      data: {
        attempts: windowActive ? record.attempts + 1 : 1,
        firstAttemptAt: windowActive ? record.firstAttemptAt : new Date(now),
      },
    });
  }

  private hashOtp(otp: number): string {
    return crypto.createHash('sha256').update(String(otp)).digest('hex');
  }

  async login(loginDto: ILoginDto, req: Request, res: Response): Promise<void> {
    const { email, password } = loginDto;

    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider: Provider.LOCAL,
          providerId: email,
        },
      },
    });

    if (!account?.hashedPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, account.hashedPassword);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.getTokensAndUpsertSession(
      account.userId,
      crypto.randomUUID(),
      !!account.emailVerified,
      account.provider,
      req,
      res,
    );
  }

  logout(res: Response) {
    this.setAuthCookies(res, '', '');
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME] as string;
    if (!refreshToken) {
      throw new UnauthorizedException('You need to login once again');
    }

    const payload = await this.verifyToken<IJwtRefreshPayload>(refreshToken, req);

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid, userId: payload.sub },
      include: { account: true },
    });
    if (!session) {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      this.logger.log(`Refresh token expired for session ${session.id} of user ${session.userId}`);
      await this.prisma.session.delete({
        where: { id: session.id },
      });

      throw new UnauthorizedException('Refresh session has expired');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, session.tokenHash);
    if (!refreshTokenMatches) {
      const metadata = this.extractSessionMetadata(req);
      this.logger.warn(
        `Refresh token verified but did not match; sent from IP ${metadata.ip} with user-agent ${metadata.userAgent}`,
      );

      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const {
      account: { emailVerified, provider },
    } = session;
    await this.getTokensAndUpsertSession(
      session.userId,
      session.id,
      !!emailVerified,
      provider,
      req,
      res,
    );
  }

  private async getTokensAndUpsertSession(
    userId: User['id'],
    sessionId: string,
    verified: boolean,
    accountProvider: Provider,
    req: Request,
    res: Response,
  ) {
    const {
      accessToken,
      refreshToken,
      refreshTokenHash: tokenHash,
    } = await this.getTokens(userId, sessionId, verified);

    const expiresAt = new Date(Date.now() + TOKEN_VALIDITY_MAP.refresh);

    await this.prisma.session.upsert({
      where: { id: sessionId },
      update: {
        ...this.extractSessionMetadata(req),
        tokenHash,
        expiresAt,
      },
      create: {
        id: sessionId,
        userId,
        ...this.extractSessionMetadata(req),
        tokenHash,
        expiresAt,
        accountProvider,
      },
    });

    this.setAuthCookies(res, accessToken, refreshToken);
  }

  private async getTokens(userId: User['id'], sessionId: string, verified: boolean) {
    const accessToken = await this.getSignedToken<IJwtAccessPayload>('access', {
      sub: userId,
      plan: 'free',
      verified,
    });

    const refreshToken = await this.getSignedToken<IJwtRefreshPayload>('refresh', {
      sub: userId,
      sid: sessionId,
    });
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);

    return { accessToken, refreshToken, refreshTokenHash };
  }

  private async getSignedToken<T extends object>(type: JwtTokenType, payload: T) {
    return this.jwtService.signAsync(
      { ...payload, type },
      {
        secret: this.config.jwtSecret,
        expiresIn: `${TOKEN_VALIDITY_MAP[type]}Ms`,
      },
    );
  }

  private async verifyToken<T extends object>(token: string, req: Request) {
    try {
      return await this.jwtService.verifyAsync<T>(token, {
        secret: this.config.jwtSecret,
      });
    } catch {
      const metadata = this.extractSessionMetadata(req);
      this.logger.warn(
        `Invalid token provided from IP ${metadata.ip} with user-agent ${metadata.userAgent}`,
      );

      throw new UnauthorizedException('Token is invalid or expired');
    }
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const cookieBase = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: true,
      path: '/api/v1',
    };

    res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
      ...cookieBase,
      maxAge: TOKEN_VALIDITY_MAP.access,
    });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      ...cookieBase,
      maxAge: TOKEN_VALIDITY_MAP.refresh,
    });
  }

  private extractSessionMetadata(req: Request): Pick<Session, 'ip' | 'userAgent'> {
    return {
      ip: req.ip ?? req.socket.remoteAddress ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    };
  }
}
