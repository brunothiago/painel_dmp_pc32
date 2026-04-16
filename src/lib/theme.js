export const PALETTE = {
  ink: "#1f2937",
  blue: "#356c8c",
  blueSoft: "#dce7f2",
  green: "#0f766e",
  greenDeep: "#124842",
  greenSoft: "#d7ebe7",
  red: "#b42318",
  redSoft: "#fee2e1",
  gold: "#b45309",
  goldSoft: "#f3e2c8",
  orange: "#c2410c",
  orangeSoft: "#ffedd5",
  gray: "#6b7280",
  graySoft: "#f3f4f6",
  sand: "#f7f7f4",
  border: "#d3d8df",
  surface: "#ffffff",
  muted: "#5b6470",
};

// Cores por situação do contrato
export const SITUACAO_CORES = {
  "Contratado - Normal": "#0f766e",
  "Contratado - Suspensiva": "#b45309",
  "Cancelado ou Distratado": "#b42318",
  "Em Contratação": "#356c8c",
  "Contratado - Em Prestação de Contas": "#6b7280",
  "Não Identificado": "#9ca3af",
};

// Ordem das situações do contrato
export const SITUACAO_ORDER = [
  "Em Contratação",
  "Contratado - Suspensiva",
  "Contratado - Normal",
  "Contratado - Em Prestação de Contas",
  "Cancelado ou Distratado",
  "Não Identificado",
];

// Ordem das situações de análise suspensiva
export const SUSPENSIVA_ORDER = [
  "Doc. não enviada p/ análise",
  "Análise não iniciada",
  "Análise iniciada",
  "Analisada e rejeitada",
  "Analisada com pendências",
  "Analisada e aceita",
  "Suspensiva retirada",
];

// Cores por situação da análise suspensiva (paleta laranja — do claro ao escuro)
export const SUSPENSIVA_CORES = {
  "Suspensiva retirada": "#78350f",
  "Analisada e aceita": "#92400e",
  "Análise iniciada": "#b45309",
  "Analisada com pendências": "#c2410c",
  "Análise não iniciada": "#d97706",
  "Analisada e rejeitada": "#ea580c",
  "Doc. não enviada p/ análise": "#f59e0b",
};

// Cores de urgência da suspensiva (paleta laranja)
export const URGENCIA_CORES = {
  "Vencida": "#ea580c",
  "Próximos 30 dias": "#d97706",
  "31–90 dias": "#b45309",
  "Mais de 90 dias": "#92400e",
  "Sem data": "#78350f",
};

// Cores do bloco de licitação (paleta verde — do claro ao escuro)
export const LICITACAO_CORES = {
  "Aguardando publicação": "#86efac",
  "Publicada": "#34d399",
  "Homologação pendente": "#6ee7b7",
  "Homologada": "#10b981",
  "Vencida": "#064e3b",
  "Próximos 30 dias": "#fbbf24",
  "No prazo": "#a7f3d0",
  "Sem prazo (PC 72)": "#cbd5e1",
  "Sem prazo calculado": "#94a3b8",
  "Cumpriu o prazo": "#10b981",
  "Pendente": "#f59e0b",
  "Fora do escopo": "#d1fae5",
};

// Cores do bloco de início de obra (paleta azul — do claro ao escuro)
export const INICIO_OBRA_CORES = {
  "Iniciada no prazo": "#60a5fa",
  "Iniciada em atraso": "#1e3a5f",
  "No prazo": "#93c5fd",
  "Próximos 10 dias úteis": "#3b82f6",
  "Prazo vencido": "#1e3a5f",
};

const GEO_NEUTRAL_COLOR = "#94a3b8";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(hex) {
  const value = String(hex).trim().replace(/^#/, "");
  if (value.length === 3) return value.split("").map((char) => char + char).join("");
  return value;
}

function hexToRgb(hex) {
  const value = normalizeHex(hex);
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function rgbToHex({r, g, b}) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHsl({r, g, b}) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return {h: 0, s: 0, l: lightness};

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

  let hue;
  switch (max) {
    case rn:
      hue = (gn - bn) / delta + (gn < bn ? 6 : 0);
      break;
    case gn:
      hue = (bn - rn) / delta + 2;
      break;
    default:
      hue = (rn - gn) / delta + 4;
      break;
  }

  return {h: hue * 60, s: saturation, l: lightness};
}

function hslToRgb({h, s, l}) {
  const hue = ((h % 360) + 360) % 360;
  if (s === 0) {
    const gray = l * 255;
    return {r: gray, g: gray, b: gray};
  }

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = l - c / 2;
  let rgbPrime;

  if (hue < 60) rgbPrime = {r: c, g: x, b: 0};
  else if (hue < 120) rgbPrime = {r: x, g: c, b: 0};
  else if (hue < 180) rgbPrime = {r: 0, g: c, b: x};
  else if (hue < 240) rgbPrime = {r: 0, g: x, b: c};
  else if (hue < 300) rgbPrime = {r: x, g: 0, b: c};
  else rgbPrime = {r: c, g: 0, b: x};

  return {
    r: (rgbPrime.r + m) * 255,
    g: (rgbPrime.g + m) * 255,
    b: (rgbPrime.b + m) * 255,
  };
}

function adjustColor(baseHex, {hue = 0, saturation = 0, lightness = 0} = {}) {
  const hsl = rgbToHsl(hexToRgb(baseHex));
  return rgbToHex(
    hslToRgb({
      h: hsl.h + hue,
      s: clamp(hsl.s + saturation, 0, 1),
      l: clamp(hsl.l + lightness, 0, 1),
    })
  );
}

function hashLabel(label) {
  return [...String(label)].reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

const GEO_STATE_VARIANTS = [
  {hue: 0, saturation: 0, lightness: 0},
  {hue: 4, saturation: 0.03, lightness: 0.08},
  {hue: -5, saturation: -0.02, lightness: -0.08},
  {hue: 8, saturation: 0.02, lightness: 0.14},
  {hue: -9, saturation: -0.03, lightness: -0.12},
  {hue: 12, saturation: 0.04, lightness: 0.04},
  {hue: -12, saturation: -0.01, lightness: 0.18},
  {hue: 16, saturation: 0.03, lightness: -0.04},
];

const GEO_MUNICIPIO_VARIANTS = [
  {hue: 0, saturation: 0, lightness: 0},
  {hue: 2, saturation: 0.02, lightness: 0.1},
  {hue: -2, saturation: -0.01, lightness: -0.08},
  {hue: 4, saturation: 0.02, lightness: 0.16},
  {hue: -4, saturation: -0.02, lightness: -0.14},
  {hue: 6, saturation: 0.03, lightness: 0.06},
  {hue: -6, saturation: -0.02, lightness: 0.2},
  {hue: 8, saturation: 0.02, lightness: -0.04},
  {hue: -8, saturation: -0.03, lightness: 0.12},
  {hue: 10, saturation: 0.03, lightness: -0.1},
];

// Cores por região geográfica
export const REGIAO_CORES = {
  "Norte": "#2f7d4a",
  "Nordeste": "#B8325E",
  "Centro-Oeste": "#6b8e23",
  "Sudeste": "#1f6c8b",
  "Sul": "#6e4cc9",
  "Não informado": GEO_NEUTRAL_COLOR,
};

// Ordem convencional das regiões brasileiras
export const REGIAO_ORDER = ["Norte", "Nordeste", "Sudeste", "Sul", "Centro-Oeste", "Não informado"];

export function getRegiaoColor(regiao) {
  return REGIAO_CORES[regiao] ?? GEO_NEUTRAL_COLOR;
}

export function getUfColor(uf, regiao) {
  const base = getRegiaoColor(regiao);
  if (!uf || uf === "Não informado") return adjustColor(base, {saturation: -0.12, lightness: 0.18});
  const variant = GEO_STATE_VARIANTS[hashLabel(`${regiao}-${uf}`) % GEO_STATE_VARIANTS.length];
  return adjustColor(base, variant);
}

export function getMunicipioColor(municipio, uf, regiao) {
  if (!municipio || municipio === "Não informado") return GEO_NEUTRAL_COLOR;
  const stateBase = getUfColor(uf, regiao);
  const variant = GEO_MUNICIPIO_VARIANTS[hashLabel(`${regiao}-${uf}-${municipio}`) % GEO_MUNICIPIO_VARIANTS.length];
  return adjustColor(stateBase, variant);
}

export const GEO_FALLBACK_COLORS = Object.values(REGIAO_CORES);
