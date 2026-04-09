import { useMemo, useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  createInventoryAdjustment,
  createInventoryExport,
  createInventoryImport,
  getAdminBooks,
  getInventoryReport,
  getInventoryTransactions,
} from '@/features/admin/admin-api';
import { getInventoryQuantityLabel, getInventoryTransactionLabel } from '@/features/admin/admin-presentation';
import { useAuth } from '@/features/auth/AuthContext';
import { canManageInventoryTransactions } from '@/features/auth/role-access';
import { formatCurrency, formatDate } from '@/lib/format';

type InventoryOperationKind = 'import' | 'export' | 'adjustment';

const initialForm = {
  bookId: '',
  type: 'import' as InventoryOperationKind,
  quantity: '1',
  unitCost: '',
  note: '',
};

function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const canManage = canManageInventoryTransactions(session?.user.role);
  const [filters, setFilters] = useState({ bookId: '', type: '' });
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: inventoryTransactions } = useSuspenseQuery({
    queryKey: ['admin', 'inventory', 'transactions', filters.bookId, filters.type],
    queryFn: () =>
      getInventoryTransactions({
        limit: 20,
        bookId: filters.bookId || undefined,
        type: filters.type || undefined,
      }),
  });
  const { data: inventoryReport } = useSuspenseQuery({
    queryKey: ['admin', 'inventory', 'report'],
    queryFn: getInventoryReport,
  });
  const { data: books } = useSuspenseQuery({
    queryKey: ['admin', 'books', 'inventory-options'],
    queryFn: () => getAdminBooks({ limit: 100 }),
  });

  const selectedBook = useMemo(
    () => books.find((book) => book.id === form.bookId) ?? null,
    [books, form.bookId],
  );

  const parsedQuantity = Number(form.quantity);
  const canSubmit =
    canManage &&
    Boolean(form.bookId) &&
    Number.isFinite(parsedQuantity) &&
    ((form.type === 'adjustment' && parsedQuantity !== 0) || ((form.type === 'import' || form.type === 'export') && parsedQuantity > 0));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        bookId: form.bookId,
        quantity: Number(form.quantity),
        unitCost: form.unitCost ? Number(form.unitCost) : undefined,
        note: form.note.trim() || undefined,
      };

      switch (form.type) {
        case 'export':
          return createInventoryExport(payload);
        case 'adjustment':
          return createInventoryAdjustment(payload);
        default:
          return createInventoryImport(payload);
      }
    },
    onSuccess: async () => {
      setErrorMessage(null);
      setFeedback(`Đã ghi nhận ${getInventoryTransactionLabel(form.type).toLowerCase()} cho sách "${selectedBook?.title ?? 'đã chọn'}".`);
      setForm((current) => ({ ...initialForm, bookId: current.bookId }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
      ]);
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể ghi nhận giao dịch tồn kho');
    },
  });

  const lowStockBooks = inventoryReport.slice(0, 8);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Tồn kho"
        title="Theo dõi biến động tồn và thao tác nhập xuất có kiểm soát"
        description="Staff chỉ được xem báo cáo và dòng giao dịch. Các nghiệp vụ nhập, xuất và điều chỉnh tồn được khóa riêng cho admin."
      />

      {!canManage ? (
        <section className="surface-card admin-manager-toolbar">
          <strong>Quyền hiện tại: chỉ xem</strong>
          <p>Vai trò staff có thể theo dõi biến động tồn kho, nhưng không được phép tạo giao dịch nhập, xuất hoặc điều chỉnh tồn.</p>
        </section>
      ) : (
        <section className="surface-card form-panel">
          <div className="admin-manager-head">
            <div>
              <strong>Ghi nhận giao dịch tồn kho</strong>
              <p>Tạo giao dịch nhập, xuất hoặc điều chỉnh tồn trực tiếp từ giao diện admin. Backend vẫn giữ quyền admin-only cho các API này.</p>
            </div>
          </div>
          {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
          {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}
          <div className="form-grid">
            <label className="field">
              <span>Chọn sách</span>
              <select onChange={(event) => setForm((current) => ({ ...current, bookId: event.target.value }))} value={form.bookId}>
                <option value="">Chọn đầu sách</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Loại giao dịch</span>
              <select
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as InventoryOperationKind }))}
                value={form.type}
              >
                <option value="import">Nhập kho</option>
                <option value="export">Xuất kho</option>
                <option value="adjustment">Điều chỉnh</option>
              </select>
            </label>
            <label className="field">
              <span>Số lượng</span>
              <input
                onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
                placeholder={form.type === 'adjustment' ? 'Có thể nhập âm hoặc dương' : 'Nhập số dương'}
                type="number"
                value={form.quantity}
              />
            </label>
            <label className="field">
              <span>Đơn giá nhập / cost</span>
              <input onChange={(event) => setForm((current) => ({ ...current, unitCost: event.target.value }))} type="number" value={form.unitCost} />
            </label>
            <label className="field field-wide">
              <span>Ghi chú</span>
              <textarea
                onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
                placeholder="Ví dụ: Nhập kho đầu tuần, điều chỉnh do kiểm kê..."
                rows={4}
                value={form.note}
              />
            </label>
          </div>
          <div className="inline-actions">
            <button className="button button-primary" disabled={!canSubmit || saveMutation.isPending} onClick={() => saveMutation.mutate()} type="button">
              {saveMutation.isPending ? 'Đang ghi nhận...' : `Ghi nhận ${getInventoryTransactionLabel(form.type).toLowerCase()}`}
            </button>
          </div>
        </section>
      )}

      <section className="surface-card admin-manager-toolbar">
        <div className="admin-manager-head">
          <div>
            <strong>Lọc dòng giao dịch</strong>
            <p>Giúp đội vận hành rà nhanh biến động theo đầu sách hoặc loại giao dịch.</p>
          </div>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>Đầu sách</span>
            <select onChange={(event) => setFilters((current) => ({ ...current, bookId: event.target.value }))} value={filters.bookId}>
              <option value="">Tất cả đầu sách</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Loại biến động</span>
            <select onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))} value={filters.type}>
              <option value="">Tất cả</option>
              <option value="import">Nhập kho</option>
              <option value="export">Xuất kho</option>
              <option value="adjustment">Điều chỉnh</option>
              <option value="order_confirm">Giữ hàng cho đơn</option>
              <option value="order_cancel">Hoàn tồn do hủy đơn</option>
            </select>
          </label>
        </div>
      </section>

      <section className="two-column-grid two-column-grid-wide">
        <article className="surface-card">
          <SectionHeading
            eyebrow="Giao dịch gần đây"
            title="Dòng biến động tồn kho"
            description="Danh sách này phản ánh cả thao tác thủ công và biến động phát sinh từ đơn hàng."
          />
          {inventoryTransactions.length === 0 ? (
            <EmptyState title="Chưa có biến động tồn kho" description="Khi có nhập, xuất hoặc đơn hàng ảnh hưởng tới tồn, dữ liệu sẽ xuất hiện tại đây." />
          ) : (
            <div className="list-stack">
              {inventoryTransactions.map((transaction) => (
                <article key={transaction.id} className="inventory-card">
                  <strong>{transaction.book?.title ?? 'Bản ghi tồn kho'}</strong>
                  <p>
                    {getInventoryTransactionLabel(transaction.type)} • {getInventoryQuantityLabel(transaction.quantity)} • {formatDate(transaction.createdAt)}
                  </p>
                  {transaction.note ? <p>{transaction.note}</p> : null}
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="surface-card">
          <SectionHeading
            eyebrow="Ảnh chụp tồn kho"
            title="Những đầu sách cần chú ý"
            description="Sắp xếp theo tồn kho thấp nhất để admin và staff đều nhìn thấy các điểm cần bổ sung hàng."
          />
          {lowStockBooks.length === 0 ? (
            <EmptyState title="Chưa có dữ liệu tồn kho" description="Khi backend trả về báo cáo inventory, danh sách ưu tiên sẽ hiển thị tại đây." />
          ) : (
            <div className="list-stack">
              {lowStockBooks.map((book) => (
                <article className="inventory-card" key={book.id}>
                  <strong>{book.title}</strong>
                  <p>Tồn hiện tại: {book.stockQuantity} cuốn • Đã bán: {book.soldQuantity} cuốn</p>
                  <p>Giá bán: {formatCurrency(book.price)} • Giá nhập: {formatCurrency(book.importPrice)}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

export default AdminInventoryPage;
