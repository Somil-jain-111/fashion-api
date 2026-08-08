import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { AuthModule } from '../auth/auth.module';
import { UserRepository } from '../user/repository';
import { PointHistoryRepository } from '../redemptions/repository';
import { RolesRepository } from '../auth/repository';
import { TransactionService } from 'src/default/databases/transaction';

@Module({
  imports: [AuthModule],
  controllers: [EmployeeController],
  providers: [
    EmployeeService,
    UserRepository,
    RolesRepository,
    PointHistoryRepository,
    TransactionService,
  ],
  exports: [EmployeeService],
})
export class EmployeeModule {}
