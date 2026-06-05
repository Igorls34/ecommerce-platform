import { useState, useEffect, useRef } from 'react';

export function DemoBanner() {
  const [show, setShow] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const timer = useRef();

  useEffect(() => {
    if (sessionStorage.getItem('demo-dismissed')) return;
    setTimeout(() => setShow(true), 600);

    let i = 5;
    timer.current = setInterval(() => {
      i--;
      setCountdown(i);
      if (i <= 0) { setCanClose(true); clearInterval(timer.current); }
    }, 1000);

    return () => clearInterval(timer.current);
  }, []);

  function handleDismiss() {
    sessionStorage.setItem('demo-dismissed', '1');
    setShow(false);
  }

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: 20
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '32px 28px', maxWidth: 420, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>📦</div>
        <h3 style={{ fontWeight: 700, fontSize: '1.2rem', color: '#111', marginBottom: 8 }}>
          Modelo Demonstrativo
        </h3>
        <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 20 }}>
          Esta loja é um modelo white-label para demonstração da plataforma de e-commerce.
          Os produtos, preços e dados são ilustrativos.
        </p>
        <button
          onClick={canClose ? handleDismiss : undefined}
          disabled={!canClose}
          style={{
            width: '100%', padding: '12px', border: 'none', borderRadius: 12,
            fontWeight: 600, fontSize: '0.95rem', cursor: canClose ? 'pointer' : 'not-allowed',
            background: canClose ? '#111' : '#e5e5e5', color: canClose ? '#fff' : '#999',
            transition: 'all .3s'
          }}>
          {canClose ? 'Entendi' : `Aguarde ${countdown}s...`}
        </button>
      </div>
    </div>
  );
}
