---
title: Painel PC 32 — Novo PAC Seleção
toc: false
---

```js
import * as Plot from "@observablehq/plot";
import * as XLSX from "xlsx";
import {html} from "htl";
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

const today = new Date();
const DAY_MS = 24 * 60 * 60 * 1000;
const DATA_LIMITE_LICITACAO_CASA_CIVIL = "2026-03-31";
const LICITACAO_PRAZO_ORDER = ["Vencida", "Próximos 30 dias", "No prazo"];
const LICITACAO_CORES = {
  "Aguardando publicação": "#b45309",
  "Publicada": "#0f766e",
  "Homologação pendente": "#b45309",
  "Homologada": "#0f766e",
  "Vencida": "#b42318",
  "Próximos 30 dias": "#f59e0b",
  "No prazo": "#356c8c",
};

function parseUtcDate(value) {
  return value ? new Date(`${value}T12:00:00Z`) : null;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addBusinessDays(date, businessDays) {
  const next = new Date(date);
  let added = 0;
  while (added < businessDays) {
    next.setUTCDate(next.getUTCDate() + 1);
    const day = next.getUTCDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return next;
}

function toIsoDate(date) {
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
}

function getDeadlineBucket(deadline, today = new Date()) {
  if (!deadline) return null;
  const diff = parseUtcDate(deadline) - today;
  if (diff < 0) return "Vencida";
  if (diff <= 30 * DAY_MS) return "Próximos 30 dias";
  return "No prazo";
}

function getPrazoPublicacao(d) {
  if (!d.dt_retirada_suspensiva) return null;
  return toIsoDate(addDays(parseUtcDate(d.dt_retirada_suspensiva), 120));
}

function getPrazoHomologacao(d) {
  if (!d.dt_pub_licitacao) return null;
  return toIsoDate(addDays(parseUtcDate(d.dt_pub_licitacao), 120));
}

function getStatusPublicacao(d, today = new Date()) {
  if (!d.dt_retirada_suspensiva || d.situacao === "Cancelado ou Distratado") return null;
  const prazo = getPrazoPublicacao(d);
  if (d.dt_pub_licitacao) {
    return parseUtcDate(d.dt_pub_licitacao) <= parseUtcDate(prazo)
      ? "Concluída no prazo"
      : "Concluída em atraso";
  }
  return getDeadlineBucket(prazo, today);
}

function getStatusHomologacao(d, today = new Date()) {
  if (d.dt_homolog_licitacao && !d.dt_pub_licitacao) return "Inconsistência de base";
  if (!d.dt_pub_licitacao || d.situacao === "Cancelado ou Distratado") return null;
  const prazo = getPrazoHomologacao(d);
  if (d.dt_homolog_licitacao) {
    return parseUtcDate(d.dt_homolog_licitacao) <= parseUtcDate(prazo)
      ? "Concluída no prazo"
      : "Concluída em atraso";
  }
  return getDeadlineBucket(prazo, today);
}

function getStatusRegraCasaCivil(d) {
  if (d.situacao === "Cancelado ou Distratado") return "Fora do escopo";
  const limite = parseUtcDate(DATA_LIMITE_LICITACAO_CASA_CIVIL);
  const pubOk = d.dt_pub_licitacao && parseUtcDate(d.dt_pub_licitacao) <= limite;
  const homologOk = d.dt_homolog_licitacao && parseUtcDate(d.dt_homolog_licitacao) <= limite;
  const osOk = d.dt_inicio_obra && parseUtcDate(d.dt_inicio_obra) <= limite;
  return pubOk && homologOk && osOk ? "Cumpriu" : "Não cumpriu";
}

function countBusinessDaysRemaining(start, end) {
  if (!start || !end) return null;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const target = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  let count = 0;
  const step = cursor <= target ? 1 : -1;

  while (cursor.getTime() !== target.getTime()) {
    cursor.setUTCDate(cursor.getUTCDate() + step);
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) count += step;
  }

  return count;
}

function getPrazoInicioObra(d) {
  if (!d.dt_aio) return null;
  return toIsoDate(addBusinessDays(parseUtcDate(d.dt_aio), 10));
}

function getStatusInicioObra(d, today = new Date()) {
  if (!d.dt_aio || d.situacao === "Cancelado ou Distratado") return null;
  const prazo = getPrazoInicioObra(d);
  if (d.dt_inicio_obra) {
    return parseUtcDate(d.dt_inicio_obra) <= parseUtcDate(prazo)
      ? "Iniciada no prazo"
      : "Iniciada em atraso";
  }
  const remaining = countBusinessDaysRemaining(today, parseUtcDate(prazo));
  if (remaining < 0) return "Prazo vencido";
  if (remaining <= 10) return "Próximos 10 dias úteis";
  return "No prazo";
}

function makeFlowElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function makeFlowLevel(title, subtitle, items, total, options = {}) {
  const {filterKey, selectedValue, onSelect} = options;
  const wrap = makeFlowElement("div", "casc-level");
  const header = makeFlowElement("div", "casc-level__header");
  header.append(
    makeFlowElement("strong", "casc-level__title", title),
    makeFlowElement("span", "casc-level__subtitle", subtitle)
  );

  const filteredItems = items.filter(item => item.qtd > 0);
  const bar = makeFlowElement("div", "casc-bar");
  for (const item of filteredItems) {
    const pct = total > 0 ? (item.qtd / total) * 100 : 0;
    const seg = makeFlowElement("div", "casc-bar__seg");
    seg.style.cssText = `width:${pct}%;background:${item.color};`;
    seg.title = `${item.label}: ${item.qtd.toLocaleString("pt-BR")} (${pct.toFixed(1)}%)`;
    if (filterKey) {
      seg.classList.add("is-clickable");
      if (selectedValue === item.label) seg.classList.add("is-selected");
      seg.setAttribute("role", "button");
      seg.tabIndex = 0;
      seg.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect(filterKey, item.label);
      });
      seg.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(filterKey, item.label);
        }
      });
    }
    if (pct > 4) seg.append(makeFlowElement("span", "casc-bar__seg-num", item.qtd.toLocaleString("pt-BR")));
    bar.append(seg);
  }

  const legend = makeFlowElement("div", "casc-legend");
  for (const item of filteredItems) {
    const pct = total > 0 ? (item.qtd / total) * 100 : 0;
    const row = makeFlowElement("div", "casc-legend__item");
    if (filterKey) {
      row.classList.add("is-clickable");
      if (selectedValue === item.label) row.classList.add("is-selected");
      row.setAttribute("role", "button");
      row.tabIndex = 0;
      row.addEventListener("click", () => onSelect(filterKey, item.label));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(filterKey, item.label);
        }
      });
    }
    const dot = makeFlowElement("span", "casc-legend__dot");
    dot.style.background = item.color;
    const txt = makeFlowElement("span", "casc-legend__text");
    txt.innerHTML = `<strong>${item.label}</strong> <span>${item.qtd.toLocaleString("pt-BR")}</span>`;
    const pctEl = makeFlowElement("span", "casc-legend__pct", `${pct.toFixed(1)}%`);
    pctEl.style.color = item.color;
    txt.append(pctEl);
    row.append(dot, txt);
    legend.append(row);
  }

  wrap.append(header, bar, legend);
  return wrap;
}

function makeFlowConnector(label) {
  const wrap = makeFlowElement("div", "casc-connector");
  wrap.append(
    makeFlowElement("div", "casc-connector__line"),
    makeFlowElement("span", "casc-connector__label", label)
  );
  return wrap;
}

function matchesLicitacaoSelection(d, selection = {}) {
  return (
    (selection.pub_etapa == null ||
      (selection.pub_etapa === "Aguardando publicação" ? !d.dt_pub_licitacao && !!d.dt_retirada_suspensiva : !!d.dt_pub_licitacao)) &&
    (selection.pub_prazo == null ||
      (!d.dt_pub_licitacao && d.status_pub_licitacao === selection.pub_prazo)) &&
    (selection.homolog_etapa == null ||
      (selection.homolog_etapa === "Homologação pendente" ? !!d.dt_pub_licitacao && !d.dt_homolog_licitacao : !!d.dt_homolog_licitacao)) &&
    (selection.homolog_prazo == null ||
      (!!d.dt_pub_licitacao && !d.dt_homolog_licitacao && d.status_homolog_licitacao === selection.homolog_prazo))
  );
}

function renderLicitacaoFlow(data, today = new Date()) {
  const container = Object.assign(makeFlowElement("div", "casc-chart"), {
    value: {pub_etapa: null, pub_prazo: null, homolog_etapa: null, homolog_prazo: null}
  });

  function setFilter(key, label) {
    container.value = {
      ...container.value,
      [key]: container.value[key] === label ? null : label
    };
    render();
    container.dispatchEvent(new Event("input", {bubbles: true}));
  }

  const clear = makeFlowElement("button", "casc-clear", "Limpar seleção");
  clear.type = "button";
  clear.hidden = true;
  clear.addEventListener("click", () => {
    container.value = {pub_etapa: null, pub_prazo: null, homolog_etapa: null, homolog_prazo: null};
    render();
    container.dispatchEvent(new Event("input", {bubbles: true}));
  });

  function render() {
    container.innerHTML = "";
    clear.hidden = !Object.values(container.value).some(Boolean);
    container.append(clear);

    const base = data
      .filter(d => d.dt_retirada_suspensiva && d.situacao !== "Cancelado ou Distratado")
      .filter(d => matchesLicitacaoSelection(d, container.value));

    if (base.length === 0) {
      container.append(makeFlowElement("p", "casc-empty", "Nenhum contrato corresponde à seleção atual na análise de licitação."));
      return;
    }

    const aguardandoPublicacao = base.filter(d => !d.dt_pub_licitacao);
    const publicadas = base.filter(d => d.dt_pub_licitacao);
    container.append(
      makeFlowLevel(
        `${base.length.toLocaleString("pt-BR")} contratos com retirada de suspensiva`,
        "por etapa da publicação da licitação",
        [
          { label: "Aguardando publicação", qtd: aguardandoPublicacao.length, color: LICITACAO_CORES["Aguardando publicação"] },
          { label: "Publicada", qtd: publicadas.length, color: LICITACAO_CORES["Publicada"] },
        ],
        base.length,
        {
          filterKey: "pub_etapa",
          selectedValue: container.value.pub_etapa,
          onSelect: setFilter
        }
      )
    );

    if (aguardandoPublicacao.length > 0) {
      container.append(makeFlowConnector("publicação até 120 dias após a retirada da suspensiva"));
      container.append(
        makeFlowLevel(
          `${aguardandoPublicacao.length.toLocaleString("pt-BR")} contratos aguardando publicação`,
          "por urgência do prazo de publicação",
          LICITACAO_PRAZO_ORDER.map(label => ({
            label,
            qtd: aguardandoPublicacao.filter(d => d.status_pub_licitacao === label).length,
            color: LICITACAO_CORES[label],
          })),
          aguardandoPublicacao.length,
          {
            filterKey: "pub_prazo",
            selectedValue: container.value.pub_prazo,
            onSelect: setFilter
          }
        )
      );
    }

    if (publicadas.length > 0) {
      const homologacaoPendente = publicadas.filter(d => !d.dt_homolog_licitacao);
      const homologadas = publicadas.filter(d => d.dt_homolog_licitacao);

      container.append(makeFlowConnector("homologação até 120 dias após a publicação"));
      container.append(
        makeFlowLevel(
          `${publicadas.length.toLocaleString("pt-BR")} contratos com licitação publicada`,
          "por etapa da homologação",
          [
            { label: "Homologação pendente", qtd: homologacaoPendente.length, color: LICITACAO_CORES["Homologação pendente"] },
            { label: "Homologada", qtd: homologadas.length, color: LICITACAO_CORES["Homologada"] },
          ],
          publicadas.length,
          {
            filterKey: "homolog_etapa",
            selectedValue: container.value.homolog_etapa,
            onSelect: setFilter
          }
        )
      );

      if (homologacaoPendente.length > 0) {
        container.append(makeFlowConnector("homologação pendente por urgência do prazo"));
        container.append(
          makeFlowLevel(
            `${homologacaoPendente.length.toLocaleString("pt-BR")} contratos aguardando homologação`,
            "por urgência do prazo de homologação",
            LICITACAO_PRAZO_ORDER.map(label => ({
              label,
              qtd: homologacaoPendente.filter(d => d.status_homolog_licitacao === label).length,
              color: LICITACAO_CORES[label],
            })),
            homologacaoPendente.length,
            {
              filterKey: "homolog_prazo",
              selectedValue: container.value.homolog_prazo,
              onSelect: setFilter
            }
          )
        );
      }
    }
  }

  render();
  return container;
}

function matchesCasaCivilSelection(d, selection = null) {
  return selection == null || d.status_regra_casa_civil === selection;
}

function matchesInicioObraSelection(d, selection = null) {
  return selection == null || d.status_inicio_obra === selection;
}
```

```js
// ── data final: baseData + seleção dos gráficos
const data = baseData.filter(d =>
  (selectedSituacao == null || d.situacao === selectedSituacao) &&
  (selectedSuspensiva == null || d.situacao_suspensiva === selectedSuspensiva)
).map(d => ({
  ...d,
  data_limite_licitacao_casa_civil: DATA_LIMITE_LICITACAO_CASA_CIVIL,
  status_regra_casa_civil: getStatusRegraCasaCivil(d),
  prazo_pub_licitacao: getPrazoPublicacao(d),
  status_pub_licitacao: getStatusPublicacao(d, today),
  prazo_homolog_licitacao: getPrazoHomologacao(d),
  status_homolog_licitacao: getStatusHomologacao(d, today),
  prazo_inicio_obra: getPrazoInicioObra(d),
  status_inicio_obra: getStatusInicioObra(d, today),
}));

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

<div class="card card--suspensiva-analysis">

## Análise de Suspensivas — Quebra por etapas

<p>Cascata proporcional: do total à urgência de vencimento</p>

```js
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

<div class="card card--licitacao-analysis">

## Análise de Licitação — Prazos de publicação e homologação

<p>Publicação até 120 dias após a retirada da suspensiva; homologação até 120 dias após a publicação da licitação.</p>

```js
const licitacaoBase = data.filter(d => d.dt_retirada_suspensiva && d.situacao !== "Cancelado ou Distratado");
const aguardandoPublicacao = licitacaoBase.filter(d => !d.dt_pub_licitacao);
const publicacaoVencida = aguardandoPublicacao.filter(d => d.status_pub_licitacao === "Vencida").length;
const publicacaoProx30 = aguardandoPublicacao.filter(d => d.status_pub_licitacao === "Próximos 30 dias").length;
const publicadas = licitacaoBase.filter(d => d.dt_pub_licitacao);
const homologacaoPendente = publicadas.filter(d => !d.dt_homolog_licitacao);
const homologacaoVencida = homologacaoPendente.filter(d => d.status_homolog_licitacao === "Vencida").length;
const homologacaoProx30 = homologacaoPendente.filter(d => d.status_homolog_licitacao === "Próximos 30 dias").length;
const cumprimentoCasaCivil = [
  { status: "Cumpriu", qtd: licitacaoBase.filter(d => d.status_regra_casa_civil === "Cumpriu").length, color: "#0f766e" },
  { status: "Não cumpriu", qtd: licitacaoBase.filter(d => d.status_regra_casa_civil === "Não cumpriu").length, color: "#b42318" },
  { status: "Fora do escopo", qtd: data.filter(d => d.status_regra_casa_civil === "Fora do escopo").length, color: "#6b7280" },
].filter(d => d.qtd > 0);

display(metricGrid([
  { label: "Com retirada de suspensiva", value: formatNumber(licitacaoBase.length), tone: "default" },
  { label: "Aguardando publicação", value: formatNumber(aguardandoPublicacao.length), detail: formatPercent(licitacaoBase.length > 0 ? aguardandoPublicacao.length / licitacaoBase.length : 0) + " com retirada de suspensiva", tone: "gold" },
  { label: "Publicação vencida", value: formatNumber(publicacaoVencida), detail: "prazo de 120 dias após retirada da suspensiva", tone: "red" },
  { label: "Publicação nos próximos 30 dias", value: formatNumber(publicacaoProx30), tone: "gold" },
  { label: "Homologação vencida", value: formatNumber(homologacaoVencida), detail: "prazo de 120 dias após publicação", tone: "red" },
  { label: "Homologação nos próximos 30 dias", value: formatNumber(homologacaoProx30), tone: "gold" },
]));
```

<p>Cumprimento do prazo da Casa Civil para publicação do edital, conclusão da licitação e emissão da ordem de serviço até 31/03/2026.</p>

```js
const selectedCasaCivil = view(makeClickableChart(
  Plot.plot({
    marginLeft: 140,
    marginRight: 50,
    height: Math.max(160, cumprimentoCasaCivil.length * 44 + 36),
    style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
    x: { label: "Contratos", grid: true },
    y: { label: null, domain: cumprimentoCasaCivil.map(d => d.status) },
    marks: [
      Plot.barX(cumprimentoCasaCivil, {
        x: "qtd",
        y: "status",
        fill: "color",
        rx: 6,
      }),
      Plot.text(cumprimentoCasaCivil, {
        x: "qtd",
        y: "status",
        text: d => formatNumber(d.qtd),
        dx: 6,
        textAnchor: "start",
        fontSize: 12,
        fill: "#5b6470",
      }),
    ],
  }),
  cumprimentoCasaCivil, "status"
));
```

```js
if (publicacaoVencida > 0 || publicacaoProx30 > 0 || homologacaoVencida > 0 || homologacaoProx30 > 0) {
  const alertEl = document.createElement("div");
  alertEl.className = "urgency-alert";
  alertEl.innerHTML = `
    <div class="urgency-alert__icon">⚠️</div>
    <div class="urgency-alert__body">
      <div class="urgency-alert__title">Atenção: licitações com prazo crítico</div>
      <div class="urgency-alert__text">
        ${publicacaoVencida > 0 ? `<strong>${formatNumber(publicacaoVencida)}</strong> contrato${publicacaoVencida > 1 ? "s" : ""} com <strong>publicação vencida</strong>. ` : ""}
        ${publicacaoProx30 > 0 ? `<strong>${formatNumber(publicacaoProx30)}</strong> contrato${publicacaoProx30 > 1 ? "s" : ""} com publicação nos <strong>próximos 30 dias</strong>. ` : ""}
        ${homologacaoVencida > 0 ? `<strong>${formatNumber(homologacaoVencida)}</strong> contrato${homologacaoVencida > 1 ? "s" : ""} com <strong>homologação vencida</strong>. ` : ""}
        ${homologacaoProx30 > 0 ? `<strong>${formatNumber(homologacaoProx30)}</strong> contrato${homologacaoProx30 > 1 ? "s" : ""} com homologação nos <strong>próximos 30 dias</strong>.` : ""}
      </div>
    </div>
  `;
  display(alertEl);
}
```

```js
const selectedLicitacao = view(renderLicitacaoFlow(data, today));
```

</div>

<div class="card card--inicio-obra-analysis">

## Análise de Início da Obra — Prazo após AIO

<p>Monitoramento do prazo de início da obra: até 10 dias úteis após a data de AIO.</p>

```js
const inicioObraBase = data.filter(d => d.dt_aio && d.situacao !== "Cancelado ou Distratado");
const inicioPrazoVencido = inicioObraBase.filter(d => d.status_inicio_obra === "Prazo vencido").length;
const inicioProx10 = inicioObraBase.filter(d => d.status_inicio_obra === "Próximos 10 dias úteis").length;
const inicioNoPrazo = inicioObraBase.filter(d => d.status_inicio_obra === "No prazo").length;
const iniciadaNoPrazo = inicioObraBase.filter(d => d.status_inicio_obra === "Iniciada no prazo").length;
const iniciadaEmAtraso = inicioObraBase.filter(d => d.status_inicio_obra === "Iniciada em atraso").length;
const inicioObraChart = [
  { status: "Iniciada no prazo", qtd: iniciadaNoPrazo, color: "#0f766e" },
  { status: "Iniciada em atraso", qtd: iniciadaEmAtraso, color: "#b42318" },
  { status: "No prazo", qtd: inicioNoPrazo, color: "#356c8c" },
  { status: "Próximos 10 dias úteis", qtd: inicioProx10, color: "#f59e0b" },
  { status: "Prazo vencido", qtd: inicioPrazoVencido, color: "#b42318" },
].filter(d => d.qtd > 0);

display(metricGrid([
  { label: "Com AIO", value: formatNumber(inicioObraBase.length), tone: "default" },
  { label: "Iniciada no prazo", value: formatNumber(iniciadaNoPrazo), tone: "green" },
  { label: "Iniciada em atraso", value: formatNumber(iniciadaEmAtraso), tone: "red" },
  { label: "Prazo vencido", value: formatNumber(inicioPrazoVencido), tone: "red" },
  { label: "Próximos 10 dias úteis", value: formatNumber(inicioProx10), tone: "gold" },
  { label: "No prazo", value: formatNumber(inicioNoPrazo), tone: "blue" },
]));
```

```js
const selectedInicioObra = view(makeClickableChart(
  Plot.plot({
    marginLeft: 160,
    marginRight: 50,
    height: Math.max(170, inicioObraChart.length * 44 + 36),
    style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
    x: { label: "Contratos", grid: true },
    y: { label: null, domain: inicioObraChart.map(d => d.status) },
    marks: [
      Plot.barX(inicioObraChart, {
        x: "qtd",
        y: "status",
        fill: "color",
        rx: 6,
      }),
      Plot.text(inicioObraChart, {
        x: "qtd",
        y: "status",
        text: d => formatNumber(d.qtd),
        dx: 6,
        textAnchor: "start",
        fontSize: 12,
        fill: "#5b6470",
      }),
    ],
  }),
  inicioObraChart, "status"
));
```

```js
if (inicioPrazoVencido > 0 || inicioProx10 > 0) {
  const alertEl = document.createElement("div");
  alertEl.className = "urgency-alert";
  alertEl.innerHTML = `
    <div class="urgency-alert__icon">⚠️</div>
    <div class="urgency-alert__body">
      <div class="urgency-alert__title">Atenção: início de obra com prazo crítico</div>
      <div class="urgency-alert__text">
        ${inicioPrazoVencido > 0 ? `<strong>${formatNumber(inicioPrazoVencido)}</strong> contrato${inicioPrazoVencido > 1 ? "s" : ""} com <strong>prazo vencido</strong> para início da obra. ` : ""}
        ${inicioProx10 > 0 ? `<strong>${formatNumber(inicioProx10)}</strong> contrato${inicioProx10 > 1 ? "s" : ""} nos <strong>próximos 10 dias úteis</strong> para início da obra.` : ""}
      </div>
    </div>
  `;
  display(alertEl);
}
```

</div>

<div class="table-shell">

## Base de Dados

```js
const PAGE_SIZE = 50;
const tableData = data.filter(d =>
  matchesCascadeSelection(d, selectedCascade, today) &&
  matchesLicitacaoSelection(d, selectedLicitacao) &&
  matchesCasaCivilSelection(d, selectedCasaCivil) &&
  matchesInicioObraSelection(d, selectedInicioObra)
);

const totalPages = Math.max(1, Math.ceil(tableData.length / PAGE_SIZE));
const exportColumns = [
  "num_convenio", "cod_tci", "secretaria", "fase", "modalidade",
  "situacao", "situacao_suspensiva", "dt_assinatura", "dt_vencimento_suspensiva",
  "dt_retirada_suspensiva", "dt_lae", "data_limite_licitacao_casa_civil", "status_regra_casa_civil", "prazo_pub_licitacao", "status_pub_licitacao",
  "dt_pub_licitacao", "prazo_homolog_licitacao", "status_homolog_licitacao", "dt_homolog_licitacao",
  "dt_vrpl", "dt_aio", "prazo_inicio_obra", "status_inicio_obra", "dt_inicio_obra", "vlr_repasse",
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
  data_limite_licitacao_casa_civil: "Data Limite de Licitação Casa Civil",
  status_regra_casa_civil: "Cumprimento Regra Casa Civil",
  prazo_pub_licitacao: "Prazo Publicação",
  status_pub_licitacao: "Status Publicação",
  dt_pub_licitacao: "Pub. Licitação",
  prazo_homolog_licitacao: "Prazo Homolog.",
  status_homolog_licitacao: "Status Homolog.",
  dt_homolog_licitacao: "Homolog. Licitação",
  dt_vrpl: "VRPL",
  dt_aio: "AIO",
  prazo_inicio_obra: "Prazo Início Obra",
  status_inicio_obra: "Status Início Obra",
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
      "data_limite_licitacao_casa_civil",
      "prazo_pub_licitacao",
      "dt_pub_licitacao",
      "prazo_homolog_licitacao",
      "dt_homolog_licitacao",
      "dt_vrpl",
      "dt_aio",
      "prazo_inicio_obra",
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
const dateCol = d => d ? formatDate(d) : "—";
const tciLinkCol = d => d
  ? html`<a href=${`https://saci.cidades.gov.br/contratos/${d}`} target="_blank" rel="noopener noreferrer">${d}</a>`
  : "—";
display(Inputs.table(pageData, {
  columns: exportColumns,
  select: false,
  header: {
    num_convenio: "Convênio", cod_tci: "TCI", secretaria: "Secretaria",
    fase: "Fase", modalidade: "Modalidade", situacao: "Situação Contrato",
    situacao_suspensiva: "Situação Suspensiva",
    dt_vencimento_suspensiva: "Venc. Suspensiva", dt_retirada_suspensiva: "Retirada Suspensiva",
    dt_assinatura: "Assinatura", dt_lae: "LAE", data_limite_licitacao_casa_civil: "Data Limite de Licitação Casa Civil", status_regra_casa_civil: "Cumprimento Regra Casa Civil", prazo_pub_licitacao: "Prazo Publicação",
    status_pub_licitacao: "Status Publicação", dt_pub_licitacao: "Pub. Licitação",
    prazo_homolog_licitacao: "Prazo Homolog.", status_homolog_licitacao: "Status Homolog.",
    dt_homolog_licitacao: "Homolog. Licitação", dt_vrpl: "VRPL", dt_aio: "AIO", prazo_inicio_obra: "Prazo Início Obra", status_inicio_obra: "Status Início Obra",
    dt_inicio_obra: "Início Obra", vlr_repasse: "Repasse (R$)",
  },
  format: {
    cod_tci: tciLinkCol,
    vlr_repasse: d => d.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    dt_assinatura: dateCol, dt_lae: dateCol, data_limite_licitacao_casa_civil: dateCol, prazo_pub_licitacao: dateCol, dt_pub_licitacao: dateCol,
    prazo_homolog_licitacao: dateCol, prazo_inicio_obra: dateCol,
    dt_homolog_licitacao: dateCol, dt_vrpl: dateCol, dt_aio: dateCol,
    dt_inicio_obra: dateCol, dt_vencimento_suspensiva: dateCol, dt_retirada_suspensiva: dateCol,
  },
  rows: PAGE_SIZE,
  multiple: false,
}));
```

</div>
