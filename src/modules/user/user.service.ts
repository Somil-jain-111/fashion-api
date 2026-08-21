import { Injectable } from '@nestjs/common';
import { UserRepository, UserMappingRepository } from 'src/modules/auth/repository';
import { UserBlockRepository } from './repository/user-block.repository';
import { PermanentBlockUserDto, TempBlockUserDto, UnblockUserDto } from './dto/block-user.dto';
import { UpdateUserDatesDto } from './dto/update-user.dto';
import { BlockType } from './enums/user-block.enum';
import { UserStatus } from 'src/modules/auth/constants/auth.constants';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { DistUserRoles, UserRole, UserType } from 'src/default/common/enums/user-type.enum';
import { PointHistoryRepository } from '../redemptions/repository';
import { GetPointHistoryQueryDto } from './dto/get-point-history-query.dto';
import { PointHistoryItemDto, PointHistoryResponseDto } from './dto/point-history-response.dto';
import { PointHistory } from '../auth/entities';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userBlockRepository: UserBlockRepository,
    private readonly userMappingRepository: UserMappingRepository,
    private readonly pointHistoryRepository: PointHistoryRepository
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

    // Calculate midnight (23:59:59.999) of the target date in IST timezone (UTC+5:30)
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(blockedFrom.getTime() + IST_OFFSET_MS);

    istDate.setUTCDate(istDate.getUTCDate() + dto.daysToBlock);
    istDate.setUTCHours(23, 59, 59, 999);

    const blockedTill = new Date(istDate.getTime());

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
      throw new BusinessException(ERROR_CODES.USER.USER_ALREADY_BLOCKED, {
        blockedTill: existingBlock.blockedTill
          ? existingBlock.blockedTill.toISOString()
          : 'Indefinitely',
      });
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
   * Removes the last permanent/temp block of the user if any
   *
   * @param dto
   * @param performingUser
   * @returns
   */
  async removeBlock(dto: UnblockUserDto, performingUser: any) {
    const targetUser = await this.userRepository.findById(dto.userId);

    if (!targetUser) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    const activeBlock = await this.userBlockRepository.findActiveBlockByUserId(dto.userId);

    if (!activeBlock) {
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
      blockType: activeBlock.blockType,
      unblockedAt: unblockedAt.toISOString(),
      remarks: dto.remarks || activeBlock.remarks || null,
    };
  }

  /**
   * Update user's date of birth and anniversary date
   *
   * @param userId
   * @param dto
   * @returns
   */
  async updateProfileDates(userId: number, dto: UpdateUserDatesDto) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new BusinessException(ERROR_CODES.USER.USER_NOT_FOUND);
    }

    const updatePayload: any = {};

    if (dto.dateOfBirth) {
      updatePayload.date_of_birth = new Date(dto.dateOfBirth);
    }

    if (dto.anniversaryDate !== undefined && dto.anniversaryDate !== null) {
      updatePayload.anniversary_date = new Date(dto.anniversaryDate);
    }

    if (Object.keys(updatePayload).length > 0) {
      await this.userRepository.updateById(userId, updatePayload);
    }

    const updatedUser = await this.userRepository.findById(userId);

    return {
      id: updatedUser.id,
      dateOfBirth: updatedUser.date_of_birth ? new Date(updatedUser.date_of_birth) : null,
      anniversaryDate: updatedUser.anniversary_date ? new Date(updatedUser.anniversary_date) : null,
    };
  }

  /**
   * Get mapped distributors for a user along with role id and name
   *
   * @param userId
   * @returns List of mapped distributor profiles
   */
  async getMappedDistributors(userId: number, distRole: DistUserRoles) {
    const mappings = await this.userMappingRepository.findMappedDistributors(userId, distRole);

    return mappings.map((mapping) => {
      const distributor = mapping.parent;

      return {
        id: distributor?.id,
        uuid: distributor?.uuid,
        username: distributor?.username,
        firmName: distributor?.firmName,
        mobile: distributor?.mobile,
        status: distributor?.status,
        role: distributor?.role
          ? {
              id: distributor.role.id,
              name: distributor.role.name,
            }
          : null,
      };
    });
  }

   async getPointHistory(
    userId: string | number,
    query: GetPointHistoryQueryDto
  ): Promise<PointHistoryResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [records, totalItems] = await this.pointHistoryRepository.findAllByUser(userId, {
      page,
      limit,
      type: query.type,
      status: query.status,
      month: query.month,
      year: query.year,
    });

    return {
      items: records.map((record) => this.toResponse(record)),
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    };
  }

  async findOne(userId: string | number, id: string): Promise<PointHistoryItemDto> {
    const record = await this.pointHistoryRepository.findByIdAndUser(Number(id), userId);

    if (!record) {
      throw new BusinessException(ERROR_CODES.REDEMPTIONS.POINT_HISTORY_NOT_FOUND);
    }

    return this.toResponse(record);
  }

  async getRemainingPoints(userId: string | number): Promise<{ remainingPoints: number }> {
    const remainingPoints = await this.pointHistoryRepository.getRemainingPointsForUser(userId);
    return { remainingPoints };
  }

  private toResponse(record: PointHistory): PointHistoryItemDto {
    return {
      id: record.id?.toString(),
      points: record.points,
      description: record.description ?? null,
      type: record.type,
      status: record.status,
      month: record.month ?? null,
      year: record.year ?? null,
      expiry: record.expiry ? record.expiry.toISOString() : null,
      date: record.date.toISOString(),
      userRemainingPoints: record.user_remaining_points,
      taxablePoints: record.taxable_points,
      tdsPoints: record.tds_points,
      transactionId: record.transaction_id ?? null,
      orderId: record.order?.id?.toString() ?? null,
      payoutId: record.payout?.id?.toString() ?? null,
    };
  }

}
