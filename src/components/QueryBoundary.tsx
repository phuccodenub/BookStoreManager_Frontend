import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { type PropsWithChildren } from 'react';

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : 'Unknown rendering failure';

  return (
    <section className="feedback-card">
      <p className="eyebrow">Request failed</p>
      <h2>Something interrupted this section.</h2>
      <p>{message}</p>
      <button className="button button-primary" onClick={resetErrorBoundary} type="button">
        Try again
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

