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
    query: { page: 1, limit: 50 },
  });
  return data;
}

export async function createBookReview(
  bookId: string,
  payload: { orderId: string; rating: number; comment?: string },
) {
  const { data } = await apiRequest<Review>(`/api/books/${bookId}/reviews`, {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function updateBookReview(
  reviewId: string,
  payload: { rating?: number; comment?: string },
) {
  const { data } = await apiRequest<Review>(`/api/reviews/${reviewId}`, {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}

export async function deleteBookReview(reviewId: string) {
  await apiRequest(`/api/reviews/${reviewId}`, {
    auth: true,
    method: 'DELETE',
  });
}
