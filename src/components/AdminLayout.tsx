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

  return (
    <div className="admin-layout-shell">
      <aside className="admin-sidebar-v2">
        <div className="admin-sidebar-brand">MMT bookstore</div>
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
        <div className="surface-card">
          <div className="shelf-header">
            <div>
              <p className="eyebrow">Back-office</p>
              <h1>{role === 'admin' ? 'Admin Dashboard' : 'Staff Operations'}</h1>
              <p>{roleLabel} • {session?.user.fullName ?? 'MMT bookstore'}</p>
            </div>
            <div className="inline-actions">
              <Link className="button button-secondary" to="/login?switch=1">
                Đổi tài khoản
              </Link>
              <Link className="button button-secondary" to="/">
                Về storefront
              </Link>
            </div>
          </div>
        </div>
        <Outlet />
      </section>
    </div>
  );
}

export default AdminLayout;
