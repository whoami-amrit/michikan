import type { Prisma } from '@db/client';
import { Provider } from '@db/client';
import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import type { Request, Response } from 'express';
import { PrismaService } from 'src/infra/database/prisma.service';

import { IJwtPayload } from '../../common/types/jwt-payload.interface';
import { UsersService } from '../users/users.service';
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
    private readonly usersService: UsersService,
  ) {}

  async register(
    createUserDto: RegisterRequestDto,
    req: Request,
    res: Response,
  ): Promise<Prisma.UserModel> {
    const { email, password, name } = createUserDto;

    const existingUser = await this.usersService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await this.prisma.$transaction(async (txClient) => {
      const createdUser = await this.usersService.create({ name, email }, txClient);

      await this.createLocalAccount(email, hashedPassword, createdUser.id, txClient);

      return createdUser;
    });

    await this.createSessionAndIssueTokens(user, req, res);

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

    await this.createSessionAndIssueTokens(account.user, req, res);
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME] as string;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.findSessionById(payload.sessionId, true);

    if (!session || session.userId !== payload.userId) {
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

    await this.rotateSessionTokens(session.user, session.id, req, res);
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

  private async createSessionAndIssueTokens(user: Prisma.UserModel, req: Request, res: Response) {
    const sessionId = crypto.randomUUID();
    const ip = this.getRequestIp(req);
    const userAgent = this.getUserAgent(req);
    const { accessToken, refreshTokenHash, refreshToken } =
      await this.getAccessAndHashedRefreshTokens(user, sessionId);

    await this.createSession({
      id: sessionId,
      userId: user.id,
      ip,
      userAgent,
      tokenHash: refreshTokenHash,
    });

    this.setAuthCookies(res, accessToken, refreshToken);
  }

  private async getAccessAndHashedRefreshTokens(user: Prisma.UserModel, sessionId: string) {
    const accessToken = await this.signAccessToken(user);
    const refreshToken = await this.signRefreshToken(user, sessionId);
    const refreshTokenHash = await this.encryptRefreshToken(refreshToken);

    return { accessToken, refreshToken, refreshTokenHash };
  }

  private async encryptRefreshToken(token: string) {
    return bcrypt.hash(token, BCRYPT_SALT_ROUNDS);
  }

  private async rotateSessionTokens(
    user: Prisma.UserModel,
    sessionId: string,
    req: Request,
    res: Response,
  ) {
    const { accessToken, refreshToken, refreshTokenHash } =
      await this.getAccessAndHashedRefreshTokens(user, sessionId);

    await this.updateSession(
      sessionId,
      refreshTokenHash,
      this.getRequestIp(req),
      this.getUserAgent(req),
    );

    this.setAuthCookies(res, accessToken, refreshToken);
  }

  private async signAccessToken(user: Prisma.UserModel) {
    return this.jwtService.signAsync<IJwtPayload>(
      {
        userId: user.id,
        plan: 'free', // TODO: include actual plan info if needed
      },
      {
        secret: this.requireJwtSecret(),
        expiresIn: '10m',
      },
    );
  }

  private async signRefreshToken(user: Prisma.UserModel, sessionId: string) {
    return this.jwtService.signAsync<IJwtRefreshPayload>(
      {
        userId: user.id,
        sessionId,
      },
      {
        secret: this.requireJwtSecret(),
        expiresIn: '24h',
      },
    );
  }

  private async verifyRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync<IJwtRefreshPayload>(token, {
        secret: this.requireJwtSecret(),
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

  private getRequestIp(req: Request) {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private getUserAgent(req: Request) {
    return req.headers['user-agent'] || 'unknown';
  }

  private requireJwtSecret() {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new InternalServerErrorException('JWT secret is not configured');
    }

    return secret;
  }
}
