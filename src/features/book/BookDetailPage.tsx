import clsx from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

import BookCard from '@/components/BookCard';
import SectionHeading from '@/components/SectionHeading';
import { getMyOrders } from '@/features/account/account-api';
import { useAuth } from '@/features/auth/AuthContext';
import {
  createBookReview,
  deleteBookReview,
  getBook,
  getBookReviews,
  getRelatedBooks,
  updateBookReview,
} from '@/features/book/book-api';
import { addCartItem } from '@/features/cart/cart-api';
import { ApiError } from '@/lib/api-client';
import { useWishlist } from '@/features/wishlist/useWishlist';
import { formatCurrency, formatDate } from '@/lib/format';
import type { BookSummary, Review } from '@/lib/types';

const RECENTLY_VIEWED_STORAGE_KEY = 'bookstoremanager.recently-viewed';

type DetailTab = 'description' | 'reviews';

function BookDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { bookId = '' } = useParams();
  const { isAuthenticated, session } = useAuth();
  const { wishlistIds, pendingBookId, toggleWishlist } = useWishlist();
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [detailTab, setDetailTab] = useState<DetailTab>('description');
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [recentlyViewed, setRecentlyViewed] = useState<BookSummary[]>([]);
  const [reviewDraft, setReviewDraft] = useState({ orderId: '', rating: 5, comment: '' });
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState({ rating: 5, comment: '' });
  const [reviewFeedback, setReviewFeedback] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [purchaseFeedback, setPurchaseFeedback] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const { data: book } = useSuspenseQuery({ queryKey: ['book', bookId], queryFn: () => getBook(bookId) });
  const { data: relatedBooks } = useSuspenseQuery({ queryKey: ['book', bookId, 'related'], queryFn: () => getRelatedBooks(bookId) });
  const { data: reviews } = useSuspenseQuery({ queryKey: ['book', bookId, 'reviews'], queryFn: () => getBookReviews(bookId) });
  const myOrdersQuery = useQuery({
    queryKey: ['orders', 'mine', 'review-eligibility', bookId],
    queryFn: () => getMyOrders(50),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    setQuantity(1);
    setActiveImageIndex(0);
    setDetailTab('description');
    setShareMessage(null);
    setReviewDraft({ orderId: '', rating: 5, comment: '' });
    setReviewFeedback(null);
    setReviewError(null);
    setEditingReviewId(null);
    setEditingDraft({ rating: 5, comment: '' });
    setPurchaseFeedback(null);
    setPurchaseError(null);
  }, [book.id]);

  useEffect(() => {
    const summary: BookSummary = {
      id: book.id,
      title: book.title,
      slug: book.slug,
      coverImage: book.coverImage,
      price: book.price,
      stockQuantity: book.stockQuantity,
      soldQuantity: book.soldQuantity,
      status: book.status,
      isFeatured: book.isFeatured,
      isNew: book.isNew,
      isBestSeller: book.isBestSeller,
      author: book.author,
      category: book.category,
      publisher: book.publisher,
    };

    try {
      const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as BookSummary[]) : [];
      const nextItems = [summary, ...parsed.filter((item) => item.id !== summary.id)].slice(0, 6);
      window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(nextItems));
      setRecentlyViewed(nextItems.filter((item) => item.id !== summary.id));
    } catch {
      setRecentlyViewed([]);
    }
  }, [book]);

  const galleryImages = useMemo(() => {
    const candidates = [book.coverImage, ...(book.images ?? []).map((image) => image.imageUrl)].filter(Boolean) as string[];
    return Array.from(new Set(candidates));
  }, [book.coverImage, book.images]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return '0.0';
    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  const myReviews = useMemo(() => {
    if (!session?.user.id) return [];
    return reviews.filter((review) => review.user.id === session.user.id);
  }, [reviews, session?.user.id]);

  const eligibleOrders = useMemo(() => {
    return (myOrdersQuery.data ?? []).filter((order) =>
      order.orderStatus === 'completed' && order.items.some((item) => item.bookId === book.id),
    );
  }, [book.id, myOrdersQuery.data]);

  const reviewableOrders = useMemo(() => {
    const reviewedOrderIds = new Set(myReviews.map((review) => review.orderId).filter(Boolean));
    return eligibleOrders.filter((order) => !reviewedOrderIds.has(order.id));
  }, [eligibleOrders, myReviews]);

  const orderCodeById = useMemo(() => {
    return new Map((myOrdersQuery.data ?? []).map((order) => [order.id, order.orderCode]));
  }, [myOrdersQuery.data]);

  useEffect(() => {
    setReviewDraft((current) => ({
      orderId: reviewableOrders.some((order) => order.id === current.orderId) ? current.orderId : (reviewableOrders[0]?.id ?? ''),
      rating: current.rating,
      comment: current.comment,
    }));
  }, [reviewableOrders]);

  const infoRows = [
    { label: 'Tác giả', value: book.author?.name ?? 'Đang cập nhật' },
    { label: 'Nhà xuất bản', value: book.publisher?.name ?? 'Đang cập nhật' },
    { label: 'ISBN', value: book.isbn ?? 'Đang cập nhật' },
    { label: 'Năm xuất bản', value: book.publicationYear?.toString() ?? 'Đang cập nhật' },
    { label: 'Số trang', value: book.pageCount?.toString() ?? 'Đang cập nhật' },
    { label: 'Tồn kho', value: `${book.stockQuantity ?? 0} cuốn` },
  ];

  const cartMutation = useMutation({
    mutationFn: async (mode: 'cart' | 'buy') => {
      await addCartItem({ bookId: book.id, quantity });
      return mode;
    },
    onSuccess: async (mode) => {
      setPurchaseError(null);
      setPurchaseFeedback(mode === 'cart' ? 'Sách đã được thêm vào giỏ hàng.' : null);
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (mode === 'buy') {
        navigate('/cart');
      }
    },
    onError: (error) => {
      setPurchaseFeedback(null);
      setPurchaseError(error instanceof ApiError ? error.message : 'Không thể thêm sách vào giỏ hàng lúc này');
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: () =>
      createBookReview(book.id, {
        orderId: reviewDraft.orderId,
        rating: reviewDraft.rating,
        comment: reviewDraft.comment.trim() ? reviewDraft.comment.trim() : undefined,
      }),
    onSuccess: async () => {
      setReviewError(null);
      setReviewFeedback('Đánh giá của bạn đã được ghi nhận.');
      setReviewDraft((current) => ({
        orderId: reviewableOrders.find((order) => order.id !== current.orderId)?.id ?? '',
        rating: 5,
        comment: '',
      }));
      await queryClient.invalidateQueries({ queryKey: ['book', bookId, 'reviews'] });
    },
    onError: (error) => {
      setReviewFeedback(null);
      setReviewError(error instanceof ApiError ? error.message : 'Không thể tạo đánh giá mới');
    },
  });

  const updateReviewMutation = useMutation({
    mutationFn: ({ reviewId, rating, comment }: { reviewId: string; rating: number; comment: string }) =>
      updateBookReview(reviewId, {
        rating,
        comment: comment.trim(),
      }),
    onSuccess: async () => {
      setReviewError(null);
      setReviewFeedback('Đánh giá của bạn đã được cập nhật.');
      setEditingReviewId(null);
      await queryClient.invalidateQueries({ queryKey: ['book', bookId, 'reviews'] });
    },
    onError: (error) => {
      setReviewFeedback(null);
      setReviewError(error instanceof ApiError ? error.message : 'Không thể cập nhật đánh giá');
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: (reviewId: string) => deleteBookReview(reviewId),
    onSuccess: async () => {
      setReviewError(null);
      setReviewFeedback('Đánh giá đã được xóa.');
      setEditingReviewId(null);
      await queryClient.invalidateQueries({ queryKey: ['book', bookId, 'reviews'] });
    },
    onError: (error) => {
      setReviewFeedback(null);
      setReviewError(error instanceof ApiError ? error.message : 'Không thể xóa đánh giá');
    },
  });

  const isWishlisted = wishlistIds.has(book.id);
  const activeImage = galleryImages[activeImageIndex] ?? book.coverImage;
  const maxQuantity = Math.max(1, book.stockQuantity ?? 1);
  const isOutOfStock = (book.stockQuantity ?? 0) <= 0;

  async function handleShare() {
    setShareMessage(null);
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({ title: book.title, url });
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareMessage('Đã sao chép liên kết sản phẩm.');
        return;
      }
    } catch {
      setShareMessage('Không thể chia sẻ liên kết trong lúc này.');
      return;
    }

    setShareMessage('Trình duyệt này chưa hỗ trợ chia sẻ tự động.');
  }

  function beginEditReview(review: Review) {
    setReviewFeedback(null);
    setReviewError(null);
    setEditingReviewId(review.id);
    setEditingDraft({
      rating: review.rating,
      comment: review.comment ?? '',
    });
  }

  return (
    <div className="page-stack detail-page-shell ui-detail">
      <nav className="detail-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <Link to="/catalog">{book.category?.name ?? 'Danh mục sách'}</Link>
        <span>/</span>
        <strong>{book.title}</strong>
      </nav>

      <section className="detail-layout ui-detail-layout">
        <div className="detail-gallery-panel">
          <div className="detail-gallery-stage">
            {activeImage ? <img alt={book.title} src={activeImage} /> : <span>{book.title.slice(0, 1)}</span>}
          </div>

          {galleryImages.length > 1 ? (
            <div className="detail-thumbnails" role="tablist" aria-label="Thư viện ảnh sách">
              {galleryImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  className={clsx('detail-thumbnail', activeImageIndex === index && 'detail-thumbnail-active')}
                  onClick={() => setActiveImageIndex(index)}
                  type="button"
                >
                  <img alt={`${book.title} preview ${index + 1}`} src={image} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="detail-summary-panel">
          <p className="eyebrow">{book.category?.name ?? 'Sách được chọn lọc'}</p>
          <h1>{book.title}</h1>
          <div className="detail-rating-row">
            <span className="detail-rating-pill">{averageRating} / 5</span>
            <span>{reviews.length} đánh giá</span>
            <span>Đã bán {book.soldQuantity ?? 0}</span>
          </div>

          <div className="detail-price-block">
            <strong>{formatCurrency(book.price)}</strong>
            <p>
              {book.stockQuantity && book.stockQuantity > 0
                ? `${book.stockQuantity} cuốn đang sẵn có để giao nhanh.`
                : 'Tựa sách này đang tạm hết hàng. Bạn có thể lưu lại để quay lại sau.'}
            </p>
          </div>

          <div className="detail-spec-grid">
            {infoRows.map((item) => (
              <article key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>

          <p className="detail-description-copy">
            {book.description ?? 'Mô tả chi tiết đang được cập nhật. Bạn vẫn có thể tham khảo nhanh các thông tin xuất bản và tình trạng sách ở phần bên dưới.'}
          </p>

          <div className="detail-purchase-row">
            <div className="quantity-selector" aria-label="Số lượng sách">
              <span>Số lượng</span>
              <div className="quantity-selector-controls">
                <button disabled={quantity <= 1} onClick={() => setQuantity((current) => Math.max(1, current - 1))} type="button">
                  -
                </button>
                <strong>{quantity}</strong>
                <button disabled={isOutOfStock || quantity >= maxQuantity} onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))} type="button">
                  +
                </button>
              </div>
            </div>

            <div className="detail-cta-group">
              {isAuthenticated ? (
                <>
                  <button className="button button-secondary" disabled={isOutOfStock || cartMutation.isPending} onClick={() => cartMutation.mutate('cart')} type="button">
                    {cartMutation.isPending && cartMutation.variables === 'cart' ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
                  </button>
                  <button className="button button-primary" disabled={isOutOfStock || cartMutation.isPending} onClick={() => cartMutation.mutate('buy')} type="button">
                    {cartMutation.isPending && cartMutation.variables === 'buy' ? 'Đang chuyển hướng...' : 'Mua ngay'}
                  </button>
                </>
              ) : (
                <Link className="button button-primary" to="/login">
                  Đăng nhập để mua
                </Link>
              )}
            </div>
          </div>

          <div className="detail-secondary-actions">
            {isAuthenticated ? (
              <button className="detail-meta-button" disabled={pendingBookId === book.id} onClick={() => void toggleWishlist(book.id)} type="button">
                {pendingBookId === book.id ? 'Đang cập nhật' : isWishlisted ? 'Đã lưu vào danh sách yêu thích' : 'Lưu vào danh sách yêu thích'}
              </button>
            ) : null}
            <button className="detail-meta-button" onClick={() => void handleShare()} type="button">
              Chia sẻ sản phẩm
            </button>
            <Link className="detail-meta-button" to="/catalog">
              Quay lại danh mục
            </Link>
          </div>

          {shareMessage ? <p className="feedback-text feedback-text-success">{shareMessage}</p> : null}
          {purchaseError ? <p className="feedback-text feedback-text-error">{purchaseError}</p> : null}
          {purchaseFeedback ? <p className="feedback-text feedback-text-success">{purchaseFeedback}</p> : null}
        </div>
      </section>

      <section className="detail-panel-layout ui-detail-panels">
        <article className="surface-card surface-card-highlight detail-main-panel">
          <div className="detail-tabbar">
            <button className={clsx('detail-tab', detailTab === 'description' && 'detail-tab-active')} onClick={() => setDetailTab('description')} type="button">
              Mô tả và thông tin
            </button>
            <button className={clsx('detail-tab', detailTab === 'reviews' && 'detail-tab-active')} onClick={() => setDetailTab('reviews')} type="button">
              Đánh giá
            </button>
          </div>

          {detailTab === 'description' ? (
            <div className="detail-copy-layout">
              <div className="detail-copy-panel">
                <SectionHeading eyebrow="Mô tả" title="Nội dung và cảm hứng của tựa sách" />
                <p>{book.description ?? 'Nội dung giới thiệu đang được cập nhật. Bạn có thể xem nhanh thông tin xuất bản để cân nhắc trước khi mua.'}</p>
              </div>

              <div className="detail-copy-panel">
                <SectionHeading eyebrow="Thông tin xuất bản" title="Thông số giúp bạn quyết định nhanh hơn" />
                <div className="detail-inline-facts">
                  {infoRows.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="review-stack">
              {isAuthenticated ? (
                <article className="feedback-card feedback-card-plain review-owner-panel">
                  <SectionHeading
                    eyebrow="Đánh giá của bạn"
                    title="Viết hoặc cập nhật cảm nhận ngay trên trang sách"
                    description="Bạn có thể gửi đánh giá khi đã mua và hoàn tất đơn hàng có chứa tựa sách này."
                  />

                  {myOrdersQuery.isPending ? <p>Đang kiểm tra các đơn hàng hợp lệ để đánh giá...</p> : null}
                  {myOrdersQuery.error ? (
                    <p className="feedback-text feedback-text-error">
                      {myOrdersQuery.error instanceof Error ? myOrdersQuery.error.message : 'Không thể kiểm tra quyền đánh giá'}
                    </p>
                  ) : null}
                  {reviewError ? <p className="feedback-text feedback-text-error">{reviewError}</p> : null}
                  {reviewFeedback ? <p className="feedback-text feedback-text-success">{reviewFeedback}</p> : null}

                  {!myOrdersQuery.isPending && !myOrdersQuery.error ? (
                    reviewableOrders.length > 0 ? (
                      <div className="form-grid">
                        <label className="field">
                          <span>Đơn hàng được phép đánh giá</span>
                          <select
                            value={reviewDraft.orderId}
                            onChange={(event) => setReviewDraft({ ...reviewDraft, orderId: event.target.value })}
                          >
                            {reviewableOrders.map((order) => (
                              <option key={order.id} value={order.id}>
                                {order.orderCode} • {formatDate(order.createdAt)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="field">
                          <span>Số sao</span>
                          <div className="rating-selector" role="radiogroup" aria-label="Chọn số sao đánh giá">
                            {[1, 2, 3, 4, 5].map((rating) => (
                              <button
                                key={rating}
                                aria-checked={reviewDraft.rating === rating}
                                className={clsx('rating-button', reviewDraft.rating === rating && 'rating-button-active')}
                                onClick={() => setReviewDraft({ ...reviewDraft, rating })}
                                role="radio"
                                type="button"
                              >
                                {rating}★
                              </button>
                            ))}
                          </div>
                        </div>

                        <label className="field field-wide">
                          <span>Cảm nhận của bạn</span>
                          <textarea
                            placeholder="Chia sẻ ngắn gọn điều bạn thích, điểm cần cải thiện hoặc lý do bạn muốn giới thiệu tựa sách này."
                            rows={4}
                            value={reviewDraft.comment}
                            onChange={(event) => setReviewDraft({ ...reviewDraft, comment: event.target.value })}
                          />
                        </label>

                        <button
                          className="button button-primary"
                          data-action="create-review"
                          disabled={!reviewDraft.orderId || createReviewMutation.isPending}
                          onClick={() => createReviewMutation.mutate()}
                          type="button"
                        >
                          {createReviewMutation.isPending ? 'Đang gửi đánh giá...' : 'Gửi đánh giá'}
                        </button>
                      </div>
                    ) : eligibleOrders.length > 0 ? (
                      <p>Bạn đã đánh giá hết các đơn hợp lệ cho tựa sách này. Nếu muốn, bạn có thể chỉnh sửa đánh giá của mình ở ngay bên dưới.</p>
                    ) : (
                      <p>Bạn cần có một đơn đã hoàn thành chứa tựa sách này thì mới mở được form đánh giá.</p>
                    )
                  ) : null}
                </article>
              ) : (
                <article className="feedback-card feedback-card-plain review-owner-panel">
                  <h3>Đăng nhập để viết đánh giá</h3>
                  <p>Sau khi đăng nhập và có đơn hàng hoàn tất chứa tựa sách này, bạn có thể gửi đánh giá ngay tại đây.</p>
                </article>
              )}

              {reviews.length === 0 ? (
                <article className="feedback-card feedback-card-plain">
                  <h3>Chưa có đánh giá</h3>
                  <p>Chưa có người đọc nào để lại cảm nhận cho tựa sách này. Hãy quay lại sau hoặc trở thành người đánh giá đầu tiên.</p>
                </article>
              ) : (
                reviews.map((review) => (
                  <article key={review.id} className={clsx('review-card', 'review-card-light', session?.user.id === review.user.id && 'review-card-owned')}>
                    <div className="review-card-header">
                      <div>
                        <strong>{review.user.fullName}</strong>
                        <p>
                          {formatDate(review.createdAt)}
                          {review.orderId ? ` • ${orderCodeById.get(review.orderId) ?? 'Đơn đã mua'}` : ''}
                        </p>
                      </div>
                      <span>{'★'.repeat(review.rating)}</span>
                    </div>
                    {editingReviewId === review.id ? (
                      <div className="review-edit-stack">
                        <div className="rating-selector" role="radiogroup" aria-label={`Cập nhật số sao cho đánh giá ${review.id}`}>
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <button
                              key={rating}
                              aria-checked={editingDraft.rating === rating}
                              className={clsx('rating-button', editingDraft.rating === rating && 'rating-button-active')}
                              onClick={() => setEditingDraft({ ...editingDraft, rating })}
                              role="radio"
                              type="button"
                            >
                              {rating}★
                            </button>
                          ))}
                        </div>
                        <label className="field">
                          <span>Cập nhật nhận xét</span>
                          <textarea
                            rows={4}
                            value={editingDraft.comment}
                            onChange={(event) => setEditingDraft({ ...editingDraft, comment: event.target.value })}
                          />
                        </label>
                        <div className="review-card-actions">
                          <button
                            className="button button-primary"
                            data-action="save-review"
                            disabled={updateReviewMutation.isPending}
                            onClick={() => updateReviewMutation.mutate({
                              reviewId: review.id,
                              rating: editingDraft.rating,
                              comment: editingDraft.comment,
                            })}
                            type="button"
                          >
                            {updateReviewMutation.isPending ? 'Đang lưu...' : 'Lưu đánh giá'}
                          </button>
                          <button
                            className="button button-secondary"
                            data-action="delete-review"
                            disabled={deleteReviewMutation.isPending}
                            onClick={() => {
                              if (window.confirm('Bạn chắc chắn muốn xóa đánh giá này?')) {
                                deleteReviewMutation.mutate(review.id);
                              }
                            }}
                            type="button"
                          >
                            {deleteReviewMutation.isPending ? 'Đang xóa...' : 'Xóa đánh giá'}
                          </button>
                          <button className="text-link" onClick={() => setEditingReviewId(null)} type="button">
                            Hủy chỉnh sửa
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p>{review.comment ?? 'Người mua chưa để lại nhận xét bằng chữ.'}</p>
                        {session?.user.id === review.user.id ? (
                          <div className="review-card-actions">
                            <button className="text-link" data-action="edit-review" onClick={() => beginEditReview(review)} type="button">
                              Chỉnh sửa đánh giá
                            </button>
                            <button
                              className="text-link"
                              disabled={deleteReviewMutation.isPending}
                              onClick={() => {
                                if (window.confirm('Bạn chắc chắn muốn xóa đánh giá này?')) {
                                  deleteReviewMutation.mutate(review.id);
                                }
                              }}
                              type="button"
                            >
                              {deleteReviewMutation.isPending ? 'Đang xóa...' : 'Xóa đánh giá'}
                            </button>
                          </div>
                        ) : null}
                      </>
                    )}
                  </article>
                ))
              )}
            </div>
          )}
        </article>

        <aside className="detail-sidebar-panel">
          <SectionHeading eyebrow="Sách cùng tác giả" title="Lựa chọn để đọc tiếp" />
          <div className="mini-book-list">
            {relatedBooks.slice(0, 4).map((item) => (
              <Link key={item.id} className="mini-book-card" to={`/books/${item.id}`}>
                <div className="mini-book-card-cover">
                  {item.coverImage ? <img alt={item.title} src={item.coverImage} /> : <span>{item.title.slice(0, 1)}</span>}
                </div>
                <div>
                  <strong>{item.title}</strong>
                  <p>{formatCurrency(item.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="page-stack">
        <div className="ui-section-head">
          <SectionHeading eyebrow="Sách cùng thể loại" title="Tiếp tục khám phá những tựa sách liên quan" />
        </div>
        <div className="book-grid ui-book-grid">
          {relatedBooks.map((item) => (
            <BookCard
              key={item.id}
              accent="ink"
              actions={isAuthenticated ? (
                <button
                  className="text-link"
                  disabled={pendingBookId === item.id}
                  onClick={() => void toggleWishlist(item.id)}
                  type="button"
                >
                  {pendingBookId === item.id ? 'Đang cập nhật' : wishlistIds.has(item.id) ? 'Đã lưu' : 'Yêu thích'}
                </button>
              ) : undefined}
              book={item}
            />
          ))}
        </div>
      </section>

      {recentlyViewed.length > 0 ? (
        <section className="page-stack">
          <div className="ui-section-head">
            <SectionHeading eyebrow="Sản phẩm đã xem" title="Quay lại các tựa sách bạn vừa duyệt" />
          </div>
          <div className="book-grid ui-book-grid">
            {recentlyViewed.map((item) => (
              <BookCard key={item.id} book={item} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default BookDetailPage;
