from __future__ import annotations

import csv
from collections import Counter
from dataclasses import dataclass
from datetime import date
import json
from pathlib import Path
import shutil


KEY_FIELD = "num_convenio"

SOURCE_FIELDS = {
    "cod_tci",
    "num_convenio",
    "txt_uf",
    "txt_regiao",
    "cod_ibge_7dig",
    "txt_municipio",
    "dsc_objeto_instrumento",
    "txt_sigla_secretaria",
    "dsc_fase_pac",
    "txt_modalidade",
    "dsc_situacao_contrato_mcid",
    "dte_assinatura_contrato",
    "situacao_da_analise_suspensiva",
    "vencimento_da_suspensiva",
    "dte_retirada_suspensiva",
    "dte_primeira_data_lae",
    "dte_publicacao_licitacao",
    "dte_homologacao_licitacao",
    "dte_vrpl",
    "dte_aio",
    "dte_inicio_obra_mcid",
    "vlr_repasse",
}

STATUS_FIELDS = {
    "status_suspensiva",
    "status_pub_licitacao",
    "status_homolog_licitacao",
    "status_inicio_obra",
    "status_regra_casa_civil",
    "urgencia_suspensiva",
    "fase_atual",
}

SUMMARY_STATUS_FIELDS = [
    "status_suspensiva",
    "status_pub_licitacao",
    "status_homolog_licitacao",
    "status_inicio_obra",
    "status_regra_casa_civil",
    "urgencia_suspensiva",
    "fase_atual",
]


@dataclass
class DiffArtifacts:
    snapshot_path: Path
    detail_csv_path: Path | None
    summary_md_path: Path | None
    latest_json_path: Path | None
    previous_csv_path: Path | None


def _read_csv(path: Path) -> tuple[list[str], list[dict[str, str]]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle, delimiter=";")
        rows = list(reader)
    if reader.fieldnames is None:
        raise ValueError(f"Arquivo CSV sem cabeçalho: {path}")
    return reader.fieldnames, rows


def _index_rows(rows: list[dict[str, str]], field: str, label: str) -> dict[str, dict[str, str]]:
    indexed: dict[str, dict[str, str]] = {}
    duplicates: list[str] = []
    missing: int = 0

    for row in rows:
        key = (row.get(field) or "").strip()
        if not key:
            missing += 1
            continue
        if key in indexed:
            duplicates.append(key)
            continue
        indexed[key] = row

    if missing:
        raise ValueError(f"{label}: {missing} linhas sem chave '{field}'.")
    if duplicates:
        examples = ", ".join(sorted(set(duplicates))[:5])
        raise ValueError(f"{label}: chaves duplicadas em '{field}': {examples}")
    return indexed


def _normalize(value: str | None) -> str:
    return (value or "").strip()


def _copy_snapshot(current_csv: Path, history_dir: Path, snapshot_date: date) -> Path:
    history_dir.mkdir(parents=True, exist_ok=True)
    snapshot_path = history_dir / f"base_pc_32_{snapshot_date.isoformat()}.csv"
    shutil.copyfile(current_csv, snapshot_path)
    return snapshot_path


def _latest_previous_snapshot(history_dir: Path, current_snapshot: Path) -> Path | None:
    snapshots = sorted(
        path for path in history_dir.glob("base_pc_32_*.csv") if path != current_snapshot
    )
    if not snapshots:
        return None
    return snapshots[-1]


def _summarize_status_changes(detail_rows: list[dict[str, str]]) -> dict[str, int]:
    counter = Counter()
    for row in detail_rows:
        if row["tipo_alteracao"] != "alterado":
            continue
        field = row["campo"]
        if field in SUMMARY_STATUS_FIELDS:
            counter[field] += 1
    return {field: counter.get(field, 0) for field in SUMMARY_STATUS_FIELDS}


def _classify_record_change(changed_fields: list[str]) -> str:
    source_changes = [field for field in changed_fields if field in SOURCE_FIELDS]
    derived_changes = [field for field in changed_fields if field not in SOURCE_FIELDS]

    if source_changes and derived_changes:
        return "dados_e_derivados"
    if source_changes:
        return "dados"
    return "derivados_tempo"


def _build_detail_rows(
    previous_rows: dict[str, dict[str, str]],
    current_rows: dict[str, dict[str, str]],
    header: list[str],
) -> tuple[list[dict[str, str]], dict[str, int]]:
    detail_rows: list[dict[str, str]] = []
    stats = {
        "entered": 0,
        "exited": 0,
        "changed_records": 0,
        "changed_data_records": 0,
        "changed_time_records": 0,
    }

    previous_keys = set(previous_rows)
    current_keys = set(current_rows)

    for key in sorted(current_keys - previous_keys):
        row = current_rows[key]
        stats["entered"] += 1
        detail_rows.append(
            {
                "tipo_alteracao": "entrou",
                "categoria_alteracao": "novo_registro",
                "num_convenio": key,
                "cod_tci": _normalize(row.get("cod_tci")),
                "campo": "",
                "valor_anterior": "",
                "valor_atual": "",
            }
        )

    for key in sorted(previous_keys - current_keys):
        row = previous_rows[key]
        stats["exited"] += 1
        detail_rows.append(
            {
                "tipo_alteracao": "saiu",
                "categoria_alteracao": "registro_removido",
                "num_convenio": key,
                "cod_tci": _normalize(row.get("cod_tci")),
                "campo": "",
                "valor_anterior": "",
                "valor_atual": "",
            }
        )

    comparable_fields = [field for field in header if field != KEY_FIELD]

    for key in sorted(previous_keys & current_keys):
        previous = previous_rows[key]
        current = current_rows[key]
        changed_fields = [
            field
            for field in comparable_fields
            if _normalize(previous.get(field)) != _normalize(current.get(field))
        ]

        if not changed_fields:
            continue

        stats["changed_records"] += 1
        category = _classify_record_change(changed_fields)
        if category == "derivados_tempo":
            stats["changed_time_records"] += 1
        else:
            stats["changed_data_records"] += 1

        cod_tci = _normalize(current.get("cod_tci")) or _normalize(previous.get("cod_tci"))
        for field in changed_fields:
            detail_rows.append(
                {
                    "tipo_alteracao": "alterado",
                    "categoria_alteracao": category,
                    "num_convenio": key,
                    "cod_tci": cod_tci,
                    "campo": field,
                    "valor_anterior": _normalize(previous.get(field)),
                    "valor_atual": _normalize(current.get(field)),
                }
            )

    return detail_rows, stats


def _write_detail_csv(path: Path, rows: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "tipo_alteracao",
        "categoria_alteracao",
        "num_convenio",
        "cod_tci",
        "campo",
        "valor_anterior",
        "valor_atual",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=fieldnames,
            delimiter=";",
            quoting=csv.QUOTE_ALL,
        )
        writer.writeheader()
        writer.writerows(rows)


def _write_summary_md(
    path: Path,
    snapshot_date: date,
    previous_snapshot: Path,
    current_total: int,
    previous_total: int,
    stats: dict[str, int],
    status_changes: dict[str, int],
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# Diferença da base PC 32 - {snapshot_date.isoformat()}",
        "",
        f"- Snapshot atual: `{snapshot_date.isoformat()}`",
        f"- Snapshot anterior: `{previous_snapshot.stem.replace('base_pc_32_', '')}`",
        f"- Total anterior: **{previous_total}**",
        f"- Total atual: **{current_total}**",
        "",
        "## Resumo",
        "",
        f"- Entraram na base: **{stats['entered']}**",
        f"- Saíram da base: **{stats['exited']}**",
        f"- Registros com alguma alteração: **{stats['changed_records']}**",
        f"- Registros com mudança de dados de origem: **{stats['changed_data_records']}**",
        f"- Registros com mudança apenas em campos derivados/status: **{stats['changed_time_records']}**",
        "",
        "## Mudanças por status",
        "",
    ]

    for field in SUMMARY_STATUS_FIELDS:
        lines.append(f"- `{field}`: **{status_changes.get(field, 0)}**")

    lines.extend(
        [
            "",
            "## Leitura recomendada",
            "",
            "- `categoria_alteracao = dados_e_derivados`: mudou dado de origem e isso também repercutiu em campos calculados.",
            "- `categoria_alteracao = dados`: mudou apenas dado de origem, sem alterar status calculado.",
            "- `categoria_alteracao = derivados_tempo`: o dado-base ficou igual; a alteração veio só de regra derivada/data corrente.",
        ]
    )

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _write_latest_json(
    path: Path,
    snapshot_date: date,
    previous_snapshot: Path | None,
    current_total: int,
    previous_total: int | None,
    stats: dict[str, int] | None,
    status_changes: dict[str, int] | None,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "snapshot_atual": snapshot_date.isoformat(),
        "snapshot_anterior": None if previous_snapshot is None else previous_snapshot.stem.replace("base_pc_32_", ""),
        "total_atual": current_total,
        "total_anterior": previous_total,
        "delta_total": None if previous_total is None else current_total - previous_total,
        "resumo": stats,
        "mudancas_status": status_changes,
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _write_previous_csv(path: Path, source_snapshot: Path | None, fallback_snapshot: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_snapshot or fallback_snapshot, path)


def generate_daily_snapshot_diff(
    current_csv: str | Path,
    history_dir: str | Path,
    diff_dir: str | Path,
    latest_json_path: str | Path | None = None,
    previous_csv_path: str | Path | None = None,
    snapshot_date: date | None = None,
) -> DiffArtifacts:
    snapshot_date = snapshot_date or date.today()
    current_csv = Path(current_csv)
    history_dir = Path(history_dir)
    diff_dir = Path(diff_dir)

    snapshot_path = _copy_snapshot(current_csv, history_dir, snapshot_date)
    previous_snapshot = _latest_previous_snapshot(history_dir, snapshot_path)
    latest_json = Path(latest_json_path) if latest_json_path else None
    previous_csv = Path(previous_csv_path) if previous_csv_path else None

    if previous_csv is not None:
        _write_previous_csv(previous_csv, previous_snapshot, snapshot_path)

    if previous_snapshot is None:
        if latest_json is not None:
            _write_latest_json(
                latest_json,
                snapshot_date=snapshot_date,
                previous_snapshot=None,
                current_total=len(_read_csv(snapshot_path)[1]),
                previous_total=None,
                stats=None,
                status_changes=None,
            )
        return DiffArtifacts(
            snapshot_path=snapshot_path,
            detail_csv_path=None,
            summary_md_path=None,
            latest_json_path=latest_json,
            previous_csv_path=previous_csv,
        )

    header, current_rows_raw = _read_csv(snapshot_path)
    _, previous_rows_raw = _read_csv(previous_snapshot)

    current_rows = _index_rows(current_rows_raw, KEY_FIELD, f"Snapshot atual ({snapshot_path.name})")
    previous_rows = _index_rows(previous_rows_raw, KEY_FIELD, f"Snapshot anterior ({previous_snapshot.name})")

    detail_rows, stats = _build_detail_rows(previous_rows, current_rows, header)
    status_changes = _summarize_status_changes(detail_rows)

    detail_csv_path = diff_dir / f"detalhe_{snapshot_date.isoformat()}.csv"
    summary_md_path = diff_dir / f"relatorio_{snapshot_date.isoformat()}.md"

    _write_detail_csv(detail_csv_path, detail_rows)
    _write_summary_md(
        summary_md_path,
        snapshot_date,
        previous_snapshot,
        current_total=len(current_rows_raw),
        previous_total=len(previous_rows_raw),
        stats=stats,
        status_changes=status_changes,
    )
    if latest_json is not None:
        _write_latest_json(
            latest_json,
            snapshot_date=snapshot_date,
            previous_snapshot=previous_snapshot,
            current_total=len(current_rows_raw),
            previous_total=len(previous_rows_raw),
            stats=stats,
            status_changes=status_changes,
        )

    return DiffArtifacts(
        snapshot_path=snapshot_path,
        detail_csv_path=detail_csv_path,
        summary_md_path=summary_md_path,
        latest_json_path=latest_json,
        previous_csv_path=previous_csv,
    )
