import { DataSource, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
//
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { ConfigLog } from 'src/modules/dynamic-config/entities/config-logs.entity';
import { ApplicationConfig, UserRoleConfig } from '../../../modules/dynamic-config/entities';

@Injectable()
export class DynamicConfigRepository {
  protected userRoleConfigRepo: Repository<UserRoleConfig>;
  protected applicationConfigRepo: Repository<ApplicationConfig>;
  protected configLogsRepo: Repository<ConfigLog>;

  constructor(private readonly dataSource: DataSource) {
    this.userRoleConfigRepo = this.dataSource.getRepository(UserRoleConfig);
    this.applicationConfigRepo = this.dataSource.getRepository(ApplicationConfig);
    this.configLogsRepo = this.dataSource.getRepository(ConfigLog);
  }

  /**
   *
   * @UserRoleConfig methods
   *
   */

  async createUserRoleConfig(config: UserRoleConfig) {
    const createdConfig = this.userRoleConfigRepo.create(config);

    return await this.userRoleConfigRepo.save(createdConfig);
  }

  async updateUserRoleConfig(configId: number, updatedConfig: Partial<UserRoleConfig>) {
    return await this.userRoleConfigRepo.update(configId, updatedConfig);
  }

  async getAllUserRoleConfigs(filters: {
    active?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: UserRoleConfig[]; totalCount: number }> {
    const queryBuilder = this.userRoleConfigRepo.createQueryBuilder('UserRoleConfig');

    if (filters.active) {
      queryBuilder.andWhere('UserRoleConfig.isActive = :active', { active: filters.active });
    }

    if (filters.page && filters.limit) {
      queryBuilder.skip((filters.page - 1) * filters.limit).take(filters.limit);
    }

    const [data, totalCount] = await queryBuilder.getManyAndCount();

    return { data, totalCount };
  }

  async getUserConfigByUserRole(userRole: UserRole): Promise<UserRoleConfig | null> {
    return this.userRoleConfigRepo.findOne({
      where: {
        userRole: userRole,
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
    userRole: UserRole;
    userId: number;
  }): Promise<ConfigLog> {
    const log = await this.configLogsRepo.create({
      actionBy: { id: logData.userId },
      previousValues: logData.previousValues,
      newValues: logData.newValues,
      userRole: logData.userRole,
    });

    return await this.configLogsRepo.save(log);
  }
}
