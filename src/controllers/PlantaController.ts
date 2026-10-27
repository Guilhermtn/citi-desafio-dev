import { Request, Response } from "express";
import { Luminosidade } from "@prisma/client";
import * as PlantaRepository from "@repositories/PlantaRepository";
import { FiltrosPlanta } from "@repositories/PlantaRepository";

// Maior valor que cabe numa coluna Int do PostgreSQL
const MAIOR_INT = 2147483647;

const CAMPOS_PLANTA = [
  "nome",
  "especie",
  "preco",
  "estoque",
  "luminosidade",
  "petFriendly",
  "regaACadaDias",
] as const;

const LUMINOSIDADES = Object.values(Luminosidade);

type DadosPlanta = {
  nome?: unknown;
  especie?: unknown;
  preco?: unknown;
  estoque?: unknown;
  luminosidade?: unknown;
  petFriendly?: unknown;
  regaACadaDias?: unknown;
};

const ehTextoPreenchido = (valor: unknown): valor is string =>
  typeof valor === "string" && valor.trim() !== "";

const ehInteiroEntre = (valor: unknown, minimo: number): valor is number =>
  typeof valor === "number" && Number.isInteger(valor) && valor >= minimo && valor <= MAIOR_INT;

const ehLuminosidade = (valor: unknown): valor is Luminosidade =>
  LUMINOSIDADES.includes(valor as Luminosidade);

const lerId = (valor: string) => {
  const id = Number(valor);
  return ehInteiroEntre(id, 1) ? id : null;
};

// Valida só os campos enviados (undefined = não enviado).
// No cadastro, antes disso, o handler exige que todos estejam presentes.
const validarCampos = (dados: DadosPlanta): string | null => {
  if (dados.nome !== undefined && !ehTextoPreenchido(dados.nome)) {
    return "O campo nome deve ser um texto não vazio.";
  }
  if (dados.especie !== undefined && !ehTextoPreenchido(dados.especie)) {
    return "O campo especie deve ser um texto não vazio.";
  }
  if (dados.preco !== undefined && !ehInteiroEntre(dados.preco, 1)) {
    return "O campo preco deve ser um número inteiro maior que zero, em centavos (ex.: 8990).";
  }
  if (dados.estoque !== undefined && !ehInteiroEntre(dados.estoque, 0)) {
    return "O campo estoque deve ser um número inteiro maior ou igual a zero.";
  }
  if (dados.luminosidade !== undefined && !ehLuminosidade(dados.luminosidade)) {
    return `O campo luminosidade deve ser um destes valores: ${LUMINOSIDADES.join(", ")}.`;
  }
  if (dados.petFriendly !== undefined && typeof dados.petFriendly !== "boolean") {
    return "O campo petFriendly deve ser true ou false.";
  }
  if (dados.regaACadaDias !== undefined && !ehInteiroEntre(dados.regaACadaDias, 1)) {
    return "O campo regaACadaDias deve ser um número inteiro maior ou igual a 1.";
  }
  return null;
};

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

export const createPlanta = async (req: Request, res: Response) => {
  try {
    if (!ehObjeto(req.body)) {
      return res.status(400).json({ message: "Envie os dados da planta como um objeto JSON." });
    }

    const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = req.body;
    const dados = { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias };

    const faltando = CAMPOS_PLANTA.filter((campo) => dados[campo] === undefined);
    if (faltando.length > 0) {
      return res.status(400).json({
        message: `Campos obrigatórios faltando: ${faltando.join(", ")}.`,
      });
    }

    const erro = validarCampos(dados);
    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const planta = await PlantaRepository.createPlanta({
      nome: (nome as string).trim(),
      especie: (especie as string).trim(),
      preco: preco as number,
      estoque: estoque as number,
      luminosidade: luminosidade as Luminosidade,
      petFriendly: petFriendly as boolean,
      regaACadaDias: regaACadaDias as number,
    });

    return res.status(201).json(planta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao cadastrar planta." });
  }
};

export const readAllPlantas = async (req: Request, res: Response) => {
  try {
    const { luminosidade, petFriendly, nome, ordem } = req.query;
    const filtros: FiltrosPlanta = {};

    // Os filtros chegam da URL sempre como texto; só convertemos os que vieram
    if (luminosidade !== undefined) {
      if (!ehLuminosidade(luminosidade)) {
        return res.status(400).json({
          message: `Filtro luminosidade inválido. Use: ${LUMINOSIDADES.join(", ")}.`,
        });
      }
      filtros.luminosidade = luminosidade;
    }

    if (petFriendly !== undefined) {
      if (petFriendly !== "true" && petFriendly !== "false") {
        return res.status(400).json({ message: "Filtro petFriendly inválido. Use true ou false." });
      }
      filtros.petFriendly = petFriendly === "true";
    }

    if (nome !== undefined) {
      if (!ehTextoPreenchido(nome)) {
        return res.status(400).json({ message: "Filtro nome deve ser um texto não vazio." });
      }
      filtros.nome = nome.trim();
    }

    if (ordem !== undefined) {
      if (ordem !== "preco" && ordem !== "nome") {
        return res.status(400).json({ message: "Ordenação inválida. Use ordem=preco ou ordem=nome." });
      }
      filtros.ordem = ordem;
    }

    const plantas = await PlantaRepository.findAllPlantas(filtros);

    return res.status(200).json(plantas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar plantas." });
  }
};

export const readPlantasEsgotadas = async (req: Request, res: Response) => {
  try {
    const plantas = await PlantaRepository.findPlantasEsgotadas();

    return res.status(200).json(plantas);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar plantas esgotadas." });
  }
};

export const readPlantaById = async (req: Request, res: Response) => {
  try {
    const id = lerId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
    }

    const planta = await PlantaRepository.findPlantaById(id);
    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    return res.status(200).json(planta);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar planta." });
  }
};

export const updatePlanta = async (req: Request, res: Response) => {
  try {
    const id = lerId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
    }

    if (!ehObjeto(req.body)) {
      return res.status(400).json({ message: "Envie os dados da planta como um objeto JSON." });
    }

    const { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias } = req.body;
    const dados = { nome, especie, preco, estoque, luminosidade, petFriendly, regaACadaDias };

    if (CAMPOS_PLANTA.every((campo) => dados[campo] === undefined)) {
      return res.status(400).json({
        message: `Envie pelo menos um campo para editar: ${CAMPOS_PLANTA.join(", ")}.`,
      });
    }

    const erro = validarCampos(dados);
    if (erro) {
      return res.status(400).json({ message: erro });
    }

    const planta = await PlantaRepository.findPlantaById(id);
    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    // PATCH: campos não enviados ficam undefined e o Prisma não os altera
    const plantaAtualizada = await PlantaRepository.updatePlanta(id, {
      nome: ehTextoPreenchido(nome) ? nome.trim() : undefined,
      especie: ehTextoPreenchido(especie) ? especie.trim() : undefined,
      preco: preco as number | undefined,
      estoque: estoque as number | undefined,
      luminosidade: luminosidade as Luminosidade | undefined,
      petFriendly: petFriendly as boolean | undefined,
      regaACadaDias: regaACadaDias as number | undefined,
    });

    return res.status(200).json(plantaAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao atualizar planta." });
  }
};

export const deletePlanta = async (req: Request, res: Response) => {
  try {
    const id = lerId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
    }

    const planta = await PlantaRepository.findPlantaById(id);
    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    await PlantaRepository.deletePlanta(id);

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao deletar planta." });
  }
};

export const venderPlanta = async (req: Request, res: Response) => {
  try {
    const id = lerId(req.params.id);
    if (id === null) {
      return res.status(400).json({ message: "O id deve ser um número inteiro positivo." });
    }

    const quantidade = ehObjeto(req.body) ? req.body.quantidade : undefined;
    if (!ehInteiroEntre(quantidade, 1)) {
      return res.status(400).json({
        message: "Envie a quantidade como um número inteiro maior que zero (ex.: { \"quantidade\": 2 }).",
      });
    }

    const planta = await PlantaRepository.findPlantaById(id);
    if (!planta) {
      return res.status(404).json({ message: "Planta não encontrada." });
    }

    if (planta.estoque < quantidade) {
      return res.status(400).json({
        message: `Estoque insuficiente: temos só ${planta.estoque} vaso(s) de ${planta.nome}.`,
      });
    }

    const vendeu = await PlantaRepository.venderPlanta(id, quantidade);
    if (!vendeu) {
      // Outra venda levou os vasos entre a busca acima e o desconto
      return res.status(400).json({
        message: "Estoque insuficiente: outra venda acabou de levar esses vasos.",
      });
    }

    const plantaAtualizada = await PlantaRepository.findPlantaById(id);

    return res.status(200).json(plantaAtualizada);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao registrar venda." });
  }
};

export const readValorTotalDoEstoque = async (req: Request, res: Response) => {
  try {
    const plantas = await PlantaRepository.findPrecosEEstoques();

    let valorTotalEmCentavos = 0;
    let totalDeVasos = 0;
    for (const planta of plantas) {
      valorTotalEmCentavos += planta.preco * planta.estoque;
      totalDeVasos += planta.estoque;
    }

    return res.status(200).json({ valorTotalEmCentavos, totalDeVasos });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao calcular o valor do estoque." });
  }
};
