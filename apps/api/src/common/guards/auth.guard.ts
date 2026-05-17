// auth.guard.ts
import { SKIP_AUTH_TAG } from '@common/constants';
import { IJwtPayload } from '@common/types/jwt-payload.interface';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_TAG, [
      ctx.getHandler(), // route level
      ctx.getClass(), // controller/module level
    ]);

    if (isPublic) {
      return true;
    }

    const req = ctx.switchToHttp().getRequest<Request>();
    const token = req.cookies['access_token'];

    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      req.user = this.jwt.verify<IJwtPayload>(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
