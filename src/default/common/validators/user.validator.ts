import { Injectable } from '@nestjs/common';

import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { RolesRepository, UserRepository } from 'src/default/common/repositories';
import { UserStatus } from 'src/modules/auth/constants/auth.constants';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { UserPartnerType, UserRole, UserType } from '../enums/user-type.enum';

@Injectable()
export class UserValidator {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RolesRepository,

    private readonly userAuthValidator: UserAuthValidator
  ) {}

  async findOrCreateActiveUserByMobile(mobile: string) {
    let user = await this.userRepository.findByMobile(mobile);

    if (!user) {
      let role = await this.roleRepository.findByName(UserRole.RETAILER);
      if (!role) {
        role = await this.roleRepository.createRole({
          name: UserRole.RETAILER,
          code: null,
          user_type: UserType.USER,
        });
      }
      user = await this.userRepository.save({
        mobile,
        status: UserStatus.ACTIVE,
        // user_type: UserType.USER,
        partnerType: UserPartnerType.INDIVIDUAL,
        role: { id: role.id },
      });
      console.log('user', user);

      return user;
    }

    await this.userAuthValidator.validateActiveUserByMobile(mobile);
    return user;
  }

  //   async validateActiveUserById(userId: number | bigint) {
  //     const user = await this.userRepository.findById(userId);

  //     if (!user) {
  //       throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
  //     }

  //     if (!user.isActive) {
  //       throw new BusinessException(ERROR_CODES.USER.USER_INACTIVE);
  //     }

  //     return user;
  //   }
}
