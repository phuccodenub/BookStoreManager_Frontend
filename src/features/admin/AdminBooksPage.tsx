import { useMemo, useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  type AdminBookStatus,
  createAdminBook,
  deleteAdminBookImage,
  deleteAdminBook,
  getAdminBooks,
  updateAdminBook,
  uploadAdminBookCover,
  uploadAdminBookImages,
} from '@/features/admin/admin-api';
import { getAuthors, getCategories, getPublishers } from '@/features/catalog/catalog-api';
import { formatCurrency } from '@/lib/format';

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

interface AdminBookFormState {
  title: string;
  slug: string;
  isbn: string;
  description: string;
  publicationYear: string;
  pageCount: string;
  price: string;
  importPrice: string;
  stockQuantity: string;
  categoryId: string;
  authorId: string;
  publisherId: string;
  status: AdminBookStatus;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
}

function createInitialForm(): AdminBookFormState {
  return {
  title: '',
  slug: '',
  isbn: '',
  description: '',
  publicationYear: '',
  pageCount: '',
  price: '0',
  importPrice: '',
  stockQuantity: '0',
  categoryId: '',
  authorId: '',
  publisherId: '',
  status: 'active',
  isFeatured: false,
  isNew: true,
  isBestSeller: false,
  };
}

function AdminBooksPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [form, setForm] = useState<AdminBookFormState>(createInitialForm);

  const { data: books } = useSuspenseQuery({
    queryKey: ['admin', 'books', search],
    queryFn: () => getAdminBooks({ limit: 100, search }),
  });
  const { data: categories } = useSuspenseQuery({ queryKey: ['catalog', 'categories', 'admin-books'], queryFn: getCategories });
  const { data: authors } = useSuspenseQuery({ queryKey: ['catalog', 'authors', 'admin-books'], queryFn: getAuthors });
  const { data: publishers } = useSuspenseQuery({ queryKey: ['catalog', 'publishers', 'admin-books'], queryFn: getPublishers });

  const canSubmit = useMemo(
    () => form.title.trim().length > 0 && form.slug.trim().length > 0 && Number(form.price) >= 0,
    [form.price, form.slug, form.title],
  );
  const editingBook = useMemo(() => books.find((book) => book.id === editingId) ?? null, [books, editingId]);

  function resetForm() {
    setEditingId(null);
    setForm(createInitialForm());
    setCoverFile(null);
    setGalleryFiles([]);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        isbn: form.isbn.trim() || undefined,
        description: form.description.trim() || undefined,
        publicationYear: form.publicationYear ? Number(form.publicationYear) : undefined,
        pageCount: form.pageCount ? Number(form.pageCount) : undefined,
        price: Number(form.price),
        importPrice: form.importPrice ? Number(form.importPrice) : undefined,
        stockQuantity: Number(form.stockQuantity || 0),
        categoryId: form.categoryId || null,
        authorId: form.authorId || null,
        publisherId: form.publisherId || null,
        status: form.status,
        isFeatured: form.isFeatured,
        isNew: form.isNew,
        isBestSeller: form.isBestSeller,
      };

      const saved = editingId
        ? await updateAdminBook(editingId, payload)
        : await createAdminBook(payload);

      if (coverFile) {
        await uploadAdminBookCover(saved.id, coverFile);
      }
      if (galleryFiles.length > 0) {
        await uploadAdminBookImages(saved.id, galleryFiles);
      }

      return saved;
    },
    onSuccess: async (saved) => {
      setErrorMessage(null);
      setFeedback(editingId ? `Đã cập nhật sách "${saved.title}".` : `Đã tạo sách "${saved.title}".`);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu sách');
    },
  });

  const quickStatusMutation = useMutation({
    mutationFn: ({ bookId, nextStatus }: { bookId: string; nextStatus: 'active' | 'out_of_stock' | 'discontinued' }) =>
      updateAdminBook(bookId, { status: nextStatus }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (bookId: string) => deleteAdminBook(bookId),
    onSuccess: async () => {
      setErrorMessage(null);
      setFeedback('Đã xóa sách khỏi danh mục.');
      if (editingId) {
        resetForm();
      }
      await queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa sách');
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: ({ bookId, imageId }: { bookId: string; imageId: string }) => deleteAdminBookImage(bookId, imageId),
    onSuccess: async () => {
      setErrorMessage(null);
      setFeedback('Đã xóa ảnh gallery của sách.');
      await queryClient.invalidateQueries({ queryKey: ['admin', 'books'] });
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể xóa ảnh gallery');
    },
  });

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Sách"
        title="Quản trị đầy đủ metadata sách và ảnh bìa"
        description="Màn này đã được mở rộng để bám sát backend hơn: ISBN, mô tả, giá nhập, liên kết category-author-publisher và upload ảnh bìa."
      />

      <section className="surface-card admin-manager-toolbar">
        <div className="inline-actions">
          <label className="field admin-manager-search">
            <span>Tìm sách</span>
            <input onChange={(event) => setSearchInput(event.target.value)} placeholder="Tên sách, ISBN..." value={searchInput} />
          </label>
          <button className="button button-secondary" onClick={() => setSearch(searchInput.trim())} type="button">
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
        </div>
      </section>

      <section className="surface-card form-panel">
        <div className="admin-manager-head">
          <div>
            <strong>{editingId ? 'Chỉnh sửa sách' : 'Tạo sách mới'}</strong>
            <p>Slug sẽ tự đồng bộ theo tiêu đề nếu bạn chưa chỉnh tay. Ảnh bìa sẽ được upload sau khi lưu thành công.</p>
          </div>
        </div>
        {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
        {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}
        <div className="form-grid">
          <label className="field">
            <span>Tên sách</span>
            <input
              onChange={(event) => {
                const nextTitle = event.target.value;
                setForm((current) => {
                  const shouldSyncSlug = current.slug.trim() === '' || current.slug === slugify(current.title);
                  return {
                    ...current,
                    title: nextTitle,
                    slug: shouldSyncSlug ? slugify(nextTitle) : current.slug,
                  };
                });
              }}
              value={form.title}
            />
          </label>
          <label className="field">
            <span>Slug</span>
            <input onChange={(event) => setForm((current) => ({ ...current, slug: slugify(event.target.value) }))} value={form.slug} />
          </label>
          <label className="field">
            <span>ISBN</span>
            <input onChange={(event) => setForm((current) => ({ ...current, isbn: event.target.value }))} value={form.isbn} />
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as AdminBookStatus }))}
              value={form.status}
            >
              <option value="active">Đang bán</option>
              <option value="out_of_stock">Hết hàng</option>
              <option value="discontinued">Ngừng kinh doanh</option>
            </select>
          </label>
          <label className="field">
            <span>Giá bán</span>
            <input min="0" onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} type="number" value={form.price} />
          </label>
          <label className="field">
            <span>Giá nhập</span>
            <input min="0" onChange={(event) => setForm((current) => ({ ...current, importPrice: event.target.value }))} type="number" value={form.importPrice} />
          </label>
          <label className="field">
            <span>Tồn kho</span>
            <input min="0" onChange={(event) => setForm((current) => ({ ...current, stockQuantity: event.target.value }))} type="number" value={form.stockQuantity} />
          </label>
          <label className="field">
            <span>Năm xuất bản</span>
            <input onChange={(event) => setForm((current) => ({ ...current, publicationYear: event.target.value }))} type="number" value={form.publicationYear} />
          </label>
          <label className="field">
            <span>Số trang</span>
            <input min="1" onChange={(event) => setForm((current) => ({ ...current, pageCount: event.target.value }))} type="number" value={form.pageCount} />
          </label>
          <label className="field">
            <span>Danh mục</span>
            <select onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))} value={form.categoryId}>
              <option value="">Chưa gắn danh mục</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tác giả</span>
            <select onChange={(event) => setForm((current) => ({ ...current, authorId: event.target.value }))} value={form.authorId}>
              <option value="">Chưa gắn tác giả</option>
              {authors.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nhà xuất bản</span>
            <select onChange={(event) => setForm((current) => ({ ...current, publisherId: event.target.value }))} value={form.publisherId}>
              <option value="">Chưa gắn NXB</option>
              {publishers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field field-wide">
            <span>Mô tả</span>
            <textarea onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} value={form.description} />
          </label>
          <label className="field field-wide">
            <span>Ảnh bìa</span>
            <input accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} type="file" />
            <p className="admin-field-note">
              {coverFile ? `Đã chọn: ${coverFile.name}` : editingId ? 'Chọn file nếu muốn thay ảnh bìa hiện tại.' : 'Có thể tạo sách trước rồi upload bìa ngay trong cùng thao tác.'}
            </p>
          </label>
          <label className="field field-wide">
            <span>Gallery ảnh phụ</span>
            <input
              accept="image/*"
              multiple
              onChange={(event) => setGalleryFiles(Array.from(event.target.files ?? []))}
              type="file"
            />
            <p className="admin-field-note">
              {galleryFiles.length > 0
                ? `Sẽ upload ${galleryFiles.length} ảnh phụ sau khi lưu sách.`
                : 'Có thể chọn nhiều ảnh để tạo gallery chi tiết giống contract backend.'}
            </p>
          </label>
          <label className="field">
            <span>Nhãn nổi bật</span>
            <input checked={form.isFeatured} onChange={(event) => setForm((current) => ({ ...current, isFeatured: event.target.checked }))} type="checkbox" />
          </label>
          <label className="field">
            <span>Nhãn sách mới</span>
            <input checked={form.isNew} onChange={(event) => setForm((current) => ({ ...current, isNew: event.target.checked }))} type="checkbox" />
          </label>
          <label className="field">
            <span>Nhãn best seller</span>
            <input checked={form.isBestSeller} onChange={(event) => setForm((current) => ({ ...current, isBestSeller: event.target.checked }))} type="checkbox" />
          </label>
        </div>
        <div className="inline-actions">
          <button className="button button-primary" disabled={!canSubmit || saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
            {saveMutation.isPending ? 'Đang lưu...' : editingId ? 'Cập nhật sách' : 'Tạo sách'}
          </button>
          {editingId ? (
            <button className="button button-secondary" onClick={resetForm} type="button">
              Hủy chỉnh sửa
            </button>
          ) : null}
        </div>
        {editingBook?.images?.length ? (
          <div className="admin-book-gallery-stack">
            <strong>Gallery hiện tại</strong>
            <div className="admin-book-gallery-grid">
              {editingBook.images.map((image) => (
                <article className="admin-book-gallery-item" key={image.id}>
                  <img alt={`${editingBook.title} ${image.sortOrder + 1}`} src={image.imageUrl} />
                  <button
                    className="button button-secondary"
                    disabled={
                      deleteImageMutation.isPending &&
                      deleteImageMutation.variables?.bookId === editingBook.id &&
                      deleteImageMutation.variables?.imageId === image.id
                    }
                    onClick={() => deleteImageMutation.mutate({ bookId: editingBook.id, imageId: image.id })}
                    type="button"
                  >
                    {deleteImageMutation.isPending &&
                    deleteImageMutation.variables?.bookId === editingBook.id &&
                    deleteImageMutation.variables?.imageId === image.id
                      ? 'Đang xóa...'
                      : 'Xóa ảnh'}
                  </button>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {books.length === 0 ? (
        <EmptyState title="Chưa có sách" description="Danh mục sách sẽ hiển thị tại đây khi backend trả về dữ liệu." />
      ) : (
        <div className="admin-card-grid">
          {books.map((book) => (
            <article className="surface-subcard admin-manager-card" key={book.id}>
              <div className="admin-manager-card-head">
                <div className="admin-avatar-row">
                  {book.coverImage ? <img alt={book.title} className="admin-avatar-thumb" src={book.coverImage} /> : <div className="admin-avatar-thumb admin-avatar-thumb-placeholder">B</div>}
                  <div>
                    <strong>{book.title}</strong>
                    <p>{book.category?.name ?? 'Chưa gắn danh mục'} • {book.author?.name ?? 'Chưa gắn tác giả'}</p>
                  </div>
                </div>
                <span className={`admin-status-pill ${book.status === 'active' ? 'admin-status-pill-active' : 'admin-status-pill-muted'}`}>
                  {book.status}
                </span>
              </div>
              <div className="details-grid">
                <div>
                  <span>Giá bán</span>
                  <strong>{formatCurrency(book.price)}</strong>
                </div>
                <div>
                  <span>Tồn kho</span>
                  <strong>{book.stockQuantity}</strong>
                </div>
                <div>
                  <span>Giá nhập</span>
                  <strong>{book.importPrice ? formatCurrency(book.importPrice) : 'Chưa có'}</strong>
                </div>
                <div>
                  <span>ISBN</span>
                  <strong>{book.isbn ?? 'Chưa có'}</strong>
                </div>
                <div>
                  <span>Ảnh gallery</span>
                  <strong>{book.images?.length ?? 0}</strong>
                </div>
              </div>
              <p>{book.description?.trim() || 'Chưa có mô tả cho sách này.'}</p>
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  onClick={() => {
                    setEditingId(book.id);
                    setForm({
                      title: book.title,
                      slug: book.slug,
                      isbn: book.isbn ?? '',
                      description: book.description ?? '',
                      publicationYear: book.publicationYear ? String(book.publicationYear) : '',
                      pageCount: book.pageCount ? String(book.pageCount) : '',
                      price: String(book.price),
                      importPrice: book.importPrice ? String(book.importPrice) : '',
                      stockQuantity: String(book.stockQuantity ?? 0),
                      categoryId: book.categoryId ?? '',
                      authorId: book.authorId ?? '',
                      publisherId: book.publisherId ?? '',
                      status: book.status,
                      isFeatured: Boolean(book.isFeatured),
                      isNew: Boolean(book.isNew),
                      isBestSeller: Boolean(book.isBestSeller),
                    });
                    setCoverFile(null);
                    setGalleryFiles([]);
                    setFeedback(null);
                    setErrorMessage(null);
                  }}
                  type="button"
                >
                  Chỉnh sửa
                </button>
                <button className="button button-secondary" onClick={() => quickStatusMutation.mutate({ bookId: book.id, nextStatus: 'active' })} type="button">
                  Active
                </button>
                <button className="button button-secondary" onClick={() => quickStatusMutation.mutate({ bookId: book.id, nextStatus: 'out_of_stock' })} type="button">
                  Hết hàng
                </button>
                <button className="button button-secondary" onClick={() => quickStatusMutation.mutate({ bookId: book.id, nextStatus: 'discontinued' })} type="button">
                  Ngừng bán
                </button>
                <button className="button button-danger" disabled={deleteMutation.isPending && deleteMutation.variables === book.id} onClick={() => deleteMutation.mutate(book.id)} type="button">
                  {deleteMutation.isPending && deleteMutation.variables === book.id ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminBooksPage;
