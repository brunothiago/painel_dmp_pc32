import {SITUACAO_CORES, SUSPENSIVA_CORES, SITUACAO_ORDER, SUSPENSIVA_ORDER, URGENCIA_CORES, PALETTE} from "../lib/theme.js";

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

export function matchesCascadeSelection(d, selection = {}) {
  return (
    (selection.situacao == null || d.situacao === selection.situacao) &&
    (
      selection.suspensiva == null ||
      (d.situacao === "Contratado - Suspensiva" && d.situacao_suspensiva === selection.suspensiva)
    ) &&
    (
      selection.urgencia == null ||
      (
        d.situacao === "Contratado - Suspensiva" &&
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
    value: {situacao: null, suspensiva: null, urgencia: null}
  });

  function setFilter(key, label) {
    container.value = {
      ...container.value,
      [key]: container.value[key] === label ? null : label
    };
    render();
    container.dispatchEvent(new Event("input", {bubbles: true}));
  }

  const clear = el("button", "casc-clear");
  clear.type = "button";
  clear.textContent = "Limpar seleção";
  clear.hidden = true;
  clear.addEventListener("click", () => {
    container.value = {situacao: null, suspensiva: null, urgencia: null};
    render();
    container.dispatchEvent(new Event("input", {bubbles: true}));
  });

  function render() {
    container.innerHTML = "";
    clear.hidden = !Object.values(container.value).some(Boolean);
    container.append(clear);

    const filteredData = data.filter((d) => matchesCascadeSelection(d, container.value));
    const totalN1 = filteredData.length;

    if (totalN1 === 0) {
      const msg = el("p", "casc-empty");
      msg.textContent = "Nenhum contrato corresponde à seleção atual na cascata.";
      container.append(msg);
      return;
    }

    const bySituacao = SITUACAO_ORDER
      .map(s => ({
        label: s,
        qtd: filteredData.filter(d => d.situacao === s).length,
        color: SITUACAO_CORES[s] ?? PALETTE.gray,
      }))
      .filter(i => i.qtd > 0);

    container.append(
      level(
        `${totalN1.toLocaleString("pt-BR")} contratos selecionados`,
        "por situação do contrato",
        bySituacao,
        totalN1,
        {
          filterKey: "situacao",
          selectedValue: container.value.situacao,
          onSelect: setFilter
        }
      )
    );

    const comSusp = filteredData.filter(d => d.situacao === "Contratado - Suspensiva");
    const totalN2 = comSusp.length;

    if (totalN2 === 0) {
      const msg = el("p", "casc-empty");
      msg.textContent = "Nenhum contrato com suspensiva ativa na seleção atual.";
      container.append(msg);
      return;
    }

    container.append(connector(`${totalN2.toLocaleString("pt-BR")} com suspensiva ativa`));

    const byAnlise = SUSPENSIVA_ORDER
      .map(s => ({
        label: s,
        qtd: comSusp.filter(d => d.situacao_suspensiva === s).length,
        color: SUSPENSIVA_CORES[s] ?? PALETTE.gray,
      }))
      .filter(i => i.qtd > 0);

    container.append(
      level(
        `${totalN2.toLocaleString("pt-BR")} contratos em suspensiva`,
        "por situação da análise",
        byAnlise,
        totalN2,
        {
          filterKey: "suspensiva",
          selectedValue: container.value.suspensiva,
          onSelect: setFilter
        }
      )
    );

    container.append(connector("por prazo de vencimento da suspensiva"));

    const pendentes = comSusp.filter(d => !d.dt_retirada_suspensiva && d.situacao !== "Cancelado ou Distratado");
    const byUrgencia = URGENCIA_ORDER
      .map(u => ({
        label: u,
        qtd: pendentes.filter(d => d.urgencia_suspensiva === u).length,
        color: URGENCIA_CORES[u],
      }))
      .filter(i => i.qtd > 0);

    container.append(
      level(
        `${totalN2.toLocaleString("pt-BR")} contratos em suspensiva`,
        "por urgência do vencimento",
        byUrgencia,
        totalN2,
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
