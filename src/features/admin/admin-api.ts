import { apiBlob, apiRequest } from '@/lib/api-client';
import type {
  ActivityLogRecord,
  AdminAuthorRecord,
  AdminCategoryRecord,
  AdminPublisherRecord,
  BestSellerReportRecord,
  Banner,
  BookImage,
  CancelledOrderReportRecord,
  ContactRecord,
  ContactStatus,
  DashboardSummary,
  InventoryReportRecord,
  InventoryTransaction,
  OrderDetailRecord,
  OrderItem,
  OrderRecord,
  OrderStatus,
  PaymentLookup,
  PaymentRecord,
  PaginationMeta,
  RevenueReportPoint,
  Role,
  Settings,
  TopCustomerReportRecord,
  UserStatus,
} from '@/lib/types';

export async function getDashboard() {
  const { data } = await apiRequest<DashboardSummary>('/api/reports/dashboard', { auth: true });
  return data;
}

interface AdminReportQuery {
  from?: string;
  to?: string;
  limit?: number;
}

export async function getRevenueReport(query: Pick<AdminReportQuery, 'from' | 'to'> = {}) {
  const { data } = await apiRequest<RevenueReportPoint[]>('/api/reports/revenue', {
    auth: true,
    query,
  });
  return data;
}

export async function getBestSellerReport(query: AdminReportQuery = {}) {
  const { data } = await apiRequest<BestSellerReportRecord[]>('/api/reports/best-sellers', {
    auth: true,
    query: { limit: query.limit ?? 5, from: query.from, to: query.to },
  });
  return data;
}

export async function getInventoryReport() {
  const { data } = await apiRequest<InventoryReportRecord[]>('/api/reports/inventory', {
    auth: true,
  });
  return data;
}

export async function getCancelledOrdersReport(query: Pick<AdminReportQuery, 'from' | 'to'> = {}) {
  const { data } = await apiRequest<CancelledOrderReportRecord[]>('/api/reports/cancelled', {
    auth: true,
    query,
  });
  return data;
}

export async function getTopCustomersReport(query: AdminReportQuery = {}) {
  const { data } = await apiRequest<TopCustomerReportRecord[]>('/api/reports/top-customers', {
    auth: true,
    query: { limit: query.limit ?? 5, from: query.from, to: query.to },
  });
  return data;
}

interface ActivityLogQuery {
  page?: number;
  limit?: number;
  userId?: string;
  entityType?: string;
  action?: string;
}

export async function getActivityLogs(query: ActivityLogQuery = {}) {
  const response = await apiRequest<ActivityLogRecord[]>('/api/activity-logs', {
    auth: true,
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 12,
      userId: query.userId,
      entityType: query.entityType,
      action: query.action,
    },
  });

  return {
    items: response.data,
    meta: response.meta as PaginationMeta | undefined,
  };
}

const DASHBOARD_SNAPSHOT_LIMIT = 6;

export async function getRecentOrdersSnapshot() {
  const response = await apiRequest<OrderRecord[]>('/api/orders', {
    auth: true,
    query: { page: 1, limit: DASHBOARD_SNAPSHOT_LIMIT },
  });
  return response.data;
}

interface AdminOrdersQuery {
  page?: number;
  limit?: number;
  status?: OrderStatus;
  search?: string;
  userId?: string;
}

export interface AdminOrderRecord extends OrderRecord {
  user?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface AdminOrderDetailItem extends OrderItem {
  book?: {
    id: string;
    slug: string;
    coverImage?: string | null;
  } | null;
}

export interface AdminOrderDetailRecord extends Omit<OrderDetailRecord, 'items'> {
  items: AdminOrderDetailItem[];
  user?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string | null;
  } | null;
  payment: PaymentRecord | null;
}

export async function getAdminOrders(query: AdminOrdersQuery = {}) {
  const response = await apiRequest<AdminOrderRecord[]>('/api/orders', {
    auth: true,
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      search: query.search,
      userId: query.userId,
    },
  });

  return {
    items: response.data,
    meta: response.meta as PaginationMeta | undefined,
  };
}

export async function getAdminOrderById(orderId: string) {
  const { data } = await apiRequest<AdminOrderDetailRecord>(`/api/orders/${orderId}`, {
    auth: true,
  });
  return data;
}

export async function getAdminPaymentByOrder(orderId: string) {
  const { data } = await apiRequest<PaymentLookup>(`/api/payments/${orderId}`, {
    auth: true,
  });
  return data;
}

export async function getRecentContactsSnapshot() {
  const response = await apiRequest<ContactRecord[]>('/api/contacts', {
    auth: true,
    query: { page: 1, limit: DASHBOARD_SNAPSHOT_LIMIT },
  });
  return response.data;
}

interface AdminContactsQuery {
  page?: number;
  limit?: number;
  status?: ContactStatus;
  search?: string;
}

export async function getAdminContacts(query: AdminContactsQuery = {}) {
  const response = await apiRequest<ContactRecord[]>('/api/contacts', {
    auth: true,
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      status: query.status,
      search: query.search,
    },
  });

  return {
    items: response.data,
    meta: response.meta as PaginationMeta | undefined,
  };
}

export async function getAdminContactById(contactId: string) {
  const { data } = await apiRequest<ContactRecord>(`/api/contacts/${contactId}`, {
    auth: true,
  });
  return data;
}

export async function updateContact(
  contactId: string,
  payload: { status?: ContactStatus; note?: string | null; assignedTo?: string | null },
) {
  const { data } = await apiRequest<ContactRecord>(`/api/contacts/${contactId}`, {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}

export async function deleteAdminContact(contactId: string) {
  await apiRequest(`/api/contacts/${contactId}`, {
    auth: true,
    method: 'DELETE',
  });
}

interface InventoryTransactionQuery {
  page?: number;
  limit?: number;
  bookId?: string;
  type?: string;
}

export async function getInventoryTransactions(query: InventoryTransactionQuery = {}) {
  const response = await apiRequest<InventoryTransaction[]>('/api/inventory/transactions', {
    auth: true,
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 6,
      bookId: query.bookId,
      type: query.type,
    },
  });
  return response.data;
}

export async function downloadInvoice(orderId: string) {
  return apiBlob(`/api/orders/${orderId}/invoice`, { auth: true });
}

export async function downloadDeliveryNote(orderId: string) {
  return apiBlob(`/api/orders/${orderId}/delivery-note`, { auth: true });
}

export async function updateOrderStatus(
  orderId: string,
  payload: { orderStatus: Exclude<OrderStatus, 'pending'>; cancelledReason?: string },
) {
  const { data } = await apiRequest<OrderRecord>(`/api/orders/${orderId}/status`, {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}

export type AdminBookStatus = 'active' | 'out_of_stock' | 'discontinued';

interface AdminListQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface AdminBookRecord {
  id: string;
  title: string;
  slug: string;
  isbn?: string | null;
  description?: string | null;
  coverImage?: string | null;
  publicationYear?: number | null;
  pageCount?: number | null;
  price: number;
  importPrice?: number | null;
  stockQuantity: number;
  soldQuantity?: number;
  categoryId?: string | null;
  authorId?: string | null;
  publisherId?: string | null;
  status: AdminBookStatus;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  author?: {
    id: string;
    name: string;
  } | null;
  publisher?: {
    id: string;
    name: string;
  } | null;
  images?: BookImage[];
}

export interface AdminBookPayload {
  title: string;
  slug: string;
  isbn?: string;
  price: number;
  description?: string;
  publicationYear?: number;
  pageCount?: number;
  importPrice?: number;
  stockQuantity?: number;
  categoryId?: string | null;
  authorId?: string | null;
  publisherId?: string | null;
  status?: AdminBookStatus;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
}

export interface AdminInventoryPayload {
  bookId: string;
  quantity: number;
  unitCost?: number;
  note?: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  avatar?: string | null;
  role: Role;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminVoucher {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderValue?: number | null;
  maxDiscountValue?: number | null;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount?: number | null;
  status: boolean;
  createdAt?: string;
}

export interface AdminCategoryPayload {
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  status?: boolean;
}

export interface AdminAuthorPayload {
  name: string;
  bio?: string;
  status?: boolean;
}

export interface AdminPublisherPayload {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  status?: boolean;
}

export interface AdminBannerPayload {
  title: string;
  link?: string;
  startDate?: string;
  endDate?: string;
  status?: boolean;
  sortOrder?: number;
}

export async function getAdminBooks(query: AdminListQuery = {}) {
  const response = await apiRequest<AdminBookRecord[]>('/api/books', {
    auth: true,
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
    },
  });
  return response.data;
}

export async function createInventoryImport(payload: AdminInventoryPayload) {
  const { data } = await apiRequest<InventoryTransaction>('/api/inventory/import', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function createInventoryExport(payload: AdminInventoryPayload) {
  const { data } = await apiRequest<InventoryTransaction>('/api/inventory/export', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function createInventoryAdjustment(payload: AdminInventoryPayload) {
  const { data } = await apiRequest<InventoryTransaction>('/api/inventory/adjustment', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function getAdminCategories(query: AdminListQuery = {}) {
  const response = await apiRequest<AdminCategoryRecord[]>('/api/categories', {
    auth: true,
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 100,
      search: query.search,
    },
  });

  return {
    items: response.data,
    meta: response.meta as PaginationMeta | undefined,
  };
}

export async function createAdminCategory(payload: AdminCategoryPayload) {
  const { data } = await apiRequest<AdminCategoryRecord>('/api/categories', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function updateAdminCategory(categoryId: string, payload: Partial<AdminCategoryPayload>) {
  const { data } = await apiRequest<AdminCategoryRecord>(`/api/categories/${categoryId}`, {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}

export async function deleteAdminCategory(categoryId: string) {
  await apiRequest(`/api/categories/${categoryId}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function getAdminAuthors(query: AdminListQuery = {}) {
  const response = await apiRequest<AdminAuthorRecord[]>('/api/authors', {
    auth: true,
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 100,
      search: query.search,
    },
  });

  return {
    items: response.data,
    meta: response.meta as PaginationMeta | undefined,
  };
}

export async function createAdminAuthor(payload: AdminAuthorPayload) {
  const { data } = await apiRequest<AdminAuthorRecord>('/api/authors', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function updateAdminAuthor(authorId: string, payload: Partial<AdminAuthorPayload>) {
  const { data } = await apiRequest<AdminAuthorRecord>(`/api/authors/${authorId}`, {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}

export async function uploadAdminAuthorAvatar(authorId: string, file: File) {
  const formData = new FormData();
  formData.append('avatar', file);

  const { data } = await apiRequest<AdminAuthorRecord>(`/api/authors/${authorId}/avatar`, {
    auth: true,
    method: 'POST',
    formData,
  });
  return data;
}

export async function deleteAdminAuthor(authorId: string) {
  await apiRequest(`/api/authors/${authorId}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function getAdminPublishers(query: AdminListQuery = {}) {
  const response = await apiRequest<AdminPublisherRecord[]>('/api/publishers', {
    auth: true,
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 100,
      search: query.search,
    },
  });

  return {
    items: response.data,
    meta: response.meta as PaginationMeta | undefined,
  };
}

export async function createAdminPublisher(payload: AdminPublisherPayload) {
  const { data } = await apiRequest<AdminPublisherRecord>('/api/publishers', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function updateAdminPublisher(publisherId: string, payload: Partial<AdminPublisherPayload>) {
  const { data } = await apiRequest<AdminPublisherRecord>(`/api/publishers/${publisherId}`, {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}

export async function deleteAdminPublisher(publisherId: string) {
  await apiRequest(`/api/publishers/${publisherId}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function getAdminBanners() {
  const { data } = await apiRequest<Banner[]>('/api/banners/all', {
    auth: true,
  });
  return data;
}

export async function createAdminBanner(payload: AdminBannerPayload, file: File) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('title', payload.title);
  if (payload.link) formData.append('link', payload.link);
  if (payload.startDate) formData.append('startDate', payload.startDate);
  if (payload.endDate) formData.append('endDate', payload.endDate);
  if (payload.status !== undefined) formData.append('status', String(payload.status));
  if (payload.sortOrder !== undefined) formData.append('sortOrder', String(payload.sortOrder));

  const { data } = await apiRequest<Banner>('/api/banners', {
    auth: true,
    method: 'POST',
    formData,
  });
  return data;
}

export async function updateAdminBanner(bannerId: string, payload: Partial<AdminBannerPayload>) {
  const { data } = await apiRequest<Banner>(`/api/banners/${bannerId}`, {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}

export async function deleteAdminBanner(bannerId: string) {
  await apiRequest(`/api/banners/${bannerId}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function createAdminBook(payload: AdminBookPayload) {
  const { data } = await apiRequest<AdminBookRecord>('/api/books', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function updateAdminBook(bookId: string, payload: Partial<AdminBookPayload>) {
  const { data } = await apiRequest<AdminBookRecord>(`/api/books/${bookId}`, {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}

export async function uploadAdminBookCover(bookId: string, file: File) {
  const formData = new FormData();
  formData.append('cover', file);

  const { data } = await apiRequest<AdminBookRecord>(`/api/books/${bookId}/cover`, {
    auth: true,
    method: 'POST',
    formData,
  });
  return data;
}

export async function uploadAdminBookImages(bookId: string, files: File[]) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }

  const { data } = await apiRequest<BookImage[]>(`/api/books/${bookId}/images`, {
    auth: true,
    method: 'POST',
    formData,
  });
  return data;
}

export async function deleteAdminBookImage(bookId: string, imageId: string) {
  await apiRequest(`/api/books/${bookId}/images/${imageId}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function deleteAdminBook(bookId: string) {
  await apiRequest(`/api/books/${bookId}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function getAdminCustomers() {
  const response = await apiRequest<AdminUser[]>('/api/users', {
    auth: true,
    query: { page: 1, limit: 20, role: 'customer' },
  });
  return response.data;
}

interface AdminUserListQuery extends AdminListQuery {
  role?: Role;
  status?: UserStatus;
}

export interface AdminUserCreatePayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  role: Role;
}

export interface AdminUserUpdatePayload {
  fullName?: string;
  phone?: string;
  role?: Role;
}

export async function getAdminUsers(query: AdminUserListQuery = {}) {
  const response = await apiRequest<AdminUser[]>('/api/users', {
    auth: true,
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      role: query.role,
      status: query.status,
    },
  });

  return {
    items: response.data,
    meta: response.meta as PaginationMeta | undefined,
  };
}

export async function createAdminUser(payload: AdminUserCreatePayload) {
  const { data } = await apiRequest<AdminUser>('/api/users', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function updateAdminUser(userId: string, payload: AdminUserUpdatePayload) {
  const { data } = await apiRequest<AdminUser>(`/api/users/${userId}`, {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}

export async function updateAdminUserStatus(userId: string, status: UserStatus) {
  const { data } = await apiRequest<AdminUser>(`/api/users/${userId}/status`, {
    auth: true,
    method: 'PATCH',
    json: { status },
  });
  return data;
}

export async function updateCustomerStatus(userId: string, status: UserStatus) {
  return updateAdminUserStatus(userId, status);
}

export async function deleteAdminUser(userId: string) {
  await apiRequest(`/api/users/${userId}`, {
    auth: true,
    method: 'DELETE',
  });
}

interface AdminVoucherListQuery extends AdminListQuery {
  status?: 'true' | 'false';
}

export async function getAdminVouchers(query: AdminVoucherListQuery = {}) {
  const response = await apiRequest<AdminVoucher[]>('/api/vouchers', {
    auth: true,
    query: {
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      search: query.search,
      status: query.status,
    },
  });
  return {
    items: response.data,
    meta: response.meta as PaginationMeta | undefined,
  };
}

export interface AdminVoucherPayload {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minOrderValue?: number;
  maxDiscountValue?: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  status: boolean;
}

export async function createAdminVoucher(payload: AdminVoucherPayload) {
  const { data } = await apiRequest<AdminVoucher>('/api/vouchers', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function updateAdminVoucher(voucherId: string, payload: Partial<AdminVoucherPayload>) {
  const { data } = await apiRequest<AdminVoucher>(`/api/vouchers/${voucherId}`, {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}

export async function deleteAdminVoucher(voucherId: string) {
  await apiRequest(`/api/vouchers/${voucherId}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function updateAdminSettings(payload: {
  storeName?: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  shippingFee?: number;
  supportHours?: string | null;
  paymentProviderName?: string | null;
  paymentInstructions?: string | null;
}) {
  const { data } = await apiRequest<Settings>('/api/settings', {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}
