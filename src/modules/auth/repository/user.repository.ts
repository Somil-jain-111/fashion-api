import { DataSource, QueryRunner } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { User } from 'src/modules/auth/entities';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(User));
  }

  async findByMobile(mobile: string, queryRunner?: QueryRunner): Promise<User | null> {
    return await this.getRepository(queryRunner).findOne({
      where: {
        mobile,
      } as any,
      relations: {
        roles: true,
      } as any,
    });
  }

  async findActiveByMobile(mobile: string, queryRunner?: QueryRunner): Promise<User | null> {
    return await this.getRepository(queryRunner).findOne({
      where: {
        mobile,
        active: 1,
      } as any,
      relations: {
        roles: true,
      } as any,
    });
  }

  async findByEmail(email: string, queryRunner?: QueryRunner): Promise<User | null> {
    return await this.getRepository(queryRunner).findOne({
      where: {
        email,
      } as any,
      relations: {
        roles: true,
      } as any,
    });
  }

  async findByUuid(uuid: string, queryRunner?: QueryRunner): Promise<User | null> {
    return await this.getRepository(queryRunner).findOne({
      where: {
        uuid,
      } as any,
      relations: {
        roles: true,
      } as any,
    });
  }

  async findByIdForUpdate(userId: number, queryRunner: QueryRunner): Promise<User | null> {
    return queryRunner.manager
      .getRepository(User)
      .createQueryBuilder('user')
      .setLock('pessimistic_write')
      .where('user.id = :userId', { userId })
      .getOne();
  }

  async updateOtp(
    userId: number,
    otp: string,
    otpExpiry?: Date | null,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const result = await this.getRepository(queryRunner).update(
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
    const result = await this.getRepository(queryRunner).update(
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
    const result = await this.getRepository(queryRunner).update(
      { id: userId } as any,
      {
        refreshToken,
        refreshTokenExpiry,
      } as any
    );

    return Number(result.affected) > 0;
  }

  async findByRefreshToken(refreshToken: string, queryRunner?: QueryRunner): Promise<User | null> {
    return await this.getRepository(queryRunner).findOne({
      where: {
        refreshToken,
      } as any,
      relations: {
        roles: true,
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
    const whereCondition = data.mobile ? { mobile: data.mobile } : { email: data.email };

    return await this.getRepository(queryRunner).findOne({
      where: whereCondition as any,
      relations: {
        roles: true,
      } as any,
    });
  }

  async updateResetPasswordToken(
    userId: number,
    resetPasswordToken: string | null,
    resetPasswordTokenExpiry: Date | null,
    queryRunner?: QueryRunner
  ): Promise<boolean> {
    const result = await this.getRepository(queryRunner).update(
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
    const result = await this.getRepository(queryRunner).update(
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

  async countByRole(roleName: string): Promise<number> {
    return await this.repository.count({
      where: { roles: { name: roleName } } as any,
    });
  }

  /**
   * Grants an additional role without disturbing the ones a user already has —
   * a customer onboarding as a seller keeps CUSTOMER and gains SELLER_ADMIN.
   */
  async addRole(userId: number, roleId: number): Promise<void> {
    await this.repository.createQueryBuilder().relation(User, 'roles').of(userId).add(roleId);
  }

  async hasRole(userId: number, roleName: string): Promise<boolean> {
    const user = await this.repository.findOne({
      where: { id: userId } as any,
      relations: { roles: true } as any,
    });

    return user?.roles?.some((r) => r.name === roleName) ?? false;
  }
}
