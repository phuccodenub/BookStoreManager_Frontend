import { useSuspenseQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import heroImage from '@/assets/hero.png';
import BookCard from '@/components/BookCard';
import SectionHeading from '@/components/SectionHeading';
import { getCategories } from '@/features/catalog/catalog-api';
import { useAuth } from '@/features/auth/AuthContext';
import { buildBannerViewModel } from '@/features/home/banner-link';
import { getHome, getSettings } from '@/features/home/home-api';
import { useWishlist } from '@/features/wishlist/useWishlist';
import { formatCurrency } from '@/lib/format';

const trustSignals = [
  {
    title: 'Giao hàng nhanh',
    description: 'Đặt sách thuận tiện, theo dõi đơn rõ ràng và nhận hàng nhanh chóng.',
  },
  {
    title: 'Chính sách rõ ràng',
    description: 'Giá bán, tình trạng sách và thông tin liên hệ luôn được cập nhật minh bạch.',
  },
  {
    title: 'Chọn sách dễ dàng',
    description: 'Trang chủ được chia theo từng nhóm nổi bật để bạn tìm sách và mua nhanh hơn.',
  },
  {
    title: 'Thanh toán an tâm',
    description: 'Hỗ trợ thanh toán linh hoạt và tra cứu đơn hàng theo từng trạng thái.',
  },
] as const;

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
    staleTime: 0,
    refetchOnMount: 'always',
  });
  const { data: categories } = useSuspenseQuery({
    queryKey: ['home', 'categories'],
    queryFn: getCategories,
  });

  const leadingBanner = homeData.banners[0];
  const bannerViewModel = buildBannerViewModel(leadingBanner);
  const highlightedCategories = categories.slice(0, 6);
  const curatedShelves = [
    {
      eyebrow: 'Sách nổi bật',
      title: 'Những tựa sách đang được quan tâm nhiều nhất',
      books: homeData.featuredBooks,
      accent: 'sand' as const,
      href: '/catalog',
    },
    {
      eyebrow: 'Sách mới',
      title: 'Ấn phẩm mới dành cho bạn đọc muốn khám phá nhanh',
      books: homeData.newBooks,
      accent: 'ink' as const,
      href: '/catalog?isNew=true',
    },
    {
      eyebrow: 'Bán chạy',
      title: 'Những tựa sách được chọn mua nhiều nhất',
      books: homeData.bestSellerBooks,
      accent: 'sand' as const,
      href: '/catalog?isBestSeller=true',
    },
  ];

  return (
    <div className="page-stack page-stack-home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">MMT Hiệu Sách</p>
          <h1>Tìm cuốn sách yêu thích tiếp theo của bạn tại đây.</h1>
          <p className="home-hero-description">
            {settings.storeName} mang đến trải nghiệm tìm sách, lưu wishlist và đặt hàng trong một không gian mua sắm
            trực tuyến gọn gàng, dễ theo dõi và thân thiện với người đọc.
          </p>

          <div className="action-row">
            <Link className="button button-primary" to="/catalog">
              Mua sách ngay
            </Link>
            {isAuthenticated ? (
            <Link className="button button-secondary" to="/wishlist">
              Xem danh sách yêu thích
            </Link>
            ) : (
              <Link className="button button-secondary" to="/login?mode=register">
                Tạo tài khoản mới
              </Link>
            )}
          </div>

          <div className="home-hero-facts">
            <article>
              <span>Phí vận chuyển</span>
              <strong>{formatCurrency(settings.shippingFee)}</strong>
            </article>
            <article>
              <span>Cổng thanh toán</span>
              <strong>{settings.paymentProviderName ?? 'Thanh toán trực tuyến'}</strong>
            </article>
            <article>
              <span>Hỗ trợ</span>
              <strong>{settings.supportHours ?? 'Mỗi ngày'}</strong>
            </article>
          </div>
        </div>

        <div className="home-hero-visual">
          <div className="home-hero-art">
            <img alt={leadingBanner?.title ?? 'MMT Hiệu Sách'} src={leadingBanner?.image ?? heroImage} />
          </div>
          <article className="home-floating-card">
            <p className="eyebrow">Gợi ý hôm nay</p>
            <h2>{bannerViewModel.title}</h2>
            <p>{bannerViewModel.description}</p>
            <Link className="text-link" to={bannerViewModel.href}>
              {bannerViewModel.ctaLabel}
            </Link>
          </article>
        </div>
      </section>

      <section className="trust-strip">
        {trustSignals.map((item) => (
          <article key={item.title} className="trust-card">
            <span className="trust-mark" />
            <div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="page-stack">
        <div className="shelf-header">
          <SectionHeading
            eyebrow="Danh mục sản phẩm"
            title="Bắt đầu từ những kệ sách có chủ đề rõ ràng"
            description="Chọn nhanh nhóm sách phù hợp với sở thích để đi thẳng tới danh mục bạn cần."
          />
          <Link className="text-link" to="/catalog">
            Xem tất cả danh mục
          </Link>
        </div>

        <div className="category-grid">
          {highlightedCategories.map((category) => (
            <Link key={category.id} className="category-card" to={`/catalog?categoryId=${category.id}`}>
              <span className="category-card-mark" />
              <div>
                <strong>{category.name}</strong>
                <p>Khám phá những đầu sách được sắp xếp theo chủ đề này.</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {curatedShelves.map((shelf) => (
        <section key={shelf.title} className="page-stack">
          <div className="shelf-header">
            <SectionHeading eyebrow={shelf.eyebrow} title={shelf.title} />
            <Link className="text-link" to={shelf.href}>
              Xem thêm
            </Link>
          </div>
          <div className="book-grid book-grid-featured">
            {shelf.books.map((book) => (
              <BookCard
                key={book.id}
                accent={shelf.accent}
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
        </section>
      ))}
    </div>
  );
}

export default HomePage;

