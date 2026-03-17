import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import BookCard from '@/components/BookCard';
import SectionHeading from '@/components/SectionHeading';
import StatCard from '@/components/StatCard';
import { useAuth } from '@/features/auth/AuthContext';
import { getHome, getSettings } from '@/features/home/home-api';
import { useWishlist } from '@/features/wishlist/useWishlist';
import { formatCurrency } from '@/lib/format';

function HomePage() {
  const { isAuthenticated } = useAuth();
  const { wishlistIds, pendingBookId, toggleWishlist } = useWishlist();
  const { data: settings } = useSuspenseQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });
  const { data: homeData } = useSuspenseQuery({
    queryKey: ['home', 6],
    queryFn: () => getHome(6),
  });

  return (
    <div className="page-stack">
      <section className="hero-slab">
        <div className="hero-copy">
          <p className="eyebrow">Book discovery, grounded in live APIs</p>
          <h1>{settings.storeName}</h1>
          <p>
            Browse the seeded catalog, validate checkout flows, and rehearse admin operations before the polished
            UI layer arrives. This shell is intentionally contract-first and backend-aware.
          </p>
          <div className="action-row">
            <Link className="button button-primary" to="/catalog">
              Explore catalog
            </Link>
            {isAuthenticated ? (
              <Link className="button button-secondary" to="/wishlist">
                Open wishlist
              </Link>
            ) : (
              <Link className="button button-secondary" to="/support">
                Contact support
              </Link>
            )}
          </div>
        </div>
        <div className="stat-grid">
          <StatCard label="Default shipping" value={formatCurrency(settings.shippingFee)} />
          <StatCard label="Payment provider" tone="ink" value={settings.paymentProviderName ?? 'Mock Gateway'} />
          <StatCard label="Support hours" value={settings.supportHours ?? 'Daily coverage'} />
          <StatCard label="Contact email" tone="ink" value={settings.contactEmail ?? 'Configured in backend'} />
        </div>
      </section>

      <section className="banner-ribbon">
        {homeData.banners.map((banner) => (
          <article key={banner.id} className="banner-card">
            <p className="eyebrow">Featured banner</p>
            <h3>{banner.title}</h3>
            <p>{banner.link ?? 'Use this slot later for marketing-driven homepage modules.'}</p>
          </article>
        ))}
      </section>

      <section className="page-stack">
        <SectionHeading
          eyebrow="Curated collections"
          title="Homepage modules already wired to backend"
          description="Each section below is reading directly from /api/home, so it doubles as a smoke test for the backend content model."
        />

        <div className="section-shelf">
          <div>
            <SectionHeading eyebrow="Featured" title="Books to place above the fold" />
            <div className="book-grid">
              {homeData.featuredBooks.map((book) => (
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
          </div>

          <div>
            <SectionHeading eyebrow="New arrivals" title="Fresh titles from the seeded catalog" />
            <div className="book-grid">
              {homeData.newBooks.map((book) => (
                <BookCard
                  key={book.id}
                  accent="ink"
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
          </div>

          <div>
            <SectionHeading eyebrow="Best sellers" title="Inventory and order data already influence this strip" />
            <div className="book-grid">
              {homeData.bestSellerBooks.map((book) => (
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
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
