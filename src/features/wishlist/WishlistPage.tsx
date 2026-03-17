import { useMutation, useQueryClient } from '@tanstack/react-query';

import BookCard from '@/components/BookCard';
import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import { addCartItem } from '@/features/cart/cart-api';
import { useWishlist } from '@/features/wishlist/useWishlist';

function WishlistPage() {
  const queryClient = useQueryClient();
  const { items, pendingBookId, errorMessage, toggleWishlist } = useWishlist();

  const addToCartMutation = useMutation({
    mutationFn: (bookId: string) => addCartItem({ bookId, quantity: 1 }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Wishlist"
        title="Saved books ready for later checkout"
        description="This page is intentionally utilitarian: it validates the wishlist contract and gives the future UI a real stateful shell to build on top of."
      />

      {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}

      {items.length === 0 ? (
        <EmptyState
          title="Wishlist is empty"
          description="Save books from the catalog or detail page to keep a personal shortlist here."
        />
      ) : (
        <div className="book-grid">
          {items.map((item) => (
            <BookCard
              key={item.id}
              actions={
                <>
                  <button
                    className="text-link"
                    disabled={addToCartMutation.isPending && addToCartMutation.variables === item.book.id}
                    onClick={() => addToCartMutation.mutate(item.book.id)}
                    type="button"
                  >
                    {addToCartMutation.isPending && addToCartMutation.variables === item.book.id ? 'Adding...' : 'Move to cart'}
                  </button>
                  <button
                    className="text-link"
                    disabled={pendingBookId === item.book.id}
                    onClick={() => void toggleWishlist(item.book.id)}
                    type="button"
                  >
                    {pendingBookId === item.book.id ? 'Updating...' : 'Remove'}
                  </button>
                </>
              }
              book={item.book}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default WishlistPage;
