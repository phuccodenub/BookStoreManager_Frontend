import clsx from 'clsx';
import { Link } from 'react-router-dom';

import { formatCurrency } from '@/lib/format';
import type { BookSummary } from '@/lib/types';

interface BookCardProps {
  book: BookSummary;
  accent?: 'sand' | 'ink';
  actions?: React.ReactNode;
}

function getBadgeLabel(book: BookSummary) {
  if (book.isBestSeller) return 'Bán chạy';
  if (book.isNew) return 'Mới';
  if (book.isFeatured) return 'Nổi bật';
  return book.category?.name ?? 'Tuyển chọn';
}

function BookCard({ book, accent = 'sand', actions }: BookCardProps) {
  const badgeLabel = getBadgeLabel(book);

  return (
    <article className={clsx('book-card', `book-card-${accent}`)}>
      <Link className="book-card-media" to={`/books/${book.id}`}>
        <div className="book-card-cover">
          {book.coverImage ? <img alt={book.title} src={book.coverImage} /> : <span>{book.title.slice(0, 1)}</span>}
        </div>
        <span className="book-card-badge">{badgeLabel}</span>
      </Link>

      <div className="book-card-body">
        <div className="book-card-topline">
          <p className="book-card-category">{book.author?.name ?? 'Tác giả đang cập nhật'}</p>
          {actions ? <div className="book-card-actions">{actions}</div> : null}
        </div>

        <div className="book-card-copy">
          <h3>
            <Link to={`/books/${book.id}`}>{book.title}</Link>
          </h3>
          <p className="book-card-meta">
            {book.publisher?.name ?? book.category?.name ?? 'An pham danh cho ban doc yeu sach'}
          </p>
        </div>

        <div className="book-card-footer">
          <div className="book-card-price-group">
            <strong>{formatCurrency(book.price)}</strong>
            <span>{book.stockQuantity !== undefined ? `Còn ${book.stockQuantity} cuốn` : 'Sản phẩm có sẵn'}</span>
          </div>
          <Link className="button button-quiet button-card" to={`/books/${book.id}`}>
            Xem chi tiết
          </Link>
        </div>
      </div>
    </article>
  );
}

export default BookCard;
