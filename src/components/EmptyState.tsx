import type { PropsWithChildren } from 'react';

interface EmptyStateProps extends PropsWithChildren {
  title: string;
  description: string;
  eyebrow?: string;
}

function EmptyState({ title, description, eyebrow = 'Không có dữ liệu', children }: EmptyStateProps) {
  return (
    <section className="empty-state empty-state-rich">
      <span className="empty-state-mark" aria-hidden="true" />
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {children ? <div className="empty-state-actions">{children}</div> : null}
    </section>
  );
}

export default EmptyState;
