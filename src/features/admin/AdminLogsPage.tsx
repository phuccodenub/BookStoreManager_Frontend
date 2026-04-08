import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  getActivityLogs,
} from '@/features/admin/admin-api';
import {
  formatActivityDataPreview,
  formatActivityEntityLabel,
  formatActivityLogTitle,
  formatAdminRealtimeFeedMessage,
} from '@/features/admin/admin-presentation';
import { useAuth } from '@/features/auth/AuthContext';
import { formatDate } from '@/lib/format';
import { useRealtimeFeed } from '@/lib/realtime/useRealtimeFeed';

const entityOptions = [
  { value: '', label: 'Tất cả module' },
  { value: 'order', label: 'Đơn hàng' },
  { value: 'payment', label: 'Thanh toán' },
  { value: 'user', label: 'Người dùng' },
  { value: 'auth', label: 'Xác thực' },
  { value: 'inventory_transaction', label: 'Tồn kho' },
  { value: 'review', label: 'Đánh giá' },
  { value: 'system_config', label: 'Cấu hình' },
] as const;

function AdminLogsPage() {
  const { session } = useAuth();
  const realtimeFeed = useRealtimeFeed(session?.accessToken ?? null, true);
  const [page, setPage] = useState(1);
  const [draftEntityType, setDraftEntityType] = useState('');
  const [draftAction, setDraftAction] = useState('');
  const [filters, setFilters] = useState({ entityType: '', action: '' });

  const logQuery = useQuery({
    queryKey: ['admin', 'activity-logs', page, filters.entityType, filters.action],
    queryFn: () =>
      getActivityLogs({
        page,
        limit: 12,
        entityType: filters.entityType || undefined,
        action: filters.action || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const items = logQuery.data?.items ?? [];
  const meta = logQuery.data?.meta;
  const realtimePreview = useMemo(() => realtimeFeed.slice(0, 5), [realtimeFeed]);

  function handleApplyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters({
      entityType: draftEntityType,
      action: draftAction.trim(),
    });
  }

  function handleClearFilters() {
    setDraftEntityType('');
    setDraftAction('');
    setPage(1);
    setFilters({ entityType: '', action: '' });
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Nhật ký hoạt động"
        title="Theo dõi audit log hệ thống và realtime feed trong cùng một màn hình"
        description="Trang này đọc trực tiếp `/api/activity-logs` cho admin và vẫn giữ feed realtime để đội vận hành đối chiếu nhanh các sự kiện mới."
      />

      <section className="surface-card">
        <form className="report-toolbar" onSubmit={handleApplyFilters}>
          <div className="report-toolbar-copy">
            <h3>Bộ lọc audit log</h3>
            <p>Lọc theo module và tên hành động để tìm lại thay đổi quan trọng trong hệ thống.</p>
          </div>
          <div className="form-grid report-filter-grid">
            <label className="field">
              <span>Module</span>
              <select value={draftEntityType} onChange={(event) => setDraftEntityType(event.target.value)}>
                {entityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Action</span>
              <input
                placeholder="Ví dụ: order_status_updated"
                value={draftAction}
                onChange={(event) => setDraftAction(event.target.value)}
              />
            </label>
            <div className="report-filter-note">
              <span>Kết quả hiện tại</span>
              <strong>{meta?.total ?? items.length} bản ghi</strong>
            </div>
            <div className="inline-actions report-filter-actions">
              <button className="button button-primary" type="submit">
                Áp dụng bộ lọc
              </button>
              <button className="button button-secondary" onClick={handleClearFilters} type="button">
                Xóa lọc
              </button>
            </div>
          </div>
        </form>
      </section>

      <section className="two-column-grid two-column-grid-wide">
        <article className="surface-card report-surface">
          <div className="report-section-head">
            <div>
              <p className="eyebrow">Audit trail</p>
              <h3>Lịch sử thay đổi đã lưu</h3>
            </div>
            <strong>
              Trang {meta?.page ?? page}/{meta?.totalPages ?? 1}
            </strong>
          </div>

          {logQuery.isPending ? (
            <p className="page-loading">Đang tải activity logs...</p>
          ) : logQuery.error ? (
            <EmptyState
              eyebrow="Không tải được nhật ký"
              title="API activity log đang trả lỗi"
              description={logQuery.error instanceof Error ? logQuery.error.message : 'Vui lòng kiểm tra backend hoặc quyền admin của tài khoản hiện tại.'}
            />
          ) : items.length === 0 ? (
            <EmptyState
              title="Không tìm thấy bản ghi phù hợp"
              description="Thử nới bộ lọc hoặc chờ thêm dữ liệu phát sinh từ các luồng order, user, payment và settings."
            />
          ) : (
            <div className="report-list">
              {items.map((item) => {
                const beforePreview = formatActivityDataPreview(item.oldData);
                const afterPreview = formatActivityDataPreview(item.newData);

                return (
                  <article className="activity-log-card" key={item.id}>
                    <div className="activity-log-header">
                      <div>
                        <strong>{formatActivityLogTitle(item.action, item.entityType)}</strong>
                        <p>{formatDate(item.createdAt)}</p>
                      </div>
                      <span className="status-chip status-chip-info">{formatActivityEntityLabel(item.entityType)}</span>
                    </div>

                    <div className="activity-log-meta">
                      <span>{item.user?.fullName ?? 'Hệ thống'}</span>
                      <span>{item.user?.email ?? 'Không có email'}</span>
                      <span>{item.ipAddress ?? 'Không có IP'}</span>
                    </div>

                    {item.entityId ? (
                      <p className="activity-log-entity">Đối tượng: {item.entityId}</p>
                    ) : null}

                    {beforePreview || afterPreview ? (
                      <div className="activity-log-preview-grid">
                        {beforePreview ? (
                          <div>
                            <span>Trước</span>
                            <code>{beforePreview}</code>
                          </div>
                        ) : null}
                        {afterPreview ? (
                          <div>
                            <span>Sau</span>
                            <code>{afterPreview}</code>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          <div className="pagination-row">
            <button
              className="button button-secondary"
              disabled={page <= 1 || logQuery.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Trang trước
            </button>
            <p>
              Hiển thị {items.length} / {meta?.total ?? items.length} bản ghi
            </p>
            <button
              className="button button-secondary"
              disabled={page >= (meta?.totalPages ?? 1) || logQuery.isFetching}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Trang sau
            </button>
          </div>
        </article>

        <article className="surface-card report-surface">
          <div className="report-section-head">
            <div>
              <p className="eyebrow">Realtime companion</p>
              <h3>Dòng sự kiện mới nhất</h3>
            </div>
            <strong>{realtimePreview.length} sự kiện</strong>
          </div>

          {realtimePreview.length === 0 ? (
            <EmptyState
              title="Chưa có sự kiện realtime"
              description="Khi order, payment hoặc inventory thay đổi trong phiên hiện tại, feed sẽ cập nhật ngay tại đây."
            />
          ) : (
            <div className="feed-stack">
              {realtimePreview.map((event) => (
                <article className="feed-card" key={`${event.event}-${event.receivedAt}`}>
                  <strong>{formatAdminRealtimeFeedMessage(event.event, event.payload)}</strong>
                  <p>{formatDate(event.receivedAt)}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

export default AdminLogsPage;
