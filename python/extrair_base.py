"""
Extrai dados da view PostgreSQL e salva como CSV.

Uso:
  1. Preencha o arquivo config.env com as credenciais do banco
  2. uv run extrair_base.py
"""

import csv
import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

from base_snapshot_diff import generate_daily_snapshot_diff

load_dotenv(os.path.join(os.path.dirname(__file__), "config.env"))

DATABASE_URL = URL.create(
    drivername="postgresql+psycopg2",
    username=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT", "5432")),
    database=os.getenv("DB_NAME"),
)

CSV_OUTPUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "base_pc_32.csv")
HISTORY_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "historico")
DIFF_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "diff")
LATEST_DIFF_JSON = os.path.join(os.path.dirname(__file__), "..", "src", "data", "base_diff_latest.json")
PREVIOUS_CSV_OUTPUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "base_pc_32_previous.csv")
FIRST_CSV_OUTPUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "base_pc_32_first.csv")
CUMULATIVE_DIFF_OUTPUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "base_alteracoes.csv")

QUERY = text("""
WITH publicacao_licitacao AS (
    SELECT tl.num_convenio,
           min(tl.dte_publicacao_licitacao) AS dte_publicacao_licitacao
    FROM mcid_transferegov.tab_licitacao tl
    GROUP BY tl.num_convenio
),
homologacao_licitacao AS (
    SELECT tl.num_convenio,
           min(tl.dte_homologacao_licitacao) AS dte_homologacao_licitacao
    FROM mcid_transferegov.tab_licitacao tl
    GROUP BY tl.num_convenio
),
base AS (
    SELECT
        tci.cod_tci,
        tci.num_convenio,
        tci.txt_uf,
        tci.txt_regiao,
        tci.cod_ibge_7dig,
        tci.txt_municipio,
        tci.dsc_objeto_instrumento,
        tci.txt_sigla_secretaria,
        tci.dsc_fase_pac,
        tci.txt_modalidade,
        tci.dsc_situacao_contrato_mcid,
        tci.dte_assinatura_contrato,
        pbi.situacao_da_analise_suspensiva,
        pbi.vencimento_da_suspensiva,
        tcon.dte_retirada_suspensiva,
        tdb.dte_primeira_data_lae,
        pl.dte_publicacao_licitacao,
        hl.dte_homologacao_licitacao,
        tdb.dte_vrpl,
        tdb.dte_aio,
        tci.dte_inicio_obra_mcid,
        tci.vlr_repasse,

        -- status_suspensiva
        CASE
            WHEN pbi.vencimento_da_suspensiva IS NOT NULL
             AND tcon.dte_retirada_suspensiva IS NULL
            THEN 'PENDENTE'
            WHEN tcon.dte_retirada_suspensiva IS NOT NULL
            THEN 'RETIRADA'
            ELSE 'SEM SUSPENSIVA'
        END AS status_suspensiva,

        -- flags
        CASE WHEN pl.dte_publicacao_licitacao IS NOT NULL THEN 'SIM' ELSE 'NAO' END AS flag_publicacao_licitacao,
        CASE WHEN hl.dte_homologacao_licitacao IS NOT NULL THEN 'SIM' ELSE 'NAO' END AS flag_homologacao_licitacao,

        -- ultima_data_relevante (maior data entre os marcos atingidos)
        greatest(
            tci.dte_inicio_obra_mcid, tdb.dte_aio, tdb.dte_vrpl,
            hl.dte_homologacao_licitacao, pl.dte_publicacao_licitacao,
            tdb.dte_primeira_data_lae
        ) AS ultima_data_relevante,

        -- fase_atual
        CASE
            WHEN tci.dte_inicio_obra_mcid IS NOT NULL THEN 'OBRA INICIADA'
            WHEN tdb.dte_aio IS NOT NULL THEN 'AIO'
            WHEN tdb.dte_vrpl IS NOT NULL THEN 'VRPL'
            WHEN hl.dte_homologacao_licitacao IS NOT NULL THEN 'HOMOLOGACAO'
            WHEN pl.dte_publicacao_licitacao IS NOT NULL THEN 'PUBLICACAO LICITACAO'
            WHEN tdb.dte_primeira_data_lae IS NOT NULL THEN 'LAE'
            WHEN tcon.dte_retirada_suspensiva IS NOT NULL THEN 'SUSPENSIVA RETIRADA'
            WHEN pbi.vencimento_da_suspensiva IS NOT NULL THEN 'SUSPENSIVA'
            ELSE 'SEM ANDAMENTO'
        END AS fase_atual,

        -- intervalos em dias
        (pl.dte_publicacao_licitacao - tdb.dte_primeira_data_lae) AS dias_ate_publicacao,
        (hl.dte_homologacao_licitacao - pl.dte_publicacao_licitacao) AS dias_publicacao_ate_homologacao,
        (tdb.dte_vrpl - hl.dte_homologacao_licitacao) AS dias_homologacao_ate_vrpl,
        (tdb.dte_aio - tdb.dte_vrpl) AS dias_vrpl_ate_aio,
        (tci.dte_inicio_obra_mcid - tdb.dte_aio) AS dias_aio_ate_inicio_obra,

        -- faixa_repasse
        CASE
            WHEN tci.vlr_repasse < 1000000 THEN 'ATE 1 MI'
            WHEN tci.vlr_repasse < 5000000 THEN '1 A 5 MI'
            WHEN tci.vlr_repasse < 10000000 THEN '5 A 10 MI'
            ELSE 'ACIMA DE 10 MI'
        END AS faixa_repasse,

        -- prazos calculados
        CASE WHEN tcon.dte_retirada_suspensiva IS NOT NULL
             THEN tcon.dte_retirada_suspensiva + 120
        END AS prazo_pub_licitacao,

        CASE WHEN pl.dte_publicacao_licitacao IS NOT NULL
             THEN pl.dte_publicacao_licitacao + 120
        END AS prazo_homolog_licitacao,

        -- prazo_inicio_obra: 10 dias uteis apos AIO
        CASE WHEN tdb.dte_aio IS NOT NULL THEN
            (SELECT (array_agg(d::date ORDER BY d))[10]
             FROM generate_series(
                 tdb.dte_aio + interval '1 day',
                 tdb.dte_aio + interval '16 days',
                 interval '1 day'
             ) d
             WHERE EXTRACT(DOW FROM d) NOT IN (0, 6))
        END AS prazo_inicio_obra

    FROM se_saci.view_mat_carteira_investimento tci
    LEFT JOIN semob.tab_thiago_pbi_caixa pbi
        ON tci.num_convenio::numeric = pbi.instrumento::numeric
    LEFT JOIN mcid_bd_gestores.tab_dados_basicos tdb
        ON tci.num_convenio = tdb.cod_convenio_siafi
    LEFT JOIN publicacao_licitacao pl
        ON tci.num_convenio::numeric = pl.num_convenio::numeric
    LEFT JOIN homologacao_licitacao hl
        ON tci.num_convenio::numeric = hl.num_convenio::numeric
    LEFT JOIN mcid_transferegov.tab_convenios tcon
        ON tci.num_convenio::numeric = tcon.num_convenio::numeric
    WHERE tci.txt_fonte = 'OGU'
      AND tci.dsc_fase_pac = 'NOVO PAC - Seleção'
      AND tci.txt_sigla_secretaria <> 'SNH'
)
SELECT
    base.*,

    -- data limite casa civil
    '2026-03-31'::date AS data_limite_licitacao_casa_civil,

    -- status regra casa civil
    CASE
        WHEN dsc_situacao_contrato_mcid = 'Cancelado ou Distratado' THEN 'Fora do escopo'
        WHEN dte_publicacao_licitacao IS NOT NULL AND dte_publicacao_licitacao <= '2026-03-31'
         AND dte_homologacao_licitacao IS NOT NULL AND dte_homologacao_licitacao <= '2026-03-31'
         AND dte_inicio_obra_mcid IS NOT NULL AND dte_inicio_obra_mcid <= '2026-03-31'
        THEN 'Cumpriu'
        ELSE 'Não cumpriu'
    END AS status_regra_casa_civil,

    -- status publicacao licitacao
    CASE
        WHEN dte_retirada_suspensiva IS NULL
          OR dsc_situacao_contrato_mcid = 'Cancelado ou Distratado' THEN NULL
        WHEN dte_publicacao_licitacao IS NOT NULL
         AND dte_publicacao_licitacao <= prazo_pub_licitacao THEN 'Concluída no prazo'
        WHEN dte_publicacao_licitacao IS NOT NULL THEN 'Concluída em atraso'
        WHEN CURRENT_DATE > prazo_pub_licitacao THEN 'Vencida'
        WHEN (prazo_pub_licitacao - CURRENT_DATE) <= 30 THEN 'Próximos 30 dias'
        ELSE 'No prazo'
    END AS status_pub_licitacao,

    -- status homologacao licitacao
    CASE
        WHEN dte_homologacao_licitacao IS NOT NULL
         AND dte_publicacao_licitacao IS NULL THEN 'Inconsistência de base'
        WHEN dte_publicacao_licitacao IS NULL
          OR dsc_situacao_contrato_mcid = 'Cancelado ou Distratado' THEN NULL
        WHEN dte_homologacao_licitacao IS NOT NULL
         AND dte_homologacao_licitacao <= prazo_homolog_licitacao THEN 'Concluída no prazo'
        WHEN dte_homologacao_licitacao IS NOT NULL THEN 'Concluída em atraso'
        WHEN CURRENT_DATE > prazo_homolog_licitacao THEN 'Vencida'
        WHEN (prazo_homolog_licitacao - CURRENT_DATE) <= 30 THEN 'Próximos 30 dias'
        ELSE 'No prazo'
    END AS status_homolog_licitacao,

    -- status inicio obra
    CASE
        WHEN dte_aio IS NULL
          OR dsc_situacao_contrato_mcid = 'Cancelado ou Distratado' THEN NULL
        WHEN dte_inicio_obra_mcid IS NOT NULL
         AND dte_inicio_obra_mcid <= prazo_inicio_obra THEN 'Iniciada no prazo'
        WHEN dte_inicio_obra_mcid IS NOT NULL THEN 'Iniciada em atraso'
        WHEN CURRENT_DATE > prazo_inicio_obra THEN 'Prazo vencido'
        WHEN (SELECT COUNT(*)::int
              FROM generate_series(
                  CURRENT_DATE + interval '1 day',
                  prazo_inicio_obra::timestamp,
                  interval '1 day'
              ) d
              WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)) <= 10
        THEN 'Próximos 10 dias úteis'
        ELSE 'No prazo'
    END AS status_inicio_obra,

    -- urgencia suspensiva (usado no cascade chart)
    CASE
        WHEN dte_retirada_suspensiva IS NOT NULL THEN NULL
        WHEN dsc_situacao_contrato_mcid = 'Cancelado ou Distratado' THEN NULL
        WHEN vencimento_da_suspensiva IS NULL THEN 'Sem data'
        WHEN CURRENT_DATE > vencimento_da_suspensiva THEN 'Vencida'
        WHEN (vencimento_da_suspensiva - CURRENT_DATE) <= 30 THEN 'Próximos 30 dias'
        WHEN (vencimento_da_suspensiva - CURRENT_DATE) <= 90 THEN '31–90 dias'
        ELSE 'Mais de 90 dias'
    END AS urgencia_suspensiva

FROM base;
""")

def main():
    print(f"Conectando em {DATABASE_URL.host}:{DATABASE_URL.port}/{DATABASE_URL.database}...")
    engine = create_engine(DATABASE_URL)

    with engine.connect() as conn:
        print(f"Executando: {QUERY}")
        result = conn.execute(QUERY)

        colunas = list(result.keys())
        linhas = result.fetchall()

        with open(CSV_OUTPUT, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f, delimiter=";", quoting=csv.QUOTE_ALL)
            writer.writerow(colunas)
            writer.writerows(linhas)

        print(f"CSV salvo em {CSV_OUTPUT} ({len(linhas)} linhas)")

    artifacts = generate_daily_snapshot_diff(
        current_csv=CSV_OUTPUT,
        history_dir=HISTORY_DIR,
        diff_dir=DIFF_DIR,
        latest_json_path=LATEST_DIFF_JSON,
        previous_csv_path=PREVIOUS_CSV_OUTPUT,
        first_csv_path=FIRST_CSV_OUTPUT,
        cumulative_csv_path=CUMULATIVE_DIFF_OUTPUT,
    )

    print(f"Snapshot salvo em {artifacts.snapshot_path}")
    if artifacts.latest_json_path:
        print(f"Resumo consumível pelo painel salvo em {artifacts.latest_json_path}")
    if artifacts.previous_csv_path:
        print(f"Snapshot anterior consumível pelo painel salvo em {artifacts.previous_csv_path}")
    if artifacts.first_csv_path:
        print(f"Primeiro snapshot consumível pelo painel salvo em {artifacts.first_csv_path}")
    if artifacts.cumulative_csv_path:
        print(f"Histórico cumulativo consumível pelo painel salvo em {artifacts.cumulative_csv_path}")
    if artifacts.summary_md_path and artifacts.detail_csv_path:
        print(f"Relatório salvo em {artifacts.summary_md_path}")
        print(f"Detalhe salvo em {artifacts.detail_csv_path}")
    else:
        print("Nenhum snapshot anterior encontrado. Apenas o snapshot de hoje foi salvo.")


if __name__ == "__main__":
    main()
