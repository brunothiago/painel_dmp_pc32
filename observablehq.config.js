import {resolveCurrentNavPath} from "./src/lib/navigation.js";

export default {
  title: "Painel PC 32 — Novo PAC",
  root: "src",
  output: "dist",
  theme: "air",
  sidebar: false,
  toc: false,
  pager: false,
  search: false,
  pages: [
    { name: "Painel", path: "index" },
    { name: "Alterações", path: "alteracoes" },
  ],
  head: `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@500;600;700&display=swap" rel="stylesheet">
    <link rel="icon" href="./favicon.ico" type="image/x-icon">
    <link rel="apple-touch-icon" href="./apple-touch-icon.png">
    <link rel="stylesheet" href="./theme.css">
  `,
  header: `
    <div class="site-shell">
      <div class="site-topbar">
        <div class="brand-lockup">
          <a class="brand-home" href="./" aria-label="Página inicial do Painel PC 32 — Novo PAC Seleção">
            <div class="brand-text">
              <span class="brand-kicker">Ministério das Cidades</span>
              <span class="brand-title">Painel PC 32 — Novo PAC Seleção</span>
            </div>
          </a>
        </div>
        <nav class="site-nav" aria-label="Navegação principal">
          <a href="./">Painel</a>
          <a href="./alteracoes">Alterações</a>
        </nav>
      </div>
    </div>
    <script>
      const resolveCurrentNavPath = ${resolveCurrentNavPath.toString()};
      (() => {
        const currentNavPath = resolveCurrentNavPath(location.pathname);
        document.querySelectorAll(".site-nav a").forEach((a) => {
          const href = new URL(a.getAttribute("href"), location.href).pathname.replace(/\\/$/, "") || "/";
          if (href === currentNavPath) a.setAttribute("aria-current", "page");
        });
      })();
    </script>
  `,
  footer: `
    <div class="site-shell footer-shell">
      <hr class="page-note-divider" style="margin-top:0">
      <div class="footer-content">
        <div class="footer-info">
          <p>Acompanhamento dos contratos da <a href="https://www.gov.br/transferegov/pt-br/legislacao/portarias/portaria-conjunta-mgi-mf-cgu-no-32-de-4-de-junho-de-2024" target="_blank" rel="noopener noreferrer">Portaria Conjunta 32</a> — Novo PAC Seleção.</p>
          <p>Fonte: CGPAC / Ministério das Cidades</p>
        </div>
        <img class="footer-logo" src="./logos/logo_mcid.png" alt="Logo do Ministério das Cidades">
      </div>
    </div>
  `,
};
