import { Request } from 'express';
import { DEFAULT_PAGE_LIMIT, PaginationQuery } from '../schemas/pagination.schema';

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function getPrismaPaginationArgs(cursor: string | undefined, limit: number) {
  const pageSize = Math.max(1, Number(limit) || DEFAULT_PAGE_LIMIT);

  return {
    take: pageSize + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  };
}

export function buildPaginatedResult<T extends { id: string }>(
  rows: T[],
  limit: number
): PaginatedResult<T> {
  const pageSize = Math.max(1, Number(limit) || DEFAULT_PAGE_LIMIT);
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;
  return { items, nextCursor, hasMore };
}

export function getPaginationFromRequest(req: Request): PaginationQuery {
  const query = req.query as Partial<PaginationQuery>;
  const limit = query.limit != null ? Number(query.limit) : DEFAULT_PAGE_LIMIT;

  return {
    cursor: query.cursor,
    limit: Number.isFinite(limit) ? limit : DEFAULT_PAGE_LIMIT,
  };
}
