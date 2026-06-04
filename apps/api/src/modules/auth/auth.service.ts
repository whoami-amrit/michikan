import type { Session, User } from '@db/client';
import { Provider } from '@db/client';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/infra/database/prisma.service';
import { SesService } from 'src/infra/email/ses.service';

import { IJwtAccessPayload } from '../../common/types/jwt-payload.interface';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  ACCESS_TOKEN_TTL_MS,
  BCRYPT_SALT_ROUNDS,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
} from './constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { IJwtRefreshPayload } from './types';

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

  async register(createUserDto: RegisterDto, req: Request, res: Response): Promise<User> {
    const { email, password, name } = createUserDto;

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const verificationToken = crypto.randomUUID();

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        accounts: {
          create: {
            provider: Provider.LOCAL,
            providerId: email,
            verificationToken,
            hashedPassword,
          },
        },
      },
      include: {
        accounts: true,
      },
    });

    await this.SesService.sendVerificationLink(
      user.email,
      `https://michikan.dev/verify-email?token=${verificationToken}&id=${user.accounts[0].userId}`,
    );

    await this.getTokensAndUpsertSession(user.id, crypto.randomUUID(), req, res);

    return user;
  }

  async verifyEmail(userId: User['id'], userEmail: User['email']): Promise<void> {
    await this.prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider: Provider.LOCAL,
          providerId: userEmail,
        },
        userId,
      },
    });
  }

  async login(loginDto: LoginDto, req: Request, res: Response): Promise<void> {
    const { email, password } = loginDto;

    const account = await this.prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider: Provider.LOCAL,
          providerId: email,
        },
      },
    });

    if (!account || !account.hashedPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, account.hashedPassword);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.getTokensAndUpsertSession(account.userId, crypto.randomUUID(), req, res);
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME] as string;
    if (!refreshToken) {
      throw new UnauthorizedException('You need to login once again');
    }

    const payload = await this.verifyToken(refreshToken, req);

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sid },
    });
    if (!session || session.userId !== payload.sub) {
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

    await this.getTokensAndUpsertSession(session.userId, session.id, req, res);
  }

  private async getTokensAndUpsertSession(
    userId: User['id'],
    sessionId: string,
    req: Request,
    res: Response,
  ) {
    const {
      accessToken,
      refreshToken,
      refreshTokenHash: tokenHash,
    } = await this.getTokens(userId, sessionId);

    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

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
      },
    });

    this.setAuthCookies(res, accessToken, refreshToken);
  }

  private async getTokens(userId: User['id'], sessionId: string) {
    const accessToken = await this.getSignedAccessToken<IJwtAccessPayload>('access', {
      sub: userId,
      plan: 'free',
    });

    const refreshToken = await this.getSignedAccessToken<IJwtRefreshPayload>('refresh', {
      sub: userId,
      sid: sessionId,
    });
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);

    return { accessToken, refreshToken, refreshTokenHash };
  }

  private async getSignedAccessToken<T extends object>(type: 'access' | 'refresh', payload: T) {
    return this.jwtService.signAsync(
      { ...payload, type },
      {
        secret: this.config.jwtSecret,
        expiresIn: `${type === 'access' ? ACCESS_TOKEN_TTL_MS : REFRESH_TOKEN_TTL_MS}Ms`,
      },
    );
  }

  private async verifyToken(token: string, req: Request) {
    try {
      return await this.jwtService.verifyAsync<IJwtRefreshPayload>(token, {
        secret: this.config.jwtSecret,
      });
    } catch {
      const metadata = this.extractSessionMetadata(req);
      this.logger.warn(
        `Invalid refresh token provided from IP ${metadata.ip} with user-agent ${metadata.userAgent}`,
      );

      throw new UnauthorizedException('Refresh token is invalid or expired');
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
      maxAge: ACCESS_TOKEN_TTL_MS,
    });

    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      ...cookieBase,
      maxAge: REFRESH_TOKEN_TTL_MS,
    });
  }

  private extractSessionMetadata(req: Request): Pick<Session, 'ip' | 'userAgent'> {
    return {
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    };
  }
}
