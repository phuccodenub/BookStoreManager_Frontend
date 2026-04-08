import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import StatCard from '@/components/StatCard';
import {
  getBestSellerReport,
  getCancelledOrdersReport,
  getDashboard,
  getInventoryReport,
  getRevenueReport,
  getTopCustomersReport,
} from '@/features/admin/admin-api';
import { useAuth } from '@/features/auth/AuthContext';
import { formatCurrency, formatDate } from '@/lib/format';

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function createDefaultFromDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 5, 1);
  return toInputDate(date);
}

function createDefaultToDate() {
  return toInputDate(new Date());
}

function AdminReportsPage() {
  const { session } = useAuth();
  const isAdmin = session?.user.role === 'admin';
  const [from, setFrom] = useState(createDefaultFromDate);
  const [to, setTo] = useState(createDefaultToDate);
  const [limit, setLimit] = useState(5);

  const query = {
    from: from || undefined,
    to: to || undefined,
    limit,
  };

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'reports', 'dashboard'],
    queryFn: getDashboard,
    enabled: isAdmin,
  });
  const revenueQuery = useQuery({
    queryKey: ['admin', 'reports', 'revenue', query.from, query.to],
    queryFn: () => getRevenueReport({ from: query.from, to: query.to }),
    enabled: isAdmin,
  });
  const bestSellerQuery = useQuery({
    queryKey: ['admin', 'reports', 'best-sellers', query.from, query.to, query.limit],
    queryFn: () => getBestSellerReport(query),
    enabled: isAdmin,
  });
  const cancelledQuery = useQuery({
    queryKey: ['admin', 'reports', 'cancelled', query.from, query.to],
    queryFn: () => getCancelledOrdersReport({ from: query.from, to: query.to }),
    enabled: isAdmin,
  });
  const topCustomersQuery = useQuery({
    queryKey: ['admin', 'reports', 'top-customers', query.from, query.to, query.limit],
    queryFn: () => getTopCustomersReport(query),
    enabled: isAdmin,
  });
  const inventoryQuery = useQuery({
    queryKey: ['admin', 'reports', 'inventory'],
    queryFn: getInventoryReport,
  });

  const error =
    dashboardQuery.error ??
    revenueQuery.error ??
    bestSellerQuery.error ??
    cancelledQuery.error ??
    topCustomersQuery.error ??
    inventoryQuery.error;

  const revenueSeries = revenueQuery.data ?? [];
  const maxRevenue = Math.max(...revenueSeries.map((point) => point.revenue), 1);
  const lowStockBooks = (inventoryQuery.data ?? []).slice(0, 6);

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow={isAdmin ? 'Báo cáo quản trị' : 'Báo cáo vận hành'}
        title={isAdmin ? 'Theo dõi doanh thu, đơn hủy và nhóm khách hàng quan trọng' : 'Theo dõi tồn kho và các đầu sách cần ưu tiên bổ sung'}
        description={
          isAdmin
            ? 'Trang này đã nối trực tiếp các API báo cáo từ backend để admin xem số liệu điều hành thay vì chỉ còn bản placeholder.'
            : 'Staff được mở quyền đọc báo cáo tồn kho để phối hợp vận hành, trong khi các chỉ số tài chính vẫn giữ riêng cho admin.'
        }
      />

      {isAdmin ? (
        <section className="surface-card">
          <div className="report-toolbar">
            <div className="report-toolbar-copy">
              <h3>Bộ lọc kỳ báo cáo</h3>
              <p>Áp dụng cùng một khoảng thời gian cho doanh thu, sách bán chạy, khách hàng top và danh sách đơn hủy.</p>
            </div>
            <div className="form-grid report-filter-grid">
              <label className="field">
                <span>Từ ngày</span>
                <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
              </label>
              <label className="field">
                <span>Đến ngày</span>
                <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
              </label>
              <label className="field">
                <span>Top hiển thị</span>
                <select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
                  <option value={5}>Top 5</option>
                  <option value={10}>Top 10</option>
                  <option value={20}>Top 20</option>
                </select>
              </label>
              <div className="report-filter-note">
                <span>Khoảng đang xem</span>
                <strong>{from && to ? `${from} -> ${to}` : 'Toàn bộ dữ liệu'}</strong>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="surface-card">
          <div className="report-toolbar">
            <div className="report-toolbar-copy">
              <h3>Quyền xem báo cáo của staff</h3>
              <p>Trang này giữ các dữ liệu doanh thu và khách hàng cho admin, nhưng vẫn mở watchlist tồn kho để staff xử lý nhập hàng và cảnh báo vận hành.</p>
            </div>
          </div>
        </section>
      )}

      {error ? (
        <EmptyState
          eyebrow="Không tải được báo cáo"
          title="Một hoặc nhiều nguồn dữ liệu báo cáo đang lỗi"
          description={error instanceof Error ? error.message : 'Vui lòng kiểm tra lại API backend hoặc quyền truy cập của tài khoản hiện tại.'}
        />
      ) : null}

      {isAdmin ? (
        <>
          <section className="stat-grid stat-grid-wide">
            <StatCard label="Người dùng" value={dashboardQuery.data?.totalUsers ?? 0} />
            <StatCard label="Đơn hàng" value={dashboardQuery.data?.totalOrders ?? 0} tone="ink" />
            <StatCard label="Đơn hoàn tất" value={dashboardQuery.data?.completedOrders ?? 0} />
            <StatCard label="Đơn đã hủy" value={dashboardQuery.data?.cancelledOrders ?? 0} tone="ink" />
            <StatCard label="Doanh thu tích lũy" value={formatCurrency(dashboardQuery.data?.totalRevenue ?? 0)} />
            <StatCard label="Sách sắp cạn" value={dashboardQuery.data?.lowStockCount ?? 0} tone="ink" />
          </section>

          <section className="two-column-grid two-column-grid-wide">
            <article className="surface-card report-surface">
              <div className="report-section-head">
                <div>
                  <p className="eyebrow">Revenue trend</p>
                  <h3>Doanh thu theo tháng</h3>
                </div>
                <strong>{formatCurrency(revenueSeries.reduce((total, point) => total + point.revenue, 0))}</strong>
              </div>
              {revenueQuery.isPending ? (
                <p className="page-loading">Đang tải biểu đồ doanh thu...</p>
              ) : revenueSeries.length === 0 ? (
                <EmptyState title="Chưa có dữ liệu doanh thu" description="Trong khoảng thời gian đã chọn chưa có đơn hoàn tất nào để tổng hợp." />
              ) : (
                <div className="report-chart">
                  {revenueSeries.map((point) => {
                    const height = Math.max(16, Math.round((point.revenue / maxRevenue) * 100));
                    return (
                      <article className="report-bar-card" key={point.month}>
                        <div className="report-bar-track">
                          <div className="report-bar-fill" style={{ height: `${height}%` }} />
                        </div>
                        <strong>{point.month}</strong>
                        <span>{formatCurrency(point.revenue)}</span>
                      </article>
                    );
                  })}
                </div>
              )}
            </article>

            <article className="surface-card report-surface">
              <div className="report-section-head">
                <div>
                  <p className="eyebrow">Top sellers</p>
                  <h3>Sách bán chạy nhất</h3>
                </div>
                <strong>{bestSellerQuery.data?.length ?? 0} mục</strong>
              </div>
              {bestSellerQuery.isPending ? (
                <p className="page-loading">Đang tải danh sách sách bán chạy...</p>
              ) : (bestSellerQuery.data?.length ?? 0) === 0 ? (
                <EmptyState title="Chưa có sách bán chạy" description="Dữ liệu sẽ xuất hiện sau khi có đơn hoàn tất trong kỳ báo cáo." />
              ) : (
                <div className="report-list">
                  {bestSellerQuery.data?.map((record, index) => (
                    <article className="report-list-card" key={record.book?.id ?? `${record.totalSold}-${index}`}>
                      <div>
                        <p className="report-list-rank">Top {index + 1}</p>
                        <strong>{record.book?.title ?? 'Đầu sách không còn tồn tại'}</strong>
                        <p>{record.book?.slug ?? 'Không có slug'}</p>
                      </div>
                      <div className="report-list-metric">
                        <strong>{record.totalSold} cuốn</strong>
                        <span>{formatCurrency(record.totalRevenue)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="two-column-grid two-column-grid-wide">
            <article className="surface-card report-surface">
              <div className="report-section-head">
                <div>
                  <p className="eyebrow">Top customers</p>
                  <h3>Khách hàng chi tiêu cao nhất</h3>
                </div>
                <strong>{topCustomersQuery.data?.length ?? 0} khách</strong>
              </div>
              {topCustomersQuery.isPending ? (
                <p className="page-loading">Đang tải khách hàng nổi bật...</p>
              ) : (topCustomersQuery.data?.length ?? 0) === 0 ? (
                <EmptyState title="Chưa có khách hàng nổi bật" description="Khi có đơn hoàn tất, hệ thống sẽ xếp hạng mức chi tiêu tại đây." />
              ) : (
                <div className="report-list">
                  {topCustomersQuery.data?.map((record, index) => (
                    <article className="report-list-card" key={record.user?.id ?? `${record.totalSpent}-${index}`}>
                      <div>
                        <p className="report-list-rank">Hạng {index + 1}</p>
                        <strong>{record.user?.fullName ?? 'Khách hàng ẩn danh'}</strong>
                        <p>{record.user?.email ?? 'Không có email'}</p>
                      </div>
                      <div className="report-list-metric">
                        <strong>{formatCurrency(record.totalSpent)}</strong>
                        <span>{record.orderCount} đơn hoàn tất</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="surface-card report-surface">
              <div className="report-section-head">
                <div>
                  <p className="eyebrow">Cancelled orders</p>
                  <h3>Đơn hủy cần theo dõi</h3>
                </div>
                <strong>{cancelledQuery.data?.length ?? 0} đơn</strong>
              </div>
              {cancelledQuery.isPending ? (
                <p className="page-loading">Đang tải đơn hủy...</p>
              ) : (cancelledQuery.data?.length ?? 0) === 0 ? (
                <EmptyState title="Không có đơn hủy trong kỳ" description="Đây là tín hiệu tốt. Trang sẽ hiển thị ngay khi có dữ liệu phát sinh." />
              ) : (
                <div className="report-list">
                  {cancelledQuery.data?.slice(0, limit).map((record) => (
                    <article className="report-list-card report-list-card-stacked" key={record.id}>
                      <div className="report-list-row">
                        <strong>{record.orderCode}</strong>
                        <span>{formatCurrency(record.totalAmount)}</span>
                      </div>
                      <p>{record.user?.fullName ?? 'Khách hàng không xác định'} • {formatDate(record.createdAt)}</p>
                      <p>{record.cancelledReason ?? 'Chưa có lý do hủy chi tiết.'}</p>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        </>
      ) : null}

      <section className="surface-card report-surface">
        <div className="report-section-head">
          <div>
            <p className="eyebrow">{isAdmin ? 'Inventory watchlist' : 'Inventory report'}</p>
            <h3>{isAdmin ? 'Danh sách tồn kho thấp nhất hiện tại' : 'Danh sách tồn kho cần ưu tiên theo dõi'}</h3>
          </div>
          <strong>{isAdmin ? `${dashboardQuery.data?.lowStockCount ?? 0} đầu sách cảnh báo` : `${inventoryQuery.data?.length ?? 0} đầu sách`}</strong>
        </div>
        {inventoryQuery.isPending ? (
          <p className="page-loading">Đang tải báo cáo tồn kho...</p>
        ) : lowStockBooks.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu tồn kho" description="Báo cáo tồn kho sẽ xuất hiện khi backend trả về danh mục sách đang hoạt động." />
        ) : (
          <div className="report-list report-list-grid">
            {lowStockBooks.map((book) => (
              <article className="report-list-card" key={book.id}>
                <div>
                  <strong>{book.title}</strong>
                  <p>{book.slug}</p>
                </div>
                <div className="report-list-metric">
                  <strong>{book.stockQuantity} cuốn</strong>
                  <span>Đã bán {book.soldQuantity}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AdminReportsPage;
