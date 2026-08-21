import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { SuperAdminReportsService } from './super-admin-reports.service';
import {
  ListDbtPayoutsQueryDto,
  ListPointsQueryDto,
  ListRedemptionOrdersQueryDto,
  ListStockOrdersQueryDto,
} from './dto';

@ApiTags('Super Admin - Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/reports')
export class SuperAdminReportsController {
  constructor(private readonly reports: SuperAdminReportsService) {}

  /**
   * Points-redemption product orders, across all users.
   */
  @Get('redemption-orders')
  async redemptionOrders(@Query() query: ListRedemptionOrdersQueryDto) {
    const response = await this.reports.redemptionOrders(query);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Distributor stock orders (order-placement), across all users.
   */
  @Get('stock-orders')
  async stockOrders(@Query() query: ListStockOrdersQueryDto) {
    const response = await this.reports.stockOrders(query);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Points ledger (earn/redeem/DBT), across all users.
   */
  @Get('points')
  async points(@Query() query: ListPointsQueryDto) {
    const response = await this.reports.points(query);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * DBT bank payout history, across all users.
   */
  @Get('dbt-payouts')
  async dbtPayouts(@Query() query: ListDbtPayoutsQueryDto) {
    const response = await this.reports.dbtPayouts(query);
    return DataSanitizer.sanitizeData(response);
  }
}
