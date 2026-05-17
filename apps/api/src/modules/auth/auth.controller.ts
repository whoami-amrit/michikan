import { SkipAuth } from '@common/decorators/skip-auth.decorator';
import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { IUserResponse } from '../users/responses/user.response';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login.dto';
import { RegisterRequestDto } from './dto/register.dto';

@SkipAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(201)
  async register(
    @Body() registerDto: RegisterRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<IUserResponse> {
    const user = await this.authService.register(registerDto, req, res);

    return {
      createdAt: user.createdAt,
      email: user.email,
      id: user.id,
      name: user.name,
    };
  }

  @Post('login')
  @HttpCode(204) // No content, since tokens are set in cookies
  login(
    @Body() loginDto: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // for Promise<void>; return and no need for async (handled by nestjs)
    return this.authService.login(loginDto, req, res);
  }

  @Get('refresh')
  @HttpCode(204)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }
}
