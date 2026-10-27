# 🌿 API Folhagem & Cia

API REST que substitui a planilha de controle da loja de plantas Folhagem & Cia: cadastro, consulta, edição e remoção de plantas, registro de vendas com controle de estoque e cálculo do valor total do estoque.

**Stack:** Node.js · Express · TypeScript · Prisma 5 · PostgreSQL 16 · Docker

O código segue as mesmas camadas do CRUD de usuários:

```
Requisição → routes.ts → PlantaController (valida e escolhe o status) → PlantaRepository (Prisma) → PostgreSQL
```

---

## ⚙️ Como rodar

Pré-requisitos: Git, Docker Desktop aberto, Node.js 20+ e Yarn (`npm install -g yarn`).

```bash
git clone <link-do-repositório> && cd <pasta-do-repositório>
git checkout desafio/jose-guilherme
cp .env.example .env          # no PowerShell ou CMD: copy .env.example .env
yarn                          # instala as dependências na máquina
docker compose up -d --build  # sobe a API e o banco
yarn migration                # aplica as migrations (User e Planta)
yarn seed                     # opcional: cadastra 6 plantas de exemplo
```

A API fica em `http://localhost:3001`. Logs: `docker compose logs -f server`. Banco no navegador: `yarn studio`.

O seed só insere as plantas quando a tabela está vazia, então rodar de novo não duplica nada.

---

## 🗂️ Modelo de dados

### `Planta`

| Campo | Tipo | Obrigatório no cadastro | Regra |
|---|---|---|---|
| `id` | Int | gerado pelo banco | autoincrement |
| `nome` | String | sim | texto não vazio (espaços nas pontas são removidos) |
| `especie` | String | sim | texto não vazio (espaços nas pontas são removidos) |
| `preco` | Int | sim | inteiro **maior que 0**, em **centavos** (`8990` = R$ 89,90) |
| `estoque` | Int | sim | inteiro **maior ou igual a 0** (0 = esgotada) |
| `luminosidade` | Enum `Luminosidade` | sim | `SOMBRA`, `MEIA_SOMBRA` ou `SOL_PLENO` |
| `petFriendly` | Boolean | sim | `true` ou `false` (booleano de verdade, não texto) |
| `regaACadaDias` | Int | sim | inteiro **maior ou igual a 1** |
| `createdAt` | DateTime | automático | preenchido na criação |
| `updatedAt` | DateTime | automático | atualizado a cada alteração, inclusive vendas |

Os campos inteiros também não podem passar de `2147483647`, o limite da coluna `Int` do PostgreSQL.

### Enum `Luminosidade`

| Valor | Significado |
|---|---|
| `SOMBRA` | Ambientes internos com pouca luz |
| `MEIA_SOMBRA` | Luz indireta ou sol fraco por parte do dia |
| `SOL_PLENO` | Sol direto por várias horas |

---

## 🔌 Rotas

Todas as respostas são JSON. Todo erro vem no formato `{ "message": "..." }`.

### 1. `POST /plantas` — cadastra uma planta

Corpo (todos os campos obrigatórios):

```json
{
  "nome": "Costela-de-adão",
  "especie": "Monstera deliciosa",
  "preco": 8990,
  "estoque": 12,
  "luminosidade": "MEIA_SOMBRA",
  "petFriendly": false,
  "regaACadaDias": 3
}
```

Resposta `201`:

```json
{
  "id": 1,
  "nome": "Costela-de-adão",
  "especie": "Monstera deliciosa",
  "preco": 8990,
  "estoque": 12,
  "luminosidade": "MEIA_SOMBRA",
  "petFriendly": false,
  "regaACadaDias": 3,
  "createdAt": "2026-10-27T15:10:12.512Z",
  "updatedAt": "2026-10-27T15:10:12.512Z"
}
```

Campos fora da lista acima são ignorados.

### 2. `GET /plantas` — lista as plantas

Parâmetros de busca, todos opcionais e combináveis:

| Parâmetro | Valores | Efeito |
|---|---|---|
| `luminosidade` | `SOMBRA`, `MEIA_SOMBRA`, `SOL_PLENO` | só plantas com essa luminosidade |
| `petFriendly` | `true`, `false` | só plantas seguras (ou não) para pets |
| `nome` *(bônus)* | qualquer texto | nome contém o texto, sem diferenciar maiúsculas |
| `ordem` *(bônus)* | `preco`, `nome` | ordena de forma crescente pelo campo |

Sem `ordem`, a lista vem ordenada por `id`.

Exemplos: `/plantas?luminosidade=SOMBRA&petFriendly=true`, `/plantas?nome=costela`, `/plantas?petFriendly=false&ordem=preco`.

Resposta `200`: um array de plantas no mesmo formato do cadastro. Um filtro válido sem resultado devolve `200` com `[]`.

### 3. `GET /plantas/:id` — busca uma planta

Exemplo: `GET /plantas/1`. Resposta `200`: a planta.

### 4. `PATCH /plantas/:id` — edita só os campos enviados

Corpo com um ou mais campos da planta; os enviados passam pelas mesmas regras do cadastro e os não enviados não mudam.

```json
{ "preco": 9990 }
```

Resposta `200`: a planta já atualizada.

### 5. `DELETE /plantas/:id` — remove uma planta

Resposta `204`, sem corpo.

### 6. `POST /plantas/:id/venda` — registra uma venda

```json
{ "quantidade": 2 }
```

Resposta `200`: a planta com o estoque já descontado (por exemplo, de `12` para `10`). Se não houver estoque suficiente, nada é alterado.

### 7. `GET /plantas/estoque/valor-total` — valor do estoque

Soma `preco × estoque` de todas as plantas e o total de vasos. Resposta `200`:

```json
{ "valorTotalEmCentavos": 223260, "totalDeVasos": 39 }
```

Com a loja vazia: `{ "valorTotalEmCentavos": 0, "totalDeVasos": 0 }`.

### 8. `GET /plantas/esgotadas` — plantas com estoque zero *(bônus)*

Resposta `200`: array com as plantas de `estoque` igual a `0` (ou `[]`).

---

## 🚦 Erros e status HTTP

| Status | Quando acontece |
|---|---|
| `400` | Dados inválidos no corpo, no `:id`, nos filtros ou na venda (detalhes abaixo) |
| `404` | O `id` é válido mas não existe planta com ele; ou a rota não existe |
| `500` | Erro inesperado no servidor ou no banco (o detalhe vai para o log, não para o cliente) |

### Erros por rota

| Rota | `400` | `404` |
|---|---|---|
| `POST /plantas` | corpo não é objeto JSON; algum campo faltando (a mensagem lista quais); algum campo fora das regras do modelo; JSON malformado | — |
| `GET /plantas` | `luminosidade` fora do enum; `petFriendly` diferente de `true`/`false`; `nome` vazio; `ordem` diferente de `preco`/`nome` | — |
| `GET /plantas/:id` | `id` não é inteiro positivo (`abc`, `1.5`, `0`) | planta não existe |
| `PATCH /plantas/:id` | `id` inválido; corpo sem nenhum campo da planta; campo enviado fora das regras | planta não existe |
| `DELETE /plantas/:id` | `id` inválido | planta não existe (inclusive ao deletar de novo) |
| `POST /plantas/:id/venda` | `id` inválido; `quantidade` ausente, não inteira ou menor que 1; estoque insuficiente | planta não existe |
| `GET /plantas/estoque/valor-total` | — | — |
| `GET /plantas/esgotadas` | — | — |

Exemplos de mensagens:

```json
{ "message": "Campos obrigatórios faltando: preco, estoque." }
{ "message": "O campo luminosidade deve ser um destes valores: SOMBRA, MEIA_SOMBRA, SOL_PLENO." }
{ "message": "Estoque insuficiente: temos só 10 vaso(s) de Costela-de-adão." }
{ "message": "O id deve ser um número inteiro positivo." }
{ "message": "Planta não encontrada." }
```

Todas as rotas podem responder `500` se o banco estiver fora do ar.

---

## 🧭 Decisões e bônus

### Bônus implementados

- Busca por nome sem diferenciar maiúsculas (`?nome=`), com `contains` + `mode: "insensitive"` do Prisma.
- Ordenação por `?ordem=preco` ou `?ordem=nome`, combinável com os filtros.
- Rota `GET /plantas/esgotadas`.
- Seed com 6 plantas de exemplo (`yarn seed`), duas delas esgotadas.

### Decisões além do enunciado

- **Duas vendas simultâneas do último vaso.** A checagem do estoque e o desconto acontecem num único comando no banco: um `updateMany` com `where: { id, estoque: { gte: quantidade } }` e `decrement`. O PostgreSQL trava a linha durante o `UPDATE`, então, se duas vendas chegam juntas, só a primeira encontra estoque suficiente; a segunda não altera nenhuma linha e recebe `400`. Num teste com 20 compras simultâneas do último vaso, exatamente uma deu `200`, as outras 19 deram `400` e o estoque terminou em `0`. A busca antes da venda continua existindo para responder `404` e mostrar o estoque atual na mensagem.
- **Tipos estritos.** `"8990"` (texto), `89.9` e `"true"` (texto) são recusados com `400`; o cliente precisa mandar número inteiro e booleano de verdade.
- **`id` inválido é `400`, não `404`.** `/plantas/abc` é um pedido malformado, diferente de um `id` que não existe.
- **`PATCH` vazio é `400`.** Um corpo sem nenhum campo da planta provavelmente é um erro do cliente, então a API avisa em vez de responder `200` sem mudar nada.
- **Validação antes do `404` no `PATCH`.** Os dados são validados antes de buscar a planta, para não consultar o banco à toa.
- **JSON malformado** (por exemplo, com vírgula sobrando) responde `400` em JSON, em vez da página de erro padrão do Express.
- **`nome` e `especie`** são salvos sem espaços nas pontas.
- **Valor total** é calculado no código, buscando só `preco` e `estoque` com `select`, porque o `aggregate` do Prisma não multiplica colunas.
