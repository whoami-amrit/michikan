import appConfig from '@config/app.config';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import type { Session, User } from 'db';
import { Provider } from 'db';
import type { Request, Response } from 'express';
import { ILoginDto, ISignupDto } from 'shared';
import { PrismaService } from 'src/infra/database/prisma.service';
import { SesService } from 'src/infra/email/ses.service';

import { IJwtAccessPayload } from '../../common/types/jwt-payload.interface';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  BCRYPT_SALT_ROUNDS,
  REFRESH_TOKEN_COOKIE_NAME,
  TOKEN_VALIDITY_MAP,
  VERIFY_EMAIL_PATH,
} from './constants';
import { IJwtEmailVerifyPayload, IJwtRefreshPayload, JwtTokenType } from './types';

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

    const verificationToken = await this.getSignedToken<IJwtEmailVerifyPayload>('email-verify', {
      sub: user.id,
      email: user.email,
    });
    const verificationLink = `https://${this.config.hostname}/${VERIFY_EMAIL_PATH}?token=${verificationToken}`;
    this.logger.debug(`Generated email verification link for user ${user.id}: ${verificationLink}`);
    await this.SesService.sendVerificationLink(user.email, verificationLink);

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

  async verifyEmail(verificationToken: string, req: Request): Promise<void> {
    const tokenPayload = await this.verifyToken<IJwtEmailVerifyPayload>(verificationToken, req);

    await this.prisma.account.update({
      where: {
        provider_providerId: {
          provider: Provider.LOCAL,
          providerId: tokenPayload.email,
        },
        userId: tokenPayload.sub,
      },
      data: {
        emailVerified: new Date(),
      },
    });
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
