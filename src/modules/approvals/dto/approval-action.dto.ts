import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApprovalActionDto {
  @IsEnum(['approve', 'reject', 'block'], { message: 'Invalid action' })
  @IsNotEmpty({ message: 'Action is required' })
  action: 'approve' | 'reject' | 'block';

  @IsString()
  @IsOptional()
  remarks?: string;
}
