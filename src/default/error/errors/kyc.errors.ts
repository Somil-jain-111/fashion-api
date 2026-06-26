export const KYC_ERRORS = {
  PAN_VERIFICATION_FAILED: {
    code: 'KYC_001',
    message: 'PAN verification failed: {reason}',
    statusCode: 400,
  },
  PAN_ALREADY_VERIFIED: {
    code: 'KYC_002',
    message: 'PAN is already verified',
    statusCode: 400,
  },
  AADHAAR_VERIFICATION_FAILED: {
    code: 'KYC_003',
    message: 'Aadhaar verification failed: {reason}',
    statusCode: 400,
  },
  GST_VERIFICATION_FAILED: {
    code: 'KYC_004',
    message: 'GST verification failed: {reason}',
    statusCode: 400,
  },
  KYC_SECRET_KEY_MISSING: {
    code: 'KYC_005',
    message: 'KYC secret key is missing',
    statusCode: 500,
  },
  NAME_MATCH_FAILED: {
    code: 'KYC_005',
    message: 'Name matching failed: {reason}',
    statusCode: 400,
  },
  USER_PROFILE_NAME_REQUIRED: {
    code: 'KYC_006',
    message: 'Please add name in your profile',
    statusCode: 400,
  },
  PAN_ALREADY_SUBMITTED: {
    code: 'KYC_007',
    message: 'Your PAN verification is already in process or approved. You cannot submit again.',
    statusCode: 400,
  },

  PAN_ALREADY_IN_USE: {
    code: 'KYC_008',
    message: 'This PAN number is already in use',
    statusCode: 400,
  },
  PAN_NOT_LINKED_WITH_AADHAAR: {
    code: 'KYC_009',
    message: 'This PAN number is not linked with an Aadhaar number',
    statusCode: 400,
  },

  PAN_DATA_ENCRYPTION_FAILED: {
    code: 'KYC_010',
    message: 'Failed to process PAN data',
    statusCode: 500,
  },

  AADHAAR_IMAGES_REQUIRED: {
    code: 'KYC_011',
    message: 'Both Aadhaar images are mandatory',
    statusCode: 400,
  },

  INVALID_AADHAAR_FRONT_IMAGE: {
    code: 'KYC_012',
    message: 'Invalid Aadhaar front image format',
    statusCode: 400,
  },

  INVALID_AADHAAR_BACK_IMAGE: {
    code: 'KYC_013',
    message: 'Invalid Aadhaar back image format',
    statusCode: 400,
  },

  INVALID_AADHAAR_NUMBER: {
    code: 'KYC_014',
    message: 'Aadhaar number must contain 12 digits',
    statusCode: 400,
  },

  AADHAAR_ALREADY_IN_USE: {
    code: 'KYC_015',
    message: 'This Aadhaar number is already in use',
    statusCode: 400,
  },

  AADHAAR_ALREADY_VERIFIED: {
    code: 'KYC_016',
    message: 'Aadhaar already verified',
    statusCode: 400,
  },

  AADHAAR_OTP_GENERATION_FAILED: {
    code: 'KYC_017',
    message: 'Aadhaar OTP generation failed: {reason}',
    statusCode: 400,
  },

  AADHAAR_OTP_EXPIRED: {
    code: 'KYC_018',
    message: 'Aadhaar OTP expired. Please generate OTP again',
    statusCode: 400,
  },
  INVALID_OTP: {
    code: 'KYC_019',
    message: 'OTP must be of 6 digits',
    statusCode: 400,
  },
  KYC_REQUIRED_FOR_REDEMPTION: {
    code: 'KYC_020',
    message: 'Aadhaar or PAN KYC is required for redemption.',
    statusCode: 400,
  },

  PAN_KYC_REQUIRED: {
    code: 'KYC_021',
    message: 'Complete PAN KYC to redeem this product.',
    statusCode: 400,
  },
} as const;
