import { OtpAttemptType } from 'src/default/common/enums/common.enum';
import { SMSTemplateType } from 'src/default/common/enums/sms-template.enum';

export interface SMSPayload {
  filetype: number;
  thirdpartyrefno: string;
  msisdn: string[];
  language: number;
  credittype: number;
  senderid: string;
  templateid: number;
  message: string;
  ukey: string;
  isrefno: boolean;
}

export interface ParticipationOTPSmsTemplate {
  type: OtpAttemptType;
  mobile: string;
  otp: string;
  userId?: number;
}

export interface SMSTemplateDataMap {
  [SMSTemplateType.PARTICIPATION_OTP]: ParticipationOTPSmsTemplate;
}
