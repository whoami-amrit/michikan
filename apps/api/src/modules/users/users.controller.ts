import { AllowUnverified } from '@common/decorators/allow-unverified.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import { Body, Controller, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { IUserResponse, UpdateUserSchema } from 'shared';

import { UsersService } from './users.service';

class UpdateUserDto extends createZodDto(UpdateUserSchema) {}

@AllowUnverified()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getUserData(@CurrentUser() jwtPayload: IJwtAccessPayload): Promise<IUserResponse> {
    return this.usersService.findById(jwtPayload);
  }

  @Patch('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateUser(@CurrentUser() { sub: userId }: IJwtAccessPayload, @Body() data: UpdateUserDto) {
    return this.usersService.updateUserById(userId, data);
  }
}
