import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';

import EmptyState from '@/components/EmptyState';
import PageLoadingState from '@/components/PageLoadingState';
import SectionHeading from '@/components/SectionHeading';
import { getMyOrder, getPaymentByOrder } from '@/features/account/account-api';
import {
  getOrderStatusLabel,
  getOrderStatusTone,
  getOrderTimeline,
  getPaymentMethodLabel,
  getPaymentMethodTone,
  getPaymentProviderLabel,
  getPaymentStatusLabel,
  getPaymentStatusTone,
} from '@/features/order/order-presentation';
import { formatCurrency, formatDate } from '@/lib/format';

function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId') ?? '';

  const orderQuery = useQuery({
    queryKey: ['orders', 'mine', orderId],
    queryFn: () => getMyOrder(orderId),
    enabled: Boolean(orderId),
  });

  const paymentQuery = useQuery({
    queryKey: ['payments', orderId],
    queryFn: () => getPaymentByOrder(orderId),
    enabled: Boolean(orderId),
  });

  if (!orderId) {
    return (
      <EmptyState
        title="Chưa có đơn hàng để hiển thị"
        description="Hãy tạo đơn từ giỏ hàng để mở trang xác nhận và theo dõi tiến trình giao hàng."
      />
    );
  }

  if (orderQuery.isPending) {
    return <PageLoadingState title="Đang tải thông tin đơn hàng" description="Vui lòng chờ trong giây lát để cửa hàng chuẩn bị dữ liệu xác nhận cho bạn." />;
  }

  if (orderQuery.error || !orderQuery.data) {
    return (
      <EmptyState
        title="Không thể tải đơn hàng"
        description={(orderQuery.error as Error | undefined)?.message ?? 'Liên kết xác nhận đơn hàng hiện tại không hợp lệ.'}
      />
    );
  }

  const order = orderQuery.data;
  const paymentLookup = paymentQuery.data;
  const timeline = getOrderTimeline(order.orderStatus);

  return (
    <div className="page-stack order-success-shell">
      <section className="order-success-hero">
        <div className="order-success-copy">
          <span className="order-success-badge">Đơn hàng đã được tạo</span>
          <h1>Cảm ơn bạn đã đặt hàng tại MMT Hiệu Sách.</h1>
          <p>
            Đơn <strong>{order.orderCode}</strong> đã được ghi nhận lúc {formatDate(order.createdAt)}. Tiếp theo, bạn có thể
            theo dõi trạng thái xử lý và thanh toán ngay trong khu vực tài khoản.
          </p>
          <div className="order-success-actions">
            <Link className="button button-primary" to={`/account?orderId=${order.id}`}>
              Theo dõi đơn hàng
            </Link>
            <Link className="button button-secondary" to="/catalog">
              Tiếp tục mua sách
            </Link>
          </div>
        </div>

        <div className="order-success-grid">
          <article className="summary-tile">
            <span>Tổng thanh toán</span>
            <strong>{formatCurrency(order.totalAmount)}</strong>
          </article>
          <article className="summary-tile">
            <span>Phương thức</span>
            <strong>{getPaymentMethodLabel(order.paymentMethod)}</strong>
          </article>
          <article className="summary-tile">
            <span>Trạng thái đơn</span>
            <strong>{getOrderStatusLabel(order.orderStatus)}</strong>
          </article>
          <article className="summary-tile">
            <span>Thanh toán</span>
            <strong>{getPaymentStatusLabel(order.paymentStatus)}</strong>
          </article>
        </div>
      </section>

      <section className="detail-panel-layout">
        <article className="detail-main-panel order-panel">
          <div className="detail-secondary-actions">
            <span className={`status-chip status-chip-${getOrderStatusTone(order.orderStatus)}`}>
              {getOrderStatusLabel(order.orderStatus)}
            </span>
            <span className={`status-chip status-chip-${getPaymentStatusTone(order.paymentStatus)}`}>
              {getPaymentStatusLabel(order.paymentStatus)}
            </span>
            <span className={`status-chip status-chip-${getPaymentMethodTone(order.paymentMethod)}`}>
              {getPaymentMethodLabel(order.paymentMethod)}
            </span>
          </div>

          <SectionHeading
            eyebrow="Tiến trình xử lý"
            title="Đơn hàng đang đi qua những bước nào"
            description="Bạn có thể xem nhanh cửa hàng đang xử lý đơn hàng đến bước nào ngay trên timeline này."
          />

          <div className="timeline-list">
            {timeline.map((step) => (
              <article key={step.key} className={`timeline-step timeline-step-${step.state}`}>
                <span className="timeline-step-mark" />
                <div>
                  <strong>{step.label}</strong>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="detail-fact-grid">
            <article>
              <span>Người nhận</span>
              <strong>{order.receiverName}</strong>
            </article>
            <article>
              <span>Số điện thoại</span>
              <strong>{order.receiverPhone}</strong>
            </article>
            <article>
              <span>Địa chỉ giao</span>
              <strong>{order.addressSnapshot}</strong>
            </article>
            <article>
              <span>Voucher</span>
              <strong>{order.voucher?.code ?? 'Không sử dụng'}</strong>
            </article>
            <article>
              <span>Ghi chú</span>
              <strong>{order.note ?? 'Không có ghi chú thêm'}</strong>
            </article>
            <article>
              <span>Số lượng sách</span>
              <strong>{order.items.length} dòng sản phẩm</strong>
            </article>
          </div>
        </article>

        <aside className="detail-sidebar-panel order-panel">
          <SectionHeading eyebrow="Thanh toán" title="Thông tin giao dịch" />
          <div className="order-payment-grid">
            <div>
              <span>Tổng tiền</span>
              <strong>{formatCurrency(paymentLookup?.totalAmount ?? order.totalAmount)}</strong>
            </div>
            <div>
              <span>Phương thức</span>
              <strong>{getPaymentMethodLabel(paymentLookup?.paymentMethod ?? order.paymentMethod)}</strong>
            </div>
            <div>
              <span>Trạng thái</span>
              <strong>{getPaymentStatusLabel(paymentLookup?.paymentStatus ?? order.paymentStatus)}</strong>
            </div>
            <div>
              <span>Đơn vị thanh toán</span>
              <strong>{getPaymentProviderLabel(paymentLookup?.payment?.provider ?? order.payment?.provider)}</strong>
            </div>
            <div>
              <span>Mã giao dịch</span>
              <strong>{paymentLookup?.payment?.transactionCode ?? order.payment?.transactionCode ?? 'Chưa có'}</strong>
            </div>
            <div>
              <span>Thời điểm thanh toán</span>
              <strong>{paymentLookup?.payment?.paidAt ? formatDate(paymentLookup.payment.paidAt) : order.payment?.paidAt ? formatDate(order.payment.paidAt) : 'Chưa thanh toán'}</strong>
            </div>
          </div>
        </aside>
      </section>

      <section className="order-panel detail-main-panel">
        <SectionHeading eyebrow="Chi tiết sản phẩm" title="Những tựa sách vừa được đặt" />
        <div className="order-item-list">
          {order.items.map((item) => (
            <article key={item.id} className="order-item-row">
              <div>
                <strong>{item.bookNameSnapshot}</strong>
                <p>{item.quantity} x {formatCurrency(item.unitPrice)}</p>
              </div>
              <strong>{formatCurrency(item.totalPrice)}</strong>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default OrderSuccessPage;

