import { config } from '../config/index.js';
import { createS3Client, ensureS3Bucket } from './s3Client.js';

const attempts = 60;
const delayMs = 2_000;

async function waitForObjectStorage(): Promise<void> {
  if (!config.storage.s3.bucket) throw new Error('S3_BUCKET_NAME is required to initialize object storage.');
  const client = createS3Client(config.storage.s3);
  let lastError: unknown;

  try {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const endpoint = config.storage.s3.endpoint || 'https://s3.amazonaws.com';
        const response = await fetch(new URL('/health/ready', endpoint));
        if (!response.ok) throw new Error(`Object storage readiness returned HTTP ${response.status}.`);
        await ensureS3Bucket(client, config.storage.s3.bucket);
        console.log(`[Storage] Bucket ${config.storage.s3.bucket} is ready.`);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  } finally {
    client.destroy();
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`Object storage did not become ready after ${attempts} attempts: ${message}`);
}

waitForObjectStorage().catch((error: unknown) => {
  console.error('[Storage] Initialization failed:', error);
  process.exitCode = 1;
});
