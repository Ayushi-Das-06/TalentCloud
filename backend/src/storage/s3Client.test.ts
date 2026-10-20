import { CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { describe, expect, it, vi } from 'vitest';
import { createS3ClientOptions, ensureS3Bucket } from './s3Client.js';

describe('S3 client configuration', () => {
  it('enables path-style requests for endpoint-based S3 services and uses matching credentials', () => {
    expect(createS3ClientOptions({
      endpoint: 'http://object-storage:9000',
      region: 'us-east-1',
      bucket: 'talentcloud-files',
      accessKeyId: 'local-access',
      secretAccessKey: 'local-secret',
    })).toMatchObject({
      endpoint: 'http://object-storage:9000',
      forcePathStyle: true,
      credentials: { accessKeyId: 'local-access', secretAccessKey: 'local-secret' },
    });
  });

  it('rejects a partial static credential pair', () => {
    expect(() => createS3ClientOptions({ region: 'us-east-1', bucket: 'talentcloud-files', accessKeyId: 'only-one' }))
      .toThrow(/Set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY/i);
  });
});

describe('S3 bucket initialization', () => {
  it('creates a missing bucket and leaves an existing bucket untouched', async () => {
    const missing = Object.assign(new Error('missing bucket'), { name: 'NotFound', $metadata: { httpStatusCode: 404 } });
    const send = vi.fn().mockRejectedValueOnce(missing).mockResolvedValueOnce({});
    await ensureS3Bucket({ send } as never, 'talentcloud-files');
    expect(send.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
    expect(send.mock.calls[1][0]).toBeInstanceOf(CreateBucketCommand);
    expect(send.mock.calls[1][0].input.Bucket).toBe('talentcloud-files');

    const existingSend = vi.fn().mockResolvedValue({});
    await ensureS3Bucket({ send: existingSend } as never, 'talentcloud-files');
    expect(existingSend).toHaveBeenCalledTimes(1);
    expect(existingSend.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand);
  });

  it('does not treat an authorization failure as a missing bucket', async () => {
    const denied = Object.assign(new Error('forbidden'), { name: 'Forbidden', $metadata: { httpStatusCode: 403 } });
    const send = vi.fn().mockRejectedValue(denied);
    await expect(ensureS3Bucket({ send } as never, 'talentcloud-files')).rejects.toBe(denied);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
