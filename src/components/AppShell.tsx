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

function AccountIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 19.5C6.9 16.8 9.1 15.5 12 15.5C14.9 15.5 17.1 16.8 18.5 19.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
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
  const { isAuthenticated, isPrivileged, logout, session } = useAuth();
  const [searchValue, setSearchValue] = useState('');
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

  return (
    <div className="app-shell bookstore-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <header className="site-header">
        <div className="header-inner">
          <NavLink className="brand-lockup" to="/">
            <span className="brand-icon" aria-hidden="true">
              <BrandIcon />
            </span>
            <span className="brand-copy">
              <strong className="brand-wordmark">MMT</strong>
              <span className="brand-submark">Hiệu Sách</span>
            </span>
          </NavLink>

          <form className="header-search" onSubmit={submitSearch} role="search">
            <span className="search-icon" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              aria-label="Tìm sách, ISBN hoặc tác giả"
              className="search-input"
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Tìm sách, ISBN hoặc tác giả"
              type="search"
              value={searchValue}
            />
          </form>

          <div className="header-utilities">
            {isAuthenticated ? (
              <>
                <NavLink className="utility-icon-link" to="/wishlist" aria-label="Danh sách yêu thích">
                  <HeartIcon />
                </NavLink>
                <NavLink className="utility-icon-link" to="/cart" aria-label="Giỏ hàng">
                  <CartIcon />
                </NavLink>
                <NavLink className="utility-profile" to="/account">
                  <span className="avatar-badge">{userInitials}</span>
                  <span className="utility-profile-copy">
                    <strong>{userFirstName}</strong>
                    <span>{session?.user.role === 'admin' || session?.user.role === 'staff' ? 'Khu vực vận hành' : 'Tài khoản của bạn'}</span>
                  </span>
                </NavLink>
                <button className="header-pill header-pill-muted" onClick={logout} type="button">
                  Thoát
                </button>
              </>
            ) : (
              <>
                <NavLink className="header-pill header-pill-muted" to="/login">
                  Đăng nhập
                </NavLink>
                <NavLink className="header-pill header-pill-accent" to="/login?mode=register">
                  Đăng ký
                </NavLink>
              </>
            )}
          </div>
        </div>

        <div className="header-nav-row">
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
            {isPrivileged ? (
              <NavLink className={({ isActive }) => clsx('header-nav-link', isActive && 'header-nav-link-active')} to="/admin">
                Vận hành
              </NavLink>
            ) : null}
          </nav>

          {isAuthenticated ? (
            <NavLink className="header-summary-link" to="/account">
              <AccountIcon />
              <span>Xem đơn hàng và tài khoản</span>
            </NavLink>
          ) : (
            <p className="header-summary-text">Khám phá nhà sách, lưu wishlist và theo dõi đơn hàng ngay trên cùng một tài khoản.</p>
          )}
        </div>
      </header>

      <main className="page-frame">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-grid">
          <div className="footer-column footer-column-brand">
            <div className="brand-lockup footer-brand-lockup">
              <span className="brand-icon" aria-hidden="true">
                <BrandIcon />
              </span>
              <span className="brand-copy">
                <strong className="brand-wordmark">MMT</strong>
                <span className="brand-submark">Hiệu Sách</span>
              </span>
            </div>
            <p>
              {storeName} là nhà sách trực tuyến dành cho người yêu đọc sách, nơi bạn có thể tìm sách mới, lưu danh sách yêu thích
              và theo dõi đơn hàng một cách gọn gàng, dễ hiểu.
            </p>
          </div>

          <div className="footer-column">
            <p className="footer-title">Liên hệ</p>
            <p>{contactAddress}</p>
            <p>{contactPhone}</p>
            <p>{contactEmail}</p>
          </div>

          <div className="footer-column footer-column-map">
            <p className="footer-title">Bản đồ cửa hàng</p>
            <div className="footer-map-card">
              <span className="footer-map-pin" />
              <div>
                <strong>Showroom và điểm nhận hàng</strong>
                <p>Không gian phục vụ mua sắm trực tuyến, nhận đơn và hỗ trợ khách hàng sau mua.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AppShell;

