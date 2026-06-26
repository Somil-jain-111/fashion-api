import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { DataSanitizer } from 'src/default/common/utils/sanitize.utils';
import { NoCache } from 'src/default/cache/cache.decorator';
import { SkipThrottle } from '@nestjs/throttler';
import { IdempotencyInterceptor } from 'src/default/common/interceptors/idempotency-check.interceptor';
import { JwtAuthGuard } from 'src/default/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/default/common/guards/roles.guard';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { Roles } from 'src/default/common/decorators/roles.decorator';
import { GetPincodeDto } from './dto/get-pincode.dto';
import { PaginationQueryDto } from 'src/default/common/dto/pagination-query.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ResponseMessage } from 'src/default/common/decorators/response-message.decorator';

@NoCache()
@SkipThrottle()
@UseInterceptors(IdempotencyInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([UserRole.RETAILER])
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get('pincode/:pincode')
  async getStateAndCity(@Param('pincode') params: GetPincodeDto) {
    const response = await this.addressesService.getStateAndCity(params.pincode);
    return DataSanitizer.sanitizeData(response);
  }

  @Get()
  async getMyAddresses(@Req() req: any, @Query() query: PaginationQueryDto) {
    const response = await this.addressesService.getMyAddresses(BigInt(req.user.id), query);

    return DataSanitizer.sanitizeData(response);
  }

  @Get(':id')
  async getAddressById(@Req() req: any, @Param('id') id: string) {
    const response = await this.addressesService.getAddressById(BigInt(req.user.id), BigInt(id));

    return DataSanitizer.sanitizeData(response);
  }

  @Post()
  async createAddress(@Req() req: any, @Body() body: CreateAddressDto) {
    const response = await this.addressesService.createAddress(BigInt(req.user.id), body);

    return DataSanitizer.sanitizeData(response);
  }
  @Post(':id')
  async updateAddress(@Req() req: any, @Param('id') id: string, @Body() body: UpdateAddressDto) {
    const response = await this.addressesService.updateAddress(
      BigInt(req.user.id),
      BigInt(id),
      body
    );

    return DataSanitizer.sanitizeData(response);
  }

  @ResponseMessage('Address deleted successfully')
  @Post(':id/delete')
  async deleteAddress(@Req() req: any, @Param('id') id: string) {
    const response = await this.addressesService.deleteAddress(BigInt(req.user.id), BigInt(id));

    return DataSanitizer.sanitizeData(response);
  }
}
