import { AllowUnverified } from '@common/decorators/allow-unverified.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { IAiUsageResponse, IUserResponse, UpdateUserSchema } from 'shared';

import { AiQuotaService } from '../../infra/ai/ai-quota.service';
import { UsersService } from './users.service';

class UpdateUserDto extends createZodDto(UpdateUserSchema) {}

@AllowUnverified()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly aiQuotaService: AiQuotaService,
  ) {}

  @Get('me')
  getUserData(@CurrentUser() jwtPayload: IJwtAccessPayload): Promise<IUserResponse> {
    return this.usersService.findById(jwtPayload);
  }

  @Get('me/ai-usage')
  getAiUsage(@CurrentUser() { sub: userId }: IJwtAccessPayload): Promise<IAiUsageResponse> {
    return this.aiQuotaService.getUsage(userId);
  }

  @Patch('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateUser(@CurrentUser() { sub: userId }: IJwtAccessPayload, @Body() data: UpdateUserDto) {
    return this.usersService.updateUserById(userId, data);
  }
}
