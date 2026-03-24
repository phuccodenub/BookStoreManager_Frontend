import { describe, expect, it } from 'vitest';

import { formatRealtimeFeedMessage } from './realtime-feed';

describe('formatRealtimeFeedMessage', () => {
  it('formats order status changes with a friendly message', () => {
    expect(formatRealtimeFeedMessage('order:statusChanged', {
      orderCode: 'ORD-20260322-8D2FF99D',
      to: 'shipping',
    })).toBe('Đơn hàng ORD-20260322-8D2FF99D đã chuyển sang trạng thái Đang giao hàng.');
  });

  it('formats payment success events with order code context', () => {
    expect(formatRealtimeFeedMessage('payment:success', {
      orderCode: 'ORD-20260322-8D2FF99D',
    })).toBe('Thanh toán của đơn ORD-20260322-8D2FF99D đã thành công.');
  });
});
