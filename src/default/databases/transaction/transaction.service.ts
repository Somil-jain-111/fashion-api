// src/database/transaction/transaction.service.ts

import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { TransactionCallback } from "./transaction.interface";
import { ConsoleLogger } from "src/default/logger/console/console.service";

@Injectable()
export class TransactionService {
  constructor(private readonly dataSource: DataSource) {}

  async execute<T>(callback: TransactionCallback<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await callback(queryRunner.manager);

      await queryRunner.commitTransaction();

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      ConsoleLogger.error("TRANSACTION_FAILED", error?.stack, {
        tag: "TransactionService.execute",
        data: {
          message: error?.message,
        },
      });

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getRepository<T>(
    manager: EntityManager,
    entity: new () => T,
  ) {
    return manager.getRepository(entity);
  }
}