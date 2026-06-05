export function Skeleton({ width, height, style }) {
  return (
    <div style={{
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
      borderRadius: 10,
      width: width || '100%',
      height: height || 16,
      ...style
    }} />
  );
}

export function ProductCardSkeleton() {
  return (
    <div style={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
      <Skeleton height={230} style={{ borderRadius: 0 }} />
      <div style={{ padding: 16, display: 'grid', gap: 10 }}>
        <Skeleton height={14} width="70%" />
        <Skeleton height={18} width="45%" />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <Skeleton height={20} width={80} />
          <Skeleton height={20} width={60} style={{ borderRadius: 6 }} />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div style={{ display: 'grid', gap: 1 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16, padding: '14px 16px', borderBottom: '1px solid #f5f5f5' }}>
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} height={14} width={`${60 + Math.random() * 30}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}
