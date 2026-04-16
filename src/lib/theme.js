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

// Cores por região geográfica
export const REGIAO_CORES = {
  "Norte": "#7c3aed",
  "Nordeste": "#c2410c",
  "Sudeste": "#0f766e",
  "Sul": "#2563eb",
  "Centro-Oeste": "#b45309",
  "Não informado": "#64748b",
};

// Ordem convencional das regiões brasileiras
export const REGIAO_ORDER = ["Norte", "Nordeste", "Sudeste", "Sul", "Centro-Oeste", "Não informado"];

// Cores fallback para UFs (quando não há cor de região)
export const GEO_FALLBACK_COLORS = ["#0f766e", "#2563eb", "#7c3aed", "#c2410c", "#b45309", "#be123c", "#0369a1", "#4d7c0f"];
