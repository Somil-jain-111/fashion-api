import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { CustomerReturnIssueType } from '../enum/customer-return.enum';

export class UpdateCustomerReturnPairIssueDto {
  @IsNotEmpty({ message: 'Pair code or UID is required' })
  @IsString()
  pairCode: string;

  @IsNotEmpty({ message: 'Issue type is required' })
  @IsEnum(CustomerReturnIssueType, { message: 'Invalid issue type' })
  issueType: CustomerReturnIssueType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  remarks?: string;
}
