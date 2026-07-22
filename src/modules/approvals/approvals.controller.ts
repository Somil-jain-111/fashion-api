import { Controller, Post, Body, Param, Req, UseGuards, Get, Query } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { ApprovalActionDto } from './dto/approval-action.dto';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) { }

  @Roles([UserRole.L1, UserRole.L2, UserRole.SALESPERSON, UserRole.SUPERADMIN])
  @Post(':id/action')
  @ResponseMessage('Approval action processed successfully')
  async handleApprovalAction(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ApprovalActionDto
  ) {
    const approverId = Number(req.user.id);
    const response = await this.approvalsService.handleApprovalAction(
      approverId,
      Number(id),
      dto.action,
      dto.remarks
    );
    return DataSanitizer.sanitizeData(response);
  }

  @Roles([UserRole.L1, UserRole.L2, UserRole.SUPERADMIN])
  @NoCache()
  @Get('queue')
  @ResponseMessage('Approval queue fetched successfully')
  async getApprovalQueue(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const response = await this.approvalsService.getApprovalQueue(
      Number(req.user.id),
      req.user.role as UserRole,
      status,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
    return DataSanitizer.sanitizeData(response);
  }

  @Roles([UserRole.L1, UserRole.L2, UserRole.SUPERADMIN])
  @NoCache()
  @Get('queue/analytics')
  @ResponseMessage('Approval analytics fetched successfully')
  async getApprovalAnalytics(@Req() req: any) {
    const response = await this.approvalsService.getApprovalAnalytics(
      Number(req.user.id),
      req.user.role as UserRole,
    );
    return DataSanitizer.sanitizeData(response);
  }
}
