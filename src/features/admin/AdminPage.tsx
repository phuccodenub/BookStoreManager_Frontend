import { type ReactNode, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import StatCard from '@/components/StatCard';
import {
  formatAdminRealtimeFeedMessage,
  getAdminContactUpdateMessage,
  getAdminOrderUpdateMessage,
  getContactStatusLabel,
  getContactStatusTone,
  getInventoryQuantityLabel,
  getInventoryTransactionLabel,
} from '@/features/admin/admin-presentation';
import { useAuth } from '@/features/auth/AuthContext';
import {
  downloadDeliveryNote,
  downloadInvoice,
  getDashboard,
  getInventoryTransactions,
  getRecentContactsSnapshot,
  getRecentOrdersSnapshot,
  updateContact,
  updateOrderStatus,
} from '@/features/admin/admin-api';
import { getMetadata } from '@/features/catalog/catalog-api';
import {
  getOrderStatusLabel,
  getOrderStatusTone,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPaymentStatusTone,
} from '@/features/order/order-presentation';
import { formatCurrency, formatDate } from '@/lib/format';
import { useRealtimeFeed } from '@/lib/realtime/useRealtimeFeed';
import type { ContactRecord, ContactStatus, OrderRecord, OrderStatus } from '@/lib/types';

function DashboardIcon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

const dashboardIcons = {
  users: (
    <DashboardIcon>
      <path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="10" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 19v-1a4 4 0 0 0-3-3.87" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M14 4.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </DashboardIcon>
  ),
  books: (
    <DashboardIcon>
      <path d="M4.75 5.75A2.75 2.75 0 0 1 7.5 3h11.75v16.25H7.5a2.75 2.75 0 0 0-2.75 2.75V5.75Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
      <path d="M7.5 3v16.25" stroke="currentColor" strokeWidth="1.8" />
      <path d="M11 7.25h4.75" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M11 11h4.75" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </DashboardIcon>
  ),
  orders: (
    <DashboardIcon>
      <path d="M7 7.5h10.5a1.75 1.75 0 0 1 1.71 2.12l-1.33 6A1.75 1.75 0 0 1 16.17 17H9.08a1.75 1.75 0 0 1-1.71-1.38L5.52 5.75H3.75" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      <circle cx="9.5" cy="20" r="1.25" fill="currentColor" />
      <circle cx="16.25" cy="20" r="1.25" fill="currentColor" />
    </DashboardIcon>
  ),
  revenue: (
    <DashboardIcon>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M15.25 9.75c0-1.1-1.45-2-3.25-2s-3.25.9-3.25 2 1.45 2 3.25 2 3.25.9 3.25 2-1.45 2-3.25 2-3.25-.9-3.25-2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </DashboardIcon>
  ),
};

async function saveBlob(blobPromise: Promise<Blob>, filename: string) {
  const blob = await blobPromise;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

interface AdminOrderCardProps {
  order: OrderRecord;
  availableStatuses: OrderStatus[];
  isUpdating: boolean;
  onUpdate: (payload: { orderId: string; orderStatus: Exclude<OrderStatus, 'pending'>; cancelledReason?: string }) => void;
}

function AdminOrderCard({ order, availableStatuses, isUpdating, onUpdate }: AdminOrderCardProps) {
  const [nextStatus, setNextStatus] = useState<Exclude<OrderStatus, 'pending'> | ''>(
    (availableStatuses[0] as Exclude<OrderStatus, 'pending'> | undefined) ?? '',
  );
  const [cancelledReason, setCancelledReason] = useState('Hủy từ khu vực vận hành');

  useEffect(() => {
    setNextStatus((availableStatuses[0] as Exclude<OrderStatus, 'pending'> | undefined) ?? '');
    setCancelledReason('Hủy từ khu vực vận hành');
  }, [availableStatuses, order.id]);

  const canTransition = availableStatuses.length > 0 && nextStatus !== '';

  return (
    <article className="order-card admin-order-card">
      <div className="order-card-header admin-order-card-header">
        <div className="admin-order-card-identify">
          <strong>{order.orderCode}</strong>
          <p className="admin-order-card-time">{formatDate(order.createdAt)}</p>
        </div>
        <div className="detail-secondary-actions admin-order-badge-row">
          <span className={`status-chip status-chip-${getOrderStatusTone(order.orderStatus)}`}>
            {getOrderStatusLabel(order.orderStatus)}
          </span>
          <span className={`status-chip status-chip-${getPaymentStatusTone(order.paymentStatus)}`}>
            {getPaymentStatusLabel(order.paymentStatus)}
          </span>
        </div>
      </div>
      <div className="admin-order-summary">
        <strong>{formatCurrency(order.totalAmount)}</strong>
        <p>{order.items.length} sản phẩm • {getPaymentMethodLabel(order.paymentMethod)}</p>
      </div>
      <p className="admin-order-note">Thanh toán {getPaymentStatusLabel(order.paymentStatus).toLowerCase()}.</p>
      {order.cancelledReason ? (
        <div className="reason-callout">
          <span>Lý do hủy</span>
          <strong>{order.cancelledReason}</strong>
        </div>
      ) : null}
      <div className="inline-actions admin-inline-actions">
        <button className="text-link" onClick={() => void saveBlob(downloadInvoice(order.id), `invoice-${order.orderCode}.pdf`)} type="button">Tải hóa đơn</button>
        <button className="text-link" onClick={() => void saveBlob(downloadDeliveryNote(order.id), `delivery-note-${order.orderCode}.pdf`)} type="button">Phiếu giao hàng</button>
      </div>
      <div className="admin-order-actions">
        {canTransition ? (
          <>
            <div className="field">
              <span>Trạng thái tiếp theo</span>
              <div aria-label={`Trạng thái tiếp theo cho ${order.orderCode}`} className="status-option-grid" role="radiogroup">
                {availableStatuses.map((status) => (
                  <button
                    key={status}
                    aria-checked={nextStatus === status}
                    className={`status-option ${nextStatus === status ? 'status-option-active' : ''}`}
                    data-status-option={status}
                    onClick={() => setNextStatus(status as Exclude<OrderStatus, 'pending'>)}
                    role="radio"
                    type="button"
                  >
                    {getOrderStatusLabel(status as OrderStatus)}
                  </button>
                ))}
              </div>
              <p className="status-help">Chọn trạng thái tiếp theo bằng các nút gợi ý bên dưới.</p>
            </div>
            {nextStatus === 'cancelled' ? (
              <label className="field field-wide">
                <span>Lý do hủy</span>
                <input
                  data-field="cancelled-reason"
                  placeholder="Nhập lý do hủy đơn"
                  value={cancelledReason}
                  onChange={(event) => setCancelledReason(event.target.value)}
                />
              </label>
            ) : null}
            <button
              className="button button-secondary"
              disabled={isUpdating}
              onClick={() => onUpdate({
                orderId: order.id,
                orderStatus: nextStatus,
                cancelledReason: nextStatus === 'cancelled' ? cancelledReason : undefined,
              })}
              type="button"
            >
              {isUpdating ? 'Đang cập nhật...' : 'Áp dụng trạng thái'}
            </button>
          </>
        ) : (
          <p>Không còn bước chuyển tiếp nào từ trạng thái hiện tại.</p>
        )}
      </div>
    </article>
  );
}

interface AdminContactCardProps {
  contact: ContactRecord;
  availableStatuses: ContactStatus[];
  isUpdating: boolean;
  onUpdate: (payload: { contactId: string; status: ContactStatus; note?: string | null }) => void;
}

function AdminContactCard({ contact, availableStatuses, isUpdating, onUpdate }: AdminContactCardProps) {
  const [status, setStatus] = useState<ContactStatus>(contact.status);
  const [note, setNote] = useState(contact.note ?? '');

  useEffect(() => {
    setStatus(contact.status);
    setNote(contact.note ?? '');
  }, [contact.id, contact.note, contact.status]);

  return (
    <article className="contact-card">
      <div className="order-card-header">
        <div>
          <strong>{contact.subject}</strong>
          <p>{contact.customerName} • {contact.email}</p>
        </div>
        <span className={`status-chip status-chip-${getContactStatusTone(contact.status)}`}>{getContactStatusLabel(contact.status)}</span>
      </div>

      <p>{contact.phone ?? 'Chưa có số điện thoại'} • {contact.createdAt ? formatDate(contact.createdAt) : 'Vừa tiếp nhận'}</p>

      {contact.note ? (
        <div className="reason-callout">
          <span>Ghi chú nội bộ</span>
          <strong>{contact.note}</strong>
        </div>
      ) : null}

      <div className="contact-admin-panel">
        <p>{contact.content}</p>

        <div className="field">
          <span>Cập nhật trạng thái</span>
          <div className="status-option-grid" role="radiogroup" aria-label={`Trạng thái xử lý cho ${contact.subject}`}>
            {availableStatuses.map((option) => (
              <button
                key={option}
                aria-checked={status === option}
                className={`status-option ${status === option ? 'status-option-active' : ''}`}
                data-contact-status-option={option}
                onClick={() => setStatus(option)}
                role="radio"
                type="button"
              >
                {getContactStatusLabel(option)}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Ghi chú xử lý</span>
          <textarea
            placeholder="Nhập ghi chú để đội vận hành cùng theo dõi"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>

        <div className="inline-actions">
          <button
            className="button button-secondary"
            data-action="update-contact"
            disabled={isUpdating}
            onClick={() => onUpdate({
              contactId: contact.id,
              status,
              note: note.trim() ? note.trim() : null,
            })}
            type="button"
          >
            {isUpdating ? 'Đang lưu...' : 'Cập nhật yêu cầu'}
          </button>
          {contact.updatedAt ? <p>Cập nhật lần cuối: {formatDate(contact.updatedAt)}</p> : null}
          {contact.assignedStaff ? <p>Đang giao cho: {contact.assignedStaff.fullName}</p> : null}
        </div>
      </div>
    </article>
  );
}

function AdminPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const isAdmin = session?.user.role === 'admin';
  const realtimeFeed = useRealtimeFeed(session?.accessToken ?? null, true);
  const { data: orders } = useSuspenseQuery({ queryKey: ['admin', 'orders', 'recent'], queryFn: getRecentOrdersSnapshot });
  const { data: contacts } = useSuspenseQuery({ queryKey: ['admin', 'contacts', 'recent'], queryFn: getRecentContactsSnapshot });
  const { data: inventoryTransactions } = useSuspenseQuery({ queryKey: ['admin', 'inventory'], queryFn: () => getInventoryTransactions() });
  const { data: metadata } = useSuspenseQuery({ queryKey: ['metadata'], queryFn: getMetadata });
  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: getDashboard,
    enabled: session?.user.role === 'admin',
  });
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [contactFeedback, setContactFeedback] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, orderStatus, cancelledReason }: { orderId: string; orderStatus: Exclude<OrderStatus, 'pending'>; cancelledReason?: string }) =>
      updateOrderStatus(orderId, { orderStatus, cancelledReason }),
    onSuccess: async (updatedOrder) => {
      setStatusError(null);
      setStatusFeedback(getAdminOrderUpdateMessage(updatedOrder.orderCode, updatedOrder.orderStatus));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ]);
    },
    onError: (error) => {
      setStatusFeedback(null);
      setStatusError(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái đơn hàng');
    },
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ contactId, status, note }: { contactId: string; status: ContactStatus; note?: string | null }) =>
      updateContact(contactId, { status, note }),
    onSuccess: async (updatedContact) => {
      setContactError(null);
      setContactFeedback(getAdminContactUpdateMessage(updatedContact.subject, updatedContact.status));
      await queryClient.invalidateQueries({ queryKey: ['admin', 'contacts'] });
    },
    onError: (error) => {
      setContactFeedback(null);
      setContactError(error instanceof Error ? error.message : 'Không thể cập nhật yêu cầu hỗ trợ');
    },
  });

  return (
    <div className="page-stack admin-dashboard-page">
      <section className="surface-card admin-dashboard-intro">
        <SectionHeading
          eyebrow={isAdmin ? 'Admin dashboard' : 'Staff operations'}
          title={isAdmin ? 'Tổng quan vận hành sáng sủa, dễ quét và dễ hành động' : 'Khu vực theo dõi thao tác nhanh cho đội vận hành'}
          description={isAdmin
            ? 'Theo dõi các chỉ số quan trọng, đơn hàng mới và cập nhật hệ thống ngay trên một màn hình duy nhất.'
            : 'Cập nhật trạng thái đơn, hỗ trợ khách hàng và theo dõi biến động trong ngày với bố cục rõ ràng hơn.'}
        />
      </section>

      {dashboardQuery.data ? (
        <section className="stat-grid stat-grid-wide admin-overview-grid">
          <StatCard accent="blue" icon={dashboardIcons.users} label="Người dùng" value={dashboardQuery.data.totalUsers} variant="overview" />
          <StatCard accent="emerald" icon={dashboardIcons.books} label="Tựa sách" value={dashboardQuery.data.totalBooks} variant="overview" />
          <StatCard accent="amber" icon={dashboardIcons.orders} label="Đơn hàng" value={dashboardQuery.data.totalOrders} variant="overview" />
          <StatCard accent="rose" icon={dashboardIcons.revenue} label="Doanh thu" value={formatCurrency(dashboardQuery.data.totalRevenue)} variant="overview" />
        </section>
      ) : null}

      <section className="two-column-grid two-column-grid-wide admin-dashboard-grid">
        <article className="surface-card admin-dashboard-widget">
          <div className="admin-widget-head">
            <SectionHeading
              eyebrow="Đơn hàng gần đây"
              title="6 đơn hàng mới nhất cần theo dõi nhanh"
              description="Snapshot mới nhất để thao tác nhanh. Khi cần xem toàn bộ backlog, bộ lọc và phân trang đầy đủ, hãy mở trang quản lý đơn hàng."
            />
            <div className="inline-actions">
              <Link className="text-link admin-widget-link" to="/admin/orders">
                Mở danh sách đơn hàng đầy đủ
              </Link>
            </div>
          </div>
          {statusError ? <p className="feedback-text feedback-text-error">{statusError}</p> : null}
          {statusFeedback ? <p className="feedback-text feedback-text-success">{statusFeedback}</p> : null}
          <div className="list-stack compact-list">
            {orders.map((order) => (
              <AdminOrderCard
                key={order.id}
                availableStatuses={metadata.orderStatusTransitions?.[order.orderStatus] ?? []}
                isUpdating={updateStatusMutation.isPending && updateStatusMutation.variables?.orderId === order.id}
                onUpdate={(payload) => updateStatusMutation.mutate(payload)}
                order={order}
              />
            ))}
          </div>
        </article>

        <article className="surface-card admin-dashboard-widget">
          <div className="admin-widget-head">
            <SectionHeading
              eyebrow="Dòng cập nhật"
              title="Những thay đổi mới nhất trong hệ thống"
              description="Các thông báo mới về đơn hàng, thanh toán và tồn kho sẽ xuất hiện tại đây để đội vận hành theo dõi nhanh."
            />
          </div>
          <div className="feed-stack admin-activity-feed">
            {realtimeFeed.length === 0 ? <p>Chưa có cập nhật mới lúc này. Khi đơn hàng, thanh toán hoặc tồn kho thay đổi, thông tin sẽ xuất hiện tại đây.</p> : realtimeFeed.map((event) => (
              <article key={`${event.event}-${event.receivedAt}`} className="feed-card">
                <strong>{formatAdminRealtimeFeedMessage(event.event, event.payload)}</strong>
                <p>{formatDate(event.receivedAt)}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="two-column-grid two-column-grid-wide admin-dashboard-grid admin-dashboard-grid-secondary">
        <article className="surface-card admin-dashboard-widget">
          <div className="admin-widget-head">
            <SectionHeading
              eyebrow="Yêu cầu hỗ trợ"
              title="6 yêu cầu hỗ trợ mới nhất từ khách hàng"
              description="Khối này chỉ hiển thị snapshot gần đây để đội vận hành phản hồi nhanh. Toàn bộ danh sách và bộ lọc chi tiết nằm ở trang quản lý liên hệ."
            />
            <div className="inline-actions">
              <Link className="text-link admin-widget-link" to="/admin/contacts">
                Mở danh sách liên hệ đầy đủ
              </Link>
            </div>
          </div>
          {contactError ? <p className="feedback-text feedback-text-error">{contactError}</p> : null}
          {contactFeedback ? <p className="feedback-text feedback-text-success">{contactFeedback}</p> : null}
          {contacts.length === 0 ? <EmptyState title="Chưa có yêu cầu hỗ trợ" description="Khi khách hàng gửi biểu mẫu hỗ trợ, yêu cầu sẽ xuất hiện tại đây." /> : (
            <div className="list-stack compact-list">
              {contacts.map((contact) => (
                <AdminContactCard
                  key={contact.id}
                  availableStatuses={metadata.contactStatuses ?? ['new', 'in_progress', 'resolved']}
                  contact={contact}
                  isUpdating={updateContactMutation.isPending && updateContactMutation.variables?.contactId === contact.id}
                  onUpdate={(payload) => updateContactMutation.mutate(payload)}
                />
              ))}
            </div>
          )}
        </article>

        <article className="surface-card admin-dashboard-widget">
          <div className="admin-widget-head">
            <SectionHeading
              eyebrow="Tồn kho"
              title="Biến động tồn gần nhất"
              description="Theo dõi nhanh các lượt nhập kho, điều chỉnh tồn và những thay đổi phát sinh từ quá trình xác nhận đơn."
            />
          </div>
          {inventoryTransactions.length === 0 ? <EmptyState title="Chưa có biến động tồn kho" description="Nhập kho, xuất kho hoặc điều chỉnh tồn sẽ xuất hiện tại đây." /> : (
            <div className="list-stack compact-list">
              {inventoryTransactions.map((transaction) => (
                <article key={transaction.id} className="inventory-card">
                  <strong>{transaction.book?.title ?? 'Bản ghi tồn kho'}</strong>
                  <p>{getInventoryTransactionLabel(transaction.type)} • {getInventoryQuantityLabel(transaction.quantity)} • {formatDate(transaction.createdAt)}</p>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}

export default AdminPage;
