import type { PropsWithChildren } from 'react';

interface EmptyStateProps extends PropsWithChildren {
  title: string;
  description: string;
}

function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <section className="empty-state">
      <p className="eyebrow">No data yet</p>
      <h2>{title}</h2>
      <p>{description}</p>
      {children}
    </section>
  );
}

export default EmptyState;
