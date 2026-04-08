import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  cancelOrder,
  createAddress,
  deleteAddress,
  getAddresses,
  getMyOrder,
  getMyOrders,
  getPaymentByOrder,
  getProfile,
  uploadProfileAvatar,
  updateAddress,
  updateProfile,
} from '@/features/account/account-api';
import { formatRealtimeFeedMessage } from '@/features/account/realtime-feed';
import { changePassword } from '@/features/auth/auth-api';
import { useAuth } from '@/features/auth/AuthContext';
import { getSettings } from '@/features/home/home-api';
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
import { useRealtimeFeed } from '@/lib/realtime/useRealtimeFeed';

const roleLabels = {
  customer: 'Khách hàng',
  staff: 'Nhân viên',
  admin: 'Quản trị viên',
} as const;

function AccountPage() {
  const queryClient = useQueryClient();
  const { session, refreshProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamsString = searchParams.toString();
  const { data: profile } = useSuspenseQuery({ queryKey: ['profile'], queryFn: getProfile });
  const { data: addresses } = useSuspenseQuery({ queryKey: ['addresses'], queryFn: getAddresses });
  const { data: orders } = useSuspenseQuery({ queryKey: ['orders', 'mine'], queryFn: () => getMyOrders() });
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: getSettings,
  });
  const realtimeFeed = useRealtimeFeed(session?.accessToken ?? null);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [addressFeedback, setAddressFeedback] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    fullName: profile.fullName,
    phone: profile.phone ?? '',
  });
  const [addressForm, setAddressForm] = useState({
    receiverName: profile.fullName,
    receiverPhone: profile.phone ?? '',
    province: '',
    district: '',
    ward: '',
    detailAddress: '',
    isDefault: false,
  });
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const isProfileFormValid = Boolean(profileForm.fullName.trim());
  const isAddressFormValid = Boolean(
    addressForm.receiverName.trim() &&
    addressForm.receiverPhone.trim() &&
    addressForm.province.trim() &&
    addressForm.district.trim() &&
    addressForm.ward.trim() &&
    addressForm.detailAddress.trim(),
  );
  const isPasswordFormValid = Boolean(passwordForm.currentPassword && passwordForm.newPassword);

  const requestedOrderId = searchParams.get('orderId');
  const hasRequestedOrder = requestedOrderId ? orders.some((order) => order.id === requestedOrderId) : false;
  const selectedOrderId = hasRequestedOrder ? requestedOrderId : orders[0]?.id ?? null;
  const selectedOrderSummary = orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null;
  const totalSpent = useMemo(() => orders.reduce((sum, order) => sum + Number(order.totalAmount), 0), [orders]);
  const profileInitials = useMemo(
    () => profile.fullName.split(' ').filter(Boolean).map((part) => part[0]?.toUpperCase() ?? '').slice(0, 2).join('') || 'MB',
    [profile.fullName],
  );

  useEffect(() => {
    if (!requestedOrderId || hasRequestedOrder || !orders[0]?.id) {
      return;
    }

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set('orderId', orders[0].id);
    setSearchParams(nextParams, { replace: true });
  }, [hasRequestedOrder, orders, requestedOrderId, searchParamsString, setSearchParams]);

  useEffect(() => {
    setProfileForm({
      fullName: profile.fullName,
      phone: profile.phone ?? '',
    });
  }, [profile.fullName, profile.phone]);

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

  const profileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (updatedProfile) => {
      setProfileError(null);
      setProfileFeedback('Thông tin tài khoản đã được cập nhật.');
      setProfileForm({
        fullName: updatedProfile.fullName,
        phone: updatedProfile.phone ?? '',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        refreshProfile().catch(() => undefined),
      ]);
    },
    onError: (error) => {
      setProfileFeedback(null);
      setProfileError(error instanceof Error ? error.message : 'Không thể cập nhật hồ sơ cá nhân');
    },
  });

  const avatarMutation = useMutation({
    mutationFn: uploadProfileAvatar,
    onSuccess: async () => {
      setProfileError(null);
      setProfileFeedback('Ảnh đại diện đã được cập nhật.');
      setSelectedAvatarFile(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        refreshProfile().catch(() => undefined),
      ]);
    },
    onError: (error) => {
      setProfileFeedback(null);
      setProfileError(error instanceof Error ? error.message : 'Không thể cập nhật ảnh đại diện');
    },
  });

  function resetAddressForm() {
    setEditingAddressId(null);
    setAddressForm({
      receiverName: profile.fullName,
      receiverPhone: profile.phone ?? '',
      province: '',
      district: '',
      ward: '',
      detailAddress: '',
      isDefault: false,
    });
  }

  const saveAddressMutation = useMutation({
    mutationFn: async (payload: typeof addressForm) => {
      if (editingAddressId) {
        return updateAddress(editingAddressId, payload);
      }
      return createAddress(payload);
    },
    onSuccess: async () => {
      setAddressError(null);
      setAddressFeedback(editingAddressId ? 'Địa chỉ đã được cập nhật.' : 'Địa chỉ mới đã được lưu vào tài khoản.');
      resetAddressForm();
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (error) => {
      setAddressFeedback(null);
      setAddressError(error instanceof Error ? error.message : 'Không thể lưu địa chỉ');
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: async () => {
      setAddressError(null);
      setAddressFeedback('Địa chỉ đã được xóa khỏi tài khoản.');
      if (editingAddressId) {
        resetAddressForm();
      }
      await queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (error) => {
      setAddressFeedback(null);
      setAddressError(error instanceof Error ? error.message : 'Không thể xóa địa chỉ');
    },
  });

  const passwordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      setPasswordError(null);
      setPasswordFeedback('Mật khẩu đã được cập nhật. Các phiên đăng nhập cũ sẽ được thu hồi để bảo vệ tài khoản.');
      setPasswordForm({ currentPassword: '', newPassword: '' });
    },
    onError: (error) => {
      setPasswordFeedback(null);
      setPasswordError(error instanceof Error ? error.message : 'Không thể đổi mật khẩu');
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
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('orderId', variables.orderId);
      setSearchParams(nextParams, { replace: true });
    },
  });

  const selectedOrder = selectedOrderQuery.data ?? null;
  const selectedPayment = selectedPaymentQuery.data ?? null;
  const activeOrder = selectedOrder ?? selectedOrderSummary;
  const timeline = activeOrder ? getOrderTimeline(activeOrder.orderStatus) : [];

  function focusOrder(orderId: string) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('orderId', orderId);
    setSearchParams(nextParams, { replace: true });
  }

  return (
    <div className="page-stack account-shell">
      <section className="account-overview-grid">
        <article className="account-hero-card">
          <SectionHeading
            eyebrow="Tài khoản của bạn"
            title={profile.fullName}
            description={`${profile.email} • ${roleLabels[profile.role]}`}
          />
          <div className="summary-tile-grid">
            <article className="summary-tile">
              <span>Số địa chỉ</span>
              <strong>{addresses.length}</strong>
            </article>
            <article className="summary-tile">
              <span>Tổng đơn hàng</span>
              <strong>{orders.length}</strong>
            </article>
            <article className="summary-tile">
              <span>Tổng chi tiêu</span>
              <strong>{formatCurrency(totalSpent)}</strong>
            </article>
          </div>
          <div className="action-row">
            <Link className="button button-primary" to="/catalog">
              Mua thêm sách
            </Link>
            {activeOrder ? (
              <Link className="button button-secondary" to={`/order-success?orderId=${activeOrder.id}`}>
                Xem trang xác nhận đơn
              </Link>
            ) : null}
          </div>
        </article>

        <article className="account-feed-card">
          <SectionHeading eyebrow="Cập nhật gần đây" title="Thông báo mới nhất cho tài khoản của bạn" />
          <div className="feed-stack">
            {realtimeFeed.length === 0 ? (
              <p>Chưa có cập nhật mới lúc này. Khi trạng thái đơn hàng thay đổi, thông tin mới sẽ xuất hiện tại đây.</p>
            ) : realtimeFeed.slice(0, 4).map((event) => (
              <article key={`${event.event}-${event.receivedAt}`} className="feed-card">
                <strong>{formatRealtimeFeedMessage(event.event, event.payload)}</strong>
                <p>{formatDate(event.receivedAt)}</p>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section className="account-order-layout">
        <article className="account-order-list-panel">
          <SectionHeading
            eyebrow="Đơn hàng"
            title="Lịch sử mua hàng và trạng thái xử lý"
            description="Theo dõi từng đơn hàng để biết cửa hàng đang xử lý đến bước nào."
          />

          {orders.length === 0 ? (
            <EmptyState title="Bạn chưa có đơn hàng" description="Đặt đơn từ giỏ hàng để bắt đầu theo dõi tiến trình xử lý và thanh toán." />
          ) : (
            <div className="list-stack">
              {orders.map((order) => (
                <article key={order.id} className={clsx('account-order-item', selectedOrderId === order.id && 'account-order-item-active')}>
                  <div className="account-order-item-header">
                    <div>
                      <strong>{order.orderCode}</strong>
                      <p>{formatDate(order.createdAt)}</p>
                    </div>
                    <div className="detail-secondary-actions">
                      <span className={`status-chip status-chip-${getOrderStatusTone(order.orderStatus)}`}>
                        {getOrderStatusLabel(order.orderStatus)}
                      </span>
                      <span className={`status-chip status-chip-${getPaymentStatusTone(order.paymentStatus)}`}>
                        {getPaymentStatusLabel(order.paymentStatus)}
                      </span>
                    </div>
                  </div>

                  <p>{order.items.length} tựa sách • {formatCurrency(order.totalAmount)}</p>
                  {order.cancelledReason ? (
                    <div className="reason-callout">
                      <span>Lý do hủy</span>
                      <strong>{order.cancelledReason}</strong>
                    </div>
                  ) : null}

                  <div className="inline-actions">
                    <button className="text-link" onClick={() => focusOrder(order.id)} type="button">
                      {selectedOrderId === order.id ? 'Đang xem' : 'Xem chi tiết'}
                    </button>
                    {order.orderStatus === 'pending' ? (
                      <button
                        className="text-link"
                        disabled={cancelMutation.isPending && cancelMutation.variables?.orderId === order.id}
                        onClick={() => cancelMutation.mutate({ orderId: order.id, cancelledReason: 'Khách hàng hủy trên website' })}
                        type="button"
                      >
                        {cancelMutation.isPending && cancelMutation.variables?.orderId === order.id ? 'Đang hủy' : 'Hủy đơn'}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="account-order-detail-panel">
          {!activeOrder ? (
            <EmptyState title="Chọn một đơn hàng" description="Khi có đơn hàng, chi tiết và tiến trình xử lý sẽ hiển thị tại đây." />
          ) : (
            <div className="page-stack">
              <div className="shelf-header">
                <SectionHeading
                  eyebrow="Theo dõi đơn hàng"
                  title={activeOrder.orderCode}
                  description={`Tạo lúc ${formatDate(activeOrder.createdAt)} • ${activeOrder.items.length} dòng sản phẩm`}
                />
                <Link className="text-link" to={`/order-success?orderId=${activeOrder.id}`}>
                  Xem trang xác nhận
                </Link>
              </div>

              <div className="detail-secondary-actions">
                <span className={`status-chip status-chip-${getOrderStatusTone(activeOrder.orderStatus)}`}>
                  {getOrderStatusLabel(activeOrder.orderStatus)}
                </span>
                <span className={`status-chip status-chip-${getPaymentStatusTone(activeOrder.paymentStatus)}`}>
                  {getPaymentStatusLabel(activeOrder.paymentStatus)}
                </span>
                <span className={`status-chip status-chip-${getPaymentMethodTone(activeOrder.paymentMethod)}`}>
                  {getPaymentMethodLabel(activeOrder.paymentMethod)}
                </span>
              </div>

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

              {selectedOrderQuery.isPending && !selectedOrder ? <p>Đang tải thông tin đơn hàng...</p> : null}
              {selectedOrderQuery.error ? <p className="feedback-text feedback-text-error">{selectedOrderQuery.error.message}</p> : null}

              {selectedOrder ? (
                <>
                  <div className="detail-fact-grid">
                    <article>
                      <span>Người nhận</span>
                      <strong>{selectedOrder.receiverName}</strong>
                    </article>
                    <article>
                      <span>Số điện thoại</span>
                      <strong>{selectedOrder.receiverPhone}</strong>
                    </article>
                    <article>
                      <span>Địa chỉ giao</span>
                      <strong>{selectedOrder.addressSnapshot}</strong>
                    </article>
                    <article>
                      <span>Voucher</span>
                      <strong>{selectedOrder.voucher?.code ?? 'Không có'}</strong>
                    </article>
                    <article>
                      <span>Ghi chú</span>
                      <strong>{selectedOrder.note ?? 'Không có ghi chú thêm'}</strong>
                    </article>
                    <article>
                      <span>Tổng thanh toán</span>
                      <strong>{formatCurrency(selectedOrder.totalAmount)}</strong>
                    </article>
                  </div>

                  {selectedOrder.cancelledReason ? (
                    <div className="reason-callout">
                      <span>Lý do hủy đơn</span>
                      <strong>{selectedOrder.cancelledReason}</strong>
                    </div>
                  ) : null}

                  <div className="order-item-list">
                    {selectedOrder.items.map((item) => (
                      <article key={item.id} className="order-item-row">
                        <div>
                          <strong>{item.bookNameSnapshot}</strong>
                          <p>{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                        </div>
                        <strong>{formatCurrency(item.totalPrice)}</strong>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}

              <div className="surface-divider" />

              <SectionHeading eyebrow="Thanh toán" title="Trạng thái giao dịch" />
              {selectedPaymentQuery.isPending ? <p>Đang tải thông tin thanh toán...</p> : null}
              {selectedPaymentQuery.error ? <p className="feedback-text feedback-text-error">{selectedPaymentQuery.error.message}</p> : null}
              {(selectedPayment ?? selectedOrder) ? (
                <>
                  <div className="order-payment-grid">
                    <div>
                      <span>Phương thức</span>
                      <strong>{getPaymentMethodLabel(selectedPayment?.paymentMethod ?? selectedOrder?.paymentMethod ?? activeOrder.paymentMethod)}</strong>
                    </div>
                    <div>
                      <span>Trạng thái</span>
                      <strong>{getPaymentStatusLabel(selectedPayment?.paymentStatus ?? selectedOrder?.paymentStatus ?? activeOrder.paymentStatus)}</strong>
                    </div>
                    <div>
                      <span>Tổng tiền</span>
                      <strong>{formatCurrency(selectedPayment?.totalAmount ?? selectedOrder?.totalAmount ?? activeOrder.totalAmount)}</strong>
                    </div>
                    <div>
                      <span>Đơn vị thanh toán</span>
                      <strong>{getPaymentProviderLabel(selectedPayment?.payment?.provider ?? selectedOrder?.payment?.provider ?? settingsQuery.data?.paymentProviderName)}</strong>
                    </div>
                    <div>
                      <span>Mã giao dịch</span>
                      <strong>{selectedPayment?.payment?.transactionCode ?? selectedOrder?.payment?.transactionCode ?? 'Chưa có'}</strong>
                    </div>
                    <div>
                      <span>Thời điểm thanh toán</span>
                      <strong>{selectedPayment?.payment?.paidAt ? formatDate(selectedPayment.payment.paidAt) : selectedOrder?.payment?.paidAt ? formatDate(selectedOrder.payment.paidAt) : 'Chưa thanh toán'}</strong>
                    </div>
                  </div>

                  {activeOrder.paymentMethod === 'online' ? (
                    <div className="payment-callout">
                      <span>Hướng dẫn thanh toán trực tuyến</span>
                      <strong>{settingsQuery.data?.paymentProviderName ?? 'Cổng thanh toán trực tuyến'}</strong>
                      <p>{settingsQuery.data?.paymentInstructions ?? 'Vui lòng làm theo hướng dẫn thanh toán trong đơn để cửa hàng xác nhận nhanh hơn.'}</p>
                    </div>
                  ) : (
                    <div className="payment-callout">
                      <span>Thông tin thu hộ COD</span>
                      <strong>Thanh toán khi nhận hàng</strong>
                      <p>Đơn COD sẽ được thu tiền khi giao hàng thành công. Bạn chỉ cần chuẩn bị đúng số tiền và kiểm tra đơn trước khi nhận.</p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </article>
      </section>

      <section className="account-secondary-grid">
        <article className="checkout-panel">
          <SectionHeading eyebrow="Hồ sơ cá nhân" title="Cập nhật thông tin liên hệ cơ bản" />
          <div className="account-avatar-panel">
            {profile.avatar ? (
              <img alt={profile.fullName} className="account-avatar-preview" src={profile.avatar} />
            ) : (
              <div className="account-avatar-preview account-avatar-preview-placeholder">{profileInitials}</div>
            )}
            <div className="account-avatar-actions">
              <strong>Ảnh đại diện</strong>
              <p>Ảnh này sẽ được dùng cho hồ sơ tài khoản và các vị trí hiển thị người dùng trong giao diện.</p>
              <input accept="image/*" onChange={(event) => setSelectedAvatarFile(event.target.files?.[0] ?? null)} type="file" />
              <div className="inline-actions">
                <button
                  className="button button-secondary"
                  disabled={!selectedAvatarFile || avatarMutation.isPending}
                  onClick={() => {
                    if (!selectedAvatarFile) return;
                    setProfileFeedback(null);
                    setProfileError(null);
                    avatarMutation.mutate(selectedAvatarFile);
                  }}
                  type="button"
                >
                  {avatarMutation.isPending ? 'Đang tải ảnh...' : 'Cập nhật ảnh'}
                </button>
                {selectedAvatarFile ? <p>{selectedAvatarFile.name}</p> : null}
              </div>
            </div>
          </div>
          <div className="form-grid">
            <label className="field">
              <span>Họ và tên</span>
              <input value={profileForm.fullName} onChange={(event) => setProfileForm({ ...profileForm, fullName: event.target.value })} />
            </label>
            <label className="field">
              <span>Số điện thoại</span>
              <input value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} />
            </label>
            <label className="field field-wide">
              <span>Email</span>
              <input disabled value={profile.email} />
            </label>
          </div>
          {profileError ? <p className="feedback-text feedback-text-error">{profileError}</p> : null}
          {profileFeedback ? <p className="feedback-text feedback-text-success">{profileFeedback}</p> : null}
          <button
            className="button button-primary"
            disabled={!isProfileFormValid || profileMutation.isPending}
            onClick={() => {
              setProfileFeedback(null);
              setProfileError(null);
              profileMutation.mutate({
                fullName: profileForm.fullName.trim(),
                phone: profileForm.phone.trim() || undefined,
              });
            }}
            type="button"
          >
            {profileMutation.isPending ? 'Đang lưu...' : 'Lưu hồ sơ'}
          </button>
        </article>

        <article className="checkout-panel">
          <SectionHeading eyebrow="Sổ địa chỉ" title="Quản lý nơi nhận hàng" />
          <div className="address-book-list compact-list">
            {addresses.map((address) => (
              <article key={address.id} className="address-book-card">
                <div className="order-card-header">
                  <strong>{address.receiverName}</strong>
                  {address.isDefault ? <span className="status-chip status-chip-success">Mặc định</span> : null}
                </div>
                <p>{address.receiverPhone}</p>
                <p>{address.detailAddress}, {address.ward}, {address.district}, {address.province}</p>
                <div className="inline-actions">
                  <button
                    className="text-link"
                    onClick={() => {
                      setEditingAddressId(address.id);
                      setAddressForm({
                        receiverName: address.receiverName,
                        receiverPhone: address.receiverPhone,
                        province: address.province,
                        district: address.district,
                        ward: address.ward,
                        detailAddress: address.detailAddress,
                        isDefault: address.isDefault,
                      });
                    }}
                    type="button"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    className="text-link"
                    disabled={deleteAddressMutation.isPending && deleteAddressMutation.variables === address.id}
                    onClick={() => deleteAddressMutation.mutate(address.id)}
                    type="button"
                  >
                    {deleteAddressMutation.isPending && deleteAddressMutation.variables === address.id ? 'Đang xóa' : 'Xóa'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className="shelf-header">
            <SectionHeading
              eyebrow={editingAddressId ? 'Cập nhật địa chỉ' : 'Địa chỉ mới'}
              title={editingAddressId ? 'Chỉnh sửa thông tin nhận hàng' : 'Thêm địa chỉ giao hàng mới'}
            />
            {editingAddressId ? (
              <button className="text-link" onClick={resetAddressForm} type="button">
                Hủy chỉnh sửa
              </button>
            ) : null}
          </div>
          <div className="form-grid">
            <label className="field"><span>Người nhận</span><input value={addressForm.receiverName} onChange={(event) => setAddressForm({ ...addressForm, receiverName: event.target.value })} /></label>
            <label className="field"><span>Số điện thoại</span><input value={addressForm.receiverPhone} onChange={(event) => setAddressForm({ ...addressForm, receiverPhone: event.target.value })} /></label>
            <label className="field"><span>Tỉnh / thành</span><input value={addressForm.province} onChange={(event) => setAddressForm({ ...addressForm, province: event.target.value })} /></label>
            <label className="field"><span>Quận / huyện</span><input value={addressForm.district} onChange={(event) => setAddressForm({ ...addressForm, district: event.target.value })} /></label>
            <label className="field"><span>Phường / xã</span><input value={addressForm.ward} onChange={(event) => setAddressForm({ ...addressForm, ward: event.target.value })} /></label>
            <label className="field field-wide"><span>Địa chỉ chi tiết</span><input value={addressForm.detailAddress} onChange={(event) => setAddressForm({ ...addressForm, detailAddress: event.target.value })} /></label>
            <label className="field">
              <span>Mặc định</span>
              <input checked={addressForm.isDefault} onChange={(event) => setAddressForm({ ...addressForm, isDefault: event.target.checked })} type="checkbox" />
            </label>
          </div>
          {addressError ? <p className="feedback-text feedback-text-error">{addressError}</p> : null}
          {addressFeedback ? <p className="feedback-text feedback-text-success">{addressFeedback}</p> : null}
          <button
            className="button button-secondary"
            disabled={!isAddressFormValid || saveAddressMutation.isPending}
            onClick={() => {
              setAddressFeedback(null);
              setAddressError(null);
              saveAddressMutation.mutate({
                receiverName: addressForm.receiverName.trim(),
                receiverPhone: addressForm.receiverPhone.trim(),
                province: addressForm.province.trim(),
                district: addressForm.district.trim(),
                ward: addressForm.ward.trim(),
                detailAddress: addressForm.detailAddress.trim(),
                isDefault: addressForm.isDefault,
              });
            }}
            type="button"
          >
            {saveAddressMutation.isPending ? 'Đang lưu...' : editingAddressId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}
          </button>
        </article>

        <article className="checkout-panel">
          <SectionHeading eyebrow="Bảo mật" title="Đổi mật khẩu" />
          <div className="form-grid">
            <label className="field">
              <span>Mật khẩu hiện tại</span>
              <input
                autoComplete="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
              />
            </label>
            <label className="field">
              <span>Mật khẩu mới</span>
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
          <button
            className="button button-primary"
            disabled={!isPasswordFormValid || passwordMutation.isPending}
            onClick={() => passwordMutation.mutate(passwordForm)}
            type="button"
          >
            {passwordMutation.isPending ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>
        </article>
      </section>
    </div>
  );
}

export default AccountPage;


