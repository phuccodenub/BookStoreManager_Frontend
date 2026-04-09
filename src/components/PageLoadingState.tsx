interface PageLoadingStateProps {
  title?: string;
  description?: string;
}

function PageLoadingState({
  title = 'Đang tải nội dung',
  description = 'Vui lòng chờ trong giây lát, cửa hàng đang chuẩn bị dữ liệu cho bạn.',
}: PageLoadingStateProps) {
  return (
    <section className="page-loading page-loading-shell" aria-live="polite">
      <span className="page-loading-mark" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </section>
  );
}

export default PageLoadingState;
