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
import {cascadeChart, matchesCascadeSelection} from "./components/cascade-chart.js";
import {formatNumber, formatCurrencyCompact, formatPercent, formatDate} from "./lib/formatters.js";
import {SITUACAO_CORES, SUSPENSIVA_CORES, SITUACAO_ORDER, SUSPENSIVA_ORDER, LICITACAO_CORES, INICIO_OBRA_CORES} from "./lib/theme.js";

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
  regiao: d.txt_regiao,
  cod_ibge: d.cod_ibge_7dig,
  municipio: d.txt_municipio,
  objeto: d.dsc_objeto_instrumento,
  secretaria: d.txt_sigla_secretaria,
  fase: d.dsc_fase_pac,
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
  flag_publicacao_licitacao: d.flag_publicacao_licitacao,
  flag_homologacao_licitacao: d.flag_homologacao_licitacao,
  ultima_data_relevante: parseDate(d.ultima_data_relevante),
  fase_atual: d.fase_atual,
  dias_ate_publicacao: d.dias_ate_publicacao === "" ? null : +d.dias_ate_publicacao,
  dias_publicacao_ate_homologacao: d.dias_publicacao_ate_homologacao === "" ? null : +d.dias_publicacao_ate_homologacao,
  dias_homologacao_ate_vrpl: d.dias_homologacao_ate_vrpl === "" ? null : +d.dias_homologacao_ate_vrpl,
  dias_vrpl_ate_aio: d.dias_vrpl_ate_aio === "" ? null : +d.dias_vrpl_ate_aio,
  dias_aio_ate_inicio_obra: d.dias_aio_ate_inicio_obra === "" ? null : +d.dias_aio_ate_inicio_obra,
  faixa_repasse: d.faixa_repasse,
  prazo_pub_licitacao: parseDate(d.prazo_pub_licitacao),
  status_pub_licitacao: d.status_pub_licitacao,
  prazo_homolog_licitacao: parseDate(d.prazo_homolog_licitacao),
  status_homolog_licitacao: d.status_homolog_licitacao,
  prazo_inicio_obra: parseDate(d.prazo_inicio_obra),
  status_inicio_obra: d.status_inicio_obra,
  data_limite_licitacao_casa_civil: parseDate(d.data_limite_licitacao_casa_civil),
  status_regra_casa_civil: d.status_regra_casa_civil,
  urgencia_suspensiva: d.urgencia_suspensiva,
  };
}

const rawDataParsed = dsv.parse(rawText, parseBaseRow);
const previousRawData = dsv.parse(previousRawText, parseBaseRow);

// ── Diff: detectar alterações entre snapshots
const diffFields = [
  "situacao", "situacao_suspensiva", "status_suspensiva", "fase_atual",
  "dt_retirada_suspensiva", "dt_lae", "dt_pub_licitacao", "dt_homolog_licitacao",
  "dt_vrpl", "dt_aio", "dt_inicio_obra", "vlr_repasse",
  "status_pub_licitacao", "status_homolog_licitacao", "status_inicio_obra",
  "status_regra_casa_civil", "urgencia_suspensiva",
];

function rowKey(d) {
  return (d.num_convenio || d.cod_tci || "").trim();
}

function valStr(v) {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function diffLabel(value) {
  if (value === "novo") return "Novo";
  if (value === "alterado") return "Alterado";
  return "Sem alteração";
}

const previousByKey = new Map(previousRawData.map(d => [rowKey(d), d]));
const currentKeys = new Set(rawDataParsed.map(d => rowKey(d)));

const rawData = rawDataParsed.map(d => {
  const key = rowKey(d);
  const prev = previousByKey.get(key);
  if (!prev) return {...d, _diff: "novo", _diff_label: diffLabel("novo"), _diffCampos: []};
  const campos = diffFields.filter(f => valStr(d[f]) !== valStr(prev[f]));
  if (campos.length === 0) return {...d, _diff: null, _diff_label: diffLabel(null), _diffCampos: []};
  return {...d, _diff: "alterado", _diff_label: diffLabel("alterado"), _diffCampos: campos};
});

const secretarias = [...new Set(rawData.map(d => d.secretaria).filter(Boolean))].sort();

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

function formatMetricDelta(value) {
  if (value == null || value === 0) {
    return {label: null, tone: "neutral"};
  }
  return {
    label: `${value > 0 ? "+" : ""}${formatNumber(value)}`,
    tone: value > 0 ? "positive" : "negative",
  };
}

function formatCurrencyDelta(value) {
  if (value == null || value === 0) {
    return {label: null, tone: "neutral"};
  }
  return {
    label: `${value > 0 ? "+" : "-"}${formatCurrencyCompact(Math.abs(value))}`,
    tone: value > 0 ? "positive" : "negative",
  };
}

function buildMetricDelta(currentValue, previousValue, formatter = formatMetricDelta) {
  if (!baseDiffLatest?.snapshot_anterior) {
    return {
      ...formatter(null),
      title: "Sem snapshot anterior para comparação",
    };
  }

  return {
    ...formatter(currentValue - previousValue),
    title: `Variação em relação a ${formatDate(baseDiffLatest.snapshot_anterior)}`,
  };
}
```

```js
if (!window.__pc32RuleTooltipInit) {
  const closeAllRuleTooltips = () => {
    document.querySelectorAll(".rule-tooltip.is-open").forEach((tooltip) => {
      tooltip.classList.remove("is-open");
      const trigger = tooltip.querySelector(".rule-tooltip__trigger");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  };

  const syncRuleTooltips = () => {
    document.querySelectorAll(".rule-tooltip").forEach((tooltip, index) => {
      const trigger = tooltip.querySelector(".rule-tooltip__trigger");
      const content = tooltip.querySelector(".rule-tooltip__content");
      if (!trigger || !content) return;

      const tooltipId = content.id || `rule-tooltip-content-${index + 1}`;
      content.id = tooltipId;
      trigger.type = "button";
      trigger.setAttribute("aria-expanded", tooltip.classList.contains("is-open") ? "true" : "false");
      trigger.setAttribute("aria-controls", tooltipId);
      trigger.setAttribute("aria-haspopup", "dialog");
      content.setAttribute("role", "dialog");
    });
  };

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest(".rule-tooltip__trigger");
    if (trigger) {
      const tooltip = trigger.closest(".rule-tooltip");
      const willOpen = !tooltip.classList.contains("is-open");
      closeAllRuleTooltips();
      if (willOpen) {
        tooltip.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
      event.preventDefault();
      return;
    }

    if (!event.target.closest(".rule-tooltip")) {
      closeAllRuleTooltips();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAllRuleTooltips();
  });

  window.addEventListener("resize", closeAllRuleTooltips);
  window.addEventListener("scroll", closeAllRuleTooltips, true);

  syncRuleTooltips();
  window.__pc32RuleTooltipInit = { closeAllRuleTooltips, syncRuleTooltips };
} else {
  window.__pc32RuleTooltipInit.syncRuleTooltips();
}
```

```js
const pageTitleBar = document.createElement("div");
pageTitleBar.className = "page-titlebar dashboard-toolbar";
pageTitleBar.innerHTML = `
  <div class="page-titlebar__heading dashboard-toolbar__title">
    <h1>Painel PC 32 — Novo PAC Seleção</h1>
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

<div class="filters-bar">

```js
const fConvenioInput = Inputs.search(rawData, {
  placeholder: "Buscar por num. convênio ou TCI…",
  columns: ["num_convenio", "cod_tci"],
  label: "Convênio / TCI",
});

function localizeSearchResults(input) {
  const output = input.querySelector("output");
  const countFormatter = new Intl.NumberFormat("pt-BR");
  const sync = () => {
    if (output) {
      const match = output.textContent.match(/^([\d.,]+)\s+results?$/i);
      if (match) {
        const rawCount = match[1];
        const count = Number(rawCount.replace(/[.,]/g, ""));
        const formattedCount = Number.isFinite(count) ? countFormatter.format(count) : rawCount;
        output.textContent = `${formattedCount} ${count === 1 ? "resultado" : "resultados"}`;
      }
    }

    input.querySelectorAll("td").forEach((cell) => {
      if (cell.textContent?.trim() === "No results.") {
        cell.textContent = "Nenhum resultado.";
      }
    });
  };

  sync();
  input.addEventListener("input", sync);
  new MutationObserver(sync).observe(input, {childList: true, characterData: true, subtree: true});
}

localizeSearchResults(fConvenioInput);

const fConvenio = view(fConvenioInput);
```

```js
function makeMultiPicker(labelText, options, selectedValues = [], allLabel = "Todas", selectedLabel = "selecionadas") {
  const selected = new Set(selectedValues.filter(value => options.includes(value)));
  const wrap = Object.assign(document.createElement("div"), { value: [...selected] });
  wrap.className = "multi-picker";

  const label = document.createElement("label");
  label.className = "multi-picker__label";
  label.textContent = labelText;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "multi-picker__toggle";

  const panel = document.createElement("div");
  panel.className = "multi-picker__panel";
  panel.hidden = true;

  const actions = document.createElement("div");
  actions.className = "multi-picker__actions";

  const selectAll = document.createElement("button");
  selectAll.type = "button";
  selectAll.className = "multi-picker__action-btn";
  selectAll.textContent = "Selecionar todas";

  const clearAll = document.createElement("button");
  clearAll.type = "button";
  clearAll.className = "multi-picker__action-btn";
  clearAll.textContent = "Limpar";

  const grid = document.createElement("div");
  grid.className = "multi-picker__grid";

  const updateToggleText = () => {
    if (selected.size === 0 || selected.size === options.length) toggle.textContent = allLabel;
    else if (selected.size === 1) toggle.textContent = [...selected][0];
    else toggle.textContent = `${selected.size} ${selectedLabel}`;
  };

  const emit = () => {
    wrap.value = selected.size === options.length ? [] : options.filter(option => selected.has(option));
    updateToggleText();
    wrap.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const chips = options.map(option => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "multi-picker__chip";
    chip.textContent = option;
    if (selected.has(option)) chip.classList.add("is-active");
    chip.addEventListener("click", () => {
      if (selected.has(option)) {
        selected.delete(option);
        chip.classList.remove("is-active");
      } else {
        selected.add(option);
        chip.classList.add("is-active");
      }
      emit();
    });
    return chip;
  });

  selectAll.addEventListener("click", () => {
    options.forEach(option => selected.add(option));
    chips.forEach(chip => chip.classList.add("is-active"));
    emit();
  });

  clearAll.addEventListener("click", () => {
    selected.clear();
    chips.forEach(chip => chip.classList.remove("is-active"));
    emit();
  });

  const closePanel = () => {
    panel.hidden = true;
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const willOpen = panel.hidden;
    panel.hidden = !panel.hidden;
    toggle.classList.toggle("is-open", willOpen);
    toggle.setAttribute("aria-expanded", willOpen ? "true" : "false");
  });

  document.addEventListener("click", (event) => {
    if (!wrap.contains(event.target)) closePanel();
  });

  actions.append(selectAll, clearAll);
  grid.append(...chips);
  panel.append(actions, grid);
  label.append(toggle, panel);
  wrap.append(label);

  toggle.setAttribute("aria-haspopup", "dialog");
  toggle.setAttribute("aria-expanded", "false");
  updateToggleText();
  wrap.value = options.filter(option => selected.has(option));
  return wrap;
}

function getAno(d) {
  return d.dt_assinatura ? String(d.dt_assinatura.getUTCFullYear()) : null;
}

function filterBySelection(value, selectedValues) {
  return selectedValues.length === 0 || selectedValues.includes(value);
}

function computeCascadeOptions(data, state) {
  const secretaria = [...new Set(
    data
      .filter(d => filterBySelection(d.modalidade, state.modalidade))
      .filter(d => filterBySelection(getAno(d), state.ano))
      .map(d => d.secretaria)
      .filter(Boolean)
  )].sort();

  const modalidade = [...new Set(
    data
      .filter(d => filterBySelection(d.secretaria, state.secretaria))
      .filter(d => filterBySelection(getAno(d), state.ano))
      .map(d => d.modalidade)
      .filter(Boolean)
  )].sort();

  const ano = [...new Set(
    data
      .filter(d => filterBySelection(d.secretaria, state.secretaria))
      .filter(d => filterBySelection(d.modalidade, state.modalidade))
      .map(getAno)
      .filter(Boolean)
  )].sort();

  return {secretaria, modalidade, ano};
}

function sanitizeCascadeState(data, state) {
  const options = computeCascadeOptions(data, state);
  const secretaria = state.secretaria.filter(value => options.secretaria.includes(value));
  const modalidade = state.modalidade.filter(value => options.modalidade.includes(value));
  const ano = state.ano.filter(value => options.ano.includes(value));
  return {
    secretaria: secretaria.length === options.secretaria.length ? [] : secretaria,
    modalidade: modalidade.length === options.modalidade.length ? [] : modalidade,
    ano: ano.length === options.ano.length ? [] : ano
  };
}

function makeCascadeFilters(data) {
  let state = {secretaria: [], modalidade: [], ano: []};
  const wrap = Object.assign(document.createElement("div"), {value: state});
  wrap.className = "filters-cascade";

  function emit() {
    wrap.value = state;
    wrap.dispatchEvent(new Event("input", {bubbles: true}));
  }

  function render() {
    const options = computeCascadeOptions(data, state);
    wrap.replaceChildren();

    const configs = [
      {key: "secretaria", label: "Secretaria", values: options.secretaria, allLabel: "Todas", selectedLabel: "selecionadas"},
      {key: "modalidade", label: "Modalidade", values: options.modalidade, allLabel: "Todas", selectedLabel: "selecionadas"},
      {key: "ano", label: "Ano de seleção", values: options.ano, allLabel: "Todos", selectedLabel: "anos"}
    ];

    configs.forEach((config) => {
      const slot = document.createElement("div");
      slot.className = "filters-cascade__item";
      const picker = makeMultiPicker(
        config.label,
        config.values,
        state[config.key],
        config.allLabel,
        config.selectedLabel
      );
      picker.addEventListener("input", () => {
        wrap.setState({...state, [config.key]: Array.isArray(picker.value) ? picker.value : []});
      });
      slot.append(picker);
      wrap.append(slot);
    });
  }

  wrap.setState = (nextState) => {
    state = sanitizeCascadeState(data, {
      secretaria: Array.isArray(nextState.secretaria) ? nextState.secretaria : [],
      modalidade: Array.isArray(nextState.modalidade) ? nextState.modalidade : [],
      ano: Array.isArray(nextState.ano) ? nextState.ano : []
    });
    render();
    emit();
  };

  wrap.reset = () => {
    wrap.setState({secretaria: [], modalidade: [], ano: []});
  };

  render();
  emit();
  return wrap;
}

const filtrosInput = makeCascadeFilters(rawData);
const filtros = view(filtrosInput);
```

```js
const clearFiltersButton = html`<button type="button" class="filters-reset">Limpar filtros do topo</button>`;

clearFiltersButton.addEventListener("click", () => {
  const searchInput = fConvenioInput.querySelector("input[type='search']");
  if (searchInput) {
    searchInput.value = "";
    searchInput.dispatchEvent(new Event("input", {bubbles: true}));
    searchInput.dispatchEvent(new Event("change", {bubbles: true}));
  }
  filtrosInput.reset();
});

display(clearFiltersButton);
```

</div>

```js
const secretariaSelecionada = Array.isArray(filtros?.secretaria) ? filtros.secretaria : [];
const modalidadeSelecionada = Array.isArray(filtros?.modalidade) ? filtros.modalidade : [];
const anoSelecionado = Array.isArray(filtros?.ano) ? filtros.ano : [];

function matchesModalidadeFilter(d) {
  return modalidadeSelecionada.length === 0 || modalidadeSelecionada.includes(d.modalidade);
}

function matchesAnoFilter(d) {
  return anoSelecionado.length === 0 || (getAno(d) && anoSelecionado.includes(getAno(d)));
}

function matchesSecretariaFilter(d) {
  return secretariaSelecionada.length === 0 || secretariaSelecionada.includes(d.secretaria);
}

function summarizeFilter(label, values, pluralLabel = "selecionadas") {
  if (values.length === 0) return null;
  if (values.length <= 2) return `${label}: ${values.join(", ")}`;
  return `${label}: ${values.length} ${pluralLabel}`;
}

const filtrosAtivos = [
  secretariaSelecionada.length > 0 ? {key: "secretaria", text: summarizeFilter("Secretaria", secretariaSelecionada)} : null,
  modalidadeSelecionada.length > 0 ? {key: "modalidade", text: summarizeFilter("Modalidade", modalidadeSelecionada)} : null,
  anoSelecionado.length > 0 ? {key: "ano", text: summarizeFilter("Ano", anoSelecionado, "anos")} : null
].filter(Boolean);

if (filtrosAtivos.length > 0) {
  const summary = html`<div class="filters-summary">
    <span class="filters-summary__count">${filtrosAtivos.length} filtro${filtrosAtivos.length === 1 ? "" : "s"} ativo${filtrosAtivos.length === 1 ? "" : "s"}</span>
  </div>`;

  filtrosAtivos.forEach((item) => {
    const chip = html`<button type="button" class="filters-summary__chip">${item.text}<span aria-hidden="true">×</span></button>`;
    chip.addEventListener("click", () => {
      filtrosInput.setState({...filtrosInput.value, [item.key]: []});
    });
    summary.append(chip);
  });

  display(summary);
}

// ── baseData: filtros de topo
const baseData = fConvenio.filter(d =>
  matchesSecretariaFilter(d) &&
  matchesModalidadeFilter(d) &&
  matchesAnoFilter(d)
);

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
function makeClickableChart(plotEl, items, keyField, initialValue = null) {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  const input = Object.assign(wrapper, { value: initialValue });

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

  sync(initialValue);
  wrapper.append(plotEl, badge);
  return input;
}

function renderSecretariaOverview(rows, field, label, marginLeft) {
  const wrap = Object.assign(document.createElement("div"), {
    className: "grid-two",
    value: null
  });

  function setValue(nextValue) {
    wrap.value = wrap.value === nextValue ? null : nextValue;
    render();
    wrap.dispatchEvent(new Event("input", {bubbles: true}));
  }

  function buildChartData() {
    return [...new Set(rows.map(d => d[field]).filter(Boolean))]
      .map((group) => {
        const groupRows = rows.filter(d => d[field] === group);
        return {
          group,
          contratos: groupRows.length,
          vlr_repasse: groupRows.reduce((sum, d) => sum + d.vlr_repasse, 0),
        };
      })
      .filter(d => d.contratos > 0)
      .sort((a, b) => b.contratos - a.contratos || b.vlr_repasse - a.vlr_repasse);
  }

  function makeCard(title, subtitle, chartNode) {
    const card = document.createElement("div");
    card.className = "card";
    const h2 = document.createElement("h2");
    h2.textContent = title;
    const p = document.createElement("p");
    p.textContent = subtitle;
    card.append(h2, p, chartNode);
    return card;
  }

  function render() {
    wrap.innerHTML = "";
    const chartData = buildChartData();

    const contratosChart = makeClickableChart(
      Plot.plot({
        marginLeft,
        marginRight: 90,
        height: Math.max(180, chartData.length * 52 + 40),
        style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
        x: { label: null, grid: false, axis: null },
        y: { label: null, domain: chartData.map(d => d.group) },
        marks: [
          Plot.barX(chartData, {
            x: "contratos",
            y: "group",
            fill: "#356c8c",
            rx: 6,
          }),
          Plot.text(chartData, {
            x: "contratos",
            y: "group",
            text: d => formatNumber(d.contratos),
            dx: 6,
            textAnchor: "start",
            fontSize: 12,
            fill: "#5b6470",
          }),
        ],
      }),
      chartData,
      "group",
      wrap.value
    );
    contratosChart.addEventListener("input", () => setValue(contratosChart.value));

    const repasseChart = makeClickableChart(
      Plot.plot({
        marginLeft,
        marginRight: 110,
        height: Math.max(180, chartData.length * 52 + 40),
        style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
        x: { label: null, grid: false, axis: null },
        y: { label: null, domain: chartData.map(d => d.group) },
        marks: [
          Plot.barX(chartData, {
            x: "vlr_repasse",
            y: "group",
            fill: "#0f766e",
            rx: 6,
          }),
          Plot.text(chartData, {
            x: "vlr_repasse",
            y: "group",
            text: d => formatCurrencyCompact(d.vlr_repasse),
            dx: 6,
            textAnchor: "start",
            fontSize: 12,
            fill: "#5b6470",
          }),
        ],
      }),
      chartData,
      "group",
      wrap.value
    );
    repasseChart.addEventListener("input", () => setValue(repasseChart.value));

    wrap.append(
      makeCard(`Contratos por ${label}`, "Distribuição da quantidade de contratos na seleção atual", contratosChart),
      makeCard(`Repasse por ${label}`, "Distribuição do valor total de repasse na seleção atual", repasseChart)
    );
  }

  render();
  return wrap;
}

const GEO_EMPTY_LABEL = "Não informado";
const REGIAO_COLORS = {
  "Nordeste": "#c2410c",
  "Sudeste": "#0f766e",
  "Norte": "#7c3aed",
  "Sul": "#2563eb",
  "Centro-Oeste": "#b45309",
  [GEO_EMPTY_LABEL]: "#64748b",
};
const GEO_FALLBACK_COLORS = ["#0f766e", "#2563eb", "#7c3aed", "#c2410c", "#b45309", "#be123c", "#0369a1", "#4d7c0f"];

function normalizeGeoLabel(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || GEO_EMPTY_LABEL;
}

function colorForGeoLabel(label, index) {
  return REGIAO_COLORS[label] ?? GEO_FALLBACK_COLORS[index % GEO_FALLBACK_COLORS.length];
}

function buildGeoBreakdown(rows, field) {
  const counts = d3.rollup(rows, (values) => values.length, (row) => normalizeGeoLabel(row[field]));
  return [...counts.entries()]
    .map(([label, qtd], index) => ({label, qtd, color: colorForGeoLabel(label, index)}))
    .sort((a, b) => b.qtd - a.qtd || a.label.localeCompare(b.label, "pt-BR"));
}

function matchesGeoSelection(d, selection = {}) {
  return (
    (selection?.regiao == null || normalizeGeoLabel(d.regiao) === selection.regiao) &&
    (selection?.uf == null || normalizeGeoLabel(d.uf) === selection.uf)
  );
}

function makeGeoCascade(rows) {
  const wrap = Object.assign(document.createElement("div"), {
    value: {regiao: null, uf: null}
  });
  wrap.className = "casc-chart";

  function render() {
    wrap.innerHTML = "";
    const clear = makeFlowElement("button", "casc-clear", "Limpar seleção");
    clear.hidden = !Object.values(wrap.value).some(Boolean);
    clear.addEventListener("click", () => {
      wrap.value = {regiao: null, uf: null};
      render();
      wrap.dispatchEvent(new Event("input", {bubbles: true}));
    });
    wrap.append(clear);

    const regiaoData = buildGeoBreakdown(rows, "regiao");
    const total = rows.length;

    wrap.append(
      makeFlowLevel(
        `${formatNumber(total)} contratos no recorte atual`,
        "por região",
        regiaoData,
        total,
        {
          filterKey: "regiao",
          selectedValue: wrap.value.regiao,
          onSelect: (_key, label) => {
            const nextRegiao = wrap.value.regiao === label ? null : label;
            wrap.value = {regiao: nextRegiao, uf: null};
            render();
            wrap.dispatchEvent(new Event("input", {bubbles: true}));
          }
        }
      )
    );

    if (wrap.value.regiao != null) {
      const ufBase = rows.filter(d => normalizeGeoLabel(d.regiao) === wrap.value.regiao);
      const ufData = buildGeoBreakdown(ufBase, "uf");

      if (ufData.length > 0) {
        if (!ufData.some(d => d.label === wrap.value.uf)) wrap.value = {...wrap.value, uf: null};
        wrap.append(makeFlowConnector(`estados da região ${wrap.value.regiao}`));
        wrap.append(
          makeFlowLevel(
            `${formatNumber(ufBase.length)} contratos na região ${wrap.value.regiao}`,
            "por UF",
            ufData,
            ufBase.length,
            {
              filterKey: "uf",
              selectedValue: wrap.value.uf,
              onSelect: (_key, label) => {
                wrap.value = {...wrap.value, uf: wrap.value.uf === label ? null : label};
                render();
                wrap.dispatchEvent(new Event("input", {bubbles: true}));
              }
            }
          )
        );
      }
    }
  }

  render();
  return wrap;
}

const LICITACAO_PRAZO_ORDER = ["Vencida", "Próximos 30 dias", "No prazo"];

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

function renderLicitacaoExplorer(data, previousData) {
  const initialFlow = {pub_etapa: null, pub_prazo: null, homolog_etapa: null, homolog_prazo: null};
  const container = Object.assign(makeFlowElement("div", "licitacao-explorer"), {
    value: {flow: initialFlow, casaCivil: null}
  });

  const clear = makeFlowElement("button", "casc-clear", "Limpar seleção");
  clear.type = "button";
  clear.hidden = true;
  clear.addEventListener("click", () => {
    container.value = {flow: {...initialFlow}, casaCivil: null};
    render();
    container.dispatchEvent(new Event("input", {bubbles: true}));
  });

  function setFlow(key, label) {
    container.value = {
      ...container.value,
      flow: {
        ...container.value.flow,
        [key]: container.value.flow[key] === label ? null : label
      }
    };
    render();
    container.dispatchEvent(new Event("input", {bubbles: true}));
  }

  function setCasaCivil(value) {
    container.value = {
      ...container.value,
      casaCivil: container.value.casaCivil === value ? null : value
    };
    render();
    container.dispatchEvent(new Event("input", {bubbles: true}));
  }

  function render() {
    container.innerHTML = "";
    clear.hidden = !Object.values(container.value.flow).some(Boolean) && container.value.casaCivil == null;

    const eligible = data.filter(d => d.dt_retirada_suspensiva && d.situacao !== "Cancelado ou Distratado");
    const previousEligible = previousData.filter(d => d.dt_retirada_suspensiva && d.situacao !== "Cancelado ou Distratado");
    const flowSource = eligible.filter(d => matchesCasaCivilSelection(d, container.value.casaCivil));
    const cascadeBase = flowSource.filter(d => matchesLicitacaoSelection(d, container.value.flow));
    const casaCivilSource = eligible.filter(d => matchesLicitacaoSelection(d, container.value.flow));
    const previousSelecionada = previousEligible
      .filter(d => matchesLicitacaoSelection(d, container.value.flow))
      .filter(d => matchesCasaCivilSelection(d, container.value.casaCivil));

    const valorSelecionado = cascadeBase.reduce((sum, d) => sum + d.vlr_repasse, 0);
    const previousValorSelecionado = previousSelecionada.reduce((sum, d) => sum + d.vlr_repasse, 0);
    const aguardandoPublicacaoSelecionada = cascadeBase.filter(d => !d.dt_pub_licitacao);
    const previousAguardandoPublicacaoSelecionada = previousSelecionada.filter(d => !d.dt_pub_licitacao);
    const publicacaoVencidaSelecionada = aguardandoPublicacaoSelecionada.filter(d => d.status_pub_licitacao === "Vencida").length;
    const previousPublicacaoVencidaSelecionada = previousAguardandoPublicacaoSelecionada.filter(d => d.status_pub_licitacao === "Vencida").length;
    const publicacaoProx30Selecionada = aguardandoPublicacaoSelecionada.filter(d => d.status_pub_licitacao === "Próximos 30 dias").length;
    const previousPublicacaoProx30Selecionada = previousAguardandoPublicacaoSelecionada.filter(d => d.status_pub_licitacao === "Próximos 30 dias").length;
    const publicadasSelecionada = cascadeBase.filter(d => d.dt_pub_licitacao);
    const previousPublicadasSelecionada = previousSelecionada.filter(d => d.dt_pub_licitacao);
    const homologacaoPendenteSelecionada = publicadasSelecionada.filter(d => !d.dt_homolog_licitacao);
    const previousHomologacaoPendenteSelecionada = previousPublicadasSelecionada.filter(d => !d.dt_homolog_licitacao);
    const homologacaoVencidaSelecionada = homologacaoPendenteSelecionada.filter(d => d.status_homolog_licitacao === "Vencida").length;
    const previousHomologacaoVencidaSelecionada = previousHomologacaoPendenteSelecionada.filter(d => d.status_homolog_licitacao === "Vencida").length;
    const homologacaoProx30Selecionada = homologacaoPendenteSelecionada.filter(d => d.status_homolog_licitacao === "Próximos 30 dias").length;
    const previousHomologacaoProx30Selecionada = previousHomologacaoPendenteSelecionada.filter(d => d.status_homolog_licitacao === "Próximos 30 dias").length;

    const cumprimentoCasaCivil = [
      { status: "Cumpriu", qtd: casaCivilSource.filter(d => d.status_regra_casa_civil === "Cumpriu").length, color: LICITACAO_CORES["Cumpriu"] },
      { status: "Não cumpriu", qtd: casaCivilSource.filter(d => d.status_regra_casa_civil === "Não cumpriu").length, color: LICITACAO_CORES["Não cumpriu"] },
      { status: "Fora do escopo", qtd: casaCivilSource.filter(d => d.status_regra_casa_civil === "Fora do escopo").length, color: LICITACAO_CORES["Fora do escopo"] },
    ].filter(d => d.qtd > 0);

    container.append(metricGrid([
      { label: "Com retirada de suspensiva", value: formatNumber(cascadeBase.length), delta: buildMetricDelta(cascadeBase.length, previousSelecionada.length), tone: "default" },
      {
        label: "Valor dos contratos",
        value: formatCurrencyCompact(valorSelecionado),
        detail: `${formatNumber(cascadeBase.length)} contrato${cascadeBase.length === 1 ? "" : "s"} no recorte atual da licitação`,
        delta: buildMetricDelta(valorSelecionado, previousValorSelecionado, formatCurrencyDelta),
        tone: "blue",
      },
      { label: "Aguardando publicação", value: formatNumber(aguardandoPublicacaoSelecionada.length), detail: formatPercent(cascadeBase.length > 0 ? aguardandoPublicacaoSelecionada.length / cascadeBase.length : 0) + " com retirada de suspensiva", delta: buildMetricDelta(aguardandoPublicacaoSelecionada.length, previousAguardandoPublicacaoSelecionada.length), tone: "gold" },
      { label: "Publicação vencida", value: formatNumber(publicacaoVencidaSelecionada), detail: "prazo de 120 dias após retirada da suspensiva", delta: buildMetricDelta(publicacaoVencidaSelecionada, previousPublicacaoVencidaSelecionada), tone: "red" },
      { label: "Publicação nos próximos 30 dias", value: formatNumber(publicacaoProx30Selecionada), delta: buildMetricDelta(publicacaoProx30Selecionada, previousPublicacaoProx30Selecionada), tone: "gold" },
      { label: "Homologação vencida", value: formatNumber(homologacaoVencidaSelecionada), detail: "prazo de 120 dias após publicação", delta: buildMetricDelta(homologacaoVencidaSelecionada, previousHomologacaoVencidaSelecionada), tone: "red" },
      { label: "Homologação nos próximos 30 dias", value: formatNumber(homologacaoProx30Selecionada), delta: buildMetricDelta(homologacaoProx30Selecionada, previousHomologacaoProx30Selecionada), tone: "gold" },
    ]));

    if (publicacaoVencidaSelecionada > 0 || publicacaoProx30Selecionada > 0 || homologacaoVencidaSelecionada > 0 || homologacaoProx30Selecionada > 0) {
      const alertEl = document.createElement("div");
      alertEl.className = "urgency-alert";
      alertEl.innerHTML = `
        <div class="urgency-alert__icon">⚠️</div>
        <div class="urgency-alert__body">
          <div class="urgency-alert__title">Atenção: licitações com prazo crítico</div>
          <div class="urgency-alert__text">
            ${publicacaoVencidaSelecionada > 0 ? `<strong>${formatNumber(publicacaoVencidaSelecionada)}</strong> contrato${publicacaoVencidaSelecionada > 1 ? "s" : ""} com <strong>publicação vencida</strong>. ` : ""}
            ${publicacaoProx30Selecionada > 0 ? `<strong>${formatNumber(publicacaoProx30Selecionada)}</strong> contrato${publicacaoProx30Selecionada > 1 ? "s" : ""} com publicação nos <strong>próximos 30 dias</strong>. ` : ""}
            ${homologacaoVencidaSelecionada > 0 ? `<strong>${formatNumber(homologacaoVencidaSelecionada)}</strong> contrato${homologacaoVencidaSelecionada > 1 ? "s" : ""} com <strong>homologação vencida</strong>. ` : ""}
            ${homologacaoProx30Selecionada > 0 ? `<strong>${formatNumber(homologacaoProx30Selecionada)}</strong> contrato${homologacaoProx30Selecionada > 1 ? "s" : ""} com homologação nos <strong>próximos 30 dias</strong>.` : ""}
          </div>
        </div>
      `;
      container.append(alertEl);
    }

    container.append(clear);

    if (cumprimentoCasaCivil.length > 0) {
      const casaCivilChart = makeClickableChart(
        Plot.plot({
          marginLeft: 140,
          marginRight: 50,
          height: Math.max(160, cumprimentoCasaCivil.length * 44 + 36),
          style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
          x: { label: null, grid: false, axis: null },
          y: { label: null, domain: cumprimentoCasaCivil.map(d => d.status) },
          marks: [
            Plot.barX(cumprimentoCasaCivil, { x: "qtd", y: "status", fill: "color", rx: 6 }),
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
        cumprimentoCasaCivil,
        "status",
        container.value.casaCivil
      );
      casaCivilChart.addEventListener("input", () => setCasaCivil(casaCivilChart.value));
      container.append(casaCivilChart);
    }

    if (cascadeBase.length === 0) {
      container.append(makeFlowElement("p", "casc-empty", "Nenhum contrato corresponde à seleção atual na análise de licitação."));
      return;
    }

    const aguardandoPublicacao = cascadeBase.filter(d => !d.dt_pub_licitacao);
    const publicadas = cascadeBase.filter(d => d.dt_pub_licitacao);
    container.append(
      makeFlowLevel(
        `${cascadeBase.length.toLocaleString("pt-BR")} contratos com retirada de suspensiva`,
        "por etapa da publicação da licitação",
        [
          { label: "Aguardando publicação", qtd: aguardandoPublicacao.length, color: LICITACAO_CORES["Aguardando publicação"] },
          { label: "Publicada", qtd: publicadas.length, color: LICITACAO_CORES["Publicada"] },
        ],
        cascadeBase.length,
        { filterKey: "pub_etapa", selectedValue: container.value.flow.pub_etapa, onSelect: setFlow }
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
          { filterKey: "pub_prazo", selectedValue: container.value.flow.pub_prazo, onSelect: setFlow }
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
          { filterKey: "homolog_etapa", selectedValue: container.value.flow.homolog_etapa, onSelect: setFlow }
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
            { filterKey: "homolog_prazo", selectedValue: container.value.flow.homolog_prazo, onSelect: setFlow }
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

function normalizeDrillSelection(selection) {
  if (selection == null) return null;
  if (typeof selection === "string") return selection;
  if (Array.isArray(selection)) return selection.length === 1 ? selection[0] : null;
  if (typeof selection === "object") {
    if (typeof selection.value === "string") return selection.value;
    if (typeof selection.group === "string") return selection.group;
  }
  return null;
}
```

```js
// ── data final: baseData + seleção dos gráficos
const dataBaseSemGeo = baseData.filter(d =>
  (selectedSituacao == null || d.situacao === selectedSituacao) &&
  (selectedSuspensiva == null || d.situacao_suspensiva === selectedSuspensiva)
);

const previousBaseData = previousRawData.filter(d =>
  fConvenio.some(row => row.num_convenio === d.num_convenio && row.cod_tci === d.cod_tci) &&
  matchesSecretariaFilter(d) &&
  matchesModalidadeFilter(d) &&
  matchesAnoFilter(d)
);

const previousDataSemGeo = previousBaseData.filter(d =>
  (selectedSituacao == null || d.situacao === selectedSituacao) &&
  (selectedSuspensiva == null || d.situacao_suspensiva === selectedSuspensiva)
);

const secretariaDrillField = secretariaSelecionada.length === 1 ? "modalidade" : "secretaria";
const secretariaDrillLabel = secretariaDrillField === "secretaria" ? "Secretaria" : "Modalidade";
const secretariaDrillMarginLeft = secretariaDrillField === "secretaria" ? 90 : 240;
```

```js
const secretariaDrillSelection = normalizeDrillSelection(selectedSecretariaDrill);

const dataSemGeo = dataBaseSemGeo.filter(d =>
  secretariaDrillSelection == null || d[secretariaDrillField] === secretariaDrillSelection
);
const previousData = previousDataSemGeo.filter(d =>
  secretariaDrillSelection == null || d[secretariaDrillField] === secretariaDrillSelection
);
const data = dataSemGeo;

const total = data.length;
const comSuspensiva = data.filter(d => d.situacao === "Contratado - Suspensiva").length;
const semSuspensiva = data.filter(d => d.situacao === "Contratado - Normal").length;
const vlrTotal = data.reduce((s, d) => s + d.vlr_repasse, 0);
const previousTotal = previousData.length;
const previousComSuspensiva = previousData.filter(d => d.situacao === "Contratado - Suspensiva").length;
const previousSemSuspensiva = previousData.filter(d => d.situacao === "Contratado - Normal").length;
const previousVlrTotal = previousData.reduce((s, d) => s + d.vlr_repasse, 0);
const pctSuspensiva = data.length > 0 ? comSuspensiva / data.length : 0;
const pctSemSuspensiva = data.length > 0 ? semSuspensiva / data.length : 0;
const drillDetail = secretariaDrillSelection == null
  ? "do recorte principal"
  : `do recorte de ${secretariaDrillLabel.toLowerCase()} ${secretariaDrillSelection}`;
```

```js
display(metricGrid([
  {
    label: "Total selecionadas",
    value: formatNumber(total),
    delta: buildMetricDelta(total, previousTotal),
    detail: drillDetail,
    tone: "default"
  },
  { label: "Com suspensiva", value: formatNumber(comSuspensiva), detail: `${formatPercent(pctSuspensiva)} ${drillDetail}`, delta: buildMetricDelta(comSuspensiva, previousComSuspensiva), tone: "gold" },
  { label: "Sem suspensiva (Normal)", value: formatNumber(semSuspensiva), detail: `${formatPercent(pctSemSuspensiva)} ${drillDetail}`, delta: buildMetricDelta(semSuspensiva, previousSemSuspensiva), tone: "green" },
  { label: "Valor total de repasse", value: formatCurrencyCompact(vlrTotal), detail: drillDetail, delta: buildMetricDelta(vlrTotal, previousVlrTotal, formatCurrencyDelta), tone: "blue" },
]));
```

```js
const selectedSecretariaDrill = view(renderSecretariaOverview(
  dataBaseSemGeo,
  secretariaDrillField,
  secretariaDrillLabel,
  secretariaDrillMarginLeft
));
```

<div class="grid-two">

<div class="card">

<h2>Situação do Contrato <span class="rule-tooltip"><button class="rule-tooltip__trigger" aria-label="Regra">?</button><span class="rule-tooltip__content">Classificação da situação contratual conforme Transferegov.<ul><li><strong>Em Contratação</strong> — instrumento ainda não formalizado</li><li><strong>Contratado - Suspensiva</strong> — contrato assinado com condição suspensiva pendente</li><li><strong>Contratado - Normal</strong> — contrato ativo sem restrições</li><li><strong>Cancelado ou Distratado</strong> — contrato encerrado</li></ul></span></span></h2>

<p>Clique em uma barra para filtrar</p>

```js
const selectedSituacao = view(makeClickableChart(
  Plot.plot({
    marginLeft: 220, marginRight: 50,
    height: Math.max(180, bySituacao.length * 44 + 40),
    style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
    x: { label: null, grid: false, axis: null },
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

<h2>Situação da Análise Suspensiva <span class="rule-tooltip"><button class="rule-tooltip__trigger" aria-label="Regra">?</button><span class="rule-tooltip__content">Situação da análise da condição suspensiva registrada no Transferegov.<ul><li><strong>Doc. não enviada p/ análise</strong> — documentação ainda não submetida</li><li><strong>Análise não iniciada / iniciada</strong> — etapas de tramitação interna</li><li><strong>Analisada e aceita</strong> — condição aceita, aguardando retirada</li><li><strong>Suspensiva retirada</strong> — condição satisfeita, contrato liberado</li></ul></span></span></h2>

<p>Clique em uma barra para filtrar</p>

```js
const selectedSuspensiva = view(makeClickableChart(
  Plot.plot({
    marginLeft: 230, marginRight: 50,
    height: Math.max(180, bySuspensiva.length * 44 + 40),
    style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
    x: { label: null, grid: false, axis: null },
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

<h2>Distribuição Territorial <span class="rule-tooltip"><button class="rule-tooltip__trigger" aria-label="Regra">?</button><span class="rule-tooltip__content">Recorte territorial de todos os contratos atualmente visíveis no painel.<ul><li><strong>Região</strong> — considera todos os contratos após os filtros do topo e dos gráficos gerais</li><li><strong>UF</strong> — abre quando uma região é selecionada</li><li>As seleções passam a valer para os blocos analíticos seguintes</li></ul></span></span></h2>

<p>Clique em uma região para abrir os estados; esse recorte passa a valer para os blocos abaixo.</p>

```js
const selectedGeo = view(makeGeoCascade(dataSemGeo));
```

</div>

```js
const geoScopedData = data.filter(d => matchesGeoSelection(d, selectedGeo));
const geoScopedPreviousData = previousData.filter(d => matchesGeoSelection(d, selectedGeo));
```

<div class="card card--suspensiva-analysis">

<h2>Análise de Suspensivas — Quebra por etapas <span class="rule-tooltip"><button class="rule-tooltip__trigger" aria-label="Regra">?</button><span class="rule-tooltip__content">Cascata dos contratos com suspensiva ativa, classificados por urgência do vencimento.<ul><li><strong>Vencida</strong> — data de vencimento da suspensiva já passou</li><li><strong>Próximos 30 dias</strong> — vence em até 30 dias corridos</li><li><strong>31–90 dias</strong> — vence entre 31 e 90 dias</li><li><strong>Mais de 90 dias</strong> — vence após 90 dias</li><li><strong>Sem data</strong> — sem data de vencimento registrada</li></ul></span></span></h2>

<p>Cascata proporcional: do total à urgência de vencimento</p>

```js
const comSuspData = geoScopedData.filter(d => d.situacao === "Contratado - Suspensiva");
const pendentes = comSuspData.filter(d => !d.dt_retirada_suspensiva);
const vencida = pendentes.filter(d => d.urgencia_suspensiva === "Vencida").length;
const prox30  = pendentes.filter(d => d.urgencia_suspensiva === "Próximos 30 dias").length;

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

const selectedCascade = view(cascadeChart(geoScopedData));
```

</div>

<div class="card card--licitacao-analysis">

<h2>Análise de Licitação — Prazos de publicação e homologação <span class="rule-tooltip"><button class="rule-tooltip__trigger" aria-label="Regra">?</button><span class="rule-tooltip__content">Monitoramento dos prazos de licitação a partir da retirada da suspensiva.<ul><li><strong>Prazo de publicação</strong> — até 120 dias corridos após a data de retirada da suspensiva</li><li><strong>Prazo de homologação</strong> — até 120 dias corridos após a publicação da licitação</li><li><strong>Regra Casa Civil</strong> — publicação, homologação e ordem de serviço devem ocorrer até 31/03/2026</li></ul>Classificação de prazo:<ul><li><strong>Vencida</strong> — prazo já expirou</li><li><strong>Próximos 30 dias</strong> — vence em até 30 dias</li><li><strong>No prazo</strong> — mais de 30 dias restantes</li></ul></span></span></h2>

<p>Publicação até 120 dias após a retirada da suspensiva; homologação até 120 dias após a publicação da licitação.</p>

```js
const selectedLicitacaoPanel = view(renderLicitacaoExplorer(geoScopedData, geoScopedPreviousData));
const selectedLicitacao = selectedLicitacaoPanel.flow;
const selectedCasaCivil = selectedLicitacaoPanel.casaCivil;
```

</div>

<div class="card card--inicio-obra-analysis">

<h2>Análise de Início da Obra — Prazo após AIO <span class="rule-tooltip"><button class="rule-tooltip__trigger" aria-label="Regra">?</button><span class="rule-tooltip__content">Monitoramento do prazo para início da obra após a emissão da AIO (Autorização de Início de Obra).<ul><li><strong>Prazo</strong> — 10 dias úteis após a data de AIO</li><li><strong>Iniciada no prazo</strong> — obra iniciada dentro do prazo</li><li><strong>Iniciada em atraso</strong> — obra iniciada após o prazo</li><li><strong>Próximos 10 dias úteis</strong> — prazo vence em até 10 dias úteis</li><li><strong>Prazo vencido</strong> — prazo expirou sem início da obra</li><li><strong>No prazo</strong> — mais de 10 dias úteis restantes</li></ul></span></span></h2>

<p>Monitoramento do prazo de início da obra: até 10 dias úteis após a data de AIO.</p>

```js
const inicioObraBase = geoScopedData.filter(d => d.dt_aio && d.situacao !== "Cancelado ou Distratado");
const inicioPrazoVencido = inicioObraBase.filter(d => d.status_inicio_obra === "Prazo vencido").length;
const inicioProx10 = inicioObraBase.filter(d => d.status_inicio_obra === "Próximos 10 dias úteis").length;
const inicioNoPrazo = inicioObraBase.filter(d => d.status_inicio_obra === "No prazo").length;
const iniciadaNoPrazo = inicioObraBase.filter(d => d.status_inicio_obra === "Iniciada no prazo").length;
const iniciadaEmAtraso = inicioObraBase.filter(d => d.status_inicio_obra === "Iniciada em atraso").length;
const previousInicioObraBase = geoScopedPreviousData.filter(d => d.dt_aio && d.situacao !== "Cancelado ou Distratado");
const previousInicioPrazoVencido = previousInicioObraBase.filter(d => d.status_inicio_obra === "Prazo vencido").length;
const previousInicioProx10 = previousInicioObraBase.filter(d => d.status_inicio_obra === "Próximos 10 dias úteis").length;
const previousInicioNoPrazo = previousInicioObraBase.filter(d => d.status_inicio_obra === "No prazo").length;
const previousIniciadaNoPrazo = previousInicioObraBase.filter(d => d.status_inicio_obra === "Iniciada no prazo").length;
const previousIniciadaEmAtraso = previousInicioObraBase.filter(d => d.status_inicio_obra === "Iniciada em atraso").length;
const inicioObraChart = [
  { status: "Iniciada no prazo", qtd: iniciadaNoPrazo, color: INICIO_OBRA_CORES["Iniciada no prazo"] },
  { status: "Iniciada em atraso", qtd: iniciadaEmAtraso, color: INICIO_OBRA_CORES["Iniciada em atraso"] },
  { status: "No prazo", qtd: inicioNoPrazo, color: INICIO_OBRA_CORES["No prazo"] },
  { status: "Próximos 10 dias úteis", qtd: inicioProx10, color: INICIO_OBRA_CORES["Próximos 10 dias úteis"] },
  { status: "Prazo vencido", qtd: inicioPrazoVencido, color: INICIO_OBRA_CORES["Prazo vencido"] },
].filter(d => d.qtd > 0);
```

```js
const selectedInicioObra = view(makeClickableChart(
  Plot.plot({
    marginLeft: 160,
    marginRight: 50,
    height: Math.max(170, inicioObraChart.length * 44 + 36),
    style: { fontFamily: "var(--font-sans, IBM Plex Sans, sans-serif)", fontSize: 13 },
    x: { label: null, grid: false, axis: null },
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
const countInicioObraStatus = (rows, status) => rows.filter(d => d.status_inicio_obra === status).length;
const inicioObraSelecionada = inicioObraBase.filter(d => matchesInicioObraSelection(d, selectedInicioObra));
const previousInicioObraSelecionada = previousInicioObraBase.filter(d => matchesInicioObraSelection(d, selectedInicioObra));
const valorInicioObraSelecionada = inicioObraSelecionada.reduce((sum, d) => sum + d.vlr_repasse, 0);
const previousValorInicioObraSelecionada = previousInicioObraSelecionada.reduce((sum, d) => sum + d.vlr_repasse, 0);
const inicioPrazoVencidoSelecionado = countInicioObraStatus(inicioObraSelecionada, "Prazo vencido");
const previousInicioPrazoVencidoSelecionado = countInicioObraStatus(previousInicioObraSelecionada, "Prazo vencido");
const inicioProx10Selecionado = countInicioObraStatus(inicioObraSelecionada, "Próximos 10 dias úteis");
const previousInicioProx10Selecionado = countInicioObraStatus(previousInicioObraSelecionada, "Próximos 10 dias úteis");
const inicioNoPrazoSelecionado = countInicioObraStatus(inicioObraSelecionada, "No prazo");
const previousInicioNoPrazoSelecionado = countInicioObraStatus(previousInicioObraSelecionada, "No prazo");
const iniciadaNoPrazoSelecionado = countInicioObraStatus(inicioObraSelecionada, "Iniciada no prazo");
const previousIniciadaNoPrazoSelecionado = countInicioObraStatus(previousInicioObraSelecionada, "Iniciada no prazo");
const iniciadaEmAtrasoSelecionado = countInicioObraStatus(inicioObraSelecionada, "Iniciada em atraso");
const previousIniciadaEmAtrasoSelecionado = countInicioObraStatus(previousInicioObraSelecionada, "Iniciada em atraso");

display(metricGrid([
  { label: "Com AIO", value: formatNumber(inicioObraSelecionada.length), delta: buildMetricDelta(inicioObraSelecionada.length, previousInicioObraSelecionada.length), tone: "default" },
  {
    label: "Valor dos contratos",
    value: formatCurrencyCompact(valorInicioObraSelecionada),
    detail: `${formatNumber(inicioObraSelecionada.length)} contrato${inicioObraSelecionada.length === 1 ? "" : "s"} no recorte atual de início da obra`,
    delta: buildMetricDelta(valorInicioObraSelecionada, previousValorInicioObraSelecionada, formatCurrencyDelta),
    tone: "blue",
  },
  { label: "Iniciada no prazo", value: formatNumber(iniciadaNoPrazoSelecionado), delta: buildMetricDelta(iniciadaNoPrazoSelecionado, previousIniciadaNoPrazoSelecionado), tone: "green" },
  { label: "Iniciada em atraso", value: formatNumber(iniciadaEmAtrasoSelecionado), delta: buildMetricDelta(iniciadaEmAtrasoSelecionado, previousIniciadaEmAtrasoSelecionado), tone: "red" },
  { label: "Prazo vencido", value: formatNumber(inicioPrazoVencidoSelecionado), delta: buildMetricDelta(inicioPrazoVencidoSelecionado, previousInicioPrazoVencidoSelecionado), tone: "red" },
  { label: "Próximos 10 dias úteis", value: formatNumber(inicioProx10Selecionado), delta: buildMetricDelta(inicioProx10Selecionado, previousInicioProx10Selecionado), tone: "gold" },
  { label: "No prazo", value: formatNumber(inicioNoPrazoSelecionado), delta: buildMetricDelta(inicioNoPrazoSelecionado, previousInicioNoPrazoSelecionado), tone: "blue" },
]));
```

```js
if (inicioPrazoVencidoSelecionado > 0 || inicioProx10Selecionado > 0) {
  const alertEl = document.createElement("div");
  alertEl.className = "urgency-alert";
  alertEl.innerHTML = `
    <div class="urgency-alert__icon">⚠️</div>
    <div class="urgency-alert__body">
      <div class="urgency-alert__title">Atenção: início de obra com prazo crítico</div>
      <div class="urgency-alert__text">
        ${inicioPrazoVencidoSelecionado > 0 ? `<strong>${formatNumber(inicioPrazoVencidoSelecionado)}</strong> contrato${inicioPrazoVencidoSelecionado > 1 ? "s" : ""} com <strong>prazo vencido</strong> para início da obra. ` : ""}
        ${inicioProx10Selecionado > 0 ? `<strong>${formatNumber(inicioProx10Selecionado)}</strong> contrato${inicioProx10Selecionado > 1 ? "s" : ""} nos <strong>próximos 10 dias úteis</strong> para início da obra.` : ""}
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
const hasCascadeSelection = Object.values(selectedCascade ?? {}).some(Boolean);
const tableData = geoScopedData.filter(d =>
  (!hasCascadeSelection || matchesCascadeSelection(d, selectedCascade)) &&
  matchesLicitacaoSelection(d, selectedLicitacao) &&
  matchesCasaCivilSelection(d, selectedCasaCivil) &&
  matchesInicioObraSelection(d, selectedInicioObra)
);

const exportColumns = [
  "_diff_label", "num_convenio", "cod_tci", "secretaria", "fase", "modalidade",
  "situacao", "situacao_suspensiva", "dt_assinatura", "dt_vencimento_suspensiva",
  "dt_retirada_suspensiva", "dt_lae", "data_limite_licitacao_casa_civil", "status_regra_casa_civil", "prazo_pub_licitacao", "status_pub_licitacao",
  "dt_pub_licitacao", "prazo_homolog_licitacao", "status_homolog_licitacao", "dt_homolog_licitacao",
  "dt_vrpl", "dt_aio", "prazo_inicio_obra", "status_inicio_obra", "dt_inicio_obra", "vlr_repasse",
];
const exportHeaders = {
  _diff_label: "Alteração",
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

function makeExportButton(rows, columns) {
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
      for (const col of columns) {
        let value = row[col] ?? "";
        if (col === "_diff_label") { value = value || ""; }
        else if (col === "vlr_repasse" && value !== "") value = Number(value) || 0;
        else if (dateColumns.has(col)) value = value ? formatDate(value) : "";
        exportRow[exportHeaders[col] ?? col] = value;
      }
      return exportRow;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const currencyColIndex = columns.indexOf("vlr_repasse");
    if (currencyColIndex >= 0) {
      const currencyColName = XLSX.utils.encode_col(currencyColIndex);
      for (let rowIndex = 2; rowIndex <= exportRows.length + 1; rowIndex += 1) {
        const cellRef = `${currencyColName}${rowIndex}`;
        if (worksheet[cellRef]) worksheet[cellRef].z = "#,##0.00";
      }
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tabela Filtrada");
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFileXLSX(workbook, `pc32-tabela-filtrada-${stamp}.xlsx`);
  });

  return btn;
}

function makePager(totalRows, pageSize) {
  const el = Object.assign(document.createElement("div"), { value: 1 });
  el.className = "pager";

  el.setState = ({ totalRows: nextTotalRows = totalRows, page = el.value } = {}) => {
    totalRows = nextTotalRows;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    const currentPage = Math.min(Math.max(1, page), totalPages);
    el.value = currentPage;
    el.innerHTML = "";

    const from = totalRows === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const to = totalRows === 0 ? 0 : Math.min(currentPage * pageSize, totalRows);
    const info = document.createElement("span");
    info.className = "pager-info";
    info.textContent = `${from}–${to} de ${totalRows}`;
    el.appendChild(info);

    const MAX_VISIBLE = 7;
    let pages = [];
    if (totalPages <= MAX_VISIBLE) {
      pages = Array.from({length: totalPages}, (_, i) => i + 1);
    } else {
      pages = [1];
      const left = Math.max(2, currentPage - 2);
      const right = Math.min(totalPages - 1, currentPage + 2);
      if (left > 2) pages.push("…");
      for (let i = left; i <= right; i += 1) pages.push(i);
      if (right < totalPages - 1) pages.push("…");
      pages.push(totalPages);
    }

    const go = (nextPage) => {
      if (nextPage === currentPage) return;
      el.value = nextPage;
      el.dispatchEvent(new Event("input", {bubbles: true}));
    };

    const prev = document.createElement("button");
    prev.textContent = "‹";
    prev.className = "pager-btn" + (currentPage === 1 ? " disabled" : "");
    prev.disabled = currentPage === 1;
    prev.addEventListener("click", () => go(currentPage - 1));
    el.appendChild(prev);

    for (const p of pages) {
      const btn = document.createElement(p === "…" ? "span" : "button");
      btn.textContent = p;
      if (p === "…") {
        btn.className = "pager-ellipsis";
      } else {
        btn.className = "pager-btn" + (p === currentPage ? " active" : "");
        btn.addEventListener("click", () => go(p));
      }
      el.appendChild(btn);
    }

    const next = document.createElement("button");
    next.textContent = "›";
    next.className = "pager-btn" + (currentPage === totalPages ? " disabled" : "");
    next.disabled = currentPage === totalPages;
    next.addEventListener("click", () => go(currentPage + 1));
    el.appendChild(next);
  };

  el.setState({totalRows, page: 1});
  return el;
}

function makeTableControls(rows, columns, pagerView) {
  const wrap = document.createElement("div");
  wrap.className = "table-controls";
  const exportBtn = makeExportButton(rows, columns);
  wrap.append(pagerView, exportBtn);
  return wrap;
}

function makePaginatedTable(rows, columns, options) {
  const wrap = document.createElement("div");
  const pagerView = makePager(rows.length, PAGE_SIZE);
  const controls = makeTableControls(rows, columns, pagerView);
  const tableView = Inputs.table(rows, {...options, rows: rows.length});
  wrap.append(controls, tableView);

  let observer;

  const syncPagination = ({resetPage = false} = {}) => {
    const bodyRows = Array.from(tableView.querySelectorAll("tbody tr"));
    const totalRows = bodyRows.length;
    const requestedPage = resetPage ? 1 : pagerView.value;
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;

    bodyRows.forEach((row, index) => {
      row.hidden = index < start || index >= end;
    });

    pagerView.setState({totalRows, page: currentPage});
  };

  pagerView.addEventListener("input", () => {
    syncPagination();
  });

  const bindSortReset = () => {
    tableView.querySelectorAll("thead th").forEach((cell) => {
      if (cell.dataset.pageSortBound === "true") return;
      cell.dataset.pageSortBound = "true";
      cell.addEventListener("click", () => {
        requestAnimationFrame(() => syncPagination({resetPage: true}));
      });
    });
  };

  requestAnimationFrame(() => {
    bindSortReset();
    syncPagination({resetPage: true});

    observer = new MutationObserver(() => {
      bindSortReset();
      syncPagination();
    });
    observer.observe(tableView, {childList: true, subtree: true});
  });

  return wrap;
}

function makeColumnPicker(columns, headers) {
  const selected = new Set(columns);
  const wrap = Object.assign(document.createElement("div"), { value: [...columns] });
  wrap.className = "col-picker";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "col-picker__toggle";
  toggle.textContent = "Personalizar colunas";

  const panel = document.createElement("div");
  panel.className = "col-picker__panel";
  panel.hidden = true;

  const actions = document.createElement("div");
  actions.className = "col-picker__actions";
  const selectAll = document.createElement("button");
  selectAll.type = "button";
  selectAll.className = "col-picker__action-btn";
  selectAll.textContent = "Selecionar todas";
  const clearAll = document.createElement("button");
  clearAll.type = "button";
  clearAll.className = "col-picker__action-btn";
  clearAll.textContent = "Limpar todas";
  actions.append(selectAll, clearAll);

  const grid = document.createElement("div");
  grid.className = "col-picker__grid";

  const chips = columns.map(col => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "col-picker__chip is-active";
    chip.textContent = headers[col] ?? col;
    chip.dataset.col = col;
    chip.addEventListener("click", () => {
      if (selected.has(col)) { selected.delete(col); chip.classList.remove("is-active"); }
      else { selected.add(col); chip.classList.add("is-active"); }
      emit();
    });
    return chip;
  });
  grid.append(...chips);

  selectAll.addEventListener("click", () => {
    columns.forEach(col => selected.add(col));
    chips.forEach(c => c.classList.add("is-active"));
    emit();
  });
  clearAll.addEventListener("click", () => {
    selected.clear();
    chips.forEach(c => c.classList.remove("is-active"));
    emit();
  });

  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    toggle.classList.toggle("is-open");
  });

  function emit() {
    wrap.value = columns.filter(c => selected.has(c));
    wrap.dispatchEvent(new Event("input", { bubbles: true }));
  }

  panel.append(actions, grid);
  wrap.append(toggle, panel);
  return wrap;
}

const selectedColumns = view(makeColumnPicker(exportColumns, exportHeaders));
```

```js
const activeColumns = selectedColumns;
```

```js
const dateCol = d => d ? formatDate(d) : "—";
const tciLinkCol = d => d
  ? html`<a href=${`https://saci.cidades.gov.br/contratos/${d}`} target="_blank" rel="noopener noreferrer">${d}</a>`
  : "—";

const diffFieldLabels = {
  situacao: "Situação", situacao_suspensiva: "Sit. Suspensiva", status_suspensiva: "Status Suspensiva",
  fase_atual: "Fase Atual", dt_retirada_suspensiva: "Ret. Suspensiva", dt_lae: "LAE",
  dt_pub_licitacao: "Pub. Licitação", dt_homolog_licitacao: "Homolog.", dt_vrpl: "VRPL",
  dt_aio: "AIO", dt_inicio_obra: "Início Obra", vlr_repasse: "Repasse",
  status_pub_licitacao: "Status Pub.", status_homolog_licitacao: "Status Homolog.",
  status_inicio_obra: "Status Início Obra", status_regra_casa_civil: "Regra Casa Civil",
  urgencia_suspensiva: "Urgência Susp.",
};

function diffCol(value) {
  if (!value || value === "Sem alteração") return "—";
  const cls = value === "Novo" ? "diff-pill--novo" : "diff-pill--alterado";
  const label = diffFieldLabels[value] || value;
  const el = html`<span class="diff-pill ${cls}">${label}</span>`;
  return el;
}
display(makePaginatedTable(tableData, activeColumns, {
  columns: activeColumns,
  select: false,
  header: {
    _diff_label: "Alteração", num_convenio: "Convênio", cod_tci: "TCI", secretaria: "Secretaria",
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
    _diff_label: diffCol,
    cod_tci: tciLinkCol,
    vlr_repasse: d => d.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    dt_assinatura: dateCol, dt_lae: dateCol, data_limite_licitacao_casa_civil: dateCol, prazo_pub_licitacao: dateCol, dt_pub_licitacao: dateCol,
    prazo_homolog_licitacao: dateCol, prazo_inicio_obra: dateCol,
    dt_homolog_licitacao: dateCol, dt_vrpl: dateCol, dt_aio: dateCol,
    dt_inicio_obra: dateCol, dt_vencimento_suspensiva: dateCol, dt_retirada_suspensiva: dateCol,
  },
  multiple: false,
}));
```

</div>
