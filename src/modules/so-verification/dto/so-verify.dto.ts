import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { SoRejectionReason } from '../entities/so-verification.entity';

export class SoVerifyOutletDto {
  @IsNotEmpty()
  @IsString()
  soSelfieUrl!: string;

  @IsNotEmpty()
  @IsString()
  storeOwnerImageUrl!: string;

  @IsOptional()
  @IsString()
  outletImageUrl?: string;

  // Geo captured on device at time of submission
  @IsNotEmpty()
  @IsNumber()
  geoLat!: number;

  @IsNotEmpty()
  @IsNumber()
  geoLng!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class SoRejectOutletDto {
  @IsNotEmpty()
  @IsEnum(SoRejectionReason, {
    message: `rejectionReason must be one of: ${Object.values(SoRejectionReason).join(', ')}`,
  })
  rejectionReason!: SoRejectionReason;

  @IsOptional()
  @IsString()
  rejectionProofImageUrl?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
