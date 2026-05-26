import type { Prisma, Session, User } from '@db/client';
import { Provider } from '@db/client';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/infra/database/prisma.service';

import { IJwtAccessPayload } from '../../common/types/jwt-payload.interface';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  ACCESS_TOKEN_TTL_MS,
  BCRYPT_SALT_ROUNDS,
  REFRESH_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_TTL_MS,
} from './constants';
import { LoginRequestDto } from './dto/login.dto';
import { RegisterRequestDto } from './dto/register.dto';
import { IJwtRefreshPayload } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(appConfig.KEY)
    private readonly config: ConfigType<typeof appConfig>,
  ) {}

  async register(
    createUserDto: RegisterRequestDto,
    req: Request,
    res: Response,
  ): Promise<Prisma.UserModel> {
    const { email, password, name } = createUserDto;

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        account: {
          create: {
            provider: Provider.LOCAL,
            providerId: email,
            hashedPassword,
          },
        },
      },
      include: {
        account: true,
      },
    });

    await this.getTokensAndUpsertSession(user, crypto.randomUUID(), req, res);

    return user;
  }

  async login(loginDto: LoginRequestDto, req: Request, res: Response): Promise<void> {
    const { email, password } = loginDto;

    const account = await this.findLocalAccountByEmail(email, true);

    if (!account || !account.hashedPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, account.hashedPassword);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.getTokensAndUpsertSession(account.user, crypto.randomUUID(), req, res);
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME] as string;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.findSessionById(payload.sid, true);

    if (!session || session.userId !== payload.sub) {
      throw new UnauthorizedException('Refresh session is invalid or expired');
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.deleteSessionById(session.id);

      throw new UnauthorizedException('Refresh session has expired');
    }

    const refreshTokenMatches = await bcrypt.compare(refreshToken, session.tokenHash);

    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    await this.getTokensAndUpsertSession(session.user, session.id, req, res);
  }

  async createLocalAccount(
    email: string,
    hashedPassword: string,
    userId: number,
    txClient?: Prisma.TransactionClient,
  ) {
    return (txClient ?? this.prisma).account.create({
      data: {
        provider: Provider.LOCAL,
        providerId: email,
        hashedPassword,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async findLocalAccountByEmail(email: string, includeUser = false) {
    return this.prisma.account.findUnique({
      where: {
        provider_providerId: {
          provider: Provider.LOCAL,
          providerId: email,
        },
      },
      include: {
        user: includeUser,
      },
    });
  }

  async createSession(
    {
      id,
      userId,
      ip,
      userAgent,
      tokenHash,
    }: Prisma.SessionUncheckedCreateInput & Record<'userId', number>,
    txClient?: Prisma.TransactionClient,
  ) {
    return (txClient ?? this.prisma).session.create({
      data: {
        id,
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        ip,
        userAgent,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  async findSessionById(sessionId: string, includeUser = false) {
    return this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: includeUser,
      },
    });
  }

  async updateSession(sessionId: string, tokenHash: string, ip: string, userAgent: string) {
    return this.prisma.session.update({
      where: { id: sessionId },
      data: {
        tokenHash,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        ip,
        userAgent,
      },
    });
  }

  async deleteSessionById(sessionId: string) {
    return this.prisma.session.delete({
      where: { id: sessionId },
    });
  }

  async deleteAllSessionsByUserId(userId: number) {
    return this.prisma.session.deleteMany({
      where: { userId },
    });
  }

  private async getTokens(user: Prisma.UserModel, sessionId: string) {
    const accessToken = await this.getSignedAccessToken<IJwtAccessPayload>('access', {
      sub: user.id,
      plan: 'free',
    });

    const refreshToken = await this.getSignedAccessToken<IJwtRefreshPayload>('refresh', {
      sub: user.id,
      sid: sessionId,
    });
    const refreshTokenHash = await bcrypt.hash(refreshToken, BCRYPT_SALT_ROUNDS);

    return { accessToken, refreshToken, refreshTokenHash };
  }

  private async getTokensAndUpsertSession(
    user: User,
    sessionId: string,
    req: Request,
    res: Response,
  ) {
    const { accessToken, refreshToken, refreshTokenHash } = await this.getTokens(user, sessionId);

    await this.prisma.session.upsert({
      where: { id: sessionId },
      update: {
        ...this.extractSessionMetadata(req),
        tokenHash: refreshTokenHash,
      },
      create: {
        id: sessionId,
        userId: user.id,
        ...this.extractSessionMetadata(req),
        tokenHash: refreshTokenHash,
      },
    });

    this.setAuthCookies(res, accessToken, refreshToken);
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

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync<IJwtRefreshPayload>(token, {
        secret: this.config.jwtSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    const cookieBase = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: true,
      path: '/',
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
