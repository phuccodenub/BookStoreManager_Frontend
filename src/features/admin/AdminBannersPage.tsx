import { useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  createAdminBanner,
  deleteAdminBanner,
  getAdminBanners,
  updateAdminBanner,
} from '@/features/admin/admin-api';
import { formatDate } from '@/lib/format';

const initialForm = {
  title: '',
  link: '',
  startDate: '',
  endDate: '',
  status: true,
  sortOrder: '0',
};

function toDateInputValue(value?: string | null) {
  if (!value) {
    return '';
  }

  return value.slice(0, 10);
}

function AdminBannersPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: banners } = useSuspenseQuery({
    queryKey: ['admin', 'banners'],
    queryFn: getAdminBanners,
  });

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
    setBannerFile(null);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        link: form.link.trim() || undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        status: form.status,
        sortOrder: Number(form.sortOrder || 0),
      };

      if (editingId) {
        return updateAdminBanner(editingId, payload);
      }

      if (!bannerFile) {
        throw new Error('Cần chọn file ảnh cho banner mới.');
      }

      return createAdminBanner(payload, bannerFile);
    },
    onSuccess: async (saved) => {
      setErrorMessage(null);
      setFeedback(editingId ? `Đã cập nhật banner "${saved.title}".` : `Đã tạo banner "${saved.title}".`);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu banner');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (bannerId: string) => deleteAdminBanner(bannerId),
    onSuccess: async () => {
      setErrorMessage(null);
      setFeedback('Đã xóa banner thành công.');
      if (editingId) {
        resetForm();
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa banner');
    },
  });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Banner trang chủ"
        title="Quản lý banner quảng bá và lịch hiển thị"
        description="Banner mới dùng upload ảnh thật theo backend. Khi cần thay đổi ảnh hiện tại, hãy tạo banner mới rồi ẩn banner cũ để tránh lệch contract API."
      />

      <section className="surface-card form-panel">
        <div className="admin-manager-head">
          <div>
            <strong>{editingId ? 'Chỉnh sửa metadata banner' : 'Tạo banner mới'}</strong>
            <p>Ảnh chỉ được upload ở bước tạo mới vì backend hiện chưa có endpoint thay ảnh cho banner đã tồn tại.</p>
          </div>
        </div>
        {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
        {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}
        <div className="form-grid">
          <label className="field">
            <span>Tiêu đề banner</span>
            <input onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} value={form.title} />
          </label>
          <label className="field">
            <span>Link điều hướng</span>
            <input onChange={(event) => setForm((current) => ({ ...current, link: event.target.value }))} value={form.link} />
          </label>
          <label className="field">
            <span>Bắt đầu hiển thị</span>
            <input onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} type="date" value={form.startDate} />
          </label>
          <label className="field">
            <span>Kết thúc hiển thị</span>
            <input onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} type="date" value={form.endDate} />
          </label>
          <label className="field">
            <span>Thứ tự hiển thị</span>
            <input
              min="0"
              onChange={(event) => setForm((current) => ({ ...current, sortOrder: event.target.value }))}
              type="number"
              value={form.sortOrder}
            />
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value === 'true' }))}
              value={String(form.status)}
            >
              <option value="true">Đang hiển thị</option>
              <option value="false">Tạm ẩn</option>
            </select>
          </label>
          <label className="field field-wide">
            <span>Ảnh banner</span>
            <input accept="image/*" disabled={Boolean(editingId)} onChange={(event) => setBannerFile(event.target.files?.[0] ?? null)} type="file" />
            <p className="admin-field-note">
              {editingId
                ? 'Muốn đổi ảnh banner, hãy hủy chỉnh sửa và tạo banner mới với ảnh mới.'
                : bannerFile
                  ? `Đã chọn: ${bannerFile.name}`
                  : 'Chọn ảnh cho banner mới trước khi tạo.'}
            </p>
          </label>
        </div>
        <div className="inline-actions">
          <button
            className="button button-primary"
            disabled={form.title.trim().length === 0 || (!editingId && !bannerFile) || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            type="button"
          >
            {saveMutation.isPending ? 'Đang lưu...' : editingId ? 'Cập nhật banner' : 'Tạo banner'}
          </button>
          {editingId ? (
            <button className="button button-secondary" onClick={resetForm} type="button">
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>
      </section>

      {banners.length === 0 ? (
        <EmptyState title="Chưa có banner" description="Banner đầu tiên sau khi tạo sẽ xuất hiện tại đây kèm ảnh preview và lịch hiển thị." />
      ) : (
        <div className="admin-card-grid">
          {banners.map((banner) => (
            <article className="surface-subcard admin-manager-card" key={banner.id}>
              <div className="admin-banner-preview">
                <img alt={banner.title} className="admin-banner-image" src={banner.image} />
              </div>
              <div className="admin-manager-card-head">
                <div>
                  <strong>{banner.title}</strong>
                  <p>{banner.link || 'Chưa gắn link điều hướng'}</p>
                </div>
                <span className={`admin-status-pill ${banner.status ? 'admin-status-pill-active' : 'admin-status-pill-muted'}`}>
                  {banner.status ? 'Active' : 'Hidden'}
                </span>
              </div>
              <div className="details-grid">
                <div>
                  <span>Thứ tự</span>
                  <strong>{banner.sortOrder ?? 0}</strong>
                </div>
                <div>
                  <span>Ngày tạo</span>
                  <strong>{banner.createdAt ? formatDate(banner.createdAt) : 'Không có dữ liệu'}</strong>
                </div>
                <div>
                  <span>Bắt đầu</span>
                  <strong>{banner.startDate ? formatDate(banner.startDate) : 'Hiển thị ngay'}</strong>
                </div>
                <div>
                  <span>Kết thúc</span>
                  <strong>{banner.endDate ? formatDate(banner.endDate) : 'Không giới hạn'}</strong>
                </div>
              </div>
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setEditingId(banner.id);
                    setForm({
                      title: banner.title,
                      link: banner.link ?? '',
                      startDate: toDateInputValue(banner.startDate),
                      endDate: toDateInputValue(banner.endDate),
                      status: banner.status ?? true,
                      sortOrder: String(banner.sortOrder ?? 0),
                    });
                    setBannerFile(null);
                    setFeedback(null);
                    setErrorMessage(null);
                  }}
                  type="button"
                >
                  Chỉnh sửa
                </button>
                <button
                  className="button button-danger"
                  disabled={deleteMutation.isPending && deleteMutation.variables === banner.id}
                  onClick={() => deleteMutation.mutate(banner.id)}
                  type="button"
                >
                  {deleteMutation.isPending && deleteMutation.variables === banner.id ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminBannersPage;
