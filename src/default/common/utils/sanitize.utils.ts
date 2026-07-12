export class DataSanitizer {
  private static readonly defaultSensitiveFields = [
    'password',
    'otp',
    'otpGeneratedAt',
    'refreshToken',
    'refreshTokenExpiry',
    'accessToken',
  ];

  /**
   * Sanitize data based on sensitive fields.
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
      return this.removeSensitiveFields(data, sensitiveFields);
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
}
