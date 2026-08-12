import { CONSTANTS } from '../constants/common.option';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AppConfigService } from 'src/default/config/config.service';
import axios from 'axios';
import { ConflictException } from '@nestjs/common';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { MailerHelper } from '../helper/mailer.helper';
import { OtpRateLimitTemplateData, OtpRateLimitUserData } from '../dto/mailer.dto';

export class CommonUtils {
  private static appConfigService: AppConfigService;
  private static readonly algorithm = 'aes-256-cbc';
  private static secretKey: Buffer;
  private static readonly iv = Buffer.alloc(16, 0); // 16-byte IV
  private static readonly SALT_ROUNDS = 10;

  // Initialize the AppConfigService
  static init(appConfigService: AppConfigService) {
    this.appConfigService = appConfigService;
    const encryptionKey = this.appConfigService.get('ENCRYPTION_SECRET_KEY') || 'default_secret';
    this.secretKey = crypto.scryptSync(encryptionKey, 'salt', 32); // Generate 32-byte key
  }

  static getPagination(page: number = CONSTANTS.PAGE, size: number = CONSTANTS.SIZE) {
    const limit = size || 10;
    const offset = (page - 1) * limit;
    return { limit, offset };
  }

  static uuidGenerator(): string {
    return uuidv4();
  }

  static generateApplicationId(prefix: string = 'RET'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const rand5 = Math.floor(10000 + Math.random() * 90000);
    return `${prefix}_${year}_${month}_${rand5}`;
  }

  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(CommonUtils.SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  static encrypt(text: string): string {
    if (!this.secretKey) {
      throw new Error('CommonUtils.init() must be called before using encrypt()');
    }
    const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, this.iv);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  static decrypt(encryptedText: string): string {
    if (!this.secretKey) {
      throw new Error('CommonUtils.init() must be called before using decrypt()');
    }
    const decipher = crypto.createDecipheriv(this.algorithm, this.secretKey, this.iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  }

  static getEstimatedDate(startDate: Date): Date {
    const estimatedDate = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < 15) {
      estimatedDate.setDate(estimatedDate.getDate() + 1);

      const isSunday = estimatedDate.getDay() === 0;

      if (!isSunday) {
        daysAdded++;
      }
    }

    return estimatedDate;
  }

  static generateOrderNumber(): string {
    const result = Math.floor(100000000000 + Math.random() * 999999999999).toString();
    return result;
  }

  static generateTransactionID(): string {
    const timestamp = Date.now().toString();
    const randomString = Math.random().toString(36).substring(2, 8);

    const transactionId = (timestamp + randomString).slice(0, 16).toUpperCase();
    return `REDEEM${transactionId}`;
  }
  static getMonthName(date: Date): string {
    return date.toLocaleString('en-US', { month: 'long' });
  }

  static getYear(date: Date): string {
    return date.getFullYear().toString();
  }
  // e.g., "2025"
  static isValidMobileNumber(mobile: string) {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(mobile);
  }
  static HmacKey(body: any): string {
    const key = 'almondRewards';
    const requestBody = JSON.stringify(body);

    const hmac = crypto.createHmac('sha256', key);

    hmac.update(requestBody);

    const hmacHex = hmac.digest('hex');

    return hmacHex;
  }
  static extractValidJson(response: any): any {
    // Find the first occurrence of a JSON object
    const jsonStart = response.lastIndexOf('{');

    if (jsonStart !== -1) {
      const possibleJson = response.slice(jsonStart).trim();
      try {
        return JSON.parse(possibleJson);
      } catch {
        throw new Error('Failed to parse JSON from response');
      }
    }

    throw new Error('No JSON found in response');
  }

  static async generateUniqueUUIDCode(): Promise<string> {
    const uuid = uuidv4().replace(/[^a-zA-Z0-9]/g, '');
    return uuid.substring(0, 12).padEnd(12, '0');
  }

  static async generateUniqueRefCode(): Promise<string> {
    const now = new Date();

    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');

    // HHMMSSmmm → hours, minutes, seconds, milliseconds
    const timePart =
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0') +
      now.getMilliseconds().toString().padStart(3, '0');

    // Strong random 4-digit
    const rand = Math.floor(1000 + Math.random() * 9000);

    return `ALMONDBANK${yy}${mm}${dd}${timePart}${rand}CAMPUS`;
  }

  static async generateSecretKey(data: {
    type: string;
    name: string;
    email: string;
    number: string;
    accountNumber: string;
    ifscCode: string;
    amount: string;
    transaction_id: string;
    sku: string;
    pancard?: string;
  }): Promise<string> {
    const body: any = {
      type: data.type,
      name: data.name,
      email: data.email,
      msisdn: data.number,
      accountNumber: data.accountNumber,
      bankIfsc: data.ifscCode,
      amount: String(data.amount),
      transaction_id: data.transaction_id,
      sku: data.sku,
    };
    const key =
      process.env.NODE_ENV === 'production'
        ? process.env.KYC_SECRET_KEY
        : process.env.KYC_SECRET_KEY;

    if (data?.pancard !== undefined) {
      body.pan_card = data.pancard;
    }

    const requestBody = JSON.stringify(body);

    //Create an HMAC-SHA256 hash
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(requestBody);

    return hmac.digest('hex'); // return final hash
  }

  static async generateSecretKeyForVoucher(data: {
    type: string;
    name: string;
    msisdn: string;
    sku: string;
    amount: string;
    transaction_id: string;
  }): Promise<string> {
    // ✅ Body for HMAC generation (same structure sent to Rewards API)
    const body: Record<string, any> = {
      type: data.type,
      name: data.name,
      msisdn: data.msisdn,
      sku: data.sku,
      amount: String(data.amount),
      transaction_id: data.transaction_id,
    };

    // ✅ Secret key (from .env)
    const key =
      process.env.NODE_ENV === 'production'
        ? process.env.KYC_SECRET_KEY
        : process.env.KYC_SECRET_KEY;

    if (!key) {
      throw new Error('Missing HMAC secret key in environment variables');
    }

    // ✅ Prepare JSON body for hashing
    const requestBody = JSON.stringify(body);

    // ✅ Create HMAC-SHA256 hash
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(requestBody);

    // ✅ Return final signature (hex format)
    return hmac.digest('hex');
  }

  static generatePaginationResponse(
    total: number,
    page: number,
    limit: number
  ): {
    totalItems: number;
    currentPage: number;
    pageSize: number;
    totalPages: number;
  } {
    return {
      totalItems: total,
      currentPage: page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async sendWhatsappOtp(data: { mobile: string; otp: string; name?: string }): Promise<any> {
    try {
      const mobileStr = String(data.mobile ?? '').trim();
      if (!mobileStr) {
        ConsoleLogger.log('WhatsApp OTP skipped | reason=no mobile', 'CommonUtils');
        return null;
      }

      const payload = {
        project_id: 'CAMPUS_WHATSAPP_PROJECT_ID',
        admin_id: 'CAMPUS_WHATSAPP_ADMIN_ID',
        raw_template: {
          name: 'CAMPUS_WHATSAPP_OTP_TEMPLATE_NAME',
          parameter_format: 'POSITIONAL',
          components: [
            {
              type: 'BODY',
              text: 'Dear *{{1}}*, your OTP for verification is *{{2}}*. This OTP is valid for 5 minutes. Do not share it with anyone.',
              example: {
                body_text: [['User', '1234']],
              },
            },
            {
              type: 'FOOTER',
              text: 'Campus Shoes Loyalty Program',
            },
          ],
          language: 'en',
          status: 'APPROVED',
          category: 'UTILITY',
          id: 'CAMPUS_WHATSAPP_OTP_TEMPLATE_ID',
        },
        number: parseInt(mobileStr, 10),
        body: {
          '1': data.name ?? 'User',
          '2': data.otp,
        },
        language: 'english',
      };

      ConsoleLogger.log(`Sending WhatsApp OTP | mobile=${mobileStr}`, 'CommonUtils');

      const response = await axios.post(
        'https://communicationapi2.almond.solutions/api/v1/message/process',
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer CAMPUS_WHATSAPP_AUTH_TOKEN',
          },
          maxBodyLength: Infinity,
        }
      );

      ConsoleLogger.log(
        `WhatsApp OTP sent | status=${response?.status} | mobile=${mobileStr}`,
        'CommonUtils'
      );

      return response.data;
    } catch (err: any) {
      ConsoleLogger.error(
        `WhatsApp OTP failed | mobile=${data.mobile} | message=${err?.message}`,
        err?.stack,
        'CommonUtils'
      );
      return null;
    }
  }

  static async sendEmailOtp(data: { email: string; otp: string; name?: string }): Promise<any> {
    try {
      return await MailerHelper.sendOtpVerificationEmail(data);
    } catch (err: any) {
      ConsoleLogger.error(
        `Email OTP failed | email=${data?.email} | message=${err?.message}`,
        err?.stack,
        'CommonUtils'
      );
      return null;
    }
  }

  static async sendMaliciousOTPEmail(data: OtpRateLimitTemplateData): Promise<any> {
    try {
      return await MailerHelper.sendOtpRateLimitEmail(data);
    } catch (err: any) {
      ConsoleLogger.error(
        `Email OTP failed | mobile=${data?.user?.mobile} | attempts=${data?.user?.attempts} | message=${err?.message}`,
        err?.stack,
        'CommonUtils'
      );
      return null;
    }
  }

  static getLocalTimeString(date?: Date) {
    return new Date(date ? date : Date.now()).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium',
    });
  }
}
