export const REWARDS_ERRORS = {
  REWARDS_BASE_URL_MISSING: {
    code: 'REWARDS_001',
    message: 'Rewards API base URL is missing',
    statusCode: 500,
  },
  PERMANENT_TOKEN_MISSING: {
    code: 'REWARDS_002',
    message: 'Rewards permanent token is missing',
    statusCode: 500,
  },
  CATALOGUE_ID_MISSING: {
    code: 'REWARDS_003',
    message: 'Catalogue ID is missing',
    statusCode: 500,
  },
  CATALOGUE_FETCH_FAILED: {
    code: 'REWARDS_004',
    message: 'Catalogue products fetch failed',
    statusCode: 400,
  },
  CATALOGUE_CATEGORY_FETCH_FAILED: {
    code: 'REWARDS_005',
    message: 'Catalogue categories fetch failed',
    statusCode: 400,
  },
} as const;
