import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { UserPartnerType } from 'src/default/common/enums/user-type.enum';

export class SaveBasicInfoDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  username: string;

  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsOptional()
  @Matches(/^[6-9]\d{9}$/, { message: 'Invalid WhatsApp number' })
  whatsappNumber?: string;

  @IsEnum(UserPartnerType, { message: 'Invalid partner type' })
  @IsNotEmpty({ message: 'Partner type is required' })
  partnerType: UserPartnerType;
}
