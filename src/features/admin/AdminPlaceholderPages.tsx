import { useQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import { getDashboard } from '@/features/admin/admin-api';
import { useAuth } from '@/features/auth/AuthContext';
import { formatRealtimeFeedMessage } from '@/features/account/realtime-feed';
import { useRealtimeFeed } from '@/lib/realtime/useRealtimeFeed';

export function AdminVouchersPage() {
  return (
    <div className="page-stack">
      <SectionHeading eyebrow="Khuyến mãi" title="Quản lý voucher và mã giảm giá" />
      <EmptyState
        title="Chưa cấu hình module voucher"
        description="Trang voucher đã được tạo khung để triển khai CRUD và liên kết logic giảm giá từ backend ở bước kế tiếp."
      />
    </div>
  );
}

export function AdminReportsPage() {
  const dashboardQuery = useQuery({ queryKey: ['admin', 'dashboard', 'reports'], queryFn: getDashboard });
  const data = dashboardQuery.data;

  return (
    <div className="page-stack">
      <SectionHeading eyebrow="Báo cáo" title="Tổng quan vận hành và doanh thu" />
      <section className="stat-grid stat-grid-wide">
        <article className="stat-card"><p>Người dùng</p><strong>{data?.totalUsers ?? 0}</strong></article>
        <article className="stat-card"><p>Tựa sách</p><strong>{data?.totalBooks ?? 0}</strong></article>
        <article className="stat-card"><p>Đơn hàng</p><strong>{data?.totalOrders ?? 0}</strong></article>
        <article className="stat-card"><p>Doanh thu</p><strong>{data?.totalRevenue ?? 0}</strong></article>
      </section>
    </div>
  );
}

export function AdminSettingsPage() {
  return (
    <div className="page-stack">
      <SectionHeading eyebrow="Cài đặt" title="Cấu hình vận hành cửa hàng" />
      <EmptyState
        title="Trang cài đặt đang ở bản khung"
        description="Cài đặt hệ thống (thông tin cửa hàng, ngưỡng tồn kho, webhook, template thông báo) sẽ được bổ sung đầy đủ ở vòng tiếp theo."
      />
    </div>
  );
}

export function AdminLogsPage() {
  const { session } = useAuth();
  const feed = useRealtimeFeed(session?.accessToken ?? null, true);

  return (
    <div className="page-stack">
      <SectionHeading eyebrow="Nhật ký hoạt động" title="Sự kiện hệ thống gần đây" />
      {feed.length === 0 ? (
        <EmptyState title="Chưa có sự kiện realtime" description="Sự kiện order/payment/inventory sẽ hiển thị tại đây khi có dữ liệu mới." />
      ) : (
        <div className="feed-stack">
          {feed.map((event) => (
            <article className="feed-card" key={`${event.event}-${event.receivedAt}`}>
              <strong>{formatRealtimeFeedMessage(event.event, event.payload)}</strong>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
