import { apiRequest } from '@/lib/api-client';
import type { Address, OrderDetailRecord, OrderRecord, PaymentLookup, SessionUser } from '@/lib/types';

export async function getProfile() {
  const { data } = await apiRequest<SessionUser>('/api/users/me', { auth: true });
  return data;
}

export async function getAddresses() {
  const { data } = await apiRequest<Address[]>('/api/addresses', { auth: true });
  return data;
}

export async function createAddress(payload: Omit<Address, 'id'>) {
  const { data } = await apiRequest<Address>('/api/addresses', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

function normalizeOrderLimit(limit: unknown, fallback = 20) {
  if (typeof limit === 'number' && Number.isFinite(limit)) {
    return limit;
  }

  if (typeof limit === 'string') {
    const parsed = Number(limit);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export async function getMyOrders(limit?: number) {
  const safeLimit = normalizeOrderLimit(limit);
  const response = await apiRequest<OrderRecord[]>('/api/orders/me', {
    auth: true,
    query: { page: 1, limit: safeLimit },
  });
  return response.data;
}

export async function getMyOrder(orderId: string) {
  const { data } = await apiRequest<OrderDetailRecord>(`/api/orders/me/${orderId}`, {
    auth: true,
  });
  return data;
}

export async function getPaymentByOrder(orderId: string) {
  const { data } = await apiRequest<PaymentLookup>(`/api/payments/${orderId}`, {
    auth: true,
  });
  return data;
}

export async function cancelOrder(orderId: string, cancelledReason: string) {
  const { data } = await apiRequest<OrderRecord>(`/api/orders/me/${orderId}/cancel`, {
    auth: true,
    method: 'PATCH',
    json: { cancelledReason },
  });
  return data;
}
