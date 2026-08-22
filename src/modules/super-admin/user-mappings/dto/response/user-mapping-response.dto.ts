import { ApiProperty } from '@nestjs/swagger';
import { SimplePaginationDto } from 'src/default/common/dto/simple-pagination.dto';
import { MappingType } from 'src/default/common/enums/user-mapping.enum';

class UserMappingUserRefDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ required: false, nullable: true })
  firmName?: string | null;

  @ApiProperty({ required: false, nullable: true })
  mobile?: string | null;
}

export class SuperAdminUserMappingResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: MappingType })
  mappingType: MappingType;

  @ApiProperty()
  active: boolean;

  @ApiProperty({ type: UserMappingUserRefDto, nullable: true })
  child: UserMappingUserRefDto | null;

  @ApiProperty({ type: UserMappingUserRefDto, nullable: true })
  parent: UserMappingUserRefDto | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(mapping: any) {
    Object.assign(this, mapping);
  }
}

export class SuperAdminUserMappingListResponseDto {
  @ApiProperty({ type: [SuperAdminUserMappingResponseDto] })
  items: SuperAdminUserMappingResponseDto[];

  @ApiProperty({ type: SimplePaginationDto })
  pagination: SimplePaginationDto;

  constructor(response: { items: any[]; pagination: SimplePaginationDto }) {
    this.items = response.items.map((item) => new SuperAdminUserMappingResponseDto(item));
    this.pagination = response.pagination;
  }
}
