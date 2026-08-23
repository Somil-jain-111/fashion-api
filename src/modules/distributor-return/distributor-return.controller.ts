import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { DistributorReturnService } from './distributor-return.service';
import { ProcessReturnDto, ReturnHistoryQueryDto, ValidateReturnDto } from './dto';
import { NoCache } from 'src/default/cache/cache.decorator';

@ApiTags('Distributor Return')
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('distributor-return')
export class DistributorReturnController {
  constructor(private readonly distributorReturn: DistributorReturnService) {}

  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Post('validate')
  async validate(@Req() request: any, @Body() dto: ValidateReturnDto) {
    const response = await this.distributorReturn.validate(String(request.user.id), dto);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Post('process')
  async process(@Req() request: any, @Body() dto: ProcessReturnDto) {
    const response = await this.distributorReturn.process(String(request.user.id), dto);
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Get('history')
  async history(@Req() request: any, @Query() query: ReturnHistoryQueryDto) {
    const response = await this.distributorReturn.history(
      String(request.user.id),
      query.page,
      query.limit,
      query.search
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Get('retailers')
  async retailers(@Req() request: any, @Query() query: ReturnHistoryQueryDto) {
    const response = await this.distributorReturn.retailers(
      String(request.user.id),
      query.page,
      query.limit,
      query.search
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Get('retailers/:retailerId/returns')
  async retailerReturns(
    @Req() request: any,
    @Param('retailerId') retailerId: string,
    @Query() query: ReturnHistoryQueryDto
  ) {
    const response = await this.distributorReturn.retailerReturns(
      String(request.user.id),
      retailerId,
      query.page,
      query.limit
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Roles([UserRole.RETAILER])
  @Get('my-returns')
  async myReturns(@Req() request: any, @Query() query: ReturnHistoryQueryDto) {
    const response = await this.distributorReturn.retailerHistory(
      String(request.user.id),
      query.page,
      query.limit,
      query.search
    );
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Roles([UserRole.RETAILER])
  @Get('my-returns/:id')
  async myReturnDetail(@Req() request: any, @Param('id') id: string) {
    const response = await this.distributorReturn.retailerReturnDetail(String(request.user.id), id);
    return DataSanitizer.sanitizeData(response);
  }

  // Kept last — a bare `:id` route must not be registered ahead of any static route above
  // (`history`, `retailers`, `retailers/:retailerId/returns`, `my-returns`, `my-returns/:id`),
  // or it'll shadow them.
  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Get(':id')
  async detail(@Req() request: any, @Param('id') id: string) {
    const response = await this.distributorReturn.returnDetail(String(request.user.id), id);
    return DataSanitizer.sanitizeData(response);
  }
}
