export class DataSanitizer {
  private static readonly defaultSensitiveFields = [
    'password',
    'otp',
    'otpGeneratedAt',
    'refreshToken',
    'refreshTokenExpiry',
    'accessToken',
  ];

  private static readonly defaultDateFields = [
    'createdAt',
    'updatedAt',
    'deletedAt',
    'created_at',
    'updated_at',
    'deleted_at',
    'otp_expiry',
    'otpExpiry',
    'redeem_date',
    'redeemDate',
    'date',
  ];

  /**
   * Sanitize data based on sensitive fields and format date fields.
   *
   * @param data The data to sanitize.
   * @param additionalFields Fields to add to the default sensitive fields.
   * @param overrideSensitiveFields Fields to completely override the default sensitive fields.
   */
  static sanitizeData(
    data: any,
    additionalFields: string[] = [],
    overrideSensitiveFields?: string[]
  ): any {
    const sensitiveFields = overrideSensitiveFields
      ? overrideSensitiveFields
      : [...this.defaultSensitiveFields, ...additionalFields];

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item, additionalFields, overrideSensitiveFields));
    } else if (typeof data === 'object' && data !== null) {
      const sanitized = this.removeSensitiveFields(data, sensitiveFields);
      return this.formatDateFieldsForResponse(sanitized);
    }
    return data;
  }

  private static removeSensitiveFields(obj: Record<string, any>, sensitiveFields: string[]): any {
    const sanitizedObject = { ...obj };

    for (const key in sanitizedObject) {
      if (sensitiveFields.includes(key)) {
        delete sanitizedObject[key];
      } else if (typeof sanitizedObject[key] === 'object' && sanitizedObject[key] !== null) {
        sanitizedObject[key] = this.sanitizeData(sanitizedObject[key], [], sensitiveFields);
      }
    }

    return sanitizedObject;
  }

  /**
   * Format date fields in an object, array, or nested response to ISO string format.
   *
   * @param data The data containing date fields to format.
   * @param customFields Additional field names to treat as date fields.
   */
  static formatDateFieldsForResponse(data: any, customFields: string[] = []): any {
    if (!data) {
      return data;
    }

    const fieldsToFormat = [...this.defaultDateFields, ...customFields];

    if (Array.isArray(data)) {
      return data.map((item) => this.formatDateFieldsForResponse(item, customFields));
    }

    if (data instanceof Date) {
      return data.toISOString();
    }

    if (typeof data === 'object' && data !== null) {
      const result: Record<string, any> = { ...data };

      for (const key of Object.keys(result)) {
        const val = result[key];

        if (val instanceof Date) {
          result[key] = val.toISOString();
        } else if (fieldsToFormat.includes(key) && val !== null && val !== undefined) {
          if (typeof val === 'string' || typeof val === 'number') {
            const parsedDate = new Date(val);

            if (!isNaN(parsedDate.getTime())) {
              result[key] = parsedDate.toISOString();
            }
          }
        } else if (typeof val === 'object' && val !== null) {
          result[key] = this.formatDateFieldsForResponse(val, customFields);
        }
      }

      return result;
    }

    return data;
  }
}
