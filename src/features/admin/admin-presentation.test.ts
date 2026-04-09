import { describe, expect, test } from 'vitest';

import {
  formatAdminRealtimeFeedMessage,
  formatActivityActionLabel,
  formatActivityDataPreview,
  formatActivityEntityLabel,
  formatActivityLogTitle,
  getAdminContactUpdateMessage,
  getAdminOrderUpdateMessage,
  getContactStatusLabel,
  getContactStatusTone,
  getInventoryQuantityLabel,
  getInventoryTransactionLabel,
} from './admin-presentation';

describe('admin-presentation', () => {
  test('maps contact statuses to friendly Vietnamese labels', () => {
    expect(getContactStatusLabel('new')).toBe('Mới tiếp nhận');
    expect(getContactStatusLabel('in_progress')).toBe('Đang xử lý');
    expect(getContactStatusLabel('resolved')).toBe('Đã phản hồi');
    expect(getContactStatusTone('new')).toBe('warm');
    expect(getContactStatusTone('in_progress')).toBe('info');
    expect(getContactStatusTone('resolved')).toBe('success');
  });

  test('formats admin feedback messages with business labels', () => {
    expect(getAdminOrderUpdateMessage('ORD-001', 'shipping')).toBe('Đã cập nhật ORD-001 sang trạng thái Đang giao hàng.');
    expect(getAdminContactUpdateMessage('Cần đổi địa chỉ', 'resolved')).toBe('Đã cập nhật yêu cầu "Cần đổi địa chỉ" sang trạng thái Đã phản hồi.');
  });

  test('formats realtime order and inventory events for admin feed', () => {
    expect(formatAdminRealtimeFeedMessage('order:statusChanged', { orderCode: 'ORD-123', to: 'packing' })).toBe(
      'Đơn ORD-123 đã chuyển sang Đang đóng gói.',
    );
    expect(formatAdminRealtimeFeedMessage('inventory:low-stock', { bookTitle: 'Clean Code' })).toBe(
      'Clean Code đang xuống mức tồn kho thấp, cần kiểm tra sớm.',
    );
  });

  test('falls back gracefully for generic realtime notifications', () => {
    expect(formatAdminRealtimeFeedMessage('notification:new', { type: 'order', orderCode: 'ORD-555' })).toBe(
      'Hệ thống vừa ghi nhận thông báo mới cho đơn ORD-555.',
    );
    expect(formatAdminRealtimeFeedMessage('unknown:event', null)).toBe('Có cập nhật vận hành mới vừa được ghi nhận.');
  });

  test('labels inventory transaction types with operator-friendly copy', () => {
    expect(getInventoryTransactionLabel('order_confirm')).toBe('Giữ hàng cho đơn');
    expect(getInventoryTransactionLabel('adjustment')).toBe('Điều chỉnh tồn');
    expect(getInventoryQuantityLabel(3)).toBe('+3 cuốn');
    expect(getInventoryQuantityLabel(-1)).toBe('-1 cuốn');
  });

  test('formats audit entity and action labels for activity logs', () => {
    expect(formatActivityEntityLabel('system_config')).toBe('cấu hình hệ thống');
    expect(formatActivityActionLabel('order_status_updated')).toBe('cập nhật trạng thái đơn hàng');
    expect(formatActivityLogTitle('user_created', 'user')).toBe('tạo người dùng');
    expect(formatActivityEntityLabel('custom.event')).toBe('custom event');
  });

  test('previews activity log payloads without overwhelming the UI', () => {
    expect(formatActivityDataPreview({ orderStatus: 'shipping', paymentStatus: 'paid' })).toBe(
      '{"orderStatus":"shipping","paymentStatus":"paid"}',
    );
    expect(formatActivityDataPreview(null)).toBeNull();
    expect(formatActivityDataPreview({})).toBeNull();
  });
});
