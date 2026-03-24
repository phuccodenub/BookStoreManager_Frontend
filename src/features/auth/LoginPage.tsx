import { startTransition, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import heroImage from '@/assets/hero.png';
import { forgotPassword, resetPassword } from '@/features/auth/auth-api';
import { useAuth } from '@/features/auth/AuthContext';

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
  const initialMode: AuthMode = resetTokenFromUrl ? 'reset' : modeFromUrl === 'register' ? 'register' : 'login';
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isBusy, setIsBusy] = useState(false);
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

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from ?? '/account';
  }, [location.state]);

  const copy = modeCopy[mode];

  function syncMode(nextMode: AuthMode, options?: { preserveSuccess?: boolean }) {
    const nextParams = new URLSearchParams(searchParams);
    if (nextMode === 'register') {
      nextParams.set('mode', 'register');
    } else {
      nextParams.delete('mode');
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
        await login({ email: normalizedForm.email, password: normalizedForm.password });
        startTransition(() => {
          navigate(redirectTo, { replace: true });
        });
        return;
      }

      if (mode === 'register') {
        await register({
          fullName: normalizedForm.fullName,
          email: normalizedForm.email,
          password: normalizedForm.password,
          phone: normalizedForm.phone || undefined,
        });
        startTransition(() => {
          navigate(redirectTo, { replace: true });
        });
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

  return (
    <section className="auth-shell">
      <article className="auth-visual-panel">
        <div className="auth-visual-copy">
          <p className="eyebrow">MMT Hiệu Sách</p>
          <h1>{copy.title}</h1>
          <p>{copy.description}</p>
        </div>

        {showDemoAccounts ? (
          <div className="auth-demo-grid" aria-label="Tài khoản thử nghiệm cho môi trường DEV">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                className="auth-demo-chip"
                onClick={() => {
                  setForm((current) => ({ ...current, email: account.email, password: account.password }));
                  setForgotEmail(account.email);
                }}
                type="button"
              >
                {account.label}
              </button>
            ))}
          </div>
        ) : null}

        <div className="auth-visual-card">
          <img alt="Bookshelf illustration" src={heroImage} />
          <div className="auth-visual-note">
            <strong>Đăng nhập nhanh, mua sách dễ.</strong>
            <p>Tài khoản của bạn sẽ đồng bộ thông tin đơn hàng, địa chỉ nhận hàng và danh sách yêu thích trên toàn bộ cửa hàng.</p>
          </div>
        </div>
      </article>

      <article className="auth-card">
        <div className="auth-card-header">
          <p className="eyebrow">Tài khoản</p>
          <h2>{mode === 'register' ? 'Đăng ký tài khoản' : mode === 'forgot' ? 'Quên mật khẩu' : mode === 'reset' ? 'Đặt lại mật khẩu' : 'Đăng nhập'}</h2>
        </div>

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

        {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
        {successMessage ? <p className="feedback-text feedback-text-success">{successMessage}</p> : null}

        <button className="button button-primary button-block" disabled={isBusy} onClick={() => void submit()} type="button">
          {isBusy ? 'Đang xử lý...' : copy.action}
        </button>

        <div className="social-row">
          <button className="social-button" disabled type="button">
            Google (sắp có)
          </button>
          <button className="social-button" disabled type="button">
            Facebook (sắp có)
          </button>
        </div>
      </article>
    </section>
  );
}

export default LoginPage;

