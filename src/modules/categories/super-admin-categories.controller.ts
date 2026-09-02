import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { CategoriesService } from './categories.service';
import { AdminListCategoriesQueryDto } from './dto/admin-list-categories-query.dto';

class RejectCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason!: string;
}

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@Controller('super-admin/categories')
export class SuperAdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async list(@Query() query: AdminListCategoriesQueryDto) {
    return DataSanitizer.sanitizeData(
      await this.categoriesService.listForReview({
        status: query.status,
        page: query.page,
        limit: query.limit,
      })
    );
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return DataSanitizer.sanitizeData(await this.categoriesService.adminDetail(Number(id)));
  }

  @Post(':id/approve')
  async approve(@Param('id') id: string, @Req() req: any) {
    return DataSanitizer.sanitizeData(
      await this.categoriesService.review(Number(id), true, undefined, req.user.id)
    );
  }

  @Post(':id/reject')
  async reject(@Param('id') id: string, @Body() dto: RejectCategoryDto, @Req() req: any) {
    return DataSanitizer.sanitizeData(
      await this.categoriesService.review(Number(id), false, dto.reason, req.user.id)
    );
  }
}
