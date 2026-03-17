import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';

import { queryClient } from '@/app/query-client';
import { ApiError, apiRequest, configureAuthBridge } from '@/lib/api-client';
import type { Role, SessionUser } from '@/lib/types';
import { login as loginApi, logout as logoutApi, register as registerApi, type LoginPayload, type RegisterPayload } from '@/features/auth/auth-api';

const STORAGE_KEY = 'bookstoremanager.session';

const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    fullName: z.string(),
    email: z.string().email(),
    role: z.enum(['customer', 'staff', 'admin']),
    status: z.enum(['active', 'locked']).optional(),
    phone: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
  }),
});

type Session = z.infer<typeof sessionSchema>;

interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  isPrivileged: boolean;
  isHydrating: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): Session | null {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Ignore malformed local storage and fall back to a signed-out state.
  }

  window.localStorage.removeItem(STORAGE_KEY);
  return null;
}

function persistSession(session: Session | null) {
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [isHydrating, setIsHydrating] = useState(true);
  const sessionRef = useRef<Session | null>(session);

  useEffect(() => {
    sessionRef.current = session;
    persistSession(session);
  }, [session]);

  const applySession = useCallback((nextSession: Session | null) => {
    startTransition(() => {
      setSession(nextSession);
    });
  }, []);

  const clearSession = useCallback(() => {
    applySession(null);
    queryClient.clear();
  }, [applySession]);

  useEffect(() => {
    configureAuthBridge({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      getRefreshToken: () => sessionRef.current?.refreshToken ?? null,
      updateTokens: ({ accessToken, refreshToken }) => {
        const current = sessionRef.current;
        if (!current) return;
        applySession({ ...current, accessToken, refreshToken });
      },
      clearSession,
    });
  }, [applySession, clearSession]);

  const refreshProfile = useCallback(async () => {
    if (!sessionRef.current?.accessToken) {
      setIsHydrating(false);
      return;
    }

    try {
      const { data } = await apiRequest<SessionUser>('/api/users/me', { auth: true });
      const current = sessionRef.current;
      if (!current) return;
      applySession({ ...current, user: data });
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        clearSession();
      }
      throw error;
    } finally {
      setIsHydrating(false);
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    void refreshProfile().catch(() => undefined);
  }, [refreshProfile]);

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await loginApi(payload);
    applySession(result);
    await queryClient.invalidateQueries();
  }, [applySession]);

  const register = useCallback(async (payload: RegisterPayload) => {
    await registerApi(payload);
    await login({ email: payload.email, password: payload.password });
  }, [login]);

  const logout = useCallback(() => {
    const refreshToken = sessionRef.current?.refreshToken;
    if (refreshToken) {
      void logoutApi(refreshToken).catch(() => undefined);
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isAuthenticated: Boolean(session),
    isPrivileged: session?.user.role === 'admin' || session?.user.role === 'staff',
    isHydrating,
    login,
    register,
    logout,
    refreshProfile,
  }), [isHydrating, login, logout, refreshProfile, register, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function RequireAuth({ children }: PropsWithChildren) {
  const { isAuthenticated, isHydrating } = useAuth();
  const location = useLocation();

  if (isHydrating) {
    return <div className="page-loading">Hydrating session...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  return <>{children}</>;
}

interface RequireRoleProps extends PropsWithChildren {
  roles: Role[];
}

export function RequireRole({ children, roles }: RequireRoleProps) {
  const { session, isHydrating } = useAuth();

  if (isHydrating) {
    return <div className="page-loading">Hydrating session...</div>;
  }

  if (!session || !roles.includes(session.user.role)) {
    return <Navigate replace to="/account" />;
  }

  return <>{children}</>;
}

