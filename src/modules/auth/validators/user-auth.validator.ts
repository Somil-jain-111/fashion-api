import { Injectable } from '@nestjs/common';
import { User } from '../entities';
import { UserRepository } from 'src/modules/auth/repository';
import { ERROR_CODES } from 'src/default/error/error.code';
import { BusinessException } from 'src/default/error/business.exception';
import { UserStatus } from '../constants/auth.constants';

@Injectable()
export class UserAuthValidator {
  constructor(private readonly userRepository: UserRepository) {}

  async getAllowedUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    this.validateUserStatus(user.status);

    return user;
  }

  async validateActiveUserByMobile(mobile: string): Promise<User> {
    const user = await this.userRepository.findByMobile(mobile);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    /**
     * Use validateUserStatus (not throwIfUserNotActive) here: this method is also
     * used on the OTP flow for users that are still IN_APPROVAL/PARTIAL_APPROVED
     * (e.g. right after findOrCreateActiveUserByMobile creates a brand-new user),
     * which must still be allowed to send/verify OTPs. It still blocks
     * BLOCKED/INACTIVE/DELETED users, same as login().
     */
    this.validateUserStatus(user.status);

    return user;
  }

  async validateActiveUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findById(userId, ['role']);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    this.throwIfUserNotActive(user.status);

    return user;
  }

  async validateActiveUserByRefreshToken(refreshToken: string): Promise<User> {
    const user = await this.userRepository.findByRefreshToken(refreshToken);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    this.throwIfUserNotActive(user.status);

    return user;
  }

  private throwIfUserNotActive(status: UserStatus): void {
    switch (status) {
      case UserStatus.ACTIVE:
        return;

      case UserStatus.PARTIAL_APPROVED:
        throw new BusinessException(ERROR_CODES.USER.USER_HOLD);

      case UserStatus.IN_APPROVAL:
        throw new BusinessException(ERROR_CODES.USER.USER_PENDING);

      case UserStatus.BLOCKED:
        throw new BusinessException(ERROR_CODES.USER.USER_BLOCKED);

      case UserStatus.INACTIVE:
        throw new BusinessException(ERROR_CODES.USER.USER_INACTIVE);

      case UserStatus.DELETED:
        throw new BusinessException(ERROR_CODES.USER.USER_DELETED);

      default:
        throw new BusinessException(ERROR_CODES.USER.USER_INVALID_STATUS);
    }
  }

  validateUserStatus(status: UserStatus): void {
    switch (status) {
      case UserStatus.ACTIVE:
      case UserStatus.PARTIAL_APPROVED:
      case UserStatus.IN_APPROVAL:
        return;

      case UserStatus.BLOCKED:
        throw new BusinessException(ERROR_CODES.USER.USER_BLOCKED);

      case UserStatus.INACTIVE:
        throw new BusinessException(ERROR_CODES.USER.USER_INACTIVE);

      case UserStatus.DELETED:
        throw new BusinessException(ERROR_CODES.USER.USER_DELETED);

      default:
        throw new BusinessException(ERROR_CODES.USER.USER_INVALID_STATUS);
    }
  }
}
