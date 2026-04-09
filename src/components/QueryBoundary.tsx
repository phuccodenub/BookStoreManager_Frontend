import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { type PropsWithChildren } from 'react';

import { ApiError } from '@/lib/api-client';

function getDisplayMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.code === 'NETWORK_ERROR' || error.status === 0 || error.status === 503) {
      return 'Ứng dụng chưa thể kết nối tới máy chủ lúc này. Vui lòng kiểm tra dịch vụ và thử lại.';
    }

    if (error.status >= 500) {
      return 'Hệ thống đang gặp sự cố tạm thời. Vui lòng thử lại sau ít phút.';
    }

    return error.message;
  }

  return 'Nội dung này đang gặp sự cố. Vui lòng thử lại.';
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = getDisplayMessage(error);

  return (
    <section className="feedback-card feedback-card-rich">
      <p className="eyebrow">Yêu cầu bị gián đoạn</p>
      <h2>Nội dung này đang gặp sự cố.</h2>
      <p>{message}</p>
      <button className="button button-primary" onClick={resetErrorBoundary} type="button">
        Thử lại
      </button>
    </section>
  );
}

function QueryBoundary({ children }: PropsWithChildren) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary FallbackComponent={ErrorFallback} onReset={reset}>
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

export default QueryBoundary;
