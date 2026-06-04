const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost', port: 3333, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3333' + path, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

(async () => {
  console.log('===== HEALTH =====');
  const h = await get('/health');
  console.log(h.status, h.body);

  console.log('===== PRODUCTS =====');
  const p = await get('/store/products?limit=3');
  console.log(p.status + ' (' + JSON.parse(p.body).length + ' produtos)');
  JSON.parse(p.body).forEach(p => console.log('  #' + p.id, p.name, 'R$' + p.price, '(' + p.stock + ')'));

  console.log('===== REGISTER =====');
  const r = await post('/store/auth/register', { name: 'Maria', email: 'maria@test.com', password: 'Teste123!', phone: '11988887777' });
  console.log(r.status, r.body.substring(0, 80));

  console.log('===== LOGIN =====');
  const l = await post('/store/auth/login', { email: 'maria@test.com', password: 'Teste123!' });
  const token = JSON.parse(l.body).token;
  console.log(l.status, 'Token:', token ? token.substring(0, 40) + '...' : 'FALHOU');

  console.log('===== ORDER =====');
  const o = await post('/store/orders', {
    items: [{ productId: 1, quantity: 2 }],
    name: 'Maria', email: 'maria@test.com', phone: '11988887777', cpf: '12345678909',
    zipCode: '01001000', street: 'Rua A', number: '100', neighborhood: 'Centro', city: 'Sao Paulo', state: 'SP',
    paymentMethod: 'pix', checkoutAttemptId: 't' + Date.now(),
    giftWrap: false, notifyWhatsApp: false, preferredContact: 'email'
  });
  if (token) {
    const req = http.request({
      hostname: 'localhost', port: 3333, path: '/store/orders', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        const r = JSON.parse(body);
        console.log(res.statusCode, 'Pedido #' + r.order?.id, 'Total: R$' + r.order?.total);
        console.log('PIX:', r.payment?.pixCopyPaste?.substring(0, 50) + '...');
      });
    });
    req.write(JSON.stringify({
      items: [{ productId: 1, quantity: 2 }],
      name: 'Maria', email: 'maria@test.com', phone: '11988887777', cpf: '12345678909',
      zipCode: '01001000', street: 'Rua A', number: '100', neighborhood: 'Centro', city: 'Sao Paulo', state: 'SP',
      paymentMethod: 'pix', checkoutAttemptId: 't' + Date.now(),
      giftWrap: false, notifyWhatsApp: false, preferredContact: 'email'
    }));
    req.end();
  }
})();
