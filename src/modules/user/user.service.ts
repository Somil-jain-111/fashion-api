import { Injectable } from '@nestjs/common';
import { UserRepository } from 'src/modules/auth/repository';
import { UserBlockRepository } from './repository/user-block.repository';
import { PermanentBlockUserDto, TempBlockUserDto, UnblockUserDto } from './dto/block-user.dto';
import { BlockType } from './enums/user-block.enum';
import { UserStatus } from 'src/modules/auth/constants/auth.constants';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { UserType } from 'src/default/common/enums/user-type.enum';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userBlockRepository: UserBlockRepository
  ) {}

  /**
   * Temporarily blocks a user for a specified number of days
   *
   * @param dto - TempBlockUserDto
   * @param performingUser - User performing the action
   * @returns - Blocked user information
   */
  async tempBlockUser(dto: TempBlockUserDto, performingUser: any) {
    const targetUser = await this.userRepository.findOne(
      {
        id: dto.userId,
        active: true,
        role: { user_type: UserType.USER },
      },
      ['role']
    );

    if (!targetUser) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    const allowedStatuses: UserStatus[] = [
      UserStatus.IN_APPROVAL,
      UserStatus.PARTIAL_APPROVED,
      UserStatus.ACTIVE,
    ];

    if (!allowedStatuses.includes(targetUser.status)) {
      throw new BusinessException(ERROR_CODES.USER.INVALID_BLOCK_STATUS);
    }

    const existingBlock = await this.userBlockRepository.findActiveBlockByUserId(dto.userId);
    if (existingBlock) {
      throw new BusinessException(ERROR_CODES.USER.USER_ALREADY_BLOCKED, {
        blockedTill: existingBlock.blockedTill
          ? existingBlock.blockedTill.toISOString()
          : 'Indefinitely',
      });
    }

    if (!dto.daysToBlock || dto.daysToBlock < 1) {
      throw new BusinessException(ERROR_CODES.VALIDATION.INVALID_PAYLOAD);
    }

    const blockedFrom = new Date();
    const blockedTill = new Date(blockedFrom);
    blockedTill.setDate(blockedTill.getDate() + dto.daysToBlock);
    blockedTill.setHours(23, 59, 59, 999);

    await this.userBlockRepository.deactivateBlocksForUser(dto.userId);

    const blockLog = await this.userBlockRepository.save({
      user: { id: dto.userId } as any,
      blockType: BlockType.TEMP_BLOCK,
      daysToBlock: dto.daysToBlock,
      blockedFrom,
      blockedTill,
      remarks: dto.remarks,
      blockedBy: performingUser?.id ? ({ id: performingUser.id } as any) : null,
      active: true,
    });

    return {
      id: blockLog.id,
      userId: dto.userId,
      blockType: BlockType.TEMP_BLOCK,
      daysToBlock: dto.daysToBlock,
      blockedFrom: blockedFrom.toISOString(),
      blockedTill: blockedTill.toISOString(),
      remarks: dto.remarks,
    };
  }

  /**
   * Permanently blocks a user for an indefinite time period
   *
   * @param dto
   * @param performingUser
   * @returns
   */
  async permanentBlockUser(dto: PermanentBlockUserDto, performingUser: any) {
    const targetUser = await this.userRepository.findOne(
      {
        id: dto.userId,
        active: true,
        role: { user_type: UserType.USER },
      },
      ['role']
    );

    if (!targetUser) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    const allowedStatuses: UserStatus[] = [
      UserStatus.IN_APPROVAL,
      UserStatus.PARTIAL_APPROVED,
      UserStatus.ACTIVE,
    ];

    if (!allowedStatuses.includes(targetUser.status)) {
      throw new BusinessException(ERROR_CODES.USER.INVALID_BLOCK_STATUS);
    }

    const existingBlock = await this.userBlockRepository.findActiveBlockByUserId(dto.userId);
    if (existingBlock) {
      throw new BusinessException(ERROR_CODES.USER.USER_ALREADY_BLOCKED);
    }

    await this.userBlockRepository.deactivateBlocksForUser(dto.userId);

    const blockLog = await this.userBlockRepository.save({
      user: { id: dto.userId } as any,
      blockType: BlockType.PERMANENT_BLOCK,
      daysToBlock: null,
      blockedFrom: new Date(),
      blockedTill: null,
      remarks: dto.remarks,
      blockedBy: performingUser?.id ? ({ id: performingUser.id } as any) : null,
      active: true,
    });

    return {
      id: blockLog.id,
      userId: dto.userId,
      blockType: BlockType.PERMANENT_BLOCK,
      blockedFrom: blockLog.blockedFrom.toISOString(),
      blockedTill: null,
      remarks: dto.remarks,
    };
  }

  /**
   * Removes the last permanent block of the user if any
   *
   * @param dto
   * @param performingUser
   * @returns
   */
  async removePermanentBlock(dto: UnblockUserDto, performingUser: any) {
    const targetUser = await this.userRepository.findById(dto.userId);

    if (!targetUser) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    const activeBlock = await this.userBlockRepository.findActiveBlockByUserId(dto.userId);

    if (!activeBlock || activeBlock.blockType !== BlockType.PERMANENT_BLOCK) {
      throw new BusinessException(ERROR_CODES.USER.NO_PERMANENT_BLOCK);
    }

    const unblockedAt = new Date();

    await this.userBlockRepository.updateById(activeBlock.id, {
      blockedTill: unblockedAt,
      active: false,
    } as any);

    return {
      id: activeBlock.id,
      userId: dto.userId,
      blockType: BlockType.PERMANENT_BLOCK,
      unblockedAt: unblockedAt.toISOString(),
      remarks: dto.remarks || activeBlock.remarks || null,
    };
  }
}
