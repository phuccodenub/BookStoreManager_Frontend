import { apiRequest } from '@/lib/api-client';
import type { ContactRecord } from '@/lib/types';

export interface ContactPayload {
  customerName: string;
  email: string;
  phone?: string;
  subject: string;
  content: string;
}

export async function createContact(payload: ContactPayload) {
  const { data } = await apiRequest<ContactRecord>('/api/contacts', {
    method: 'POST',
    json: payload,
  });
  return data;
}
