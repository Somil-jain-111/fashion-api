import { Module } from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { AuthModule } from '../auth/auth.module';
import { RedemptionsModule } from '../redemptions/redemptions.module';
import { UserRepository } from '../user/repository';
import { PointHistoryRepository } from '../redemptions/repository';
import { RolesRepository } from '../auth/repository';

@Module({
    imports: [AuthModule],
  controllers: [EmployeeController],
  providers: [
    EmployeeService,
    UserRepository,
    RolesRepository,
    PointHistoryRepository,
  ],
  exports: [EmployeeService],
})
export class EmployeeModule {}