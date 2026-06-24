// src/modules/kyc/helper/kyc-encryption.helper.ts

import * as CryptoJS from "crypto-js";

type KycEncryptableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, any>
  | any[];

export class KycEncryptionHelper {
  static encrypt(
    value: KycEncryptableValue,
    secretKey: string,
    fixedIv: string,
  ): any {
    const iv = CryptoJS.enc.Hex.parse(fixedIv);
    const key = CryptoJS.enc.Hex.parse(secretKey);

    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        KycEncryptionHelper.encrypt(item, secretKey, fixedIv),
      );
    }

    if (typeof value === "object") {
      const encryptedObj: Record<string, any> = {};

      Object.keys(value).forEach((keyName) => {
        encryptedObj[keyName] = KycEncryptionHelper.encrypt(
          value[keyName],
          secretKey,
          fixedIv,
        );
      });

      return encryptedObj;
    }

    const cipher = CryptoJS.AES.encrypt(JSON.stringify(value), key, {
      iv,
    });

    return cipher.toString();
  }

  static decrypt(
    value: KycEncryptableValue,
    secretKey: string,
    fixedIv: string,
  ): any {
    const iv = CryptoJS.enc.Hex.parse(fixedIv);
    const key = CryptoJS.enc.Hex.parse(secretKey);

    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        KycEncryptionHelper.decrypt(item, secretKey, fixedIv),
      );
    }

    if (typeof value === "object") {
      const decryptedObj: Record<string, any> = {};

      Object.keys(value).forEach((keyName) => {
        decryptedObj[keyName] = KycEncryptionHelper.decrypt(
          value[keyName],
          secretKey,
          fixedIv,
        );
      });

      return decryptedObj;
    }

    const bytes = CryptoJS.AES.decrypt(String(value), key, {
      iv,
    });

    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedText) {
      return null;
    }

    try {
      return JSON.parse(decryptedText);
    } catch {
      return decryptedText;
    }
  }
}