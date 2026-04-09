import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/lib/types';

export type StatusTone = 'warm' | 'success' | 'info' | 'danger' | 'muted';
export type TimelineState = 'done' | 'current' | 'upcoming';

interface TimelineBlueprint {
  key: string;
  label: string;
  description: string;
}

const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói',
  shipping: 'Đang giao hàng',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  unpaid: 'Chưa thanh toán',
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán lỗi',
  refunded: 'Đã hoàn tiền',
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cod: 'Thanh toán khi nhận hàng',
  online: 'Thanh toán trực tuyến',
};

const paymentProviderLabels: Record<string, string> = {
  cod: 'Thanh toán khi nhận hàng',
  mock_gateway: 'Thanh toán trực tuyến',
};

const orderTimelineBlueprint: TimelineBlueprint[] = [
  {
    key: 'pending',
    label: 'Đặt đơn',
    description: 'Hệ thống đã ghi nhận đơn hàng và đang chờ cửa hàng xác nhận.',
  },
  {
    key: 'confirmed',
    label: 'Xác nhận',
    description: 'Cửa hàng đã kiểm tra thông tin và bắt đầu xử lý đơn hàng của bạn.',
  },
  {
    key: 'packing',
    label: 'Đóng gói',
    description: 'Sách đang được chuẩn bị và đóng gói tại kho.',
  },
  {
    key: 'shipping',
    label: 'Vận chuyển',
    description: 'Đơn hàng đang trên đường giao đến người nhận.',
  },
  {
    key: 'completed',
    label: 'Hoàn tất',
    description: 'Đơn hàng đã được giao thành công.',
  },
];

export function getOrderStatusLabel(status: OrderStatus) {
  return orderStatusLabels[status];
}

export function getPaymentStatusLabel(status: PaymentStatus) {
  return paymentStatusLabels[status];
}

export function getPaymentMethodLabel(method: PaymentMethod) {
  return paymentMethodLabels[method];
}

export function getPaymentProviderLabel(provider: string | null | undefined) {
  if (!provider) {
    return 'Đang cập nhật';
  }

  return paymentProviderLabels[provider] ?? provider;
}

export function getOrderStatusTone(status: OrderStatus): StatusTone {
  switch (status) {
    case 'completed':
      return 'success';
    case 'shipping':
      return 'info';
    case 'confirmed':
    case 'packing':
      return 'warm';
    case 'cancelled':
      return 'danger';
    default:
      return 'muted';
  }
}

export function getPaymentStatusTone(status: PaymentStatus): StatusTone {
  switch (status) {
    case 'paid':
      return 'success';
    case 'pending':
      return 'info';
    case 'failed':
    case 'refunded':
      return 'danger';
    default:
      return 'muted';
  }
}

export function getPaymentMethodTone(method: PaymentMethod): StatusTone {
  return method === 'online' ? 'info' : 'warm';
}

export function getOrderTimeline(status: OrderStatus) {
  if (status === 'cancelled') {
    return [
      {
        key: 'pending',
        label: 'Đặt đơn',
        description: 'Đơn hàng đã được tạo và ghi nhận trong hệ thống.',
        state: 'done' as TimelineState,
      },
      {
        key: 'cancelled',
        label: 'Đã hủy',
        description: 'Đơn hàng đã dừng xử lý theo yêu cầu hiện tại.',
        state: 'current' as TimelineState,
      },
    ];
  }

  const currentIndex = orderTimelineBlueprint.findIndex((step) => step.key === status);

  return orderTimelineBlueprint.map((step, index) => ({
    ...step,
    state: index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'upcoming',
  }));
}
