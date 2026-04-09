import { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import heroImage from '@/assets/hero.png';
import { forgotPassword, resetPassword } from '@/features/auth/auth-api';
import { useAuth } from '@/features/auth/AuthContext';
import type { Role } from '@/lib/types';
import { getDefaultAdminPathForRole, isPrivilegedRole } from '@/features/auth/role-access';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

const demoAccounts = [
  { label: 'Admin DEV', email: 'admin@bookstore.com', password: 'Password123!' },
  { label: 'Staff DEV', email: 'staff@bookstore.com', password: 'Password123!' },
  { label: 'Customer DEV', email: 'customer@bookstore.com', password: 'Password123!' },
] as const;

const modeCopy: Record<AuthMode, { title: string; description: string; action: string }> = {
  login: {
    title: 'Chào mừng bạn quay lại với MMT Hiệu Sách.',
    description: 'Đăng nhập để tiếp tục mua sách, quản lý danh sách yêu thích và theo dõi đơn hàng của bạn.',
    action: 'Đăng nhập',
  },
  register: {
    title: 'Tạo tài khoản mới để bắt đầu hành trình đọc sách.',
    description: 'Chỉ với vài thông tin cơ bản, bạn có thể lưu wishlist, đặt hàng và theo dõi trạng thái giao nhận.',
    action: 'Đăng ký ngay',
  },
  forgot: {
    title: 'Yêu cầu đặt lại mật khẩu trong vài bước rõ ràng.',
    description: 'Nhập email để nhận hướng dẫn và tiếp tục sử dụng tài khoản của bạn một cách an toàn.',
    action: 'Gửi yêu cầu',
  },
  reset: {
    title: 'Nhập mã xác nhận để hoàn tất việc đặt lại mật khẩu.',
    description: 'Tạo mật khẩu mới để quay lại mua sắm và quản lý đơn hàng bình thường.',
    action: 'Cập nhật mật khẩu',
  },
};
const showDemoAccounts = import.meta.env.DEV;

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const resetTokenFromUrl = searchParams.get('token') ?? '';
  const modeFromUrl = searchParams.get('mode');
  const isSwitchMode = searchParams.get('switch') === '1';
  const initialMode: AuthMode = resetTokenFromUrl ? 'reset' : modeFromUrl === 'register' ? 'register' : 'login';
  const { login, register, logout, session } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isBusy, setIsBusy] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetForm, setResetForm] = useState({
    token: resetTokenFromUrl,
    newPassword: '',
  });

  function resolveRedirectForRole(role: Role) {
    const state = location.state as { from?: string } | null;
    if (state?.from) {
      if (state.from.startsWith('/admin') && !isPrivilegedRole(role)) {
        return '/account';
      }

      return state.from;
    }

    return isPrivilegedRole(role) ? getDefaultAdminPathForRole(role) : '/account';
  }

  const authenticatedRedirectTo = useMemo(() => {
    if (!session) {
      return '/account';
    }

    return resolveRedirectForRole(session.user.role);
  }, [session, location.state]);

  const copy = modeCopy[mode];
  const shouldShowSwitchBarrier = Boolean(session && isSwitchMode);

  if (session && !isSwitchMode) {
    return <Navigate replace to={authenticatedRedirectTo} />;
  }

  function syncMode(nextMode: AuthMode, options?: { preserveSuccess?: boolean }) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextMode === 'register') {
      nextParams.set('mode', 'register');
    } else {
      nextParams.delete('mode');
    }
    if (isSwitchMode) {
      nextParams.set('switch', '1');
    }
    if (nextMode !== 'reset') {
      nextParams.delete('token');
    }

    setSearchParams(nextParams, { replace: true });
    setMode(nextMode);
    setErrorMessage(null);
    if (!options?.preserveSuccess) {
      setSuccessMessage(null);
    }
  }

  async function handleLogoutCurrentSession() {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoggingOut(true);

    try {
      await logout();
      setSuccessMessage('Phiên hiện tại đã được đăng xuất. Bạn có thể đăng nhập bằng tài khoản khác.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể đăng xuất phiên hiện tại.');
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function submit() {
    const normalizedForm = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim(),
    };
    const normalizedForgotEmail = forgotEmail.trim();
    const normalizedResetForm = {
      token: resetForm.token.trim(),
      newPassword: resetForm.newPassword,
    };

    if (mode === 'login' && (!normalizedForm.email || !normalizedForm.password)) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu để đăng nhập.');
      return;
    }

    if (mode === 'register' && (!normalizedForm.fullName || !normalizedForm.email || !normalizedForm.password)) {
      setErrorMessage('Đăng ký cần họ tên, email và mật khẩu hợp lệ.');
      return;
    }

    if (mode === 'forgot' && !normalizedForgotEmail) {
      setErrorMessage('Vui lòng nhập email để gửi yêu cầu đặt lại mật khẩu.');
      return;
    }

    if (mode === 'reset' && (!normalizedResetForm.token || !normalizedResetForm.newPassword)) {
      setErrorMessage('Việc đặt lại mật khẩu cần mã xác nhận và mật khẩu mới.');
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === 'login') {
        const nextSession = await login({ email: normalizedForm.email, password: normalizedForm.password });
        navigate(resolveRedirectForRole(nextSession.user.role), { replace: true });
        return;
      }

      if (mode === 'register') {
        const nextSession = await register({
          fullName: normalizedForm.fullName,
          email: normalizedForm.email,
          password: normalizedForm.password,
          phone: normalizedForm.phone || undefined,
        });
        navigate(resolveRedirectForRole(nextSession.user.role), { replace: true });
        return;
      }

      if (mode === 'forgot') {
        await forgotPassword(normalizedForgotEmail);
        setSuccessMessage('Nếu email tồn tại, yêu cầu đặt lại mật khẩu đã được ghi nhận.');
        return;
      }

      await resetPassword(normalizedResetForm.token, normalizedResetForm.newPassword);
      setForm((current) => ({ ...current, password: normalizedResetForm.newPassword }));
      syncMode('login', { preserveSuccess: true });
      setSuccessMessage('Mật khẩu đã được cập nhật. Bạn có thể đăng nhập lại ngay bây giờ.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xử lý yêu cầu xác thực');
    } finally {
      setIsBusy(false);
    }
  }

  async function loginWithCredentials(email: string, password: string) {
    const nextSession = await login({ email, password });
    navigate(resolveRedirectForRole(nextSession.user.role), { replace: true });
  }

  async function handleDevAccountLogin(account: typeof demoAccounts[number]) {
    setMode('login');
    setErrorMessage(null);
    setSuccessMessage(null);
    setForm((current) => ({
      ...current,
      email: account.email,
      password: account.password,
    }));
    setForgotEmail(account.email);
    setIsBusy(true);

    try {
      await loginWithCredentials(account.email, account.password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Không thể đăng nhập nhanh bằng tài khoản DEV');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="auth-shell">
      <article className="auth-card auth-card-form">
        <div className="auth-card-header">
          <p className="eyebrow">MMT Bookstore</p>
          <h2>{mode === 'register' ? 'Đăng ký tài khoản' : mode === 'forgot' ? 'Quên mật khẩu' : mode === 'reset' ? 'Đặt lại mật khẩu' : 'Đăng nhập hệ thống'}</h2>
          <p className="auth-subtext">{copy.description}</p>
        </div>

        {session ? (
          <div className="auth-switch-banner">
            <p className="eyebrow">Đang có phiên hoạt động</p>
            <h3>{session.user.fullName}</h3>
            <p>
              {session.user.role === 'admin' ? 'Quản trị viên' : session.user.role === 'staff' ? 'Nhân viên vận hành' : 'Khách hàng'} • {session.user.email}
            </p>
            <p>Để đổi sang tài khoản khác, hãy đăng xuất phiên hiện tại trước rồi mới đăng nhập lại.</p>
            <div className="inline-actions">
              <button className="button button-secondary" onClick={() => navigate(authenticatedRedirectTo, { replace: true })} type="button">
                Tiếp tục với phiên này
              </button>
              <button className="button button-primary" disabled={isLoggingOut} onClick={() => void handleLogoutCurrentSession()} type="button">
                {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất để đổi tài khoản'}
              </button>
            </div>
          </div>
        ) : null}

        {!shouldShowSwitchBarrier ? (
          <>
            <div className="segmented-control" role="tablist" aria-label="Authentication mode">
              <button className={mode === 'login' ? 'segment-active' : ''} onClick={() => syncMode('login')} type="button">
                Đăng nhập
              </button>
              <button className={mode === 'register' ? 'segment-active' : ''} onClick={() => syncMode('register')} type="button">
                Đăng ký
              </button>
            </div>

            {mode === 'register' ? (
              <label className="field field-wide">
                <span>Họ và tên</span>
                <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
              </label>
            ) : null}

            {(mode === 'login' || mode === 'register') ? (
              <>
                <label className="field field-wide">
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </label>

                <label className="field field-wide">
                  <span>Mật khẩu</span>
                  <input
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                  />
                </label>
              </>
            ) : null}

            {mode === 'register' ? (
              <label className="field field-wide">
                <span>Số điện thoại</span>
                <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </label>
            ) : null}

            {mode === 'forgot' ? (
              <label className="field field-wide">
                <span>Email</span>
                <input autoComplete="email" type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} />
              </label>
            ) : null}

            {mode === 'reset' ? (
              <>
                <label className="field field-wide">
                  <span>Mã xác nhận</span>
                  <input value={resetForm.token} onChange={(event) => setResetForm({ ...resetForm, token: event.target.value })} />
                </label>
                <label className="field field-wide">
                  <span>Mật khẩu mới</span>
                  <input
                    autoComplete="new-password"
                    type="password"
                    value={resetForm.newPassword}
                    onChange={(event) => setResetForm({ ...resetForm, newPassword: event.target.value })}
                  />
                </label>
              </>
            ) : null}

            <div className="utility-row auth-links-row">
              <button className="text-link" onClick={() => syncMode('forgot')} type="button">
                Quên mật khẩu
              </button>
              <button className="text-link" onClick={() => syncMode('reset')} type="button">
                Nhập mã xác nhận
              </button>
              {(mode === 'forgot' || mode === 'reset') ? (
                <button className="text-link" onClick={() => syncMode('login')} type="button">
                  Quay lại đăng nhập
                </button>
              ) : null}
            </div>
          </>
        ) : null}

        {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
        {successMessage ? <p className="feedback-text feedback-text-success">{successMessage}</p> : null}

        {!shouldShowSwitchBarrier ? (
          <button className="button button-primary button-block" disabled={isBusy} onClick={() => void submit()} type="button">
            {isBusy ? 'Đang xử lý...' : copy.action}
          </button>
        ) : null}

        {!shouldShowSwitchBarrier ? (
          <div className="social-row">
            <button className="social-button" disabled type="button">
              Google (sắp có)
            </button>
            <button className="social-button" disabled type="button">
              Facebook (sắp có)
            </button>
          </div>
        ) : null}
      </article>

      <article className="auth-visual-panel">
        <div className="auth-visual-copy">
          <h1>{mode === 'register' ? 'WELCOME' : 'HELLO AGAIN'}</h1>
          <p>{copy.title}</p>
        </div>

        {showDemoAccounts && !shouldShowSwitchBarrier ? (
          <>
            <p className="auth-demo-note">Tài khoản DEV dùng mật khẩu chung `Password123!`. Bấm một chip để đăng nhập nhanh.</p>
            <div className="auth-demo-grid" aria-label="Tài khoản thử nghiệm cho môi trường DEV">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  className="auth-demo-chip"
                  disabled={isBusy || isLoggingOut}
                  onClick={() => void handleDevAccountLogin(account)}
                  type="button"
                >
                  {account.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        <div className="auth-visual-card">
          <img alt="Bookshelf illustration" src={heroImage} />
          <div className="auth-visual-note">
            <strong>Đơn giản, dễ dùng, dễ quản lý.</strong>
            <p>Tài khoản giúp bạn lưu wishlist, theo dõi đơn và quản lý thông tin cá nhân nhất quán.</p>
          </div>
        </div>
      </article>
    </section>
  );
}

export default LoginPage;
