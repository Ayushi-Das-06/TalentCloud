import { describe, expect, it } from 'vitest';
import { getPagination, paginationQuerySchema } from './pagination.js';

describe('pagination query limits', () => {
  it('defaults to the first page and a bounded page size', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, limit: 20 });
  });

  it('accepts a supported page and page size', () => {
    expect(paginationQuerySchema.parse({ page: '3', limit: '50' })).toEqual({ page: 3, limit: 50 });
    expect(getPagination({ page: 3, limit: 50 })).toEqual({ page: 3, limit: 50, skip: 100 });
  });

  it('rejects non-integer, zero, and oversized page sizes', () => {
    for (const query of [{ page: '0' }, { page: '1.5' }, { limit: '0' }, { limit: '51' }]) {
      expect(paginationQuerySchema.safeParse(query).success).toBe(false);
    }
  });
});
