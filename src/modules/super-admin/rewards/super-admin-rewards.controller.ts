import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { NoCache } from 'src/default/cache/cache.decorator';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { RewardsService } from 'src/modules/rewards/rewards.service';
import { GetProductQueryDTO } from 'src/modules/rewards/interfaces/fetch-catalogue-products.input';
import { SuperAdminRewardProductListResponseDto } from './dto/response/reward-product-response.dto';
import { SuperAdminRewardCategoriesResponseDto } from './dto/response/reward-category-response.dto';

/**
 * Thin proxy over the existing RewardsService (src/modules/rewards) — product/category data
 * itself comes from the vendor rewards catalogue API (ProductProvider), same source the
 * retailer-facing GET /rewards/products & /rewards/categories already read from. This just
 * re-exposes the same catalogue lookups to SUPERADMIN for browsing/management, rather than
 * duplicating the vendor data into a separate local table.
 */
@ApiTags('Super Admin - Rewards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.SUPERADMIN])
@NoCache()
@Controller('super-admin/rewards')
export class SuperAdminRewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @ApiOkResponse({ type: SuperAdminRewardProductListResponseDto })
  @NoCache()
  @Get('products')
  async getAllProducts(@Req() request: any, @Query() filters: GetProductQueryDTO) {
    const adminId = request.user.id;
    const response = await this.rewardsService.getAllProducts(adminId, filters);
    return DataSanitizer.sanitizeData(new SuperAdminRewardProductListResponseDto(response));
  }

  @ApiOkResponse({ type: SuperAdminRewardCategoriesResponseDto })
  @NoCache()
  @Get('categories')
  async getAllCategories(@Req() request: any) {
    const adminId = request.user.id;
    const response = await this.rewardsService.getCatalogueCategories(adminId);
    return DataSanitizer.sanitizeData(new SuperAdminRewardCategoriesResponseDto(response));
  }
}
