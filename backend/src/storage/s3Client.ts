import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';

export interface S3StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export function createS3ClientOptions(storage: S3StorageConfig): S3ClientConfig {
  if (!!storage.accessKeyId !== !!storage.secretAccessKey) {
    throw new Error('Set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or use the AWS default credential chain.');
  }
  return {
    region: storage.region,
    endpoint: storage.endpoint,
    forcePathStyle: !!storage.endpoint,
    ...(storage.accessKeyId && storage.secretAccessKey
      ? { credentials: { accessKeyId: storage.accessKeyId, secretAccessKey: storage.secretAccessKey } }
      : {}),
  };
}

export function createS3Client(storage: S3StorageConfig): S3Client {
  return new S3Client(createS3ClientOptions(storage));
}

export async function ensureS3Bucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (error) {
    const statusCode = error && typeof error === 'object' && '$metadata' in error
      ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
      : undefined;
    const name = error && typeof error === 'object' && 'name' in error
      ? (error as { name?: string }).name
      : undefined;
    if (statusCode !== 404 && name !== 'NotFound' && name !== 'NoSuchBucket') throw error;
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    } catch (createError) {
      const createName = createError && typeof createError === 'object' && 'name' in createError
        ? (createError as { name?: string }).name
        : undefined;
      if (createName !== 'BucketAlreadyOwnedByYou') throw createError;
    }
  }
}
