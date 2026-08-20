import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { SoVerificationService } from './so-verification.service';
import { SoVerifyOutletDto, SoRejectOutletDto } from './dto/so-verify.dto';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('so')
export class SoVerificationController {
  constructor(private readonly soVerificationService: SoVerificationService) {}

  /**
   * SO dashboard — analytics + pending outlets list
   * GET /so/queue
   */
@Roles([UserRole.SALESPERSON, UserRole.SUPERADMIN])
@NoCache()
@Get('queue')
async getQueue(
  @Req() req: any,
  @Query('lat') lat?: string,
  @Query('lng') lng?: string,
  @Query('status') status?: string,
) {
  const soLat = lat !== undefined ? parseFloat(lat) : undefined;
  const soLng = lng !== undefined ? parseFloat(lng) : undefined;
  const response = await this.soVerificationService.getQueue(
    Number(req.user.id),
    soLat,
    soLng,
    status,
    req.user.role as UserRole,
  );
  return DataSanitizer.sanitizeData(response);
}

  /**
   * Outlet detail page — retailer info + store info + previous verification
   * GET /so/retailer/:userId
   */
  @Roles([UserRole.SALESPERSON, UserRole.SUPERADMIN])
  @Get('retailer/:userId')
  async getRetailerDetail(@Param('userId') userId: string) {
    const response = await this.soVerificationService.getRetailerDetail(Number(userId));
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Real-time geo-fence check as SO moves toward the outlet.
   * Called repeatedly from frontend as SO's location updates.
   * GET /so/geofence-check/:approvalId?lat=xx&lng=yy
   */
  @Roles([UserRole.SALESPERSON, UserRole.SUPERADMIN])
  @Get('geofence-check/:approvalId')
  async checkGeofence(
    @Param('approvalId') approvalId: string,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    const response = await this.soVerificationService.checkGeofence(
      Number(approvalId),
      parseFloat(lat),
      parseFloat(lng),
    );
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * SO submits outlet verification evidence → outlet becomes ACTIVE
   * POST /so/verify/:approvalId
   */
  @Roles([UserRole.SALESPERSON, UserRole.SUPERADMIN])
  @Post('verify/:approvalId')
  @ResponseMessage('Outlet verified successfully')
  async verifyOutlet(
    @Req() req: any,
    @Param('approvalId') approvalId: string,
    @Body() dto: SoVerifyOutletDto,
  ) {
    const response = await this.soVerificationService.verifyOutlet(
      Number(req.user.id),
      Number(approvalId),
      dto,
    );
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * SO rejects an outlet → pushed back to L2
   * POST /so/reject/:approvalId
   */
  @Roles([UserRole.SALESPERSON, UserRole.SUPERADMIN])
  @Post('reject/:approvalId')
  @ResponseMessage('Outlet rejected')
  async rejectOutlet(
    @Req() req: any,
    @Param('approvalId') approvalId: string,
    @Body() dto: SoRejectOutletDto,
  ) {
    const response = await this.soVerificationService.rejectOutlet(
      Number(req.user.id),
      Number(approvalId),
      dto,
    );
    return DataSanitizer.sanitizeData(response);
  }
}

// ─────────────────────────────────────────────────────────
// Retailer-facing endpoint (different controller, same module)
// Called immediately after every retailer login for screen routing
// GET /onboarding/status  → 
// ─────────────────────────────────────────────────────────
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles([UserRole.RETAILER])
// @Get('status')
// async getOnboardingStatus(@Req() req: any) {
//   const response = await this.soVerificationService.getOnboardingStatus(Number(req.user.id));
//   return DataSanitizer.sanitizeData(response);
// }