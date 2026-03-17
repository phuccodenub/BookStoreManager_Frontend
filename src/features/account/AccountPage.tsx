import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import { cancelOrder, createAddress, getAddresses, getMyOrder, getMyOrders, getPaymentByOrder, getProfile } from '@/features/account/account-api';
import { changePassword } from '@/features/auth/auth-api';
import { useAuth } from '@/features/auth/AuthContext';
import { formatCurrency, formatDate } from '@/lib/format';
import { useRealtimeFeed } from '@/lib/realtime/useRealtimeFeed';

function AccountPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { data: profile } = useSuspenseQuery({ queryKey: ['profile'], queryFn: getProfile });
  const { data: addresses } = useSuspenseQuery({ queryKey: ['addresses'], queryFn: getAddresses });
  const { data: orders } = useSuspenseQuery({ queryKey: ['orders', 'mine'], queryFn: getMyOrders });
  const realtimeFeed = useRealtimeFeed(session?.accessToken ?? null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState({
    receiverName: profile.fullName,
    receiverPhone: profile.phone ?? '0901000000',
    province: 'TP Ho Chi Minh',
    district: 'District 1',
    ward: 'Ben Nghe',
    detailAddress: '123 Nguyen Hue',
    isDefault: false,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: 'Password123!',
    newPassword: 'Password123!',
  });

  const selectedOrderId = activeOrderId ?? orders[0]?.id ?? null;

  const selectedOrderQuery = useQuery({
    queryKey: ['orders', 'mine', selectedOrderId],
    queryFn: () => getMyOrder(selectedOrderId ?? ''),
    enabled: Boolean(selectedOrderId),
  });

  const selectedPaymentQuery = useQuery({
    queryKey: ['payments', selectedOrderId],
    queryFn: () => getPaymentByOrder(selectedOrderId ?? ''),
    enabled: Boolean(selectedOrderId),
  });

  const addressMutation = useMutation({
    mutationFn: createAddress,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPasswordError(null);
      setPasswordFeedback('Password changed successfully. Existing refresh sessions are revoked by the backend.');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    },
    onError: (error) => {
      setPasswordFeedback(null);
      setPasswordError(error instanceof Error ? error.message : 'Unable to change password');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ orderId, cancelledReason }: { orderId: string; cancelledReason: string }) => cancelOrder(orderId, cancelledReason),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] }),
        queryClient.invalidateQueries({ queryKey: ['orders', 'mine', variables.orderId] }),
        queryClient.invalidateQueries({ queryKey: ['payments', variables.orderId] }),
      ]);
      setActiveOrderId(variables.orderId);
    },
  });

  return (
    <div className="page-stack">
      <section className="two-column-grid two-column-grid-wide">
        <article className="surface-card surface-card-highlight">
          <SectionHeading eyebrow="Account" title={profile.fullName} description={`${profile.email} • ${profile.role}`} />
          <div className="summary-stack">
            <div><span>Role</span><strong>{profile.role}</strong></div>
            <div><span>Addresses</span><strong>{addresses.length}</strong></div>
            <div><span>Orders</span><strong>{orders.length}</strong></div>
          </div>
        </article>

        <article className="surface-card">
          <SectionHeading eyebrow="Realtime" title="Latest personal feed" />
          <div className="feed-stack">
            {realtimeFeed.length === 0 ? <p>No socket events received yet in this session.</p> : realtimeFeed.map((event) => (
              <article key={`${event.event}-${event.receivedAt}`} className="feed-card">
                <strong>{event.event}</strong>
                <p>{formatDate(event.receivedAt)}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="two-column-grid two-column-grid-wide">
        <article className="surface-card">
          <SectionHeading eyebrow="Address book" title="Create and inspect delivery addresses" />
          <div className="list-stack compact-list">
            {addresses.map((address) => (
              <div key={address.id} className="address-card">
                <strong>{address.receiverName}</strong>
                <p>{address.detailAddress}, {address.ward}, {address.district}, {address.province}</p>
              </div>
            ))}
          </div>
          <div className="form-grid">
            <label className="field"><span>Receiver</span><input value={addressForm.receiverName} onChange={(event) => setAddressForm({ ...addressForm, receiverName: event.target.value })} /></label>
            <label className="field"><span>Phone</span><input value={addressForm.receiverPhone} onChange={(event) => setAddressForm({ ...addressForm, receiverPhone: event.target.value })} /></label>
            <label className="field"><span>Province</span><input value={addressForm.province} onChange={(event) => setAddressForm({ ...addressForm, province: event.target.value })} /></label>
            <label className="field"><span>District</span><input value={addressForm.district} onChange={(event) => setAddressForm({ ...addressForm, district: event.target.value })} /></label>
            <label className="field"><span>Ward</span><input value={addressForm.ward} onChange={(event) => setAddressForm({ ...addressForm, ward: event.target.value })} /></label>
            <label className="field field-wide"><span>Detail address</span><input value={addressForm.detailAddress} onChange={(event) => setAddressForm({ ...addressForm, detailAddress: event.target.value })} /></label>
          </div>
          <button className="button button-secondary" onClick={() => addressMutation.mutate(addressForm)} type="button">
            {addressMutation.isPending ? 'Saving...' : 'Add address'}
          </button>
        </article>

        <article className="surface-card">
          <SectionHeading eyebrow="Security" title="Change password without waiting for the final account UI" />
          <div className="form-grid">
            <label className="field">
              <span>Current password</span>
              <input
                autoComplete="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
              />
            </label>
            <label className="field">
              <span>New password</span>
              <input
                autoComplete="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
              />
            </label>
          </div>
          {passwordError ? <p className="feedback-text feedback-text-error">{passwordError}</p> : null}
          {passwordFeedback ? <p className="feedback-text feedback-text-success">{passwordFeedback}</p> : null}
          <button className="button button-primary" onClick={() => passwordMutation.mutate(passwordForm)} type="button">
            {passwordMutation.isPending ? 'Updating...' : 'Change password'}
          </button>
        </article>
      </section>

      <section className="surface-card">
        <SectionHeading eyebrow="Order history" title="Inspect order detail and payment state from real customer endpoints" />
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" description="Create one from the cart page to activate this section." />
        ) : (
          <div className="panel-stack">
            <div className="list-stack compact-list">
              {orders.map((order) => (
                <article key={order.id} className="order-card">
                  <div className="order-card-header">
                    <div>
                      <strong>{order.orderCode}</strong>
                      <p>{formatDate(order.createdAt)}</p>
                    </div>
                    <span>{order.orderStatus} / {order.paymentStatus}</span>
                  </div>
                  <p>{order.items.length} items • {formatCurrency(order.totalAmount)}</p>
                  <div className="inline-actions">
                    <button className="text-link" onClick={() => setActiveOrderId(order.id)} type="button">
                      {selectedOrderId === order.id ? 'Inspecting' : 'Inspect order'}
                    </button>
                    {order.orderStatus === 'pending' ? (
                      <button
                        className="text-link"
                        onClick={() => cancelMutation.mutate({ orderId: order.id, cancelledReason: 'Cancelled from API-first frontend shell' })}
                        type="button"
                      >
                        Cancel pending order
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            {selectedOrderId ? (
              <article className="surface-subcard">
                <SectionHeading eyebrow="Selected order" title={selectedOrderQuery.data?.orderCode ?? 'Loading order detail'} />
                {selectedOrderQuery.isPending ? <p>Loading order detail...</p> : null}
                {selectedOrderQuery.error ? <p className="feedback-text feedback-text-error">{selectedOrderQuery.error.message}</p> : null}
                {selectedOrderQuery.data ? (
                  <div className="panel-stack">
                    <div className="details-grid">
                      <div><span>Receiver</span><strong>{selectedOrderQuery.data.receiverName}</strong></div>
                      <div><span>Phone</span><strong>{selectedOrderQuery.data.receiverPhone}</strong></div>
                      <div><span>Address</span><strong>{selectedOrderQuery.data.addressSnapshot}</strong></div>
                      <div><span>Voucher</span><strong>{selectedOrderQuery.data.voucher?.code ?? 'No voucher'}</strong></div>
                    </div>
                    <div className="list-stack">
                      {selectedOrderQuery.data.items.map((item) => (
                        <div key={item.id} className="inventory-card">
                          <strong>{item.bookNameSnapshot}</strong>
                          <p>{item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="surface-divider" />
                <SectionHeading eyebrow="Payment" title="Dedicated payment lookup endpoint" />
                {selectedPaymentQuery.isPending ? <p>Loading payment detail...</p> : null}
                {selectedPaymentQuery.error ? <p className="feedback-text feedback-text-error">{selectedPaymentQuery.error.message}</p> : null}
                {selectedPaymentQuery.data ? (
                  <div className="details-grid">
                    <div><span>Method</span><strong>{selectedPaymentQuery.data.paymentMethod}</strong></div>
                    <div><span>Status</span><strong>{selectedPaymentQuery.data.paymentStatus}</strong></div>
                    <div><span>Total</span><strong>{formatCurrency(selectedPaymentQuery.data.totalAmount)}</strong></div>
                    <div><span>Provider</span><strong>{selectedPaymentQuery.data.payment?.provider ?? 'No payment record yet'}</strong></div>
                    <div><span>Transaction</span><strong>{selectedPaymentQuery.data.payment?.transactionCode ?? 'Pending assignment'}</strong></div>
                    <div><span>Paid at</span><strong>{selectedPaymentQuery.data.payment?.paidAt ? formatDate(selectedPaymentQuery.data.payment.paidAt) : 'Not paid yet'}</strong></div>
                  </div>
                ) : null}
              </article>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

export default AccountPage;
