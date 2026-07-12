import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { NoCache } from 'src/default/cache/cache.decorator';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { SkipThrottle } from '@nestjs/throttler';
import { GetProductQueryDTO } from './interfaces/fetch-catalogue-products.input';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';

@NoCache()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@SkipThrottle()
@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get('products')
  async getAllProducts(@Req() request: Request, @Query() filters: GetProductQueryDTO) {
    const userId = (request as any).user.id;

    const response = await this.rewardsService.getAllProducts(userId, filters);

    return DataSanitizer.sanitizeData(response);
  }

  @Get('categories')
  async getAllCategories(@Req() request: Request) {
    const userId = (request as any).user.id;

    const response = await this.rewardsService.getCatalogueCategories(userId);
    return DataSanitizer.sanitizeData(response);
  }
}
