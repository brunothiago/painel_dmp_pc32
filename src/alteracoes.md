---
title: Alterações — Painel PC 32
toc: false
---

```js
import {dsvFormat} from "d3-dsv";
import {html} from "htl";
import {metricGrid} from "./components/cards.js";
import {renderAlteracoesDataTable} from "./components/alteracoes-table.js";
import {formatNumber, formatDate} from "./lib/formatters.js";

const changesRawText = await FileAttachment("data/base_alteracoes.csv").text();
const baseDiffLatest = await FileAttachment("data/base_diff_latest.json").json();
const dsv = dsvFormat(";");

function parseDate(v) {
  if (!v) return null;
  const d = new Date(`${v}T12:00:00Z`);
  return isNaN(d) ? null : d;
}

function parseChangeRow(d) {
  return {
    data: parseDate(d.data),
    cod_tci: d.cod_tci,
    num_convenio: d.num_convenio,
    uf: d.uf,
    secretaria: d.secretaria,
    tipo: d.tipo,
    campo: d.campo,
    anterior: d.valor_anterior,
    atual: d.valor_atual,
  };
}

const rawChanges = dsv.parse(changesRawText, parseChangeRow);

const diffFieldLabels = {
  dsc_situacao_contrato_mcid: "Situacao",
  situacao_da_analise_suspensiva: "Sit. Suspensiva",
  status_suspensiva: "Status Suspensiva",
  fase_atual: "Fase Atual",
  dte_retirada_suspensiva: "Ret. Suspensiva",
  dte_primeira_data_lae: "LAE",
  dte_publicacao_licitacao: "Pub. Licitacao",
  dte_homologacao_licitacao: "Homolog.",
  dte_vrpl: "VRPL",
  dte_aio: "AIO",
  dte_inicio_obra_mcid: "Inicio Obra",
  vlr_repasse: "Repasse",
  status_pub_licitacao: "Status Pub.",
  status_homolog_licitacao: "Status Homolog.",
  status_inicio_obra: "Status Inicio Obra",
  status_regra_casa_civil: "Regra Casa Civil",
  urgencia_suspensiva: "Urgencia Susp.",
};

function fmt(v, campo) {
  if (v == null || v === "") return "(vazio)";
  if (v instanceof Date) return formatDate(v);
  if (typeof v === "number") return v.toLocaleString("pt-BR");
  if (campo === "vlr_repasse" && v !== "" && !isNaN(v)) {
    return Number(v).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
  return String(v);
}

const alteracaoRows = rawChanges.map(d => ({
  data: d.data,
  data_fmt: fmt(d.data),
  num_convenio: d.num_convenio || "—",
  cod_tci: d.cod_tci || "—",
  uf: d.uf || "—",
  secretaria: d.secretaria || "—",
  tipo: d.tipo || "—",
  campo: d.campo ? (diffFieldLabels[d.campo] || d.campo) : "—",
  anterior: fmt(d.anterior, d.campo),
  atual: fmt(d.atual, d.campo),
}));

alteracaoRows.sort((a, b) => {
  const da = a.data instanceof Date ? a.data.getTime() : 0;
  const db = b.data instanceof Date ? b.data.getTime() : 0;
  return db - da;
});

const empreendimentosAlterados = new Set(
  alteracaoRows.map(d => (d.num_convenio !== "—" ? d.num_convenio : d.cod_tci))
);

const snapshotPrimeiroLabel = baseDiffLatest?.snapshot_primeiro
  ? formatDate(baseDiffLatest.snapshot_primeiro)
  : "primeiro registro";

function maxSnapshotDateLabel(snapshotMeta) {
  const candidates = [
    snapshotMeta?.snapshot_atual,
    snapshotMeta?.snapshot_anterior,
    snapshotMeta?.snapshot_primeiro,
  ]
    .map(parseDate)
    .filter((date) => date instanceof Date && !isNaN(date));

  if (candidates.length === 0) return "—";

  const maxDate = candidates.reduce((latest, current) =>
    current.getTime() > latest.getTime() ? current : latest
  );

  return formatDate(maxDate);
}

const updatedAt = maxSnapshotDateLabel(baseDiffLatest);
```

```js
const pageTitleBar = document.createElement("div");
pageTitleBar.className = "page-titlebar dashboard-toolbar";
pageTitleBar.innerHTML = `
  <div class="page-titlebar__heading dashboard-toolbar__title">
    <h1>Alterações desde ${snapshotPrimeiroLabel}</h1>
  </div>
  <div class="page-titlebar__meta dashboard-toolbar__side" aria-label="Data de atualização">
    <div class="dashboard-toolbar__meta">
      <span class="page-titlebar__meta-label">Atualizado em</span>
      <strong class="page-titlebar__meta-value">${updatedAt}</strong>
    </div>
  </div>
`;
display(pageTitleBar);
```

```js
const totalAlteracoes = alteracaoRows.length;
const totalEmpreendimentos = empreendimentosAlterados.size;
const novos = alteracaoRows.filter(d => d.tipo === "Novo").length;
const alterados = new Set(
  alteracaoRows
    .filter(d => d.tipo === "Alterado")
    .map(d => (d.num_convenio !== "—" ? d.num_convenio : d.cod_tci))
).size;
const removidos = alteracaoRows.filter(d => d.tipo === "Removido").length;

const alteracoesMetricGrid = metricGrid([
  { label: "Empreendimentos com alteração", value: formatNumber(totalEmpreendimentos), tone: "default" },
  { label: "Total de alterações", value: formatNumber(totalAlteracoes), tone: "blue" },
  { label: "Novos", value: formatNumber(novos), tone: "green" },
  { label: "Alterados", value: formatNumber(alterados), tone: "gold" },
  { label: "Removidos", value: formatNumber(removidos), tone: "red" },
]);
alteracoesMetricGrid.classList.add("metrics-grid--alteracoes");
display(alteracoesMetricGrid);
```

<div class="table-shell">

```js
if (alteracaoRows.length > 0) {
  display(renderAlteracoesDataTable(alteracaoRows, invalidation));
} else {
  display(html`<p>Nenhuma alteração encontrada.</p>`);
}
```

</div>
