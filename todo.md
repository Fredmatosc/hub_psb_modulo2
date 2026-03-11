# Hub PSB Módulo 2 — TODO

## Setup e Estrutura
- [x] Configurar tema visual (cores PSB: vermelho/laranja, fundo escuro)
- [x] Configurar index.css com variáveis de tema
- [x] Criar PSBLayout com sidebar e breadcrumbs
- [x] Configurar rotas Wouter (/, /estado/:uf, /politico/:sequencial)
- [x] Configurar conexão com banco TiDB externo

## Backend — Endpoints tRPC PSB
- [x] Endpoint: psb.getNationalSummary (KPIs nacionais)
- [x] Endpoint: psb.getStateRanking (top estados por eleitos)
- [x] Endpoint: psb.getStateDemographics (dados IBGE + TSE por estado)
- [x] Endpoint: psb.getStateDirectory (diretório estadual PSB)
- [x] Endpoint: psb.getStateQuadro (resumo de eleitos por cargo)
- [x] Endpoint: psb.getStateHistory (histórico 2014-2024)
- [x] Endpoint: psb.getStateElected (lista de eleitos por cargo)
- [x] Endpoint: psb.getPoliticianProfile (perfil completo do político)
- [x] Endpoint: psb.getPoliticianHistory (histórico eleitoral)
- [x] Endpoint: psb.getPoliticianZones (votação por zona eleitoral)
- [x] Endpoint: psb.getPoliticianCompetitors (concorrentes)
- [x] Sistema de cache em memória (24h estado, 7d histórico, 30d diretório)
- [x] Correção de queries: nomeMunicipio via JOIN com candidate_zone_results
- [x] Correção de LIMIT/OFFSET: valores literais (TiDB não aceita parâmetros em LIMIT)

## Frontend — Nível 1 (Brasil)
- [x] Página BrasilPage com mapa SVG interativo do Brasil
- [x] Cards de KPIs nacionais (prefeitos, vereadores, deputados, etc.)
- [x] Ranking dos top 10 estados com maior presença PSB
- [x] Tabela completa de estados com dados de eleitos
- [x] Navegação por clique no mapa ou na tabela → Estado

## Frontend — Nível 2 (Estado)
- [x] Página EstadoPage com dados do estado selecionado
- [x] Breadcrumb: Brasil → Estado
- [x] Cards de dados demográficos (população, eleitores, comparecimento)
- [x] Seção de diretório estadual PSB (presidente, endereço, telefone)
- [x] Cards de quadro atual (prefeitos, vereadores, deputados, senadores)
- [x] Abas interativas: Prefeitos | Vereadores | Dep. Federais | Dep. Estaduais
- [x] Lista de eleitos com drill-down para perfil do político
- [x] Gráfico histórico de eleitos 2014-2024
- [x] Filtro por município na lista de vereadores
- [x] Paginação na lista de eleitos

## Frontend — Nível 3 (Político)
- [x] Página PoliticoPage com perfil completo
- [x] Breadcrumb: Brasil → Estado → Político
- [x] Card de perfil (nome, cargo, partido, município, situação)
- [x] Gráfico de evolução de votos (barras com cor por eleição)
- [x] Análise financeira (receita, despesa, custo por voto)
- [x] Votação por zona eleitoral (pizza + barras de progresso)
- [x] Tabela de histórico eleitoral completo
- [x] Comparação com concorrentes (barras de progresso)

## Testes e Qualidade
- [x] Testes unitários dos endpoints tRPC (8/8 passando)
- [x] Validação de dados do banco TiDB
- [x] Correção de erros TypeScript

## Próximas Fases (Futuro)
- [ ] Integração com módulo de Monitoramento de Notícias
- [ ] Fotos dos políticos (via TSE ou upload manual)
- [ ] Dados IBGE API em tempo real
- [ ] Dados de diretórios estaduais atualizados via scraping do psb40.org.br
- [ ] Integração com Hub PSB (login unificado)
