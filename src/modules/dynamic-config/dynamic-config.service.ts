import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
//
import { DynamicConfigRepository } from 'src/modules/dynamic-config/repository';
import { UserRoleConfig } from './entities';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { CreateDynamicConfigDto } from './dto/create-dynamic-config.dto';
import { EditDynamicConfigDto } from './dto/edit-dynamic-config.dto';
import { TransactionService } from 'src/default/databases/transaction';

@Injectable()
export class DynamicConfigService {
  constructor(
    private readonly dynamicConfigRepository: DynamicConfigRepository,
    private readonly transactionUtils: TransactionService
  ) {}

  private getObjectDiff(oldObj: any, newObj: any) {
    const previousChanges: Record<string, any> = {};
    const newChanges: Record<string, any> = {};

    const oldClean = oldObj ? JSON.parse(JSON.stringify(oldObj)) : {};
    const newClean = newObj ? JSON.parse(JSON.stringify(newObj)) : {};

    const keys = new Set([...Object.keys(oldClean), ...Object.keys(newClean)]);

    let hasChanges = false;

    for (const key of keys) {
      if (
        [
          'id',
          'active',
          'createdAt',
          'updatedAt',
          'deletedAt',
          'created_at',
          'updated_at',
          'deleted_at',
        ].includes(key)
      ) {
        continue;
      }

      const oldVal = oldClean[key];
      const newVal = newClean[key];

      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        hasChanges = true;
        previousChanges[key] = oldVal === undefined ? null : oldVal;
        newChanges[key] = newVal === undefined ? null : newVal;
      }
    }

    return { previousChanges, newChanges, hasChanges };
  }

  private cleanObjectNoNulls(obj: any): any {
    if (obj === null || obj === undefined) return undefined;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map((item) => this.cleanObjectNoNulls(item));

    const result: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== null && val !== undefined) {
        result[key] = typeof val === 'object' ? this.cleanObjectNoNulls(val) : val;
      }
    }
    return result;
  }

  /**
   * Formats a UserRoleConfig entity
   */
  private formatUserRoleConfig(config: UserRoleConfig | null, showAll: boolean = false): any {
    if (!config) {
      return null;
    }

    return {
      userRole: config.userRole,
      redemptionEnabled: config.redemptionEnabled,
      physicalRedemptionEnabled: config.physicalRedemptionEnabled,
      digitalRedemptionEnabled: config.digitalRedemptionEnabled,
      dbtEnabled: config.dbtEnabled,
      // redemptionOptions: config.redemptionOptions || {},
      ...(showAll && {
        loginMaxOtpAttempts: config.loginMaxOtpAttempts ?? 3,
        loginOtpTimeoutSeconds: config.loginOtpTimeoutSeconds ?? 3600,
        loginOtpExpirySeconds: config.loginOtpExpirySeconds ?? 300,
        redemptionMaxOtpAttempts: config.redemptionMaxOtpAttempts ?? 3,
        redemptionOtpTimeoutSeconds: config.redemptionOtpTimeoutSeconds ?? 3600,
        redemptionOtpExpirySeconds: config.redemptionOtpExpirySeconds ?? 300,
        redemptionLimits: config.redemptionLimits || {},
        additionalSettings: config.additionalSettings || {},
      }),
    };
  }

  /**
   * Maintain the unique check separately using service
   */
  async checkUserRoleUniqueness(userRole: UserRole, excludeId?: number): Promise<void> {
    const existing = await this.dynamicConfigRepository.getUserConfigByUserRole(userRole);

    if (existing) {
      if (excludeId === undefined || Number(existing.id) !== excludeId) {
        throw new BadRequestException(`Configuration for user type '${userRole}' already exists.`);
      }
    }
  }

  async getConfigByUserRole(userRole: UserRole, showAll: boolean = false): Promise<any> {
    const config = await this.dynamicConfigRepository.getUserConfigByUserRole(userRole);

    if (!config) {
      throw new NotFoundException(`Configuration not found for user type: ${userRole}`);
    }

    const formattedConfig = this.formatUserRoleConfig(config, showAll);

    const finalResponse = { ...formattedConfig };

    if (showAll) {
      const appConfig = await this.dynamicConfigRepository.getApplicationConfig();

      finalResponse.applicationConfig = appConfig ? appConfig.settings : null;
    }

    return finalResponse;
  }

  async getAllConfigs(showAll: boolean = false): Promise<Record<string, any>> {
    const { data: configs } = await this.dynamicConfigRepository.getAllUserRoleConfigs({
      active: true,
    });

    const finalResponse: Record<string, any> = {};

    if (showAll) {
      const appConfig = await this.dynamicConfigRepository.getApplicationConfig();
      const appSettings = appConfig ? appConfig.settings : null;
      finalResponse.applicationConfig = appSettings;
    }

    if (configs && configs.length > 0) {
      configs.forEach((config) => {
        finalResponse[config.userRole] = this.formatUserRoleConfig(config, showAll);
      });
    }

    return finalResponse;
  }

  async createConfig(dto: CreateDynamicConfigDto): Promise<any> {
    await this.checkUserRoleUniqueness(dto.userRole);

    const isRedemptionEnabled = dto.redemptionEnabled ?? true;

    const configData: Partial<UserRoleConfig> = {
      userRole: dto.userRole,
      redemptionEnabled: isRedemptionEnabled,
      physicalRedemptionEnabled: dto.physicalRedemptionEnabled ?? false,
      digitalRedemptionEnabled: dto.digitalRedemptionEnabled ?? false,
      dbtEnabled: dto.dbtEnabled ?? false,
      redemptionLimits: {
        dbt: {
          maxDailyRedemptions: dto.redemptionLimits?.dbt?.maxDailyRedemptions ?? 0,
          maxMonthlyRedemptions: dto.redemptionLimits?.dbt?.maxMonthlyRedemptions ?? 0,
          dailyLimit: dto.redemptionLimits?.dbt?.dailyLimit ?? 0,
          monthlyLimit: dto.redemptionLimits?.dbt?.monthlyLimit ?? 0,
        },
        digital: {
          maxDailyRedemptions: dto.redemptionLimits?.digital?.maxDailyRedemptions ?? 0,
          maxMonthlyRedemptions: dto.redemptionLimits?.digital?.maxMonthlyRedemptions ?? 0,
          dailyLimit: dto.redemptionLimits?.digital?.dailyLimit ?? 0,
          monthlyLimit: dto.redemptionLimits?.digital?.monthlyLimit ?? 0,
        },
        physical: {
          maxDailyRedemptions: dto.redemptionLimits?.physical?.maxDailyRedemptions ?? 0,
          maxMonthlyRedemptions: dto.redemptionLimits?.physical?.maxMonthlyRedemptions ?? 0,
          dailyLimit: dto.redemptionLimits?.physical?.dailyLimit ?? 0,
          monthlyLimit: dto.redemptionLimits?.physical?.monthlyLimit ?? 0,
        },
      },
      additionalSettings: {
        skipKyc: dto.additionalSettings.skipKyc ?? false,
      },
      loginMaxOtpAttempts: dto.loginMaxOtpAttempts ?? 3,
      loginOtpTimeoutSeconds: dto.loginOtpTimeoutSeconds ?? 3600,
      loginOtpExpirySeconds: dto.loginOtpExpirySeconds ?? 300,
      redemptionMaxOtpAttempts: dto.redemptionMaxOtpAttempts ?? 3,
      redemptionOtpTimeoutSeconds: dto.redemptionOtpTimeoutSeconds ?? 3600,
      redemptionOtpExpirySeconds: dto.redemptionOtpExpirySeconds ?? 300,
    };

    const created = await this.dynamicConfigRepository.createUserRoleConfig(
      configData as UserRoleConfig
    );

    return this.formatUserRoleConfig(created, true);
  }

  async updateUserRoleConfig(dto: EditDynamicConfigDto, userId: bigint | number): Promise<any> {
    const existing = await this.dynamicConfigRepository.getUserConfigByUserRole(dto.userRole);

    if (!existing) {
      throw new NotFoundException(`Configuration with user type ${dto.userRole} not found.`);
    }

    const previousValues = JSON.parse(JSON.stringify(existing));

    if (dto.redemptionEnabled !== undefined && dto.redemptionEnabled !== null) {
      existing.redemptionEnabled = dto.redemptionEnabled;
    }

    if (dto.physicalRedemptionEnabled !== undefined && dto.physicalRedemptionEnabled !== null) {
      existing.physicalRedemptionEnabled = dto.physicalRedemptionEnabled;
    }

    if (dto.digitalRedemptionEnabled !== undefined && dto.digitalRedemptionEnabled !== null) {
      existing.digitalRedemptionEnabled = dto.digitalRedemptionEnabled;
    }

    if (dto.dbtEnabled !== undefined && dto.dbtEnabled !== null) {
      existing.dbtEnabled = dto.dbtEnabled;
    }

    if (dto.loginMaxOtpAttempts !== undefined && dto.loginMaxOtpAttempts !== null) {
      existing.loginMaxOtpAttempts = dto.loginMaxOtpAttempts;
    }

    if (dto.loginOtpTimeoutSeconds !== undefined && dto.loginOtpTimeoutSeconds !== null) {
      existing.loginOtpTimeoutSeconds = dto.loginOtpTimeoutSeconds;
    }

    if (dto.loginOtpExpirySeconds !== undefined && dto.loginOtpExpirySeconds !== null) {
      existing.loginOtpExpirySeconds = dto.loginOtpExpirySeconds;
    }

    if (dto.redemptionMaxOtpAttempts !== undefined && dto.redemptionMaxOtpAttempts !== null) {
      existing.redemptionMaxOtpAttempts = dto.redemptionMaxOtpAttempts;
    }

    if (dto.redemptionOtpTimeoutSeconds !== undefined && dto.redemptionOtpTimeoutSeconds !== null) {
      existing.redemptionOtpTimeoutSeconds = dto.redemptionOtpTimeoutSeconds;
    }

    if (dto.redemptionOtpExpirySeconds !== undefined && dto.redemptionOtpExpirySeconds !== null) {
      existing.redemptionOtpExpirySeconds = dto.redemptionOtpExpirySeconds;
    }

    if (dto.redemptionLimits !== undefined && dto.redemptionLimits !== null) {
      const existingLimits = existing.redemptionLimits || {};
      const incomingLimits = dto.redemptionLimits;

      existing.redemptionLimits = {
        dbt: {
          maxDailyRedemptions:
            incomingLimits.dbt?.maxDailyRedemptions !== undefined &&
            incomingLimits.dbt?.maxDailyRedemptions !== null
              ? incomingLimits.dbt.maxDailyRedemptions
              : (existingLimits.dbt?.maxDailyRedemptions ?? 0),
          maxMonthlyRedemptions:
            incomingLimits.dbt?.maxMonthlyRedemptions !== undefined &&
            incomingLimits.dbt?.maxMonthlyRedemptions !== null
              ? incomingLimits.dbt.maxMonthlyRedemptions
              : (existingLimits.dbt?.maxMonthlyRedemptions ?? 0),
          dailyLimit:
            incomingLimits.dbt?.dailyLimit !== undefined && incomingLimits.dbt?.dailyLimit !== null
              ? incomingLimits.dbt.dailyLimit
              : (existingLimits.dbt?.dailyLimit ?? 0),
          monthlyLimit:
            incomingLimits.dbt?.monthlyLimit !== undefined &&
            incomingLimits.dbt?.monthlyLimit !== null
              ? incomingLimits.dbt.monthlyLimit
              : (existingLimits.dbt?.monthlyLimit ?? 0),
        },
        digital: {
          maxDailyRedemptions:
            incomingLimits.digital?.maxDailyRedemptions !== undefined &&
            incomingLimits.digital?.maxDailyRedemptions !== null
              ? incomingLimits.digital.maxDailyRedemptions
              : (existingLimits.digital?.maxDailyRedemptions ?? 0),
          maxMonthlyRedemptions:
            incomingLimits.digital?.maxMonthlyRedemptions !== undefined &&
            incomingLimits.digital?.maxMonthlyRedemptions !== null
              ? incomingLimits.digital.maxMonthlyRedemptions
              : (existingLimits.digital?.maxMonthlyRedemptions ?? 0),
          dailyLimit:
            incomingLimits.digital?.dailyLimit !== undefined &&
            incomingLimits.digital?.dailyLimit !== null
              ? incomingLimits.digital.dailyLimit
              : (existingLimits.digital?.dailyLimit ?? 0),
          monthlyLimit:
            incomingLimits.digital?.monthlyLimit !== undefined &&
            incomingLimits.digital?.monthlyLimit !== null
              ? incomingLimits.digital.monthlyLimit
              : (existingLimits.digital?.monthlyLimit ?? 0),
        },
        physical: {
          maxDailyRedemptions:
            incomingLimits.physical?.maxDailyRedemptions !== undefined &&
            incomingLimits.physical?.maxDailyRedemptions !== null
              ? incomingLimits.physical.maxDailyRedemptions
              : (existingLimits.physical?.maxDailyRedemptions ?? 0),
          maxMonthlyRedemptions:
            incomingLimits.physical?.maxMonthlyRedemptions !== undefined &&
            incomingLimits.physical?.maxMonthlyRedemptions !== null
              ? incomingLimits.physical.maxMonthlyRedemptions
              : (existingLimits.physical?.maxMonthlyRedemptions ?? 0),
          dailyLimit:
            incomingLimits.physical?.dailyLimit !== undefined &&
            incomingLimits.physical?.dailyLimit !== null
              ? incomingLimits.physical.dailyLimit
              : (existingLimits.physical?.dailyLimit ?? 0),
          monthlyLimit:
            incomingLimits.physical?.monthlyLimit !== undefined &&
            incomingLimits.physical?.monthlyLimit !== null
              ? incomingLimits.physical.monthlyLimit
              : (existingLimits.physical?.monthlyLimit ?? 0),
        },
      };
    }

    if (dto.additionalSettings !== undefined && dto.additionalSettings !== null) {
      const currentSettings = existing.additionalSettings || {};
      const newSettings = dto.additionalSettings;

      existing.additionalSettings = {
        ...currentSettings,
        ...newSettings,
      };
    }

    if (existing.redemptionLimits) {
      existing.redemptionLimits = this.cleanObjectNoNulls(existing.redemptionLimits);
    }

    if (existing.additionalSettings) {
      existing.additionalSettings = this.cleanObjectNoNulls(existing.additionalSettings);
    }

    const newValues = JSON.parse(JSON.stringify(existing));

    const { previousChanges, newChanges, hasChanges } = this.getObjectDiff(
      previousValues,
      newValues
    );

    await this.transactionUtils.runInTransaction(async (queryRunner) => {
      await this.dynamicConfigRepository.updateUserRoleConfig(existing.id, existing, queryRunner);

      if (hasChanges) {
        await this.dynamicConfigRepository.saveConfigLog(
          {
            previousValues: previousChanges,
            newValues: newChanges,
            userRole: dto.userRole,
            userId: Number(userId),
          },
          queryRunner
        );
      }
    });

    return await this.getConfigByUserRole(existing.userRole, true);
  }
}
