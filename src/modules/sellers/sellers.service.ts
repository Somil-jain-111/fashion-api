import { Injectable } from '@nestjs/common';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { UserRepository, RolesRepository } from '../auth/repository';
import { StoreInformationRepository } from './repository';
import { OnboardSellerDto } from './dto';

@Injectable()
export class SellersService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly storeInformationRepository: StoreInformationRepository
  ) {}

  /**
   * Adds seller capability to an already-logged-in account without touching
   * whatever roles it already has (a customer stays a customer too). PAN/GST/Aadhaar
   * verification happens afterward via the existing /sellers/kyc/* endpoints — this
   * endpoint only captures the store name and grants the role.
   */
  async onboard(userId: number, dto: OnboardSellerDto) {
    const isAlreadySeller = await this.userRepository.hasRole(userId, UserRole.SELLER_ADMIN);

    if (isAlreadySeller) {
      throw new BusinessException(ERROR_CODES.SELLER.SELLER_ALREADY_REGISTERED);
    }

    const sellerRole = await this.rolesRepository.findByName(UserRole.SELLER_ADMIN);

    if (!sellerRole) {
      throw new BusinessException(ERROR_CODES.ROLE.ROLE_NOT_FOUND);
    }

    const storeInformation = await this.storeInformationRepository.save({
      sellerId: userId,
      storeName: dto.storeName,
    });

    await this.userRepository.addRole(userId, sellerRole.id);

    return {
      sellerId: userId,
      storeName: storeInformation.storeName,
    };
  }
}
