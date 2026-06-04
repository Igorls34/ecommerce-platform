export function HollowOverlayBox({ label, className = '' }) {
  const lines = String(label || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className={`hollow-overlay-box ${className}`.trim()}>
      <span className="hollow-overlay-label">
        {lines.map((line, index) => (
          <span key={`${line}-${index}`}>{line}</span>
        ))}
      </span>
    </div>
  );
}
