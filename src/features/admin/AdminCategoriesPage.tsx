import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  createAdminCategory,
  deleteAdminCategory,
  getAdminCategories,
  updateAdminCategory,
} from '@/features/admin/admin-api';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const initialForm = {
  name: '',
  slug: '',
  description: '',
  parentId: '',
  status: true,
};

function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: categoryList } = useSuspenseQuery({
    queryKey: ['admin', 'categories', search],
    queryFn: () => getAdminCategories({ search, limit: 100 }),
  });
  const { data: categoryOptions } = useSuspenseQuery({
    queryKey: ['admin', 'categories', 'options'],
    queryFn: () => getAdminCategories({ limit: 100 }),
  });

  const categories = categoryList.items;
  const parentOptions = useMemo(
    () => categoryOptions.items.filter((category) => category.id !== editingId),
    [categoryOptions.items, editingId],
  );
  const canSubmit = form.name.trim().length > 0 && form.slug.trim().length > 0;

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
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        parentId: form.parentId || null,
        status: form.status,
      };

      if (editingId) {
        return updateAdminCategory(editingId, payload);
      }

      return createAdminCategory(payload);
    },
    onSuccess: async (saved) => {
      setErrorMessage(null);
      setFeedback(editingId ? `Đã cập nhật danh mục "${saved.name}".` : `Đã tạo danh mục "${saved.name}".`);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu danh mục');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) => deleteAdminCategory(categoryId),
    onSuccess: async () => {
      setErrorMessage(null);
      setFeedback('Đã xóa danh mục thành công.');
      if (editingId) {
        resetForm();
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa danh mục');
    },
  });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Danh mục sách"
        title="Quản lý cây danh mục cho storefront và bộ lọc catalog"
        description="Trang này nối trực tiếp CRUD category từ backend để admin chủ động thêm, sửa, ẩn hoặc tổ chức danh mục cha-con."
      />

      <section className="surface-card admin-manager-toolbar">
        <form className="inline-actions" onSubmit={handleSearchSubmit}>
          <label className="field admin-manager-search">
            <span>Tìm danh mục</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Nhập tên danh mục"
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
            <strong>{editingId ? 'Chỉnh sửa danh mục' : 'Tạo danh mục mới'}</strong>
            <p>Tạo slug chuẩn URL và gắn quan hệ cha-con để bộ lọc catalog hiển thị đúng.</p>
          </div>
        </div>
        {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
        {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}
        <div className="form-grid">
          <label className="field">
            <span>Tên danh mục</span>
            <input
              onChange={(event) => {
                const nextName = event.target.value;
                setForm((current) => {
                  const shouldSyncSlug = current.slug.trim() === '' || current.slug === slugify(current.name);
                  return {
                    ...current,
                    name: nextName,
                    slug: shouldSyncSlug ? slugify(nextName) : current.slug,
                  };
                });
              }}
              value={form.name}
            />
          </label>
          <label className="field">
            <span>Slug</span>
            <input onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} value={form.slug} />
          </label>
          <label className="field">
            <span>Danh mục cha</span>
            <select onChange={(event) => setForm((current) => ({ ...current, parentId: event.target.value }))} value={form.parentId}>
              <option value="">Danh mục gốc</option>
              {parentOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
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
            <span>Mô tả</span>
            <textarea
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Mô tả ngắn cho danh mục"
              rows={4}
              value={form.description}
            />
          </label>
        </div>
        <div className="inline-actions">
          <button
            className="button button-primary"
            disabled={!canSubmit || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            type="button"
          >
            {saveMutation.isPending ? 'Đang lưu...' : editingId ? 'Cập nhật danh mục' : 'Tạo danh mục'}
          </button>
          {editingId ? (
            <button className="button button-secondary" onClick={resetForm} type="button">
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>
      </section>

      {categories.length === 0 ? (
        <EmptyState title="Chưa có danh mục" description="Danh mục mới tạo sẽ xuất hiện tại đây để admin tiếp tục chỉnh sửa hoặc sắp xếp." />
      ) : (
        <div className="admin-card-grid">
          {categories.map((category) => (
            <article className="surface-subcard admin-manager-card" key={category.id}>
              <div className="admin-manager-card-head">
                <div>
                  <strong>{category.name}</strong>
                  <p>{category.slug}</p>
                </div>
                <span className={`admin-status-pill ${category.status ? 'admin-status-pill-active' : 'admin-status-pill-muted'}`}>
                  {category.status ? 'Đang dùng' : 'Tạm ẩn'}
                </span>
              </div>
              <div className="details-grid">
                <div>
                  <span>Danh mục cha</span>
                  <strong>{category.parent?.name ?? 'Danh mục gốc'}</strong>
                </div>
                <div>
                  <span>Danh mục con</span>
                  <strong>{category.children?.length ?? 0}</strong>
                </div>
              </div>
              <p>{category.description?.trim() || 'Chưa có mô tả cho danh mục này.'}</p>
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setEditingId(category.id);
                    setForm({
                      name: category.name,
                      slug: category.slug,
                      description: category.description ?? '',
                      parentId: category.parentId ?? '',
                      status: category.status,
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
                  disabled={deleteMutation.isPending && deleteMutation.variables === category.id}
                  onClick={() => deleteMutation.mutate(category.id)}
                  type="button"
                >
                  {deleteMutation.isPending && deleteMutation.variables === category.id ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminCategoriesPage;
