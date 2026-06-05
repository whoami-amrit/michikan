import { ALLOW_UNVERIFIED_TAG, PUBLIC_ACCESS_TAG } from '@common/constants';
import { IJwtAccessPayload } from '@common/types/jwt-payload.interface';
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
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ACCESS_TAG, [
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

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(ALLOW_UNVERIFIED_TAG, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    try {
      req.user = this.jwt.verify<IJwtAccessPayload>(token);

      if (!allowUnverified && !req.user.verified) {
        throw new UnauthorizedException('Email verification required');
      }

      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      throw new UnauthorizedException();
    }
  }
}
