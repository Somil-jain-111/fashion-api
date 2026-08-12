import { UserStatus } from '../constants/auth.constants';

export class TempBlockResponseDto {
  is_blocked!: boolean;
  block_type?: string | null;
  blocked_till?: string | null;
  remarks?: string | null;
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
  role!: {
    id: string;
    name: string;
  } | null;
  created_at?: string;
  maskedPan?: string;
  maskedAadhaar?: string;
  maskedGst?: string;
  temp_block?: TempBlockResponseDto | null;
}
