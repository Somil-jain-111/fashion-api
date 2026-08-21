import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { UpdateScanAgeDto } from './dto';
import { RetailerScanAgeService } from './services/retailer-scan-age.service';
import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';

@ApiTags('Retailer Scan-Age Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/retailers/:retailerId/scan-age')
export class RetailerScanAgeController {
  constructor(private readonly scanAge: RetailerScanAgeService) {}

  @Get()
  async get(@Param('retailerId') retailerId: string) {
    const response = await this.scanAge.getEffectiveScanAgeDays(retailerId);
    return DataSanitizer.sanitizeData(response);
  }

  @Post()
  async update(
    @Req() request: any,
    @Param('retailerId') retailerId: string,
    @Body() dto: UpdateScanAgeDto
  ) {
    await this.scanAge.updateScanAge(
      retailerId,
      dto.scanAgeDays,
      String(request.user.id),
      dto.reason,
      dto.approvalReference
    );
    const response = await this.scanAge.getEffectiveScanAgeDays(retailerId);
    return DataSanitizer.sanitizeData(response);
  }

  @Get('history')
  async history(@Param('retailerId') retailerId: string) {
    const response = await this.scanAge.history(retailerId);
    return DataSanitizer.sanitizeData(response);
  }
}
