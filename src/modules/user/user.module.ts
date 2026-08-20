import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBlock } from './entities/user-block.entity';
import { UserMapping } from 'src/modules/auth/entities/user-mapping.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserBlockRepository } from './repository/user-block.repository';
import {
  UserRepository,
  RolesRepository,
  UserMappingRepository,
} from 'src/modules/auth/repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserBlock, UserMapping])],
  controllers: [UserController],
  providers: [
    UserService,
    UserBlockRepository,
    UserMappingRepository,
    UserRepository,
    RolesRepository,
  ],
  exports: [
    UserService,
    UserBlockRepository,
    UserMappingRepository,
    UserRepository,
    RolesRepository,
  ],
})
export class UserModule {}
