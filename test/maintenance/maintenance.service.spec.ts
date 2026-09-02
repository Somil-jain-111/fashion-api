import { MaintenanceService } from 'src/modules/maintenance/maintenance.service';
import { SystemConfigRepository } from 'src/default/common/repositories/system-config.repository';
import { RedisService } from 'src/default/databases/redis/redis.service';
import { TransactionService } from 'src/default/databases/transaction';
import { createMock } from '../utils/mock.util';

describe('MaintenanceService', () => {
  let service: MaintenanceService;
  let configs: jest.Mocked<SystemConfigRepository>;
  let redis: jest.Mocked<RedisService>;
  let transactions: jest.Mocked<TransactionService>;

  beforeEach(() => {
    configs = createMock<SystemConfigRepository>();
    redis = createMock<RedisService>();
    transactions = createMock<TransactionService>();
    transactions.execute.mockImplementation(async (callback: any) => callback({}));
    service = new MaintenanceService(configs, redis, transactions);
  });

  it('uses Redis for the hot request path', async () => {
    redis.get.mockResolvedValue({ enabled: true, message: 'Deploying' });
    await expect(service.getState()).resolves.toEqual({ enabled: true, message: 'Deploying' });
    expect(configs.getValues).not.toHaveBeenCalled();
  });

  it('falls back to projected database config and populates Redis', async () => {
    redis.get.mockResolvedValue(null);
    configs.getValues.mockResolvedValue(
      new Map([
        ['MAINTENANCE_MODE', 'true'],
        ['MAINTENANCE_MESSAGE', 'Deploying'],
      ])
    );

    await expect(service.getState()).resolves.toEqual({ enabled: true, message: 'Deploying' });
    expect(redis.set).toHaveBeenCalledWith(
      'system:maintenance:v1',
      { enabled: true, message: 'Deploying' },
      30
    );
  });

  it('updates both durable values transactionally before refreshing Redis', async () => {
    await service.updateState(true, 'Scheduled deployment', 9);
    expect(transactions.execute).toHaveBeenCalledTimes(1);
    expect(configs.setValue).toHaveBeenCalledTimes(2);
    expect(redis.set).toHaveBeenCalledWith(
      'system:maintenance:v1',
      { enabled: true, message: 'Scheduled deployment' },
      30
    );
  });
});
