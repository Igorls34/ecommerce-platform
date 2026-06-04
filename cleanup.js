const { PrismaClient } = require('C:/Users/igorl/Desktop/ecommerce-platform/backend/node_modules/@prisma/client');
const p = new PrismaClient();
(async () => {
  await p.orderItem.deleteMany();
  await p.orderEvent.deleteMany();
  await p.order.deleteMany();
  await p.customer.deleteMany({ where: { email: 'maria@test.com' } });
  await p.$executeRawUnsafe('ALTER TABLE `Order` AUTO_INCREMENT = 1');
  await p.$executeRawUnsafe('ALTER TABLE OrderItem AUTO_INCREMENT = 1');
  await p.$executeRawUnsafe('ALTER TABLE OrderEvent AUTO_INCREMENT = 1');
  console.log('Cleanup done');
  await p.$disconnect();
})();
