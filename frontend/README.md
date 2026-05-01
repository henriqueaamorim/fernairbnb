# fernairbnb Frontend

Interface web para upload, mapeamento, revisão e exportação dos relatórios de reservas, integrada ao backend local.

## Stack

- React 19
- TypeScript
- Vite

## Visual esperado (screenshots de referência)

Este frontend foi desenhado com base no protótipo clean com cards claros (referência enviada).

Checklist visual esperado:

- Sidebar escura à esquerda com passos do fluxo.
- Área principal clara com cards de resumo.
- Seção de upload/mapeamento simples e didática.
- Tabela de revisão editável com foco em legibilidade.
- Botões diretos para validar, processar, recalcular e exportar.

Estado esperado da tela principal:

1. **Topo**: card “Painel de Consolidação” com KPIs.
2. **Meio**: card “Upload e mapeamento”.
3. **Base**: card “Revisão de reservas” com tabela e ações finais.

## Execução local (frontend + backend juntos)

Na raiz do projeto `fernairbnb`, use dois terminais.

### Terminal 1: backend

```bash
cd backend
npm install
npm run dev
```

Backend esperado em: `http://localhost:3000`

### Terminal 2: frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend esperado em: `http://localhost:5173`

Observação:
- O frontend usa proxy Vite (`/api`) para o backend em `http://localhost:3000`.
- Arquivo de proxy: `frontend/vite.config.ts`.

## Build de validação

No diretório `frontend`:

```bash
npm run build
```

## Roteiro de teste manual ponta a ponta

### Pré-condições

- Backend e frontend em execução.
- Arquivo de teste disponível (exemplo recomendado):
  - `backend/test/fixtures/airbnb-sample.csv`

### Passo 1: abrir o frontend

- Acesse `http://localhost:5173`.
- Verifique se a interface carrega com sidebar escura e cards claros.

### Passo 2: validar mapping

- Selecione plataforma `Airbnb`.
- Confira/ajuste os campos de mapping.
- Clique em `Validar mapping`.
- Resultado esperado: mensagem de sucesso no status.

### Passo 3: processar prévia

- Faça upload de `airbnb-sample.csv`.
- Clique em `Processar prévia`.
- Resultado esperado:
  - Totais preenchidos.
  - Tabela com reservas consolidadas.
  - Reservas canceladas ausentes.

### Passo 4: revisar dados

- Edite pelo menos:
  - um campo textual (ex: `hospede`)
  - um campo numérico (ex: `valorLiquido`)
- Clique em `Recalcular ajustes`.
- Resultado esperado:
  - `repasseNewHabitat` e `valorProprietario` atualizados.
  - contador de patches volta para zero.

### Passo 5: exportar relatórios

- Clique em `Gerar relatórios (ZIP)`.
- Resultado esperado:
  - download automático do arquivo `relatorios.zip`.

### Passo 6: sanidade final

- Repetir processo com plataforma `Booking` e mapeamento correspondente.
- Confirmar que o fluxo completo continua funcionando.

## Contratos de API usados pelo frontend

- `POST /v1/mappings/validate`
- `POST /v1/process/preview`
- `POST /v1/process/review`
- `POST /v1/reports/export`

## Troubleshooting rápido

- **Erro de conexão no frontend**:
  - Confirme backend ativo na porta `3000`.
- **404 em rotas `/api/...`**:
  - Confirme se o frontend está rodando pelo `vite` (não por arquivo estático).
- **Falha no upload**:
  - Use apenas `.csv`, `.xlsx` ou `.xls`.
