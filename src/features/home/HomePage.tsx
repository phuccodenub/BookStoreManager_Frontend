import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

import heroImage from '@/assets/hero.png';
import BookCard from '@/components/BookCard';
import { getCategories } from '@/features/catalog/catalog-api';
import { useAuth } from '@/features/auth/AuthContext';
import { buildBannerViewModel } from '@/features/home/banner-link';
import { getHome, getSettings } from '@/features/home/home-api';
import { useWishlist } from '@/features/wishlist/useWishlist';
import { formatCurrency } from '@/lib/format';

const featureHighlights = [
  { icon: '📚', label: 'Kho sách lớn', detail: '10,000+ tựa sách' },
  { icon: '⚡', label: 'Giao hàng tức thì', detail: '1-3 ngày' },
  { icon: '💯', label: 'Chất lượng đảm bảo', detail: '100% hài lòng' },
  { icon: '🎁', label: 'Ưu đãi thường xuyên', detail: 'Sale mỗi tuần' },
] as const;

function HomePage() {
  const { isAuthenticated } = useAuth();
  const { wishlistIds, pendingBookId, toggleWishlist } = useWishlist();
  const [scrollProgress, setScrollProgress] = useState(0);

  const { data: settings } = useSuspenseQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });
  const { data: homeData } = useSuspenseQuery({
    queryKey: ['home', 6],
    queryFn: () => getHome(6),
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const { data: categories } = useSuspenseQuery({
    queryKey: ['home', 'categories'],
    queryFn: getCategories,
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress((scrolled / totalHeight) * 100);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const bannerViewModel = buildBannerViewModel(homeData.banners[0]);
  const topCategories = categories.slice(0, 8);

  return (
    <div className="homepage-modern">
      {/* Animated Background */}
      <div className="bg-animated-blur" style={{ opacity: scrollProgress / 100 }} />

      {/* Hero Section - Premium Design */}
      <section className="hero-premium">
        <div className="hero-accent-1" />
        <div className="hero-accent-2" />

        <div className="hero-container">
          <div className="hero-left">
            <div className="hero-badge animated-badge">
              <span className="pulse-dot" />
              <span>Kho sách trực tuyến hàng đầu</span>
            </div>

            <h1 className="hero-title">
              Tìm <span className="gradient-text">cuốn sách</span>
              <br />
              tiếp theo của bạn
            </h1>

            <p className="hero-subtitle">
              Hãy khám phá thế giới sách với 10,000+ tựa được tuyển chọn từ các tác giả uy tín. Nhanh, an toàn, và
              luôn có ưu đãi cho bạn.
            </p>

            <div className="hero-features">
              {featureHighlights.map((feature, idx) => (
                <div key={idx} className="feature-chip animated-feature" style={{ animationDelay: `${idx * 0.1}s` }}>
                  <span className="feature-icon">{feature.icon}</span>
                  <div>
                    <div className="feature-label">{feature.label}</div>
                    <div className="feature-detail">{feature.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hero-actions">
              <Link className="btn btn-primary btn-lg animated-button" to="/catalog">
                Bắt đầu ngay
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M7 10h6m0 0l-3-3m3 3l-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </Link>
              {isAuthenticated ? (
                <Link className="btn btn-ghost animated-button" to="/wishlist">
                  Wishlist của tôi
                </Link>
              ) : (
                <Link className="btn btn-ghost animated-button" to="/login?mode=register">
                  Đăng ký miễn phí
                </Link>
              )}
            </div>
          </div>

          <div className="hero-right">
            <div className="hero-image-wrapper">
              <div className="hero-image-frame">
                <img src={homeData.banners[0]?.image ?? heroImage} alt="Hero" className="hero-image" />
              </div>
              <div className="stat-card stat-card-featured animated-stat">
                <div className="stat-value">{categories.length}+</div>
                <div className="stat-label">Danh mục sách</div>
              </div>
              <div className="stat-card stat-card-alt animated-stat" style={{ animationDelay: '0.1s' }}>
                <div className="stat-value">{bannerViewModel.title}</div>
                <div className="stat-label">Đề xuất</div>
              </div>
            </div>
          </div>
        </div>

        <div className="scroll-indicator">
          <div className="scroll-dot" />
          <span>Scroll để khám phá</span>
        </div>
      </section>

      {/* Category Showcase - Grid Pattern */}
      <section className="category-showcase">
        <div className="section-header">
          <h2>Duyệt theo thể loại</h2>
          <Link className="section-link" to="/catalog">
            Xem tất cả <span>→</span>
          </Link>
        </div>

        <div className="category-grid-modern">
          {topCategories.map((category, idx) => (
            <Link
              key={category.id}
              to={`/catalog?categoryId=${category.id}`}
              className="category-tile animated-tile"
              style={{ animationDelay: `${idx * 0.08}s` }}
            >
              <div className="category-tile-bg" data-category={idx} />
              <div className="category-tile-content">
                <h3>{category.name}</h3>
                <span className="arrow-icon">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Books - Carousel Style */}
      <section className="featured-books-section">
        <div className="section-header">
          <h2>Sách nổi bật hôm nay</h2>
          <Link className="section-link" to="/catalog">
            Xem tất cả <span>→</span>
          </Link>
        </div>
        <div className="books-carousel">
          {homeData.featuredBooks.slice(0, 6).map((book, idx) => (
            <div key={book.id} className="book-card-carousel animated-book" style={{ animationDelay: `${idx * 0.06}s` }}>
              <BookCard
                accent="sand"
                actions={
                  isAuthenticated ? (
                    <button
                      className="wishlist-btn"
                      disabled={pendingBookId === book.id}
                      onClick={() => void toggleWishlist(book.id)}
                      type="button"
                    >
                      {pendingBookId === book.id ? '⟳' : wishlistIds.has(book.id) ? '♥' : '♡'}
                    </button>
                  ) : undefined
                }
                book={book}
              />
            </div>
          ))}
        </div>
      </section>

      {/* New Releases - Timeline Style */}
      <section className="new-releases-section">
        <div className="section-header">
          <h2>Ấn phẩm mới</h2>
          <Link className="section-link" to="/catalog?isNew=true">
            Xem tất cả <span>→</span>
          </Link>
        </div>
        <div className="releases-grid">
          {homeData.newBooks.slice(0, 4).map((book, idx) => (
            <div key={book.id} className="release-item animated-release" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="release-image">
                <BookCard
                  accent="ink"
                  actions={
                    isAuthenticated ? (
                      <button
                        className="wishlist-btn"
                        disabled={pendingBookId === book.id}
                        onClick={() => void toggleWishlist(book.id)}
                        type="button"
                      >
                        {pendingBookId === book.id ? '⟳' : wishlistIds.has(book.id) ? '♥' : '♡'}
                      </button>
                    ) : undefined
                  }
                  book={book}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Best Sellers - Highlight Section */}
      <section className="bestsellers-section">
        <div className="section-header">
          <h2>Bán chạy nhất</h2>
          <Link className="section-link" to="/catalog?isBestSeller=true">
            Xem tất cả <span>→</span>
          </Link>
        </div>
        <div className="bestsellers-grid">
          {homeData.bestSellerBooks.slice(0, 3).map((book, idx) => (
            <div key={book.id} className="bestseller-card animated-bestseller" style={{ animationDelay: `${idx * 0.12}s` }}>
              <div className="bestseller-rank">#{idx + 1}</div>
              <div className="bestseller-content">
                <BookCard
                  accent="sand"
                  actions={
                    isAuthenticated ? (
                      <button
                        className="wishlist-btn"
                        disabled={pendingBookId === book.id}
                        onClick={() => void toggleWishlist(book.id)}
                        type="button"
                      >
                        {pendingBookId === book.id ? '⟳' : wishlistIds.has(book.id) ? '♥' : '♡'}
                      </button>
                    ) : undefined
                  }
                  book={book}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-inner">
          <h2>Sẵn sàng khám phá?</h2>
          <p>Tham gia {settings.storeName} ngay hôm nay và nhận ưu đãi đặc biệt cho khách hàng mới</p>
          <Link className="btn btn-secondary btn-lg" to="/catalog">
            Bắt đầu mua sắm
          </Link>
        </div>
        <div className="cta-decoration" />
      </section>
    </div>
  );
}

export default HomePage;

