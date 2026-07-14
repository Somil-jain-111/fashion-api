// import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
// import { ApprovalService } from './approval.service';
// import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
// import { RolesGuard } from 'src/default/common/guards/roles.guard';
// import { Roles } from 'src/default/common/decorators/roles.decorator';
// import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
// import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
// import { UserRole } from 'src/default/common/enums/user-type.enum';
// import { L1ActionDto, L2ActionDto } from './dto/approval-action.dto';

// @UseGuards(JwtAuthGuard, RolesGuard)
// @Controller('approval')
// export class ApprovalController {
//   constructor(private readonly approvalService: ApprovalService) {}

//   @Roles([UserRole.L1])
//   @Get('l1/queue')
//   async l1Queue(@Req() req: any) {
//     const response = await this.approvalService.getL1Queue(req.user.id);
//     return DataSanitizer.sanitizeData(response);
//   }

//   @Roles([UserRole.L1])
//   @Post('l1/action')
//   @ResponseMessage('Action completed successfully')
//   async l1Action(@Req() req: any, @Body() dto: L1ActionDto) {
//     const response = await this.approvalService.actionByL1(req.user.id, dto);
//     return DataSanitizer.sanitizeData(response);
//   }

//   @Roles([UserRole.L2])
//   @Get('l2/queue')
//   async l2Queue(@Req() req: any) {
//     const response = await this.approvalService.getL2Queue(req.user.id);
//     return DataSanitizer.sanitizeData(response);
//   }

//   @Roles([UserRole.L2])
//   @Post('l2/action')
//   @ResponseMessage('Action completed successfully')
//   async l2Action(@Req() req: any, @Body() dto: L2ActionDto) {
//     const response = await this.approvalService.actionByL2(req.user.id, dto);
//     return DataSanitizer.sanitizeData(response);
//   }

//   @Roles([UserRole.L1, UserRole.L2, UserRole.SUPERADMIN])
//   @Get('timeline/:retailerUserId')
//   async timeline(@Param('retailerUserId') retailerUserId: string) {
//     const response = await this.approvalService.getTimeline(retailerUserId);
//     return DataSanitizer.sanitizeData(response);
//   }
// }