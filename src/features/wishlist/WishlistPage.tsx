import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import BookCard from '@/components/BookCard';
import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import { addCartItem } from '@/features/cart/cart-api';
import { formatCurrency } from '@/lib/format';
import { useWishlist } from '@/features/wishlist/useWishlist';

function WishlistPage() {
  const queryClient = useQueryClient();
  const { items, pendingBookId, errorMessage, toggleWishlist } = useWishlist();
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const addToCartMutation = useMutation({
    mutationFn: (bookId: string) => addCartItem({ bookId, quantity: 1 }),
    onSuccess: async (_, bookId) => {
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      const savedBook = items.find((item) => item.book.id === bookId)?.book.title ?? 'Tựa sách đã chọn';
      setActionMessage(`Đã thêm "${savedBook}" vào giỏ hàng.`);
    },
  });

  const wishlistValue = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.book.price), 0),
    [items],
  );
  const stockWatchCount = useMemo(
    () => items.filter((item) => item.book.stockQuantity !== undefined && item.book.stockQuantity <= 3).length,
    [items],
  );

  return (
    <div className="page-stack wishlist-shell">
      <section className="wishlist-hero">
        <div>
          <SectionHeading
            eyebrow="Danh sách yêu thích"
            title="Kệ sách mà bạn muốn quay lại sau"
            description="Lưu lại những tựa sách bạn quan tâm để so sánh, cân nhắc và đưa vào giỏ hàng khi sẵn sàng."
          />
        </div>

        <div className="summary-tile-grid">
          <article className="summary-tile">
            <span>Tựa sách đã lưu</span>
            <strong>{items.length}</strong>
          </article>
          <article className="summary-tile">
            <span>Tổng giá trị tham khảo</span>
            <strong>{formatCurrency(wishlistValue)}</strong>
          </article>
          <article className="summary-tile">
            <span>Cần quyết định sớm</span>
            <strong>{stockWatchCount}</strong>
          </article>
          <article className="summary-tile">
            <span>Điều hướng nhanh</span>
            <strong>Giỏ hàng / Danh mục</strong>
          </article>
        </div>
      </section>

      {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
      {actionMessage ? <p className="feedback-text feedback-text-success">{actionMessage}</p> : null}

      {items.length === 0 ? (
        <EmptyState
          eyebrow="Danh sách trống"
          title="Bạn chưa lưu tựa sách nào"
          description="Hãy lưu sách từ trang chủ, danh mục hoặc trang chi tiết để quay lại xem sau."
        >
          <Link className="button button-primary" to="/catalog">
            Khám phá danh mục
          </Link>
        </EmptyState>
      ) : (
        <section className="page-stack">
          <div className="shelf-header">
            <SectionHeading
              eyebrow="Sách đã lưu"
              title="Chọn sách để đưa vào giỏ hàng bất cứ lúc nào"
              description="Bạn có thể thêm nhanh từng tựa sách vào giỏ hoặc bỏ lưu nếu không còn nhu cầu."
            />
            <Link className="text-link" to="/cart">
              Mở giỏ hàng
            </Link>
          </div>

          <div className="book-grid book-grid-featured">
            {items.map((item) => (
              <BookCard
                key={item.id}
                actions={
                  <div className="wishlist-actions">
                    <button
                      className="text-link"
                      disabled={addToCartMutation.isPending && addToCartMutation.variables === item.book.id}
                      onClick={() => addToCartMutation.mutate(item.book.id)}
                      type="button"
                    >
                      {addToCartMutation.isPending && addToCartMutation.variables === item.book.id ? 'Đang thêm' : 'Thêm vào giỏ'}
                    </button>
                    <button
                      className="text-link"
                      disabled={pendingBookId === item.book.id}
                      onClick={() => void toggleWishlist(item.book.id)}
                      type="button"
                    >
                      {pendingBookId === item.book.id ? 'Đang cập nhật' : 'Bỏ lưu'}
                    </button>
                  </div>
                }
                book={item.book}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default WishlistPage;

