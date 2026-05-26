import { CurrentUser } from '@common/decorators/current-user.decorator';
import type { IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
} from '@nestjs/common';

import { UpdateUserRequestDto } from './dto/update-user.request';
import { IUserResponse } from './responses/user.response';
import { UsersService } from './users.service';

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

  @Patch(':id')
  @HttpCode(204)
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateUserRequestDto) {
    return this.usersService.updateUserById(id, data);
  }
}
