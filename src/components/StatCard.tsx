interface StatCardProps {
  label: string;
  value: string | number;
  tone?: 'gold' | 'ink';
}

function StatCard({ label, value, tone = 'gold' }: StatCardProps) {
  return (
    <article className={`stat-card stat-card-${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

export default StatCard;
