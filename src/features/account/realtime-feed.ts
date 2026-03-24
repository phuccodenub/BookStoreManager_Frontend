import { getOrderStatusLabel, getPaymentStatusLabel } from '../order/order-presentation';
import type { OrderStatus, PaymentStatus } from '../../lib/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(payload: unknown, key: string) {
  if (!isRecord(payload)) {
    return null;
  }

  const value = payload[key];
  return typeof value === 'string' ? value : null;
}

function isOrderStatus(value: string): value is OrderStatus {
  return ['pending', 'confirmed', 'packing', 'shipping', 'completed', 'cancelled'].includes(value);
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return ['unpaid', 'pending', 'paid', 'failed', 'refunded'].includes(value);
}

export function formatRealtimeFeedMessage(eventName: string, payload: unknown) {
  const orderCode = readString(payload, 'orderCode');
  const nextOrderStatus = readString(payload, 'to');
  const paymentStatus = readString(payload, 'paymentStatus');
  const notificationType = readString(payload, 'type');

  switch (eventName) {
    case 'order:created':
      return orderCode ? `Đơn hàng ${orderCode} đã được ghi nhận.` : 'Đơn hàng mới đã được ghi nhận.';
    case 'order:updated':
    case 'order:statusChanged':
      if (orderCode && nextOrderStatus && isOrderStatus(nextOrderStatus)) {
        return `Đơn hàng ${orderCode} đã chuyển sang trạng thái ${getOrderStatusLabel(nextOrderStatus)}.`;
      }
      return orderCode ? `Đơn hàng ${orderCode} vừa được cập nhật.` : 'Đơn hàng của bạn vừa được cập nhật.';
    case 'payment:success':
      return orderCode ? `Thanh toán của đơn ${orderCode} đã thành công.` : 'Thanh toán của bạn đã được xác nhận thành công.';
    case 'payment:updated':
      if (orderCode && paymentStatus && isPaymentStatus(paymentStatus)) {
        return `Thanh toán của đơn ${orderCode} đang ở trạng thái ${getPaymentStatusLabel(paymentStatus)}.`;
      }
      return orderCode ? `Thanh toán của đơn ${orderCode} vừa được cập nhật.` : 'Thanh toán của bạn vừa được cập nhật.';
    case 'notification:new':
      if (notificationType === 'order' && orderCode) {
        return `Cửa hàng đã ghi nhận đơn hàng mới ${orderCode}.`;
      }
      return 'Bạn có một cập nhật mới từ cửa hàng.';
    default:
      return 'Bạn có một cập nhật mới từ cửa hàng.';
  }
}
