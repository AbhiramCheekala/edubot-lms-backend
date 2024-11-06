import dotenv from 'dotenv';
import Joi from 'joi';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const envVarsSchema = Joi.object()
  .keys({
    DATABASE_URL: Joi.string().description('Database URL'),
    EDUBOT_LMS_UI_BASE_URL: Joi.string().description('Base URL for the LMS UI'),
    NODE_ENV: Joi.string().valid('production', 'development', 'test'),
    PORT: Joi.number().default(3000),
    JWT_SECRET: Joi.string().description('JWT secret key'),
    JWT_ACCESS_EXPIRATION_MINUTES: Joi.number()
      .default(30)
      .description('minutes after which access tokens expire'),
    JWT_REFRESH_EXPIRATION_DAYS: Joi.number()
      .default(30)
      .description('days after which refresh tokens expire'),
    JWT_RESET_PASSWORD_EXPIRATION_HOURS: Joi.number()
      .default(10)
      .description('Hours after which reset password token expires'),
    JWT_VERIFY_EMAIL_EXPIRATION_DAYS: Joi.number()
      .default(10)
      .description('Days after which verify email token expires'),
    JWT_VERIFY_ACCOUNT_THRESHOLD_COUNT: Joi.number()
      .default(3)
      .description(
        'Max number of verify account attempts in JWT_VERIFY_ACCOUNT_THRESHOLD_DAYS days'
      ),
    JWT_VERIFY_ACCOUNT_THRESHOLD_DAYS: Joi.number()
      .default(7)
      .description('Days after which verify account attempts are counted'),
    JWT_RESET_PASSWORD_THRESHOLD_COUNT: Joi.number()
      .default(3)
      .description(
        'Max number of reset password attempts in JWT_RESET_PASSWORD_THRESHOLD_DAYS days'
      ),
    JWT_RESET_PASSWORD_THRESHOLD_DAYS: Joi.number()
      .default(7)
      .description('Days after which reset password attempts are counted'),
    JWT_ALL_MAX_AGE_DAYS: Joi.number().default(7).description('Max age of JWT tokens'),
    AZURE_STORAGE_CONNECTION_STRING: Joi.string().description('Azure storage connection string'),
    AZURE_EMAIL_SERVICE_CONNECTION_STRING: Joi.string().description(
      'Azure email service connection string'
    ),
    AZURE_EMAIL_SENDER_ADDRESS: Joi.string().description('Azure email sender address')
  })
  .unknown();

const { value: envVars, error } = envVarsSchema
  .prefs({ errors: { label: 'key' } })
  .validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

export default {
  databaseUrl: envVars.DATABASE_URL ?? '',
  env: envVars.NODE_ENV ?? 'development',
  edubotLmsUiBaseUrl: envVars.EDUBOT_LMS_UI_BASE_URL,
  port: envVars.PORT ?? '3000',
  jwt: {
    secret: envVars.JWT_SECRET ?? 'sample-jwt-secret',
    accessExpirationMinutes: envVars.JWT_ACCESS_EXPIRATION_MINUTES,
    refreshExpirationDays: envVars.JWT_REFRESH_EXPIRATION_DAYS,
    resetPasswordExpirationHours: envVars.JWT_RESET_PASSWORD_EXPIRATION_HOURS,
    verifyEmailExpirationDays: envVars.JWT_VERIFY_EMAIL_EXPIRATION_DAYS,
    resetPasswordThresholdDays: envVars.JWT_RESET_PASSWORD_THRESHOLD_DAYS,
    resetPasswordThresholdCount: envVars.JWT_RESET_PASSWORD_THRESHOLD_COUNT,
    verifyAccountThresholdDays: envVars.JWT_VERIFY_ACCOUNT_THRESHOLD_DAYS,
    verifyAccountThresholdCount: envVars.JWT_VERIFY_ACCOUNT_THRESHOLD_COUNT,
    maxAgeDays: envVars.JWT_ALL_MAX_AGE_DAYS
  },
  azure: {
    storageAccounts: {
      edubotprod: envVars.AZURE_STORAGE_CONNECTION_STRING,
      edubotprodpublicassets: envVars.AZURE_PUBLIC_STORAGE_CONNECTION_STRING,
      edubotdev: envVars.AZURE_STORAGE_CONNECTION_STRING,
      edubotdevpublicassets: envVars.AZURE_PUBLIC_STORAGE_CONNECTION_STRING
    },
    emailServiceConnectionString: envVars.AZURE_EMAIL_SERVICE_CONNECTION_STRING,
    emailSenderAddress: envVars.AZURE_EMAIL_SENDER_ADDRESS
  }
};
