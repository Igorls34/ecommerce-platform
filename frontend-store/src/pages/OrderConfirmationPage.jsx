import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { getStoreOrderPayment } from '../services/api';
import { useStoreAuth } from '../state/StoreAuthContext';
import { formatCurrency } from '../lib/formatters';

function createPixQrCode(code) {
  // Simple QR via external API (libre, no tracking)
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(code)}`;
}

export function OrderConfirmationPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const { token } = useStoreAuth();
  const [order, setOrder] = useState(location.state?.order || null);
  const [payment, setPayment] = useState(() => {
    const cached = window.sessionStorage.getItem(`payment:${orderId}`);
    return location.state?.payment || (cached ? JSON.parse(cached) : null);
  });

  const pixCode = payment?.pixCopyPaste || payment?.qrCode || '';
  const qrImage = pixCode ? createPixQrCode(pixCode) : '';
  const isPaid = order?.status === 'PAID' || payment?.status === 'paid';

  useEffect(() => {
    if (!orderId || !token) return;
    const interval = setInterval(async () => {
      try {
        const data = await getStoreOrderPayment(token, orderId);
        setOrder(data.order);
        setPayment(prev => ({ ...prev, ...data.payment, ...data }));
        if (['PAID'].includes(data.paymentStatus)) clearInterval(interval);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [orderId, token]);

  if (!order && !payment) {
    return <div className="container py-5 text-center"><h3>Carregando...</h3></div>;
  }

  return (
    <div className="container py-4" style={{ maxWidth: 600 }}>
      <h2 className="mb-1">Pedido #{order?.id || orderId}</h2>
      <p className="text-muted mb-4">Total: {formatCurrency(order?.total || 0)}</p>

      {isPaid ? (
        <div className="card border-success">
          <div className="card-body text-center">
            <h3 className="text-success mb-2">Pagamento Confirmado!</h3>
            <p>Seu pedido está sendo preparado.</p>
            <Link className="btn btn-primary" to="/produtos">Continuar Comprando</Link>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body text-center">
            <h5 className="mb-3">Pagamento via PIX</h5>
            <p className="text-muted small">Escaneie o QR Code ou use o código copia e cola</p>
            {qrImage && <img src={qrImage} alt="QR Code PIX" className="pix-qr mb-3 mx-auto d-block" />}
            {pixCode && (
              <>
                <div className="pix-code mb-3">{pixCode}</div>
                <button className="btn btn-outline-primary btn-sm mb-3"
                  onClick={() => { navigator.clipboard.writeText(pixCode); alert('Código PIX copiado!'); }}>
                  Copiar código PIX
                </button>
              </>
            )}
            <p className="text-muted small">Aguardando confirmação do pagamento...</p>
          </div>
        </div>
      )}
    </div>
  );
}
