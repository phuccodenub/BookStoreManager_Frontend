import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthContext';
import { addWishlistItem, getWishlist, removeWishlistItem } from '@/features/wishlist/wishlist-api';

const WISHLIST_QUERY_KEY = ['wishlist', 'mine'] as const;

export function useWishlist() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const wishlistQuery = useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: async () => {
      const result = await getWishlist();
      return result.items;
    },
    enabled: isAuthenticated,
  });

  const wishlistIds = useMemo(() => {
    return new Set((wishlistQuery.data ?? []).map((item) => item.book.id));
  }, [wishlistQuery.data]);

  const toggleMutation = useMutation({
    mutationFn: async ({ bookId, isActive }: { bookId: string; isActive: boolean }) => {
      if (isActive) {
        await removeWishlistItem(bookId);
        return 'removed' as const;
      }

      await addWishlistItem(bookId);
      return 'added' as const;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
    },
  });

  return {
    items: wishlistQuery.data ?? [],
    wishlistIds,
    isAuthenticated,
    isLoading: wishlistQuery.isLoading,
    pendingBookId: toggleMutation.isPending ? toggleMutation.variables?.bookId ?? null : null,
    errorMessage: toggleMutation.error instanceof Error ? toggleMutation.error.message : null,
    toggleWishlist: async (bookId: string) => toggleMutation.mutateAsync({ bookId, isActive: wishlistIds.has(bookId) }),
  };
}
