import {SITUACAO_CORES, SUSPENSIVA_CORES, SITUACAO_ORDER, SUSPENSIVA_ORDER, URGENCIA_CORES, PALETTE} from "../lib/theme.js";
import {hexToRgba} from "../lib/dom-helpers.js";

const URGENCIA_ORDER = ["Vencida", "Próximos 30 dias", "31–90 dias", "Mais de 90 dias", "Sem data"];

function el(tag, cls) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

function proportionalBar(items, total, options = {}) {
  const {filterKey, selectedValue, onSelect} = options;
  const wrap = el("div", "casc-bar");
  for (const {label, qtd, color} of items) {
    if (!qtd) continue;
    const pct = (qtd / total) * 100;
    const seg = el("div", "casc-bar__seg");
    seg.style.cssText = `width:${pct}%;background:${color};`;
    seg.title = `${label}: ${qtd.toLocaleString("pt-BR")} (${pct.toFixed(1)}%)`;
    if (filterKey) {
      seg.classList.add("is-clickable");
      if (selectedValue === label) seg.classList.add("is-selected");
      seg.dataset.filterKey = filterKey;
      seg.dataset.filterLabel = label;
      seg.setAttribute("role", "button");
      seg.tabIndex = 0;
      seg.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelect(filterKey, label);
      });
      seg.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(filterKey, label);
        }
      });
    }
    if (pct > 4) {
      const lbl = el("span", "casc-bar__seg-num");
      lbl.textContent = qtd.toLocaleString("pt-BR");
      seg.append(lbl);
    }
    wrap.append(seg);
  }
  return wrap;
}

function legend(items, options = {}) {
  const {filterKey, selectedValue, onSelect} = options;
  const wrap = el("div", "casc-legend");
  for (const {label, qtd, color, pct} of items) {
    if (!qtd) continue;
    const item = el("div", "casc-legend__item");
    if (filterKey) {
      item.classList.add("is-clickable");
      if (selectedValue === label) item.classList.add("is-selected");
      item.dataset.filterKey = filterKey;
      item.dataset.filterLabel = label;
      item.setAttribute("role", "button");
      item.tabIndex = 0;
      item.addEventListener("click", () => onSelect(filterKey, label));
      item.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(filterKey, label);
        }
      });
    }
    const dot = el("span", "casc-legend__dot");
    dot.style.background = color;
    const txt = el("span", "casc-legend__text");
    txt.innerHTML = `<strong>${label}</strong> <span>${qtd.toLocaleString("pt-BR")}</span>`;
    if (pct !== undefined) {
      const badge = el("span", "casc-legend__pct");
      badge.textContent = `${pct.toFixed(1)}%`;
      badge.style.color = color;
      txt.append(badge);
    }
    item.append(dot, txt);
    wrap.append(item);
  }
  return wrap;
}

function level(title, subtitle, items, total, options = {}) {
  const wrap = el("div", "casc-level");
  const header = el("div", "casc-level__header");
  const h = el("strong", "casc-level__title");
  h.textContent = title;
  const sub = el("span", "casc-level__subtitle");
  sub.textContent = subtitle;
  header.append(h, sub);

  const itemsWithPct = items.map(i => ({...i, pct: (i.qtd / total) * 100}));
  wrap.append(
    header,
    proportionalBar(itemsWithPct, total, options),
    legend(itemsWithPct, options)
  );
  return wrap;
}

function connector(label) {
  const wrap = el("div", "casc-connector");
  const line = el("div", "casc-connector__line");
  const lbl = el("span", "casc-connector__label");
  lbl.textContent = label;
  wrap.append(line, lbl);
  return wrap;
}

function styleActiveChip(chip, color) {
  chip.style.setProperty("--chip-border", hexToRgba(color, 0.28));
  chip.style.setProperty("--chip-bg", hexToRgba(color, 0.12));
  chip.style.setProperty("--chip-bg-hover", hexToRgba(color, 0.18));
  chip.style.setProperty("--chip-fg", color);
}

function activeSelection(values, colorByKey, onClear) {
  const entries = Object.entries(values).filter(([, value]) => value != null);
  if (entries.length === 0) return null;

  const labels = {
    suspensiva: "Situação",
    urgencia: "Urgência",
  };

  const wrap = el("div", "casc-active");
  for (const [key, value] of entries) {
    const chip = el("button", "casc-active__chip");
    chip.type = "button";
    chip.textContent = `${labels[key] ?? key}: ${value} ×`;
    styleActiveChip(chip, colorByKey[key]?.(value) ?? PALETTE.blue);
    chip.addEventListener("click", () => onClear(key));
    wrap.append(chip);
  }
  return wrap;
}

export function matchesCascadeSelection(d, selection = {}) {
  return (
    d.situacao === "Contratado - Suspensiva" &&
    (selection.suspensiva == null || d.situacao_suspensiva === selection.suspensiva) &&
    (
      selection.urgencia == null ||
      (
        !d.dt_retirada_suspensiva &&
        d.urgencia_suspensiva === selection.urgencia
      )
    )
  );
}

/**
 * @param {Array} data - dados filtrados
 */
export function cascadeChart(data) {
  const container = Object.assign(el("div", "casc-chart"), {
    value: {suspensiva: null, urgencia: null}
  });

  function setFilter(key, label) {
    const nextValue = container.value[key] === label ? null : label;
    container.value = {
      ...container.value,
      [key]: nextValue
    };
    render();
    container.dispatchEvent(new Event("input", {bubbles: true}));
  }

  const clear = el("button", "casc-clear");
  clear.type = "button";
  clear.textContent = "Limpar seleção";
  clear.hidden = true;
  clear.addEventListener("click", () => {
    container.value = {suspensiva: null, urgencia: null};
    render();
    container.dispatchEvent(new Event("input", {bubbles: true}));
  });

  function render() {
    container.innerHTML = "";
    clear.hidden = !Object.values(container.value).some(Boolean);
    container.append(clear);
    const active = activeSelection(
      container.value,
      {
        suspensiva: (value) => SUSPENSIVA_CORES[value] ?? PALETTE.orange,
        urgencia: (value) => URGENCIA_CORES[value] ?? PALETTE.gold,
      },
      (key) => {
        container.value = {...container.value, [key]: null};
        render();
        container.dispatchEvent(new Event("input", {bubbles: true}));
      }
    );
    if (active) container.append(active);

    const filteredData = data.filter((d) => matchesCascadeSelection(d, container.value));
    const totalN1 = filteredData.length;

    if (totalN1 === 0) {
      const msg = el("p", "casc-empty");
      msg.textContent = "Nenhum contrato corresponde à seleção atual na cascata.";
      container.append(msg);
      return;
    }

    const pendentes = filteredData.filter(d => !d.dt_retirada_suspensiva);

    const byAnlise = SUSPENSIVA_ORDER
      .map(s => ({
        label: s,
        qtd: filteredData.filter(d => d.situacao_suspensiva === s).length,
        color: SUSPENSIVA_CORES[s] ?? PALETTE.gray,
      }))
      .filter(i => i.qtd > 0);

    container.append(
      level(
        `${totalN1.toLocaleString("pt-BR")} contratos em suspensiva`,
        "por situação da análise",
        byAnlise,
        totalN1,
        {
          filterKey: "suspensiva",
          selectedValue: container.value.suspensiva,
          onSelect: setFilter
        }
      )
    );

    container.append(connector("por prazo de vencimento da suspensiva"));
    const byUrgencia = URGENCIA_ORDER
      .map(u => ({
        label: u,
        qtd: pendentes.filter(d => d.urgencia_suspensiva === u).length,
        color: URGENCIA_CORES[u],
      }))
      .filter(i => i.qtd > 0);

    container.append(
      level(
        `${pendentes.length.toLocaleString("pt-BR")} contratos com suspensiva pendente`,
        "por urgência do vencimento",
        byUrgencia,
        pendentes.length,
        {
          filterKey: "urgencia",
          selectedValue: container.value.urgencia,
          onSelect: setFilter
        }
      )
    );
  }

  render();
  return container;
}
