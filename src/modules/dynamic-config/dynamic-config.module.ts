import { Module } from "@nestjs/common";
//
import { DynamicConfigController } from "./dynamic-config.controller";
import { DynamicConfigService } from "./dynamic-config.service";

@Module({
  controllers: [DynamicConfigController],
  providers: [DynamicConfigService],
  exports: [DynamicConfigService],
})
export class DynamicConfigModule {}
