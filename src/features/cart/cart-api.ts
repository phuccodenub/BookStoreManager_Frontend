import { apiRequest } from '@/lib/api-client';
import type { Address, Cart, OrderRecord, Settings } from '@/lib/types';

export async function getCart() {
  const { data } = await apiRequest<Cart>('/api/cart', { auth: true });
  return data;
}

export async function addCartItem(payload: { bookId: string; quantity: number }) {
  const { data } = await apiRequest('/api/cart/items', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function updateCartItem(itemId: string, payload: { quantity?: number; selected?: boolean }) {
  const { data } = await apiRequest(`/api/cart/items/${itemId}`, {
    auth: true,
    method: 'PATCH',
    json: payload,
  });
  return data;
}

export async function removeCartItem(itemId: string) {
  await apiRequest(`/api/cart/items/${itemId}`, {
    auth: true,
    method: 'DELETE',
  });
}

export async function getAddresses() {
  const { data } = await apiRequest<Address[]>('/api/addresses', { auth: true });
  return data;
}

export async function getSettings() {
  const { data } = await apiRequest<Settings>('/api/settings');
  return data;
}

export async function createOrder(payload: {
  addressId: string;
  paymentMethod: 'cod' | 'online';
  voucherCode?: string;
  note?: string;
  cartItemIds?: string[];
}) {
  const { data } = await apiRequest<OrderRecord>('/api/orders', {
    auth: true,
    method: 'POST',
    json: payload,
  });
  return data;
}
