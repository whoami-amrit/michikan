import { AllowUnverified } from '@common/decorators/allow-unverified.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Public } from '@common/decorators/public.decorator';
import { type IJwtAccessPayload } from '@common/types/jwt-payload.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { createZodDto } from 'nestjs-zod';
import { IUserResponse, LoginSchema, SignupSchema, VerificationOtpSchema } from 'shared';

import { AuthService } from './auth.service';

class LoginDto extends createZodDto(LoginSchema) {}
class SignupDto extends createZodDto(SignupSchema) {}
class VerificationOtpDto extends createZodDto(VerificationOtpSchema) {}

@AllowUnverified()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
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

  @Public()
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

  @Public()
  @Get('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.refresh(req, res);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.NO_CONTENT)
  resendOtp(@CurrentUser() user: IJwtAccessPayload) {
    return this.authService.resendOtp(user.sub);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.NO_CONTENT)
  verifyOtp(
    @CurrentUser() user: IJwtAccessPayload,
    @Body() body: VerificationOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.verifyOtp(user.sub, body.otp, req, res);
  }

  @Delete('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }
}
