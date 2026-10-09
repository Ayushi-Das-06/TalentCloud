import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend root or workspace root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  jwt: {
    secret: process.env.JWT_SECRET || 'development_super_secret_jwt_key_at_least_32_chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  cookieSecret: process.env.COOKIE_SECRET || 'development_cookie_secret_key_12345',
  queue: {
    driver: (process.env.QUEUE_DRIVER || 'memory') as 'memory' | 'bullmq' | 'sqs',
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD || undefined,
    },
  },
  storage: {
    driver: (process.env.STORAGE_DRIVER || 'local') as 'local' | 's3',
    localPath: process.env.STORAGE_LOCAL_PATH || path.resolve(process.cwd(), 'uploads'),
    s3: {
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET_NAME || 'freelance-marketplace-files',
      accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
    },
  },
  matchingWeights: {
    skill: parseInt(process.env.MATCH_WEIGHT_SKILL || '40', 10),
    experience: parseInt(process.env.MATCH_WEIGHT_EXPERIENCE || '20', 10),
    performance: parseInt(process.env.MATCH_WEIGHT_PERFORMANCE || '15', 10),
    rating: parseInt(process.env.MATCH_WEIGHT_RATING || '10', 10),
    availability: parseInt(process.env.MATCH_WEIGHT_AVAILABILITY || '10', 10),
    budget: parseInt(process.env.MATCH_WEIGHT_BUDGET || '5', 10),
  },
};
