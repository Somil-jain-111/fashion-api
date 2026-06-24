import { DataSource, LessThan, QueryRunner } from "typeorm";
import { BaseRepository } from "./base.repository";
import { RevokedToken } from "src/modules/auth/entities";
import { TokenType } from "../enums/token-type.enum";
import { Injectable } from "@nestjs/common";

@Injectable()
export class RevokedTokenRepository extends BaseRepository<RevokedToken> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(RevokedToken));
  }

  async revokeToken(
    data: {
      token_hash: string;
      user_id?: bigint | null;
      token_type: TokenType;
      expires_at: Date;
    },
    queryRunner?: QueryRunner,
  ): Promise<RevokedToken> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(RevokedToken)
      : this.repository;

    const revokedToken = repo.create({
      token_hash: data.token_hash,
      user_id: data.user_id ?? null,
      token_type: data.token_type,
      expires_at: data.expires_at,
    });

    return await repo.save(revokedToken);
  }

  async isTokenRevoked(
    tokenHash: string,
    queryRunner?: QueryRunner,
  ): Promise<boolean> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(RevokedToken)
      : this.repository;

    const count = await repo.count({
      where: {
        token_hash: tokenHash,
      },
    });

    return count > 0;
  }

  async findByTokenHash(
    tokenHash: string,
    queryRunner?: QueryRunner,
  ): Promise<RevokedToken | null> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(RevokedToken)
      : this.repository;

    return await repo.findOne({
      where: {
        token_hash: tokenHash,
      },
      relations: {
        user: true,
      },
    });
  }

  async deleteExpiredTokens(queryRunner?: QueryRunner): Promise<number> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(RevokedToken)
      : this.repository;

    const result = await repo.delete({
      expires_at: LessThan(new Date()),
    });

    return Number(result.affected ?? 0);
  }

  async revokeManyTokens(
    data: Array<{
      token_hash: string;
      user_id?: bigint | null;
      token_type: TokenType;
      expires_at: Date;
    }>,
    queryRunner?: QueryRunner,
  ): Promise<RevokedToken[]> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(RevokedToken)
      : this.repository;

    const revokedTokens = repo.create(
      data.map((item) => ({
        token_hash: item.token_hash,
        user_id: item.user_id ?? null,
        token_type: item.token_type,
        expires_at: item.expires_at,
      })),
    );

    return await repo.save(revokedTokens);
  }

  async findActiveRevokedTokensByUserId(
    userId: bigint,
    queryRunner?: QueryRunner,
  ): Promise<RevokedToken[]> {
    const repo = queryRunner
      ? queryRunner.manager.getRepository(RevokedToken)
      : this.repository;

    return await repo
      .createQueryBuilder("revokedToken")
      .where("revokedToken.user_id = :userId", { userId })
      .andWhere("revokedToken.expires_at > :now", { now: new Date() })
      .orderBy("revokedToken.created_at", "DESC")
      .getMany();
  }
}
