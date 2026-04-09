import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

import EmptyState from '@/components/EmptyState';
import SectionHeading from '@/components/SectionHeading';
import {
  createAdminManualOrder,
  downloadDeliveryNote,
  downloadInvoice,
  getActivityLogs,
  getAdminBooks,
  getAdminOrderById,
  getAdminOrders,
  getAdminPaymentByOrder,
  getAdminCustomers,
  updateAdminOrderOps,
  updateOrderStatus,
  type AdminBookRecord,
  type AdminManualOrderPayload,
  type SalesChannel,
} from '@/features/admin/admin-api';
import {
  formatActivityActionLabel,
  formatActivityDataPreview,
  getAdminOrderUpdateMessage,
} from '@/features/admin/admin-presentation';
import { getMetadata } from '@/features/catalog/catalog-api';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  getOrderStatusLabel,
  getOrderStatusTone,
  getPaymentMethodLabel,
  getPaymentProviderLabel,
  getPaymentStatusLabel,
  getPaymentStatusTone,
} from '@/features/order/order-presentation';
import type { ActivityLogRecord, OrderStatus, PaymentStatus } from '@/lib/types';

type StatusTab = 'all' | OrderStatus;
type FilterPaymentStatus = 'all' | PaymentStatus;
type FilterSalesChannel = 'all' | SalesChannel;
type DatePreset = 'all' | 'today' | 'week' | 'month' | 'custom';

interface ManualOrderLineState {
  bookId: string;
  title: string;
  price: number;
  coverImage?: string | null;
  quantity: number;
}

interface ManualOrderFormState {
  userId: string;
  receiverName: string;
  receiverPhone: string;
  province: string;
  district: string;
  ward: string;
  detailAddress: string;
  paymentMethod: 'cod' | 'online';
  paymentStatus: Exclude<PaymentStatus, 'refunded'>;
  salesChannel: SalesChannel;
  shippingFee: string;
  voucherCode: string;
  customerNote: string;
  internalNote: string;
  trackingCode: string;
  items: ManualOrderLineState[];
}

interface QuickStatConfig {
  label: string;
  status: OrderStatus;
  accent: 'amber' | 'blue' | 'violet' | 'rose';
}

function createInitialManualOrderForm(): ManualOrderFormState {
  return {
    userId: '',
    receiverName: '',
    receiverPhone: '',
    province: '',
    district: '',
    ward: '',
    detailAddress: '',
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    salesChannel: 'hotline',
    shippingFee: '',
    voucherCode: '',
    customerNote: '',
    internalNote: '',
    trackingCode: '',
    items: [],
  };
}

const quickStatConfig: QuickStatConfig[] = [
  { label: 'Chờ xác nhận', status: 'pending', accent: 'amber' },
  { label: 'Chờ đóng gói', status: 'packing', accent: 'blue' },
  { label: 'Đang giao', status: 'shipping', accent: 'violet' },
  { label: 'Đã hủy', status: 'cancelled', accent: 'rose' },
];

const statusTabs: Array<{ key: StatusTab; label: string }> = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ xử lý' },
  { key: 'packing', label: 'Đang đóng gói' },
  { key: 'shipping', label: 'Đang giao vận' },
  { key: 'completed', label: 'Đã hoàn thành' },
  { key: 'cancelled', label: 'Đã hủy' },
];

const salesChannelLabels: Record<SalesChannel, string> = {
  website: 'Website',
  hotline: 'Hotline',
  facebook: 'Facebook',
  shopee: 'Shopee',
};

function InlineIcon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      {children}
    </svg>
  );
}

const pageIcons = {
  plus: (
    <InlineIcon>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </InlineIcon>
  ),
  view: (
    <InlineIcon>
      <path d="M2.5 12S6 5.75 12 5.75 21.5 12 21.5 12 18 18.25 12 18.25 2.5 12 2.5 12Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </InlineIcon>
  ),
  print: (
    <InlineIcon>
      <path d="M7.5 8V4.75h9V8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <path d="M6.5 18.5h11v-6h-11v6Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 10.5h14a2 2 0 0 1 2 2v3h-3.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
      <circle cx="17.25" cy="13.25" r=".9" fill="currentColor" />
    </InlineIcon>
  ),
  cancel: (
    <InlineIcon>
      <path d="m8 8 8 8M16 8l-8 8" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
    </InlineIcon>
  ),
  orders: (
    <InlineIcon>
      <path d="M5 6.25A2.25 2.25 0 0 1 7.25 4h9.5A2.25 2.25 0 0 1 19 6.25v11.5A2.25 2.25 0 0 1 16.75 20h-9.5A2.25 2.25 0 0 1 5 17.75V6.25Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </InlineIcon>
  ),
};

function buildDateRange(preset: DatePreset, customFrom: string, customTo: string) {
  if (preset === 'custom') {
    return {
      from: customFrom || undefined,
      to: customTo || undefined,
    };
  }

  if (preset === 'all') {
    return {};
  }

  const now = new Date();
  const end = now.toISOString();
  const start = new Date(now);

  if (preset === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (preset === 'week') {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }

  return {
    from: start.toISOString(),
    to: end,
  };
}

function triggerDownload(filename: string, blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function readLogString(value: unknown, key: string) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const result = (value as Record<string, unknown>)[key];
  return typeof result === 'string' ? result : null;
}

function getLatestTrackingCode(logs: ActivityLogRecord[]) {
  for (const log of logs) {
    const trackingCode = readLogString(log.newData, 'trackingCode');
    if (trackingCode) {
      return trackingCode;
    }
  }

  return '';
}

function getOrderTimelineSummary(item: ActivityLogRecord) {
  const preview = formatActivityDataPreview(item.newData ?? item.oldData);
  if (preview) {
    return preview;
  }

  return item.user?.fullName ? `Thao tác bởi ${item.user.fullName}` : 'Sự kiện được ghi nhận bởi hệ thống';
}

function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<FilterPaymentStatus>('all');
  const [salesChannelFilter, setSalesChannelFilter] = useState<FilterSalesChannel>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<Exclude<OrderStatus, 'pending'> | ''>('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [bookSearchInput, setBookSearchInput] = useState('');
  const [opsDraft, setOpsDraft] = useState({ trackingCode: '', internalNote: '' });
  const [manualForm, setManualForm] = useState<ManualOrderFormState>(createInitialManualOrderForm);

  const deferredCustomerSearch = useDeferredValue(customerSearchInput.trim());
  const deferredBookSearch = useDeferredValue(bookSearchInput.trim());
  const dateRange = useMemo(() => buildDateRange(datePreset, customFrom, customTo), [customFrom, customTo, datePreset]);

  const { data: metadata } = useSuspenseQuery({
    queryKey: ['metadata', 'admin', 'orders', 'workspace'],
    queryFn: getMetadata,
  });

  const orderListQuery = useQuery({
    queryKey: ['admin', 'orders', 'workspace', page, search, statusTab, paymentStatusFilter, salesChannelFilter, dateRange.from, dateRange.to],
    queryFn: () =>
      getAdminOrders({
        page,
        limit: 10,
        search,
        status: statusTab === 'all' ? undefined : statusTab,
        paymentStatus: paymentStatusFilter === 'all' ? undefined : paymentStatusFilter,
        salesChannel: salesChannelFilter === 'all' ? undefined : salesChannelFilter,
        from: dateRange.from,
        to: dateRange.to,
      }),
    placeholderData: (previousData) => previousData,
  });

  const quickStatsQueries = useQueries({
    queries: quickStatConfig.map((item) => ({
      queryKey: ['admin', 'orders', 'quick-stat', item.status],
      queryFn: () => getAdminOrders({ page: 1, limit: 1, status: item.status }),
      placeholderData: (previousData: Awaited<ReturnType<typeof getAdminOrders>> | undefined) => previousData,
    })),
  });

  const selectedOrderQuery = useQuery({
    queryKey: ['admin', 'orders', 'detail', selectedOrderId],
    queryFn: () => getAdminOrderById(selectedOrderId ?? ''),
    enabled: Boolean(selectedOrderId && isDetailOpen),
  });

  const paymentLookupQuery = useQuery({
    queryKey: ['admin', 'orders', 'payment', selectedOrderId],
    queryFn: () => getAdminPaymentByOrder(selectedOrderId ?? ''),
    enabled: Boolean(selectedOrderId && isDetailOpen),
  });

  const orderTimelineQuery = useQuery({
    queryKey: ['admin', 'orders', 'timeline', selectedOrderId],
    queryFn: () => getActivityLogs({ page: 1, limit: 20, entityId: selectedOrderId ?? undefined }),
    enabled: Boolean(selectedOrderId && isDetailOpen),
  });

  const customerOptionsQuery = useQuery({
    queryKey: ['admin', 'orders', 'manual', 'customers', deferredCustomerSearch],
    queryFn: () => getAdminCustomers({ limit: 20, search: deferredCustomerSearch || undefined }),
    enabled: isCreateOpen,
    placeholderData: (previousData) => previousData,
  });

  const bookOptionsQuery = useQuery({
    queryKey: ['admin', 'orders', 'manual', 'books', deferredBookSearch],
    queryFn: () => getAdminBooks({ limit: 30, search: deferredBookSearch || undefined }),
    enabled: isCreateOpen,
    placeholderData: (previousData) => previousData,
  });

  const orders = orderListQuery.data?.items ?? [];
  const meta = orderListQuery.data?.meta;
  const timelineItems = orderTimelineQuery.data?.items ?? [];
  const latestTrackingCode = useMemo(() => getLatestTrackingCode(timelineItems), [timelineItems]);
  const visibleOrderIds = orders.map((order) => order.id);
  const allVisibleSelected = visibleOrderIds.length > 0 && visibleOrderIds.every((id) => selectedIds.includes(id));

  const subtotalPreview = useMemo(
    () => manualForm.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [manualForm.items],
  );
  const shippingPreview = Number(manualForm.shippingFee || 0);
  const totalPreview = subtotalPreview + shippingPreview;

  const selectedCustomer = customerOptionsQuery.data?.find((customer) => customer.id === manualForm.userId) ?? null;
  const nextStatuses = useMemo(
    () => (selectedOrderQuery.data ? (metadata.orderStatusTransitions?.[selectedOrderQuery.data.orderStatus] ?? []) as Exclude<OrderStatus, 'pending'>[] : []),
    [metadata.orderStatusTransitions, selectedOrderQuery.data],
  );

  const canSubmitManualOrder = useMemo(() => Boolean(
    manualForm.userId &&
    manualForm.receiverName.trim() &&
    manualForm.receiverPhone.trim() &&
    manualForm.province.trim() &&
    manualForm.district.trim() &&
    manualForm.ward.trim() &&
    manualForm.detailAddress.trim() &&
    manualForm.items.length > 0,
  ), [manualForm]);

  useEffect(() => {
    if (orders.length === 0) {
      setSelectedIds([]);
      if (!isDetailOpen) {
        setSelectedOrderId(null);
      }
      return;
    }

    setSelectedIds((current) => current.filter((id) => orders.some((order) => order.id === id)));
  }, [isDetailOpen, orders]);

  useEffect(() => {
    setOpsDraft((current) => ({
      trackingCode: latestTrackingCode || current.trackingCode,
      internalNote: current.internalNote,
    }));
  }, [latestTrackingCode, selectedOrderId]);

  const updateStatusMutation = useMutation({
    mutationFn: ({
      orderId,
      orderStatus,
      cancelledReason,
    }: {
      orderId: string;
      orderStatus: Exclude<OrderStatus, 'pending'>;
      cancelledReason?: string;
    }) => updateOrderStatus(orderId, { orderStatus, cancelledReason }),
    onSuccess: async (updatedOrder) => {
      setErrorMessage(null);
      setFeedback(getAdminOrderUpdateMessage(updatedOrder.orderCode, updatedOrder.orderStatus));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] }),
      ]);
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể cập nhật trạng thái đơn hàng');
    },
  });

  const updateOpsMutation = useMutation({
    mutationFn: (payload: { orderId: string; trackingCode?: string; internalNote?: string }) =>
      updateAdminOrderOps(payload.orderId, { trackingCode: payload.trackingCode, internalNote: payload.internalNote }),
    onSuccess: async (updatedOrder) => {
      setErrorMessage(null);
      setFeedback(`Đã lưu ghi chú vận hành cho ${updatedOrder.orderCode}.`);
      setOpsDraft((current) => ({ ...current, internalNote: '' }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'detail', updatedOrder.id] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'timeline', updatedOrder.id] }),
      ]);
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể lưu thao tác vận hành');
    },
  });

  const createManualOrderMutation = useMutation({
    mutationFn: (payload: AdminManualOrderPayload) => createAdminManualOrder(payload),
    onSuccess: async (createdOrder) => {
      setErrorMessage(null);
      setFeedback(`Đã tạo đơn hàng thủ công ${createdOrder.orderCode}.`);
      setIsCreateOpen(false);
      setManualForm(createInitialManualOrderForm());
      setCustomerSearchInput('');
      setBookSearchInput('');
      setSelectedOrderId(createdOrder.id);
      setIsDetailOpen(true);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
      ]);
    },
    onError: (error) => {
      setFeedback(null);
      setErrorMessage(error instanceof Error ? error.message : 'Không thể tạo đơn hàng thủ công');
    },
  });

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function openDetailModal(orderId: string) {
    setSelectedOrderId(orderId);
    setIsDetailOpen(true);
    setFeedback(null);
    setErrorMessage(null);
  }

  function closeDetailModal() {
    setIsDetailOpen(false);
  }

  function resetFilters() {
    setSearchInput('');
    setSearch('');
    setStatusTab('all');
    setPaymentStatusFilter('all');
    setSalesChannelFilter('all');
    setDatePreset('all');
    setCustomFrom('');
    setCustomTo('');
    setPage(1);
  }

  function toggleOrderSelection(orderId: string) {
    setSelectedIds((current) => current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]);
  }

  function toggleSelectAllVisible() {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleOrderIds.includes(id));
      }

      return Array.from(new Set([...current, ...visibleOrderIds]));
    });
  }

  async function handleDocumentDownload(orderId: string, orderCode: string, type: 'invoice' | 'delivery-note') {
    try {
      setDownloadingDoc(`${type}:${orderId}`);
      const blob = type === 'invoice' ? await downloadInvoice(orderId) : await downloadDeliveryNote(orderId);
      triggerDownload(`${orderCode}-${type}.pdf`, blob);
    } finally {
      setDownloadingDoc(null);
    }
  }

  async function handleBulkStatusUpdate() {
    if (!bulkStatus || selectedIds.length === 0) {
      return;
    }

    let cancelledReason: string | undefined;
    if (bulkStatus === 'cancelled') {
      cancelledReason = window.prompt('Nhập lý do hủy cho các đơn đã chọn', 'Hủy từ khu vực vận hành')?.trim();
      if (!cancelledReason) {
        return;
      }
    }

    const results = await Promise.allSettled(
      selectedIds.map((orderId) => updateOrderStatus(orderId, { orderStatus: bulkStatus, cancelledReason })),
    );

    const successCount = results.filter((result) => result.status === 'fulfilled').length;
    const failedCount = results.length - successCount;

    if (successCount > 0) {
      setFeedback(`Đã cập nhật ${successCount} đơn hàng${failedCount > 0 ? `, ${failedCount} đơn chưa cập nhật được` : ''}.`);
      setErrorMessage(null);
      setSelectedIds([]);
      setBulkStatus('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'orders', 'detail'] }),
      ]);
    } else {
      setFeedback(null);
      setErrorMessage('Không thể cập nhật trạng thái cho các đơn đã chọn.');
    }
  }

  async function handleBulkDeliveryNotePrint() {
    for (const orderId of selectedIds) {
      const order = orders.find((item) => item.id === orderId);
      if (!order) {
        continue;
      }

      await handleDocumentDownload(order.id, order.orderCode, 'delivery-note');
    }
  }

  function openCreateOrderModal() {
    setIsCreateOpen(true);
    setFeedback(null);
    setErrorMessage(null);
  }

  function closeCreateOrderModal() {
    if (!createManualOrderMutation.isPending) {
      setIsCreateOpen(false);
    }
  }

  function addManualOrderLine(book: AdminBookRecord) {
    setManualForm((current) => {
      if (current.items.some((item) => item.bookId === book.id)) {
        return {
          ...current,
          items: current.items.map((item) => item.bookId === book.id ? { ...item, quantity: item.quantity + 1 } : item),
        };
      }

      return {
        ...current,
        items: [
          ...current.items,
          {
            bookId: book.id,
            title: book.title,
            price: book.price,
            coverImage: book.coverImage,
            quantity: 1,
          },
        ],
      };
    });
  }

  function submitManualOrder() {
    if (!canSubmitManualOrder) {
      return;
    }

    createManualOrderMutation.mutate({
      userId: manualForm.userId,
      receiverName: manualForm.receiverName.trim(),
      receiverPhone: manualForm.receiverPhone.trim(),
      province: manualForm.province.trim(),
      district: manualForm.district.trim(),
      ward: manualForm.ward.trim(),
      detailAddress: manualForm.detailAddress.trim(),
      paymentMethod: manualForm.paymentMethod,
      paymentStatus: manualForm.paymentStatus,
      salesChannel: manualForm.salesChannel,
      shippingFee: manualForm.shippingFee.trim() ? Number(manualForm.shippingFee) : undefined,
      voucherCode: manualForm.voucherCode.trim() || undefined,
      customerNote: manualForm.customerNote.trim() || undefined,
      internalNote: manualForm.internalNote.trim() || undefined,
      trackingCode: manualForm.trackingCode.trim() || undefined,
      items: manualForm.items.map((item) => ({
        bookId: item.bookId,
        quantity: item.quantity,
      })),
    });
  }

  return (
    <div className="page-stack orders-admin-page">
      <section className="surface-card orders-admin-hero">
        <div className="orders-admin-hero-copy">
          <SectionHeading
            eyebrow="Orders workspace"
            title="Quản lý Đơn hàng"
            description="Không gian điều hành đơn hàng tập trung: xem nhanh đơn cần xử lý, lọc theo trạng thái, thao tác hàng loạt và mở chi tiết vận hành chỉ trong một màn hình."
          />
          <div className="orders-admin-hero-meta">
            <span className="orders-total-pill">
              {pageIcons.orders}
              <strong>{meta?.total ?? orderListQuery.data?.items.length ?? 0}</strong>
              <span>đơn hàng hiện có</span>
            </span>
          </div>
        </div>
        <div className="orders-admin-hero-actions">
          <button className="button button-primary orders-create-button" onClick={openCreateOrderModal} type="button">
            {pageIcons.plus}
            Tạo đơn hàng
          </button>
        </div>
      </section>

      <section className="orders-quick-grid">
        {quickStatConfig.map((item, index) => (
          <article className={`orders-quick-card orders-quick-card-${item.accent}`} key={item.status}>
            <p>{item.label}</p>
            <strong>{quickStatsQueries[index].data?.meta?.total ?? 0}</strong>
            <span>{getOrderStatusLabel(item.status)}</span>
          </article>
        ))}
      </section>

      <section className="surface-card orders-filter-card">
        <div className="orders-filter-tabs" role="tablist" aria-label="Nhóm trạng thái đơn hàng">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              aria-selected={statusTab === tab.key}
              className={`orders-filter-tab ${statusTab === tab.key ? 'orders-filter-tab-active' : ''}`}
              onClick={() => {
                setStatusTab(tab.key);
                setPage(1);
              }}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form className="orders-filter-grid" onSubmit={handleSearchSubmit}>
          <label className="field orders-search-field">
            <span>Tìm kiếm đơn hàng</span>
            <input
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Mã đơn, tên khách hàng hoặc số điện thoại"
              value={searchInput}
            />
          </label>
          <label className="field">
            <span>TT thanh toán</span>
            <select onChange={(event) => setPaymentStatusFilter(event.target.value as FilterPaymentStatus)} value={paymentStatusFilter}>
              <option value="all">Tất cả</option>
              {metadata.paymentStatuses.map((status) => (
                <option key={status} value={status}>
                  {getPaymentStatusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Kênh bán hàng</span>
            <select onChange={(event) => setSalesChannelFilter(event.target.value as FilterSalesChannel)} value={salesChannelFilter}>
              <option value="all">Tất cả kênh</option>
              {Object.entries(salesChannelLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Khoảng thời gian</span>
            <select onChange={(event) => setDatePreset(event.target.value as DatePreset)} value={datePreset}>
              <option value="all">Toàn thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
              <option value="custom">Chọn ngày cụ thể</option>
            </select>
          </label>
          {datePreset === 'custom' ? (
            <>
              <label className="field">
                <span>Từ ngày</span>
                <input onChange={(event) => setCustomFrom(event.target.value)} type="date" value={customFrom} />
              </label>
              <label className="field">
                <span>Đến ngày</span>
                <input onChange={(event) => setCustomTo(event.target.value)} type="date" value={customTo} />
              </label>
            </>
          ) : null}
          <div className="orders-filter-actions">
            <button className="button button-secondary" type="submit">
              Áp dụng bộ lọc
            </button>
            <button className="button button-secondary" onClick={resetFilters} type="button">
              Đặt lại
            </button>
          </div>
        </form>
      </section>

      {selectedIds.length > 0 ? (
        <section className="surface-card orders-bulk-card">
          <div>
            <strong>Đã chọn {selectedIds.length} đơn hàng</strong>
            <p>Thực hiện nhanh thao tác vận hành hàng loạt trên những đơn đang hiển thị.</p>
          </div>
          <div className="orders-bulk-actions">
            <label className="field">
              <span>Cập nhật trạng thái</span>
              <select onChange={(event) => setBulkStatus(event.target.value as Exclude<OrderStatus, 'pending'> | '')} value={bulkStatus}>
                <option value="">Chọn trạng thái</option>
                <option value="confirmed">Xác nhận</option>
                <option value="packing">Đóng gói</option>
                <option value="shipping">Giao vận</option>
                <option value="completed">Hoàn thành</option>
                <option value="cancelled">Hủy đơn</option>
              </select>
            </label>
            <button className="button button-secondary" disabled={!bulkStatus} onClick={() => void handleBulkStatusUpdate()} type="button">
              Cập nhật hàng loạt
            </button>
            <button className="button button-secondary" onClick={() => void handleBulkDeliveryNotePrint()} type="button">
              In phiếu giao
            </button>
            <button className="button button-secondary" onClick={() => setSelectedIds([])} type="button">
              Bỏ chọn
            </button>
          </div>
        </section>
      ) : null}

      {errorMessage ? <p className="feedback-text feedback-text-error">{errorMessage}</p> : null}
      {feedback ? <p className="feedback-text feedback-text-success">{feedback}</p> : null}

      <section className="orders-table-section">
        <article className="surface-card orders-table-card orders-table-card-full">
          <div className="orders-table-head">
            <SectionHeading
              eyebrow="Orders data table"
              title="Bảng danh sách đơn hàng"
              description={meta ? `Trang ${meta.page}/${meta.totalPages} • ${meta.total} đơn phù hợp` : 'Đang tải dữ liệu đơn hàng'}
            />
          </div>

          {orderListQuery.isLoading && orders.length === 0 ? <p>Đang tải danh sách đơn hàng...</p> : null}
          {!orderListQuery.isLoading && orders.length === 0 ? (
            <EmptyState title="Không có đơn hàng phù hợp" description="Thử nới điều kiện lọc hoặc tạo đơn hàng mới cho khách mua qua hotline, Facebook hay Shopee." />
          ) : (
            <>
              <div className="orders-table-wrap">
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>
                        <input checked={allVisibleSelected} onChange={toggleSelectAllVisible} type="checkbox" />
                      </th>
                      <th>Mã đơn</th>
                      <th>Ngày tạo</th>
                      <th>Khách hàng</th>
                      <th>Tổng tiền</th>
                      <th>TT thanh toán</th>
                      <th>TT vận hành</th>
                      <th>Kênh</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const nextAvailableStatuses = (metadata.orderStatusTransitions?.[order.orderStatus] ?? []) as Exclude<OrderStatus, 'pending'>[];
                      return (
                        <tr className={selectedOrderId === order.id ? 'orders-table-row-active' : ''} key={order.id}>
                          <td>
                            <input
                              checked={selectedIds.includes(order.id)}
                              onChange={() => toggleOrderSelection(order.id)}
                              type="checkbox"
                            />
                          </td>
                          <td>
                            <button className="orders-table-link" onClick={() => openDetailModal(order.id)} type="button">
                              {order.orderCode}
                            </button>
                          </td>
                          <td><strong>{formatDate(order.createdAt)}</strong></td>
                          <td>
                            <div className="orders-table-customer">
                              <strong>{order.user?.fullName ?? 'Khách hàng'}</strong>
                              <span>{order.user?.phone ?? 'Chưa có số điện thoại'}</span>
                            </div>
                          </td>
                          <td><strong>{formatCurrency(order.totalAmount)}</strong></td>
                          <td>
                            <span className={`status-chip status-chip-${getPaymentStatusTone(order.paymentStatus)}`}>
                              {getPaymentStatusLabel(order.paymentStatus)}
                            </span>
                          </td>
                          <td>
                            <span className={`status-chip status-chip-${getOrderStatusTone(order.orderStatus)}`}>
                              {getOrderStatusLabel(order.orderStatus)}
                            </span>
                          </td>
                          <td>
                            <span className="orders-channel-pill">{salesChannelLabels[order.salesChannel ?? 'website']}</span>
                          </td>
                          <td>
                            <div className="orders-row-actions">
                              <button className="orders-icon-button" onClick={() => openDetailModal(order.id)} title="Xem nhanh" type="button">
                                {pageIcons.view}
                              </button>
                              <button
                                className="orders-icon-button"
                                onClick={() => void handleDocumentDownload(order.id, order.orderCode, 'delivery-note')}
                                title="In phiếu giao"
                                type="button"
                              >
                                {pageIcons.print}
                              </button>
                              <button
                                className="orders-icon-button"
                                disabled={!nextAvailableStatuses.includes('cancelled')}
                                onClick={() => {
                                  const reason = window.prompt('Nhập lý do hủy đơn hàng', 'Hủy từ khu vực vận hành')?.trim();
                                  if (!reason) {
                                    return;
                                  }
                                  updateStatusMutation.mutate({ orderId: order.id, orderStatus: 'cancelled', cancelledReason: reason });
                                }}
                                title="Hủy đơn"
                                type="button"
                              >
                                {pageIcons.cancel}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {meta ? (
                <div className="orders-pagination">
                  <button className="button button-secondary" disabled={meta.page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">
                    Trang trước
                  </button>
                  <span>Trang {meta.page} / {meta.totalPages}</span>
                  <button className="button button-secondary" disabled={meta.page >= meta.totalPages} onClick={() => setPage((current) => current + 1)} type="button">
                    Trang sau
                  </button>
                </div>
              ) : null}
            </>
          )}
        </article>
      </section>
      {isDetailOpen ? (
        <div className="orders-modal-backdrop orders-detail-modal-backdrop" role="presentation">
          <section aria-modal="true" className="orders-modal orders-detail-modal" role="dialog">
            <div className="orders-modal-head">
              <div>
                <p className="eyebrow">Order detail</p>
                <h2>Chi tiết đơn hàng</h2>
                <p>Xử lý vận hành, theo dõi timeline và thao tác chứng từ ngay trong modal.</p>
              </div>
              <button className="orders-modal-close" onClick={closeDetailModal} type="button">
                Đóng
              </button>
            </div>

            <div className="orders-modal-body">
              {selectedOrderQuery.isLoading ? <p>Đang tải chi tiết đơn hàng...</p> : null}
              {selectedOrderQuery.error ? (
                <p className="feedback-text feedback-text-error">
                  {selectedOrderQuery.error instanceof Error ? selectedOrderQuery.error.message : 'Không thể tải chi tiết đơn hàng'}
                </p>
              ) : null}

              {selectedOrderQuery.data ? (
                <div className="orders-detail-layout">
                  <div className="orders-detail-main">
                    <div className="orders-detail-summary">
                      <div>
                        <p className="orders-detail-code">{selectedOrderQuery.data.orderCode}</p>
                        <p className="orders-detail-caption">{formatDate(selectedOrderQuery.data.createdAt)} • {salesChannelLabels[selectedOrderQuery.data.salesChannel ?? 'website']}</p>
                      </div>
                      <div className="orders-detail-badges">
                        <span className={`status-chip status-chip-${getOrderStatusTone(selectedOrderQuery.data.orderStatus)}`}>
                          {getOrderStatusLabel(selectedOrderQuery.data.orderStatus)}
                        </span>
                        <span className={`status-chip status-chip-${getPaymentStatusTone(selectedOrderQuery.data.paymentStatus)}`}>
                          {getPaymentStatusLabel(selectedOrderQuery.data.paymentStatus)}
                        </span>
                      </div>
                    </div>

                    <section className="orders-detail-section">
                      <div className="orders-section-title">
                        <h3>Chi tiết sản phẩm</h3>
                        <p>{selectedOrderQuery.data.items.length} đầu sách trong đơn</p>
                      </div>
                      <div className="orders-product-stack">
                        {selectedOrderQuery.data.items.map((item) => (
                          <article className="orders-product-row" key={item.id}>
                            <div className="orders-product-thumb">
                              {item.book?.coverImage ? <img alt={item.bookNameSnapshot} src={item.book.coverImage} /> : <span>{item.bookNameSnapshot.slice(0, 1).toUpperCase()}</span>}
                            </div>
                            <div className="orders-product-copy">
                              <strong>{item.bookNameSnapshot}</strong>
                              <p>{item.quantity} x {formatCurrency(item.unitPrice)}</p>
                            </div>
                            <strong>{formatCurrency(item.totalPrice)}</strong>
                          </article>
                        ))}
                      </div>
                    </section>

                    <section className="orders-detail-section">
                      <div className="orders-section-title">
                        <h3>Tóm tắt chi phí</h3>
                        <p>Đối chiếu nhanh giá trị đơn và các khoản phát sinh</p>
                      </div>
                      <div className="orders-cost-grid">
                        <article>
                          <span>Tạm tính</span>
                          <strong>{formatCurrency(selectedOrderQuery.data.subtotal)}</strong>
                        </article>
                        <article>
                          <span>Phí vận chuyển</span>
                          <strong>{formatCurrency(selectedOrderQuery.data.shippingFee)}</strong>
                        </article>
                        <article>
                          <span>Mã giảm giá</span>
                          <strong>{selectedOrderQuery.data.voucher?.code ?? 'Không áp dụng'}{selectedOrderQuery.data.discountAmount > 0 ? ` • -${formatCurrency(selectedOrderQuery.data.discountAmount)}` : ''}</strong>
                        </article>
                        <article className="orders-cost-total">
                          <span>Tổng cộng khách phải trả</span>
                          <strong>{formatCurrency(selectedOrderQuery.data.totalAmount)}</strong>
                        </article>
                      </div>
                    </section>

                    <section className="orders-detail-section">
                      <div className="orders-section-title">
                        <h3>Khu vực Vận chuyển</h3>
                        <p>Quản lý mã vận đơn, in ấn chứng từ và thao tác giao nhận</p>
                      </div>
                      <div className="orders-fulfillment-toolbar">
                        <button
                          className="button button-secondary"
                          onClick={() => setOpsDraft((current) => ({
                            ...current,
                            trackingCode: current.trackingCode || `TRK-${selectedOrderQuery.data?.orderCode.replace('ORD-', '')}`,
                          }))}
                          type="button"
                        >
                          Tạo mã vận đơn
                        </button>
                        <button
                          className="button button-secondary"
                          disabled={downloadingDoc === `delivery-note:${selectedOrderQuery.data.id}`}
                          onClick={() => void handleDocumentDownload(selectedOrderQuery.data.id, selectedOrderQuery.data.orderCode, 'delivery-note')}
                          type="button"
                        >
                          {downloadingDoc === `delivery-note:${selectedOrderQuery.data.id}` ? 'Đang tải phiếu...' : 'In phiếu xuất kho'}
                        </button>
                        <button
                          className="button button-secondary"
                          disabled={downloadingDoc === `invoice:${selectedOrderQuery.data.id}`}
                          onClick={() => void handleDocumentDownload(selectedOrderQuery.data.id, selectedOrderQuery.data.orderCode, 'invoice')}
                          type="button"
                        >
                          {downloadingDoc === `invoice:${selectedOrderQuery.data.id}` ? 'Đang tải hóa đơn...' : 'In hóa đơn'}
                        </button>
                      </div>
                      <label className="field">
                        <span>Mã vận đơn thủ công</span>
                        <input
                          onChange={(event) => setOpsDraft((current) => ({ ...current, trackingCode: event.target.value }))}
                          placeholder="Nhập hoặc tạo mã vận đơn"
                          value={opsDraft.trackingCode}
                        />
                      </label>
                      <div className="orders-tracking-chip">
                        <span>Mã vận đơn hiện tại</span>
                        <strong>{latestTrackingCode || 'Chưa có mã vận đơn'}</strong>
                      </div>
                    </section>

                    <section className="orders-detail-section">
                      <div className="orders-section-title">
                        <h3>Lịch sử & Ghi chú</h3>
                        <p>Timeline hoạt động theo đơn hàng và phần ghi chú nội bộ không hiển thị cho khách</p>
                      </div>
                      <div className="orders-timeline">
                        {timelineItems.length === 0 ? (
                          <p>Chưa có nhật ký vận hành cho đơn này.</p>
                        ) : timelineItems.map((item) => (
                          <article className="orders-timeline-item" key={item.id}>
                            <strong>{formatActivityActionLabel(item.action)}</strong>
                            <p>{getOrderTimelineSummary(item)}</p>
                            <span>{item.user?.fullName ?? 'Hệ thống'} • {formatDate(item.createdAt)}</span>
                          </article>
                        ))}
                      </div>
                      <label className="field">
                        <span>Ghi chú nội bộ</span>
                        <textarea
                          onChange={(event) => setOpsDraft((current) => ({ ...current, internalNote: event.target.value }))}
                          placeholder="Ví dụ: khách dặn gọi trước khi giao, ưu tiên đóng gói chống sốc..."
                          rows={4}
                          value={opsDraft.internalNote}
                        />
                      </label>
                      <div className="inline-actions">
                        <button
                          className="button button-secondary"
                          disabled={updateOpsMutation.isPending || (!opsDraft.internalNote.trim() && !opsDraft.trackingCode.trim())}
                          onClick={() => updateOpsMutation.mutate({
                            orderId: selectedOrderQuery.data.id,
                            trackingCode: opsDraft.trackingCode.trim() || undefined,
                            internalNote: opsDraft.internalNote.trim() || undefined,
                          })}
                          type="button"
                        >
                          {updateOpsMutation.isPending ? 'Đang lưu...' : 'Lưu cập nhật vận hành'}
                        </button>
                      </div>
                    </section>
                  </div>

                  <aside className="orders-detail-side">
                    <section className="orders-detail-section">
                      <div className="orders-section-title">
                        <h3>Trạng thái hiện tại</h3>
                        <p>Chuyển nhanh đơn qua các bước xử lý hợp lệ</p>
                      </div>
                      <label className="field">
                        <span>Trạng thái vận hành</span>
                        <select
                          disabled={nextStatuses.length === 0 || updateStatusMutation.isPending}
                          onChange={(event) => {
                            const nextStatus = event.target.value as Exclude<OrderStatus, 'pending'> | '';
                            if (!nextStatus) {
                              return;
                            }

                            if (nextStatus === 'cancelled') {
                              const reason = window.prompt('Nhập lý do hủy đơn hàng', 'Hủy từ khu vực vận hành')?.trim();
                              if (!reason) {
                                return;
                              }
                              updateStatusMutation.mutate({ orderId: selectedOrderQuery.data.id, orderStatus: nextStatus, cancelledReason: reason });
                              return;
                            }

                            updateStatusMutation.mutate({ orderId: selectedOrderQuery.data.id, orderStatus: nextStatus });
                          }}
                          value=""
                        >
                          <option value="">Chọn trạng thái tiếp theo</option>
                          {nextStatuses.map((status) => (
                            <option key={status} value={status}>
                              {getOrderStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      {nextStatuses.length === 0 ? <p>Không còn bước chuyển tiếp nào hợp lệ cho đơn này.</p> : null}
                    </section>

                    <section className="orders-detail-section">
                      <div className="orders-section-title">
                        <h3>Thông tin khách hàng</h3>
                        <p>Nhận diện khách mới và khách mua lặp lại</p>
                      </div>
                      <div className="orders-side-grid">
                        <article>
                          <span>Khách hàng</span>
                          <strong>{selectedOrderQuery.data.user?.fullName ?? selectedOrderQuery.data.receiverName}</strong>
                        </article>
                        <article>
                          <span>Email</span>
                          <strong>{selectedOrderQuery.data.user?.email ?? 'Không có email'}</strong>
                        </article>
                        <article>
                          <span>Số điện thoại</span>
                          <strong>{selectedOrderQuery.data.user?.phone ?? selectedOrderQuery.data.receiverPhone}</strong>
                        </article>
                        <article>
                          <span>Số đơn đã mua</span>
                          <strong>{selectedOrderQuery.data.user?._count?.orders ?? 1}</strong>
                        </article>
                      </div>
                    </section>

                    <section className="orders-detail-section">
                      <div className="orders-section-title">
                        <h3>Địa chỉ giao & thanh toán</h3>
                        <p>Dùng snapshot tại thời điểm đặt hàng để xử lý chính xác</p>
                      </div>
                      <div className="orders-address-stack">
                        <article>
                          <span>Địa chỉ giao hàng</span>
                          <strong>{selectedOrderQuery.data.addressSnapshot}</strong>
                        </article>
                        <article>
                          <span>Địa chỉ thanh toán</span>
                          <strong>{selectedOrderQuery.data.addressSnapshot}</strong>
                        </article>
                      </div>
                    </section>

                    <section className="orders-detail-section">
                      <div className="orders-section-title">
                        <h3>Thanh toán</h3>
                        <p>Đối soát nhanh phương thức, provider và thời điểm thu tiền</p>
                      </div>
                      <div className="orders-side-grid">
                        <article>
                          <span>Phương thức</span>
                          <strong>{getPaymentMethodLabel(selectedOrderQuery.data.paymentMethod)}</strong>
                        </article>
                        <article>
                          <span>Provider</span>
                          <strong>{getPaymentProviderLabel(paymentLookupQuery.data?.payment?.provider ?? selectedOrderQuery.data.payment?.provider)}</strong>
                        </article>
                        <article>
                          <span>Mã giao dịch</span>
                          <strong>{paymentLookupQuery.data?.payment?.transactionCode ?? selectedOrderQuery.data.payment?.transactionCode ?? 'Chưa có'}</strong>
                        </article>
                        <article>
                          <span>Thời điểm thanh toán</span>
                          <strong>
                            {paymentLookupQuery.data?.payment?.paidAt
                              ? formatDate(paymentLookupQuery.data.payment.paidAt)
                              : selectedOrderQuery.data.payment?.paidAt
                                ? formatDate(selectedOrderQuery.data.payment.paidAt)
                                : 'Chưa thanh toán'}
                          </strong>
                        </article>
                      </div>
                    </section>

                    <section className="orders-detail-section">
                      <div className="orders-section-title">
                        <h3>Ghi chú của khách hàng</h3>
                        <p>Thông tin hiển thị đúng snapshot đã ghi nhận trong đơn</p>
                      </div>
                      <div className="orders-customer-note">
                        <strong>{selectedOrderQuery.data.note?.trim() || 'Khách hàng không để lại ghi chú.'}</strong>
                      </div>
                    </section>
                  </aside>
                </div>
              ) : (
                <EmptyState title="Không thể mở chi tiết đơn hàng" description="Hãy thử chọn lại đơn hàng từ bảng dữ liệu hoặc tải lại trang." />
              )}
            </div>
          </section>
        </div>
      ) : null}

      {isCreateOpen ? (
        <div className="orders-modal-backdrop" role="presentation">
          <section aria-modal="true" className="orders-modal" role="dialog">
            <div className="orders-modal-head">
              <div>
                <p className="eyebrow">Manual order</p>
                <h2>Tạo đơn hàng thủ công</h2>
                <p>Tạo nhanh đơn cho khách mua qua hotline, Facebook hoặc Shopee với đầy đủ sản phẩm, địa chỉ và trạng thái thanh toán ban đầu.</p>
              </div>
              <button className="orders-modal-close" onClick={closeCreateOrderModal} type="button">
                Đóng
              </button>
            </div>

            <div className="orders-modal-body">
              <section className="orders-modal-section">
                <div className="orders-section-title">
                  <h3>1. Chọn khách hàng</h3>
                  <p>Tìm theo tên hoặc email để gắn đơn vào đúng hồ sơ khách đã có trong hệ thống.</p>
                </div>
                <label className="field">
                  <span>Tìm khách hàng</span>
                  <input onChange={(event) => setCustomerSearchInput(event.target.value)} placeholder="Tên khách hàng hoặc email" value={customerSearchInput} />
                </label>
                <div className="orders-choice-grid">
                  {(customerOptionsQuery.data ?? []).map((customer) => (
                    <button
                      className={`orders-choice-card ${manualForm.userId === customer.id ? 'orders-choice-card-active' : ''}`}
                      key={customer.id}
                      onClick={() => setManualForm((current) => ({
                        ...current,
                        userId: customer.id,
                        receiverName: current.receiverName || customer.fullName,
                        receiverPhone: current.receiverPhone || customer.phone || '',
                      }))}
                      type="button"
                    >
                      <strong>{customer.fullName}</strong>
                      <span>{customer.email}</span>
                      <span>{customer.phone || 'Chưa có số điện thoại'}</span>
                    </button>
                  ))}
                </div>
                {selectedCustomer ? <p className="orders-selection-hint">Đang chọn: {selectedCustomer.fullName}</p> : null}
              </section>

              <section className="orders-modal-section">
                <div className="orders-section-title">
                  <h3>2. Thông tin giao hàng</h3>
                  <p>Điền snapshot giao hàng để đơn có thể xử lý độc lập, không phụ thuộc việc khách thay đổi địa chỉ sau đó.</p>
                </div>
                <div className="orders-modal-grid">
                  <label className="field">
                    <span>Người nhận</span>
                    <input onChange={(event) => setManualForm((current) => ({ ...current, receiverName: event.target.value }))} value={manualForm.receiverName} />
                  </label>
                  <label className="field">
                    <span>Số điện thoại</span>
                    <input onChange={(event) => setManualForm((current) => ({ ...current, receiverPhone: event.target.value }))} value={manualForm.receiverPhone} />
                  </label>
                  <label className="field">
                    <span>Tỉnh/Thành phố</span>
                    <input onChange={(event) => setManualForm((current) => ({ ...current, province: event.target.value }))} value={manualForm.province} />
                  </label>
                  <label className="field">
                    <span>Quận/Huyện</span>
                    <input onChange={(event) => setManualForm((current) => ({ ...current, district: event.target.value }))} value={manualForm.district} />
                  </label>
                  <label className="field">
                    <span>Phường/Xã</span>
                    <input onChange={(event) => setManualForm((current) => ({ ...current, ward: event.target.value }))} value={manualForm.ward} />
                  </label>
                  <label className="field field-wide">
                    <span>Địa chỉ chi tiết</span>
                    <input onChange={(event) => setManualForm((current) => ({ ...current, detailAddress: event.target.value }))} value={manualForm.detailAddress} />
                  </label>
                </div>
              </section>

              <section className="orders-modal-section">
                <div className="orders-section-title">
                  <h3>3. Cấu hình đơn hàng</h3>
                  <p>Thiết lập kênh bán, phương thức thanh toán và ghi chú ban đầu cho đơn.</p>
                </div>
                <div className="orders-modal-grid">
                  <label className="field">
                    <span>Kênh bán hàng</span>
                    <select onChange={(event) => setManualForm((current) => ({ ...current, salesChannel: event.target.value as SalesChannel }))} value={manualForm.salesChannel}>
                      {Object.entries(salesChannelLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Phương thức thanh toán</span>
                    <select onChange={(event) => setManualForm((current) => ({ ...current, paymentMethod: event.target.value as 'cod' | 'online' }))} value={manualForm.paymentMethod}>
                      <option value="cod">COD</option>
                      <option value="online">Online</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>TT thanh toán</span>
                    <select onChange={(event) => setManualForm((current) => ({ ...current, paymentStatus: event.target.value as Exclude<PaymentStatus, 'refunded'> }))} value={manualForm.paymentStatus}>
                      <option value="unpaid">Chưa thanh toán</option>
                      <option value="pending">Chờ xử lý</option>
                      <option value="paid">Đã thanh toán</option>
                      <option value="failed">Thanh toán lỗi</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Phí vận chuyển</span>
                    <input onChange={(event) => setManualForm((current) => ({ ...current, shippingFee: event.target.value }))} placeholder="Mặc định lấy từ cấu hình" type="number" value={manualForm.shippingFee} />
                  </label>
                  <label className="field">
                    <span>Mã giảm giá</span>
                    <input onChange={(event) => setManualForm((current) => ({ ...current, voucherCode: event.target.value }))} placeholder="Ví dụ: APRIL50" value={manualForm.voucherCode} />
                  </label>
                  <label className="field">
                    <span>Mã vận đơn khởi tạo</span>
                    <input onChange={(event) => setManualForm((current) => ({ ...current, trackingCode: event.target.value }))} placeholder="Tùy chọn" value={manualForm.trackingCode} />
                  </label>
                  <label className="field field-wide">
                    <span>Ghi chú của khách hàng</span>
                    <textarea onChange={(event) => setManualForm((current) => ({ ...current, customerNote: event.target.value }))} rows={3} value={manualForm.customerNote} />
                  </label>
                  <label className="field field-wide">
                    <span>Ghi chú nội bộ</span>
                    <textarea onChange={(event) => setManualForm((current) => ({ ...current, internalNote: event.target.value }))} rows={3} value={manualForm.internalNote} />
                  </label>
                </div>
              </section>

              <section className="orders-modal-section">
                <div className="orders-section-title">
                  <h3>4. Chọn sản phẩm</h3>
                  <p>Thêm từng tựa sách vào đơn, chỉnh số lượng trực tiếp trước khi lưu.</p>
                </div>
                <label className="field">
                  <span>Tìm sách</span>
                  <input onChange={(event) => setBookSearchInput(event.target.value)} placeholder="Tên sách hoặc ISBN" value={bookSearchInput} />
                </label>
                <div className="orders-choice-grid orders-choice-grid-books">
                  {(bookOptionsQuery.data ?? []).map((book) => (
                    <button className="orders-choice-card" key={book.id} onClick={() => addManualOrderLine(book)} type="button">
                      <strong>{book.title}</strong>
                      <span>{formatCurrency(book.price)}</span>
                      <span>Tồn kho: {book.stockQuantity}</span>
                    </button>
                  ))}
                </div>
                {manualForm.items.length > 0 ? (
                  <div className="orders-modal-lines">
                    {manualForm.items.map((item) => (
                      <article className="orders-manual-line" key={item.bookId}>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{formatCurrency(item.price)} / cuốn</p>
                        </div>
                        <div className="orders-manual-line-actions">
                          <input
                            min={1}
                            onChange={(event) => setManualForm((current) => ({
                              ...current,
                              items: current.items.map((line) => line.bookId === item.bookId ? { ...line, quantity: Math.max(1, Number(event.target.value || 1)) } : line),
                            }))}
                            type="number"
                            value={item.quantity}
                          />
                          <strong>{formatCurrency(item.price * item.quantity)}</strong>
                          <button
                            className="button button-secondary"
                            onClick={() => setManualForm((current) => ({ ...current, items: current.items.filter((line) => line.bookId !== item.bookId) }))}
                            type="button"
                          >
                            Xóa
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="orders-selection-hint">Chưa có sản phẩm nào trong đơn.</p>
                )}
              </section>
            </div>

            <div className="orders-modal-footer">
              <div className="orders-preview-card">
                <span>Tạm tính</span>
                <strong>{formatCurrency(subtotalPreview)}</strong>
                <span>Phí ship: {formatCurrency(shippingPreview)}</span>
                <strong className="orders-preview-total">{formatCurrency(totalPreview)}</strong>
              </div>
              <div className="orders-modal-actions">
                <button className="button button-secondary" onClick={closeCreateOrderModal} type="button">
                  Hủy
                </button>
                <button className="button button-primary" disabled={!canSubmitManualOrder || createManualOrderMutation.isPending} onClick={submitManualOrder} type="button">
                  {createManualOrderMutation.isPending ? 'Đang tạo đơn...' : 'Lưu đơn hàng'}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export default AdminOrdersPage;
