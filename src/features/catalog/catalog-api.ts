import { apiRequest } from '@/lib/api-client';
import type { BookSummary, MetadataCatalog, OptionItem, PaginationMeta } from '@/lib/types';

export interface BookListQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  authorId?: string;
  publisherId?: string;
  sortBy?: string;
  isNew?: boolean;
  isBestSeller?: boolean;
}

export async function getBooks(query: BookListQuery) {
  const response = await apiRequest<BookSummary[]>('/api/books', {
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 12,
      search: query.search,
      categoryId: query.categoryId,
      authorId: query.authorId,
      publisherId: query.publisherId,
      sortBy: query.sortBy,
      isNew: query.isNew,
      isBestSeller: query.isBestSeller,
    },
  });

  return {
    items: response.data,
    meta: response.meta as PaginationMeta,
  };
}

export async function getCategories() {
  const { data } = await apiRequest<OptionItem[]>('/api/categories', {
    query: { page: 1, limit: 100 },
  });
  return data;
}

export async function getAuthors() {
  const { data } = await apiRequest<OptionItem[]>('/api/authors', {
    query: { page: 1, limit: 100 },
  });
  return data;
}

export async function getPublishers() {
  const { data } = await apiRequest<OptionItem[]>('/api/publishers', {
    query: { page: 1, limit: 100 },
  });
  return data;
}

export async function getMetadata() {
  const { data } = await apiRequest<MetadataCatalog>('/api/metadata/enums');
  return data;
}
