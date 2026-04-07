import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  downloadDeliveryNote,
  downloadInvoice,
  getAdminOrderById,
  getAdminOrders,
  getAdminPaymentByOrder,
  updateOrderStatus,
} from '@/features/admin/admin-api';
import { getAdminOrderUpdateMessage } from '@/features/admin/admin-presentation';
import { getMetadata } from '@/features/catalog/catalog-api';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  getOrderStatusLabel,
  getOrderStatusTone,
  getPaymentMethodLabel,
  getPaymentProviderLabel,
  getPaymentStatusLabel,
  getPaymentStatusTone,
} from '@/features/order/order-presentation';
import type { OrderStatus } from '@/lib/types';

function triggerDownload(filename: string, blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  const { data: metadata } = useSuspenseQuery({
    queryKey: ['metadata', 'admin', 'orders'],
    queryFn: getMetadata,
  });
  const { data: orderList } = useSuspenseQuery({
    queryKey: ['admin', 'orders', 'full', page, search, statusFilter],
    queryFn: () =>
      getAdminOrders({
        page,
        limit: 12,
        search,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

  const orders = orderList.items;
  const meta = orderList.meta;

  useEffect(() => {
    if (orders.length === 0) {
      setSelectedOrderId(null);
      return;
    }

    if (!selectedOrderId || !orders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(orders[0].id);
    }
  }, [orders, selectedOrderId]);

  const selectedOrderQuery = useQuery({
    queryKey: ['admin', 'orders', 'detail', selectedOrderId],
    queryFn: () => getAdminOrderById(selectedOrderId ?? ''),
    enabled: Boolean(selectedOrderId),
  });
  const paymentLookupQuery = useQuery({
    queryKey: ['admin', 'orders', 'payment', selectedOrderId],
    queryFn: () => getAdminPaymentByOrder(selectedOrderId ?? ''),
    enabled: Boolean(selectedOrderId),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      orderId,
      orderStatus,
      cancelledReason,
    }: {
      orderId: string;
      orderStatus: Exclude<OrderStatus, 'pending'>;
      cancelledReason?: string;
    }) => updateOrderStatus(orderId, { orderStatus, cancelledReason }),
    onSuccess: async (updated) => {
      setErrorMessage(null);
      setFeedback(getAdminOrderUpdateMessage(updated.orderCode, updated.orderStatus));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
      ]);
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái đơn hàng');
    },
  });

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function handleDocumentDownload(orderId: string, orderCode: string, type: 'invoice' | 'delivery-note') {
    try {
      setDownloadingDoc(`${type}:${orderId}`);
      const blob = type === 'invoice' ? await downloadInvoice(orderId) : await downloadDeliveryNote(orderId);
      triggerDownload(`${orderCode}-${type}.pdf`, blob);
    } finally {
      setDownloadingDoc(null);
    }
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Đơn hàng"
        title="Quản trị danh sách đơn hàng với filter, phân trang và chi tiết giao dịch"
        description="Trang này đã được nâng từ bản rút gọn sang màn vận hành thật: lọc theo trạng thái, tìm theo mã đơn hoặc người nhận, xem chi tiết người mua và đối soát thanh toán."
      />

      <section className="surface-card admin-manager-toolbar">
        <form className="inline-actions" onSubmit={handleSearchSubmit}>
          <label className="field admin-manager-search">
            <span>Tìm đơn hàng</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Mã đơn, người nhận, số điện thoại"
              value={searchInput}
            />
          </label>
          <label className="field">
            <span>Trạng thái</span>
            <select onChange={(event) => setStatusFilter(event.target.value as 'all' | OrderStatus)} value={statusFilter}>
              <option value="all">Tất cả</option>
              {metadata.orderStatuses.map((status) => (
                <option key={status} value={status}>
                  {getOrderStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-secondary" type="submit">
            Lọc
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              setSearchInput('');
              setSearch('');
              setStatusFilter('all');
              setPage(1);
            }}
            type="button"
          >
            Bỏ lọc
          </button>
        </form>
      </section>

      {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
      {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}

      {orders.length === 0 ? (
        <EmptyState title="Không có đơn hàng phù hợp" description="Thử thay đổi điều kiện lọc hoặc chờ dữ liệu mới từ hệ thống." />
      ) : (
        <section className="two-column-grid two-column-grid-wide">
          <article className="surface-card">
            <SectionHeading
              eyebrow="Danh sách"
              title="Các đơn hàng đang theo dõi"
              description={meta ? `Trang ${meta.page}/${meta.totalPages} • ${meta.total} đơn phù hợp` : 'Danh sách đơn hàng trả về từ backend'}
            />
            <div className="list-stack compact-list">
              {orders.map((order) => {
                const nextStatuses = (metadata.orderStatusTransitions?.[order.orderStatus] ?? []) as Exclude<OrderStatus, 'pending'>[];

                return (
                  <article className="order-card" key={order.id}>
                    <div className="order-card-header">
                      <div>
                        <strong>{order.orderCode}</strong>
                        <p>{order.user?.fullName ?? 'Khách hàng'} • {formatDate(order.createdAt)}</p>
                      </div>
                      <div className="inline-actions">
                        <span className={`status-chip status-chip-${getOrderStatusTone(order.orderStatus)}`}>{getOrderStatusLabel(order.orderStatus)}</span>
                        <span className={`status-chip status-chip-${getPaymentStatusTone(order.paymentStatus)}`}>{getPaymentStatusLabel(order.paymentStatus)}</span>
                      </div>
                    </div>
                    <p>{formatCurrency(order.totalAmount)} • {order.items.length} dòng sản phẩm</p>
                    {order.cancelledReason ? (
                      <div className="reason-callout">
                        <span>Lý do hủy</span>
                        <strong>{order.cancelledReason}</strong>
                      </div>
                    ) : null}
                    <div className="inline-actions">
                      <button className="button button-secondary" onClick={() => setSelectedOrderId(order.id)} type="button">
                        {selectedOrderId === order.id ? 'Đang xem' : 'Chi tiết'}
                      </button>
                      {nextStatuses.map((status) => (
                        <button
                          className="button button-secondary"
                          disabled={updateMutation.isPending}
                          key={status}
                          onClick={() => {
                            if (status === 'cancelled') {
                              const reason = window.prompt('Nhập lý do hủy đơn hàng', 'Hủy từ khu vực vận hành')?.trim();
                              if (!reason) {
                                return;
                              }
                              updateMutation.mutate({ orderId: order.id, orderStatus: status, cancelledReason: reason });
                              return;
                            }

                            updateMutation.mutate({ orderId: order.id, orderStatus: status });
                          }}
                          type="button"
                        >
                          {getOrderStatusLabel(status)}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
            {meta ? (
              <div className="inline-actions">
                <button className="button button-secondary" disabled={meta.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">
                  Trang trước
                </button>
                <span>Trang {meta.page} / {meta.totalPages}</span>
                <button className="button button-secondary" disabled={meta.page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} type="button">
                  Trang sau
                </button>
              </div>
            ) : null}
          </article>

          <article className="surface-card">
            <SectionHeading
              eyebrow="Chi tiết"
              title="Thông tin người nhận, sản phẩm và thanh toán"
              description="Panel này dùng cả `GET /orders/:id` và `GET /payments/:orderId` để đối chiếu nhanh trong back-office."
            />
            {selectedOrderQuery.isLoading ? <p>Đang tải chi tiết đơn hàng...</p> : null}
            {selectedOrderQuery.error ? (
              <p className="feedback-text feedback-text-error">
                {selectedOrderQuery.error instanceof Error ? selectedOrderQuery.error.message : 'Không thể tải chi tiết đơn hàng'}
              </p>
            ) : null}
            {selectedOrderQuery.data ? (
              <div className="page-stack">
                <div className="order-card-header">
                  <div>
                    <strong>{selectedOrderQuery.data.orderCode}</strong>
                    <p>{selectedOrderQuery.data.user?.fullName ?? selectedOrderQuery.data.receiverName} • {selectedOrderQuery.data.user?.email ?? 'Không có email'}</p>
                  </div>
                  <div className="inline-actions">
                    <span className={`status-chip status-chip-${getOrderStatusTone(selectedOrderQuery.data.orderStatus)}`}>
                      {getOrderStatusLabel(selectedOrderQuery.data.orderStatus)}
                    </span>
                    <span className={`status-chip status-chip-${getPaymentStatusTone(selectedOrderQuery.data.paymentStatus)}`}>
                      {getPaymentStatusLabel(selectedOrderQuery.data.paymentStatus)}
                    </span>
                  </div>
                </div>

                <div className="details-grid">
                  <div>
                    <span>Người nhận</span>
                    <strong>{selectedOrderQuery.data.receiverName}</strong>
                  </div>
                  <div>
                    <span>Số điện thoại</span>
                    <strong>{selectedOrderQuery.data.receiverPhone}</strong>
                  </div>
                  <div>
                    <span>Tổng thanh toán</span>
                    <strong>{formatCurrency(selectedOrderQuery.data.totalAmount)}</strong>
                  </div>
                  <div>
                    <span>Phương thức</span>
                    <strong>{getPaymentMethodLabel(selectedOrderQuery.data.paymentMethod)}</strong>
                  </div>
                  <div>
                    <span>Voucher</span>
                    <strong>{selectedOrderQuery.data.voucher?.code ?? 'Không dùng voucher'}</strong>
                  </div>
                  <div>
                    <span>Ngày tạo</span>
                    <strong>{formatDate(selectedOrderQuery.data.createdAt)}</strong>
                  </div>
                </div>

                <div className="reason-callout">
                  <span>Địa chỉ giao hàng</span>
                  <strong>{selectedOrderQuery.data.addressSnapshot}</strong>
                </div>

                {selectedOrderQuery.data.note ? (
                  <div className="reason-callout">
                    <span>Ghi chú khách hàng</span>
                    <strong>{selectedOrderQuery.data.note}</strong>
                  </div>
                ) : null}

                {selectedOrderQuery.data.cancelledReason ? (
                  <div className="reason-callout">
                    <span>Lý do hủy</span>
                    <strong>{selectedOrderQuery.data.cancelledReason}</strong>
                  </div>
                ) : null}

                <div className="details-grid">
                  <div>
                    <span>Nhà cung cấp thanh toán</span>
                    <strong>{getPaymentProviderLabel(paymentLookupQuery.data?.payment?.provider ?? selectedOrderQuery.data.payment?.provider)}</strong>
                  </div>
                  <div>
                    <span>Mã giao dịch</span>
                    <strong>{paymentLookupQuery.data?.payment?.transactionCode ?? selectedOrderQuery.data.payment?.transactionCode ?? 'Chưa có'}</strong>
                  </div>
                  <div>
                    <span>Thời điểm thanh toán</span>
                    <strong>
                      {paymentLookupQuery.data?.payment?.paidAt
                        ? formatDate(paymentLookupQuery.data.payment.paidAt)
                        : selectedOrderQuery.data.payment?.paidAt
                          ? formatDate(selectedOrderQuery.data.payment.paidAt)
                          : 'Chưa thanh toán'}
                    </strong>
                  </div>
                </div>

                <div className="inline-actions">
                  <button
                    className="button button-secondary"
                    disabled={downloadingDoc === `invoice:${selectedOrderQuery.data.id}`}
                    onClick={() => void handleDocumentDownload(selectedOrderQuery.data.id, selectedOrderQuery.data.orderCode, 'invoice')}
                    type="button"
                  >
                    {downloadingDoc === `invoice:${selectedOrderQuery.data.id}` ? 'Đang tải hóa đơn...' : 'Tải hóa đơn'}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={downloadingDoc === `delivery-note:${selectedOrderQuery.data.id}`}
                    onClick={() => void handleDocumentDownload(selectedOrderQuery.data.id, selectedOrderQuery.data.orderCode, 'delivery-note')}
                    type="button"
                  >
                    {downloadingDoc === `delivery-note:${selectedOrderQuery.data.id}` ? 'Đang tải phiếu...' : 'Tải phiếu giao'}
                  </button>
                </div>

                <div className="list-stack compact-list">
                  {selectedOrderQuery.data.items.map((item) => (
                    <article className="inventory-card" key={item.id}>
                      <strong>{item.bookNameSnapshot}</strong>
                      <p>Số lượng: {item.quantity} • Đơn giá: {formatCurrency(item.unitPrice)}</p>
                      <p>Thành tiền: {formatCurrency(item.totalPrice)}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <p>Chọn một đơn hàng ở cột bên trái để xem chi tiết.</p>
            )}
          </article>
        </section>
      )}
    </div>
  );
}

export default AdminOrdersPage;
