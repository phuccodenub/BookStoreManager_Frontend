import { Link, NavLink, Outlet } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';
import { getAdminSectionsForRole } from '@/features/auth/role-access';

const roleLabels = {
  admin: 'Quản trị viên',
  staff: 'Nhân viên vận hành',
};

function AdminLayout() {
  const { session } = useAuth();
  const role = session?.user.role;
  const navItems = getAdminSectionsForRole(role);
  const roleLabel = role === 'admin' || role === 'staff' ? roleLabels[role] : 'Phiên làm việc nội bộ';
  const dashboardLabel = role === 'admin' ? 'Admin Dashboard' : 'Staff Operations';

  return (
    <div className="admin-layout-shell">
      <aside className="admin-sidebar-v2">
        <div className="admin-sidebar-brand-block">
          <p className="admin-sidebar-kicker">MMT internal</p>
          <div className="admin-sidebar-brand">MMT bookstore</div>
          <p className="admin-sidebar-caption">Không gian điều hành tập trung cho đội quản trị và vận hành.</p>
        </div>
        <nav className="admin-sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.id}
              className={({ isActive }) => `admin-sidebar-link${isActive ? ' admin-sidebar-link-active' : ''}`}
              end={item.id === 'overview'}
              to={item.path}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="admin-content-v2">
        <div className="admin-topbar-card">
          <div className="admin-topbar-copy">
            <div className="admin-topbar-title-group">
              <p className="eyebrow">Back-office</p>
              <h1>{dashboardLabel}</h1>
              <p className="admin-topbar-subtitle">{roleLabel} • {session?.user.fullName ?? 'MMT bookstore'}</p>
            </div>
            <span className="admin-role-badge">{roleLabel}</span>
          </div>
          <div className="admin-topbar-actions">
            <Link className="admin-outline-button" to="/login?switch=1">
                Đổi tài khoản
            </Link>
            <Link className="admin-outline-button" to="/">
                Về storefront
            </Link>
          </div>
        </div>
        <div className="admin-content-stack">
          <Outlet />
        </div>
      </section>
    </div>
  );
}

export default AdminLayout;
