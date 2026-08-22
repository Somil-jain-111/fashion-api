import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { UpdatePointsExpiryDto } from '../invoices/dto';
import { PointsExpiryConfigService } from './services/points-expiry.service';

@ApiTags('Points Expiry Config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // TODO: restrict to Admin roles
@Controller('admin/config/points-expiry')
export class PointsExpiryConfigController {
  constructor(private readonly config: PointsExpiryConfigService) {}

  @Get()
  async get() {
    const days = await this.config.getExpiryDays();
    return DataSanitizer.sanitizeData({ expiryDays: days });
  }

  @Put()
  async update(@Req() request: any, @Body() dto: UpdatePointsExpiryDto) {
    await this.config.setExpiryDays(dto.expiryDays, String(request.user.id));
    return DataSanitizer.sanitizeData({ expiryDays: dto.expiryDays });
  }
}