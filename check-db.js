const { PrismaClient } = require('C:/Users/igorl/Desktop/ecommerce-platform/backend/node_modules/@prisma/client');
const p = new PrismaClient();
(async () => {
  const c = await p.product.count();
  const v = await p.product.count({ where: { visible: true } });
  const all = await p.product.findMany({ take: 3, select: { id: true, name: true, visible: true } });
  console.log('Total:', c, 'Visible:', v);
  all.forEach(x => console.log(JSON.stringify(x)));
  await p.$disconnect();
})();
