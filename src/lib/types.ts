export type Role = 'customer' | 'staff' | 'admin';
export type UserStatus = 'active' | 'locked';
export type PaymentMethod = 'cod' | 'online';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
export type OrderStatus = 'pending' | 'confirmed' | 'packing' | 'shipping' | 'completed' | 'cancelled';
export type ContactStatus = 'new' | 'in_progress' | 'resolved';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorPayload {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status?: UserStatus;
  phone?: string | null;
  avatar?: string | null;
}

export interface OptionItem {
  id: string;
  name: string;
  slug?: string;
}

export interface Settings {
  id: string;
  storeName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  shippingFee: number;
  supportHours: string | null;
  paymentProviderName: string | null;
  paymentInstructions: string | null;
}

export interface Banner {
  id: string;
  title: string;
  image: string;
  link: string | null;
}

export interface BookSummary {
  id: string;
  title: string;
  slug: string;
  coverImage: string | null;
  price: number;
  stockQuantity?: number;
  soldQuantity?: number;
  status?: string;
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  author?: OptionItem | null;
  category?: OptionItem | null;
  publisher?: OptionItem | null;
}

export interface BookImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export interface BookDetail extends BookSummary {
  isbn?: string | null;
  description?: string | null;
  publicationYear?: number | null;
  pageCount?: number | null;
  images?: BookImage[];
}

export interface HomeData {
  banners: Banner[];
  featuredBooks: BookSummary[];
  newBooks: BookSummary[];
  bestSellerBooks: BookSummary[];
}

export interface Review {
  id: string;
  orderId?: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    fullName: string;
    avatar?: string | null;
  };
}

export interface Address {
  id: string;
  receiverName: string;
  receiverPhone: string;
  province: string;
  district: string;
  ward: string;
  detailAddress: string;
  isDefault: boolean;
}

export interface CartLine {
  id: string;
  quantity: number;
  selected: boolean;
  book: BookSummary;
}

export interface Cart {
  id: string;
  items: CartLine[];
}

export interface OrderItem {
  id: string;
  bookId: string;
  bookNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PaymentRecord {
  id: string;
  provider: string;
  transactionCode?: string | null;
  amount: number;
  status: PaymentStatus;
  paidAt?: string | null;
  createdAt?: string;
}

export interface OrderRecord {
  id: string;
  orderCode: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  cancelledReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  note?: string | null;
  items: OrderItem[];
}

export interface OrderDetailRecord extends OrderRecord {
  receiverName: string;
  receiverPhone: string;
  addressSnapshot: string;
  payment: PaymentRecord | null;
  voucher?: {
    id: string;
    code: string;
  } | null;
}

export interface PaymentLookup {
  orderId: string;
  orderCode: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  payment: PaymentRecord | null;
}

export interface WishlistItem {
  id: string;
  createdAt: string;
  book: BookSummary;
}

export interface DashboardSummary {
  totalUsers: number;
  totalBooks: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  lowStockCount: number;
}

export interface ContactRecord {
  id: string;
  customerName: string;
  email: string;
  phone?: string | null;
  subject: string;
  content: string;
  status: ContactStatus;
  note?: string | null;
  assignedTo?: string | null;
  assignedStaff?: {
    id: string;
    fullName: string;
  } | null;
  updatedAt?: string;
  createdAt?: string;
}

export interface InventoryTransaction {
  id: string;
  type: string;
  quantity: number;
  note?: string | null;
  createdAt: string;
  book?: {
    id: string;
    title: string;
    slug: string;
  };
}

export interface MetadataCatalog {
  roles: Role[];
  userStatuses: UserStatus[];
  orderStatuses: OrderStatus[];
  paymentStatuses: PaymentStatus[];
  paymentMethods: PaymentMethod[];
  contactStatuses?: ContactStatus[];
  orderStatusTransitions?: Partial<Record<OrderStatus, OrderStatus[]>>;
  bookSortOptions: Array<{ value: string; label: string }>;
}
