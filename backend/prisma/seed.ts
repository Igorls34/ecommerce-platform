import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type CategorySlug = 'aneis' | 'brincos' | 'colar' | 'ear-cuff' | 'pingentes' | 'bijuterias-religiosas' | 'braceletes' | 'pulseiras';

interface VariantInput {
  name: string;
  price: string;
  stock: number;
}

interface ProductSeed {
  name: string;
  description: string;
  categorySlug: CategorySlug;
  price?: string;
  stock?: number;
  variants?: VariantInput[];
}

const categoryBySlug: Record<CategorySlug, string> = {
  aneis: 'Aneis',
  brincos: 'Brincos',
  colar: 'Colar',
  'ear-cuff': 'Ear Cuff',
  pingentes: 'Pingentes',
  'bijuterias-religiosas': 'Bijuterias Religiosas',
  braceletes: 'Braceletes',
  pulseiras: 'Pulseiras',
};

const products: ProductSeed[] = [
  // ── Brincos (com variantes de tamanho) ──
  {
    name: 'Coração de Zircônia Ouro 18k',
    description: 'Brinco coração de zircônia com banho ouro 18k.',
    categorySlug: 'brincos',
    variants: [
      { name: 'Pequeno', price: '57.25', stock: 1 },
      { name: 'Médio', price: '58.25', stock: 1 },
      { name: 'Grande', price: '59.25', stock: 1 },
    ],
  },
  {
    name: 'Brinco Pedras Coração Banho Ródio',
    description: 'Brinco com pedras coração, banho ródio.',
    categorySlug: 'brincos',
    variants: [
      { name: 'Pequeno', price: '54.00', stock: 1 },
      { name: 'Médio', price: '56.00', stock: 1 },
      { name: 'Grande', price: '58.00', stock: 1 },
    ],
  },
  {
    name: 'Brinco Pedra Sinal Luz Banho Ródio',
    description: 'Brinco pedra sinal luz, banho ródio.',
    categorySlug: 'brincos',
    variants: [
      { name: 'Pequeno', price: '54.00', stock: 1 },
      { name: 'Médio', price: '56.00', stock: 1 },
      { name: 'Grande', price: '58.00', stock: 1 },
    ],
  },
  {
    name: 'Argola Pedra Colorida Banho Ouro 18k',
    description: 'Argola pedra colorida com banho ouro 18k.',
    categorySlug: 'brincos',
    variants: [
      { name: 'Pequena', price: '40.00', stock: 1 },
      { name: 'Média', price: '60.00', stock: 1 },
    ],
  },
  {
    name: 'Argolas Lisas Banho Ródio',
    description: 'Argolas lisas com banho ródio.',
    categorySlug: 'brincos',
    variants: [
      { name: 'Pequena', price: '54.00', stock: 1 },
      { name: 'Média', price: '56.00', stock: 1 },
      { name: 'Grande', price: '58.00', stock: 1 },
    ],
  },
  {
    name: 'Argola Pedras Cravejadas Verso Vazado Banho Ouro',
    description: 'Argola pedras cravejadas verso vazado, banho ouro.',
    categorySlug: 'brincos',
    variants: [
      { name: 'Pequena', price: '71.70', stock: 1 },
      { name: 'Média', price: '73.00', stock: 1 },
      { name: 'Grande', price: '76.00', stock: 1 },
    ],
  },

  // ── Brincos (individuais) ──
  { name: 'Brinco Sol Banho Ouro 18k', description: 'Brinco sol com banho ouro 18k.', price: '68.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Coração Banho Ouro 18k', description: 'Brinco coração com banho ouro 18k.', price: '33.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Gota Lisa / Cravejada Banho 18k', description: 'Brinco gota lisa ou cravejada com banho 18k.', price: '69.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Folha / Ponto de Luz Banho Ouro 18k', description: 'Brinco folha com ponto de luz, banho ouro 18k.', price: '87.25', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Orgânico Espiral Prata', description: 'Brinco orgânico espiral em banho prata.', price: '59.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Gota Meia Folha Banho Ouro 18k', description: 'Brinco gota meia folha com banho ouro 18k.', price: '51.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Meia Folha Prata', description: 'Brinco meia folha em banho prata.', price: '53.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Cravejado Gota Banho Ouro 18k', description: 'Brinco cravejado gota com banho ouro 18k.', price: '89.76', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Asa Orgânica Banho Prata', description: 'Brinco asa orgânica em banho prata.', price: '59.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Oval Amassado Banho Prata', description: 'Brinco oval amassado em banho prata.', price: '99.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Coração Grande Banho Ouro 18k', description: 'Brinco coração grande com banho ouro 18k.', price: '65.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Bola Martelada Banho Ouro 18k', description: 'Brinco bola martelada com banho ouro 18k.', price: '45.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Cristal PP Banho Ouro 18k', description: 'Brinco de cristal tamanho PP com banho ouro 18k.', price: '53.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Triângulo Banho Ouro 18k', description: 'Brinco triângulo com banho ouro 18k.', price: '85.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco 3 Corações Vazados Banho Ouro 18k', description: 'Brinco 3 corações vazados com banho ouro 18k.', price: '32.25', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Quadrado Pequeno Banho Ouro 18k', description: 'Brinco quadrado pequeno com banho ouro 18k.', price: '97.25', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Base Coração', description: 'Brinco base coração.', price: '74.75', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Geométrico Banho Ouro 18k', description: 'Brinco geométrico com banho ouro 18k.', price: '74.25', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Pérola Shell Banho Diamante Ródio', description: 'Brinco pérola shell com banho diamante ródio.', price: '139.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Mona Lisa Ondulado Banho Ródio Cravejado', description: 'Brinco mona lisa ondulado cravejado com banho ródio.', price: '161.82', stock: 1, categorySlug: 'brincos' },
  { name: 'Mona Lisa Pérola Dupla Banho Ródio', description: 'Brinco mona lisa pérola dupla com banho ródio.', price: '99.00', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Mona Lisa Banho Ródio Cristal', description: 'Brinco mona lisa com banho ródio e cristal.', price: '116.91', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Pedra Banhado Ouro', description: 'Brinco com pedra banhado a ouro.', price: '161.82', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Pedra Banhado Ródio', description: 'Brinco com pedra banhado a ródio.', price: '161.82', stock: 1, categorySlug: 'brincos' },
  { name: 'Brinco Fake Pressão Pedras Banho Ouro 18k', description: 'Brinco fake pressão com pedras, banho ouro 18k.', price: '39.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Splendor Zircônia Pérola Banho Ouro 18k', description: 'Brinco splendor zircônia pérola com banho ouro 18k.', price: '233.82', stock: 1, categorySlug: 'brincos' },

  // ── Argolas (individuais, Brincos) ──
  { name: 'Argola Grande Ramo Banho Ouro 18k', description: 'Argola grande ramo com banho ouro 18k.', price: '99.75', stock: 1, categorySlug: 'brincos' },
  { name: 'Argola com Corrente Banho Ródio', description: 'Argola com corrente em banho ródio.', price: '139.80', stock: 1, categorySlug: 'brincos' },
  { name: 'Argola Baguettes Zircônia Banho Ouro 18k', description: 'Argola com baguettes de zircônia, banho ouro 18k.', price: '159.00', stock: 1, categorySlug: 'brincos' },
  { name: 'Argola Serpentina Banho Ródio', description: 'Argola serpentina com banho ródio.', price: '99.00', stock: 1, categorySlug: 'brincos' },
  { name: 'Argola Pequena Banho Ródio', description: 'Argola pequena com banho ródio.', price: '62.25', stock: 1, categorySlug: 'brincos' },
  { name: 'Argola Orgânica Cravejada Banho Ouro 18k', description: 'Argola orgânica cravejada com banho ouro 18k.', price: '128.91', stock: 1, categorySlug: 'brincos' },

  // ── Aneis ──
  { name: 'Anel Dupla Gota Banho 18k', description: 'Anel dupla gota com banho 18k.', price: '79.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Vazado Banho Ouro 18k', description: 'Anel vazado com banho ouro 18k.', price: '67.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Coração Cravejado Banho Ouro 18k', description: 'Anel coração cravejado com banho ouro 18k.', price: '77.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Gota Lisa Vazada Banho Ródio', description: 'Anel gota lisa vazada com banho ródio.', price: '79.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Duplo Caracol', description: 'Anel duplo caracol.', price: '79.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Losângulo Vazado Banho Ouro 18k', description: 'Anel losângulo vazado com banho ouro 18k.', price: '68.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Dupla Gota Max Banho Ródio', description: 'Anel dupla gota max com banho ródio.', price: '79.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Cristal Ródio (22)', description: 'Anel cristal com banho ródio. Tamanho 22.', price: '116.91', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Orgânico Cravejado Banho Ouro 18k (18)', description: 'Anel orgânico cravejado com banho ouro 18k. Tamanho 18.', price: '125.91', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Pedras Banho Ouro (18)', description: 'Anel com pedras banho ouro. Tamanho 18.', price: '79.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Pedras Banho Ródio (18)', description: 'Anel com pedras banho ródio. Tamanho 18.', price: '79.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Pedras Banho Ródio Deluxe (18)', description: 'Anel com pedras banho ródio. Tamanho 18.', price: '139.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Meio Círculo Banhado Ouro (16)', description: 'Anel meio círculo banhado a ouro. Tamanho 16.', price: '99.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Coração Cravejado Banhado Ouro (18)', description: 'Anel coração cravejado banhado a ouro. Tamanho 18.', price: '111.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Coração Cravejado Banhado Ródio (16)', description: 'Anel coração cravejado banhado a ródio. Tamanho 16.', price: '111.80', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Coração Duas Pedras Banho Ouro (18)', description: 'Anel coração com duas pedras banho ouro. Tamanho 18.', price: '107.41', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Coração Duas Pedras Banho Ródio (16)', description: 'Anel coração com duas pedras banho ródio. Tamanho 16.', price: '107.41', stock: 1, categorySlug: 'aneis' },
  { name: 'Anel Pedras Banho Ouro Luxo (18)', description: 'Anel com pedras banho ouro. Tamanho 18.', price: '118.18', stock: 1, categorySlug: 'aneis' },

  // ── Colar ──
  { name: 'Aro Gargantilha Fita Banho Ouro 18k', description: 'Aro gargantilha fita com banho ouro 18k.', price: '99.80', stock: 1, categorySlug: 'colar' },
  { name: 'Corrente Banho Ouro 18k', description: 'Corrente banho ouro 18k.', price: '82.25', stock: 1, categorySlug: 'colar' },
  { name: 'Colar Ponto de Luz / Meio Sol Banho Ouro 18k', description: 'Colar ponto de luz meio sol com banho ouro 18k.', price: '79.80', stock: 1, categorySlug: 'colar' },
  { name: 'Cordão Banho Ouro 18k', description: 'Cordão banho ouro 18k.', price: '95.80', stock: 1, categorySlug: 'colar' },
  { name: 'Colar Pedra Banhado Ouro 18k', description: 'Colar com pedra banhado a ouro 18k.', price: '160.00', stock: 1, categorySlug: 'colar' },
  { name: 'Colar Pedra Banhado Ródio', description: 'Colar com pedra banhado a ródio.', price: '160.00', stock: 1, categorySlug: 'colar' },
  { name: 'Colar Banhado Ouro Pedra (6504)', description: 'Colar banhado a ouro com pedra.', price: '151.02', stock: 1, categorySlug: 'colar' },
  { name: 'Colar Rabo de Rato Banho Ouro 18k', description: 'Colar rabo de rato com banho ouro 18k.', price: '139.80', stock: 1, categorySlug: 'colar' },
  { name: 'Corrente Banho Ouro 18k Longa', description: 'Corrente banho ouro 18k.', price: '179.82', stock: 1, categorySlug: 'colar' },
  { name: 'Colar Fino Banhado Ouro 18k', description: 'Colar fino banhado a ouro 18k.', price: '79.80', stock: 1, categorySlug: 'colar' },
  { name: 'Colar Duplo Bolinhas Banhado Ouro', description: 'Colar duplo com bolinhas banhado a ouro.', price: '139.00', stock: 1, categorySlug: 'colar' },
  { name: 'Colar Banhado Ouro Pingentinhos', description: 'Colar banhado a ouro com pingentinhos.', price: '79.80', stock: 1, categorySlug: 'colar' },
  { name: 'Colar Banhado Ródio Pingentinhos', description: 'Colar banhado a ródio com pingentinhos.', price: '79.80', stock: 1, categorySlug: 'colar' },

  // ── Ear Cuff ──
  { name: 'Ear Cuff Coração Zircônia Banho Ouro', description: 'Ear cuff coração zircônia com banho ouro.', price: '49.80', stock: 1, categorySlug: 'ear-cuff' },
  { name: 'Ear Cuff Trio Gotas Vazada Banho Ouro 18k', description: 'Ear cuff trio gotas vazada com banho ouro 18k.', price: '57.25', stock: 1, categorySlug: 'ear-cuff' },
  { name: 'Ear Cuff Colorido', description: 'Ear cuff colorido.', price: '149.75', stock: 1, categorySlug: 'ear-cuff' },
];

async function main() {
  const categoryByName = new Map<string, number>();

  for (const [slug, name] of Object.entries(categoryBySlug)) {
    const existing = await prisma.category.findFirst({ where: { name } });
    if (!existing) {
      throw new Error(`Categoria "${name}" não encontrada no banco.`);
    }
    categoryByName.set(name, existing.id);
  }

  // Delete all existing products and their cascading data
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productAvailabilityLead.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.product.deleteMany();

  let created = 0;

  for (const product of products) {
    const categoryId = categoryByName.get(categoryBySlug[product.categorySlug]);
    if (!categoryId) {
      console.warn(`Categoria não encontrada para slug: ${product.categorySlug}`);
      continue;
    }

    const hasVariants = product.variants && product.variants.length > 0;

    const data: any = {
      name: product.name,
      description: product.description,
      imageUrl: null,
      categoryId,
    };

    if (hasVariants) {
      const prices = product.variants!.map((v) => Number(v.price));
      data.price = Math.min(...prices).toString();
      data.stock = product.variants!.reduce((sum, v) => sum + v.stock, 0);
      data.variants = {
        create: product.variants!.map((v, i) => ({
          name: v.name,
          price: v.price,
          stock: v.stock,
          position: i,
        })),
      };
    } else {
      data.price = product.price;
      data.stock = product.stock;
    }

    await prisma.product.create({ data });
    created++;
  }

  console.log(`Seed concluído: ${created} produtos criados.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
