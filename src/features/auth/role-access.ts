import type { PrivilegedRole, Role } from '@/lib/types';

export type AdminSectionId =
  | 'overview'
  | 'orders'
  | 'contacts'
  | 'inventory'
  | 'books'
  | 'categories'
  | 'authors'
  | 'publishers'
  | 'banners'
  | 'customers'
  | 'vouchers'
  | 'reports'
  | 'logs'
  | 'settings';

export interface AdminSection {
  id: AdminSectionId;
  label: string;
  path: string;
  roles: Role[];
}

const ADMIN_SECTIONS: readonly AdminSection[] = [
  { id: 'overview', label: 'Bảng điều khiển', path: '/admin', roles: ['staff', 'admin'] },
  { id: 'orders', label: 'Đơn hàng', path: '/admin/orders', roles: ['staff', 'admin'] },
  { id: 'contacts', label: 'Liên hệ', path: '/admin/contacts', roles: ['staff', 'admin'] },
  { id: 'inventory', label: 'Tồn kho', path: '/admin/inventory', roles: ['staff', 'admin'] },
  { id: 'books', label: 'Sách', path: '/admin/books', roles: ['admin'] },
  { id: 'categories', label: 'Danh mục', path: '/admin/categories', roles: ['admin'] },
  { id: 'authors', label: 'Tác giả', path: '/admin/authors', roles: ['admin'] },
  { id: 'publishers', label: 'NXB', path: '/admin/publishers', roles: ['admin'] },
  { id: 'banners', label: 'Banner', path: '/admin/banners', roles: ['admin'] },
  { id: 'customers', label: 'Tài khoản', path: '/admin/customers', roles: ['admin'] },
  { id: 'vouchers', label: 'Khuyến mãi', path: '/admin/vouchers', roles: ['admin'] },
  { id: 'reports', label: 'Báo cáo', path: '/admin/reports', roles: ['staff', 'admin'] },
  { id: 'logs', label: 'Nhật ký', path: '/admin/logs', roles: ['admin'] },
  { id: 'settings', label: 'Cài đặt', path: '/admin/settings', roles: ['admin'] },
] as const;

export function isPrivilegedRole(role?: Role | null): role is PrivilegedRole {
  return role === 'staff' || role === 'admin';
}

export function getAdminSectionsForRole(role?: Role | null): AdminSection[] {
  if (!role) {
    return [];
  }

  return ADMIN_SECTIONS.filter((section) => section.roles.includes(role));
}

export function canAccessAdminSection(role: Role | null | undefined, sectionId: AdminSectionId) {
  return getAdminSectionsForRole(role).some((section) => section.id === sectionId);
}

export function canManageInventoryTransactions(role?: Role | null) {
  return role === 'admin';
}

export function getDefaultAdminPathForRole(role?: Role | null) {
  return getAdminSectionsForRole(role)[0]?.path ?? '/account';
}
