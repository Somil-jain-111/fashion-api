import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
//
import { DynamicConfigRepository } from 'src/modules/dynamic-config/repository';
import { UserRoleConfig } from './entities';
import { UserRole } from 'src/default/common/enums/user-type.enum';
import { CreateDynamicConfigDto } from './dto/create-dynamic-config.dto';
import { EditDynamicConfigDto } from './dto/edit-dynamic-config.dto';

@Injectable()
export class DynamicConfigService {
  constructor(private readonly dynamicConfigRepository: DynamicConfigRepository) {}

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
      redemptionOptions: config.redemptionOptions || {},
      ...(showAll && {
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
      redemptionOptions: dto.redemptionOptions
        ? {
            physical: dto.redemptionOptions.physical ?? false,
            digital: dto.redemptionOptions.digital ?? false,
            dbt: dto.redemptionOptions.dbt ?? false,
          }
        : {
            physical: false,
            digital: false,
            dbt: false,
          },
      redemptionLimits: dto.redemptionLimits
        ? {
            dbt: {
              maxDailyRedemptions: dto.redemptionLimits.dbt?.maxDailyRedemptions ?? 0,
              maxMonthlyRedemptions: dto.redemptionLimits.dbt?.maxMonthlyRedemptions ?? 0,
              dailyLimit: dto.redemptionLimits.dbt?.dailyLimit ?? 0,
              monthlyLimit: dto.redemptionLimits.dbt?.monthlyLimit ?? 0,
            },
            digital: {
              maxDailyRedemptions: dto.redemptionLimits.digital?.maxDailyRedemptions ?? 0,
              maxMonthlyRedemptions: dto.redemptionLimits.digital?.maxMonthlyRedemptions ?? 0,
              dailyLimit: dto.redemptionLimits.digital?.dailyLimit ?? 0,
              monthlyLimit: dto.redemptionLimits.digital?.monthlyLimit ?? 0,
            },
            physical: {
              maxDailyRedemptions: dto.redemptionLimits.physical?.maxDailyRedemptions ?? 0,
              maxMonthlyRedemptions: dto.redemptionLimits.physical?.maxMonthlyRedemptions ?? 0,
              dailyLimit: dto.redemptionLimits.physical?.dailyLimit ?? 0,
              monthlyLimit: dto.redemptionLimits.physical?.monthlyLimit ?? 0,
            },
          }
        : {
            dbt: {
              maxDailyRedemptions: 0,
              maxMonthlyRedemptions: 0,
              dailyLimit: 0,
              monthlyLimit: 0,
            },
            digital: {
              maxDailyRedemptions: 0,
              maxMonthlyRedemptions: 0,
              dailyLimit: 0,
              monthlyLimit: 0,
            },
            physical: {
              maxDailyRedemptions: 0,
              maxMonthlyRedemptions: 0,
              dailyLimit: 0,
              monthlyLimit: 0,
            },
          },
      additionalSettings: dto.additionalSettings
        ? {
            ...dto.additionalSettings,
            approvalLimits: {
              dbt: dto.additionalSettings.approvalLimits?.dbt ?? null,
              physical: dto.additionalSettings.approvalLimits?.physical ?? null,
              digital: dto.additionalSettings.approvalLimits?.digital ?? null,
            },
            cappingLimitEnabled: dto.additionalSettings.cappingLimitEnabled ?? false,
            cappingLimitPercentage: dto.additionalSettings.cappingLimitPercentage ?? 0,
          }
        : null,
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

    if (dto.redemptionEnabled !== undefined) {
      existing.redemptionEnabled = dto.redemptionEnabled;
    }

    if (dto.redemptionOptions !== undefined) {
      existing.redemptionOptions = {
        ...(existing.redemptionOptions || {}),
        ...dto.redemptionOptions,
      };
    }

    if (dto.redemptionLimits !== undefined) {
      const existingLimits = existing.redemptionLimits || {};
      const incomingLimits = dto.redemptionLimits;

      existing.redemptionLimits = {
        dbt: {
          maxDailyRedemptions:
            incomingLimits.dbt?.maxDailyRedemptions !== undefined
              ? incomingLimits.dbt.maxDailyRedemptions
              : (existingLimits.dbt?.maxDailyRedemptions ?? 0),
          maxMonthlyRedemptions:
            incomingLimits.dbt?.maxMonthlyRedemptions !== undefined
              ? incomingLimits.dbt.maxMonthlyRedemptions
              : (existingLimits.dbt?.maxMonthlyRedemptions ?? 0),
          dailyLimit:
            incomingLimits.dbt?.dailyLimit !== undefined
              ? incomingLimits.dbt.dailyLimit
              : (existingLimits.dbt?.dailyLimit ?? 0),
          monthlyLimit:
            incomingLimits.dbt?.monthlyLimit !== undefined
              ? incomingLimits.dbt.monthlyLimit
              : (existingLimits.dbt?.monthlyLimit ?? 0),
        },
        digital: {
          maxDailyRedemptions:
            incomingLimits.digital?.maxDailyRedemptions !== undefined
              ? incomingLimits.digital.maxDailyRedemptions
              : (existingLimits.digital?.maxDailyRedemptions ?? 0),
          maxMonthlyRedemptions:
            incomingLimits.digital?.maxMonthlyRedemptions !== undefined
              ? incomingLimits.digital.maxMonthlyRedemptions
              : (existingLimits.digital?.maxMonthlyRedemptions ?? 0),
          dailyLimit:
            incomingLimits.digital?.dailyLimit !== undefined
              ? incomingLimits.digital.dailyLimit
              : (existingLimits.digital?.dailyLimit ?? 0),
          monthlyLimit:
            incomingLimits.digital?.monthlyLimit !== undefined
              ? incomingLimits.digital.monthlyLimit
              : (existingLimits.digital?.monthlyLimit ?? 0),
        },
        physical: {
          maxDailyRedemptions:
            incomingLimits.physical?.maxDailyRedemptions !== undefined
              ? incomingLimits.physical.maxDailyRedemptions
              : (existingLimits.physical?.maxDailyRedemptions ?? 0),
          maxMonthlyRedemptions:
            incomingLimits.physical?.maxMonthlyRedemptions !== undefined
              ? incomingLimits.physical.maxMonthlyRedemptions
              : (existingLimits.physical?.maxMonthlyRedemptions ?? 0),
          dailyLimit:
            incomingLimits.physical?.dailyLimit !== undefined
              ? incomingLimits.physical.dailyLimit
              : (existingLimits.physical?.dailyLimit ?? 0),
          monthlyLimit:
            incomingLimits.physical?.monthlyLimit !== undefined
              ? incomingLimits.physical.monthlyLimit
              : (existingLimits.physical?.monthlyLimit ?? 0),
        },
      };
    }

    if (dto.additionalSettings !== undefined) {
      const currentSettings = existing.additionalSettings || {};
      const newSettings = dto.additionalSettings;

      const currentApprovalLimits = currentSettings.approvalLimits || {};
      const newApprovalLimits = newSettings.approvalLimits || {};

      existing.additionalSettings = {
        ...currentSettings,
        ...newSettings,
        approvalLimits: {
          dbt:
            newApprovalLimits.dbt !== undefined ? newApprovalLimits.dbt : currentApprovalLimits.dbt,
          physical:
            newApprovalLimits.physical !== undefined
              ? newApprovalLimits.physical
              : currentApprovalLimits.physical,
          digital:
            newApprovalLimits.digital !== undefined
              ? newApprovalLimits.digital
              : currentApprovalLimits.digital,
        },

        cappingLimitEnabled:
          newSettings.cappingLimitEnabled !== undefined
            ? newSettings.cappingLimitEnabled
            : (currentSettings.cappingLimitEnabled ?? false),
        cappingLimitPercentage:
          newSettings.cappingLimitPercentage !== undefined
            ? newSettings.cappingLimitPercentage
            : (currentSettings.cappingLimitPercentage ?? 0),
      };
    }

    const newValues = JSON.parse(JSON.stringify(existing));

    await this.dynamicConfigRepository.updateUserRoleConfig(existing.id, existing);

    const { previousChanges, newChanges, hasChanges } = this.getObjectDiff(
      previousValues,
      newValues
    );

    if (hasChanges) {
      await this.dynamicConfigRepository.saveConfigLog({
        previousValues: previousChanges,
        newValues: newChanges,
        userRole: dto.userRole,
        userId: Number(userId),
      });
    }

    return await this.getConfigByUserRole(existing.userRole, true);
  }
}
