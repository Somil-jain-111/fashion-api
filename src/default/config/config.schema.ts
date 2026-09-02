import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // General Config
  PORT: Joi.number().default(4002),
  CORS_ALLOWED_ORIGINS: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(1).required(),
    otherwise: Joi.string().allow('').default(''),
  }),
  PAYLOAD_LIMIT: Joi.string()
    .pattern(/^\d+(kb|mb)$/i)
    .default('1mb'),

  NODE_ENV: Joi.string().valid('development', 'production', 'test', 'uat', 'preprod').required(),

  API_VERSION: Joi.number().required(),
  API_KEY: Joi.string().required(),
  API_SECRET: Joi.string().required(),

  // MySQL Config
  DB_TYPE: Joi.string().valid('mysql', 'postgres').default('mysql'),
  MYSQL_HOST: Joi.string().optional(),
  MYSQL_PORT: Joi.number().default(3306),
  MYSQL_USERNAME: Joi.string().optional(),
  MYSQL_PASSWORD: Joi.string().allow('').optional(),
  MYSQL_DATABASE: Joi.string().optional(),

  // PostgreSQL Config
  POSTGRES_HOST: Joi.string().optional(),
  POSTGRES_PORT: Joi.number().default(5432),
  POSTGRES_USERNAME: Joi.string().optional(),
  POSTGRES_PASSWORD: Joi.string().optional(),
  POSTGRES_DATABASE: Joi.string().optional(),

  // JWT Config
  JWT_ACCESS_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required().invalid(Joi.ref('API_SECRET')),
    otherwise: Joi.string().min(16).optional(),
  }),
  JWT_REFRESH_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .min(32)
      .required()
      .invalid(Joi.ref('API_SECRET'), Joi.ref('JWT_ACCESS_SECRET')),
    otherwise: Joi.string().min(16).optional(),
  }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  API_REFRESH_SECRET: Joi.string().optional(),
  KYC_ENCRYPTION_SECRET_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(16).required(),
  }),
  // Read-only compatibility for records written by the former CBC implementation.
  KYC_ENCRYPTION_FIXED_IV: Joi.string().hex().length(32).optional(),

  // MongoDB Config
  MONGO_HOST: Joi.string().optional(),
  // MONGO_PORT: Joi.number().default(27017),
  MONGO_USERNAME: Joi.string().optional(),
  MONGO_PASSWORD: Joi.string().optional(),
  MONGO_DATABASE: Joi.string().optional(),

  // Redis Config
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_TTL: Joi.number().default(5), // minutes

  // Sponsored product boosts
  BOOST_PRICE_PER_DAY: Joi.number().positive().default(100),
  BOOST_CATEGORY_PRICE_MULTIPLIER: Joi.number().min(1).default(2),
  BOOST_PAYMENT_WEBHOOK_SECRET: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(16).default('local-boost-webhook-secret'),
  }),

  // AWS Config (Required only in production)
  AWS_REGION: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),
  AWS_ACCESS_KEY_ID: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),
  AWS_SECRET_ACCESS_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),
  AWS_S3_BUCKET_NAME: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),
  AWS_S3_BASE_URL: Joi.string().uri().optional().allow(''),
  APP_NAME: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().optional().allow(''),
  }),
  COMMUNICATION_API_URL: Joi.string()
    .uri({ scheme: ['https'] })
    .required(),
  COMMUNICATION_API_TOKEN: Joi.string().min(16).required(),
});
