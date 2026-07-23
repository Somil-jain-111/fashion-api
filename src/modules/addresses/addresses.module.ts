import { Module } from '@nestjs/common';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';
import { AddressRepository, PincodeRepository } from 'src/modules/addresses/repository';
import { IdempotencyService } from 'src/default/idempotency/idempotency.service';
import { RedisModule } from 'src/default/databases/redis/redis.module';
import { UserRepository } from '../auth/repository';
import { UserAuthValidator } from '../auth/validators/user-auth.validator';

@Module({
  imports: [RedisModule],

  controllers: [AddressesController],
  providers: [
    AddressesService,
    PincodeRepository,
    AddressRepository,
    UserRepository,
    UserAuthValidator,
    IdempotencyService,
  ],
  exports: [AddressesService, AddressRepository, PincodeRepository],
})
export class AddressesModule {}
