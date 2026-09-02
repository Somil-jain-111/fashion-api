import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import { ProductFormOptionsQueryDto } from './dto/product-form-options-query.dto';
import {
  ProductDeleteResponseDto,
  ProductFormOptionsResponseDto,
  ProductListResponseDto,
  ProductResponseDto,
} from './dto/product-response.dto';

/**
 * @NoCache() on every route here: the global CustomCacheInterceptor keys GET
 * responses by URL only, with no per-user distinction — without this, seller A's
 * `GET /sellers/products` response would get served to seller B on the next hit.
 */
@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sellers/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @NoCache()
  @Roles([UserRole.SELLER_ADMIN])
  @Get('form-options')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.FETCHED)
  async getFormOptions(
    @Query() query: ProductFormOptionsQueryDto
  ): Promise<ProductFormOptionsResponseDto> {
    const response = await this.productsService.getFormOptions(query.categoryId);
    return DataSanitizer.sanitizeData(response) as ProductFormOptionsResponseDto;
  }

  /** Frontend-friendly alias used by the seller product wizard. */
  @NoCache()
  @Roles([UserRole.SELLER_ADMIN])
  @Get('dropdowns')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.FETCHED)
  async getDropdowns(
    @Query() query: ProductFormOptionsQueryDto
  ): Promise<ProductFormOptionsResponseDto> {
    const response = await this.productsService.getFormOptions(query.categoryId);
    return DataSanitizer.sanitizeData(response) as ProductFormOptionsResponseDto;
  }

  @NoCache()
  @Roles([UserRole.SELLER_ADMIN])
  @Post()
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.CREATED)
  async create(@Body() dto: CreateProductDto, @Req() req: any): Promise<ProductResponseDto> {
    const response = await this.productsService.create(req.user.id, dto);
    return DataSanitizer.sanitizeData(response) as ProductResponseDto;
  }
  @NoCache()
  @Roles([UserRole.SELLER_ADMIN])
  @Get()
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.FETCHED)
  async listOwn(
    @Query() query: ListProductsQueryDto,
    @Req() req: any
  ): Promise<ProductListResponseDto> {
    const response = await this.productsService.listOwn(req.user.id, query);
    return DataSanitizer.sanitizeData(response) as ProductListResponseDto;
  }
  @NoCache()
  @Roles([UserRole.SELLER_ADMIN, UserRole.ADMIN, UserRole.SUPERADMIN])
  @Get(':id')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.FETCHED)
  async getOwn(@Param('id') id: string, @Req() req: any): Promise<ProductResponseDto> {
    const response = await this.productsService.getOwn(Number(id), req.user);
    return DataSanitizer.sanitizeData(response) as ProductResponseDto;
  }
  @NoCache()
  @Roles([UserRole.SELLER_ADMIN, UserRole.ADMIN, UserRole.SUPERADMIN])
  @Post(':id')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.UPDATED)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @Req() req: any
  ): Promise<ProductResponseDto> {
    const response = await this.productsService.update(Number(id), dto, req.user);
    return DataSanitizer.sanitizeData(response) as ProductResponseDto;
  }
  @NoCache()
  @Roles([UserRole.SELLER_ADMIN, UserRole.ADMIN, UserRole.SUPERADMIN])
  @Post('delete/:id')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.DELETED)
  async remove(@Param('id') id: string, @Req() req: any): Promise<ProductDeleteResponseDto> {
    await this.productsService.remove(Number(id), req.user);
    return DataSanitizer.sanitizeData({ deleted: true }) as ProductDeleteResponseDto;
  }

  @NoCache()
  @Roles([UserRole.SELLER_ADMIN])
  @Post(':id/status')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.STATUS_UPDATED)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProductStatusDto,
    @Req() req: any
  ): Promise<ProductResponseDto> {
    const response = await this.productsService.updateStatus(Number(id), dto.status, req.user.id);
    return DataSanitizer.sanitizeData(response) as ProductResponseDto;
  }
}
