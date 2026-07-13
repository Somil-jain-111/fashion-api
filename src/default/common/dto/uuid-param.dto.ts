// src/common/dto/uuid-param.dto.ts

import { IsUUID } from 'class-validator';

export class UuidParamDto {
  @IsUUID()
  id: string;
}
