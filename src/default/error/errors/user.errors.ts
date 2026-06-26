export const USER_ERRORS = {
  USER_NOT_FOUND: {
    code: 'USR_001',
    message: 'User not found',
    statusCode: 404,
  },

  USER_ALREADY_EXISTS: {
    code: 'USR_002',
    message: 'User already exists',
    statusCode: 400,
  },

  USER_INACTIVE: {
    code: 'USR_003',
    message: 'User is inactive',
    statusCode: 401,
  },

  INVALID_USER_ID: {
    code: 'USR_004',
    message: 'Invalid user id',
    statusCode: 400,
  },

  USER_UPDATE_FAILED: {
    code: 'USR_005',
    message: 'User update failed',
    statusCode: 400,
  },

  USER_PENDING: {
    code: 'USR_006',
    message: 'User approval is pending',
    statusCode: 403,
  },

  USER_REJECTED: {
    code: 'USR_007',
    message: 'User has been rejected',
    statusCode: 403,
  },

  USER_HOLD: {
    code: 'USR_008',
    message: 'User account is on hold',
    statusCode: 403,
  },

  USER_DELETED: {
    code: 'USR_009',
    message: 'User account has been deleted',
    statusCode: 410,
  },

  USER_INVALID_STATUS: {
    code: 'USR_010',
    message: 'User status is invalid',
    statusCode: 400,
  },

  MOBILE_NOT_FOUND: {
    code: 'USR_011',
    message: 'Mobile number not found',
    statusCode: 400,
  },
} as const;
