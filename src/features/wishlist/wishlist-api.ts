import { apiRequest } from '@/lib/api-client';
import type { PaginationMeta, WishlistItem } from '@/lib/types';

export async function getWishlist(page = 1, limit = 100) {
  const response = await apiRequest<WishlistItem[]>('/api/wishlist', {
    auth: true,
    query: { page, limit },
  });

  return {
    items: response.data,
    meta: response.meta as PaginationMeta | undefined,
  };
}

export async function addWishlistItem(bookId: string) {
  const { data } = await apiRequest(`/api/wishlist/${bookId}`, {
    auth: true,
    method: 'POST',
  });
  return data;
}

export async function removeWishlistItem(bookId: string) {
  await apiRequest(`/api/wishlist/${bookId}`, {
    auth: true,
    method: 'DELETE',
  });
}
