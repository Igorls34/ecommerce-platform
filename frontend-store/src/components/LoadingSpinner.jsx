import { useEffect, useRef } from 'react';

const VARIANTS = {
  spinner: {
    html: '<div class="spinner__ring"></div>',
  },
  'dual-ring': {
    html: '<div class="spinner__dual"></div>',
  },
  dots: {
    html: '<div class="spinner__dots"><div></div><div></div><div></div></div>',
  },
  'dots-scale': {
    html: '<div class="spinner__dots-scale"><div></div><div></div><div></div></div>',
  },
  bar: {
    html: '<div class="spinner__bar"></div>',
  },
};

export function LoadingSpinner({ variant = 'spinner', text, fullscreen = false, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = VARIANTS[variant]?.html || VARIANTS.spinner.html;
    }
  }, [variant]);

  const content = (
    <div
      ref={ref}
      className={`spinner ${fullscreen ? 'spinner--fs' : ''} ${className}`}
      role="status"
      aria-label={text || 'Carregando'}
    >
      {text ? <span className="spinner__text">{text}</span> : null}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="spinner__overlay">
        {content}
      </div>
    );
  }

  return content;
}
