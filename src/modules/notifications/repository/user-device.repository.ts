import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BaseRepository } from 'src/default/common/repositories/base.repository';
import { UserDeviceEntity } from '../entities/user-device.entity';
import { DevicePlatform } from '../enum/notification-channel.enum';

@Injectable()
export class UserDeviceRepository extends BaseRepository<UserDeviceEntity> {
  constructor(dataSource: DataSource) {
    super(dataSource.getRepository(UserDeviceEntity));
  }

  findByToken(deviceToken: string) {
    return this.repository.findOne({ where: { device_token: deviceToken } });
  }

  async upsert(
    userId: string,
    deviceToken: string,
    platform: DevicePlatform
  ): Promise<UserDeviceEntity> {
    const existing = await this.findByToken(deviceToken);
    if (existing) {
      existing.user = { id: Number(userId) } as any;
      existing.platform = platform;
      existing.last_seen_at = new Date();
      return this.repository.save(existing);
    }
    return this.repository.save(
      this.repository.create({
        user: { id: Number(userId) } as any,
        device_token: deviceToken,
        platform,
        last_seen_at: new Date(),
      })
    );
  }

  async removeToken(userId: string, deviceToken: string): Promise<void> {
    await this.repository.delete({
      user: { id: Number(userId) } as any,
      device_token: deviceToken,
    });
  }

  findTokensForUser(userId: string): Promise<UserDeviceEntity[]> {
    return this.repository.find({ where: { user: { id: Number(userId) } } });
  }
}
