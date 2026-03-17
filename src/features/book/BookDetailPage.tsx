import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import BookCard from '@/components/BookCard';
import SectionHeading from '@/components/SectionHeading';
import { useAuth } from '@/features/auth/AuthContext';
import { getBook, getBookReviews, getRelatedBooks } from '@/features/book/book-api';
import { addCartItem } from '@/features/cart/cart-api';
import { useWishlist } from '@/features/wishlist/useWishlist';
import { formatCurrency, formatDate } from '@/lib/format';

function BookDetailPage() {
  const { bookId = '' } = useParams();
  const { isAuthenticated } = useAuth();
  const { wishlistIds, pendingBookId, toggleWishlist } = useWishlist();

  const { data: book } = useSuspenseQuery({ queryKey: ['book', bookId], queryFn: () => getBook(bookId) });
  const { data: relatedBooks } = useSuspenseQuery({ queryKey: ['book', bookId, 'related'], queryFn: () => getRelatedBooks(bookId) });
  const { data: reviews } = useSuspenseQuery({ queryKey: ['book', bookId, 'reviews'], queryFn: () => getBookReviews(bookId) });

  const addToCartMutation = useMutation({
    mutationFn: () => addCartItem({ bookId: book.id, quantity: 1 }),
  });

  const isWishlisted = wishlistIds.has(book.id);

  return (
    <div className="page-stack">
      <section className="detail-hero">
        <div className="detail-cover">
          {book.coverImage ? <img alt={book.title} src={book.coverImage} /> : <span>{book.title.slice(0, 1)}</span>}
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{book.category?.name ?? 'Book detail'}</p>
          <h1>{book.title}</h1>
          <p>{book.description ?? 'This book does not have a long description yet, which is a useful empty-state to keep in mind for future CMS work.'}</p>
          <div className="detail-meta-grid">
            <div><span>Author</span><strong>{book.author?.name ?? 'Unknown'}</strong></div>
            <div><span>Publisher</span><strong>{book.publisher?.name ?? 'Unknown'}</strong></div>
            <div><span>Price</span><strong>{formatCurrency(book.price)}</strong></div>
            <div><span>Stock</span><strong>{book.stockQuantity ?? 0}</strong></div>
          </div>
          <div className="action-row">
            {isAuthenticated ? (
              <>
                <button className="button button-primary" onClick={() => addToCartMutation.mutate()} type="button">
                  {addToCartMutation.isPending ? 'Adding...' : 'Add to cart'}
                </button>
                <button className="button button-secondary" disabled={pendingBookId === book.id} onClick={() => void toggleWishlist(book.id)} type="button">
                  {pendingBookId === book.id ? 'Updating...' : isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                </button>
              </>
            ) : (
              <Link className="button button-primary" to="/login">
                Sign in to buy
              </Link>
            )}
            <Link className="button button-secondary" to="/catalog">
              Back to catalog
            </Link>
          </div>
        </div>
      </section>

      <section className="page-stack">
        <SectionHeading eyebrow="Reader notes" title="Public reviews already attached to completed orders" />
        <div className="review-stack">
          {reviews.length === 0 ? (
            <article className="feedback-card">
              <h3>No reviews yet</h3>
              <p>This is still a valid state and helps the frontend handle fresh catalog entries gracefully.</p>
            </article>
          ) : reviews.map((review) => (
            <article key={review.id} className="review-card">
              <div className="review-card-header">
                <div>
                  <strong>{review.user.fullName}</strong>
                  <p>{formatDate(review.createdAt)}</p>
                </div>
                <span>{'★'.repeat(review.rating)}</span>
              </div>
              <p>{review.comment ?? 'No written comment provided.'}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-stack">
        <SectionHeading eyebrow="Related" title="Cross-sell strip" />
        <div className="book-grid">
          {relatedBooks.map((item) => (
            <BookCard
              key={item.id}
              accent="ink"
              actions={isAuthenticated ? (
                <button
                  className="text-link"
                  disabled={pendingBookId === item.id}
                  onClick={() => void toggleWishlist(item.id)}
                  type="button"
                >
                  {pendingBookId === item.id ? 'Updating...' : wishlistIds.has(item.id) ? 'Saved' : 'Save'}
                </button>
              ) : undefined}
              book={item}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default BookDetailPage;
