import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
//
import { DynamicConfigRepository } from './repository';
import { DynamicConfigService } from './dynamic-config.service';
import { DynamicConfigController } from './dynamic-config.controller';
import { ApplicationConfig, ConfigLog, UserRoleConfig } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([UserRoleConfig, ApplicationConfig, ConfigLog])],
  controllers: [DynamicConfigController],
  providers: [DynamicConfigService, DynamicConfigRepository],
  exports: [DynamicConfigService, DynamicConfigRepository],
})
export class DynamicConfigModule {}
