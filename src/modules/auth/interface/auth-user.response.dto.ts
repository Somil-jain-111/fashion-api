import { UserStatus } from "../constants/auth.constants";

export class AuthUserResponseDto {
  id: string;
  uuid: string;
  username: string;
  mobile: string;
  whatsapp_number: string;
  email: string;
  image_url: string;
  status: UserStatus;
  role: {
    id: string;
    name: string;
  };
  created_at: string;
}
