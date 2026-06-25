import { Global, Module } from '@nestjs/common';
import { LoginHistoriesRepository } from './login-histories.repository';
import { RolesRepository } from './role.repository';
import { UserRepository } from './user.repository';
import { RevokedTokenRepository } from './revoked_token.repository';
import { AddressRepository } from './address.repository';
import { OrderStatusHistoryRepository } from './order-status-history.repository';
import { OrderRepository } from './order.repository';
import { PincodeRepository } from './pincode.repository';
import { PointHistoryRepository } from './point-history.repository';
import { ShippingDetailRepository } from './shipping-details.repository';
import { VoucherRepository } from './voucher.repository';

@Global()
@Module({
  providers: [
    UserRepository,
    RolesRepository,
    LoginHistoriesRepository,
    RevokedTokenRepository,
    AddressRepository,
    OrderStatusHistoryRepository,
    OrderRepository,
    PincodeRepository,
    PointHistoryRepository,
    ShippingDetailRepository,
    VoucherRepository,
  ],
  exports: [
    UserRepository,
    RolesRepository,
    LoginHistoriesRepository,
    RevokedTokenRepository,
    AddressRepository,
    OrderStatusHistoryRepository,
    OrderRepository,
    PincodeRepository,
    PointHistoryRepository,
    ShippingDetailRepository,
    VoucherRepository,
  ],
})
export class RepositoryModule {}
