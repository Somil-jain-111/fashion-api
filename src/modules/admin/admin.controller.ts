import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { AdminService } from './admin.service';
import { AdminVerifyKycDto } from './dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @NoCache()
  @SkipThrottle()
  @Post('kyc/verify')
  @ResponseMessage('KYC verified successfully')
  async verifyKyc(@Body() body: AdminVerifyKycDto) {
    const response = await this.adminService.verifyKyc(body);
    return DataSanitizer.sanitizeData(response);
  }
}
