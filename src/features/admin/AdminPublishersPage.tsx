import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  createAdminPublisher,
  deleteAdminPublisher,
  getAdminPublishers,
  updateAdminPublisher,
} from '@/features/admin/admin-api';

const initialForm = {
  name: '',
  address: '',
  phone: '',
  email: '',
  status: true,
};

function AdminPublishersPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: publisherList } = useSuspenseQuery({
    queryKey: ['admin', 'publishers', search],
    queryFn: () => getAdminPublishers({ search, limit: 100 }),
  });
  const publishers = publisherList.items;

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        status: form.status,
      };

      if (editingId) {
        return updateAdminPublisher(editingId, payload);
      }

      return createAdminPublisher(payload);
    },
    onSuccess: async (saved) => {
      setErrorMessage(null);
      setFeedback(editingId ? `Đã cập nhật nhà xuất bản "${saved.name}".` : `Đã tạo nhà xuất bản "${saved.name}".`);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'publishers'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu nhà xuất bản');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (publisherId: string) => deleteAdminPublisher(publisherId),
    onSuccess: async () => {
      setErrorMessage(null);
      setFeedback('Đã xóa nhà xuất bản thành công.');
      if (editingId) {
        resetForm();
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'publishers'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa nhà xuất bản');
    },
  });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Nhà xuất bản"
        title="Quản lý danh sách nhà xuất bản và thông tin liên hệ"
        description="Trang này giúp admin đồng bộ NXB dùng cho nhập sách, bộ lọc catalog và thông tin hiển thị trên chi tiết sản phẩm."
      />

      <section className="surface-card admin-manager-toolbar">
        <form className="inline-actions" onSubmit={handleSearchSubmit}>
          <label className="field admin-manager-search">
            <span>Tìm nhà xuất bản</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Nhập tên nhà xuất bản"
              value={searchInput}
            />
          </label>
          <button className="button button-secondary" type="submit">
            Lọc
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              setSearchInput('');
              setSearch('');
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
            <strong>{editingId ? 'Chỉnh sửa nhà xuất bản' : 'Thêm nhà xuất bản mới'}</strong>
            <p>Thông tin liên hệ ở đây có thể tái sử dụng cho quy trình nhập hàng và đối chiếu dữ liệu backend.</p>
          </div>
        </div>
        {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
        {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}
        <div className="form-grid">
          <label className="field">
            <span>Tên nhà xuất bản</span>
            <input onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} value={form.name} />
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value === 'true' }))}
              value={String(form.status)}
            >
              <option value="true">Đang sử dụng</option>
              <option value="false">Tạm ẩn</option>
            </select>
          </label>
          <label className="field">
            <span>Email</span>
            <input onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} type="email" value={form.email} />
          </label>
          <label className="field">
            <span>Số điện thoại</span>
            <input onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} value={form.phone} />
          </label>
          <label className="field field-wide">
            <span>Địa chỉ</span>
            <input onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} value={form.address} />
          </label>
        </div>
        <div className="inline-actions">
          <button
            className="button button-primary"
            disabled={form.name.trim().length === 0 || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            type="button"
          >
            {saveMutation.isPending ? 'Đang lưu...' : editingId ? 'Cập nhật NXB' : 'Tạo NXB'}
          </button>
          {editingId ? (
            <button className="button button-secondary" onClick={resetForm} type="button">
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>
      </section>

      {publishers.length === 0 ? (
        <EmptyState title="Chưa có nhà xuất bản" description="Danh sách nhà xuất bản sẽ xuất hiện tại đây khi có dữ liệu." />
      ) : (
        <div className="admin-card-grid">
          {publishers.map((publisher) => (
            <article className="surface-subcard admin-manager-card" key={publisher.id}>
              <div className="admin-manager-card-head">
                <div>
                  <strong>{publisher.name}</strong>
                  <p>{publisher.email ?? 'Chưa có email liên hệ'}</p>
                </div>
                <span className={`admin-status-pill ${publisher.status ? 'admin-status-pill-active' : 'admin-status-pill-muted'}`}>
                  {publisher.status ? 'Đang dùng' : 'Tạm ẩn'}
                </span>
              </div>
              <div className="details-grid">
                <div>
                  <span>Điện thoại</span>
                  <strong>{publisher.phone || 'Chưa cập nhật'}</strong>
                </div>
                <div>
                  <span>Địa chỉ</span>
                  <strong>{publisher.address || 'Chưa cập nhật'}</strong>
                </div>
              </div>
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setEditingId(publisher.id);
                    setForm({
                      name: publisher.name,
                      address: publisher.address ?? '',
                      phone: publisher.phone ?? '',
                      email: publisher.email ?? '',
                      status: publisher.status,
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
                  disabled={deleteMutation.isPending && deleteMutation.variables === publisher.id}
                  onClick={() => deleteMutation.mutate(publisher.id)}
                  type="button"
                >
                  {deleteMutation.isPending && deleteMutation.variables === publisher.id ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminPublishersPage;
