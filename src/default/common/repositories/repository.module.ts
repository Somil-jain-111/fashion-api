import { Global, Module } from "@nestjs/common";
import { LoginHistoriesRepository } from "./login-histories.repository";
import { RolesRepository } from "./roles.repository";
import { UserRepository } from "./users.repository";
import { RevokedTokenRepository } from "./revoked_token.repository";

@Global()
@Module({
  providers: [
    UserRepository,
    RolesRepository,
    LoginHistoriesRepository,
    RevokedTokenRepository,
  ],
  exports: [
    UserRepository,
    RolesRepository,
    LoginHistoriesRepository,
    RevokedTokenRepository,
  ],
})
export class RepositoryModule {}
