import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { S3_QUEUE } from './constants/s3-queue.constant';
import { S3UploadProcessor } from './processors/s3-upload.processor';
import { S3Service } from './s3.service';
import { S3Controller } from './s3.controller';

@Module({
  imports: [
    ConfigModule,

    BullModule.registerQueueAsync({
      name: S3_QUEUE.UPLOAD,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: Number(configService.get<string>('REDIS_PORT') || 6379),
        },
      }),
    }),
  ],
  controllers: [S3Controller],
  providers: [S3Service, S3UploadProcessor],
  exports: [S3Service],
})
export class S3Module {}
