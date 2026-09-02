import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from 'src/default/config/config.module';
import { AppConfigService } from 'src/default/config/config.service';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { AuthModule } from '../auth/auth.module';
import { SystemConfigRepository } from 'src/default/common/repositories/system-config.repository';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceGuard } from './maintenance.guard';
import { MaintenanceService } from './maintenance.service';

@Module({
  imports: [
    AuthModule,
    RedisModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.getJwtAccessSecret(),
      }),
    }),
  ],
  providers: [
    SystemConfigRepository,
    MaintenanceService,
    MaintenanceGuard,
    { provide: APP_GUARD, useExisting: MaintenanceGuard },
  ],
  controllers: [MaintenanceController],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
