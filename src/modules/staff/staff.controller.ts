import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import {
  AcceptStaffInviteDto,
  InviteStaffDto,
  ListStaffQueryDto,
  StaffActionResponseDto,
  StaffInviteAcceptResponseDto,
  StaffInviteResponseDto,
  StaffListResponseDto,
  StaffResponseDto,
  StaffRoleResponseDto,
  UpdateStaffDto,
  UpdateStaffStatusDto,
} from './dto/staff.dto';
import { StaffService } from './staff.service';

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SELLER_ADMIN])
@Controller('sellers/staff')
export class StaffController {
  constructor(private readonly service: StaffService) {}
  @Get('roles') async roles(): Promise<StaffRoleResponseDto[]> {
    return DataSanitizer.sanitizeData(await this.service.roles()) as StaffRoleResponseDto[];
  }
  @Get() async list(@Req() req: any, @Query() q: ListStaffQueryDto): Promise<StaffListResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.list(req.user.id, q)
    ) as StaffListResponseDto;
  }
  @Get(':id') async detail(@Req() req: any, @Param('id') id: string): Promise<StaffResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.detail(req.user.id, Number(id))
    ) as StaffResponseDto;
  }
  @Post('invite') async invite(
    @Req() req: any,
    @Body() dto: InviteStaffDto
  ): Promise<StaffInviteResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.invite(req.user.id, dto)
    ) as StaffInviteResponseDto;
  }
  @Post(':id') async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto
  ): Promise<StaffResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.update(req.user.id, Number(id), dto)
    ) as StaffResponseDto;
  }
  @Post(':id/status') async status(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateStaffStatusDto
  ): Promise<StaffActionResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.status(req.user.id, Number(id), dto.status)
    ) as StaffActionResponseDto;
  }
  @Post(':id/resend-invite') async resend(
    @Req() req: any,
    @Param('id') id: string
  ): Promise<StaffInviteResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.resend(req.user.id, Number(id))
    ) as StaffInviteResponseDto;
  }
}

@NoCache()
@UseGuards(JwtAuthGuard)
@Controller('staff/invitations')
export class StaffInvitationController {
  constructor(private readonly service: StaffService) {}
  @Post('accept') async accept(
    @Req() req: any,
    @Body() dto: AcceptStaffInviteDto
  ): Promise<StaffInviteAcceptResponseDto> {
    return DataSanitizer.sanitizeData(
      await this.service.accept(req.user.id, dto)
    ) as StaffInviteAcceptResponseDto;
  }
}
