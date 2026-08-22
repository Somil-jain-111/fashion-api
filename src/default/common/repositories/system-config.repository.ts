import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SystemConfigEntity } from '../entities/system-config.entity';

@Injectable()
export class SystemConfigRepository {
  constructor(
    private readonly dataSource: DataSource,
  ) {}

  async getValue(
    key: string,
    fallback: string,
  ): Promise<string> {
    const repo =
      this.dataSource.getRepository(
        SystemConfigEntity,
      );

    const row = await repo.findOne({
      where: {
        configKey: key,
      },
    });

    return row?.configValue ?? fallback;
  }

  async getNumber(
    key: string,
    fallback: number,
  ): Promise<number> {
    const value = await this.getValue(
      key,
      String(fallback),
    );

    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : fallback;
  }

  async setValue(
    key: string,
    value: string,
    updatedBy: string,
  ): Promise<void> {
    const repo =
      this.dataSource.getRepository(
        SystemConfigEntity,
      );

    const existing = await repo.findOne({
      where: {
        configKey: key,
      },
    });

    if (existing) {
      existing.configValue = value;
      existing.updatedBy = updatedBy;

      await repo.save(existing);
    } else {
      await repo.save(
        repo.create({
          configKey: key,
          configValue: value,
          updatedBy,
        }),
      );
    }
  }
}