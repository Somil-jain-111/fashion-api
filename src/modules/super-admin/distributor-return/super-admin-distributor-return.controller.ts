import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { SuperAdminDistributorReturnService } from './super-admin-distributor-return.service';
import { ListDistributorReturnsQueryDto } from './dto';
import {
  SuperAdminDistributorReturnResponseDto,
  SuperAdminDistributorReturnListResponseDto,
} from './dto/response/distributor-return-response.dto';

@ApiTags('Super Admin - Distributor Returns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/distributor-returns')
export class SuperAdminDistributorReturnController {
  constructor(private readonly service: SuperAdminDistributorReturnService) {}

  /**
   * Pair returns across every distributor/retailer. Filters: distributorId, retailerId,
   * invoiceNumber, fromDate, toDate.
   */
  @ApiOkResponse({ type: SuperAdminDistributorReturnListResponseDto })
  @NoCache()
  @Get()
  async list(@Query() query: ListDistributorReturnsQueryDto) {
    const response = await this.service.list(query);
    return DataSanitizer.sanitizeData(new SuperAdminDistributorReturnListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminDistributorReturnResponseDto })
  @NoCache()
  @Get(':id')
  async detail(@Param('id') id: string) {
    const response = await this.service.detail(id);
    return DataSanitizer.sanitizeData(new SuperAdminDistributorReturnResponseDto(response));
  }
}
