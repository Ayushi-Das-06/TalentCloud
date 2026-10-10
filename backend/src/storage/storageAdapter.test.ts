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
});
