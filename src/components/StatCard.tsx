import type { ReactNode } from 'react';

type StatCardTone = 'gold' | 'ink';
type StatCardVariant = 'default' | 'overview';
type StatCardAccent = 'blue' | 'emerald' | 'amber' | 'rose';

interface StatCardProps {
  label: string;
  value: string | number;
  tone?: StatCardTone;
  variant?: StatCardVariant;
  accent?: StatCardAccent;
  icon?: ReactNode;
  helper?: string;
}

function StatCard({
  label,
  value,
  tone = 'gold',
  variant = 'default',
  accent = 'blue',
  icon,
  helper,
}: StatCardProps) {
  if (variant === 'overview') {
    return (
      <article className={`stat-card stat-card-overview stat-card-accent-${accent}`}>
        <div className="stat-card-overview-head">
          <div>
            <p>{label}</p>
            <strong>{value}</strong>
          </div>
          {icon ? <div className="stat-card-icon">{icon}</div> : null}
        </div>
        {helper ? <span className="stat-card-helper">{helper}</span> : null}
      </article>
    );
  }

  return (
    <article className={`stat-card stat-card-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

export default StatCard;
