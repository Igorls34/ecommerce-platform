const http = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    if (data) headers['Content-Length'] = data.length;
    
    const req = http.request({ hostname: 'localhost', port: 3333, path, method, headers }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const login = await request('POST', '/store/auth/login', { email: 'maria@test.com', password: 'Teste123!' });
  const token = JSON.parse(login.body).token;
  console.log('Login:', login.status, token ? 'OK' : 'FAIL');

  const order = await request('POST', '/store/orders', {
    items: [{ productId: 14, quantity: 2 }],
    name: 'Maria Silva', email: 'maria@test.com', phone: '11988887777', cpf: '12345678909',
    zipCode: '01001000', street: 'Rua A', number: '100', neighborhood: 'Centro', city: 'Sao Paulo', state: 'SP',
    paymentMethod: 'pix', checkoutAttemptId: 'test-' + Date.now(),
    giftWrap: false, notifyWhatsApp: false, preferredContact: 'email'
  }, token);
  
  try {
    const data = JSON.parse(order.body);
    console.log('Order:', order.status, 'Pedido #' + (data.order?.id || '?'), 'Total:', data.order?.total);
    if (data.payment?.pixCopyPaste) console.log('PIX:', data.payment.pixCopyPaste.substring(0, 60) + '...');
    if (data.error) console.log('Erro:', data.error);
  } catch {
    console.log('Order raw:', order.body.substring(0, 200));
  }
})();
