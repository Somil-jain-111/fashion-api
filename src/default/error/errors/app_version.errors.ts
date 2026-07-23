export const APP_VERSION_ERRORS = {
  NOT_FOUND: {
    code: 'APP_VERSION_001',
    message: 'App version config not found',
    statusCode: 404,
  },
  PLATFORM_ALREADY_EXISTS: {
    code: 'APP_VERSION_002',
    message: 'App version config already exists for this platform',
    statusCode: 409,
  },
  MAINTENANCE_MODE: {
    code: 'APP_VERSION_003',
    message: 'Application is under maintenance',
    statusCode: 503,
  },
} as const;
