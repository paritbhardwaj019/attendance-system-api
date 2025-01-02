const dotenv = require('dotenv');
const path = require('path');
const Joi = require('joi');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const envVarsSchema = Joi.object()
  .keys({
    NODE_ENV: Joi.string().valid('production', 'development', 'test').required(),
    PORT: Joi.number().default(3000),
    JWT_SECRET: Joi.string().required().description('JWT secret key'),
    REFRESH_TOKEN_SECRET: Joi.string().required().description('Refresh token secret'),
    FRONTEND_URL: Joi.string().required().description('Frontend URL'),
    DIGEST_AUTH_USERNAME: Joi.string().required().description('Digest auth username'),
    DIGEST_AUTH_PASSWORD: Joi.string().required().description('Digest auth password'),
  })
  .unknown();

const { value: envVars, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

module.exports = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  jwt: {
    secret: envVars.JWT_SECRET,
    refreshTokenSecret: envVars.REFRESH_TOKEN_SECRET,
  },
  frontendUrl: envVars.FRONTEND_URL,
  digestAuth: {
    username: envVars.DIGEST_AUTH_USERNAME,
    password: envVars.DIGEST_AUTH_PASSWORD,
    algorithm: 'MD5',
  },
};
