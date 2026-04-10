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
  dias_ate_publicacao: d.dias_ate_publicacao ? +d.dias_ate_publicacao : null,
  dias_publicacao_ate_homologacao: d.dias_publicacao_ate_homologacao ? +d.dias_publicacao_ate_homologacao : null,
  dias_homologacao_ate_vrpl: d.dias_homologacao_ate_vrpl ? +d.dias_homologacao_ate_vrpl : null,
  dias_vrpl_ate_aio: d.dias_vrpl_ate_aio ? +d.dias_vrpl_ate_aio : null,
  dias_aio_ate_inicio_obra: d.dias_aio_ate_inicio_obra ? +d.dias_aio_ate_inicio_obra : null,
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
const updatedAt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
}).format(new Date());

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
const fConvenioInput = Inputs.search(rawData, {
  placeholder: "Buscar por num. convênio ou TCI…",
  columns: ["num_convenio", "cod_tci"],
  label: "Convênio / TCI",
});

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
    if (selected.size === 0) toggle.textContent = allLabel;
    else if (selected.size === 1) toggle.textContent = [...selected][0];
    else toggle.textContent = `${selected.size} ${selectedLabel}`;
  };

  const emit = () => {
    wrap.value = options.filter(option => selected.has(option));
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
  return {
    secretaria: state.secretaria.filter(value => options.secretaria.includes(value)),
    modalidade: state.modalidade.filter(value => options.modalidade.includes(value)),
    ano: state.ano.filter(value => options.ano.includes(value))
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
const clearFiltersButton = html`<button type="button" class="filters-reset">Limpar filtros</button>`;

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

function renderLicitacaoFlow(data) {
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
);

const previousBaseData = previousRawData.filter(d =>
  fConvenio.some(row => row.num_convenio === d.num_convenio && row.cod_tci === d.cod_tci) &&
  matchesSecretariaFilter(d) &&
  matchesModalidadeFilter(d) &&
  matchesAnoFilter(d)
);

const previousData = previousBaseData.filter(d =>
  (selectedSituacao == null || d.situacao === selectedSituacao) &&
  (selectedSuspensiva == null || d.situacao_suspensiva === selectedSuspensiva)
);

const total = data.length;
const comSuspensiva = data.filter(d => d.situacao === "Contratado - Suspensiva").length;
const semSuspensiva = data.filter(d => d.situacao === "Contratado - Normal").length;
const vlrTotal = data.reduce((s, d) => s + d.vlr_repasse, 0);
const previousTotal = previousData.length;
const previousComSuspensiva = previousData.filter(d => d.situacao === "Contratado - Suspensiva").length;
const previousSemSuspensiva = previousData.filter(d => d.situacao === "Contratado - Normal").length;
const previousVlrTotal = previousData.reduce((s, d) => s + d.vlr_repasse, 0);
const pctSuspensiva = total > 0 ? comSuspensiva / total : 0;
const secretariaDrillField = secretariaSelecionada.length === 1 ? "modalidade" : "secretaria";
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
  {
    label: "Total selecionadas",
    value: formatNumber(total),
    delta: buildMetricDelta(total, previousTotal),
    tone: "default"
  },
  { label: "Com suspensiva", value: formatNumber(comSuspensiva), detail: formatPercent(pctSuspensiva) + " do total", delta: buildMetricDelta(comSuspensiva, previousComSuspensiva), tone: "gold" },
  { label: "Sem suspensiva (Normal)", value: formatNumber(semSuspensiva), detail: formatPercent(total > 0 ? semSuspensiva / total : 0) + " do total", delta: buildMetricDelta(semSuspensiva, previousSemSuspensiva), tone: "green" },
  { label: "Valor total de repasse", value: formatCurrencyCompact(vlrTotal), delta: buildMetricDelta(vlrTotal, previousVlrTotal, formatCurrencyDelta), tone: "blue" },
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

<h2>Situação do Contrato <span class="rule-tooltip"><button class="rule-tooltip__trigger" aria-label="Regra">?</button><span class="rule-tooltip__content">Classificação da situação contratual conforme Transferegov.<ul><li><strong>Em Contratação</strong> — instrumento ainda não formalizado</li><li><strong>Contratado - Suspensiva</strong> — contrato assinado com condição suspensiva pendente</li><li><strong>Contratado - Normal</strong> — contrato ativo sem restrições</li><li><strong>Cancelado ou Distratado</strong> — contrato encerrado</li></ul></span></span></h2>

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

<h2>Situação da Análise Suspensiva <span class="rule-tooltip"><button class="rule-tooltip__trigger" aria-label="Regra">?</button><span class="rule-tooltip__content">Situação da análise da condição suspensiva registrada no Transferegov.<ul><li><strong>Doc. não enviada p/ análise</strong> — documentação ainda não submetida</li><li><strong>Análise não iniciada / iniciada</strong> — etapas de tramitação interna</li><li><strong>Analisada e aceita</strong> — condição aceita, aguardando retirada</li><li><strong>Suspensiva retirada</strong> — condição satisfeita, contrato liberado</li></ul></span></span></h2>

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

<h2>Análise de Suspensivas — Quebra por etapas <span class="rule-tooltip"><button class="rule-tooltip__trigger" aria-label="Regra">?</button><span class="rule-tooltip__content">Cascata dos contratos com suspensiva ativa, classificados por urgência do vencimento.<ul><li><strong>Vencida</strong> — data de vencimento da suspensiva já passou</li><li><strong>Próximos 30 dias</strong> — vence em até 30 dias corridos</li><li><strong>31–90 dias</strong> — vence entre 31 e 90 dias</li><li><strong>Mais de 90 dias</strong> — vence após 90 dias</li><li><strong>Sem data</strong> — sem data de vencimento registrada</li></ul></span></span></h2>

<p>Cascata proporcional: do total à urgência de vencimento</p>

```js
const comSuspData = data.filter(d => d.situacao === "Contratado - Suspensiva");
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

const selectedCascade = view(cascadeChart(data));
```

</div>

<div class="card card--licitacao-analysis">

<h2>Análise de Licitação — Prazos de publicação e homologação <span class="rule-tooltip"><button class="rule-tooltip__trigger" aria-label="Regra">?</button><span class="rule-tooltip__content">Monitoramento dos prazos de licitação a partir da retirada da suspensiva.<ul><li><strong>Prazo de publicação</strong> — até 120 dias corridos após a data de retirada da suspensiva</li><li><strong>Prazo de homologação</strong> — até 120 dias corridos após a publicação da licitação</li><li><strong>Regra Casa Civil</strong> — publicação, homologação e ordem de serviço devem ocorrer até 31/03/2026</li></ul>Classificação de prazo:<ul><li><strong>Vencida</strong> — prazo já expirou</li><li><strong>Próximos 30 dias</strong> — vence em até 30 dias</li><li><strong>No prazo</strong> — mais de 30 dias restantes</li></ul></span></span></h2>

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
const previousLicitacaoBase = previousData.filter(d => d.dt_retirada_suspensiva && d.situacao !== "Cancelado ou Distratado");
const previousAguardandoPublicacao = previousLicitacaoBase.filter(d => !d.dt_pub_licitacao);
const previousPublicacaoVencida = previousAguardandoPublicacao.filter(d => d.status_pub_licitacao === "Vencida").length;
const previousPublicacaoProx30 = previousAguardandoPublicacao.filter(d => d.status_pub_licitacao === "Próximos 30 dias").length;
const previousPublicadas = previousLicitacaoBase.filter(d => d.dt_pub_licitacao);
const previousHomologacaoPendente = previousPublicadas.filter(d => !d.dt_homolog_licitacao);
const previousHomologacaoVencida = previousHomologacaoPendente.filter(d => d.status_homolog_licitacao === "Vencida").length;
const previousHomologacaoProx30 = previousHomologacaoPendente.filter(d => d.status_homolog_licitacao === "Próximos 30 dias").length;
const licitacaoSelecionada = licitacaoBase.filter(d => matchesLicitacaoSelection(d, selectedLicitacao));
const previousLicitacaoSelecionada = previousLicitacaoBase.filter(d => matchesLicitacaoSelection(d, selectedLicitacao));
const valorLicitacaoSelecionada = licitacaoSelecionada.reduce((sum, d) => sum + d.vlr_repasse, 0);
const previousValorLicitacaoSelecionada = previousLicitacaoSelecionada.reduce((sum, d) => sum + d.vlr_repasse, 0);
const cumprimentoCasaCivil = [
  { status: "Cumpriu", qtd: licitacaoBase.filter(d => d.status_regra_casa_civil === "Cumpriu").length, color: LICITACAO_CORES["Cumpriu"] },
  { status: "Não cumpriu", qtd: licitacaoBase.filter(d => d.status_regra_casa_civil === "Não cumpriu").length, color: LICITACAO_CORES["Não cumpriu"] },
  { status: "Fora do escopo", qtd: data.filter(d => d.status_regra_casa_civil === "Fora do escopo").length, color: LICITACAO_CORES["Fora do escopo"] },
].filter(d => d.qtd > 0);

display(metricGrid([
  { label: "Com retirada de suspensiva", value: formatNumber(licitacaoBase.length), delta: buildMetricDelta(licitacaoBase.length, previousLicitacaoBase.length), tone: "default" },
  {
    label: "Valor dos contratos",
    value: formatCurrencyCompact(valorLicitacaoSelecionada),
    detail: `${formatNumber(licitacaoSelecionada.length)} contrato${licitacaoSelecionada.length === 1 ? "" : "s"} no recorte atual da licitação`,
    delta: buildMetricDelta(valorLicitacaoSelecionada, previousValorLicitacaoSelecionada, formatCurrencyDelta),
    tone: "blue",
  },
  { label: "Aguardando publicação", value: formatNumber(aguardandoPublicacao.length), detail: formatPercent(licitacaoBase.length > 0 ? aguardandoPublicacao.length / licitacaoBase.length : 0) + " com retirada de suspensiva", delta: buildMetricDelta(aguardandoPublicacao.length, previousAguardandoPublicacao.length), tone: "gold" },
  { label: "Publicação vencida", value: formatNumber(publicacaoVencida), detail: "prazo de 120 dias após retirada da suspensiva", delta: buildMetricDelta(publicacaoVencida, previousPublicacaoVencida), tone: "red" },
  { label: "Publicação nos próximos 30 dias", value: formatNumber(publicacaoProx30), delta: buildMetricDelta(publicacaoProx30, previousPublicacaoProx30), tone: "gold" },
  { label: "Homologação vencida", value: formatNumber(homologacaoVencida), detail: "prazo de 120 dias após publicação", delta: buildMetricDelta(homologacaoVencida, previousHomologacaoVencida), tone: "red" },
  { label: "Homologação nos próximos 30 dias", value: formatNumber(homologacaoProx30), delta: buildMetricDelta(homologacaoProx30, previousHomologacaoProx30), tone: "gold" },
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
const selectedLicitacao = view(renderLicitacaoFlow(data));
```

</div>

<div class="card card--inicio-obra-analysis">

<h2>Análise de Início da Obra — Prazo após AIO <span class="rule-tooltip"><button class="rule-tooltip__trigger" aria-label="Regra">?</button><span class="rule-tooltip__content">Monitoramento do prazo para início da obra após a emissão da AIO (Autorização de Início de Obra).<ul><li><strong>Prazo</strong> — 10 dias úteis após a data de AIO</li><li><strong>Iniciada no prazo</strong> — obra iniciada dentro do prazo</li><li><strong>Iniciada em atraso</strong> — obra iniciada após o prazo</li><li><strong>Próximos 10 dias úteis</strong> — prazo vence em até 10 dias úteis</li><li><strong>Prazo vencido</strong> — prazo expirou sem início da obra</li><li><strong>No prazo</strong> — mais de 10 dias úteis restantes</li></ul></span></span></h2>

<p>Monitoramento do prazo de início da obra: até 10 dias úteis após a data de AIO.</p>

```js
const inicioObraBase = data.filter(d => d.dt_aio && d.situacao !== "Cancelado ou Distratado");
const inicioPrazoVencido = inicioObraBase.filter(d => d.status_inicio_obra === "Prazo vencido").length;
const inicioProx10 = inicioObraBase.filter(d => d.status_inicio_obra === "Próximos 10 dias úteis").length;
const inicioNoPrazo = inicioObraBase.filter(d => d.status_inicio_obra === "No prazo").length;
const iniciadaNoPrazo = inicioObraBase.filter(d => d.status_inicio_obra === "Iniciada no prazo").length;
const iniciadaEmAtraso = inicioObraBase.filter(d => d.status_inicio_obra === "Iniciada em atraso").length;
const previousInicioObraBase = previousData.filter(d => d.dt_aio && d.situacao !== "Cancelado ou Distratado");
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
const inicioObraSelecionada = inicioObraBase.filter(d => matchesInicioObraSelection(d, selectedInicioObra));
const previousInicioObraSelecionada = previousInicioObraBase.filter(d => matchesInicioObraSelection(d, selectedInicioObra));
const valorInicioObraSelecionada = inicioObraSelecionada.reduce((sum, d) => sum + d.vlr_repasse, 0);
const previousValorInicioObraSelecionada = previousInicioObraSelecionada.reduce((sum, d) => sum + d.vlr_repasse, 0);

display(metricGrid([
  { label: "Com AIO", value: formatNumber(inicioObraBase.length), delta: buildMetricDelta(inicioObraBase.length, previousInicioObraBase.length), tone: "default" },
  {
    label: "Valor dos contratos",
    value: formatCurrencyCompact(valorInicioObraSelecionada),
    detail: `${formatNumber(inicioObraSelecionada.length)} contrato${inicioObraSelecionada.length === 1 ? "" : "s"} no recorte atual de início da obra`,
    delta: buildMetricDelta(valorInicioObraSelecionada, previousValorInicioObraSelecionada, formatCurrencyDelta),
    tone: "blue",
  },
  { label: "Iniciada no prazo", value: formatNumber(iniciadaNoPrazo), delta: buildMetricDelta(iniciadaNoPrazo, previousIniciadaNoPrazo), tone: "green" },
  { label: "Iniciada em atraso", value: formatNumber(iniciadaEmAtraso), delta: buildMetricDelta(iniciadaEmAtraso, previousIniciadaEmAtraso), tone: "red" },
  { label: "Prazo vencido", value: formatNumber(inicioPrazoVencido), delta: buildMetricDelta(inicioPrazoVencido, previousInicioPrazoVencido), tone: "red" },
  { label: "Próximos 10 dias úteis", value: formatNumber(inicioProx10), delta: buildMetricDelta(inicioProx10, previousInicioProx10), tone: "gold" },
  { label: "No prazo", value: formatNumber(inicioNoPrazo), delta: buildMetricDelta(inicioNoPrazo, previousInicioNoPrazo), tone: "blue" },
]));
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
  matchesCascadeSelection(d, selectedCascade) &&
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
