import { describe, expect, test } from 'vitest';

import {
  canAccessAdminSection,
  canManageInventoryTransactions,
  getAdminSectionsForRole,
  isPrivilegedRole,
  type AdminSectionId,
} from './role-access';

const allSections: AdminSectionId[] = [
  'overview',
  'orders',
  'contacts',
  'inventory',
  'books',
  'categories',
  'authors',
  'publishers',
  'banners',
  'customers',
  'vouchers',
  'reports',
  'logs',
  'settings',
];

describe('role-access', () => {
  test('treats only staff and admin as privileged roles', () => {
    expect(isPrivilegedRole('customer')).toBe(false);
    expect(isPrivilegedRole('staff')).toBe(true);
    expect(isPrivilegedRole('admin')).toBe(true);
  });

  test('blocks customers from every admin section', () => {
    for (const section of allSections) {
      expect(canAccessAdminSection('customer', section)).toBe(false);
    }
  });

  test('limits staff to operational sections only', () => {
    expect(getAdminSectionsForRole('staff').map((section) => section.id)).toEqual([
      'overview',
      'orders',
      'contacts',
      'inventory',
      'reports',
    ]);

    expect(canAccessAdminSection('staff', 'overview')).toBe(true);
    expect(canAccessAdminSection('staff', 'orders')).toBe(true);
    expect(canAccessAdminSection('staff', 'contacts')).toBe(true);
    expect(canAccessAdminSection('staff', 'inventory')).toBe(true);
    expect(canAccessAdminSection('staff', 'reports')).toBe(true);

    expect(canAccessAdminSection('staff', 'books')).toBe(false);
    expect(canAccessAdminSection('staff', 'categories')).toBe(false);
    expect(canAccessAdminSection('staff', 'authors')).toBe(false);
    expect(canAccessAdminSection('staff', 'publishers')).toBe(false);
    expect(canAccessAdminSection('staff', 'banners')).toBe(false);
    expect(canAccessAdminSection('staff', 'customers')).toBe(false);
    expect(canAccessAdminSection('staff', 'vouchers')).toBe(false);
    expect(canAccessAdminSection('staff', 'logs')).toBe(false);
    expect(canAccessAdminSection('staff', 'settings')).toBe(false);
  });

  test('allows admins to access the full back-office', () => {
    expect(getAdminSectionsForRole('admin').map((section) => section.id)).toEqual(allSections);

    for (const section of allSections) {
      expect(canAccessAdminSection('admin', section)).toBe(true);
    }
  });

  test('reserves inventory write operations for admins only', () => {
    expect(canManageInventoryTransactions('customer')).toBe(false);
    expect(canManageInventoryTransactions('staff')).toBe(false);
    expect(canManageInventoryTransactions('admin')).toBe(true);
  });
});
