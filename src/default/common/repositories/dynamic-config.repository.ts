import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
//
import { UserType } from '../enums/user-type.enum';
import { ApplicationConfig, UserTypeConfig } from '../../../modules/dynamic-config/entities';

@Injectable()
export class DynamicConfigRepository {
  private userTypeConfigRepo: Repository<UserTypeConfig>;
  private applicationConfigRepo: Repository<ApplicationConfig>;

  constructor(private readonly dataSource: DataSource) {
    this.userTypeConfigRepo = this.dataSource.getRepository(UserTypeConfig);
    this.applicationConfigRepo = this.dataSource.getRepository(ApplicationConfig);
  }

  /**
   *
   * @UserTypeConfig methods
   *
   */

  async createUserTypeConfig(config: UserTypeConfig) {
    const createdConfig = this.userTypeConfigRepo.create(config);

    return await this.userTypeConfigRepo.save(createdConfig);
  }

  async updateUserTypeConfig(configId: number, updatedConfig: Partial<UserTypeConfig>) {
    return await this.userTypeConfigRepo.update(configId, updatedConfig);
  }

  async getAllUserTypeConfigs(filters: {
    active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: UserTypeConfig[]; totalCount: number }> {
    const queryBuilder = this.userTypeConfigRepo.createQueryBuilder('userTypeConfig');

    if (filters.active) {
      queryBuilder.andWhere('userTypeConfig.isActive = :active', { active: filters.active });
    }

    if (filters.page && filters.limit) {
      queryBuilder.skip((filters.page - 1) * filters.limit).take(filters.limit);
    }

    const [data, totalCount] = await queryBuilder.getManyAndCount();

    return { data, totalCount };
  }

  async getUserConfigByUserType(userType: UserType): Promise<UserTypeConfig | null> {
    return this.userTypeConfigRepo.findOne({
      where: {
        userType: userType,
        active: true,
      },
    });
  }

  /**
   *
   * @ApplicationConfig methods
   *
   */

  async getApplicationConfig() {
    return this.applicationConfigRepo.findOne({
      where: {
        active: true,
      },
    });
  }

  async saveConfigLog(logData: {
    previousValues: Record<string, any>;
    newValues: Record<string, any>;
    userType: UserType;
    user: { id: bigint };
  }): Promise<void> {
    console.log('Dynamic Config Change Log:', JSON.stringify(logData));
  }
}
