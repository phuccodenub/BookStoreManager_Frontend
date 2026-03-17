import { startTransition, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { forgotPassword, resetPassword } from '@/features/auth/auth-api';
import { ApiError } from '@/lib/api-client';
import { useAuth } from '@/features/auth/AuthContext';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

const demoAccounts = [
  { label: 'Admin demo', email: 'admin@bookstore.com', password: 'Password123!' },
  { label: 'Staff demo', email: 'staff@bookstore.com', password: 'Password123!' },
  { label: 'Customer demo', email: 'customer@bookstore.com', password: 'Password123!' },
] as const;

const modeCopy: Record<AuthMode, { title: string; description: string; action: string }> = {
  login: {
    title: 'Start with live tokens, not mocked sessions.',
    description: 'Sign in against the real backend contract and carry the session across protected customer and staff routes.',
    action: 'Sign in',
  },
  register: {
    title: 'Create a real customer account against the backend.',
    description: 'Registration is already wired to the live API, so this is a good way to validate the end-to-end auth shell.',
    action: 'Create account',
  },
  forgot: {
    title: 'Trigger the password recovery flow without waiting for final UI.',
    description: 'The backend returns a generic success message by design. In local development, use the mock reset token channel you already configured on the backend side.',
    action: 'Send reset request',
  },
  reset: {
    title: 'Complete a password reset with a token.',
    description: 'This flow is intentionally plain: it is here to validate the API contract and unblock frontend integration before the polished design arrives.',
    action: 'Reset password',
  },
};

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const resetTokenFromUrl = searchParams.get('token') ?? '';
  const { login, register } = useAuth();
  const [mode, setMode] = useState<AuthMode>(resetTokenFromUrl ? 'reset' : 'login');
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: 'Frontend Explorer',
    email: 'customer@bookstore.com',
    password: 'Password123!',
    phone: '0909000000',
  });
  const [forgotEmail, setForgotEmail] = useState('customer@bookstore.com');
  const [resetForm, setResetForm] = useState({
    token: resetTokenFromUrl,
    newPassword: 'Password123!',
  });

  const redirectTo = useMemo(() => {
    const state = location.state as { from?: string } | null;
    return state?.from ?? '/account';
  }, [location.state]);

  const copy = modeCopy[mode];

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function submit() {
    setIsBusy(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (mode === 'login') {
        await login({ email: form.email, password: form.password });
        startTransition(() => {
          navigate(redirectTo, { replace: true });
        });
        return;
      }

      if (mode === 'register') {
        await register(form);
        startTransition(() => {
          navigate(redirectTo, { replace: true });
        });
        return;
      }

      if (mode === 'forgot') {
        await forgotPassword(forgotEmail);
        setSuccessMessage('If the email exists, a reset instruction has been requested successfully.');
        return;
      }

      await resetPassword(resetForm.token, resetForm.newPassword);
      setSuccessMessage('Password reset successful. You can now sign in with the new password.');
      setForm((current) => ({ ...current, password: resetForm.newPassword }));
      setMode('login');
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : 'Authentication request failed');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="two-column-grid">
      <article className="hero-panel">
        <p className="eyebrow">Authentication cockpit</p>
        <h1>{copy.title}</h1>
        <p>{copy.description}</p>
        <div className="chip-row">
          {demoAccounts.map((account) => (
            <button
              key={account.email}
              className="chip-button"
              onClick={() => {
                setForm({ ...form, email: account.email, password: account.password });
                setForgotEmail(account.email);
              }}
              type="button"
            >
              {account.label}
            </button>
          ))}
        </div>
        <div className="utility-row">
          <button className="text-link" onClick={() => switchMode('forgot')} type="button">Forgot password</button>
          <button className="text-link" onClick={() => switchMode('reset')} type="button">Use reset token</button>
          {(mode === 'forgot' || mode === 'reset') ? (
            <button className="text-link" onClick={() => switchMode('login')} type="button">Back to sign in</button>
          ) : null}
        </div>
      </article>

      <article className="form-panel">
        <div className="segmented-control" role="tablist" aria-label="Authentication mode">
          <button
            className={mode === 'login' ? 'segment-active' : ''}
            onClick={() => switchMode('login')}
            type="button"
          >
            Sign in
          </button>
          <button
            className={mode === 'register' ? 'segment-active' : ''}
            onClick={() => switchMode('register')}
            type="button"
          >
            Register
          </button>
        </div>

        {mode === 'register' ? (
          <label className="field">
            <span>Full name</span>
            <input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          </label>
        ) : null}

        {(mode === 'login' || mode === 'register') ? (
          <>
            <label className="field">
              <span>Email</span>
              <input
                autoComplete="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>

            <label className="field">
              <span>Password</span>
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
          <label className="field">
            <span>Phone</span>
            <input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </label>
        ) : null}

        {mode === 'forgot' ? (
          <label className="field">
            <span>Email</span>
            <input autoComplete="email" type="email" value={forgotEmail} onChange={(event) => setForgotEmail(event.target.value)} />
          </label>
        ) : null}

        {mode === 'reset' ? (
          <>
            <label className="field">
              <span>Reset token</span>
              <input value={resetForm.token} onChange={(event) => setResetForm({ ...resetForm, token: event.target.value })} />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                autoComplete="new-password"
                type="password"
                value={resetForm.newPassword}
                onChange={(event) => setResetForm({ ...resetForm, newPassword: event.target.value })}
              />
            </label>
          </>
        ) : null}

        {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
        {successMessage ? <p className="feedback-text feedback-text-success">{successMessage}</p> : null}

        <button className="button button-primary" disabled={isBusy} onClick={() => void submit()} type="button">
          {isBusy ? 'Working...' : copy.action}
        </button>
      </article>
    </section>
  );
}

export default LoginPage;
