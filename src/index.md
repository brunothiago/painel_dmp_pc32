---
title: Painel PC 32 — Novo PAC Seleção
toc: false
---

```js
import * as Plot from "@observablehq/plot";
import * as XLSX from "xlsx";
import {dsvFormat} from "d3-dsv";
import {metricGrid} from "./components/cards.js";
import {cascadeChart, getUrgenciaBucket, matchesCascadeSelection} from "./components/cascade-chart.js";
import {formatNumber, formatCurrency, formatCurrencyCompact, formatPercent, formatDate} from "./lib/formatters.js";
import {SITUACAO_CORES, SUSPENSIVA_CORES} from "./lib/theme.js";

const rawText = await FileAttachment("data/base_pc_32.csv").text();
const dsv = dsvFormat(";");
const rawData = dsv.parse(rawText, (d) => ({
  cod_tci: d.cod_tci,
  num_convenio: d.num_convenio,
  secretaria: d.txt_sigla_secretaria,
  fase: d.dsc_fase_pac,
  modalidade: d.txt_modalidade,
  situacao: d.dsc_situacao_contrato_mcid,
  dt_assinatura: d.dte_assinatura_contrato,
  situacao_suspensiva: d.situacao_da_analise_suspensiva,
  dt_vencimento_suspensiva: d.vencimento_da_suspensiva,
  dt_retirada_suspensiva: d.dte_retirada_suspensiva,
  dt_lae: d.dte_primeira_data_lae,
  dt_pub_licitacao: d.dte_publicacao_licitacao,
  dt_homolog_licitacao: d.dte_homologacao_licitacao,
  dt_vrpl: d.dte_vrpl,
  dt_aio: d.dte_aio,
  dt_inicio_obra: d.dte_inicio_obra_mcid,
  vlr_repasse: +d.vlr_repasse || 0,
}));

const secretarias = [...new Set(rawData.map(d => d.secretaria).filter(Boolean))].sort();
const updatedAt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
}).format(new Date());
```

```js
const pageTitleBar = document.createElement("div");
pageTitleBar.className = "page-titlebar";
pageTitleBar.innerHTML = `
  <div class="page-titlebar__heading">
    <h1>Painel PC 32 — Novo PAC Seleção</h1>
  </div>
  <div class="page-titlebar__meta" aria-label="Data de atualização">
    <span class="page-titlebar__meta-label">Atualizado em</span>
    <strong class="page-titlebar__meta-value">${updatedAt}</strong>
  </div>
`;
display(pageTitleBar);
```

<div class="filters-bar">

```js
const fConvenio = view(Inputs.search(rawData, {
  placeholder: "Buscar por num. convênio ou TCI…",
  columns: ["num_convenio", "cod_tci"],
  label: "Convênio / TCI",
}));
```

```js
const fSecretaria = view(Inputs.select(
  ["Todas", ...secretarias],
  { label: "Secretaria", value: "Todas" }
));
```

```js
// Modalidade reage à secretaria selecionada
const modalidadesDaSecretaria = [
  "Todas",
  ...[...new Set(
    rawData
      .filter(d => fSecretaria === "Todas" || d.secretaria === fSecretaria)
      .map(d => d.modalidade)
      .filter(Boolean)
  )].sort()
];

const fModalidade = view(Inputs.select(
  modalidadesDaSecretaria,
  { label: "Modalidade", value: "Todas" }
));
```

</div>

```js
// ── baseData: filtros de topo
const baseData = fConvenio.filter(d =>
  (fSecretaria === "Todas" || d.secretaria === fSecretaria) &&
  (fModalidade === "Todas" || d.modalidade === fModalidade)
);

const SITUACAO_ORDER = [
  "Em Contratação",
  "Contratado - Suspensiva",
  "Contratado - Normal",
  "Contratado - Em Prestação de Contas",
  "Cancelado ou Distratado",
  "Não Identificado",
];

const SUSPENSIVA_ORDER = [
  "Doc. não enviada p/ análise",
  "Análise não iniciada",
  "Análise iniciada",
  "Analisada e rejeitada",
  "Analisada com pendências",
  "Analisada e aceita",
  "Suspensiva retirada",
];

const bySituacao = SITUACAO_ORDER
  .map(s => ({ situacao: s, qtd: baseData.filter(d => d.situacao === s).length }))
  .filter(d => d.qtd > 0);

const suspensivaCounts = d3.rollup(
  baseData.filter(d => d.situacao_suspensiva && d.situacao_suspensiva.trim() !== ""),
  v => v.length,
  d => d.situacao_suspensiva
);
const bySuspensiva = SUSPENSIVA_ORDER
  .map(s => ({ situacao_suspensiva: s, qtd: suspensivaCounts.get(s) ?? 0 }))
  .filter(d => d.qtd > 0);

// ── helper: gráfico clicável como input reativo
function makeClickableChart(plotEl, items, keyField) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  const input = Object.assign(wrapper, { value: null });

  const badge = document.createElement("div");
  badge.style.cssText = `
    display:none; position:absolute; top:0; right:0;
    background:#fff7ed; border:1px solid #fdba74; border-radius:999px;
    padding:0.2rem 0.65rem; font-size:0.75rem; font-weight:600;
    color:#9a3412; cursor:pointer; align-items:center;
  `;

  const rects = Array.from(plotEl.querySelectorAll("g[aria-label='bar'] rect"));

  function sync(sel) {
    rects.forEach(r => {
      r.style.opacity = sel == null || r.dataset.key === sel ? "1" : "0.2";
    });
    badge.style.display = sel != null ? "inline-flex" : "none";
    if (sel != null) badge.textContent = `${sel}  ×`;
  }

  function setVal(val) {
    input.value = val;
    sync(val);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  rects.forEach((r, i) => {
    if (i < items.length) {
      r.dataset.key = items[i][keyField];
      r.style.cursor = "pointer";
      r.addEventListener("click", e => {
        const key = r.dataset.key;
        setVal(input.value === key ? null : key);
        e.stopPropagation();
      });
    }
  });

  badge.addEventListener("click", e => { setVal(null); e.stopPropagation(); });
  plotEl.addEventListener("click", () => { if (input.value != null) setVal(null); });

  wrapper.append(plotEl, badge);
  return input;
}
```

```js
// ── data final: baseData + seleção dos gráficos
const data = baseData.filter(d =>
  (selectedSituacao == null || d.situacao === selectedSituacao) &&
  (selectedSuspensiva == null || d.situacao_suspensiva === selectedSuspensiva)
);

const total = data.length;
const comSuspensiva = data.filter(d => d.situacao === "Contratado - Suspensiva").length;
const semSuspensiva = data.filter(d => d.situacao === "Contratado - Normal").length;
const vlrTotal = data.reduce((s, d) => s + d.vlr_repasse, 0);
const pctSuspensiva = total > 0 ? comSuspensiva / total : 0;
const secretariaDrillField = fSecretaria === "Todas" ? "secretaria" : "modalidade";
const secretariaDrillLabel = secretariaDrillField === "secretaria" ? "Secretaria" : "Modalidade";
const secretariaDrillMarginLeft = secretariaDrillField === "secretaria" ? 90 : 240;
const secretariaDrillData = [...new Set(
  data
    .map(d => d[secretariaDrillField])
    .filter(Boolean)
)]
  .map((group) => {
    const rows = data.filter(d => d[secretariaDrillField] === group);
    return {
      group,
      contratos: rows.length,
      vlr_repasse: rows.reduce((sum, d) => sum + d.vlr_repasse, 0),
    };
  })
  .filter(d => d.contratos > 0)
  .sort((a, b) => b.contratos - a.contratos || b.vlr_repasse - a.vlr_repasse);
```

```js
display(metricGrid([
  { label: "Total selecionadas", value: formatNumber(total), tone: "default" },
  { label: "Com suspensiva", value: formatNumber(comSuspensiva), detail: formatPercent(pctSuspensiva) + " do total", tone: "gold" },
  { label: "Sem suspensiva (Normal)", value: formatNumber(semSuspensiva), detail: formatPercent(total > 0 ? semSuspensiva / total : 0) + " do total", tone: "green" },
  { label: "Valor total de repasse", value: formatCurrencyCompact(vlrTotal), tone: "blue" },
]));
```

<div class="grid-two">

<div class="card">

## Contratos por ${secretariaDrillLabel}

<p>Distribuição da quantidade de contratos na seleção atual</p>

```js
display(Plot.plot({
  marginLeft: secretariaDrillMarginLeft,
  marginRight: 90,
  height: Math.max(180, secretariaDrillData.length * 52 + 40),
  style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
  x: { label: null, grid: false, axis: null },
  y: { label: null, domain: secretariaDrillData.map(d => d.group) },
  marks: [
    Plot.barX(secretariaDrillData, {
      x: "contratos",
      y: "group",
      fill: "#356c8c",
      rx: 6,
    }),
    Plot.text(secretariaDrillData, {
      x: "contratos",
      y: "group",
      text: d => formatNumber(d.contratos),
      dx: 6,
      textAnchor: "start",
      fontSize: 12,
      fill: "#5b6470",
    }),
  ],
}));
```

</div>

<div class="card">

## Repasse por ${secretariaDrillLabel}

<p>Distribuição do valor total de repasse na seleção atual</p>

```js
display(Plot.plot({
  marginLeft: secretariaDrillMarginLeft,
  marginRight: 110,
  height: Math.max(180, secretariaDrillData.length * 52 + 40),
  style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
  x: { label: null, grid: false, axis: null },
  y: { label: null, domain: secretariaDrillData.map(d => d.group) },
  marks: [
    Plot.barX(secretariaDrillData, {
      x: "vlr_repasse",
      y: "group",
      fill: "#0f766e",
      rx: 6,
    }),
    Plot.text(secretariaDrillData, {
      x: "vlr_repasse",
      y: "group",
      text: d => formatCurrencyCompact(d.vlr_repasse),
      dx: 6,
      textAnchor: "start",
      fontSize: 12,
      fill: "#5b6470",
    }),
  ],
}));
```

</div>

</div>

<div class="grid-two">

<div class="card">

## Situação do Contrato

<p>Clique em uma barra para filtrar</p>

```js
const selectedSituacao = view(makeClickableChart(
  Plot.plot({
    marginLeft: 220, marginRight: 50,
    height: Math.max(180, bySituacao.length * 44 + 40),
    style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
    x: { label: "Quantidade", grid: true },
    y: { label: null, domain: bySituacao.map(d => d.situacao) },
    marks: [
      Plot.barX(bySituacao, {
        x: "qtd", y: "situacao",
        fill: d => SITUACAO_CORES[d.situacao] ?? "#8a94a3", rx: 6,
      }),
      Plot.text(bySituacao, {
        x: "qtd", y: "situacao",
        text: d => formatNumber(d.qtd),
        dx: 6, textAnchor: "start", fontSize: 12, fill: "#5b6470",
      }),
    ],
  }),
  bySituacao, "situacao"
));
```

</div>

<div class="card">

## Situação da Análise Suspensiva

<p>Clique em uma barra para filtrar</p>

```js
const selectedSuspensiva = view(makeClickableChart(
  Plot.plot({
    marginLeft: 230, marginRight: 50,
    height: Math.max(180, bySuspensiva.length * 44 + 40),
    style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
    x: { label: "Quantidade", grid: true },
    y: { label: null, domain: bySuspensiva.map(d => d.situacao_suspensiva) },
    marks: [
      Plot.barX(bySuspensiva, {
        x: "qtd", y: "situacao_suspensiva",
        fill: d => SUSPENSIVA_CORES[d.situacao_suspensiva] ?? "#8a94a3", rx: 6,
      }),
      Plot.text(bySuspensiva, {
        x: "qtd", y: "situacao_suspensiva",
        text: d => formatNumber(d.qtd),
        dx: 6, textAnchor: "start", fontSize: 12, fill: "#5b6470",
      }),
    ],
  }),
  bySuspensiva, "situacao_suspensiva"
));
```

</div>

</div>

<div class="card">

## Análise de Suspensivas — Quebra por etapas

<p>Cascata proporcional: do total à urgência de vencimento</p>

```js
const today = new Date();

const comSuspData = data.filter(d => d.situacao === "Contratado - Suspensiva");
const pendentes = comSuspData.filter(d => !d.dt_retirada_suspensiva);
const vencida = pendentes.filter(d => getUrgenciaBucket(d, today) === "Vencida").length;
const prox30  = pendentes.filter(d => getUrgenciaBucket(d, today) === "Próximos 30 dias").length;

if (vencida > 0 || prox30 > 0) {
  const alertEl = document.createElement("div");
  alertEl.className = "urgency-alert";
  alertEl.innerHTML = `
    <div class="urgency-alert__icon">⚠️</div>
    <div class="urgency-alert__body">
      <div class="urgency-alert__title">Atenção: suspensivas com prazo crítico</div>
      <div class="urgency-alert__text">
        ${vencida > 0 ? `<strong>${formatNumber(vencida)}</strong> contrato${vencida > 1 ? "s" : ""} com suspensiva <strong>já vencida</strong>.` : ""}
        ${prox30 > 0 ? ` <strong>${formatNumber(prox30)}</strong> contrato${prox30 > 1 ? "s" : ""} vencem nos <strong>próximos 30 dias</strong>.` : ""}
      </div>
    </div>
  `;
  display(alertEl);
}

const selectedCascade = view(cascadeChart(data, today));
```

</div>

<div class="table-shell">

## Base de Dados

```js
const PAGE_SIZE = 50;
const tableData = data.filter(d => matchesCascadeSelection(d, selectedCascade, today));

const totalPages = Math.max(1, Math.ceil(tableData.length / PAGE_SIZE));
const exportColumns = [
  "num_convenio", "cod_tci", "secretaria", "fase", "modalidade",
  "situacao", "situacao_suspensiva", "dt_assinatura", "dt_vencimento_suspensiva",
  "dt_retirada_suspensiva", "dt_lae", "dt_pub_licitacao", "dt_homolog_licitacao",
  "dt_vrpl", "dt_aio", "dt_inicio_obra", "vlr_repasse",
];
const exportHeaders = {
  num_convenio: "Convênio",
  cod_tci: "TCI",
  secretaria: "Secretaria",
  fase: "Fase",
  modalidade: "Modalidade",
  situacao: "Situação Contrato",
  situacao_suspensiva: "Situação Suspensiva",
  dt_vencimento_suspensiva: "Venc. Suspensiva",
  dt_retirada_suspensiva: "Retirada Suspensiva",
  dt_assinatura: "Assinatura",
  dt_lae: "LAE",
  dt_pub_licitacao: "Pub. Licitação",
  dt_homolog_licitacao: "Homolog. Licitação",
  dt_vrpl: "VRPL",
  dt_aio: "AIO",
  dt_inicio_obra: "Início Obra",
  vlr_repasse: "Repasse (R$)",
};

function makePager(total, totalRows, pageSize) {
  const el = Object.assign(document.createElement("div"), { value: 1 });
  el.className = "pager";

  function render(cur) {
    el.innerHTML = "";
    const from = (cur - 1) * pageSize + 1;
    const to = Math.min(cur * pageSize, totalRows);
    const info = document.createElement("span");
    info.className = "pager-info";
    info.textContent = `${from}–${to} de ${totalRows}`;
    el.appendChild(info);

    const MAX_VISIBLE = 7;
    let pages = [];

    if (total <= MAX_VISIBLE) {
      pages = Array.from({ length: total }, (_, i) => i + 1);
    } else {
      pages = [1];
      const left = Math.max(2, cur - 2);
      const right = Math.min(total - 1, cur + 2);
      if (left > 2) pages.push("…");
      for (let i = left; i <= right; i++) pages.push(i);
      if (right < total - 1) pages.push("…");
      pages.push(total);
    }

    // prev
    const prev = document.createElement("button");
    prev.textContent = "‹";
    prev.className = "pager-btn" + (cur === 1 ? " disabled" : "");
    prev.disabled = cur === 1;
    prev.addEventListener("click", () => go(cur - 1));
    el.appendChild(prev);

    for (const p of pages) {
      const btn = document.createElement(p === "…" ? "span" : "button");
      btn.textContent = p;
      if (p === "…") {
        btn.className = "pager-ellipsis";
      } else {
        btn.className = "pager-btn" + (p === cur ? " active" : "");
        btn.addEventListener("click", () => go(p));
      }
      el.appendChild(btn);
    }

    // next
    const next = document.createElement("button");
    next.textContent = "›";
    next.className = "pager-btn" + (cur === total ? " disabled" : "");
    next.disabled = cur === total;
    next.addEventListener("click", () => go(cur + 1));
    el.appendChild(next);
  }

  function go(p) {
    el.value = p;
    render(p);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  render(1);
  return el;
}

function makeExportButton(rows) {
  const btn = document.createElement("button");
  btn.className = "export-btn";
  btn.type = "button";
  btn.textContent = `Exportar tabela filtrada (${rows.length})`;
  btn.disabled = rows.length === 0;

  btn.addEventListener("click", () => {
    const dateColumns = new Set([
      "dt_vencimento_suspensiva",
      "dt_retirada_suspensiva",
      "dt_assinatura",
      "dt_lae",
      "dt_pub_licitacao",
      "dt_homolog_licitacao",
      "dt_vrpl",
      "dt_aio",
      "dt_inicio_obra",
    ]);

    const exportRows = rows.map((row) => {
      const exportRow = {};
      for (const col of exportColumns) {
        let value = row[col] ?? "";
        if (col === "vlr_repasse" && value !== "") value = Number(value) || 0;
        if (dateColumns.has(col)) value = value ? formatDate(value) : "";
        exportRow[exportHeaders[col] ?? col] = value;
      }
      return exportRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const currencyColIndex = exportColumns.indexOf("vlr_repasse");
    const currencyColName = XLSX.utils.encode_col(currencyColIndex);
    for (let rowIndex = 2; rowIndex <= exportRows.length + 1; rowIndex += 1) {
      const cellRef = `${currencyColName}${rowIndex}`;
      if (worksheet[cellRef]) worksheet[cellRef].z = "#,##0.00";
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tabela Filtrada");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFileXLSX(workbook, `pc32-tabela-filtrada-${stamp}.xlsx`);
  });

  return btn;
}

function makeTableControls(rows, totalPages, pageSize) {
  const wrap = document.createElement("div");
  wrap.className = "table-controls";
  const pagerView = makePager(totalPages, rows.length, pageSize);
  const exportBtn = makeExportButton(rows);
  wrap.value = pagerView.value;
  pagerView.addEventListener("input", () => {
    wrap.value = pagerView.value;
    wrap.dispatchEvent(new Event("input", {bubbles: true}));
  });
  wrap.append(pagerView, exportBtn);
  return wrap;
}

const pageNum = view(makeTableControls(tableData, totalPages, PAGE_SIZE));
```

```js
const pageData = tableData.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);
const dateCol = d => d || "—";
display(Inputs.table(pageData, {
  columns: exportColumns,
  select: false,
  header: {
    num_convenio: "Convênio", cod_tci: "TCI", secretaria: "Secretaria",
    fase: "Fase", modalidade: "Modalidade", situacao: "Situação Contrato",
    situacao_suspensiva: "Situação Suspensiva",
    dt_vencimento_suspensiva: "Venc. Suspensiva", dt_retirada_suspensiva: "Retirada Suspensiva",
    dt_assinatura: "Assinatura", dt_lae: "LAE", dt_pub_licitacao: "Pub. Licitação",
    dt_homolog_licitacao: "Homolog. Licitação", dt_vrpl: "VRPL", dt_aio: "AIO",
    dt_inicio_obra: "Início Obra", vlr_repasse: "Repasse (R$)",
  },
  format: {
    vlr_repasse: d => d.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    dt_assinatura: dateCol, dt_lae: dateCol, dt_pub_licitacao: dateCol,
    dt_homolog_licitacao: dateCol, dt_vrpl: dateCol, dt_aio: dateCol,
    dt_inicio_obra: dateCol, dt_vencimento_suspensiva: dateCol, dt_retirada_suspensiva: dateCol,
  },
  rows: PAGE_SIZE,
  multiple: false,
}));
```

</div>
