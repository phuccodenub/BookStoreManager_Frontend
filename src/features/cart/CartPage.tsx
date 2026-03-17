import { useMemo, useState } from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import { useAuth } from '@/features/auth/AuthContext';
import { createOrder, getAddresses, getCart, getSettings, removeCartItem, updateCartItem } from '@/features/cart/cart-api';
import { formatCurrency } from '@/lib/format';

function CartPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { data: cart } = useSuspenseQuery({ queryKey: ['cart'], queryFn: getCart });
  const { data: addresses } = useSuspenseQuery({ queryKey: ['addresses'], queryFn: getAddresses });
  const { data: settings } = useSuspenseQuery({ queryKey: ['settings'], queryFn: getSettings });
  const [voucherCode, setVoucherCode] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? '');
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  const selectedItems = useMemo(() => cart.items.filter((item) => item.selected), [cart.items]);
  const subtotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + Number(item.book.price) * item.quantity, 0),
    [selectedItems],
  );

  const cartMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: { quantity?: number; selected?: boolean } }) => updateCartItem(itemId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeCartItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const orderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: async (order) => {
      setCheckoutMessage(`Order ${order.orderCode} created successfully.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cart'] }),
        queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] }),
      ]);
    },
  });

  if (cart.items.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        description="Seed data will populate this area as soon as you add books from the catalog or log in with the customer demo account."
      />
    );
  }

  return (
    <div className="page-stack">
      <SectionHeading
        eyebrow="Cart + checkout"
        title={`Customer flow for ${session?.user.fullName ?? 'current session'}`}
        description="This screen already exercises GET/PATCH/DELETE cart operations and POST /api/orders."
      />

      <section className="two-column-grid two-column-grid-wide">
        <article className="surface-card">
          <div className="list-stack">
            {cart.items.map((item) => (
              <div key={item.id} className="cart-row">
                <label className="checkbox-row">
                  <input
                    checked={item.selected}
                    onChange={(event) => cartMutation.mutate({ itemId: item.id, payload: { selected: event.target.checked } })}
                    type="checkbox"
                  />
                  <span>{item.book.title}</span>
                </label>
                <div className="cart-row-meta">
                  <span>{formatCurrency(item.book.price)}</span>
                  <div className="stepper">
                    <button onClick={() => cartMutation.mutate({ itemId: item.id, payload: { quantity: Math.max(1, item.quantity - 1) } })} type="button">-</button>
                    <strong>{item.quantity}</strong>
                    <button onClick={() => cartMutation.mutate({ itemId: item.id, payload: { quantity: item.quantity + 1 } })} type="button">+</button>
                  </div>
                  <button className="text-link" onClick={() => removeMutation.mutate(item.id)} type="button">Remove</button>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface-card surface-card-highlight">
          <SectionHeading eyebrow="Checkout" title="Create order from selected cart lines" />
          <label className="field">
            <span>Shipping address</span>
            <select value={addressId} onChange={(event) => setAddressId(event.target.value)}>
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.receiverName} - {address.detailAddress}, {address.district}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Payment method</span>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'cod' | 'online')}>
              <option value="cod">Cash on delivery</option>
              <option value="online">Online mock payment</option>
            </select>
          </label>
          <label className="field">
            <span>Voucher code</span>
            <input value={voucherCode} onChange={(event) => setVoucherCode(event.target.value)} placeholder="Optional" />
          </label>
          <label className="field">
            <span>Order note</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} />
          </label>
          <div className="summary-stack">
            <div><span>Selected lines</span><strong>{selectedItems.length}</strong></div>
            <div><span>Subtotal</span><strong>{formatCurrency(subtotal)}</strong></div>
            <div><span>Shipping baseline</span><strong>{formatCurrency(settings.shippingFee)}</strong></div>
          </div>
          {checkoutMessage ? <p className="feedback-text feedback-text-success">{checkoutMessage}</p> : null}
          <button
            className="button button-primary"
            disabled={!addressId || selectedItems.length === 0 || orderMutation.isPending}
            onClick={() => orderMutation.mutate({
              addressId,
              paymentMethod,
              voucherCode: voucherCode || undefined,
              note: note || undefined,
              cartItemIds: selectedItems.map((item) => item.id),
            })}
            type="button"
          >
            {orderMutation.isPending ? 'Creating order...' : 'Create order'}
          </button>
        </article>
      </section>
    </div>
  );
}

export default CartPage;
