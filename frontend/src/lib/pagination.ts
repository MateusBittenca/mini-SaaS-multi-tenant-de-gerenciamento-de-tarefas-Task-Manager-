import api from './api';
import type { PaginatedResponse } from './types';

export async function fetchAllPages<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;

  do {
    const { data: res } = await api.get<{ data: PaginatedResponse<T> }>(path, {
      params: {
        ...params,
        ...(cursor ? { cursor } : {}),
        limit: 100,
      },
    });

    all.push(...res.data.items);
    cursor = res.data.nextCursor ?? undefined;
    if (!res.data.hasMore) break;
  } while (cursor);

  return all;
}

export async function fetchPage<T>(
  path: string,
  options?: {
    cursor?: string;
    limit?: number;
    params?: Record<string, string | number | boolean | undefined>;
  }
): Promise<PaginatedResponse<T>> {
  const { data: res } = await api.get<{ data: PaginatedResponse<T> }>(path, {
    params: {
      ...options?.params,
      ...(options?.cursor ? { cursor: options.cursor } : {}),
      ...(options?.limit ? { limit: options.limit } : {}),
    },
  });
  return res.data;
}
