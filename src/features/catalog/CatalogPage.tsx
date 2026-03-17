import { useDeferredValue, useMemo, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';

import BookCard from '@/components/BookCard';
import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import { useAuth } from '@/features/auth/AuthContext';
import { getAuthors, getBooks, getCategories, getMetadata, getPublishers } from '@/features/catalog/catalog-api';
import { useWishlist } from '@/features/wishlist/useWishlist';

function CatalogPage() {
  const { isAuthenticated } = useAuth();
  const { wishlistIds, pendingBookId, toggleWishlist } = useWishlist();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [categoryId, setCategoryId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [publisherId, setPublisherId] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const query = useMemo(() => ({
    page: 1,
    limit: 12,
    search: deferredSearch || undefined,
    categoryId: categoryId || undefined,
    authorId: authorId || undefined,
    publisherId: publisherId || undefined,
    sortBy,
  }), [authorId, categoryId, deferredSearch, publisherId, sortBy]);

  const { data: books } = useSuspenseQuery({
    queryKey: ['books', query],
    queryFn: () => getBooks(query),
  });
  const { data: categories } = useSuspenseQuery({ queryKey: ['catalog', 'categories'], queryFn: getCategories });
  const { data: authors } = useSuspenseQuery({ queryKey: ['catalog', 'authors'], queryFn: getAuthors });
  const { data: publishers } = useSuspenseQuery({ queryKey: ['catalog', 'publishers'], queryFn: getPublishers });
  const { data: metadata } = useSuspenseQuery({ queryKey: ['metadata'], queryFn: getMetadata });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Catalog"
        title="Search, filter, and learn the API surface while building"
        description="This page already exercises books, categories, authors, publishers, and metadata endpoints together."
      />

      <section className="filter-board">
        <label className="field field-wide">
          <span>Search books or ISBN</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try 'Sapiens' or 'Clean Code'" />
        </label>
        <label className="field">
          <span>Category</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Author</span>
          <select value={authorId} onChange={(event) => setAuthorId(event.target.value)}>
            <option value="">All authors</option>
            {authors.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Publisher</span>
          <select value={publisherId} onChange={(event) => setPublisherId(event.target.value)}>
            <option value="">All publishers</option>
            {publishers.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sort by</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {metadata.bookSortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </section>

      {books.items.length === 0 ? (
        <EmptyState
          title="No books matched this filter set"
          description="That is still useful during frontend development because it tells us the filter contract is working and the empty state is designed."
        />
      ) : (
        <>
          <div className="section-heading compact-heading">
            <p className="eyebrow">Result set</p>
            <h2>{books.meta.total} books surfaced from the backend</h2>
            <p>Currently showing the first {books.items.length} records from page {books.meta.page}.</p>
          </div>
          <div className="book-grid">
            {books.items.map((book) => (
              <BookCard
                key={book.id}
                actions={isAuthenticated ? (
                  <button
                    className="text-link"
                    disabled={pendingBookId === book.id}
                    onClick={() => void toggleWishlist(book.id)}
                    type="button"
                  >
                    {pendingBookId === book.id ? 'Updating...' : wishlistIds.has(book.id) ? 'Saved' : 'Save'}
                  </button>
                ) : undefined}
                book={book}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default CatalogPage;
