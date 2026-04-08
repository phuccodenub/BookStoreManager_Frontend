import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import AdminLayout from '@/components/AdminLayout';
import AppShell from '@/components/AppShell';
import PageLoadingState from '@/components/PageLoadingState';
import QueryBoundary from '@/components/QueryBoundary';
import { RequireAdminSection, RequireAuth, RequireRole } from '@/features/auth/AuthContext';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const CatalogPage = lazy(() => import('@/features/catalog/CatalogPage'));
const BookDetailPage = lazy(() => import('@/features/book/BookDetailPage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const CartPage = lazy(() => import('@/features/cart/CartPage'));
const WishlistPage = lazy(() => import('@/features/wishlist/WishlistPage'));
const AccountPage = lazy(() => import('@/features/account/AccountPage'));
const OrderSuccessPage = lazy(() => import('@/features/order/OrderSuccessPage'));
const SupportPage = lazy(() => import('@/features/support/SupportPage'));
const AdminPage = lazy(() => import('@/features/admin/AdminPage'));
const AdminOrdersPage = lazy(() => import('@/features/admin/AdminOrdersPage'));
const AdminContactsPage = lazy(() => import('@/features/admin/AdminContactsPage'));
const AdminInventoryPage = lazy(() => import('@/features/admin/AdminInventoryPage'));
const AdminBooksPage = lazy(() => import('@/features/admin/AdminBooksPage'));
const AdminCategoriesPage = lazy(() => import('@/features/admin/AdminCategoriesPage'));
const AdminAuthorsPage = lazy(() => import('@/features/admin/AdminAuthorsPage'));
const AdminPublishersPage = lazy(() => import('@/features/admin/AdminPublishersPage'));
const AdminBannersPage = lazy(() => import('@/features/admin/AdminBannersPage'));
const AdminCustomersPage = lazy(() => import('@/features/admin/AdminCustomersPage'));
const AdminVouchersPage = lazy(() => import('@/features/admin/AdminVouchersPage'));
const AdminReportsPage = lazy(() => import('@/features/admin/AdminReportsPage'));
const AdminSettingsPage = lazy(() => import('@/features/admin/AdminSettingsPage'));
const AdminLogsPage = lazy(() => import('@/features/admin/AdminLogsPage'));

function withBoundary(element: React.ReactNode) {
  return (
    <QueryBoundary>
      <Suspense fallback={<PageLoadingState />}>{element}</Suspense>
    </QueryBoundary>
  );
}

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: withBoundary(<HomePage />) },
      { path: 'catalog', element: withBoundary(<CatalogPage />) },
      { path: 'books/:bookId', element: withBoundary(<BookDetailPage />) },
      { path: 'login', element: withBoundary(<LoginPage />) },
      { path: 'support', element: withBoundary(<SupportPage />) },
      {
        path: 'cart',
        element: <RequireAuth>{withBoundary(<CartPage />)}</RequireAuth>,
      },
      {
        path: 'order-success',
        element: <RequireAuth>{withBoundary(<OrderSuccessPage />)}</RequireAuth>,
      },
      {
        path: 'wishlist',
        element: <RequireAuth>{withBoundary(<WishlistPage />)}</RequireAuth>,
      },
      {
        path: 'account',
        element: <RequireAuth>{withBoundary(<AccountPage />)}</RequireAuth>,
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
  {
    path: '/admin',
    element: <RequireRole roles={['admin', 'staff']}><AdminLayout /></RequireRole>,
    children: [
      { index: true, element: <RequireAdminSection section="overview">{withBoundary(<AdminPage />)}</RequireAdminSection> },
      { path: 'orders', element: <RequireAdminSection section="orders">{withBoundary(<AdminOrdersPage />)}</RequireAdminSection> },
      { path: 'contacts', element: <RequireAdminSection section="contacts">{withBoundary(<AdminContactsPage />)}</RequireAdminSection> },
      { path: 'inventory', element: <RequireAdminSection section="inventory">{withBoundary(<AdminInventoryPage />)}</RequireAdminSection> },
      { path: 'books', element: <RequireAdminSection section="books">{withBoundary(<AdminBooksPage />)}</RequireAdminSection> },
      { path: 'categories', element: <RequireAdminSection section="categories">{withBoundary(<AdminCategoriesPage />)}</RequireAdminSection> },
      { path: 'authors', element: <RequireAdminSection section="authors">{withBoundary(<AdminAuthorsPage />)}</RequireAdminSection> },
      { path: 'publishers', element: <RequireAdminSection section="publishers">{withBoundary(<AdminPublishersPage />)}</RequireAdminSection> },
      { path: 'banners', element: <RequireAdminSection section="banners">{withBoundary(<AdminBannersPage />)}</RequireAdminSection> },
      { path: 'customers', element: <RequireAdminSection section="customers">{withBoundary(<AdminCustomersPage />)}</RequireAdminSection> },
      { path: 'vouchers', element: <RequireAdminSection section="vouchers">{withBoundary(<AdminVouchersPage />)}</RequireAdminSection> },
      { path: 'reports', element: <RequireAdminSection section="reports">{withBoundary(<AdminReportsPage />)}</RequireAdminSection> },
      { path: 'settings', element: <RequireAdminSection section="settings">{withBoundary(<AdminSettingsPage />)}</RequireAdminSection> },
      { path: 'logs', element: <RequireAdminSection section="logs">{withBoundary(<AdminLogsPage />)}</RequireAdminSection> },
      { path: '*', element: <Navigate to="/admin" replace /> },
    ],
  },
]);
