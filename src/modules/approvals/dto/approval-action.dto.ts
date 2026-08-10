import { IsEnum, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApprovalRejectionOptions } from 'src/default/common/constants/approval-rejection.option';
//
import { ApprovalAction } from 'src/default/common/enums/approvals.enum';

export class ApprovalActionDto {
  @IsEnum(ApprovalAction, { message: 'Invalid action' })
  @IsNotEmpty({ message: 'Action is required' })
  action: ApprovalAction;

  @IsIn(Object.keys(ApprovalRejectionOptions), { message: 'Invalid reject reason type' })
  @IsOptional()
  rejectReasonType?: keyof typeof ApprovalRejectionOptions;

  @IsString()
  @IsNotEmpty({ message: 'Remarks are required' })
  remarks: string;
}
