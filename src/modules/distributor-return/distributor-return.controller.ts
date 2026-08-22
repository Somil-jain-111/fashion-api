import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
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
      query.limit
    );
    return DataSanitizer.sanitizeData(response);
  }
}
