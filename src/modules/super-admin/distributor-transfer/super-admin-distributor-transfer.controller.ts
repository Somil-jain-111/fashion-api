import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { SuperAdminDistributorTransferService } from './super-admin-distributor-transfer.service';
import { ListDistributorTransfersQueryDto } from './dto';
import {
  SuperAdminDistributorTransferResponseDto,
  SuperAdminDistributorTransferListResponseDto,
} from './dto/response/distributor-transfer-response.dto';

@ApiTags('Super Admin - Distributor Transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/distributor-transfers')
export class SuperAdminDistributorTransferController {
  constructor(private readonly service: SuperAdminDistributorTransferService) {}

  /**
   * Transfer requests across every distributor, both open and allocated. Filters:
   * fromDistributorId, toDistributorId, status, invoiceNumber, fromDate, toDate.
   */
  @ApiOkResponse({ type: SuperAdminDistributorTransferListResponseDto })
  @NoCache()
  @Get()
  async list(@Query() query: ListDistributorTransfersQueryDto) {
    const response = await this.service.list(query);
    return DataSanitizer.sanitizeData(new SuperAdminDistributorTransferListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminDistributorTransferResponseDto })
  @NoCache()
  @Get(':requestNo')
  async detail(@Param('requestNo') requestNo: string) {
    const response = await this.service.detail(requestNo);
    return DataSanitizer.sanitizeData(new SuperAdminDistributorTransferResponseDto(response));
  }
}
