import { Body, Controller, Get, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-otp')
  @ResponseMessage('OTP sent successfully')
  async sendOtp(@Body() dto: SendOtpDto) {
    const response = await this.authService.sendOtp(dto);
    return DataSanitizer.sanitizeData(response);
  }

  @Post('verify-otp')
  @ResponseMessage('OTP verified successfully')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: any) {
    return await this.authService.verifyOtp(dto, req);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    return await this.authService.login(dto, req);
  }

  @Post('refresh-token')
  @ResponseMessage('Token refreshed successfully')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshToken(dto);
  }

  @Post('forgot-password')
  @ResponseMessage('Password reset token sent successfully')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([UserRole.RETAILER])
  @Post('logout')
  @ResponseMessage('Logout successfully')
  async logout(@Req() req: any) {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    const response = await this.authService.logout(req.user.id, accessToken);

    return DataSanitizer.sanitizeData(response);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async profile(@Req() req: any) {
    const response = await this.authService.profile(req.user.id);
    return DataSanitizer.sanitizeData(response);
  }
}
