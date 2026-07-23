import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';
import { AnnouncementType } from '../enum/announcement-type.enum';

export class AnnouncementQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(AnnouncementType)
  type?: AnnouncementType;
}
