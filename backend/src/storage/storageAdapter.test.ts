import { Readable } from 'stream';
import { describe, expect, it, vi } from 'vitest';
import { storageService, StorageService } from './storageAdapter.js';
import type { S3Client } from '@aws-sdk/client-s3';

describe('local file storage', () => {
  it('rejects paths that resolve outside the configured upload directory', async () => {
    await expect(storageService.getFileBuffer('../.env')).resolves.toBeNull();
    await expect(storageService.getFileBuffer('nested/../../.env')).resolves.toBeNull();
  });

  it('rejects absolute paths', async () => {
    await expect(storageService.getFileBuffer('C:\\Windows\\win.ini')).resolves.toBeNull();
  });

  it('deletes a stored file and treats an already missing file as absent', async () => {
    const saved = await storageService.saveFile(Buffer.from('temporary attachment'), 'test.txt', 'text/plain', 'test_cleanup');
    expect(await storageService.getFileBuffer(saved.fileKey)).toEqual(Buffer.from('temporary attachment'));
    await expect(storageService.deleteFile(saved.fileKey)).resolves.toBe(true);
    await expect(storageService.getFileBuffer(saved.fileKey)).resolves.toBeNull();
    await expect(storageService.deleteFile(saved.fileKey)).resolves.toBe(false);
  });
});

describe('S3-compatible file storage', () => {
  it('uploads, streams, buffers, and deletes an object through S3 commands', async () => {
    const payload = Buffer.from('private attachment contents');
    const commands: Array<{ name: string; input: Record<string, unknown> }> = [];
    const body = Object.assign(Readable.from([payload]), {
      transformToByteArray: async () => Uint8Array.from(payload),
    });
    const client = {
      send: vi.fn(async (command: { constructor: { name: string }; input: Record<string, unknown> }) => {
        commands.push({ name: command.constructor.name, input: command.input });
        if (command.constructor.name === 'GetObjectCommand') {
          return { Body: body, ContentLength: payload.length, ContentType: 'text/plain' };
        }
        return {};
      }),
    } as unknown as S3Client;
    const service = new StorageService({
      driver: 's3',
      localPath: './unused',
      s3: { endpoint: 'http://object-storage:9000', region: 'us-east-1', bucket: 'talentcloud-files', accessKeyId: 'test-access', secretAccessKey: 'test-secret' },
    }, client);

    const saved = await service.saveFile(payload, 'attachment.txt', 'text/plain', 'projects');
    expect(saved.fileKey).toMatch(/^projects\/[\w-]+\.txt$/);
    expect(saved.fileSize).toBe(payload.length);

    const file = await service.getFileStream(saved.fileKey);
    expect(file?.mimeType).toBe('text/plain');
    expect(file?.size).toBe(payload.length);
    const streamed: Buffer[] = [];
    for await (const chunk of file!.stream) streamed.push(Buffer.from(chunk));
    expect(Buffer.concat(streamed)).toEqual(payload);
    await expect(service.getFileBuffer(saved.fileKey)).resolves.toEqual(payload);
    await expect(service.deleteFile(saved.fileKey)).resolves.toBe(true);
    await expect(service.getFileBuffer('../outside.txt')).resolves.toBeNull();

    expect(commands.map(({ name }) => name)).toEqual([
      'PutObjectCommand', 'GetObjectCommand', 'GetObjectCommand', 'DeleteObjectCommand',
    ]);
    expect(commands.every(({ input }) => input.Bucket === 'talentcloud-files')).toBe(true);
  });
});
