import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function getPagination(query: { page?: unknown; limit?: unknown }) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 20);
  return { page, limit, skip: (page - 1) * limit };
}
