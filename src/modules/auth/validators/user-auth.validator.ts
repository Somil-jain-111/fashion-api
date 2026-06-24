import { Injectable } from "@nestjs/common";
import { User } from "../entities";
import { UserRepository } from "src/default/common/repositories";
import { ERROR_CODES } from "src/default/error/error.code";
import { BusinessException } from "src/default/error/business.exception";
import { UserStatus } from "../constants/auth.constants";

@Injectable()
export class UserAuthValidator {
  constructor(private readonly userRepository: UserRepository) {}

  async validateActiveUserByMobile(mobile: string): Promise<User> {
    const user = await this.userRepository.findByMobile(mobile);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    this.throwIfUserNotActive(user.status);

    return user;
  }

  async validateActiveUserById(userId: bigint): Promise<User> {
    const user = await this.userRepository.findById(userId);

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
      case UserStatus.REJECTED:
        throw new BusinessException(ERROR_CODES.USER.USER_REJECTED);

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
        return;
      case UserStatus.REJECTED:
        throw new BusinessException(ERROR_CODES.USER.USER_REJECTED);

      case UserStatus.INACTIVE:
        throw new BusinessException(ERROR_CODES.USER.USER_INACTIVE);

      case UserStatus.DELETED:
        throw new BusinessException(ERROR_CODES.USER.USER_DELETED);

      default:
        throw new BusinessException(ERROR_CODES.USER.USER_INVALID_STATUS);
    }
  }
}
