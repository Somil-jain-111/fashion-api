import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { ParticipationOTPSmsTemplate } from '../dto/sms.dto';
import { SMSSenderHelper } from '../helper/sms.helper';

export class SMSUtils {
  static async sendParticipationOTP(payload: ParticipationOTPSmsTemplate) {
    try {
      await SMSSenderHelper.sendParticipationOTPSms(payload);
    } catch (err: any) {
      console.log(err);
      ConsoleLogger.error(
        `SMS OTP failed | mobile=${payload?.mobile} | message=${err?.message}`,
        err?.stack,
        'CommonUtils'
      );
      return null;
    }
  }
}
