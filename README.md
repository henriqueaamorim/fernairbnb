# fernairbnb

Aplicação para consolidar faturamento de reservas por unidade e gerar prestação de contas em PDF.

## Estrutura do projeto

- `frontend`: SPA React + Vite para upload de até 6 planilhas, revisão editável, cálculo de taxa e exportação PDF/ZIP.
- `supabase`: migrations e Edge Functions para staging, consolidação e limpeza efêmera.
- `backend`: API Fastify legada com benchmark de processamento.

## Configuração rápida (frontend + Supabase)

1. Copie `frontend/.env.example` para `frontend/.env`.
2. Preencha:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. No Supabase, aplique as migrations em `supabase/migrations`.
4. Faça deploy das Edge Functions em `supabase/functions`.

## Como executar (frontend)

```bash
cd frontend
npm install
npm run dev
```

## Como validar

```bash
cd frontend
npm run lint
npm run test
npm run build
```

## Pré-requisitos

- Node.js 20+
- npm 10+

## Como executar (backend)

```bash
cd backend
npm install
npm run dev
```

Servidor padrão: `http://localhost:3000`

## Scripts úteis

No diretório `backend`:

- `npm run dev`: sobe API em modo desenvolvimento.
- `npm run build`: compila TypeScript para `dist/`.
- `npm start`: executa build compilada.
- `npm test`: roda testes com Vitest.
- `npm run benchmark`: mede processamento de 500 linhas.

## Endpoint de saúde

### `GET /health`

Retorna:

```json
{
  "status": "ok"
}
```

## Endpoints de negócio

### 1) Validar template de mapeamento

### `POST /v1/mappings/validate`

`Content-Type: application/json`

Payload de exemplo:

```json
{
  "name": "Modelo Airbnb",
  "platform": "airbnb",
  "mapping": {
    "data": "Data",
    "codigoConfirmacao": "Código de Confirmação",
    "unidade": "Unidade",
    "valorBruto": "Ganhos Brutos",
    "valorLiquido": "Valor Líquido",
    "status": "Status",
    "hospede": "Hóspede"
  }
}
```

Resposta esperada:

```json
{
  "valid": true,
  "missingFields": []
}
```

Exemplo com `curl`:

```bash
curl -X POST http://localhost:3000/v1/mappings/validate \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Modelo Airbnb\",\"platform\":\"airbnb\",\"mapping\":{\"data\":\"Data\",\"codigoConfirmacao\":\"Código de Confirmação\",\"unidade\":\"Unidade\",\"valorBruto\":\"Ganhos Brutos\",\"valorLiquido\":\"Valor Líquido\",\"status\":\"Status\",\"hospede\":\"Hóspede\"}}"
```

---

### 2) Prévia de processamento (upload + mapeamento)

### `POST /v1/process/preview`

`Content-Type: multipart/form-data`

Campos esperados:

- `file`: arquivo `.csv`, `.xlsx` ou `.xls`
- `platform`: `airbnb` ou `booking`
- `mapping`: JSON string com os campos canônicos

Exemplo com `curl`:

```bash
curl -X POST http://localhost:3000/v1/process/preview \
  -F "file=@test/fixtures/airbnb-sample.csv" \
  -F "platform=airbnb" \
  -F "mapping={\"data\":\"Data\",\"codigoConfirmacao\":\"Código de Confirmação\",\"unidade\":\"Unidade\",\"valorBruto\":\"Ganhos Brutos\",\"valorLiquido\":\"Valor Líquido\",\"status\":\"Status\",\"hospede\":\"Hóspede\"}"
```

Resposta (resumo):

```json
{
  "totalRawRows": 4,
  "totalActiveRows": 3,
  "totalConsolidated": 2,
  "reservations": []
}
```

---

### 3) Revisão manual de dados consolidados

### `POST /v1/process/review`

`Content-Type: application/json`

Payload de exemplo:

```json
{
  "reservations": [
    {
      "sourcePlatform": "airbnb",
      "codigoConfirmacao": "HMWYKT2XD9",
      "unidade": "Sunrise 413",
      "data": "2026-03-01",
      "hospede": "Ana Silva",
      "status": "Confirmada",
      "valorBruto": 620,
      "valorLiquido": 520,
      "repasseNewHabitat": 104,
      "valorProprietario": 416,
      "sourceRows": [2, 3]
    }
  ],
  "patches": [
    {
      "codigoConfirmacao": "HMWYKT2XD9",
      "field": "valorLiquido",
      "value": 530
    },
    {
      "codigoConfirmacao": "HMWYKT2XD9",
      "field": "hospede",
      "value": "Ana S."
    }
  ]
}
```

Resposta esperada:

```json
{
  "totalConsolidated": 1,
  "reservations": []
}
```

---

### 4) Exportar relatórios em ZIP (PDF por unidade)

### `POST /v1/reports/export`

`Content-Type: application/json`

Payload de exemplo:

```json
{
  "reservations": [
    {
      "sourcePlatform": "airbnb",
      "codigoConfirmacao": "HMWYKT2XD9",
      "unidade": "Sunrise 413",
      "data": "2026-03-01",
      "hospede": "Ana Silva",
      "status": "Confirmada",
      "valorBruto": 620,
      "valorLiquido": 520,
      "repasseNewHabitat": 104,
      "valorProprietario": 416,
      "sourceRows": [2, 3]
    }
  ]
}
```

Resposta:

- `Content-Type: application/zip`
- Download do arquivo `relatorios.zip`

Exemplo com `curl` (salvando o ZIP):

```bash
curl -X POST http://localhost:3000/v1/reports/export \
  -H "Content-Type: application/json" \
  -d "{\"reservations\":[{\"sourcePlatform\":\"airbnb\",\"codigoConfirmacao\":\"HMWYKT2XD9\",\"unidade\":\"Sunrise 413\",\"data\":\"2026-03-01\",\"hospede\":\"Ana Silva\",\"status\":\"Confirmada\",\"valorBruto\":620,\"valorLiquido\":520,\"repasseNewHabitat\":104,\"valorProprietario\":416,\"sourceRows\":[2,3]}]}" \
  --output relatorios.zip
```

## Observações de privacidade e arquitetura

- Não há banco de dados nesta fase.
- O processamento ocorre em memória durante a requisição.
- Dados sensíveis não devem ser persistidos em disco nem em logs de aplicação.
