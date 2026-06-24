import { UserStatus } from "../constants/auth.constants";

export class AuthUserResponseDto {
  id: bigint;
  uuid: string;
  username: string;
  mobile: string;
  whatsapp_number: string;
  email: string;
  image_url: string;
  status: UserStatus;
  role: {
    id: bigint;
    name: string;
  };
  created_at: string;
}
