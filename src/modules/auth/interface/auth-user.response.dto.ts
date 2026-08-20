import { UserStatus } from '../constants/auth.constants';

export class TempBlockResponseDto {
  is_blocked!: boolean;
  block_type?: string | null;
  blocked_till?: string | null;
  remarks?: string | null;
}

export class KycDetailsResponseDto {
  status?: string;
  maskedDocumentNumber?: string;
}

export class AuthUserResponseDto {
  id!: string;
  uuid!: string;
  applicationId?: string;
  username!: string;
  mobile!: string;
  whatsapp_number!: string;
  email!: string;
  image_url!: string;
  status!: UserStatus;
  points!: string;
  role?: string;
  created_at?: string;
  date_of_birth?: string | null;
  anniversary_date?: string | null;
  panDetails?: KycDetailsResponseDto;
  aadhaarDetails?: KycDetailsResponseDto;
  gstDetails?: KycDetailsResponseDto;
  blockedDetails?: TempBlockResponseDto | null;
  storeInformation?: {
    storeName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}
