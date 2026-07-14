import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
//
import { ApprovalAction } from 'src/default/common/enums/approvals.enum';

export class ApprovalActionDto {
  @IsEnum(ApprovalAction, { message: 'Invalid action' })
  @IsNotEmpty({ message: 'Action is required' })
  action: ApprovalAction;

  @IsString()
  @IsOptional()
  remarks?: string;
}
