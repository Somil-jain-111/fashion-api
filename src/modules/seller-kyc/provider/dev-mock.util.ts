import { AppConfigService } from 'src/default/config/config.service';

/**
 * Non-prod/QA skips the real REWARDS_API call and returns a synthetic success —
 * same isProd gate already used for OTP dispatch, so KYC verification doesn't
 * depend on 3rd-party provider credentials/availability outside prod/QA.
 */
export function shouldMockKycProvider(appConfigService: AppConfigService): boolean {
  return !appConfigService.isProduction() && !appConfigService.isQa();
}
