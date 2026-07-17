import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';

import { ProductsService } from './products.service';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { ProductQueryDto } from './dto/product-query.dto';
import { NoCache } from 'src/default/cache/cache.decorator';

@NoCache()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * GET /products
   */
  @Get()
  async findAll(@Query() query: ProductQueryDto) {
    const response = await this.productsService.findAll(query);

    return DataSanitizer.sanitizeData(response);
  }

  /**
   * GET /products/categories
   */
  @Get('categories')
  async getCategories(@Query() query: ProductQueryDto) {
    const response = await this.productsService.getCategories(query);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * GET /products/categories/:categoryId/sub-categories
   */
  @Get('categories/:categoryId/sub-categories')
  async getSubCategories(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() query: ProductQueryDto
  ) {
    const response = await this.productsService.getSubCategories(categoryId, query);
    return DataSanitizer.sanitizeData(response);
  }

  /**
   * GET /products/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const response = await this.productsService.findOne(id);
    return DataSanitizer.sanitizeData(response);
  }
}
