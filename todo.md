# Perfil PSB — TODO

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
- [ ] Integração com outros módulos PSB (login unificado)

## Correções e Melhorias (Feedback v2)

- [x] Tema: mudar para fundo branco (light mode)
- [x] Mapa do Brasil: substituir SVG simples por mapa mais visual/detalhado (GeoJSON + D3)
- [x] Ranking e KPIs: incluir todos os cargos (governadores, senadores, dep. federais, dep. estaduais)
- [x] Páginas por cargo: criar página /cargo/:cargo com lista nacional e análise proporcional (votos/eleitores)
- [x] Diretório estadual: corrigir exibição do nome do presidente estadual
- [x] Dados demográficos: corrigir exibição de população e número de eleitores por estado (IBGE API corrigida)
- [x] Histórico eleitoral do político: corrigir duplicatas (mostrar apenas 1 resultado por eleição/turno)
- [x] Histórico eleitoral: incluir todos os cargos (busca por CPF para pegar todas as eleições)
- [x] Nível 4 (Município): criar página /estado/:uf/municipio/:codigo com vereadores, diretório municipal
- [x] Fotos dos candidatos: integrar via URL do TSE/DivulgaCand (padrão: codigoEleicao+ano+sequencial+uf)
- [x] Navegação: adicionar link de município clicável na página do estado (ex: Pernambuco > Recife)
- [x] Presidente do diretório estadual: tornar nome clicável quando encontrado no banco de dados
- [x] Buscar sequencial do presidente no banco por nome para linkar ao perfil individual

## Sistema de Filiação Partidária Atual
- [ ] Criar tabela `party_affiliation_override` no banco para armazenar status manual de filiação
- [ ] Criar endpoint tRPC `getAffiliationStatus` para retornar badge de filiação atual
- [ ] Implementar badges visuais: "Eleito pelo PSB ✅" / "Migrou para [PARTIDO] ⚠️" / "Veio de [PARTIDO] → PSB 🔄"
- [ ] Exibir badge de filiação em todos os cards de políticos (estado, cargo, perfil)
- [ ] Criar interface admin para atualizar manualmente o status de filiação
- [ ] Aplicar mesma lógica no mapa_votacao_psb (coordenar com outra tarefa)
- [ ] Documentar casos conhecidos: Carlos Brandão (PSB→outro), Aava Santiago (outro→PSB)
- [ ] Investigar download automático do CSV de filiação do TSE (atualização semanal)

## Diretórios Municipais PSB (SGIP3/TSE)
- [ ] Coletar dados de todos os diretórios municipais do PSB via SGIP3/TSE
- [ ] Armazenar dados dos diretórios municipais no banco de dados
- [ ] Exibir informações do diretório municipal na página MunicipioPage
- [ ] Tornar nome do presidente municipal clicável quando encontrado no banco de candidatos

## Painel Administrativo de Atualização Manual
- [ ] Criar tabela `psb_state_directories` no banco para armazenar diretórios estaduais
- [ ] Criar tabela `psb_municipal_directories` no banco para armazenar diretórios municipais
- [ ] Criar tabela `politician_affiliation_overrides` para registrar mudanças de filiação
- [ ] Criar tabela `data_sync_log` para registrar histórico de sincronizações
- [ ] Criar página /admin com painel de controle de dados
- [ ] Botão "Atualizar Diretórios Estaduais" — consulta SGIP3/TSE (fonte oficial) [PENDENTE: API bloqueada, resolver depois]
- [ ] Botão "Atualizar Diretórios Municipais" — consulta SGIP3/TSE [PENDENTE: API bloqueada, resolver depois]
- [ ] Botão "Verificar Filiação Partidária" — consulta TSE/dados abertos
- [ ] Exibir log de última atualização e status de cada fonte
- [ ] Formulário para edição manual de dados de diretório (estadual e municipal)
- [ ] Formulário para registrar manualmente mudança de filiação de um político
- [ ] Badge visual nos perfis: "Eleito pelo PSB ✅" / "Migrou para [PARTIDO] ⚠️" / "Veio de [PARTIDO] → PSB 🔄"
- [ ] Proteger painel admin com verificação de role (apenas admin)

## Opção 1 — Melhorias Implementadas (Mar/2026)
- [x] Popular tabela psb_state_directories com 27 diretórios estaduais reais
- [x] Corrigir schema do Drizzle para mapear colunas snake_case do banco
- [x] Corrigir endpoint getStateDemographics (descompressão gzip IBGE)
- [x] Criar sistema de filiação partidária (tabela politician_affiliation_overrides)
- [x] Adicionar badge visual de filiação na PoliticoPage
- [x] Criar router admin com endpoints de gestão (CRUD diretórios + filiações)
- [x] Criar página AdminPage (/admin) com gestão de diretórios estaduais e filiações
- [x] Adicionar link "Painel Admin" no sidebar para usuários com role=admin
- [x] Registrar rota /admin no App.tsx

## Correção de Inconsistências nos Dados (Mar/2026)
- [ ] Investigar por que apenas 1 governador aparece (deveria ser 2: João Azevedo/PB e Renato Casagrande/ES)
- [ ] Investigar por que apenas 1 senador aparece (deveria ser 4: Ana Paula Lobato/MA, Jorge Kajuru/GO, Flávio Arns/PR, Cid Gomes/CE)
- [ ] Verificar a query getNationalSummary e os filtros de cargo/partido/eleição
- [ ] Verificar se os dados de deputados federais (14), estaduais (55), prefeitos (313) e vereadores (3.572) estão corretos
- [ ] Corrigir os filtros de query para incluir todos os eleitos PSB nos cargos corretos

## Sistema Inteligente de Filiação Partidária (Mar/2026)
- [ ] Investigar API TSE de filiados (dados abertos) para consulta de partido atual por CPF
- [ ] Implementar endpoint de sincronização automática de filiação via TSE
- [ ] Corrigir getNationalSummary para aplicar overrides de filiação nas contagens
- [ ] Corrigir getStateRanking para aplicar overrides de filiação
- [ ] Adicionar badges visuais em todos os cards de listagem (estado, cargo, município)
- [ ] Badge "Migrou para o PSB" (azul) para eleitos por outros partidos que hoje são PSB
- [ ] Badge "Saiu do PSB" (vermelho) para eleitos pelo PSB que hoje estão em outro partido
- [ ] Badge "Eleito pelo PSB" (verde) para quem foi eleito e permanece no PSB

## Painel Admin — Manutenção Manual de Filiação
- [ ] Corrigir queries getNationalSummary para aplicar overrides nas contagens
- [ ] Melhorar painel admin: busca de político por nome/UF/cargo
- [ ] Registro de mudança de filiação com confirmação visual
- [ ] Importação em lote via CSV no painel admin
- [ ] Badges visuais em todas as listagens (CargoPage, EstadoPage, MunicipioPage, PoliticoPage)

## Integração com banco do Mapa de Votação
- [x] Conectar Perfil PSB ao banco compartilhado do Mapa de Votação (SHARED_ELECTORAL_DB_URL)
- [x] Investigar dados de filiação no banco compartilhado (CPF, anos extras, tabela candidates)
- [x] Implementar detecção automática de troca de partido via cruzamento CPF entre eleições
- [x] Painel admin com busca de políticos integrada ao banco compartilhado
- [x] Sistema de overrides compartilhado entre Perfil PSB e Mapa de Votação (tabela no banco compartilhado)
- [x] Criar helper `server/affiliationOverrides.ts` para CRUD no banco compartilhado
- [x] Atualizar admin.ts para usar o helper (sem mais dependência do Drizzle para filiação)
- [x] Migrar 6 overrides iniciais para o banco compartilhado

## Bug: Histórico Eleitoral Incompleto (Mar/2026)
- [x] Investigar por que o histórico da Lídice da Mata mostra apenas 2 eleições
- [x] Corrigir query getPoliticianHistory para buscar histórico completo via CPF
- [x] Verificar se o problema afeta outros políticos com longa trajetória

## Bugs Reportados (Mar/2026 — sessão 2)
- [x] Fotos dos políticos não carregam — corrigido: código de eleição 2040602022 (não 204062022)
- [x] Cards de cargo (Governadores, Senadores, Dep. Federais etc.) travam ao clicar — corrigido: alias cr. no ORDER BY
- [x] Histórico eleitoral incompleto — corrigido: UNION CPF+nome COLLATE + tabela candidates DivulgaCand (4 eleições para Lídice)

## Bugs Corrigidos (Mar/2026 — sessão 3: DivulgaCand)
- [x] Fotos reais dos políticos — integração com API DivulgaCand (fotoUrl real, não URL estática)
- [x] Histórico eleitoral completo — DivulgaCand eleicoesAnteriores (7 eleições para Lídice: 2004, 2006, 2008, 2010, 2014, 2018, 2022)
- [x] Criar server/divulgacand.ts copiado do Mapa de Votação (getCandidateProfile)
- [x] getPoliticianHistory reescrito para usar DivulgaCand como fonte primária + banco local para votos
- [x] getPoliticianProfile atualizado para buscar foto real do DivulgaCand
