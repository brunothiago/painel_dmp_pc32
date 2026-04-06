# Plano — Painel PC 32 CGPAC

## Visão Geral

Painel em Observable Framework para acompanhamento dos contratos da PC 32 (Novo PAC — Seleção).
Base: `base_pc_32.csv` — **1.531 registros**, separador `;`, 17 colunas.

---

## Dados da Base

| Coluna | Tipo | Exemplo |
|---|---|---|
| cod_tci | texto | 1-1965594 |
| num_convenio | texto | 960414 |
| txt_sigla_secretaria | cat. (3) | SNSA, SNP, SEMOB |
| dsc_fase_pac | texto | NOVO PAC - Seleção |
| txt_modalidade | cat. (10) | Drenagem Urbana, Contenção de Encostas, ... |
| dsc_situacao_contrato_mcid | cat. (6) | Contratado - Normal, Contratado - Suspensiva, ... |
| dte_assinatura_contrato | data | 2024-06-14 |
| situacao_da_analise_suspensiva | cat. (8) | Suspensiva retirada, Análise iniciada, ... |
| vencimento_da_suspensiva | data | 2025-03-11 |
| dte_retirada_suspensiva | data | 2024-10-14 |
| dte_primeira_data_lae | data | 2024-10-10 |
| dte_publicacao_licitacao | data | 2024-04-02 |
| dte_homologacao_licitacao | data | 2024-08-08 |
| dte_vrpl | data | 2024-12-06 |
| dte_aio | data | 2024-12-12 |
| dte_inicio_obra_mcid | data | 2024-11-14 |
| vlr_repasse | numérico | 16627047.71 |

---

## Estrutura do Painel

### Página única: `index.md`

#### 1. Filtros (topo)

- **Num Convênio** — input de texto com busca (search)
- **Secretaria** — select múltiplo (`SNSA`, `SNP`, `SEMOB`)
- **Modalidade** — select múltiplo (10 categorias)

Todos os gráficos e a tabela reagem aos filtros.

#### 2. Cards de resumo

| Card | Valor |
|---|---|
| Total de Selecionadas | contagem total (filtrada) |
| Suspensivas | onde `dsc_situacao_contrato_mcid === "Contratado - Suspensiva"` |
| Sem Suspensiva (Normal) | onde `dsc_situacao_contrato_mcid === "Contratado - Normal"` |
| Valor Total de Repasse | soma de `vlr_repasse` (R$ formatado) |

#### 3. Gráfico de Etapas

Gráfico de barras horizontais mostrando a **contagem por etapa do contrato** (`dsc_situacao_contrato_mcid`):

- Contratado - Normal (863)
- Contratado - Suspensiva (598)
- Cancelado ou Distratado (50)
- Em Contratação (18)
- Outros (2)

Cores diferenciadas por categoria. Reage aos filtros.

#### 4. Gráfico de Situação da Análise Suspensiva

Gráfico de barras mostrando `situacao_da_analise_suspensiva`:

- Suspensiva retirada (854)
- Doc. não enviada p/ análise (318)
- Analisada com pendências (163)
- Análise iniciada (103)
- Análise não iniciada (59)
- Outros

#### 5. Tabela interativa

Tabela com `Inputs.table` contendo todas as colunas principais:
- cod_tci, num_convenio, secretaria, modalidade, situação, situação suspensiva, valor repasse
- Ordenável por qualquer coluna
- Reage aos filtros

---

## Etapas de Implementação

### Etapa 1 — Scaffold do projeto Observable ✅

- [x] Inicializar projeto com `package.json` + dependências
- [x] Copiar `base_pc_32.csv` para `src/data/`
- [x] Configurar `observablehq.config.js` (título, tema, head com fontes)
- [x] Copiar `theme.css` e assets visuais (logos, favicon) do painel de referência

### Etapa 2 — Utilitários e carregamento de dados ✅

- [x] Criar `src/lib/formatters.js` (formatNumber, formatCurrency, formatCurrencyCompact, formatPercent, formatDate)
- [x] Criar `src/lib/theme.js` (paleta de cores, SITUACAO_CORES, SUSPENSIVA_CORES)
- [x] Criar `src/components/cards.js` (metricGrid, metricCard)
- [x] Carregamento via `FileAttachment` + `dsvFormat(";")` no `index.md`

### Etapa 3 — Página principal (`src/index.md`) ✅

- [x] Cabeçalho do painel
- [x] Filtros: Num Convênio (search), Secretaria (select), Modalidade (select)
- [x] Cards de resumo (total, suspensivas, sem suspensiva, valor repasse)
- [x] Gráfico de barras — Situação do Contrato (`dsc_situacao_contrato_mcid`)
- [x] Gráfico de barras — Situação da Análise Suspensiva
- [x] Tabela interativa com dados filtrados

### Etapa 4 — Build ✅

- [x] Aplicar tema e estilos (CSS customizado em `src/theme.css`)
- [x] `npm run build` executado com sucesso — 1 página, sem erros

---

## Stack Técnica

- **Observable Framework** (latest)
- **Plot** (gráficos)
- **Inputs** (filtros e tabela)
- **d3-dsv** (parse do CSV com `;`)
- CSS customizado (padrão Ministério das Cidades)

---

## Referência

Projeto base de estilo: `painel_planos_CGPAC` (mesma estrutura de config, tema, formatters).
