const { PrismaClient } = require('C:/Users/igorl/Desktop/ecommerce-platform/backend/node_modules/@prisma/client');
const p = new PrismaClient();
(async () => {
  const c = await p.product.updateMany({ data: { imageUrl: null } });
  console.log(c.count + ' produtos sem imagem');
  await p.$disconnect();
})();
