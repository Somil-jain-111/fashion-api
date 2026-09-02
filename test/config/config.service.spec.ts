import { ConfigService } from '@nestjs/config';
import { AppConfigService } from 'src/default/config/config.service';

describe('AppConfigService.isLocalOnly', () => {
  const buildService = (nodeEnv: string) => {
    const configService = {
      get: (key: string) => (key === 'NODE_ENV' ? nodeEnv : undefined),
    } as ConfigService;
    return new AppConfigService(configService);
  };

  /**
   * Security regression test: a fixed/known OTP value (see AuthService.issueAndDispatchOtp)
   * must only ever apply to environments nobody outside the machine running them can reach.
   * `uat`/`preprod` are real, remotely-deployed staging environments — treating them as
   * "local" would leak the well-known OTP onto a publicly reachable target (the original bug).
   */
  it.each(['development', 'test'])('%s is local-only', (nodeEnv) => {
    expect(buildService(nodeEnv).isLocalOnly()).toBe(true);
  });

  it.each(['uat', 'preprod', 'production'])('%s is NOT local-only', (nodeEnv) => {
    expect(buildService(nodeEnv).isLocalOnly()).toBe(false);
  });
});
