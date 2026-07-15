import { AllowUnverified } from '@common/decorators/allow-unverified.decorator';
import { Public } from '@common/decorators/public.decorator';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { IUserResponse, LoginSchema, SignupSchema } from 'shared';

import { AuthService } from './auth.service';
import { VERIFY_EMAIL_PATH } from './constants';

class LoginDto extends createZodDto(LoginSchema) {}
class SignupDto extends createZodDto(SignupSchema) {}

@Public()
@AllowUnverified()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() signupDto: SignupDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Omit<IUserResponse, 'plan' | 'verified'>> {
    const user = await this.authService.signup(signupDto, req, res);

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
