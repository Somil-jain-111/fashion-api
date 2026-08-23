import { IsEnum, IsNotEmpty, IsString, Length, ValidateIf } from 'class-validator';
import { CustomerReturnIssueType } from '../enum/customer-return.enum';

export class ScanCustomerReturnPairDto {
  @IsNotEmpty({ message: 'Pair code or UID is required' })
  @IsString()
  pairUid: string;

  @IsNotEmpty({ message: 'Issue type is required' })
  @IsEnum(CustomerReturnIssueType, { message: 'Invalid issue type' })
  issueType: CustomerReturnIssueType;

  @ValidateIf((o) => o.issueType === CustomerReturnIssueType.OTHER)
  @IsNotEmpty({ message: 'Remarks is required' })
  @IsString()
  @Length(3, 255, { message: 'Remarks must be between 3 and 255 characters' })
  remarks?: string;
}
