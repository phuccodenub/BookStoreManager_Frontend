import { getOrderStatusLabel, getPaymentStatusLabel, type StatusTone } from '../order/order-presentation';
import type { ContactStatus, OrderStatus, PaymentStatus } from '../../lib/types';

const contactStatusLabels: Record<ContactStatus, string> = {
  new: 'Mới tiếp nhận',
  in_progress: 'Đang xử lý',
  resolved: 'Đã phản hồi',
};

const inventoryTransactionLabels: Record<string, string> = {
  import: 'Nhập kho',
  export: 'Xuất kho',
  adjustment: 'Điều chỉnh tồn',
  order_confirm: 'Giữ hàng cho đơn',
  order_cancel: 'Hoàn tồn do hủy đơn',
};

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

export function getInventoryQuantityLabel(quantity: number) {
  if (quantity === 0) {
    return '0 cuốn';
  }

  return `${quantity > 0 ? '+' : ''}${quantity} cuốn`;
}

export function getContactStatusLabel(status: ContactStatus) {
  return contactStatusLabels[status];
}

export function getContactStatusTone(status: ContactStatus): StatusTone {
  switch (status) {
    case 'resolved':
      return 'success';
    case 'in_progress':
      return 'info';
    default:
      return 'warm';
  }
}

export function getInventoryTransactionLabel(type: string) {
  return inventoryTransactionLabels[type] ?? type;
}

export function getAdminOrderUpdateMessage(orderCode: string, status: OrderStatus) {
  return `Đã cập nhật ${orderCode} sang trạng thái ${getOrderStatusLabel(status)}.`;
}

export function getAdminContactUpdateMessage(subject: string, status: ContactStatus) {
  return `Đã cập nhật yêu cầu "${subject}" sang trạng thái ${getContactStatusLabel(status)}.`;
}

export function formatAdminRealtimeFeedMessage(eventName: string, payload: unknown) {
  const orderCode = readString(payload, 'orderCode');
  const nextOrderStatus = readString(payload, 'to');
  const paymentStatus = readString(payload, 'paymentStatus');
  const bookTitle = readString(payload, 'bookTitle') ?? readString(payload, 'title');
  const notificationType = readString(payload, 'type');

  switch (eventName) {
    case 'order:created':
      return orderCode ? `Đơn hàng ${orderCode} vừa được tạo trên hệ thống.` : 'Có đơn hàng mới vừa được tạo.';
    case 'order:updated':
    case 'order:statusChanged':
      if (orderCode && nextOrderStatus && isOrderStatus(nextOrderStatus)) {
        return `Đơn ${orderCode} đã chuyển sang ${getOrderStatusLabel(nextOrderStatus)}.`;
      }
      return orderCode ? `Đơn ${orderCode} vừa được cập nhật.` : 'Có đơn hàng vừa được cập nhật.';
    case 'payment:success':
      return orderCode ? `Thanh toán của đơn ${orderCode} đã được xác nhận thành công.` : 'Có giao dịch vừa được xác nhận thành công.';
    case 'payment:updated':
      if (orderCode && paymentStatus && isPaymentStatus(paymentStatus)) {
        return `Thanh toán của đơn ${orderCode} đang ở trạng thái ${getPaymentStatusLabel(paymentStatus)}.`;
      }
      return orderCode ? `Thanh toán của đơn ${orderCode} vừa được cập nhật.` : 'Có giao dịch thanh toán vừa được cập nhật.';
    case 'inventory:low-stock':
      return bookTitle ? `${bookTitle} đang xuống mức tồn kho thấp, cần kiểm tra sớm.` : 'Có đầu sách đang xuống mức tồn kho thấp.';
    case 'notification:new':
      if (notificationType === 'order' && orderCode) {
        return `Hệ thống vừa ghi nhận thông báo mới cho đơn ${orderCode}.`;
      }
      return 'Có thông báo vận hành mới từ hệ thống.';
    default:
      return 'Có cập nhật vận hành mới vừa được ghi nhận.';
  }
}
