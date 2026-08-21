import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { SupportTicketStatus } from '../enum/support-ticket-status.enum';

export class AdminUpdateSupportTicketDto {
  @IsEnum(SupportTicketStatus)
  status: SupportTicketStatus;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  remarks?: string;
}
