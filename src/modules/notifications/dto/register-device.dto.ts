import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { DevicePlatform } from '../enum/notification-channel.enum';

export class RegisterDeviceDto {
  @IsNotEmpty()
  @IsString()
  deviceToken!: string;

  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}

export class RemoveDeviceDto {
  @IsNotEmpty()
  @IsString()
  deviceToken!: string;
}
