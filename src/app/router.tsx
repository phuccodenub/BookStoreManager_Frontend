import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

import AppShell from '@/components/AppShell';
import PageLoadingState from '@/components/PageLoadingState';
import QueryBoundary from '@/components/QueryBoundary';
import { RequireAuth, RequireRole } from '@/features/auth/AuthContext';

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
      {
        path: 'admin',
        element: <RequireRole roles={['admin', 'staff']}>{withBoundary(<AdminPage />)}</RequireRole>,
      },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
