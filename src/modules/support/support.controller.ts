import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import {
  AdminUpdateTicketDto,
  CreateSupportTicketDto,
  ListSupportTicketsQueryDto,
  ReplySupportTicketDto,
  SupportOverviewResponseDto,
  SupportTicketListResponseDto,
  SupportTicketResponseDto,
} from './dto/support.dto';
import { SupportService } from './support.service';

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SELLER_ADMIN])
@Controller('sellers/support')
export class SellerSupportController {
  constructor(private readonly service: SupportService) {}
  @Get('overview') async overview(@Req() req: any): Promise<SupportOverviewResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.overview(req.user.id)
    ) as SupportOverviewResponseDto;
  }
  @Get('tickets') async list(
    @Req() req: any,
    @Query() q: ListSupportTicketsQueryDto
  ): Promise<SupportTicketListResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.list(req.user.id, q)
    ) as SupportTicketListResponseDto;
  }
  @Get('tickets/:id') async detail(
    @Req() req: any,
    @Param('id') id: string
  ): Promise<SupportTicketResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.detail(req.user.id, Number(id))
    ) as SupportTicketResponseDto;
  }
  @Post('tickets') async create(
    @Req() req: any,
    @Body() dto: CreateSupportTicketDto
  ): Promise<SupportTicketResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.create(req.user.id, dto)
    ) as SupportTicketResponseDto;
  }
  @Post('tickets/:id/reply') async reply(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReplySupportTicketDto
  ): Promise<SupportTicketResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.reply(req.user.id, Number(id), dto)
    ) as SupportTicketResponseDto;
  }
}

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.ADMIN, UserRole.SUPERADMIN])
@Controller(['admin/support', 'super-admin/support'])
export class AdminSupportController {
  constructor(private readonly service: SupportService) {}
  @Get('tickets') async list(
    @Query() q: ListSupportTicketsQueryDto
  ): Promise<SupportTicketListResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.adminList(q)
    ) as SupportTicketListResponseDto;
  }
  @Get('tickets/:id') async detail(@Param('id') id: string): Promise<SupportTicketResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.adminDetail(Number(id))
    ) as SupportTicketResponseDto;
  }
  @Post('tickets/:id/reply') async reply(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReplySupportTicketDto
  ): Promise<SupportTicketResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.adminReply(req.user.id, Number(id), dto)
    ) as SupportTicketResponseDto;
  }
  @Post('tickets/:id/status') async status(
    @Param('id') id: string,
    @Body() dto: AdminUpdateTicketDto
  ): Promise<SupportTicketResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.adminUpdate(Number(id), dto)
    ) as SupportTicketResponseDto;
  }
}
