const { PrismaClient } = require('C:/Users/igorl/Desktop/ecommerce-platform/backend/node_modules/@prisma/client');
const p = new PrismaClient();

const images = {
  'Eletrônicos': [
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400&h=400&fit=crop',
  ],
  'Moda': [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1544022613-ab87f5d1e3a4?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
  ],
  'Casa': [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1602928298849-325cec8771c0?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1594026112284-40bb6f335ff9?w=400&h=400&fit=crop',
  ],
  'Fitness': [
    'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=400&h=400&fit=crop',
  ],
};

(async () => {
  const products = await p.product.findMany({ include: { category: true } });
  let i = 0;

  const byCategory = {};
  for (const prod of products) {
    const catName = prod.category?.name || 'Casa';
    if (!byCategory[catName]) byCategory[catName] = [];
    byCategory[catName].push(prod);
  }

  for (const [cat, prods] of Object.entries(byCategory)) {
    const imgs = images[cat] || images['Casa'];
    prods.forEach((prod, idx) => {
      const url = imgs[idx % imgs.length];
      p.product.update({ where: { id: prod.id }, data: { imageUrl: url } }).then(() => {
        i++;
        if (i === products.length) { console.log(i + ' produtos com imagens!'); p.$disconnect(); }
      });
    });
  }
})();
