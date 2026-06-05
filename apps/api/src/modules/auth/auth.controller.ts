import { AllowUnverified } from '@common/decorators/allow-unverified.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { IUserResponse } from '../users/responses/user.response';
import { AuthService } from './auth.service';
import { VERIFY_EMAIL_PATH } from './constants';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Public()
@AllowUnverified()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
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
  @HttpCode(HttpStatus.NO_CONTENT)
  login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // for Promise<void>; return and no need for async (handled by nestjs)
    return this.authService.login(loginDto, req, res);
  }

  @Get('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  @Post(VERIFY_EMAIL_PATH)
  @HttpCode(HttpStatus.NO_CONTENT)
  async verifyEmail(@Query('token') verificationToken: string, @Req() req: Request) {
    await this.authService.verifyEmail(verificationToken, req);
  }
}
