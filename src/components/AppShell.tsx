import clsx from 'clsx';
import { useEffect, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';
import { getSettings } from '@/features/home/home-api';

const primaryLinks = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/catalog', label: 'Danh mục' },
  { to: '/support', label: 'Hỗ trợ' },
];

function SearchIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16L21 21" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 20.2L4.7 13.4C2.8 11.5 2.8 8.5 4.7 6.6C6.4 4.9 9.1 4.8 10.9 6.4L12 7.4L13.1 6.4C14.9 4.8 17.6 4.9 19.3 6.6C21.2 8.5 21.2 11.5 19.3 13.4L12 20.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path d="M3 5H5L7.1 14.2H18.6L21 8H8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="9" cy="19" r="1.6" fill="currentColor" />
      <circle cx="18" cy="19" r="1.6" fill="currentColor" />
    </svg>
  );
}

function BrandIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 48 48">
      <path d="M9 10.5H25C28.9 10.5 32 13.6 32 17.5V37.5H15C11.7 37.5 9 34.8 9 31.5V10.5Z" fill="currentColor" opacity="0.14" />
      <path d="M15 10.5H32C35.9 10.5 39 13.6 39 17.5V37.5H22C18.1 37.5 15 34.4 15 30.5V10.5Z" stroke="currentColor" strokeWidth="2.4" />
      <path d="M15 17H39" stroke="currentColor" strokeWidth="2.4" />
      <path d="M22 24H31" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      <path d="M22 29.5H33.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      <path d="M9 12V31.5C9 34.8 11.7 37.5 15 37.5H17.5" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  );
}

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isHydrating, isPrivileged, logout, session } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });

  useEffect(() => {
    if (location.pathname !== '/catalog') {
      return;
    }

    const params = new URLSearchParams(location.search);
    setSearchValue(params.get('search') ?? '');
  }, [location.pathname, location.search]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const value = searchValue.trim();
    if (value) {
      params.set('search', value);
    }
    navigate(`/catalog${params.toString() ? `?${params.toString()}` : ''}`);
  }

  async function handleLogout() {
    setLogoutError(null);
    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/', { replace: true });
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Không thể đăng xuất ngay lúc này. Vui lòng thử lại.');
    } finally {
      setIsLoggingOut(false);
    }
  }

  const userNameParts = session?.user.fullName.split(' ').filter(Boolean) ?? [];
  const userFirstName = userNameParts.at(-1) ?? 'Bạn';
  const userInitials = (userNameParts.length === 0
    ? ['M', 'M']
    : [userNameParts[0]?.[0] ?? '', userNameParts.at(-1)?.[0] ?? userNameParts[0]?.[0] ?? ''])
    .join('')
    .toUpperCase();
  const settings = settingsQuery.data;
  const storeName = settings?.storeName ?? 'MMT Hiệu Sách';
  const contactAddress = settings?.contactAddress ?? 'Thông tin địa chỉ đang được cập nhật.';
  const contactPhone = settings?.contactPhone ?? 'Số điện thoại hỗ trợ đang được cập nhật.';
  const contactEmail = settings?.contactEmail ?? 'Email hỗ trợ đang được cập nhật.';
  const isProtectedUserRoute = ['/account', '/wishlist', '/cart', '/order-success'].some((prefix) => location.pathname.startsWith(prefix));
  const isSyncingProtectedSession = isHydrating && !session && isProtectedUserRoute;

  return (
    <div className="app-shell">
      {/* Header theo Figma - user-wishlist.png */}
      <header className="site-header">
        {/* Top bar: Logo + Search + Actions */}
        <div className="header-top">
          <NavLink className="header-logo" to="/">
            <BrandIcon />
            <span className="header-logo-text">MMT bookstore</span>
          </NavLink>

          <form className="header-search" onSubmit={submitSearch} role="search">
            <SearchIcon />
            <input
              aria-label="Tìm sách, ISBN hoặc tác giả"
              className="header-search-input"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Tìm sách, ISBN hoặc tác giả..."
              type="search"
              value={searchValue}
            />
          </form>

          <div className="header-actions">
            {isSyncingProtectedSession ? (
              <span className="header-sync-pill" aria-live="polite">
                Đang đồng bộ phiên
              </span>
            ) : isAuthenticated ? (
              <>
                <NavLink className="header-icon-btn" to="/wishlist" aria-label="Yêu thích" title="Yêu thích">
                  <HeartIcon />
                </NavLink>
                <NavLink className="header-icon-btn" to="/cart" aria-label="Giỏ hàng" title="Giỏ hàng">
                  <CartIcon />
                </NavLink>
                <NavLink className="header-btn header-btn-primary" to="/cart">
                  Thanh toán
                </NavLink>
                <NavLink className="header-user" to="/account" title="Tài khoản">
                  <span className="header-avatar">{userInitials}</span>
                  <span className="header-username">{userFirstName}</span>
                </NavLink>
                <NavLink className="header-btn header-btn-secondary" to="/login?switch=1">
                  Đổi tài khoản
                </NavLink>
                {isPrivileged ? (
                  <NavLink className="header-btn header-btn-secondary" to="/admin">
                    {session?.user.role === 'admin' ? 'Quản trị' : 'Vận hành'}
                  </NavLink>
                ) : null}
              </>
            ) : (
              <>
                <NavLink className="header-btn header-btn-secondary" to="/login">
                  Đăng nhập
                </NavLink>
                <NavLink className="header-btn header-btn-primary" to="/login?mode=register">
                  Đăng ký
                </NavLink>
              </>
            )}
          </div>
        </div>

        {/* Navigation bar */}
        <nav className="header-nav" aria-label="Primary navigation">
          {primaryLinks.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) => clsx('header-nav-link', isActive && 'header-nav-link-active')}
              end={link.end}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
          {logoutError ? <span className="header-nav-status">{logoutError}</span> : null}
          {isAuthenticated && (
            <button className="header-nav-logout" disabled={isLoggingOut} onClick={() => void handleLogout()} type="button">
              {isLoggingOut ? 'Đang thoát...' : 'Thoát'}
            </button>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="main-content page-frame">
        <Outlet />
      </main>

      {/* Footer theo Figma - minimal */}
      <footer className="site-footer">
        <div className="footer-container">
          <div className="footer-col footer-col-brand">
            <div className="footer-logo">
              <BrandIcon />
              <span className="footer-logo-text">MMT bookstore</span>
            </div>
            <p className="footer-desc">
              {storeName} - Nhà sách trực tuyến dành cho người yêu đọc sách. Tìm sách mới, lưu danh sách yêu thích và theo dõi đơn hàng dễ dàng.
            </p>
          </div>

          <div className="footer-col">
            <h4 className="footer-title">Liên hệ</h4>
            <p>{contactAddress}</p>
            <p>{contactPhone}</p>
            <p>{contactEmail}</p>
          </div>

          <div className="footer-col">
            <h4 className="footer-title">Thông tin</h4>
            <p>Showroom và điểm nhận hàng</p>
            <p>Không gian phục vụ mua sắm trực tuyến, nhận đơn và hỗ trợ khách hàng.</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2024 MMT Bookstore. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default AppShell;

