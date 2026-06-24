import { DataSource } from "typeorm";
import { UserRepository } from "./users.repository";
import { RolesRepository } from "./roles.repository";
import { LoginHistoriesRepository } from "./login-histories.repository";
import { BusinessException } from "src/default/error/business.exception";
import { ERROR_CODES } from "src/default/error/error.code";
import { RevokedTokenRepository } from "./revoked_token.repository";

export class RepositoryFactory {
  private static repositories = new Map<string, any>();

  static init(dataSource: DataSource) {
    this.repositories.set("user", new UserRepository(dataSource));
    this.repositories.set("roles", new RolesRepository(dataSource));
    this.repositories.set(
      "loginhistories",
      new LoginHistoriesRepository(dataSource),
    );
    this.repositories.set(
      "revoked_tokens",
      new RevokedTokenRepository(dataSource),
    );
  }

  static get(name: string) {
    const repo = this.repositories.get(name.toLowerCase());
    if (!repo) {
      throw new BusinessException(
        ERROR_CODES.REPOSITORY.REPOSITORY_INITIALIZATION_FAILED,
      );
    }
    return repo;
  }

  static listKeys(): string[] {
    return Array.from(this.repositories.keys());
  }
}
