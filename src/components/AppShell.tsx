import clsx from 'clsx';
import { NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';

const primaryLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/catalog', label: 'Catalog' },
  { to: '/support', label: 'Support' },
];

const secondaryLinks = [
  { to: '/wishlist', label: 'Wishlist' },
  { to: '/cart', label: 'Cart' },
  { to: '/account', label: 'Account' },
  { to: '/admin', label: 'Backoffice' },
];

function AppShell() {
  const { isAuthenticated, isPrivileged, logout, session } = useAuth();

  return (
    <div className="app-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <header className="topbar">
        <div>
          <p className="eyebrow">API-first frontend</p>
          <NavLink className="brand-mark" to="/">
            BookStoreManager
          </NavLink>
        </div>
        <nav className="topnav" aria-label="Primary navigation">
          {primaryLinks.map((link) => (
            <NavLink
              key={link.to}
              className={({ isActive }) => clsx('nav-link', isActive && 'nav-link-active')}
              end={link.end}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="topbar-actions">
          {secondaryLinks.map((link) => {
            if (link.to === '/admin' && !isPrivileged) return null;
            if (['/wishlist', '/cart', '/account'].includes(link.to) && !isAuthenticated) return null;
            return (
              <NavLink
                key={link.to}
                className={({ isActive }) => clsx('nav-link nav-link-quiet', isActive && 'nav-link-active')}
                to={link.to}
              >
                {link.label}
              </NavLink>
            );
          })}
          {isAuthenticated ? (
            <button className="button button-secondary" onClick={logout} type="button">
              Sign out {session?.user.fullName?.split(' ')[0]}
            </button>
          ) : (
            <NavLink className="button button-primary" to="/login">
              Sign in
            </NavLink>
          )}
        </div>
      </header>
      <main className="page-frame">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
