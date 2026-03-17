import { Link } from 'react-router-dom';

import { formatCurrency } from '@/lib/format';
import type { BookSummary } from '@/lib/types';

interface BookCardProps {
  book: BookSummary;
  accent?: 'sand' | 'ink';
  actions?: React.ReactNode;
}

function BookCard({ book, accent = 'sand', actions }: BookCardProps) {
  return (
    <article className={`book-card book-card-${accent}`}>
      <div className="book-card-cover">
        {book.coverImage ? <img alt={book.title} src={book.coverImage} /> : <span>{book.title.slice(0, 1)}</span>}
      </div>
      <div className="book-card-body">
        <p className="book-card-category">{book.category?.name ?? 'Curated pick'}</p>
        <h3>{book.title}</h3>
        <p className="book-card-meta">{book.author?.name ?? 'Unknown author'}</p>
        <div className="book-card-footer">
          <strong>{formatCurrency(book.price)}</strong>
          <div className="inline-actions">
            {actions}
            <Link className="text-link" to={`/books/${book.id}`}>
              View detail
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default BookCard;
