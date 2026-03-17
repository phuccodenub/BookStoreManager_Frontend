import { apiRequest } from '@/lib/api-client';
import type { BookDetail, BookSummary, Review } from '@/lib/types';

export async function getBook(bookId: string) {
  const { data } = await apiRequest<BookDetail>(`/api/books/${bookId}`);
  return data;
}

export async function getRelatedBooks(bookId: string) {
  const { data } = await apiRequest<BookSummary[]>(`/api/books/${bookId}/related`, {
    query: { limit: 4 },
  });
  return data;
}

export async function getBookReviews(bookId: string) {
  const { data } = await apiRequest<Review[]>(`/api/books/${bookId}/reviews`, {
    query: { page: 1, limit: 10 },
  });
  return data;
}
