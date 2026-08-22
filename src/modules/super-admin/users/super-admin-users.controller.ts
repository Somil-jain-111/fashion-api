import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';
import { AddressesService } from 'src/modules/addresses/addresses.service';
import { AddressListResponseDTO } from 'src/modules/addresses/dto/address-list-response.dto';
import { AddressResponseDTO } from 'src/modules/addresses/dto/address-response.dto';
import { SuperAdminReportsService } from '../reports/super-admin-reports.service';
import { ListRedemptionOrdersQueryDto, ListStockOrdersQueryDto } from '../reports/dto';
import { SuperAdminRedemptionOrderListResponseDto } from '../reports/dto/response/redemption-order-response.dto';
import { SuperAdminStockOrderListResponseDto } from '../reports/dto/response/stock-order-response.dto';
import { SuperAdminUsersService } from './super-admin-users.service';
import { ListUsersQueryDto } from './dto';
import { SuperAdminUserListResponseDto, SuperAdminUserDetailResponseDto } from './dto/response/user-response.dto';

@ApiTags('Super Admin - Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/users')
export class SuperAdminUsersController {
  constructor(
    private readonly users: SuperAdminUsersService,
    private readonly addresses: AddressesService,
    private readonly reports: SuperAdminReportsService
  ) {}

  @ApiOkResponse({ type: SuperAdminUserListResponseDto })
  @Get()
  async list(@Query() query: ListUsersQueryDto) {
    const response = await this.users.list(query);
    return DataSanitizer.sanitizeData(new SuperAdminUserListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminUserDetailResponseDto })
  @Get(':id')
  async detail(@Param('id', ParseIntPipe) id: number) {
    const response = await this.users.detail(id);
    return DataSanitizer.sanitizeData(new SuperAdminUserDetailResponseDto(response));
  }

  /**
   * A user's saved addresses, paginated — reuses the retailer-facing AddressesService as-is
   * (it already takes userId as a plain argument, no self-lookup), just scoped to :id instead
   * of the caller's own JWT.
   */
  @ApiOkResponse({ type: AddressListResponseDTO })
  @Get(':id/addresses')
  async addressList(@Param('id', ParseIntPipe) id: number, @Query() query: PaginationQueryDto) {
    const response = await this.addresses.getMyAddresses(id, query);
    return DataSanitizer.sanitizeData(response);
  }

  @ApiOkResponse({ type: AddressResponseDTO })
  @Get(':id/addresses/:addressId')
  async addressDetail(@Param('id', ParseIntPipe) id: number, @Param('addressId') addressId: string) {
    const response = await this.addresses.getAddressById(id, addressId);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * Points-redemption order history for one user — same data as
   * GET /super-admin/reports/redemption-orders?userId=:id, exposed here alongside the rest of
   * the user's profile for convenience.
   */
  @ApiOkResponse({ type: SuperAdminRedemptionOrderListResponseDto })
  @Get(':id/orders/redemption')
  async redemptionOrderHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListRedemptionOrdersQueryDto
  ) {
    const response = await this.reports.redemptionOrders({ ...query, userId: id });
    return DataSanitizer.sanitizeData(new SuperAdminRedemptionOrderListResponseDto(response));
  }

  /**
   * Distributor stock-order history for one user — same data as
   * GET /super-admin/reports/stock-orders?userId=:id.
   */
  @ApiOkResponse({ type: SuperAdminStockOrderListResponseDto })
  @Get(':id/orders/stock')
  async stockOrderHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListStockOrdersQueryDto
  ) {
    const response = await this.reports.stockOrders({ ...query, userId: id });
    return DataSanitizer.sanitizeData(new SuperAdminStockOrderListResponseDto(response));
  }
}
