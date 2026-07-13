import { Injectable } from '@nestjs/common';

import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { RolesRepository, UserRepository } from 'src/modules/user/repository';
import { UserStatus } from 'src/modules/auth/constants/auth.constants';
import { UserAuthValidator } from 'src/modules/auth/validators/user-auth.validator';
import { SendOtpDto } from 'src/modules/auth/dto/send-otp.dto';

@Injectable()
export class UserValidator {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RolesRepository,

    private readonly userAuthValidator: UserAuthValidator
  ) {}

  async findOrCreateActiveUserByMobile(dto: SendOtpDto, createUser: boolean = true) {
    let user = await this.userRepository.findByMobile(dto.mobile);

    if (!user) {
      if (createUser) {
        const role = await this.roleRepository.findByName(dto.role);

        if (!role) {
          throw new BusinessException(ERROR_CODES.AUTH.INVALID_ROLE);
        }

        user = await this.userRepository.save({
          mobile: dto.mobile,
          status: UserStatus.IN_APPROVAL,
          ...(dto.partnerType && {
            partnerType: dto.partnerType,
          }),
          role: { id: role.id },
        });

        return user;
      } else {
        throw new BusinessException(ERROR_CODES.AUTH.INVALID_MOBILE);
      }
    }

    await this.userAuthValidator.validateActiveUserByMobile(dto.mobile);

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
