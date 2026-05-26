import { ACCESS_TOKEN_USER_DATA_KEY } from '@common/constants';
import { IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): IJwtAccessPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request[ACCESS_TOKEN_USER_DATA_KEY]!;
  },
);
