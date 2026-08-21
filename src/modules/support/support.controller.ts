import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { SupportService } from './support.service';
import { CreateSupportTicketDto, ListSupportTicketsQueryDto } from './dto';

@ApiTags('Support')
@ApiBearerAuth()
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}
  @NoCache()
  @Roles([UserRole.RETAILER])
  @Post()
  async create(@Req() request: any, @Body() dto: CreateSupportTicketDto) {
    const response = await this.support.create(String(request.user.id), dto);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.RETAILER])
  @Get()
  async list(@Req() request: any, @Query() query: ListSupportTicketsQueryDto) {
    const response = await this.support.listMine(String(request.user.id), query);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.RETAILER])
  @Get('summary')
  async summary(@Req() request: any) {
    const response = await this.support.summaryMine(String(request.user.id));
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.RETAILER])
  @Get('issue-types')
  async issueTypes() {
    const response = await this.support.issueTypes();
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.RETAILER])
  @Get(':id')
  async detail(@Req() request: any, @Param('id') id: string) {
    const response = await this.support.detailMine(String(request.user.id), id);
    return DataSanitizer.sanitizeData(response);
  }
}
