import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export enum L1ActionType {
  FORWARD_TO_L2 = 'FORWARD_TO_L2',
  REWORK = 'REWORK',
  TEMP_BLOCK = 'TEMP_BLOCK',
}

export enum L2ActionType {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REWORK = 'REWORK',
  PERM_BLOCK = 'PERM_BLOCK',
  REOPEN = 'REOPEN',
}

export class L1ActionDto {
  @IsNotEmpty()
  retailer_user_id!: string;

  @IsNotEmpty()
  @IsEnum(L1ActionType)
  action!: L1ActionType;

  // mandatory when action = REWORK
  @IsOptional()
  @IsArray()
  rework_fields?: string[];

  @IsOptional()
  @IsString()
  comment?: string;
}

export class L2ActionDto {
  @IsNotEmpty()
  retailer_user_id!: string;

  @IsNotEmpty()
  @IsEnum(L2ActionType)
  action!: L2ActionType;

  @IsOptional()
  @IsArray()
  rework_fields?: string[];

  // mandatory when action = REJECT (enforced in service, not here,
  // since it's conditional on the action value)
  @IsOptional()
  @IsString()
  comment?: string;
}

export class InitiateRekycDto {
  @IsNotEmpty()
  retailer_user_id!: string;

  @IsNotEmpty()
  @IsString()
  reason!: string;
}