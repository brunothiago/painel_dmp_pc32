# Regras de Negócio Aplicadas

Este documento resume as regras de negócio atualmente implementadas no painel.

## 1. Base e filtros gerais

- A base é carregada a partir de `src/data/base_pc_32.csv`.
- Os filtros de topo aplicados sobre a base são:
  - `Convênio / TCI`
  - `Secretaria`
  - `Modalidade`
- O filtro de `Modalidade` depende da `Secretaria` selecionada.
- Todos os indicadores, gráficos e a tabela respeitam esses filtros de topo.

## 2. Campos carregados da base

Os principais campos usados na lógica do painel são:

- `cod_tci`
- `num_convenio`
- `secretaria`
- `fase`
- `modalidade`
- `situacao`
- `dt_assinatura`
- `situacao_suspensiva`
- `dt_vencimento_suspensiva`
- `dt_retirada_suspensiva`
- `dt_lae`
- `dt_pub_licitacao`
- `dt_homolog_licitacao`
- `dt_vrpl`
- `dt_aio`
- `dt_inicio_obra`
- `vlr_repasse`

## 3. Painel executivo

Os cards de topo calculam:

- `Total selecionadas`
- `Com suspensiva`
- `Sem suspensiva (Normal)`
- `Valor total de repasse`

## 4. Gráficos gerais

Estão implementados:

- `Contratos por Secretaria/Modalidade`
- `Repasse por Secretaria/Modalidade`
- `Situação do Contrato`
- `Situação da Análise Suspensiva`

Regras:

- Quando a secretaria é `Todas`, os gráficos de distribuição usam `Secretaria`.
- Quando uma secretaria específica é escolhida, os gráficos usam `Modalidade`.
- Os gráficos de `Situação do Contrato` e `Situação da Análise Suspensiva` são clicáveis e filtram o restante do painel.

## 5. Análise de suspensivas

### 5.1. Classificação de urgência

Para contratos com suspensiva:

- se `dt_retirada_suspensiva` existe, o contrato não entra na urgência
- se `situacao` for `Cancelado ou Distratado`, o contrato não entra na urgência
- se não existir `dt_vencimento_suspensiva`, classifica como `Sem data`
- se o vencimento já passou, classifica como `Vencida`
- se vencer em até 30 dias, classifica como `Próximos 30 dias`
- se vencer entre 31 e 90 dias, classifica como `31–90 dias`
- se vencer acima de 90 dias, classifica como `Mais de 90 dias`

### 5.2. Cascata de suspensivas

A cascata implementa os filtros:

- `situacao`
- `suspensiva`
- `urgencia`

Essa seleção afeta a tabela final.

### 5.3. Alertas

Há alerta visual quando existem contratos:

- com suspensiva `Vencida`
- com suspensiva nos `Próximos 30 dias`

## 6. Análise de licitação

### 6.1. Prazo de publicação

Hoje o prazo de publicação está implementado como:

- `prazo_pub_licitacao = dt_lae + 120 dias corridos`

Status de publicação:

- `Concluída no prazo`
- `Concluída em atraso`
- `Vencida`
- `Próximos 30 dias`
- `No prazo`

### 6.2. Prazo de homologação

O prazo de homologação está implementado como:

- `prazo_homolog_licitacao = dt_pub_licitacao + 120 dias corridos`

Status de homologação:

- `Concluída no prazo`
- `Concluída em atraso`
- `Vencida`
- `Próximos 30 dias`
- `No prazo`
- `Inconsistência de base`

`Inconsistência de base` ocorre quando existe `dt_homolog_licitacao` sem `dt_pub_licitacao`.

### 6.3. Regras da análise visual

O box de licitação calcula:

- `Com LAE`
- `Aguardando publicação`
- `Publicação vencida`
- `Publicação nos próximos 30 dias`
- `Homologação vencida`
- `Homologação nos próximos 30 dias`

Também há uma cascata clicável com os filtros:

- `pub_etapa`
- `pub_prazo`
- `homolog_etapa`
- `homolog_prazo`

Essa seleção também afeta a tabela final.

### 6.4. Alertas

Há alerta visual quando existem contratos:

- com `Publicação vencida`
- com publicação nos `Próximos 30 dias`
- com `Homologação vencida`
- com homologação nos `Próximos 30 dias`

## 7. Regra Casa Civil

Foi implementada a data fixa:

- `Data Limite de Licitação Casa Civil = 31/03/2026`

Status da regra:

- `Cumpriu`
- `Não cumpriu`
- `Fora do escopo`

Regras:

- `Fora do escopo` para `Cancelado ou Distratado`
- `Cumpriu` somente se todos os eventos abaixo ocorreram até `31/03/2026`:
  - `dt_pub_licitacao`
  - `dt_homolog_licitacao`
  - `dt_inicio_obra`
- caso contrário, `Não cumpriu`

Existe gráfico específico para esse cumprimento dentro do box de licitação.

## 8. Análise de início da obra

### 8.1. Prazo

Foi implementado:

- `prazo_inicio_obra = dt_aio + 10 dias úteis`

Dias úteis considerados:

- segunda a sexta-feira
- sábado e domingo não contam

### 8.2. Status

Os status implementados são:

- `Iniciada no prazo`
- `Iniciada em atraso`
- `No prazo`
- `Próximos 10 dias úteis`
- `Prazo vencido`

Regras:

- se não houver `dt_aio`, não entra nessa análise
- se `situacao` for `Cancelado ou Distratado`, não entra nessa análise
- se houver `dt_inicio_obra`, compara com `prazo_inicio_obra`
- se não houver `dt_inicio_obra`, compara a data atual com o prazo calculado

### 8.3. Indicadores e alertas

O box de início da obra calcula:

- `Com AIO`
- `Iniciada no prazo`
- `Iniciada em atraso`
- `Prazo vencido`
- `Próximos 10 dias úteis`
- `No prazo`

Há alerta visual quando existem contratos:

- com `Prazo vencido`
- nos `Próximos 10 dias úteis`

## 9. Tabela

A tabela final:

- respeita os filtros de topo
- respeita a seleção da cascata de suspensivas
- respeita a seleção da cascata de licitação
- não possui seleção de linha
- possui link no `TCI` para o SACI:
  - `https://saci.cidades.gov.br/contratos/<cod_tci>`

## 10. Colunas derivadas hoje exibidas/exportadas

Além dos campos originais, estão implementadas na tabela/exportação:

- `Data Limite de Licitação Casa Civil`
- `Cumprimento Regra Casa Civil`
- `Prazo Publicação`
- `Status Publicação`
- `Prazo Homolog.`
- `Status Homolog.`
- `Prazo Início Obra`
- `Status Início Obra`

## 11. Exportação

A exportação para XLSX:

- respeita o estado filtrado atual da tabela
- exporta as colunas derivadas implementadas
- formata datas em `dd/mm/aaaa`
- formata `vlr_repasse` como número monetário

## 12. Observações importantes

- A regra de publicação da licitação hoje usa `dt_lae` como marco para o prazo de 120 dias.
- A regra `prazo de edital a partir da Retirada Suspensiva` não está aplicada neste momento.
- A data de atualização exibida no topo usa a data atual de carregamento da página.
