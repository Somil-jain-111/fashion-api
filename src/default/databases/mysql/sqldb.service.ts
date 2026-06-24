import { Injectable, OnModuleInit } from "@nestjs/common";
import { DataSource } from "typeorm";
// import { RepositoryFactory } from "../../common/repositories/RepositoryFactory";
import { ConsoleLogger } from "../../logger/console/console.service";
import { RepositoryFactory } from "src/default/common/repositories/repository.factory";

@Injectable()
export class SqlDbService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource, // ✅ default connection
  ) {}

  async onModuleInit() {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize();
      }

      RepositoryFactory.init(this.dataSource);

      ConsoleLogger.log(
        `RepositoryFactory initialized with ${RepositoryFactory.listKeys().length} repositories`,
        "SqlDbService",
      );
    } catch (error: any) {
      ConsoleLogger.error(
        "Failed to initialize RepositoryFactory",
        error?.stack,
        "SqlDbService",
      );
      throw error;
    }
  }
}
