import { Module } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';
import { AddressRepository, PincodeRepository } from 'src/default/common/repositories';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';
import { RedisModule } from 'src/default/databases/redis/redis.module';

@Module({
  imports: [RedisModule],

  controllers: [AddressesController],
  providers: [
    AddressesService,
    UserAuthValidator,
    PincodeRepository,
    AddressRepository,
    IdempotencyService,
  ],
})
export class AddressesModule {}
