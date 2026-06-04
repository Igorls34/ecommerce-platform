const { PrismaClient } = require('C:/Users/igorl/Desktop/ecommerce-platform/backend/node_modules/@prisma/client');
const p = new PrismaClient();

(async () => {
  const cats = await Promise.all([
    p.category.upsert({ where: { id: 1 }, update: {}, create: { id: 1, name: 'Aneis', visible: true } }),
    p.category.upsert({ where: { id: 2 }, update: {}, create: { id: 2, name: 'Brincos', visible: true } }),
    p.category.upsert({ where: { id: 3 }, update: {}, create: { id: 3, name: 'Colares', visible: true } }),
    p.category.upsert({ where: { id: 4 }, update: {}, create: { id: 4, name: 'Pulseiras', visible: true } }),
    p.category.upsert({ where: { id: 5 }, update: {}, create: { id: 5, name: 'Tornozeleiras', visible: true } }),
  ]);

  const products = [
    { name: 'Anel Solitario Zirconia', price: '89.90', stock: 15, categoryId: 1 },
    { name: 'Anel Coracao Cravejado', price: '119.90', stock: 8, categoryId: 1 },
    { name: 'Anel Dupla Gota', price: '79.90', stock: 20, categoryId: 1 },
    { name: 'Brinco Argola Lisa', price: '59.90', stock: 25, categoryId: 2 },
    { name: 'Brinco Perola Natural', price: '149.90', stock: 5, categoryId: 2 },
    { name: 'Brinco Gota Cravejada', price: '69.90', stock: 12, categoryId: 2 },
    { name: 'Brinco Argola Texturizada', price: '54.90', stock: 18, categoryId: 2 },
    { name: 'Colar Ponto de Luz', price: '99.90', stock: 7, categoryId: 3 },
    { name: 'Colar Gargantilha Coracao', price: '89.90', stock: 10, categoryId: 3 },
    { name: 'Colar Maxi Corrente', price: '159.90', stock: 3, categoryId: 3 },
    { name: 'Pulseira de Perolas', price: '129.90', stock: 6, categoryId: 4 },
    { name: 'Pulseira Corrente Fina', price: '49.90', stock: 22, categoryId: 4 },
    { name: 'Pulseira Rigida Vazada', price: '79.90', stock: 9, categoryId: 4 },
  ];

  for (const prod of products) {
    await p.product.create({ data: prod });
  }

  const count = await p.product.count();
  console.log(count + ' produtos em ' + cats.length + ' categorias');
  await p.$disconnect();
})();
