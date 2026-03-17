import { apiRequest } from '@/lib/api-client';
import type { SessionUser } from '@/lib/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export async function login(payload: LoginPayload) {
  const { data } = await apiRequest<LoginResult>('/api/auth/login', {
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function register(payload: RegisterPayload) {
  const { data } = await apiRequest<SessionUser>('/api/auth/register', {
    method: 'POST',
    json: payload,
  });
  return data;
}

export async function logout(refreshToken: string) {
  await apiRequest<null>('/api/auth/logout', {
    method: 'POST',
    json: { refreshToken },
  });
}

export async function forgotPassword(email: string) {
  await apiRequest<null>('/api/auth/forgot-password', {
    method: 'POST',
    json: { email },
  });
}

export async function resetPassword(token: string, newPassword: string) {
  await apiRequest<null>('/api/auth/reset-password', {
    method: 'POST',
    json: { token, newPassword },
  });
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  await apiRequest<null>('/api/auth/change-password', {
    auth: true,
    method: 'POST',
    json: payload,
  });
}
