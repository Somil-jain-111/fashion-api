import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ProductsService } from '../../products/products.service';
import { AdminListProductsQueryDto } from '../../products/dto/admin-list-products-query.dto';
import { RejectProductDto } from '../../products/dto/reject-product.dto';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';
import { SUCCESS_MESSAGES } from 'src/default/common/constants/success-messages.constant';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('super-admin/products')
export class SuperAdminProductsController {
  constructor(private readonly productsService: ProductsService) {}
  @NoCache()
  @Roles([UserRole.SUPERADMIN, UserRole.ADMIN])
  @Get()
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.FETCHED)
  async list(@Query() query: AdminListProductsQueryDto) {
    const response = await this.productsService.adminList(query);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.SUPERADMIN, UserRole.ADMIN])
  @Get(':id')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.FETCHED)
  async detail(@Param('id') id: string) {
    const response = await this.productsService.adminGetById(Number(id));
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.SUPERADMIN])
  @Post(':id/approve')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.REVIEWED)
  async approve(@Param('id') id: string, @Req() req: any) {
    const response = await this.productsService.approve(Number(id), req.user.id);
    return DataSanitizer.sanitizeData(response);
  }
  @NoCache()
  @Roles([UserRole.SUPERADMIN])
  @Post(':id/reject')
  @ResponseMessage(SUCCESS_MESSAGES.PRODUCT.REVIEWED)
  async reject(@Param('id') id: string, @Body() dto: RejectProductDto, @Req() req: any) {
    const response = await this.productsService.reject(Number(id), dto.reason, req.user.id);
    return DataSanitizer.sanitizeData(response);
  }
}
