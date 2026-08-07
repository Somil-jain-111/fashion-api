import { Injectable } from '@nestjs/common';
import axios from 'axios';
//
import { ParticipationOTPSmsTemplate, SMSPayload, SMSTemplateDataMap } from './dto/sms.dto';
import { OTPAttemptLogsRepository } from '../auth/repository';
import { BusinessException } from 'src/default/error/business.exception';
import { ERROR_CODES } from 'src/default/error/error.code';
import { SMSTemplateType } from 'src/default/common/enums/sms-template.enum';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { SMS_TEMPLATES } from 'src/default/common/constants/sms-templates.constant';

@Injectable()
export class SmsService {
  private readonly communicationUrl: string =
    'http://125.16.147.178/VoicenSMS/webresources/CreateSMSCampaignPost';

  constructor(private readonly otpAttemptsRepository: OTPAttemptLogsRepository) {}

  /**
   * Validate raw MailPayload to ensure no null or undefined or empty required fields pass through.
   */
  private validatePayload(payload: SMSPayload): void {
    if (!payload) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
        reason: 'Email payload must be provided',
      });
    }

    if (!payload.filetype || typeof payload.filetype !== 'number') {
      throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
        field: 'filetype',
      });
    }

    if (!payload.thirdpartyrefno || !payload.thirdpartyrefno.trim()) {
      throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
        field: 'thirdpartyrefno',
      });
    }

    if (!payload.msisdn || !Array.isArray(payload.msisdn) || payload.msisdn.length === 0) {
      throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
        field: 'msisdn',
      });
    }

    if (payload.language < 0 || typeof payload.language !== 'number') {
      throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
        field: 'language',
      });
    }

    if (payload.credittype < 0 || typeof payload.credittype !== 'number') {
      throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
        field: 'credittype',
      });
    }

    if (!payload.senderid || !payload.senderid.trim()) {
      throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
        field: 'senderid',
      });
    }

    if (payload.templateid < 0 || typeof payload.templateid !== 'number') {
      throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
        field: 'templateid',
      });
    }

    if (!payload.message || !payload.message.trim()) {
      throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
        field: 'message',
      });
    }

    if (!payload.ukey || !payload.ukey.trim()) {
      throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
        field: 'ukey',
      });
    }

    if (typeof payload.isrefno !== 'boolean') {
      throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
        field: 'isrefno',
      });
    }
  }

  /**
   * Validate required fields for template data based on template type.
   */
  private validateTemplateData<T extends SMSTemplateType>(
    templateType: T,
    data: SMSTemplateDataMap[T]
  ): void {
    if (!templateType) {
      throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
        field: 'templateType',
      });
    }

    if (!data) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
        reason: 'Template data must be provided',
      });
    }

    switch (templateType) {
      case SMSTemplateType.PARTICIPATION_OTP: {
        const otpData = data as ParticipationOTPSmsTemplate;

        if (!otpData.mobile || !otpData.mobile.trim()) {
          throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
            field: 'mobile',
          });
        }

        if (!otpData.otp || !otpData.otp.trim()) {
          throw new BusinessException(ERROR_CODES.VALIDATION.REQUIRED_FIELD_MISSING, {
            field: 'otp',
          });
        }

        break;
      }

      default: {
        throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
          reason: `Unsupported sms template type: ${templateType}`,
        });
      }
    }
  }

  /**
   * Core method to send email payload to communication API.
   */
  private async sendSMS(payload: SMSPayload): Promise<{ status: string; [key: string]: any }> {
    this.validatePayload(payload);

    try {
      ConsoleLogger.log(
        `Sending SMS | mobile=${payload.msisdn} | message=${payload.message}`,
        'SMSSenderHelper'
      );

      const response = await axios.post(this.communicationUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        maxBodyLength: Infinity,
      });

      ConsoleLogger.log(
        `SMS sent successfully | status=${response?.status} | mobile=${payload.msisdn}`,
        'SMSSenderHelper'
      );

      return response?.data;
    } catch (error: any) {
      ConsoleLogger.error(
        `SMS dispatch failed | mobile=${payload.msisdn} | message=${error?.message}`,
        error?.stack,
        {
          tag: 'SMSSenderHelper.sendSMS',
          data: {
            mobile: payload.msisdn,
            message: payload.message,
          },
        }
      );

      return {
        status: 'failed',
        errorMessage: error?.response?.message || error?.message || 'SMS dispatch failed',
      };
    }
  }

  /**
   * Render template and send email with strict typing and validation.
   */
  private async sendSMSByTemplate<T extends SMSTemplateType>(
    templateType: T,
    data: SMSTemplateDataMap[T]
  ): Promise<any> {
    this.validateTemplateData(templateType, data);

    const templateGenerator = SMS_TEMPLATES[templateType];

    if (!templateGenerator) {
      throw new BusinessException(ERROR_CODES.COMMON.BAD_REQUEST_RESON, {
        reason: `Template generator not found for template type: ${templateType}`,
      });
    }

    const payload = templateGenerator(data as any);
    const smsResponse = await this.sendSMS(payload);

    const isSuccess = smsResponse.status === 'success';

    await this.otpAttemptsRepository.saveLog({
      attemptType: data.type,
      mobile: Number(data.mobile),
      otp: data.otp,
      user: { id: data.userId } as any,
      isSuccess: isSuccess,
      errorMessage: isSuccess ? null : smsResponse?.errorMessage,
    });

    return smsResponse;
  }

  /**
   * Helper method to send OTP Verification SMS.
   */
  public async sendParticipationOTPSms(data: ParticipationOTPSmsTemplate): Promise<any> {
    try {
      return await this.sendSMSByTemplate(SMSTemplateType.PARTICIPATION_OTP, data);
    } catch (err: any) {
      ConsoleLogger.error(
        `SMS OTP failed | mobile=${data?.mobile} | message=${err?.message}`,
        err?.stack,
        'CommonUtils'
      );
      return null;
    }
  }
}
