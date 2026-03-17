import { apiRequest } from '@/lib/api-client';
import type { HomeData, Settings } from '@/lib/types';

export async function getHome(limit = 6) {
  const { data } = await apiRequest<HomeData>('/api/home', {
    query: { limit },
  });
  return data;
}

export async function getSettings() {
  const { data } = await apiRequest<Settings>('/api/settings');
  return data;
}
