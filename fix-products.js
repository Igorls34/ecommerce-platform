const { PrismaClient } = require('C:/Users/igorl/Desktop/ecommerce-platform/backend/node_modules/@prisma/client');
const p = new PrismaClient();

(async () => {
  // 1. Fix visibility
  await p.product.updateMany({ data: { visible: true } });

  // 2. Delete jewelry products, create generic ones
  await p.product.deleteMany();
  await p.category.deleteMany();

  const cats = await Promise.all([
    p.category.create({ data: { id: 1, name: 'Eletrônicos', visible: true } }),
    p.category.create({ data: { id: 2, name: 'Roupas', visible: true } }),
    p.category.create({ data: { id: 3, name: 'Casa & Decoração', visible: true } }),
    p.category.create({ data: { id: 4, name: 'Esportes', visible: true } }),
  ]);

  const products = [
    { name: 'Fone de Ouvido Bluetooth', price: '149.90', stock: 25, categoryId: 1, visible: true },
    { name: 'Carregador Portátil 10000mAh', price: '89.90', stock: 30, categoryId: 1, visible: true },
    { name: 'Mouse Sem Fio Ergonômico', price: '59.90', stock: 15, categoryId: 1, visible: true },

    { name: 'Camiseta Basic Algodão', price: '49.90', stock: 50, categoryId: 2, visible: true },
    { name: 'Jaqueta Corta-Vento', price: '199.90', stock: 12, categoryId: 2, visible: true },
    { name: 'Calça Jeans Slim', price: '129.90', stock: 20, categoryId: 2, visible: true },

    { name: 'Luminária de Mesa LED', price: '79.90', stock: 18, categoryId: 3, visible: true },
    { name: 'Jogo de Toalhas 3 Peças', price: '69.90', stock: 22, categoryId: 3, visible: true },
    { name: 'Difusor de Aromas', price: '99.90', stock: 10, categoryId: 3, visible: true },

    { name: 'Garrafa Térmica 750ml', price: '79.90', stock: 35, categoryId: 4, visible: true },
    { name: 'Tapete de Yoga Premium', price: '119.90', stock: 14, categoryId: 4, visible: true },
    { name: 'Corda de Pular Ajustável', price: '29.90', stock: 40, categoryId: 4, visible: true },
  ];

  for (const prod of products) {
    await p.product.create({ data: prod });
  }

  const count = await p.product.count();
  console.log(count + ' produtos genericos em ' + cats.length + ' categorias');
  await p.$disconnect();
})();
