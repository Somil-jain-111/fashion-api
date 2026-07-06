import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { UserPartnerType, UserRole } from 'src/default/common/enums/user-type.enum';

export class SendOtpDto {
  @IsNotEmpty({ message: 'Mobile number is required' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be valid Indian mobile number',
  })
  mobile!: string;

  @IsOptional()
  @IsEnum([UserRole.RETAILER, UserRole.DISTRIBUTOR])
  role: UserRole.RETAILER | UserRole.DISTRIBUTOR = UserRole.RETAILER;

  @IsOptional()
  @IsEnum(UserPartnerType)
  partnerType?: UserPartnerType;
}
