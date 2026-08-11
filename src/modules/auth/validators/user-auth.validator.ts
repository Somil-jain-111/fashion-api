import { Injectable } from '@nestjs/common';
import { User } from '../entities';
import { UserRepository } from 'src/modules/auth/repository';
import { ERROR_CODES } from 'src/default/error/error.code';
import { BusinessException } from 'src/default/error/business.exception';
import { UserStatus } from '../constants/auth.constants';
import { UserBlockRepository } from 'src/modules/user/repository/user-block.repository';
import { BlockType } from 'src/modules/user/enums/user-block.enum';

@Injectable()
export class UserAuthValidator {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userBlockRepository: UserBlockRepository
  ) {}

  async validateUserBlockedStatus(userOrUserId: User | number): Promise<void> {
    const userId = typeof userOrUserId === 'number' ? userOrUserId : Number(userOrUserId.id);
    const status = typeof userOrUserId === 'number' ? null : userOrUserId.status;

    if (status === UserStatus.BLOCKED) {
      throw new BusinessException(ERROR_CODES.USER.USER_BLOCKED);
    }

    const activeBlock = await this.userBlockRepository.findActiveBlockByUserId(userId);

    if (activeBlock) {
      if (activeBlock.blockType === BlockType.PERMANENT_BLOCK) {
        throw new BusinessException(ERROR_CODES.USER.USER_BLOCKED);
      }

      if (activeBlock.blockType === BlockType.TEMP_BLOCK && activeBlock.blockedTill) {
        const formattedTill = activeBlock.blockedTill.toISOString();

        throw new BusinessException(
          ERROR_CODES.USER.USER_TEMP_BLOCKED,
          { blockedTill: formattedTill },
          {
            blockedTill: activeBlock.blockedTill,
            remarks: activeBlock.remarks,
            blockType: BlockType.TEMP_BLOCK,
          }
        );
      }
    }
  }

  async getAllowedUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    await this.validateUserBlockedStatus(user);
    this.validateUserStatus(user.status);

    return user;
  }

  async validateActiveUserByMobile(mobile: string): Promise<User> {
    const user = await this.userRepository.findByMobile(mobile);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    await this.validateUserBlockedStatus(user);
    this.validateUserStatus(user.status);

    return user;
  }

  async validateActiveUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findById(userId, ['role']);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    await this.validateUserBlockedStatus(user);
    this.throwIfUserNotActive(user.status);

    return user;
  }

  async validateActiveUserByRefreshToken(refreshToken: string): Promise<User> {
    const user = await this.userRepository.findByRefreshToken(refreshToken);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    await this.validateUserBlockedStatus(user);
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
