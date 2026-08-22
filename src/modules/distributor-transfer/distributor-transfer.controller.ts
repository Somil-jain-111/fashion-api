import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { DistributorTransferService } from './distributor-transfer.service';
import { CreateTransferDto, TransferHistoryQueryDto, ValidateTransferDto } from './dto';
import { NoCache } from 'src/default/cache/cache.decorator';
@NoCache()
@ApiTags('Distributor Transfer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('distributor-transfer')
export class DistributorTransferController {
  constructor(private readonly distributorTransfer: DistributorTransferService) {}

  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Post('validate')
  async validate(@Req() request: any, @Body() dto: ValidateTransferDto) {
    const response = await this.distributorTransfer.validate(String(request.user.id), dto);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Post('request')
  async create(@Req() request: any, @Body() dto: CreateTransferDto) {
    const response = await this.distributorTransfer.create(String(request.user.id), dto);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Post(':requestNo/allocate')
  async allocate(@Req() request: any, @Param('requestNo') requestNo: string) {
    const response = await this.distributorTransfer.allocate(String(request.user.id), requestNo);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Get('open')
  async open(@Req() request: any, @Query() query: TransferHistoryQueryDto) {
    const response = await this.distributorTransfer.openRequests(
      String(request.user.id),
      query.page,
      query.limit
    );
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Get('history')
  async history(@Req() request: any, @Query() query: TransferHistoryQueryDto) {
    const response = await this.distributorTransfer.history(
      String(request.user.id),
      query.page,
      query.limit
    );
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.DISTRIBUTOR, UserRole.SUB_DISTRIBUTOR])
  @Get(':requestNo')
  async detail(@Req() request: any, @Param('requestNo') requestNo: string) {
    const response = await this.distributorTransfer.detail(String(request.user.id), requestNo);
    return DataSanitizer.sanitizeData(response);
  }
}
