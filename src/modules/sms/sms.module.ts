import { Module } from '@nestjs/common';
//
import { OTPAttemptLogsRepository } from '../auth/repository/otp-attempt-logs.repository';
import { SmsService } from './sms.service';

@Module({
  providers: [SmsService, OTPAttemptLogsRepository],
  exports: [SmsService, OTPAttemptLogsRepository],
})
export class SmsModule {}
