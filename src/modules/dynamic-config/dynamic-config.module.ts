import { Module } from '@nestjs/common';
//
import { DynamicConfigController } from './dynamic-config.controller';
import { DynamicConfigService } from './dynamic-config.service';

import { DynamicConfigRepository } from './repository';

@Module({
  controllers: [DynamicConfigController],
  providers: [DynamicConfigService, DynamicConfigRepository],
  exports: [DynamicConfigService, DynamicConfigRepository],
})
export class DynamicConfigModule {}
