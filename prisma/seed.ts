import { Luminosidade, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const plantas = [
  {
    nome: "Costela-de-adão",
    especie: "Monstera deliciosa",
    preco: 8990,
    estoque: 12,
    luminosidade: Luminosidade.MEIA_SOMBRA,
    petFriendly: false,
    regaACadaDias: 3,
  },
  {
    nome: "Samambaia",
    especie: "Nephrolepis exaltata",
    preco: 4500,
    estoque: 0,
    luminosidade: Luminosidade.SOMBRA,
    petFriendly: true,
    regaACadaDias: 2,
  },
  {
    nome: "Espada-de-são-jorge",
    especie: "Dracaena trifasciata",
    preco: 5990,
    estoque: 8,
    luminosidade: Luminosidade.MEIA_SOMBRA,
    petFriendly: false,
    regaACadaDias: 10,
  },
  {
    nome: "Calathea",
    especie: "Goeppertia orbifolia",
    preco: 7490,
    estoque: 4,
    luminosidade: Luminosidade.SOMBRA,
    petFriendly: true,
    regaACadaDias: 3,
  },
  {
    nome: "Cacto-bola",
    especie: "Echinocactus grusonii",
    preco: 2500,
    estoque: 15,
    luminosidade: Luminosidade.SOL_PLENO,
    petFriendly: true,
    regaACadaDias: 15,
  },
  {
    nome: "Lírio-da-paz",
    especie: "Spathiphyllum wallisii",
    preco: 6290,
    estoque: 0,
    luminosidade: Luminosidade.SOMBRA,
    petFriendly: false,
    regaACadaDias: 4,
  },
];

const main = async () => {
  const quantidade = await prisma.planta.count();

  if (quantidade > 0) {
    console.log(`🌿 O banco já tem ${quantidade} planta(s), o seed não foi aplicado.`);
    return;
  }

  await prisma.planta.createMany({ data: plantas });
  console.log(`🌱 ${plantas.length} plantas de exemplo cadastradas.`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
