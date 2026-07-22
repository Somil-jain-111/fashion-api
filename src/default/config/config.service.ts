// src/default/config/config.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  getPort(): number {
    return Number(this.configService.get<number>('PORT', 4002));
  }

  getNodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  isProduction(): boolean {
    return this.getNodeEnv() === 'production';
  }

  isQa(): boolean {
    return this.getNodeEnv() === 'qa';
  }

  isDevelopment(): boolean {
    return this.getNodeEnv() === 'development';
  }

  getApiVersion(): number {
    return Number(this.configService.get<number>('API_VERSION'));
  }

  getApiKey(): string {
    return this.configService.get<string>('API_KEY');
  }

  getApiSecret(): string {
    return this.configService.get<string>('API_SECRET');
  }

  getRedisHost(): string {
    return this.configService.get<string>('REDIS_HOST');
  }

  getRedisPort(): number {
    return Number(this.configService.get<number>('REDIS_PORT', 6379));
  }

  getNonProdOtp(): number {
    return Number(this.configService.get<number>('DEV_OTP', 8899));
  }

  getNonProdRewardsOtp(): number {
    return Number(this.configService.get<number>('DEV_REWARDS_OTP', 222222));
  }

  get<T = any>(key: string, defaultValue?: T): T {
    return this.configService.get<T>(key, defaultValue);
  }

  /**
   *
   * @returns Rewards Configurations
   */

  getRewardsUrl() {
    return this.get(this.isProduction() ? 'Rewards_API_Base_Url_Live' : 'Rewards_API_Base_Url_Dev');
  }

  getRewardsPermanentToken() {
    return this.get(
      this.isProduction() ? 'Rewards_API_Permanent_Token_Live' : 'Rewards_API_Permanent_Token_Dev'
    );
  }

  getRewardsProductsCatalogueId() {
    return this.get(this.isProduction() ? 'Rewards_Catalogue_id_Live' : 'Rewards_Catalogue_id_Dev');
  }

  getKycSecretKey() {
    return this.get('KYC_SECRET_KEY');
  }

  getBankPayoutSku() {
    return this.get(
      this.isProduction() ? 'Rewards_API_Bank_Payout_Sku_Live' : 'Rewards_API_Bank_Payout_Sku_Dev'
    );
  }

  getUpiPayoutSku() {
    return this.get(
      this.isProduction() ? 'Rewards_API_Upi_Payout_Sku_Live' : 'Rewards_API_Upi_Payout_Sku_Dev'
    );
  }
}
