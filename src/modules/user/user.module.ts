import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBlock } from './entities/user-block.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserBlockRepository } from './repository/user-block.repository';
import { UserRepository, RolesRepository } from 'src/modules/auth/repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserBlock])],
  controllers: [UserController],
  providers: [UserService, UserBlockRepository, UserRepository, RolesRepository],
  exports: [UserService, UserBlockRepository, UserRepository, RolesRepository],
})
export class UserModule {}
