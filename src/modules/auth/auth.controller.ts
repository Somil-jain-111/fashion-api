import { Body, Controller, Get, Post, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { NoCache } from 'src/default/cache/cache.decorator';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { AllowUnapprovedSellerWrite } from 'src/default/common/decorators/allow-unapproved-seller-write.decorator';

@AllowUnapprovedSellerWrite()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @NoCache()
  @Post('login-options')
  @ResponseMessage('Login options fetched successfully')
  async loginOptions(@Body() dto: SendOtpDto) {
    return this.authService.getLoginOptions(dto);
  }

  @NoCache()
  @Post('send-otp')
  @ResponseMessage('OTP sent successfully')
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @NoCache()
  @Post('verify-otp')
  @ResponseMessage('OTP verified successfully')
  async verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: any) {
    return this.authService.verifyOtp(dto, req);
  }

  @NoCache()
  @Post('set-password')
  @ResponseMessage('Password set successfully')
  async setPassword(@Body() dto: SetPasswordDto, @Req() req: any) {
    return this.authService.setPassword(dto, req);
  }

  @NoCache()
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: any) {
    return await this.authService.login(dto, req);
  }

  @NoCache()
  @Post('admin-login')
  async adminLogin(@Body() dto: LoginDto, @Req() req: any) {
    return await this.authService.adminLogin(dto, req);
  }

  @NoCache()
  @Post('seller-login')
  async sellerLogin(@Body() dto: LoginDto, @Req() req: any) {
    return await this.authService.sellerLogin(dto, req);
  }

  @NoCache()
  @Post('refresh-token')
  @ResponseMessage('Token refreshed successfully')
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return await this.authService.refreshToken(dto);
  }

  @NoCache()
  @Post('forgot-password')
  @ResponseMessage('OTP sent successfully')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @NoCache()
  @Post('reset-password')
  @ResponseMessage('Password reset successfully')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @NoCache()
  @UseInterceptors(IdempotencyInterceptor)
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ResponseMessage('Logout successfully')
  async logout(@Req() req: any) {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    const response = await this.authService.logout(req.user.id, accessToken);

    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Profile fetched successfully')
  @Get('profile')
  async profile(@Req() req: any) {
    const response = await this.authService.profile(req.user.id);
    return DataSanitizer.sanitizeData(response);
  }
}
