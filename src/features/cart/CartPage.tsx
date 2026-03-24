import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import { useAuth } from '@/features/auth/AuthContext';
import { createOrder, getAddresses, getCart, getSettings, removeCartItem, updateCartItem } from '@/features/cart/cart-api';
import { getPaymentMethodLabel } from '@/features/order/order-presentation';
import { ApiError } from '@/lib/api-client';
import { formatCurrency } from '@/lib/format';

function CartPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { data: cart } = useSuspenseQuery({ queryKey: ['cart'], queryFn: getCart });
  const { data: addresses } = useSuspenseQuery({ queryKey: ['addresses'], queryFn: getAddresses });
  const { data: settings } = useSuspenseQuery({ queryKey: ['settings'], queryFn: getSettings });
  const [voucherCode, setVoucherCode] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [addressId, setAddressId] = useState('');
  const [cartFeedback, setCartFeedback] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    const nextAddressId = addresses.some((address) => address.id === addressId)
      ? addressId
      : addresses[0]?.id ?? '';

    if (nextAddressId !== addressId) {
      setAddressId(nextAddressId);
    }
  }, [addressId, addresses]);

  const selectedItems = useMemo(() => cart.items.filter((item) => item.selected), [cart.items]);
  const subtotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + Number(item.book.price) * item.quantity, 0),
    [selectedItems],
  );
  const shippingPreview = selectedItems.length > 0 ? settings.shippingFee : 0;
  const totalPreview = subtotal + shippingPreview;
  const selectedAddress = addresses.find((address) => address.id === addressId) ?? addresses[0] ?? null;

  const cartMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: { quantity?: number; selected?: boolean } }) => updateCartItem(itemId, payload),
    onSuccess: async () => {
      setCartError(null);
      setCartFeedback('Giỏ hàng đã được cập nhật.');
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error) => {
      setCartFeedback(null);
      setCartError(error instanceof Error ? error.message : 'Không thể cập nhật giỏ hàng');
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeCartItem,
    onSuccess: async () => {
      setCartError(null);
      setCartFeedback('Sách đã được bỏ khỏi giỏ hàng.');
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error) => {
      setCartFeedback(null);
      setCartError(error instanceof Error ? error.message : 'Không thể xóa sách khỏi giỏ');
    },
  });

  const orderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: async (order) => {
      setOrderError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cart'] }),
        queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] }),
      ]);
      navigate(`/order-success?orderId=${order.id}`);
    },
    onError: (error) => {
      setOrderError(error instanceof ApiError ? error.message : 'Không thể tạo đơn hàng từ giỏ hiện tại');
    },
  });

  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="Giỏ hàng của bạn đang trống"
        description="Hãy thêm sách từ trang chủ hoặc danh mục để bắt đầu thanh toán."
      />
    );
  }

  return (
    <div className="page-stack checkout-shell">
      <section className="checkout-hero">
        <div>
          <SectionHeading
            eyebrow="Thanh toán"
            title={`Hoàn tất đơn sách cho ${session?.user.fullName ?? 'bạn'}`}
            description="Kiểm tra lại giỏ hàng, chọn địa chỉ nhận và xác nhận phương thức thanh toán phù hợp."
          />
        </div>
        <div className="summary-tile-grid">
          <article className="summary-tile">
            <span>Sản phẩm đã chọn</span>
            <strong>{selectedItems.length}</strong>
          </article>
          <article className="summary-tile">
            <span>Tạm tính</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </article>
          <article className="summary-tile">
            <span>Phí giao dự kiến</span>
            <strong>{formatCurrency(shippingPreview)}</strong>
          </article>
          <article className="summary-tile">
            <span>Tổng tạm tính</span>
            <strong>{formatCurrency(totalPreview)}</strong>
          </article>
        </div>
      </section>

      <section className="checkout-layout">
        <article className="checkout-panel checkout-items-panel">
          <div className="shelf-header">
            <SectionHeading eyebrow="Giỏ hàng" title="Rà soát từng tựa sách trước khi đặt" />
            <Link className="text-link" to="/catalog">
              Thêm sách nữa
            </Link>
          </div>

          <div className="list-stack">
            {cart.items.map((item) => {
              const isUpdating = cartMutation.isPending && cartMutation.variables?.itemId === item.id;
              const isRemoving = removeMutation.isPending && removeMutation.variables === item.id;
              const canIncreaseQuantity = item.quantity < (item.book.stockQuantity ?? Number.POSITIVE_INFINITY);

              return (
                <article key={item.id} className="checkout-line-card">
                  <div className="checkout-line-main">
                    <label className="checkout-checkbox">
                      <input
                        checked={item.selected}
                        onChange={(event) => cartMutation.mutate({ itemId: item.id, payload: { selected: event.target.checked } })}
                        type="checkbox"
                      />
                    </label>

                    <div className="checkout-line-book">
                      <div className="checkout-line-cover">
                        {item.book.coverImage ? <img alt={item.book.title} src={item.book.coverImage} /> : <span>{item.book.title.slice(0, 1)}</span>}
                      </div>

                      <div className="checkout-line-copy">
                        <p className="eyebrow">{item.book.author?.name ?? item.book.category?.name ?? 'Sách đã chọn'}</p>
                        <h3>{item.book.title}</h3>
                        <p>{item.book.publisher?.name ?? 'Ấn phẩm dành cho người yêu sách'}</p>
                      </div>
                    </div>

                    <div className="checkout-line-price">
                      <span>Đơn giá</span>
                      <strong>{formatCurrency(item.book.price)}</strong>
                    </div>
                  </div>

                  <div className="checkout-line-footer">
                    <div className="checkout-stepper">
                      <button
                        disabled={isUpdating || item.quantity <= 1}
                        onClick={() => cartMutation.mutate({ itemId: item.id, payload: { quantity: Math.max(1, item.quantity - 1) } })}
                        type="button"
                      >
                        -
                      </button>
                      <strong>{item.quantity}</strong>
                      <button
                        disabled={isUpdating || !canIncreaseQuantity}
                        onClick={() => cartMutation.mutate({ itemId: item.id, payload: { quantity: item.quantity + 1 } })}
                        type="button"
                      >
                        +
                      </button>
                    </div>

                    <p>{formatCurrency(Number(item.book.price) * item.quantity)}</p>

                    <button className="text-link" disabled={isRemoving} onClick={() => removeMutation.mutate(item.id)} type="button">
                      {isRemoving ? 'Đang xóa' : 'Bỏ khỏi giỏ'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {cartError ? <p className="feedback-text feedback-text-error">{cartError}</p> : null}
          {cartFeedback ? <p className="feedback-text feedback-text-success">{cartFeedback}</p> : null}
        </article>

        <aside className="checkout-panel checkout-summary-panel checkout-sticky">
          <SectionHeading
            eyebrow="Xác nhận đơn"
            title="Thông tin giao hàng, thanh toán và ghi chú"
            description="Hoàn tất vài bước cuối cùng để gửi đơn hàng của bạn đến cửa hàng."
          />

          <label className="field">
            <span>Địa chỉ nhận hàng</span>
            <select value={addressId} onChange={(event) => setAddressId(event.target.value)}>
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.receiverName} - {address.detailAddress}, {address.district}
                </option>
              ))}
            </select>
          </label>

          {selectedAddress ? (
            <article className="address-preview-card">
              <strong>{selectedAddress.receiverName}</strong>
              <p>{selectedAddress.receiverPhone}</p>
              <p>{selectedAddress.detailAddress}, {selectedAddress.ward}, {selectedAddress.district}, {selectedAddress.province}</p>
            </article>
          ) : (
            <div className="page-stack">
              <p className="feedback-text feedback-text-error">Bạn cần thêm địa chỉ trong khu vực tài khoản trước khi đặt hàng.</p>
              <Link className="text-link" to="/account">
                Thêm địa chỉ ngay
              </Link>
            </div>
          )}

          <div className="payment-choice-grid">
            {(['cod', 'online'] as const).map((method) => (
              <button
                key={method}
                className={clsx('payment-choice', paymentMethod === method && 'payment-choice-active')}
                onClick={() => setPaymentMethod(method)}
                type="button"
              >
                <strong>{getPaymentMethodLabel(method)}</strong>
                <p>{method === 'cod' ? 'Thanh toán khi nhận hàng, phù hợp cho đơn cần linh hoạt.' : 'Thanh toán trực tuyến để xác nhận đơn nhanh hơn.'}</p>
              </button>
            ))}
          </div>

          <label className="field">
            <span>Mã giảm giá</span>
            <input value={voucherCode} onChange={(event) => setVoucherCode(event.target.value)} placeholder="Nhập nếu có" />
          </label>

          <label className="field">
            <span>Ghi chú cho cửa hàng</span>
            <textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>

          <div className="summary-stack">
            <div><span>Khách hàng</span><strong>{session?.user.email ?? 'Đăng nhập'}</strong></div>
            <div><span>Số dòng được chọn</span><strong>{selectedItems.length}</strong></div>
            <div><span>Tạm tính</span><strong>{formatCurrency(subtotal)}</strong></div>
            <div><span>Vận chuyển</span><strong>{formatCurrency(shippingPreview)}</strong></div>
            <div><span>Tổng cộng</span><strong>{formatCurrency(totalPreview)}</strong></div>
          </div>

          <p className="checkout-note">
            {paymentMethod === 'cod'
              ? 'Đơn hàng sẽ được xác nhận ngay sau khi bạn hoàn tất bước đặt mua và thanh toán khi nhận hàng.'
              : 'Sau khi xác nhận, cửa hàng sẽ hướng dẫn bạn hoàn tất thanh toán trực tuyến theo thông tin hiển thị trong đơn.'}
          </p>
          {orderError ? <p className="feedback-text feedback-text-error">{orderError}</p> : null}

          <button
            className="button button-primary button-block"
            disabled={!selectedAddress || !addressId || selectedItems.length === 0 || orderMutation.isPending}
            onClick={() => {
              setOrderError(null);
              orderMutation.mutate({
                addressId,
                paymentMethod,
                voucherCode: voucherCode.trim() || undefined,
                note: note.trim() || undefined,
                cartItemIds: selectedItems.map((item) => item.id),
              });
            }}
            type="button"
          >
            {orderMutation.isPending ? 'Đang tạo đơn hàng...' : 'Xác nhận đặt hàng'}
          </button>
        </aside>
      </section>
    </div>
  );
}

export default CartPage;

