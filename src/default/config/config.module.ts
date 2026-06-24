// src/default/config/config.module.ts

import { Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { AppConfigService } from "./config.service";
import { validationSchema } from "./config.schema";

const nodeEnv = process.env.NODE_ENV || "development";

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${nodeEnv}`, ".env"],
      validationSchema,
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
