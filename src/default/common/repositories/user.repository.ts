import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from './base.repository';
import { User } from 'src/modules/auth/entities';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(User));
  }

  async findByMobile(mobile: string, queryRunner?: QueryRunner): Promise<User | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository;

    return await repo.findOne({
      where: {
        mobile,
      } as any,
      relations: {
        role: true,
      } as any,
    });
  }

  async findActiveByMobile(mobile: string, queryRunner?: QueryRunner): Promise<User | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository;

    return await repo.findOne({
      where: {
        mobile,
        active: 1,
      } as any,
      relations: {
        role: true,
      } as any,
    });
  }

  async findByEmail(email: string, queryRunner?: QueryRunner): Promise<User | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository;

    return await repo.findOne({
      where: {
        email,
      } as any,
      relations: {
        role: true,
      } as any,
    });
  }

  async findByUuid(uuid: string, queryRunner?: QueryRunner): Promise<User | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository;

    return await repo.findOne({
      where: {
        uuid,
      } as any,
      relations: {
        role: true,
      } as any,
    });
  }

  async updateOtp(
    userId: number,
    otp: string,
    otpExpiry?: Date | null,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository;

    const result = await repo.update(
      { id: userId } as any,
      {
        otp,
        otp_expiry: otpExpiry ?? null,
        otp_attempt_count: 0,
      } as any
    );

    return Number(result.affected) > 0;
  }

  async clearOtp(userId: string, queryRunner?: QueryRunner): Promise<boolean> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository;

    const result = await repo.update(
      { id: userId } as any,
      {
        otp: null,
        otp_expiry: null,
        otp_attempt_count: 0,
      } as any
    );

    return Number(result.affected) > 0;
  }

  async updateRefreshToken(
    userId: number,
    refreshToken: string | null,
    refreshTokenExpiry: Date | null,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository;

    const result = await repo.update(
      { id: userId } as any,
      {
        refreshToken,
        refreshTokenExpiry,
      } as any
    );

    return Number(result.affected) > 0;
  }

  async findByRefreshToken(refreshToken: string, queryRunner?: QueryRunner): Promise<User | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository;

    return await repo.findOne({
      where: {
        refreshToken,
      } as any,
      relations: {
        role: true,
      } as any,
    });
  }

  async findByMobileOrEmail(
    data: {
      mobile?: string;
      email?: string;
    },
    queryRunner?: QueryRunner
  ): Promise<User | null> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository;

    const whereCondition = data.mobile ? { mobile: data.mobile } : { email: data.email };

    return await repo.findOne({
      where: whereCondition as any,
      relations: {
        role: true,
      } as any,
    });
  }

  async updateResetPasswordToken(
    userId: number,
    resetPasswordToken: string | null,
    resetPasswordTokenExpiry: Date | null,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository;

    const result = await repo.update(
      { id: userId } as any,
      {
        resetPasswordToken,
        resetPasswordTokenExpiry,
      } as any
    );

    return Number(result.affected) > 0;
  }

  async updateAuthTokens(
    userId: string,
    data: {
      accessToken?: string | null;
      accessTokenExpiry?: Date | null;
      refreshToken?: string | null;
      refreshTokenExpiry?: Date | null;
    },
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const repo = queryRunner ? queryRunner.manager.getRepository(User) : this.repository;

    const result = await repo.update(
      { id: userId } as any,
      {
        accessToken: data.accessToken ?? null,
        accessTokenExpiry: data.accessTokenExpiry ?? null,
        refreshToken: data.refreshToken ?? null,
        refreshTokenExpiry: data.refreshTokenExpiry ?? null,
      } as any
    );

    return Number(result.affected) > 0;
  }
}
