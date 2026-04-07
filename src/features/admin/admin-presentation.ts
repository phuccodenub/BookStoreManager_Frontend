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

const activityEntityLabels: Record<string, string> = {
  auth: 'xác thực',
  inventory_transaction: 'giao dịch tồn kho',
  order: 'đơn hàng',
  payment: 'thanh toán',
  review: 'đánh giá',
  system_config: 'cấu hình hệ thống',
  user: 'người dùng',
};

const activityActionLabels: Record<string, string> = {
  login: 'đăng nhập',
  change_password: 'đổi mật khẩu',
  order_created: 'tạo đơn hàng',
  order_cancelled: 'hủy đơn hàng',
  order_status_updated: 'cập nhật trạng thái đơn hàng',
  payment_webhook_processed: 'xử lý webhook thanh toán',
  review_updated: 'cập nhật đánh giá',
  review_deleted: 'xóa đánh giá',
  settings_updated: 'cập nhật cấu hình',
  user_created: 'tạo người dùng',
  user_updated: 'cập nhật người dùng',
  user_status_updated: 'cập nhật trạng thái người dùng',
  inventory_import_created: 'ghi nhận nhập kho',
  inventory_export_created: 'ghi nhận xuất kho',
  inventory_adjustment_created: 'ghi nhận điều chỉnh tồn',
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

function humanizeIdentifier(value: string) {
  return value
    .replace(/[_:.-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function getAdminOrderUpdateMessage(orderCode: string, status: OrderStatus) {
  return `Đã cập nhật ${orderCode} sang trạng thái ${getOrderStatusLabel(status)}.`;
}

export function getAdminContactUpdateMessage(subject: string, status: ContactStatus) {
  return `Đã cập nhật yêu cầu "${subject}" sang trạng thái ${getContactStatusLabel(status)}.`;
}

export function formatActivityEntityLabel(entityType: string) {
  return activityEntityLabels[entityType] ?? humanizeIdentifier(entityType);
}

export function formatActivityActionLabel(action: string) {
  return activityActionLabels[action] ?? humanizeIdentifier(action);
}

export function formatActivityLogTitle(action: string, entityType: string) {
  const actionLabel = formatActivityActionLabel(action);
  const entityLabel = formatActivityEntityLabel(entityType);

  if (actionLabel.includes(entityLabel)) {
    return actionLabel;
  }

  return `${actionLabel} ${entityLabel}`.trim();
}

export function formatActivityDataPreview(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value) && value.length === 0) {
    return null;
  }

  if (isRecord(value) && Object.keys(value).length === 0) {
    return null;
  }

  try {
    const raw = JSON.stringify(value);
    if (!raw) {
      return null;
    }

    return raw.length > 140 ? `${raw.slice(0, 137)}...` : raw;
  } catch {
    return null;
  }
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
