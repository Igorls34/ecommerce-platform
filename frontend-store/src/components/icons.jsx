export function CartIcon({ className = 'icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 5h2.1l2 10.2a2 2 0 0 0 2 1.6h6.8a2 2 0 0 0 1.9-1.4L21 8H7" />
      <circle cx="10" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </svg>
  );
}
