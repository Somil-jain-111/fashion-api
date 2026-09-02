import { Module } from '@nestjs/common';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { S3Module } from 'src/default/common/services/s3/s3.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [S3Module, RedisModule],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
