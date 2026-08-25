import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @NoCache()
  @Get()
  @ResponseMessage(SUCCESS_MESSAGES.CATEGORY.FETCHED)
  async getTree(@Query('flat') flat?: string) {
    const response = await this.categoriesService.getTree(flat === 'true');
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @Get(':id')
  @ResponseMessage(SUCCESS_MESSAGES.CATEGORY.FETCHED)
  async getById(@Param('id') id: string) {
    const response = await this.categoriesService.getById(Number(id));
    return DataSanitizer.sanitizeData(response);
  }

  @NoCache()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.SELLER_ADMIN])
  @Post()
  @ResponseMessage(SUCCESS_MESSAGES.CATEGORY.CREATED)
  async create(@Body() dto: CreateCategoryDto, @Req() req: any) {
    const response = await this.categoriesService.create(dto, req.user.id, req.user.role);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([UserRole.SUPERADMIN, UserRole.ADMIN])
  @Post(':id')
  @ResponseMessage(SUCCESS_MESSAGES.CATEGORY.UPDATED)
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto, @Req() req: any) {
    const response = await this.categoriesService.update(Number(id), dto, req.user.role);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles([UserRole.SUPERADMIN, UserRole.ADMIN])
  @Post('delete/:id')
  @ResponseMessage(SUCCESS_MESSAGES.CATEGORY.DELETED)
  async remove(@Param('id') id: string) {
    await this.categoriesService.remove(Number(id));
    return DataSanitizer.sanitizeData(null);
  }
}
