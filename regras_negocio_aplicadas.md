# Regras de Negócio Aplicadas

Este documento resume as regras implementadas hoje no pipeline de dados e no painel.

## 1. Base de dados

A base publicada em `src/data/base_pc_32.csv` é extraída por `python/gerar_base_pc32.py`.

Filtros de origem aplicados no SQL:

- `txt_fonte = 'OGU'`
- `dsc_fase_pac = 'NOVO PAC - Seleção'`
- exclusão de `txt_sigla_secretaria = 'SNH'`

## 2. Campos derivados no pipeline

O SQL gera, além dos campos de origem, os principais campos derivados abaixo:

- `status_suspensiva`
- `flag_publicacao_licitacao`
- `flag_homologacao_licitacao`
- `ultima_data_relevante`
- `fase_atual`
- intervalos em dias entre marcos
- `faixa_repasse`
- `prazo_pub_licitacao`
- `prazo_homolog_licitacao`
- `prazo_inicio_obra`
- `status_regra_casa_civil`
- `status_pub_licitacao`
- `status_homolog_licitacao`
- `status_inicio_obra`
- `urgencia_suspensiva`

## 3. Suspensiva

### `status_suspensiva`

- `PENDENTE` quando há vencimento de suspensiva e não há retirada
- `RETIRADA` quando existe `dte_retirada_suspensiva`
- `SEM SUSPENSIVA` nos demais casos

### `urgencia_suspensiva`

Aplica-se apenas quando a suspensiva não foi retirada e o contrato não está cancelado.

- `Sem data` quando não há vencimento
- `Vencida` quando o vencimento já passou
- `Próximos 30 dias` quando faltam até 30 dias
- `31–90 dias` quando faltam de 31 a 90 dias
- `Mais de 90 dias` nos demais casos

## 4. Fase atual

`fase_atual` é definida pela precedência abaixo:

1. `OBRA INICIADA`
2. `AIO`
3. `VRPL`
4. `HOMOLOGACAO`
5. `PUBLICACAO LICITACAO`
6. `LAE`
7. `SUSPENSIVA RETIRADA`
8. `SUSPENSIVA`
9. `SEM ANDAMENTO`

## 5. Licitação

### Prazo de publicação

Hoje o prazo de publicação implementado no SQL é:

- `prazo_pub_licitacao = dte_retirada_suspensiva + 120 dias corridos`

O status calculado é:

- `Concluída no prazo`
- `Concluída em atraso`
- `Vencida`
- `Próximos 30 dias`
- `No prazo`

Contratos cancelados ou sem retirada de suspensiva não entram nesse status.

### Prazo de homologação

Hoje o prazo de homologação implementado no SQL é:

- `prazo_homolog_licitacao = dte_publicacao_licitacao + 120 dias corridos`

O status calculado é:

- `Concluída no prazo`
- `Concluída em atraso`
- `Vencida`
- `Próximos 30 dias`
- `No prazo`
- `Inconsistência de base`

`Inconsistência de base` ocorre quando existe homologação sem publicação.

## 6. Regra Casa Civil

A data fixa implementada é:

- `31/03/2026`

Status:

- `Cumpriu`
- `Não cumpriu`
- `Fora do escopo`

Regras:

- `Fora do escopo` para `Cancelado ou Distratado`
- `Cumpriu` apenas quando publicação, homologação e início de obra ocorreram até `31/03/2026`
- caso contrário, `Não cumpriu`

## 7. Início de obra

### Prazo

- `prazo_inicio_obra = 10 dias úteis após AIO`

No cálculo de dias úteis:

- segunda a sexta contam
- sábado e domingo não contam

### Status

- `Iniciada no prazo`
- `Iniciada em atraso`
- `Prazo vencido`
- `Próximos 10 dias úteis`
- `No prazo`

Contratos sem `AIO` ou cancelados ficam fora dessa análise.

## 8. Regras do painel

### Página principal

O painel principal usa:

- base atual
- base anterior
- resumo do snapshot

Os cards com delta comparam o snapshot atual com o snapshot anterior.

### Página de alterações

A página `alteracoes` usa `src/data/base_alteracoes.csv`, gerado a partir da comparação entre snapshots consecutivos.

### Atualização exibida

A informação “Atualizado em” é derivada dos metadados de snapshot gerados no pipeline, e não da data do navegador.

## 9. Chave de comparação entre snapshots

Na comparação de snapshots:

- a chave principal é `num_convenio`
- se estiver vazio, usa `cod_tci`

Se houver linhas sem ambas as chaves, ou chaves duplicadas, a geração do diff falha.

## 10. Artefatos de diff

O pipeline gera:

- snapshot diário em `data/historico/`
- resumo em `src/data/base_diff_latest.json`
- histórico acumulado em `src/data/base_alteracoes.csv`
- detalhes por execução em `data/diff/`

Os artefatos de `data/diff/` fazem parte do fluxo oficial de atualização.
