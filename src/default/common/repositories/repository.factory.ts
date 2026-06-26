import { DataSource } from 'typeorm';
import { UserRepository } from './user.repository';
import { RolesRepository } from './role.repository';
import { LoginHistoriesRepository } from './login-histories.repository';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { RevokedTokenRepository } from './revoked_token.repository';
import { AddressRepository } from './address.repository';
import { PincodeRepository } from './pincode.repository';
import { OrderStatusHistoryRepository } from './order-status-history.repository';
import { OrderRepository } from './order.repository';
import { ShippingDetailRepository } from './shipping-details.repository';
import { VoucherRepository } from './voucher.repository';
import { PointHistoryRepository } from './point-history.repository';
import { RedemptionConfigRepository } from './redemption-config.repository';

export class RepositoryFactory {
  private static repositories = new Map<string, any>();

  static init(dataSource: DataSource) {
    this.repositories.set('user', new UserRepository(dataSource));
    this.repositories.set('roles', new RolesRepository(dataSource));
    this.repositories.set('loginhistories', new LoginHistoriesRepository(dataSource));
    this.repositories.set('revoked_tokens', new RevokedTokenRepository(dataSource));
    this.repositories.set('addresses', new AddressRepository(dataSource));
    this.repositories.set('pincode', new PincodeRepository(dataSource));
    this.repositories.set('order_status_history', new OrderStatusHistoryRepository(dataSource));
    this.repositories.set('order', new OrderRepository(dataSource));
    this.repositories.set('shipping_detail', new ShippingDetailRepository(dataSource));
    this.repositories.set('voucher', new VoucherRepository(dataSource));
    this.repositories.set('point_history', new PointHistoryRepository(dataSource));
    this.repositories.set('redemption_config', new RedemptionConfigRepository(dataSource));

  }

  static get(name: string) {
    const repo = this.repositories.get(name.toLowerCase());
    if (!repo) {
      throw new BusinessException(ERROR_CODES.REPOSITORY.REPOSITORY_INITIALIZATION_FAILED);
    }
    return repo;
  }

  static listKeys(): string[] {
    return Array.from(this.repositories.keys());
  }
}
