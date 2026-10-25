const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const t0 = Date.now();
  const sales = await prisma.sale.findMany({
    where: { deletedAt: null },
    take: 5000,
    orderBy: { createdAt: 'desc' },
    include: {
      client: { select: { name: true, ci: true } },
      member: { include: { user: { select: { name: true } } } },
      exchangeRate: { select: { rate: true } },
      payments: { select: { paymentMethod: { select: { name: true } } } },
      _count: { select: { items: true } }
    }
  });
  console.log('Query took:', Date.now() - t0, 'ms. Found sales:', sales.length);
  await prisma.$disconnect();
}

test().catch(e => {
  console.error(e);
  process.exit(1);
});
