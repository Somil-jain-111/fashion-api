import { CONSTANTS } from '../constants/common.option';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AppConfigService } from 'src/default/config/config.service';
import axios from 'axios';
import { ConflictException } from '@nestjs/common';
import { ConsoleLogger } from 'src/default/logger/console/console.service';
import { OrderStatus } from '../enums/order-status.enum';

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

  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(CommonUtils.SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  // static async sendSMS(data: any): Promise<any> {
  //   try {
  //     // let Apidata = JSON.stringify({
  //     //   sender: "ATCHNS",
  //     //   receiver: data.mobile,
  //     //   content: `Your OTP code is ${data?.otp} ATECHNOS`,
  //     //   msg_type: "TEXT",
  //     //   template_id: "1007999557719618529",
  //     //   project: "JWLP"
  //     // });

  //     // let config = {
  //     //   method: 'post',
  //     //   maxBodyLength: Infinity,
  //     //   url: 'https://smsapi.almond.solutions/api/v2/send/message',
  //     //   headers: {
  //     //     'Content-Type': 'application/json',
  //     //     'Authorization': 'Bearer iKUVpsFkIWrdLMvTjPZJbtRiKbEyEJAw'
  //     //   },
  //     //   data: Apidata
  //     // };

  //     // let response = await axios.request(config);
  //     // return response.data;

  //     const msg: string = `Your OTP is ${data?.otp} Team Go2Market`;
  //     const url = `http://125.16.147.178/VoicenSMS/webresources/CreateSMSCampaignGet?ukey=Gh8Lh2sgjHdwhlBMHYuL5Rwh5&msisdn=${data.mobile}&language=0&credittype=7&senderid=GOMRKT&templateid=0&message=${msg}&filetype=2`;

  //     const options = {
  //       method: 'GET',
  //       url: url,
  //     };

  //     const response = await axios.request(options);
  //     return response.data;
  //   } catch (err) {
  //     throw new ConflictException(err?.message);
  //   }
  // }

  static async sendSMS(data: any): Promise<any> {
    try {
      const msg = 'Your OTP for participation is ' + data.otp + '. Regards,Team Almonds';

      const url = `http://125.16.147.178/VoicenSMS/webresources/CreateSMSCampaignPost`;

      const payload = {
        filetype: 2,
        thirdpartyrefno: 'SKIPPER_PIPES',
        msisdn: [String(data.mobile)],
        language: 0,
        credittype: 7,
        senderid: 'TCHALM',
        templateid: 0,
        message: `${msg}`,
        ukey: 'KTXq25wGcHqv6xcnGjl9UnAWK',
        isrefno: true,
      };

      const options = {
        method: 'POST',
        url: url,
        headers: {
          'Content-Type': 'application/json',
        },
        data: payload,
      };
      const response = await axios.request(options);
      return response.data;
    } catch (err) {
      ConsoleLogger.log(err?.message);
      throw new ConflictException('Something Went Wrong');
    }
  }
  static async sendSmsForOrder(data: any): Promise<any> {
    try {
      const msg = 'Your OTP for participation is ' + data.otp + '. Regards,Team Almonds';

      const url = `http://125.16.147.178/VoicenSMS/webresources/CreateSMSCampaignPost`;

      const payload = {
        filetype: 2,
        thirdpartyrefno: 'SKIPPER_PIPES',
        msisdn: [String(data.mobile)],
        language: 0,
        credittype: 7,
        senderid: 'TCHALM',
        templateid: 0,
        message: `${msg}`,
        ukey: 'KTXq25wGcHqv6xcnGjl9UnAWK',
        isrefno: true,
      };

      //console.log(url);
      const options = {
        method: 'POST',
        url: url,
        headers: {
          'Content-Type': 'application/json',
        },
        data: payload,
      };
      const response = await axios.request(options);
      return response.data;
    } catch (err) {
      ConsoleLogger.log(err?.message);
      throw new ConflictException('Something Went Wrong');
    }
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
}
