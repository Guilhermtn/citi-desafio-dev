import { Luminosidade, Prisma } from "@prisma/client";
import prisma from "@database";

export type FiltrosPlanta = {
  luminosidade?: Luminosidade;
  petFriendly?: boolean;
  nome?: string;
  ordem?: "preco" | "nome";
};

export const createPlanta = async (data: Prisma.PlantaCreateInput) => {
  return await prisma.planta.create({
    data: data,
  });
};

export const findAllPlantas = async (filtros: FiltrosPlanta) => {
  return await prisma.planta.findMany({
    // Condições com valor undefined são ignoradas pelo Prisma,
    // então a mesma consulta serve para qualquer combinação de filtros
    where: {
      luminosidade: filtros.luminosidade,
      petFriendly: filtros.petFriendly,
      nome: filtros.nome
        ? { contains: filtros.nome, mode: "insensitive" }
        : undefined,
    },
    orderBy: filtros.ordem ? { [filtros.ordem]: "asc" } : { id: "asc" },
  });
};

export const findPlantasEsgotadas = async () => {
  return await prisma.planta.findMany({
    where: { estoque: 0 },
    orderBy: { id: "asc" },
  });
};

export const findPlantaById = async (id: number) => {
  return await prisma.planta.findUnique({
    where: { id: id },
  });
};

export const updatePlanta = async (id: number, data: Prisma.PlantaUpdateInput) => {
  return await prisma.planta.update({
    where: { id: id },
    data: data,
  });
};

export const deletePlanta = async (id: number) => {
  return await prisma.planta.delete({
    where: { id: id },
  });
};

// A checagem do estoque e o desconto acontecem num único UPDATE no banco.
// Se duas vendas do último vaso chegarem juntas, só uma encontra estoque
// suficiente; a outra não altera nenhuma linha e retorna false.
export const venderPlanta = async (id: number, quantidade: number) => {
  const resultado = await prisma.planta.updateMany({
    where: { id: id, estoque: { gte: quantidade } },
    data: { estoque: { decrement: quantidade } },
  });

  return resultado.count > 0;
};

export const findPrecosEEstoques = async () => {
  return await prisma.planta.findMany({
    select: { preco: true, estoque: true },
  });
};
