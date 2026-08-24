import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from './default/config/config.module';
import { SqlDbModule } from './default/databases/mysql/sqldb.module';
// import { MongodbModule } from "./default/databases/mongodb/mongodb.module";
import { RedisModule } from './default/databases/redis/redis.module';
import { AppController } from './app.controller';
import { AppCacheModule } from './default/cache/cache.module';
import { SwaggerModule } from './default/swagger/swagger.module';
import { HttpModule } from '@nestjs/axios';
import { ErrorHandlingModule } from './default/error/error.module';
import { NotFoundMiddleware } from './default/common/middleware/not-found.middleware';
import { ValidationPipe, ValidationError } from '@nestjs/common';
import { BusinessException } from './default/error/business.exception';
import { ERROR_CODES } from './default/error/error.code';
import { ConsoleLogger } from './default/logger/console/console.service';
import { ScheduleModule } from '@nestjs/schedule';
import { UnifiedResponseInterceptor } from './default/common/interceptors/unified-response.interceptor';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigService } from './default/config/config.service';
import { LoggerModule } from './default/logger/console/console.module';
import { CloudwatchModule } from './default/logger/cloudwatch/cloudwatch.module';
import { BullmqModule } from './default/common/services/bullmq/bullmq.module';
import { LocalStorageInterceptor } from './default/common/interceptors/local-storage.interceptor';
import { IdempotencyModule } from './default/idempotency/idempotency.module';
import { APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullSetupModule } from './bull/bull.module';
// import { MediaService } from './modules/media/media.service';
import { JourneyIdMiddleware } from './default/common/middleware/journey-id.middleware';
// import { OnboardingApprovalModule } from './modules/onboarding-approval/onboarding-approval.module';
import { S3Module } from './default/common/services/s3/s3.module';


@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),

    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    ConfigModule,
    LoggerModule,
    SqlDbModule,
    // MongodbModule,
    RedisModule,
    AppCacheModule,
    SwaggerModule,
    HttpModule,
    ErrorHandlingModule,
    CloudwatchModule,
    BullmqModule,
    IdempotencyModule,
    BullSetupModule,
    // OnboardingApprovalModule,
    S3Module,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
          transform: true,
          transformOptions: {
            enableImplicitConversion: true,
          },
          // Never leak per-field validation details (constraint names, property
          // names/values) to the client — log them internally and return a single
          // generic error instead.
          exceptionFactory: (errors: ValidationError[]) => {
            ConsoleLogger.error('DTO validation failed', JSON.stringify(errors), 'ValidationPipe');
            console.log(errors);
            return new BusinessException(ERROR_CODES.VALIDATION.INVALID_PAYLOAD);
          },
        }),
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: UnifiedResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LocalStorageInterceptor,
    },
    AppConfigService,
    // MediaService,
  ],
  controllers: [AppController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NotFoundMiddleware, JourneyIdMiddleware)
      .exclude({ path: '/api/v1/users', method: RequestMethod.ALL })
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
