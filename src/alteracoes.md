---
title: Alterações — Painel PC 32
toc: false
---

```js
import {dsvFormat} from "d3-dsv";
import {html} from "htl";
import {metricGrid} from "./components/cards.js";
import {renderAlteracoesDataTable} from "./components/alteracoes-table.js";
import {parseDate, formatNumber, formatDate} from "./lib/formatters.js";

const changesRawText = await FileAttachment("data/base_alteracoes.csv").text();
const baseDiffLatest = await FileAttachment("data/base_diff_latest.json").json();
const dsv = dsvFormat(";");

function parseChangeRow(d) {
  return {
    data: parseDate(d.data),
    categoria: d.categoria,
    natureza: d.natureza,
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
  dsc_situacao_contrato_mcid_tci: "Situacao",
  situacao_da_analise_suspensiva_pbi: "Sit. Suspensiva PBI",
  situacao_da_analise_suspensiva_cgpac: "Sit. Suspensiva DMP",
  motivo_suspensiva_retirada_cgpac: "Motivo Retirada DMP",
  status_suspensiva_calc: "Status Suspensiva",
  fase_atual_calc: "Fase Atual",
  dte_retirada_suspensiva_tgov: "Ret. Suspensiva",
  dte_primeira_data_lae_tdb: "LAE",
  dte_publicacao_licitacao_tgov: "Pub. Licitacao",
  dte_homologacao_licitacao_tgov: "Homolog.",
  dte_vrpl_tdb: "VRPL",
  dte_aio_tdb: "AIO",
  dte_inicio_obra_mcid_tci: "Inicio Obra",
  vlr_repasse_tci: "Repasse",
  prazo_pub_licitacao_calc: "Prazo Pub.",
  prazo_homolog_licitacao_calc: "Prazo Homolog.",
  prazo_homolog_licitacao_120d: "Prazo Homolog. 120d",
  prazo_inicio_obra_calc: "Prazo Inicio Obra",
  status_pub_licitacao_calc: "Status Pub.",
  status_homolog_licitacao_calc: "Status Homolog.",
  status_inicio_obra_calc: "Status Inicio Obra",
  status_regra_casa_civil_calc: "Regra Casa Civil",
  urgencia_suspensiva_calc: "Urgencia Susp.",
};

const natureLabels = {
  dados_origem: "Mudança de dado",
  derivado_regra: "Mudança derivada",
  derivado_tempo: "Prazo/status automático",
  novo_registro: "Novo registro",
  registro_removido: "Registro removido",
};

function fmt(v, campo) {
  if (v == null || v === "") return "(vazio)";
  if (v instanceof Date) return formatDate(v);
  if (typeof v === "number") return v.toLocaleString("pt-BR");
  if (campo === "vlr_repasse_tci" && v !== "" && !isNaN(v)) {
    return Number(v).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2});
  }
  return String(v);
}

const alteracaoRows = rawChanges.map(d => ({
  data: d.data,
  data_fmt: fmt(d.data),
  categoria: d.categoria || "—",
  natureza_raw: d.natureza || "derivado_regra",
  natureza: natureLabels[d.natureza] || "Mudança derivada",
  num_convenio: d.num_convenio || "—",
  cod_tci: d.cod_tci || "—",
  uf: d.uf || "—",
  secretaria: d.secretaria || "—",
  tipo: d.tipo || "—",
  campo_original: d.campo,
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

const eventosAlteracao = new Set(
  alteracaoRows.map((d) => {
    const key = d.num_convenio !== "—" ? d.num_convenio : d.cod_tci;
    const day = d.data instanceof Date ? d.data.toISOString().slice(0, 10) : "sem-data";
    return `${day}:${key}:${d.tipo}`;
  })
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
const totalCamposAlterados = alteracaoRows.length;
const totalEmpreendimentos = empreendimentosAlterados.size;
const totalEventos = eventosAlteracao.size;
const mudancasDeDados = alteracaoRows.filter(d => d.tipo === "Alterado" && d.natureza_raw === "dados_origem").length;
const mudancasDerivadas = alteracaoRows.filter(d => d.tipo === "Alterado" && d.natureza_raw === "derivado_regra").length;
const mudancasAutomaticas = alteracaoRows.filter(d => d.tipo === "Alterado" && d.natureza_raw === "derivado_tempo").length;

const alteracoesMetricGrid = metricGrid([
  { label: "Empreendimentos com alteração", value: formatNumber(totalEmpreendimentos), tone: "default" },
  { label: "Eventos entre snapshots", value: formatNumber(totalEventos), tone: "blue" },
  { label: "Mudanças de dado", value: formatNumber(mudancasDeDados), tone: "gold" },
  { label: "Mudanças derivadas", value: formatNumber(mudancasDerivadas), tone: "default" },
  { label: "Mudanças automáticas", value: formatNumber(mudancasAutomaticas), tone: "green" },
  { label: "Campos alterados", value: formatNumber(totalCamposAlterados), tone: "red" },
]);
alteracoesMetricGrid.classList.add("metrics-grid--alteracoes");
display(alteracoesMetricGrid);
```

<p class="metric-detail">Cada linha da tabela representa um campo alterado entre snapshots consecutivos. Os cards acima separam eventos por empreendimento das mudanças automáticas de prazo/status.</p>

<div class="table-shell">

```js
if (alteracaoRows.length > 0) {
  display(renderAlteracoesDataTable(alteracaoRows, invalidation));
} else {
  display(html`<p>Nenhuma alteração encontrada.</p>`);
}
```

</div>
