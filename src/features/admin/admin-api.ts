import { apiBlob, apiRequest } from '@/lib/api-client';
import type { ContactRecord, DashboardSummary, InventoryTransaction, OrderRecord } from '@/lib/types';

export async function getDashboard() {
  const { data } = await apiRequest<DashboardSummary>('/api/reports/dashboard', { auth: true });
  return data;
}

export async function getOrders() {
  const response = await apiRequest<OrderRecord[]>('/api/orders', {
    auth: true,
    query: { page: 1, limit: 6 },
  });
  return response.data;
}

export async function getContacts() {
  const response = await apiRequest<ContactRecord[]>('/api/contacts', {
    auth: true,
    query: { page: 1, limit: 6 },
  });
  return response.data;
}

export async function getInventoryTransactions() {
  const response = await apiRequest<InventoryTransaction[]>('/api/inventory/transactions', {
    auth: true,
    query: { page: 1, limit: 6 },
  });
  return response.data;
}

export async function downloadInvoice(orderId: string) {
  return apiBlob(`/api/orders/${orderId}/invoice`, { auth: true });
}

export async function downloadDeliveryNote(orderId: string) {
  return apiBlob(`/api/orders/${orderId}/delivery-note`, { auth: true });
}
