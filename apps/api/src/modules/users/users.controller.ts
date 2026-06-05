import { AllowUnverified } from '@common/decorators/allow-unverified.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Patch,
} from '@nestjs/common';

import { UpdateUserDto } from './dto/update.dto';
import { IUserResponse } from './responses/user.response';
import { UsersService } from './users.service';

@AllowUnverified()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getUserData(@CurrentUser() { sub: userId }: IJwtAccessPayload): Promise<IUserResponse> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  @Patch('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  updateUser(@CurrentUser() { sub: userId }: IJwtAccessPayload, @Body() data: UpdateUserDto) {
    return this.usersService.updateUserById(userId, data);
  }
}
