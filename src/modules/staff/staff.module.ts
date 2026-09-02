import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StaffController, StaffInvitationController } from './staff.controller';
import { StaffRepository } from './staff.repository';
import { StaffService } from './staff.service';

@Module({
  imports: [AuthModule],
  controllers: [StaffController, StaffInvitationController],
  providers: [StaffService, StaffRepository],
  exports: [StaffService, StaffRepository],
})
export class StaffModule {}
