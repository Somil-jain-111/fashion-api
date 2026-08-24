import { ParticipationOTPSmsTemplate, SMSPayload } from 'src/modules/sms/dto/sms.dto';
import { SMSTemplateType } from '../enums/sms-template.enum';

const SMSConfigs = {
  THIRD_PARTY_REF_NO: 'fashion_SHOES',
  SENDER_ID: 'TCHALM',
  U_KEY: 'KTXq25wGcHqv6xcnGjl9UnAWK',
};

export const SMS_TEMPLATES: {
  [SMSTemplateType.PARTICIPATION_OTP]: (data: ParticipationOTPSmsTemplate) => SMSPayload;
} = {
  [SMSTemplateType.PARTICIPATION_OTP]: (data: ParticipationOTPSmsTemplate): SMSPayload => {
    const recipientMobile = String(data.mobile.trim());
    const otp = String(data.otp.trim());

    const smsMessage = 'Your OTP for participation is ' + otp + '. Regards,Team Almonds';

    return {
      filetype: 2,
      thirdpartyrefno: SMSConfigs.THIRD_PARTY_REF_NO,
      msisdn: [recipientMobile],
      language: 0,
      credittype: 7,
      senderid: SMSConfigs.SENDER_ID,
      templateid: 0,
      message: smsMessage,
      ukey: SMSConfigs.U_KEY,
      isrefno: true,
    };
  },
};
