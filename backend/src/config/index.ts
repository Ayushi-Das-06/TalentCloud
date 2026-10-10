import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root or workspace root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const developmentJwtSecret = 'development_super_secret_jwt_key_at_least_32_chars';
const developmentCookieSecret = 'development_cookie_secret_key_12345';
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : developmentJwtSecret);
const cookieSecret = process.env.COOKIE_SECRET || (isProduction ? '' : developmentCookieSecret);
const queueDriver = process.env.QUEUE_DRIVER || 'memory';
const storageDriver = process.env.STORAGE_DRIVER || 'local';
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
const matchingWeights = {
  skill: parseInt(process.env.MATCH_WEIGHT_SKILL || '40', 10),
  experience: parseInt(process.env.MATCH_WEIGHT_EXPERIENCE || '20', 10),
  performance: parseInt(process.env.MATCH_WEIGHT_PERFORMANCE || '15', 10),
  rating: parseInt(process.env.MATCH_WEIGHT_RATING || '10', 10),
  availability: parseInt(process.env.MATCH_WEIGHT_AVAILABILITY || '10', 10),
  budget: parseInt(process.env.MATCH_WEIGHT_BUDGET || '5', 10),
};

if (!['memory', 'bullmq', 'sqs'].includes(queueDriver)) {
  throw new Error('QUEUE_DRIVER must be memory, bullmq, or sqs.');
}
if (!['local', 's3'].includes(storageDriver)) {
  throw new Error('STORAGE_DRIVER must be local or s3.');
}
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 5) {
  throw new Error('TRUST_PROXY_HOPS must be an integer from 0 to 5.');
}
if (Object.values(matchingWeights).some((weight) => !Number.isInteger(weight) || weight < 0 || weight > 100)) {
  throw new Error('Matching weights must be whole numbers from 0 to 100.');
}
if (Object.values(matchingWeights).reduce((total, weight) => total + weight, 0) !== 100) {
  throw new Error('Matching weights must sum to 100.');
}

if (isProduction && (
  jwtSecret.length < 32 ||
  cookieSecret.length < 32 ||
  jwtSecret === developmentJwtSecret ||
  cookieSecret === developmentCookieSecret
)) {
  throw new Error('Production requires unique JWT_SECRET and COOKIE_SECRET values of at least 32 characters; development defaults are not allowed.');
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  databaseProvider: (process.env.DATABASE_URL || '').startsWith('file:') ? 'SQLite' : 'PostgreSQL',
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  trustProxyHops,
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cookieSecret,
  queue: {
    driver: queueDriver as 'memory' | 'bullmq' | 'sqs',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    },
    sqs: {
      region: process.env.SQS_REGION || process.env.AWS_REGION || 'us-east-1',
      queueUrl: process.env.SQS_QUEUE_URL,
      endpoint: process.env.SQS_ENDPOINT,
    },
  },
  storage: {
    driver: storageDriver as 'local' | 's3',
    localPath: process.env.STORAGE_LOCAL_PATH || path.resolve(process.cwd(), 'uploads'),
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET_NAME || 'freelance-marketplace-files',
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  },
  matchingWeights,
};
