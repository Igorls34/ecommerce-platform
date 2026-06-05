const { PrismaClient } = require('C:/Users/igorl/Desktop/ecommerce-platform/backend/node_modules/@prisma/client');
const p = new PrismaClient();

(async () => {
  await p.product.deleteMany();
  await p.category.deleteMany();

  const cats = await Promise.all([
    p.category.create({ data: { id: 1, name: 'Eletrônicos', visible: true } }),
    p.category.create({ data: { id: 2, name: 'Moda', visible: true } }),
    p.category.create({ data: { id: 3, name: 'Casa', visible: true } }),
    p.category.create({ data: { id: 4, name: 'Fitness', visible: true } }),
  ]);

  const products = [
    { name: 'Fone Bluetooth Premium ANC', price: '299.90', stock: 23, categoryId: 1, description: 'Cancelamento de ruído ativo, 30h de bateria, conexão multiponto. Driver de 40mm com graves profundos e agudos cristalinos.' },
    { name: 'Power Bank 20000mAh 65W', price: '189.90', stock: 31, categoryId: 1, description: 'Carregamento rápido PD 65W, 2 portas USB-C, display LED. Carrega notebook e celular simultaneamente.' },
    { name: 'Mouse Ergonômico Vertical', price: '149.90', stock: 18, categoryId: 1, description: 'Design vertical que reduz tensão no pulso, sensor 4000 DPI, silencioso, conexão Bluetooth 5.0 e USB.' },
    { name: 'Hub USB-C 7 em 1', price: '129.90', stock: 27, categoryId: 1, description: 'HDMI 4K, leitor SD, 3 USBs, carregamento 100W pass-through. Compatível com MacBook, iPad e notebooks.' },

    { name: 'Camiseta Essential Algodão', price: '89.90', stock: 45, categoryId: 2, description: 'Algodão penteado 180g/m², caimento relaxed, gola reforçada. Disponível em 8 cores.' },
    { name: 'Jaqueta Softshell Impermeável', price: '349.90', stock: 14, categoryId: 2, description: 'Tecido softshell com membrana impermeável, zíperes selados, capuz ajustável. Ideal para meia-estação.' },
    { name: 'Calça Jeans Slim Fit', price: '199.90', stock: 22, categoryId: 2, description: 'Denim stretch com elastano, lavagem escura, corte slim moderno. Conforto o dia todo sem perder o caimento.' },
    { name: 'Tênis Casual Premium', price: '279.90', stock: 16, categoryId: 2, description: 'Cabedal em couro legítimo, solado emborrachado, palmilha memory foam. Design minimalista.' },

    { name: 'Luminária LED Inteligente', price: '159.90', stock: 20, categoryId: 3, description: 'Wi-Fi integrado, compatível com Alexa e Google Home. 16 milhões de cores, dimerizável, timer.' },
    { name: 'Jogo de Toalhas 6 Peças', price: '119.90', stock: 28, categoryId: 3, description: 'Algodão egípcio 600 GSM, toque aveludado. 2 banho, 2 rosto, 2 piso na cor branco.' },
    { name: 'Difusor Ultrassônico 300ml', price: '99.90', stock: 17, categoryId: 3, description: 'Silencioso, LED 7 cores, desligamento automático, 10h de autonomia. Inclui 3 óleos essenciais.' },
    { name: 'Organizador de Mesa Bambu', price: '69.90', stock: 35, categoryId: 3, description: 'Bambu sustentável, 4 compartimentos, base antiderrapante. Mantém seu espaço de trabalho impecável.' },

    { name: 'Tapete Yoga Antiderrapante', price: '149.90', stock: 19, categoryId: 4, description: '6mm de espessura, superfície texturizada, material TPE ecológico. Inclui alça de transporte.' },
    { name: 'Garrafa Térmica 750ml', price: '109.90', stock: 40, categoryId: 4, description: 'Aço inox dupla parede, mantém 12h quente ou 24h gelado. Boca larga, tampa com infusor para chás.' },
    { name: 'Corda de Pular Speed', price: '49.90', stock: 50, categoryId: 4, description: 'Cabo de aço revestido em PVC, rolamentos de esfera, cabo ajustável. Ideal para cardio e crossfit.' },
    { name: 'Relógio Smartwatch Fitness', price: '249.90', stock: 13, categoryId: 4, description: 'Monitor cardíaco, SpO2, GPS integrado, 14 modos esportivos, resistência 5ATM. Tela AMOLED 1.4".' },
  ];

  for (const prod of products) {
    await p.product.create({ data: { ...prod, visible: true } });
  }

  console.log(products.length + ' produtos realistas em ' + cats.length + ' categorias');
  await p.$disconnect();
})();
