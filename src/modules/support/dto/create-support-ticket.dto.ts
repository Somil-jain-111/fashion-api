import { ArrayMaxSize, IsArray, IsEnum, IsOptional, IsString, IsUrl, Length } from 'class-validator';
import { SupportIssueType } from '../enum/support-issue-type.enum';

export class CreateSupportTicketDto {
  @IsEnum(SupportIssueType)
  issueType: SupportIssueType;

  @IsString()
  @Length(1, 2000)
  description: string;

  /**
   * URLs of images already uploaded via POST /s3/upload/base64 (or /s3/upload/file) —
   * this endpoint stores the resulting links, it does not accept raw file uploads itself.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsUrl({}, { each: true })
  images?: string[];
}
