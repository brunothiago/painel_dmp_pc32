---
title: Alterações — Painel PC 32
toc: false
---

```js
import * as XLSX from "xlsx";
import {html} from "htl";
import {dsvFormat} from "d3-dsv";
import {metricGrid} from "./components/cards.js";
import {formatNumber, formatDate} from "./lib/formatters.js";

const rawText = await FileAttachment("data/base_pc_32.csv").text();
const previousRawText = await FileAttachment("data/base_pc_32_previous.csv").text();
const baseDiffLatest = await FileAttachment("data/base_diff_latest.json").json();
const dsv = dsvFormat(";");

function parseDate(v) {
  if (!v) return null;
  const d = new Date(`${v}T12:00:00Z`);
  return isNaN(d) ? null : d;
}

function parseBaseRow(d) {
  return {
    cod_tci: d.cod_tci,
    num_convenio: d.num_convenio,
    uf: d.txt_uf,
    municipio: d.txt_municipio,
    secretaria: d.txt_sigla_secretaria,
    modalidade: d.txt_modalidade,
    situacao: d.dsc_situacao_contrato_mcid,
    dt_assinatura: parseDate(d.dte_assinatura_contrato),
    situacao_suspensiva: d.situacao_da_analise_suspensiva,
    dt_vencimento_suspensiva: parseDate(d.vencimento_da_suspensiva),
    dt_retirada_suspensiva: parseDate(d.dte_retirada_suspensiva),
    dt_lae: parseDate(d.dte_primeira_data_lae),
    dt_pub_licitacao: parseDate(d.dte_publicacao_licitacao),
    dt_homolog_licitacao: parseDate(d.dte_homologacao_licitacao),
    dt_vrpl: parseDate(d.dte_vrpl),
    dt_aio: parseDate(d.dte_aio),
    dt_inicio_obra: parseDate(d.dte_inicio_obra_mcid),
    vlr_repasse: +d.vlr_repasse || 0,
    status_suspensiva: d.status_suspensiva,
    fase_atual: d.fase_atual,
    status_pub_licitacao: d.status_pub_licitacao,
    status_homolog_licitacao: d.status_homolog_licitacao,
    status_inicio_obra: d.status_inicio_obra,
    status_regra_casa_civil: d.status_regra_casa_civil,
    urgencia_suspensiva: d.urgencia_suspensiva,
  };
}

const rawData = dsv.parse(rawText, parseBaseRow);
const previousRawData = dsv.parse(previousRawText, parseBaseRow);

function rowKey(d) {
  return (d.num_convenio || d.cod_tci || "").trim();
}

function valStr(v) {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

const diffFields = [
  "situacao", "situacao_suspensiva", "status_suspensiva", "fase_atual",
  "dt_retirada_suspensiva", "dt_lae", "dt_pub_licitacao", "dt_homolog_licitacao",
  "dt_vrpl", "dt_aio", "dt_inicio_obra", "vlr_repasse",
  "status_pub_licitacao", "status_homolog_licitacao", "status_inicio_obra",
  "status_regra_casa_civil", "urgencia_suspensiva",
];

const diffFieldLabels = {
  situacao: "Situacao", situacao_suspensiva: "Sit. Suspensiva", status_suspensiva: "Status Suspensiva",
  fase_atual: "Fase Atual", dt_retirada_suspensiva: "Ret. Suspensiva", dt_lae: "LAE",
  dt_pub_licitacao: "Pub. Licitacao", dt_homolog_licitacao: "Homolog.", dt_vrpl: "VRPL",
  dt_aio: "AIO", dt_inicio_obra: "Inicio Obra", vlr_repasse: "Repasse",
  status_pub_licitacao: "Status Pub.", status_homolog_licitacao: "Status Homolog.",
  status_inicio_obra: "Status Inicio Obra", status_regra_casa_civil: "Regra Casa Civil",
  urgencia_suspensiva: "Urgencia Susp.",
};

const previousByKey = new Map(previousRawData.map(d => [rowKey(d), d]));

function fmt(v) {
  if (v == null || v === "") return "(vazio)";
  if (v instanceof Date) return formatDate(v);
  if (typeof v === "number") return v.toLocaleString("pt-BR");
  return String(v);
}

const alteracaoRows = [];
const empreendimentosAlterados = new Set();

for (const d of rawData) {
  const key = rowKey(d);
  const prev = previousByKey.get(key);

  if (!prev) {
    empreendimentosAlterados.add(key);
    alteracaoRows.push({
      num_convenio: d.num_convenio || "—",
      cod_tci: d.cod_tci || "—",
      uf: d.uf || "—",
      secretaria: d.secretaria || "—",
      tipo: "Novo",
      campo: "—",
      anterior: "—",
      atual: "—",
    });
    continue;
  }

  const campos = diffFields.filter(f => valStr(d[f]) !== valStr(prev[f]));
  if (campos.length === 0) continue;

  empreendimentosAlterados.add(key);
  for (const f of campos) {
    alteracaoRows.push({
      num_convenio: d.num_convenio || "—",
      cod_tci: d.cod_tci || "—",
      uf: d.uf || "—",
      secretaria: d.secretaria || "—",
      tipo: "Alterado",
      campo: diffFieldLabels[f] || f,
      anterior: fmt(prev[f]),
      atual: fmt(d[f]),
    });
  }
}

const previousKeys = new Set(previousRawData.map(d => rowKey(d)));
const currentKeys = new Set(rawData.map(d => rowKey(d)));
for (const d of previousRawData) {
  const key = rowKey(d);
  if (!currentKeys.has(key)) {
    empreendimentosAlterados.add(key);
    alteracaoRows.push({
      num_convenio: d.num_convenio || "—",
      cod_tci: d.cod_tci || "—",
      uf: d.uf || "—",
      secretaria: d.secretaria || "—",
      tipo: "Removido",
      campo: "—",
      anterior: "—",
      atual: "—",
    });
  }
}

const snapshotAnteriorLabel = baseDiffLatest?.snapshot_anterior
  ? formatDate(baseDiffLatest.snapshot_anterior)
  : "snapshot anterior";

const updatedAt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric",
}).format(new Date());
```

```js
const pageTitleBar = document.createElement("div");
pageTitleBar.className = "page-titlebar";
pageTitleBar.innerHTML = `
  <div class="page-titlebar__heading">
    <h1>Alteracoes desde ${snapshotAnteriorLabel}</h1>
  </div>
  <div class="page-titlebar__meta" aria-label="Data de atualizacao">
    <span class="page-titlebar__meta-label">Atualizado em</span>
    <strong class="page-titlebar__meta-value">${updatedAt}</strong>
  </div>
`;
display(pageTitleBar);
```

```js
const totalAlteracoes = alteracaoRows.length;
const totalEmpreendimentos = empreendimentosAlterados.size;
const novos = alteracaoRows.filter(d => d.tipo === "Novo").length;
const alterados = new Set(alteracaoRows.filter(d => d.tipo === "Alterado").map(d => d.num_convenio)).size;
const removidos = alteracaoRows.filter(d => d.tipo === "Removido").length;

display(metricGrid([
  { label: "Empreendimentos com alteracao", value: formatNumber(totalEmpreendimentos), tone: "default" },
  { label: "Total de alteracoes", value: formatNumber(totalAlteracoes), tone: "blue" },
  { label: "Novos", value: formatNumber(novos), tone: "green" },
  { label: "Alterados", value: formatNumber(alterados), tone: "gold" },
  { label: "Removidos", value: formatNumber(removidos), tone: "red" },
]));
```

<div class="filters-bar">

```js
const tiposDisponiveis = ["Todos", ...new Set(alteracaoRows.map(d => d.tipo))];
const fTipo = view(Inputs.select(tiposDisponiveis, { label: "Tipo", value: "Todos" }));
```

```js
const camposDisponiveis = ["Todos", ...[...new Set(alteracaoRows.map(d => d.campo).filter(c => c !== "—"))].sort()];
const fCampo = view(Inputs.select(camposDisponiveis, { label: "Campo alterado", value: "Todos" }));
```

```js
const ufsDisponiveis = ["Todas", ...[...new Set(alteracaoRows.map(d => d.uf).filter(Boolean))].sort()];
const fUf = view(Inputs.select(ufsDisponiveis, { label: "UF", value: "Todas" }));
```

```js
const secretariasDisponiveis = ["Todas", ...[...new Set(alteracaoRows.map(d => d.secretaria).filter(Boolean))].sort()];
const fSecretaria = view(Inputs.select(secretariasDisponiveis, { label: "Secretaria", value: "Todas" }));
```

</div>

```js
const filteredRows = alteracaoRows.filter(d =>
  (fTipo === "Todos" || d.tipo === fTipo) &&
  (fCampo === "Todos" || d.campo === fCampo) &&
  (fUf === "Todas" || d.uf === fUf) &&
  (fSecretaria === "Todas" || d.secretaria === fSecretaria)
);
```

<div class="table-shell">

```js
if (filteredRows.length > 0) {
  display(html`<p class="metric-detail">${formatNumber(filteredRows.length)} registro${filteredRows.length > 1 ? "s" : ""} encontrado${filteredRows.length > 1 ? "s" : ""}</p>`);

  display(Inputs.table(filteredRows, {
    columns: ["num_convenio", "cod_tci", "uf", "secretaria", "tipo", "campo", "anterior", "atual"],
    header: {
      num_convenio: "Convenio",
      cod_tci: "TCI",
      uf: "UF",
      secretaria: "Secretaria",
      tipo: "Tipo",
      campo: "Campo",
      anterior: "Valor Anterior",
      atual: "Valor Atual",
    },
    rows: 25,
    select: false,
    multiple: false,
  }));
} else {
  display(html`<p>Nenhuma alteracao encontrada com os filtros selecionados.</p>`);
}
```

```js
function makeExportAlteracoes(rows) {
  const btn = document.createElement("button");
  btn.className = "export-btn";
  btn.type = "button";
  btn.textContent = `Exportar alteracoes (${rows.length})`;
  btn.disabled = rows.length === 0;

  btn.addEventListener("click", () => {
    const exportRows = rows.map(row => ({
      "Convenio": row.num_convenio,
      "TCI": row.cod_tci,
      "UF": row.uf,
      "Secretaria": row.secretaria,
      "Tipo": row.tipo,
      "Campo": row.campo,
      "Valor Anterior": row.anterior,
      "Valor Atual": row.atual,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Alteracoes");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFileXLSX(workbook, `pc32-alteracoes-${stamp}.xlsx`);
  });

  return btn;
}

display(makeExportAlteracoes(filteredRows));
```

</div>
