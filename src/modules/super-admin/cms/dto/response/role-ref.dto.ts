import { ApiProperty } from '@nestjs/swagger';

export class RoleRefDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}
