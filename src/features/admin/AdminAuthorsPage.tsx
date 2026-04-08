import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  createAdminAuthor,
  deleteAdminAuthor,
  getAdminAuthors,
  updateAdminAuthor,
  uploadAdminAuthorAvatar,
} from '@/features/admin/admin-api';

const initialForm = {
  name: '',
  bio: '',
  status: true,
};

function AdminAuthorsPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: authorList } = useSuspenseQuery({
    queryKey: ['admin', 'authors', search],
    queryFn: () => getAdminAuthors({ search, limit: 100 }),
  });
  const authors = authorList.items;

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
    setAvatarFile(null);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        bio: form.bio.trim() || undefined,
        status: form.status,
      };

      const saved = editingId
        ? await updateAdminAuthor(editingId, payload)
        : await createAdminAuthor(payload);

      if (avatarFile) {
        await uploadAdminAuthorAvatar(saved.id, avatarFile);
      }

      return saved;
    },
    onSuccess: async (saved) => {
      setErrorMessage(null);
      setFeedback(editingId ? `Đã cập nhật tác giả "${saved.name}".` : `Đã tạo tác giả "${saved.name}".`);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'authors'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu tác giả');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (authorId: string) => deleteAdminAuthor(authorId),
    onSuccess: async () => {
      setErrorMessage(null);
      setFeedback('Đã xóa tác giả thành công.');
      if (editingId) {
        resetForm();
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'authors'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa tác giả');
    },
  });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Tác giả"
        title="Quản lý hồ sơ tác giả và avatar hiển thị"
        description="Admin có thể cập nhật bio, trạng thái và avatar tác giả để storefront và trang chi tiết sách dùng chung một nguồn dữ liệu."
      />

      <section className="surface-card admin-manager-toolbar">
        <form className="inline-actions" onSubmit={handleSearchSubmit}>
          <label className="field admin-manager-search">
            <span>Tìm tác giả</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Nhập tên tác giả"
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
            <strong>{editingId ? 'Chỉnh sửa tác giả' : 'Thêm tác giả mới'}</strong>
            <p>Avatar là tùy chọn. Nếu chọn file, hệ thống sẽ upload ngay sau khi lưu hồ sơ tác giả.</p>
          </div>
        </div>
        {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
        {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}
        <div className="form-grid">
          <label className="field">
            <span>Tên tác giả</span>
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
          <label className="field field-wide">
            <span>Tiểu sử</span>
            <textarea
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              placeholder="Mô tả ngắn về tác giả"
              rows={5}
              value={form.bio}
            />
          </label>
          <label className="field field-wide">
            <span>Avatar tác giả</span>
            <input accept="image/*" onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)} type="file" />
            <p className="admin-field-note">
              {avatarFile ? `Đã chọn: ${avatarFile.name}` : editingId ? 'Chọn file mới nếu muốn cập nhật avatar hiện tại.' : 'Có thể bỏ qua và thêm avatar sau.'}
            </p>
          </label>
        </div>
        <div className="inline-actions">
          <button
            className="button button-primary"
            disabled={form.name.trim().length === 0 || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            type="button"
          >
            {saveMutation.isPending ? 'Đang lưu...' : editingId ? 'Cập nhật tác giả' : 'Tạo tác giả'}
          </button>
          {editingId ? (
            <button className="button button-secondary" onClick={resetForm} type="button">
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>
      </section>

      {authors.length === 0 ? (
        <EmptyState title="Chưa có tác giả" description="Danh sách tác giả sẽ xuất hiện tại đây sau khi thêm dữ liệu đầu tiên." />
      ) : (
        <div className="admin-card-grid">
          {authors.map((author) => (
            <article className="surface-subcard admin-manager-card" key={author.id}>
              <div className="admin-manager-card-head">
                <div className="admin-avatar-row">
                  {author.avatar ? <img alt={author.name} className="admin-avatar-thumb" src={author.avatar} /> : <div className="admin-avatar-thumb admin-avatar-thumb-placeholder">{author.name.slice(0, 1).toUpperCase()}</div>}
                  <div>
                    <strong>{author.name}</strong>
                    <p>{author.status ? 'Đang hiển thị trên hệ thống' : 'Đang tạm ẩn'}</p>
                  </div>
                </div>
                <span className={`admin-status-pill ${author.status ? 'admin-status-pill-active' : 'admin-status-pill-muted'}`}>
                  {author.status ? 'Active' : 'Hidden'}
                </span>
              </div>
              <p>{author.bio?.trim() || 'Chưa có tiểu sử cho tác giả này.'}</p>
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setEditingId(author.id);
                    setForm({
                      name: author.name,
                      bio: author.bio ?? '',
                      status: author.status,
                    });
                    setAvatarFile(null);
                    setFeedback(null);
                    setErrorMessage(null);
                  }}
                  type="button"
                >
                  Chỉnh sửa
                </button>
                <button
                  className="button button-danger"
                  disabled={deleteMutation.isPending && deleteMutation.variables === author.id}
                  onClick={() => deleteMutation.mutate(author.id)}
                  type="button"
                >
                  {deleteMutation.isPending && deleteMutation.variables === author.id ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminAuthorsPage;
