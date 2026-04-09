import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { flushSync } from 'react-dom';
import { Navigate, useLocation } from 'react-router-dom';
import { z } from 'zod';

import { queryClient } from '@/app/query-client';
import EmptyState from '@/components/EmptyState';
import PageLoadingState from '@/components/PageLoadingState';
import { ApiError, apiRequest, configureAuthBridge } from '@/lib/api-client';
import type { Role, SessionUser } from '@/lib/types';
import {
  login as loginApi,
  logout as logoutApi,
  refreshSession,
  register as registerApi,
  type LoginPayload,
  type RegisterPayload,
} from '@/features/auth/auth-api';
import {
  canAccessAdminSection,
  getDefaultAdminPathForRole,
  isPrivilegedRole,
  type AdminSectionId,
} from '@/features/auth/role-access';

const sessionSchema = z.object({
  accessToken: z.string(),
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
type AuthBroadcastMessage = { type: 'login' | 'logout' };
const AUTH_CHANNEL_NAME = 'bookstoremanager.auth';

interface AuthContextValue {
  session: Session | null;
  isAuthenticated: boolean;
  isPrivileged: boolean;
  isHydrating: boolean;
  restoreError: string | null;
  login: (payload: LoginPayload) => Promise<Session>;
  register: (payload: RegisterPayload) => Promise<Session>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  retryRestore: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(session);
  const authChannelRef = useRef<BroadcastChannel | null>(null);
  const refreshProfilePromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const applySession = useCallback((nextSession: Session | null, sync = false) => {
    if (sync) {
      flushSync(() => {
        setSession(nextSession);
      });
      return;
    }

    setSession(nextSession);
  }, []);

  const clearSession = useCallback(() => {
    setRestoreError(null);
    applySession(null, true);
    queryClient.clear();
  }, [applySession]);

  const broadcastAuthEvent = useCallback((type: AuthBroadcastMessage['type']) => {
    authChannelRef.current?.postMessage({ type } satisfies AuthBroadcastMessage);
  }, []);

  useEffect(() => {
    configureAuthBridge({
      getAccessToken: () => sessionRef.current?.accessToken ?? null,
      updateAccessToken: (accessToken) => {
        const current = sessionRef.current;
        if (!current) return;
        applySession({ ...current, accessToken });
      },
      clearSession,
    });
  }, [applySession, clearSession]);

  const refreshProfile = useCallback(async () => {
    if (refreshProfilePromiseRef.current) {
      return refreshProfilePromiseRef.current;
    }

    const task = (async () => {
      const hadSession = Boolean(sessionRef.current);
      setRestoreError(null);

      try {
        let accessToken = sessionRef.current?.accessToken ?? null;

        if (!accessToken) {
          try {
            const refreshed = await refreshSession();
            accessToken = refreshed.accessToken;
          } catch (error) {
            if (error instanceof ApiError && [401, 403].includes(error.status)) {
              clearSession();
              return;
            }

            if (!hadSession) {
              setRestoreError(error instanceof Error ? error.message : 'Không thể khôi phục phiên đăng nhập lúc này.');
              return;
            }

            throw error;
          }
        }

        const { data } = await apiRequest<SessionUser>('/api/users/me', {
          auth: true,
          accessTokenOverride: accessToken,
        });

        if (!accessToken) {
          clearSession();
          return;
        }

        applySession({ accessToken, user: data }, true);
      } catch (error) {
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          clearSession();
          return;
        }

        if (!hadSession) {
          setRestoreError(error instanceof Error ? error.message : 'Không thể khôi phục phiên đăng nhập lúc này.');
          return;
        }

        throw error;
      } finally {
        setIsHydrating(false);
      }
    })();

    refreshProfilePromiseRef.current = task.finally(() => {
      refreshProfilePromiseRef.current = null;
    });

    return refreshProfilePromiseRef.current;
  }, [applySession, clearSession]);

  useEffect(() => {
    void refreshProfile().catch(() => undefined);
  }, [refreshProfile]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return undefined;
    }

    const channel = new BroadcastChannel(AUTH_CHANNEL_NAME);
    authChannelRef.current = channel;

    channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
      if (event.data?.type === 'logout') {
        clearSession();
        setIsHydrating(false);
        return;
      }

      if (event.data?.type === 'login') {
        setIsHydrating(true);
        setRestoreError(null);
        void refreshProfile().catch(() => undefined);
      }
    };

    return () => {
      if (authChannelRef.current === channel) {
        authChannelRef.current = null;
      }
      channel.close();
    };
  }, [clearSession, refreshProfile]);

  const login = useCallback(async (payload: LoginPayload) => {
    const result = await loginApi(payload);
    setRestoreError(null);
    applySession(result, true);
    broadcastAuthEvent('login');
    void queryClient.invalidateQueries();
    return result;
  }, [applySession, broadcastAuthEvent]);

  const register = useCallback(async (payload: RegisterPayload) => {
    await registerApi(payload);
    return login({ email: payload.email, password: payload.password });
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
      clearSession();
      broadcastAuthEvent('logout');
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        clearSession();
        broadcastAuthEvent('logout');
        return;
      }

      throw error;
    }
  }, [broadcastAuthEvent, clearSession]);

  const retryRestore = useCallback(() => {
    setIsHydrating(true);
    setRestoreError(null);
    void refreshProfile().catch(() => undefined);
  }, [refreshProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    isAuthenticated: Boolean(session),
    isPrivileged: isPrivilegedRole(session?.user.role),
    isHydrating,
    restoreError,
    login,
    register,
    logout,
    refreshProfile,
    retryRestore,
  }), [isHydrating, login, logout, refreshProfile, register, restoreError, retryRestore, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

function AuthRestoreErrorState() {
  const { restoreError, retryRestore } = useAuth();

  return (
    <div className="page-frame">
      <EmptyState
        eyebrow="Khôi phục phiên chưa thành công"
        title="Không thể xác minh phiên đăng nhập lúc này"
        description={restoreError ?? 'Kết nối tới dịch vụ xác thực đang tạm thời gián đoạn. Bạn có thể thử lại ngay trên trang này.'}
      >
        <button className="button button-primary" onClick={retryRestore} type="button">
          Thử khôi phục lại phiên
        </button>
      </EmptyState>
    </div>
  );
}

export function RequireAuth({ children }: PropsWithChildren) {
  const { isAuthenticated, isHydrating, restoreError } = useAuth();
  const location = useLocation();

  if (isHydrating) {
    return <PageLoadingState title="Đang khôi phục phiên đăng nhập" description="Hệ thống đang đồng bộ phiên làm việc trước khi mở nội dung được bảo vệ." />;
  }

  if (restoreError && !isAuthenticated) {
    return <AuthRestoreErrorState />;
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
  const { session, isHydrating, restoreError } = useAuth();
  const location = useLocation();

  if (isHydrating) {
    return <PageLoadingState title="Đang xác thực quyền truy cập" description="Hệ thống đang kiểm tra phiên làm việc và vai trò hiện tại của bạn." />;
  }

  if (restoreError && !session) {
    return <AuthRestoreErrorState />;
  }

  if (!session) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (!roles.includes(session.user.role)) {
    return <Navigate replace to="/account" />;
  }

  return <>{children}</>;
}

interface RequireAdminSectionProps extends PropsWithChildren {
  section: AdminSectionId;
}

export function RequireAdminSection({ children, section }: RequireAdminSectionProps) {
  const { session, isHydrating, restoreError } = useAuth();
  const location = useLocation();

  if (isHydrating) {
    return <PageLoadingState title="Đang tải khu vực quản trị" description="Hệ thống đang kiểm tra vai trò và phạm vi thao tác được phép của bạn." />;
  }

  if (restoreError && !session) {
    return <AuthRestoreErrorState />;
  }

  if (!session || !isPrivilegedRole(session.user.role)) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (!canAccessAdminSection(session.user.role, section)) {
    return <Navigate replace to={getDefaultAdminPathForRole(session.user.role)} />;
  }

  return <>{children}</>;
}

