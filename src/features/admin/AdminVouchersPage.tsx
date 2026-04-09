import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  createAdminVoucher,
  deleteAdminVoucher,
  getAdminVouchers,
  updateAdminVoucher,
} from '@/features/admin/admin-api';
import { formatCurrency, formatDate } from '@/lib/format';

interface VoucherFormState {
  code: string;
  type: 'percent' | 'fixed';
  value: string;
  minOrderValue: string;
  maxDiscountValue: string;
  startDate: string;
  endDate: string;
  usageLimit: string;
  status: boolean;
}

function createInitialForm(): VoucherFormState {
  return {
    code: '',
    type: 'percent',
    value: '10',
    minOrderValue: '',
    maxDiscountValue: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    usageLimit: '100',
    status: true,
  };
}

function AdminVouchersPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VoucherFormState>(createInitialForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: voucherList } = useSuspenseQuery({
    queryKey: ['admin', 'vouchers', search, statusFilter],
    queryFn: () =>
      getAdminVouchers({
        limit: 50,
        search,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const vouchers = voucherList.items;
  const canSubmit = useMemo(() => {
    return form.code.trim().length >= 3 && Number(form.value) > 0 && Number(form.usageLimit) >= 0;
  }, [form.code, form.usageLimit, form.value]);

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
      const payload = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        minOrderValue: form.minOrderValue ? Number(form.minOrderValue) : undefined,
        maxDiscountValue: form.maxDiscountValue ? Number(form.maxDiscountValue) : undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        usageLimit: Number(form.usageLimit),
        status: form.status,
      };

      if (editingId) {
        return updateAdminVoucher(editingId, payload);
      }

      return createAdminVoucher(payload);
    },
    onSuccess: async (saved) => {
      setErrorMessage(null);
      setFeedback(editingId ? `Đã cập nhật voucher "${saved.code}".` : `Đã tạo voucher "${saved.code}".`);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu voucher');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (voucherId: string) => deleteAdminVoucher(voucherId),
    onSuccess: async () => {
      setErrorMessage(null);
      setFeedback('Đã xóa voucher.');
      if (editingId) {
        resetForm();
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'vouchers'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa voucher');
    },
  });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Khuyến mãi"
        title="Quản trị voucher với đầy đủ điều kiện áp dụng"
        description="Trang này giờ đã cover các trường quan trọng từ backend như giá trị tối thiểu đơn hàng, trần giảm giá, giới hạn sử dụng và lọc trạng thái."
      />

      <section className="surface-card admin-manager-toolbar">
        <form className="inline-actions" onSubmit={handleSearchSubmit}>
          <label className="field admin-manager-search">
            <span>Tìm voucher</span>
            <input onChange={(event) => setSearchInput(event.target.value)} placeholder="Mã voucher" value={searchInput} />
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select onChange={(event) => setStatusFilter(event.target.value as 'all' | 'true' | 'false')} value={statusFilter}>
              <option value="all">Tất cả</option>
              <option value="true">Đang bật</option>
              <option value="false">Đang tắt</option>
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
            <strong>{editingId ? 'Chỉnh sửa voucher' : 'Tạo voucher mới'}</strong>
            <p>Hỗ trợ cả hai loại giảm giá, giới hạn lượt dùng và điều kiện tối thiểu để frontend không còn mỏng hơn backend.</p>
          </div>
        </div>
        {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
        {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}
        <div className="form-grid">
          <label className="field">
            <span>Mã voucher</span>
            <input
              onChange={(event) => setForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              placeholder="WELCOME10"
              value={form.code}
            />
          </label>
          <label className="field">
            <span>Loại</span>
            <select onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as 'percent' | 'fixed' }))} value={form.type}>
              <option value="percent">Phần trăm</option>
              <option value="fixed">Số tiền cố định</option>
            </select>
          </label>
          <label className="field">
            <span>Giá trị</span>
            <input min="1" onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))} type="number" value={form.value} />
          </label>
          <label className="field">
            <span>Đơn tối thiểu</span>
            <input min="0" onChange={(event) => setForm((current) => ({ ...current, minOrderValue: event.target.value }))} type="number" value={form.minOrderValue} />
          </label>
          <label className="field">
            <span>Trần giảm giá</span>
            <input min="0" onChange={(event) => setForm((current) => ({ ...current, maxDiscountValue: event.target.value }))} type="number" value={form.maxDiscountValue} />
          </label>
          <label className="field">
            <span>Giới hạn sử dụng</span>
            <input min="0" onChange={(event) => setForm((current) => ({ ...current, usageLimit: event.target.value }))} type="number" value={form.usageLimit} />
          </label>
          <label className="field">
            <span>Ngày bắt đầu</span>
            <input onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} type="date" value={form.startDate} />
          </label>
          <label className="field">
            <span>Ngày kết thúc</span>
            <input onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} type="date" value={form.endDate} />
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select onChange={(event) => setForm((current) => ({ ...current, status: event.target.value === 'true' }))} value={String(form.status)}>
              <option value="true">Đang bật</option>
              <option value="false">Đang tắt</option>
            </select>
          </label>
        </div>
        <div className="inline-actions">
          <button className="button button-primary" disabled={!canSubmit || saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
            {saveMutation.isPending ? 'Đang lưu...' : editingId ? 'Cập nhật voucher' : 'Tạo voucher'}
          </button>
          {editingId ? (
            <button className="button button-secondary" onClick={resetForm} type="button">
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>
      </section>

      {vouchers.length === 0 ? (
        <EmptyState title="Chưa có voucher" description="Voucher mới sẽ hiển thị tại đây sau khi tạo." />
      ) : (
        <div className="admin-card-grid">
          {vouchers.map((voucher) => (
            <article className="surface-subcard admin-manager-card" key={voucher.id}>
              <div className="admin-manager-card-head">
                <div>
                  <strong>{voucher.code}</strong>
                  <p>
                    {voucher.type === 'percent' ? `${voucher.value}%` : formatCurrency(voucher.value)} • {formatDate(voucher.startDate)} den{' '}
                    {formatDate(voucher.endDate)}
                  </p>
                </div>
                <span className={`admin-status-pill ${voucher.status ? 'admin-status-pill-active' : 'admin-status-pill-muted'}`}>
                  {voucher.status ? 'Đang bật' : 'Đang tắt'}
                </span>
              </div>
              <div className="details-grid">
                <div>
                  <span>Đơn tối thiểu</span>
                  <strong>{voucher.minOrderValue ? formatCurrency(voucher.minOrderValue) : 'Không yêu cầu'}</strong>
                </div>
                <div>
                  <span>Trần giảm</span>
                  <strong>{voucher.maxDiscountValue ? formatCurrency(voucher.maxDiscountValue) : 'Không giới hạn'}</strong>
                </div>
                <div>
                  <span>Giới hạn / Đã dùng</span>
                  <strong>{voucher.usageLimit} / {voucher.usedCount ?? 0}</strong>
                </div>
              </div>
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setEditingId(voucher.id);
                    setForm({
                      code: voucher.code,
                      type: voucher.type,
                      value: String(voucher.value),
                      minOrderValue: voucher.minOrderValue ? String(voucher.minOrderValue) : '',
                      maxDiscountValue: voucher.maxDiscountValue ? String(voucher.maxDiscountValue) : '',
                      startDate: voucher.startDate.slice(0, 10),
                      endDate: voucher.endDate.slice(0, 10),
                      usageLimit: String(voucher.usageLimit),
                      status: voucher.status,
                    });
                    setFeedback(null);
                    setErrorMessage(null);
                  }}
                  type="button"
                >
                  Chỉnh sửa
                </button>
                <button
                  className="button button-danger"
                  disabled={deleteMutation.isPending && deleteMutation.variables === voucher.id}
                  onClick={() => deleteMutation.mutate(voucher.id)}
                  type="button"
                >
                  {deleteMutation.isPending && deleteMutation.variables === voucher.id ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminVouchersPage;
