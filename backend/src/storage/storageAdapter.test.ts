import { describe, expect, it } from 'vitest';
import { storageService } from './storageAdapter.js';

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
