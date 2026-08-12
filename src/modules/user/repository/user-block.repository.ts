import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { UserBlock } from '../entities/user-block.entity';
import { BlockType } from '../enums/user-block.enum';

@Injectable()
export class UserBlockRepository extends BaseRepository<UserBlock> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(UserBlock));
  }

  async findActiveBlockByUserId(
    userId: number,
    queryRunner?: QueryRunner
  ): Promise<UserBlock | null> {
    const block = await this.getRepository(queryRunner).findOne({
      where: {
        user: { id: userId },
        active: true,
      } as any,
      order: {
        id: 'DESC',
      },
      relations: ['user', 'blockedBy'],
    });

    if (!block) {
      return null;
    }

    if (block.blockType === BlockType.PERMANENT_BLOCK) {
      return block;
    }

    if (block.blockType === BlockType.TEMP_BLOCK) {
      if (block.blockedTill && new Date(block.blockedTill) > new Date()) {
        return block;
      }
    }

    return null;
  }

  async deactivateBlocksForUser(userId: number, queryRunner?: QueryRunner): Promise<boolean> {
    const response = await this.getRepository(queryRunner).update(
      {
        user: { id: userId },
        active: true,
      } as any,
      {
        active: false,
      } as any
    );

    return response.affected > 0 ? true : false;
  }
}
