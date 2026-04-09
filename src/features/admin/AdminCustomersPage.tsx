import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
  updateAdminUserStatus,
} from '@/features/admin/admin-api';
import type { Role, UserStatus } from '@/lib/types';

interface AdminUserFormState {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: Role;
}

function createInitialForm(): AdminUserFormState {
  return {
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'customer',
  };
}

function AdminCustomersPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminUserFormState>(createInitialForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: userList } = useSuspenseQuery({
    queryKey: ['admin', 'users', search, roleFilter, statusFilter],
    queryFn: () =>
      getAdminUsers({
        limit: 50,
        search,
        role: roleFilter === 'all' ? undefined : roleFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const users = userList.items;
  const canSubmit = useMemo(() => {
    if (editingId) {
      return form.fullName.trim().length >= 2;
    }

    return form.fullName.trim().length >= 2 && form.email.trim().length > 0 && form.password.length >= 8;
  }, [editingId, form.email, form.fullName, form.password]);

  function resetForm() {
    setEditingId(null);
    setForm(createInitialForm());
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        return updateAdminUser(editingId, {
          fullName: form.fullName.trim(),
          phone: form.phone.trim() || undefined,
          role: form.role,
        });
      }

      return createAdminUser({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
      });
    },
    onSuccess: async (saved) => {
      setErrorMessage(null);
      setFeedback(editingId ? `Đã cập nhật tài khoản "${saved.fullName}".` : `Đã tạo tài khoản "${saved.fullName}".`);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu tài khoản');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) => updateAdminUserStatus(userId, status),
    onSuccess: async (saved) => {
      setErrorMessage(null);
      setFeedback(`Đã cập nhật trạng thái cho "${saved.fullName}" sang ${saved.status === 'active' ? 'hoạt động' : 'khóa'}.`);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: async () => {
      setErrorMessage(null);
      setFeedback('Đã xóa tài khoản khỏi hệ thống.');
      if (editingId) {
        resetForm();
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa tài khoản');
    },
  });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Tài khoản"
        title="Quản trị đầy đủ customer, staff và admin"
        description="Frontend đã được nâng từ màn khóa khách hàng đơn giản thành trang quản trị người dùng bám sát backend hơn: lọc theo role, tạo tài khoản nội bộ, đổi vai trò và khóa mở quyền truy cập."
      />

      <section className="surface-card admin-manager-toolbar">
        <form className="inline-actions" onSubmit={handleSearchSubmit}>
          <label className="field admin-manager-search">
            <span>Tìm tài khoản</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Họ tên hoặc email"
              value={searchInput}
            />
          </label>
          <label className="field">
            <span>Vai trò</span>
            <select onChange={(event) => setRoleFilter(event.target.value as 'all' | Role)} value={roleFilter}>
              <option value="all">Tất cả</option>
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select onChange={(event) => setStatusFilter(event.target.value as 'all' | UserStatus)} value={statusFilter}>
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </label>
          <button className="button button-secondary" type="submit">
            Lọc
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setRoleFilter('all');
              setStatusFilter('all');
            }}
            type="button"
          >
            Bỏ lọc
          </button>
        </form>
      </section>

      <section className="surface-card form-panel">
        <div className="admin-manager-head">
          <div>
            <strong>{editingId ? 'Chỉnh sửa tài khoản' : 'Tạo tài khoản mới'}</strong>
            <p>
              Backend hiện chỉ cho cập nhật họ tên, điện thoại và role. Email chỉ được nhập lúc tạo, còn khóa/mở khóa dùng endpoint trạng thái riêng.
            </p>
          </div>
        </div>
        {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
        {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}
        <div className="form-grid">
          <label className="field">
            <span>Họ và tên</span>
            <input onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} value={form.fullName} />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              disabled={Boolean(editingId)}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              placeholder="staff@bookstore.local"
              type="email"
              value={form.email}
            />
          </label>
          <label className="field">
            <span>Số điện thoại</span>
            <input onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} value={form.phone} />
          </label>
          <label className="field">
            <span>Vai trò</span>
            <select onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))} value={form.role}>
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label className="field">
            <span>Mật khẩu tạm</span>
            <input
              disabled={Boolean(editingId)}
              minLength={8}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              placeholder={editingId ? 'Chỉ đặt khi tạo tài khoản mới' : 'Ít nhất 8 ký tự'}
              type="password"
              value={form.password}
            />
          </label>
        </div>
        <div className="inline-actions">
          <button className="button button-primary" disabled={!canSubmit || saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
            {saveMutation.isPending ? 'Đang lưu...' : editingId ? 'Cập nhật tài khoản' : 'Tạo tài khoản'}
          </button>
          {editingId ? (
            <button className="button button-secondary" onClick={resetForm} type="button">
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>
      </section>

      {users.length === 0 ? (
        <EmptyState title="Chưa có tài khoản phù hợp" description="Thử nới điều kiện lọc hoặc tạo tài khoản mới để bắt đầu." />
      ) : (
        <div className="admin-card-grid">
          {users.map((user) => (
            <article className="surface-subcard admin-manager-card" key={user.id}>
              <div className="admin-manager-card-head">
                <div className="admin-avatar-row">
                  {user.avatar ? <img alt={user.fullName} className="admin-avatar-thumb" src={user.avatar} /> : <div className="admin-avatar-thumb admin-avatar-thumb-placeholder">{user.fullName.slice(0, 1).toUpperCase()}</div>}
                  <div>
                    <strong>{user.fullName}</strong>
                    <p>{user.email}</p>
                  </div>
                </div>
                <span className={`admin-status-pill ${user.status === 'active' ? 'admin-status-pill-active' : 'admin-status-pill-muted'}`}>
                  {user.status === 'active' ? 'Hoạt động' : 'Đã khóa'}
                </span>
              </div>
              <div className="details-grid">
                <div>
                  <span>Vai trò</span>
                  <strong>{user.role}</strong>
                </div>
                <div>
                  <span>Điện thoại</span>
                  <strong>{user.phone?.trim() || 'Chưa có'}</strong>
                </div>
              </div>
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setEditingId(user.id);
                    setForm({
                      fullName: user.fullName,
                      email: user.email,
                      phone: user.phone ?? '',
                      password: '',
                      role: user.role,
                    });
                    setFeedback(null);
                    setErrorMessage(null);
                  }}
                  type="button"
                >
                  Chỉnh sửa
                </button>
                <button
                  className="button button-secondary"
                  disabled={statusMutation.isPending && statusMutation.variables?.userId === user.id}
                  onClick={() =>
                    statusMutation.mutate({
                      userId: user.id,
                      status: user.status === 'active' ? 'locked' : 'active',
                    })
                  }
                  type="button"
                >
                  {user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                </button>
                <button
                  className="button button-danger"
                  disabled={deleteMutation.isPending && deleteMutation.variables === user.id}
                  onClick={() => deleteMutation.mutate(user.id)}
                  type="button"
                >
                  {deleteMutation.isPending && deleteMutation.variables === user.id ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminCustomersPage;
