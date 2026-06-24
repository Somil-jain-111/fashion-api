import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { BullmqService } from "./bullmq.service";
import { BULLMQ_QUEUE } from "./bullmq.constants";
import { CloudwatchModule } from "../../../logger/cloudwatch/cloudwatch.module";
import { CloudwatchLogProcessor } from "./processors/cloudwatch-log.processor";
import { CloudwatchLogListener } from "./listeners/cloudwatch-log.listener";
import { RedisModule } from "src/default/databases/redis/redis.module";
import { RedisService } from "src/default/databases/redis/redis.service";

@Module({
  imports: [
    RedisModule,

    BullModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (redisService: RedisService) => ({
        connection: redisService.getBullMqConnection(),
      }),
    }),

    BullModule.registerQueue({
      name: BULLMQ_QUEUE.CLOUDWATCH_LOG,
    }),

    CloudwatchModule,
  ],
  providers: [
    BullmqService,
    CloudwatchLogProcessor,
    CloudwatchLogListener,
  ],
  exports: [BullmqService, BullModule],
})
export class BullmqModule {}