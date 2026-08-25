import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogProductsQueryDto } from './dto/catalog-products-query.dto';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.FETCHED)
  async listProducts(@Query() query: CatalogProductsQueryDto) {
    const response = await this.catalogService.listProducts(query);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get('products/:id')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.FETCHED)
  async getProductDetail(@Param('id') id: string) {
    const response = await this.catalogService.getProductDetail(Number(id));
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get('categories')
  @ResponseMessage(SUCCESS_MESSAGES.CATEGORY.FETCHED)
  async getCategories(@Query('flat') flat?: string) {
    const response = await this.catalogService.getCategories(flat === 'true');
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Get('sellers/:id')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.FETCHED)
  async getSellerProfile(@Param('id') id: string) {
    const response = await this.catalogService.getSellerProfile(Number(id));
    return DataSanitizer.sanitizeData(response);
  }
}
