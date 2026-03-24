import clsx from 'clsx';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSuspenseQuery } from '@tanstack/react-query';

import BookCard from '@/components/BookCard';
import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import { useAuth } from '@/features/auth/AuthContext';
import { buildCatalogSearchParams, DEFAULT_CATALOG_FILTERS, readCatalogFilters } from '@/features/catalog/catalog-filters';
import { getAuthors, getBooks, getCategories, getMetadata, getPublishers } from '@/features/catalog/catalog-api';
import { useWishlist } from '@/features/wishlist/useWishlist';

function CatalogPage() {
  const { isAuthenticated } = useAuth();
  const { wishlistIds, pendingBookId, toggleWishlist } = useWishlist();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const initialFilters = readCatalogFilters(searchParams);
  const [search, setSearch] = useState(() => initialFilters.search);
  const [categoryId, setCategoryId] = useState(() => initialFilters.categoryId);
  const [authorId, setAuthorId] = useState(() => initialFilters.authorId);
  const [publisherId, setPublisherId] = useState(() => initialFilters.publisherId);
  const [sortBy, setSortBy] = useState(() => initialFilters.sortBy);
  const [isNew, setIsNew] = useState(() => initialFilters.isNew);
  const [isBestSeller, setIsBestSeller] = useState(() => initialFilters.isBestSeller);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const nextFilters = readCatalogFilters(searchParams);

    setSearch((current) => current === nextFilters.search ? current : nextFilters.search);
    setCategoryId((current) => current === nextFilters.categoryId ? current : nextFilters.categoryId);
    setAuthorId((current) => current === nextFilters.authorId ? current : nextFilters.authorId);
    setPublisherId((current) => current === nextFilters.publisherId ? current : nextFilters.publisherId);
    setSortBy((current) => current === nextFilters.sortBy ? current : nextFilters.sortBy);
    setIsNew((current) => current === nextFilters.isNew ? current : nextFilters.isNew);
    setIsBestSeller((current) => current === nextFilters.isBestSeller ? current : nextFilters.isBestSeller);
  }, [searchParams, searchParamsString]);

  useEffect(() => {
    const nextParams = buildCatalogSearchParams({
      search: deferredSearch,
      categoryId,
      authorId,
      publisherId,
      sortBy,
      isNew,
      isBestSeller,
    });

    const nextString = nextParams.toString();
    if (nextString !== searchParamsString) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [authorId, categoryId, deferredSearch, isBestSeller, isNew, publisherId, searchParamsString, setSearchParams, sortBy]);

  const query = useMemo(() => ({
    page: 1,
    limit: 12,
    search: deferredSearch.trim() || undefined,
    categoryId: categoryId || undefined,
    authorId: authorId || undefined,
    publisherId: publisherId || undefined,
    sortBy,
    isNew: isNew || undefined,
    isBestSeller: isBestSeller || undefined,
  }), [authorId, categoryId, deferredSearch, isBestSeller, isNew, publisherId, sortBy]);

  const { data: books } = useSuspenseQuery({
    queryKey: ['books', query],
    queryFn: () => getBooks(query),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const { data: categories } = useSuspenseQuery({ queryKey: ['catalog', 'categories'], queryFn: getCategories });
  const { data: authors } = useSuspenseQuery({ queryKey: ['catalog', 'authors'], queryFn: getAuthors });
  const { data: publishers } = useSuspenseQuery({ queryKey: ['catalog', 'publishers'], queryFn: getPublishers });
  const { data: metadata } = useSuspenseQuery({ queryKey: ['metadata'], queryFn: getMetadata });
  const activeQuickFilters = [isNew && 'Sách mới', isBestSeller && 'Bán chạy'].filter(Boolean).join(' • ');

  function resetFilters() {
    setSearch(DEFAULT_CATALOG_FILTERS.search);
    setCategoryId(DEFAULT_CATALOG_FILTERS.categoryId);
    setAuthorId(DEFAULT_CATALOG_FILTERS.authorId);
    setPublisherId(DEFAULT_CATALOG_FILTERS.publisherId);
    setSortBy(DEFAULT_CATALOG_FILTERS.sortBy);
    setIsNew(DEFAULT_CATALOG_FILTERS.isNew);
    setIsBestSeller(DEFAULT_CATALOG_FILTERS.isBestSeller);
  }

  return (
    <div className="page-stack page-stack-home">
      <section className="shelf-header">
        <SectionHeading
          eyebrow="Danh mục sách"
          title="Kệ sách được sắp xếp để bạn tìm nhanh tựa sách phù hợp"
          description={activeQuickFilters
            ? `Bạn đang xem nhóm ${activeQuickFilters.toLowerCase()} cùng với các bộ lọc tìm kiếm khác.`
            : 'Tìm sách theo tên, thể loại, tác giả, nhà xuất bản hoặc sắp xếp theo cách bạn muốn.'}
        />
        <button className="text-link" onClick={resetFilters} type="button">
          Xóa bộ lọc
        </button>
      </section>

      <section className="filter-board">
        <label className="field field-wide">
          <span>Tìm sách hoặc ISBN</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ví dụ: Sapiens, Clean Code, ISBN..." />
        </label>
        <label className="field">
          <span>Thể loại</span>
          <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Tất cả thể loại</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tác giả</span>
          <select value={authorId} onChange={(event) => setAuthorId(event.target.value)}>
            <option value="">Tất cả tác giả</option>
            {authors.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Nhà xuất bản</span>
          <select value={publisherId} onChange={(event) => setPublisherId(event.target.value)}>
            <option value="">Tất cả nhà xuất bản</option>
            {publishers.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Sắp xếp</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {metadata.bookSortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="chip-row">
        <button
          className={clsx('button', isNew ? 'button-primary' : 'button-secondary')}
          onClick={() => setIsNew((current) => !current)}
          type="button"
        >
          {isNew ? 'Đang lọc sách mới' : 'Sách mới'}
        </button>
        <button
          className={clsx('button', isBestSeller ? 'button-primary' : 'button-secondary')}
          onClick={() => setIsBestSeller((current) => !current)}
          type="button"
        >
          {isBestSeller ? 'Đang lọc bán chạy' : 'Bán chạy'}
        </button>
      </section>

      {books.items.length === 0 ? (
        <EmptyState
          title="Chưa tìm thấy tựa sách phù hợp"
          description="Hãy thử đổi bộ lọc hoặc xóa từ khóa để mở rộng phạm vi tìm kiếm."
        />
      ) : (
        <>
          <div className="shelf-header">
            <SectionHeading
              eyebrow="Kết quả tìm kiếm"
              title={`${books.meta.total} tựa sách phù hợp với bộ lọc hiện tại`}
              description={`Đang hiển thị ${books.items.length} kết quả đầu tiên trên trang ${books.meta.page}.`}
            />
            <Link className="text-link" to="/">
              Quay lại trang chủ
            </Link>
          </div>
          <div className="book-grid book-grid-featured">
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
                    {pendingBookId === book.id ? 'Đang cập nhật' : wishlistIds.has(book.id) ? 'Đã lưu' : 'Yêu thích'}
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
