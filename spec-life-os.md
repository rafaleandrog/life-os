# SPEC — Life OS Pessoal
### Sistema único de interface geral da vida: tarefas, rotina, hábitos, tempo, metas, finanças, investimentos, treino, leitura e escrita

**Versão:** 4.1 (final, auditada) · **Data:** Junho/2026 · **Usuário:** único, sem login · **Custo-alvo:** R$ 0,00 permanente
**Changelog v4.0:** musculação vira registro pós-treino (sem timer de descanso); financeiro dividido em Fluxo (receitas/despesas) × Investimentos (ativos, aportes, saldo, patrimônio — aporte não é despesa); tarefas absorvem o conceito Todoist completo (linguagem natural com hora, seções, etiquetas, comentários, anexos por link, filtros salvos).
**Changelog v4.1:** tabelas SQL renomeadas para nomes completos sem abreviação; auditoria de viabilidade (seção 2.4) com correções: PWA passa a ser pacote de 3 arquivos estáticos (exigência dos navegadores), conta gratuita do Netlify documentada como necessária para o site não expirar, pausa por inatividade do Supabase Free documentada com mitigação; avaliação do OpenClaw (seção 9.1).

---

## 0. Princípios de Design (derivados das dores do usuário)

Dores, em ordem: **(1) falta de constância; (2) não enxergar o progresso real; (3) informação espalhada; (4) priorização pessoal × profissional.** O usuário abre o app várias vezes ao dia para registrar na hora.

1. **Registro em ≤ 5 segundos.** Toda ação de registro em no máximo 2 toques a partir da tela Hoje. Botão ➕ central onipresente no celular.
2. **Constância com gentileza.** Streaks com tolerância, mensagem de recomeço preservando o recorde, rollover consciente de tarefas, rituais curtos como âncoras.
3. **Progresso sempre visível.** Cada módulo tem gráfico de evolução. O Dashboard responde "estou melhorando?" em uma olhada.
4. **Tudo em um lugar.** O Supabase é invisível após a configuração.
5. **O app conduz, você executa.** Rituais diários, revisão semanal guiada e retrospectiva anual com números prontos.
6. **Realismo contra o abandono.** Barra de capacidade do dia impede o autoengano de planejar 14h de tarefas em 8h de agenda.

---

## 1. Visão Geral e Conceito

Web app pessoal, responsivo, **instalável como app (PWA)**. Hierarquia:

**Áreas da Vida (fixas) → Projetos (com seções) → Tarefas / Hábitos / Metas / Treinos / Leituras / Textos / Lançamentos / Investimentos**

Tela inicial sempre **"Hoje"**. Módulos especializados alimentam hábitos e metas automaticamente — registrar corrida marca o hábito "correr" e soma km na meta, sem trabalho duplo.

---

## 2. Arquitetura Técnica (100% gratuita, zero código para o usuário)

| Camada | Tecnologia | Custo | Por quê |
|---|---|---|---|
| Frontend | **Pacote de 3 arquivos estáticos**: `index.html` (todo o app, CSS e JS embutidos) + `manifest.webmanifest` + `sw.js` (React via CDN permitido, sem build) | R$ 0 | Sem instalação, sem terminal. |
| App instalável | **PWA** (manifest e service worker como arquivos próprios — exigência dos navegadores) | R$ 0 | Ícone na tela inicial, abre como app nativo. |
| Banco | **Supabase (Free)** | R$ 0 | Sincroniza celular ↔ PC, 500 MB, API REST. |
| Hospedagem | **GitHub Pages** ou **Netlify Drop** | R$ 0 | URL pública HTTPS. |
| Extração de artigos | Serviço gratuito de leitura limpa (ex.: r.jina.ai) com fallback | R$ 0 | Ler URLs externas mesmo com embed bloqueado. |
| Offline | localStorage + fila de sincronização | R$ 0 | Funciona sem internet. |

### 2.1 Contrato de "Supabase invisível" (obrigatório)
Usuário toca no Supabase **apenas na configuração** (projeto → colar 1 SQL → copiar URL e anon key). Depois, tudo pela interface do app. O código deve ter:
- **Tela "Saúde do Sistema"**: verifica conexão e tabelas; se faltar algo, instrução em português + botão "copiar SQL". Detecta também **projeto Supabase pausado por inatividade** e mostra o passo único de restauração ("abra o painel do Supabase e clique em Restore project").
- Migrações como SQL idempotente (`create table if not exists...`).
- Erros como mensagens amigáveis em português; fila offline garante zero perda de registros.

### 2.2 Fluxo de configuração (uma única vez)
1. Conta gratuita no Supabase → criar projeto. 2. SQL Editor → colar script da seção 5 → Run. 3. Copiar Project URL e anon key. 4. Primeiro acesso ao app: colar os dois valores + PIN opcional; app valida e cria dados de exemplo. 5. Publicar: drop.netlify.com (arrastar a pasta com os 3 arquivos; **criar conta gratuita e clicar em "claim"**, senão o site expira em horas) **ou** GitHub Pages (criar repositório, upload dos 3 arquivos, Settings → Pages → ativar). 6. No celular: "Adicionar à tela de início".

### 2.3 Segurança e backup
PIN local opcional. URL privada + opcional RLS com token fixo. Exportar/Importar JSON com 1 clique (backup mensal sugerido).


### 2.4 Auditoria de viabilidade (double-check — verificado em junho/2026)
Cada peça do plano foi verificada contra a realidade atual das plataformas. Resultado: **o sistema funciona 100% de graça**, com os pontos de atenção abaixo já mitigados no próprio design.

| # | Verificação | Resultado | Mitigação embutida no spec |
|---|---|---|---|
| 1 | Supabase Free: 500 MB, 2 projetos, requisições ilimitadas, sem cartão | ✅ Confirmado | Décadas de dados pessoais cabem em 500 MB. |
| 2 | **Supabase Free pausa o projeto após 7 dias sem atividade no banco** (dados preservados; restauração com 1 clique no painel) | ⚠️ Real | Uso diário do app já conta como atividade — quem usa, nunca pausa. Se ficar 7+ dias sem usar (ex.: férias), a Saúde do Sistema detecta e mostra o passo único de restauração. **Esta é a única exceção possível ao "nunca abrir o Supabase", e se resolve com 1 clique, sem perda de dados.** |
| 3 | Netlify Drop publica grátis por arrastar | ✅ Confirmado | **Sem conta, o site expira em horas**; com conta gratuita ("claim"), fica permanente. Atualizar o app = arrastar os arquivos de novo na página de Deploys. |
| 4 | GitHub Pages gratuito | ✅ Confirmado | Exige repositório público — o **código** fica visível, mas isso é seguro por design: as chaves do Supabase **nunca ficam no HTML**; são coladas pelo usuário no primeiro acesso e vivem só no localStorage do dispositivo. |
| 5 | PWA em arquivo único | ❌ Corrigido | Navegadores **não permitem service worker inline** — ele precisa ser um arquivo próprio. O entregável passa a ser um **pacote de 3 arquivos estáticos** (`index.html` + `manifest.webmanifest` + `sw.js`). Continua sendo arrastar-e-soltar; nada muda para o usuário. |
| 6 | API REST do Supabase direto do navegador (CORS) | ✅ Confirmado | Funciona nativamente com a anon key; nenhum servidor próprio necessário. |
| 7 | Extração de artigos via serviço gratuito (r.jina.ai ou similar) | ⚠️ Serviço de terceiros | Gratuito sem chave hoje, mas com limite de taxa e política que pode mudar. Por isso o painel de leitura tem **3 modos em cascata** (embed → extração → colar texto): o fluxo nunca trava, mesmo se o serviço sumir. |
| 8 | CDNs (React, Chart.js, Google Fonts) | ✅ Gratuitos | Exigem internet no primeiro carregamento; o `sw.js` cacheia tudo depois — aberturas seguintes são instantâneas e funcionam offline. |
| 9 | **Zero custo de IA/tokens** | ✅ Garantido por design | O app não chama nenhum modelo de IA: o parser de linguagem natural é baseado em regras (regex), os gráficos são renderizados localmente e a imagem da retrospectiva é gerada via canvas. Nenhuma funcionalidade depende de API paga ou de créditos. |
| 10 | Sem assinaturas | ✅ | Contas gratuitas necessárias: Supabase + Netlify **ou** GitHub. Nada mais. |

---

## 3. Módulos e Funcionalidades

### 3.1 Tela HOJE (inicial)
- Cabeçalho: data, saudação, resumo do dia.
- **Barra de capacidade:** estimativas + blocos vs. horas disponíveis; âmbar/vermelha em sobrecarga.
- **Rituais:** "▶ Planejar o dia" e "◼ Encerrar o dia" (3.13).
- **Agenda do dia** (05h–24h, cores por Área) — tarefas com horário aparecem aqui automaticamente.
- **Timer persistente** (livre, Pomodoro ou Modo Foco 3.14).
- **Tarefas de hoje** + adição rápida sempre visível.
- **Hábitos pendentes** em chips de 1 toque.
- **💡 Insight do Dia** (repetição espaçada, 3.9).
- **Atalhos contextuais:** "🏋️ Registrar treino de hoje", "🏃 Registrar corrida", "📖 Registrar leitura", "💸 Lançar gasto".
- Alertas: contas vencendo ≤ 3 dias; revisão semanal pendente.

### 3.2 Tarefas e Rotina (conceito Todoist completo)
- **Criação por linguagem natural** no input rápido: texto interpreta data e **hora** ("amanhã 9h", "sexta 14:30"), recorrência ("toda segunda 7h", "todo dia", "a cada 3 dias"), projeto ("#trabalho"), etiqueta ("@urgente") e prioridade ("p1"–"p4"), com confirmação visual dos tokens reconhecidos antes de salvar.
- **Estrutura:** Área → Projeto → **Seções** (agrupamentos ordenáveis dentro do projeto, ex.: "Backlog / Fazendo / Feito") → Tarefa → Subtarefas (checklist).
- **Campos:** título, descrição, projeto/seção, **etiquetas** (com cor, gerenciáveis), prioridade P1–P4 (cores: vermelho/laranja/azul/cinza), data de vencimento, **hora** (opcional — entra na agenda do dia), estimativa, recorrência, subtarefas.
- **Comentários e anexos:** cada tarefa tem um fio de comentários com data; anexos são **links/URLs nomeados** (documentos, referências, sites).
- **Visões:** Hoje · Próximos 7 dias · Caixa de entrada · Por projeto (com seções, ordenação manual por arrastar) · Por etiqueta · Concluídas.
- **Filtros salvos:** o usuário cria filtros combinando critérios (ex.: "P1 e P2 da área Trabalho vencendo esta semana") que ficam fixados como visões próprias.
- **Rollover consciente:** tarefa vencida exige decisão no ritual da manhã: *hoje · reagendar · inbox · abandonar* (abandono é legítimo e registrado, anti-culpa).
- Arrastar tarefa para a agenda cria bloco vinculado (time-blocking).

### 3.3 Hábitos
**Diário**, **semanal com frequência**, **quantidade**. Streaks com recorde e tolerância opcional. Heatmap 90 dias. Hábitos com `fonte_auto` (treino, corrida, leitura) são marcados pelos módulos — zero registro duplo.

### 3.4 Blocos de Tempo e Análise
Agenda semanal (desktop) / diária com swipe (celular). Templates de rotina. **Rotinas guiadas** (execução passo a passo com timer por passo). Relatório planejado × realizado por área/projeto, pizza de distribuição.

### 3.5 Metas e Objetivos
Meta numérica com progresso manual **ou automático** por vínculo: hábito, categoria financeira, km de corrida, livros, sessões de treino, peso corporal, **patrimônio**. Card com barra, %, ritmo necessário, status. Visão anual com retrospectiva (3.16).

### 3.6 FINANÇAS — dois painéis independentes
**Painel A · Fluxo (receitas e despesas):**
- Lançamentos: entrada/saída, valor, data, categoria, conta, descrição, pago/pendente, recorrente.
- Orçamento mensal por categoria (verde → âmbar 80% → vermelho).
- Contas a pagar/receber com alerta na Hoje; "marcar pago" gera o lançamento real.
- Recorrências (salário, aluguel, assinaturas) geradas automaticamente no mês.
- Dashboard do fluxo: saldo do mês, entradas × saídas (6 meses), pizza por categoria, próximos vencimentos.

**Painel B · Investimentos (patrimônio):**
- **Ativos:** nome, classe (renda fixa, ações, FIIs, cripto, outros), instituição.
- **Aportes e resgates:** valor, data, ativo, nota. **Regra central: aporte NÃO é despesa** — sai do caixa mas é patrimônio, nunca entra no orçamento de consumo nem nas despesas do mês. O dashboard do fluxo mostra "Investido no mês" como linha separada.
- **Saldo por ativo:** atualização manual periódica (snapshot com data); o app lembra discretamente se um ativo está há 60+ dias sem atualização.
- **Patrimônio total** = soma dos saldos mais recentes; gráfico de evolução do patrimônio no tempo; **rentabilidade simples** por ativo e geral (saldo atual vs. total aportado).
- **Meta de patrimônio:** meta vinculada ao patrimônio total ("chegar a R$ X"), com ritmo necessário de aporte/mês.

### 3.7 MUSCULAÇÃO 🏋️ (registro pós-treino)
- **Planilhas A/B/C** montadas no app: exercícios em ordem (nome, grupo muscular, séries-alvo, observação técnica).
- **Registro do treino do dia (ao fim do dia, ~1 min):** escolher a planilha feita → formulário corrido com todos os exercícios → para cada um, **carga máxima do dia + séries feitas** (última sessão preenchida como referência/placeholder; basta ajustar o que mudou). Observação opcional. Salvar grava a sessão (data e nota). *Sem timer de descanso, sem fluxo "ao vivo" — é um diário de desempenho.*
- **Análise:** gráfico de carga máxima por exercício no tempo; **1RM estimado** (Epley, como referência); volume aproximado da sessão; 🏆 PR automático ao superar carga histórica.
- Histórico por planilha; frequência semanal no heatmap.
- Integrações: sessão registrada → hábito vinculado + metas de sessões.

### 3.8 CORRIDA 🏃
Registro manual (data, km, tempo, percepção 1–10, tipo, nota) com **pace automático**. Gráficos: pace no tempo, volume semanal/mensal, km no ano. Recordes automáticos. Integra hábito e metas.

### 3.9 LEITURA 📖
Biblioteca de livros (status, progresso, ★, resenha); artigos por URL ou texto colado (cache offline); **notas em 3 tipos** (citação, anotação, 💡 insight) com visão "Meus insights"; **repetição espaçada** — insights ressurgem como "Insight do Dia" em intervalos 1→3→7→21→60→120 dias, com ações *lembrei / arquivar / abrir no editor*.

### 3.10 ESCRITA ✍️
Editor autoral Markdown com preview, status, tags/área, contador de palavras, autosave contínuo, modo foco. **Modo Leitura ⇄ Escrita (1 toque)** com painel de leitura (URL extraída / embed / texto colado / biblioteca / insights), mantendo rolagem. **Capturar para o texto** (citação ou insight a partir de seleção). Palavras/semana e streak do escritor.

### 3.11 REVISÃO SEMANAL GUIADA 🧭
De domingo em diante, lembrete até concluir. Passos com números prontos: retrospecto (tarefas, hábitos, treinos, km, páginas, palavras, gasto × orçamento, **aportes do mês**, energia média) → streaks e metas em risco → 3 perguntas livres (as **3 prioridades viram tarefas P1 reais**) → planejar a semana. Histórico consultável.

### 3.12 Áreas, Projetos e Dashboard
Áreas com cor/ícone; projetos com seções, status e %; página da área consolida tudo. Dashboard: tendências, streaks, metas, saldo do mês, **patrimônio**, horas por área, heatmap, faixa "Evolução" (carga, pace, páginas, palavras, peso, patrimônio) e correlação energia × produtividade.

### 3.13 RITUAL DIÁRIO ☀️🌙
**Planejar (manhã, ~2 min):** rollover consciente → escolher tarefas com a barra de capacidade visível → sugerir blocos para as P1. **Encerrar (noite, ~30 s):** check do dia, energia (1–5), humor (1–5), nota livre. Opcional, sem punição por pular.

### 3.14 MODO FOCO 🎯
Tela cheia minimalista com timer, nome do bloco/tarefa e anel de progresso. Sessões contam nas estatísticas de foco (sessões/semana, horas por área). Sair antes pede confirmação — atrito positivo, sem punição.

### 3.15 CONQUISTAS 🏅
Marcos automáticos: 100 tarefas, streak 30 dias, 100 treinos, 100 km/mês, 10 livros, 50 insights, 30 dias escrevendo, 1º mês no orçamento, 1º aporte, patrimônio em marcos (10k, 50k, 100k…). Galeria + toast 🏅. Sem pontos nem ranking.

### 3.16 RETROSPECTIVA ANUAL 🎉
Gerada em dezembro ou sob demanda: o ano em números (tarefas, treinos, km, livros, palavras, evolução financeira e patrimonial, metas batidas, constância). Compartilhável como imagem gerada no app.

### 3.17 CORPO 📏
Peso e medidas opcionais com gráfico. Vinculável a metas (direção aumentar/diminuir).

---

## 4. Integrações internas (mapa de automações)

| Ação | Efeitos automáticos |
|---|---|
| Registrar treino do dia | Hábito vinculado · metas de sessões · gráficos carga/volume/1RM · PR 🏆 · conquistas |
| Registrar corrida | Hábito "correr" · km em metas · pace/volume · recordes · conquistas |
| Registrar páginas lidas | Progresso do livro · hábito leitura · livro concluído → meta · conquistas |
| Salvar insight | Fila de repetição espaçada · disponível no editor |
| Rever Insight do Dia | Reagenda próximo ressurgimento |
| Lançamento em categoria vinculada | Meta financeira · orçamento |
| **Registrar aporte** | **Patrimônio investido · metas de patrimônio · "Investido no mês" · NUNCA entra como despesa** |
| **Atualizar saldo de ativo** | **Gráfico de patrimônio · rentabilidade · metas de patrimônio** |
| Tarefa com hora | Aparece na agenda do dia |
| Parar timer/Foco | Tempo real no bloco · estatísticas de foco · oferece concluir tarefa |
| Concluir tarefa recorrente | Próxima ocorrência |
| Encerrar o dia | Energia/humor no dashboard e na revisão |
| 3 prioridades da revisão | Viram tarefas P1 |
| Registrar peso | Gráfico corporal · metas de peso |
| Virada de mês | Lançamentos recorrentes gerados |
| Dezembro / sob demanda | Retrospectiva anual |

---

## 5. Modelo de Dados (SQL — colar no Supabase; idempotente)

> Convenção: **nomes de tabelas e colunas por extenso, sem abreviações**, para que qualquer pessoa entenda o que cada tabela guarda só de ler o nome.

```sql
-- ===== NÚCLEO =====
create table if not exists areas (
  id uuid primary key default gen_random_uuid(),
  nome text not null, cor text not null default '#7C5CFC',
  icone text default '📌', ordem int default 0,
  criado_em timestamptz default now());

create table if not exists projetos (
  id uuid primary key default gen_random_uuid(),
  area_id uuid references areas(id) on delete cascade,
  nome text not null, status text default 'ativo',
  prazo date, criado_em timestamptz default now());

create table if not exists secoes (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid references projetos(id) on delete cascade,
  nome text not null, ordem int default 0);

create table if not exists etiquetas (
  id uuid primary key default gen_random_uuid(),
  nome text unique not null, cor text default '#9AA0B0');

create table if not exists tarefas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, descricao text,
  area_id uuid references areas(id) on delete set null,
  projeto_id uuid references projetos(id) on delete set null,
  secao_id uuid references secoes(id) on delete set null,
  vencimento date,
  hora time,                       -- opcional: entra na agenda do dia
  prioridade int default 4,        -- 1..4 (1 = mais alta, padrão Todoist)
  estimativa_min int,
  recorrencia jsonb,
  subtarefas jsonb default '[]',   -- [{texto, feito}]
  etiquetas text[] default '{}',   -- nomes de etiquetas
  comentarios jsonb default '[]',  -- [{texto, criado_em}]
  links jsonb default '[]',        -- [{titulo, url}]  (anexos por link)
  ordem int default 0,             -- ordenação manual na seção
  origem text,                     -- null | 'revisao_semanal'
  abandonada boolean default false,
  concluida boolean default false, concluida_em timestamptz,
  criado_em timestamptz default now());

create table if not exists filtros (
  id uuid primary key default gen_random_uuid(),
  nome text not null, criterios jsonb not null, ordem int default 0);

create table if not exists habitos (
  id uuid primary key default gen_random_uuid(),
  nome text not null, icone text default '✅',
  area_id uuid references areas(id) on delete set null,
  tipo text not null, -- diario | semanal | quantidade
  meta_quantidade numeric, unidade text, freq_semanal int,
  dias_ativos int[] default '{0,1,2,3,4,5,6}',
  tolerancia_streak boolean default false,
  fonte_auto text, -- null | 'treino' | 'corrida' | 'leitura'
  ativo boolean default true, criado_em timestamptz default now());

create table if not exists habito_registros (
  id uuid primary key default gen_random_uuid(),
  habito_id uuid references habitos(id) on delete cascade,
  data date not null, valor numeric default 1,
  unique (habito_id, data));

create table if not exists blocos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  area_id uuid references areas(id) on delete set null,
  projeto_id uuid references projetos(id) on delete set null,
  tarefa_id uuid references tarefas(id) on delete set null,
  inicio timestamptz not null, fim timestamptz not null,
  tempo_real_min int, foco boolean default false, template text);

create table if not exists rotina_modelos (
  id uuid primary key default gen_random_uuid(),
  nome text not null, guiada boolean default false,
  blocos jsonb not null);

-- ===== RITUAL DIÁRIO =====
create table if not exists dias (
  data date primary key,
  energia int, humor int, nota text,
  planejado boolean default false,
  encerrado boolean default false);

-- ===== METAS =====
create table if not exists metas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  area_id uuid references areas(id) on delete set null,
  valor_alvo numeric not null, valor_atual numeric default 0,
  unidade text, direcao text default 'aumentar', prazo date, ano int,
  vinculo_tipo text, -- null|habito|categoria_financeira|corrida_km|livros|treino_sessoes|peso|patrimonio
  vinculo_id uuid, fator_conversao numeric default 1,
  concluida boolean default false, criado_em timestamptz default now());

create table if not exists meta_registros (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid references metas(id) on delete cascade,
  data date default current_date, valor numeric not null, nota text);

-- ===== FINANÇAS · FLUXO =====
create table if not exists categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null, tipo text not null, -- entrada | saida
  cor text default '#5CC8FC', orcamento_mensal numeric);

create table if not exists contas_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null, tipo text default 'conta');

create table if not exists lancamentos_financeiros (
  id uuid primary key default gen_random_uuid(),
  tipo text not null, valor numeric not null, data date not null,
  categoria_id uuid references categorias_financeiras(id) on delete set null,
  conta_id uuid references contas_financeiras(id) on delete set null,
  descricao text, pago boolean default true, recorrencia jsonb,
  criado_em timestamptz default now());

-- ===== FINANÇAS · INVESTIMENTOS =====
create table if not exists investimentos_ativos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  classe text default 'outros', -- renda_fixa | acoes | fiis | cripto | outros
  instituicao text, ativo boolean default true,
  criado_em timestamptz default now());

create table if not exists investimentos_movimentos (
  id uuid primary key default gen_random_uuid(),
  ativo_id uuid references investimentos_ativos(id) on delete cascade,
  tipo text not null, -- aporte | resgate
  valor numeric not null, data date not null default current_date,
  nota text, criado_em timestamptz default now());

create table if not exists investimentos_saldos (
  id uuid primary key default gen_random_uuid(),
  ativo_id uuid references investimentos_ativos(id) on delete cascade,
  data date not null default current_date,
  saldo numeric not null,
  unique (ativo_id, data));
-- Patrimônio = soma do saldo mais recente de cada ativo (calculado no app)

-- ===== MUSCULAÇÃO =====
create table if not exists treino_planilhas (
  id uuid primary key default gen_random_uuid(),
  nome text not null, ordem int default 0, ativo boolean default true,
  criado_em timestamptz default now());

create table if not exists treino_exercicios (
  id uuid primary key default gen_random_uuid(),
  planilha_id uuid references treino_planilhas(id) on delete cascade,
  nome text not null, grupo_muscular text,
  series_alvo int default 3, observacao text, ordem int default 0);

create table if not exists treino_sessoes (
  id uuid primary key default gen_random_uuid(),
  planilha_id uuid references treino_planilhas(id) on delete set null,
  data date not null default current_date,
  nota text, criado_em timestamptz default now());

create table if not exists treino_registros (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid references treino_sessoes(id) on delete cascade,
  exercicio_id uuid references treino_exercicios(id) on delete set null,
  exercicio_nome text not null, -- desnormalizado: histórico sobrevive a edições
  carga_max numeric, series_feitas int, observacao text);
-- 1RM estimado (Epley) e volume calculados no app

-- ===== CORRIDA E CORPO =====
create table if not exists corridas (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  distancia_km numeric not null, tempo_seg int not null,
  percepcao int, tipo text, nota text,
  criado_em timestamptz default now());

create table if not exists corpo_registros (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  peso_kg numeric, medidas jsonb);

-- ===== LEITURA =====
create table if not exists livros (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, autor text,
  status text default 'quero_ler',
  paginas_total int, pagina_atual int default 0,
  inicio date, fim date, avaliacao int, resenha text,
  area_id uuid references areas(id) on delete set null,
  criado_em timestamptz default now());

create table if not exists artigos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, url text, fonte text,
  status text default 'para_ler', conteudo_cache text,
  criado_em timestamptz default now());

create table if not exists leitura_notas (
  id uuid primary key default gen_random_uuid(),
  livro_id uuid references livros(id) on delete cascade,
  artigo_id uuid references artigos(id) on delete cascade,
  tipo text not null, -- citacao | anotacao | insight
  conteudo text not null, pagina int, tags text[] default '{}',
  proxima_revisao date default current_date,
  intervalo_dias int default 1, arquivada boolean default false,
  criado_em timestamptz default now());

create table if not exists leitura_registros (
  id uuid primary key default gen_random_uuid(),
  livro_id uuid references livros(id) on delete cascade,
  data date not null default current_date, paginas int not null);

-- ===== ESCRITA =====
create table if not exists textos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default 'Sem título',
  conteudo text default '', status text default 'rascunho',
  tags text[] default '{}',
  area_id uuid references areas(id) on delete set null,
  palavras int default 0,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now());

-- ===== REVISÕES E CONQUISTAS =====
create table if not exists revisoes (
  id uuid primary key default gen_random_uuid(),
  tipo text default 'semanal', -- semanal | anual
  periodo_inicio date not null, periodo_fim date not null,
  metricas jsonb, respostas jsonb,
  criado_em timestamptz default now());

create table if not exists conquistas (
  codigo text primary key,
  desbloqueada_em timestamptz default now());

-- ===== CONFIGURAÇÕES =====
create table if not exists configuracoes (chave text primary key, valor jsonb);
```

---

## 6. Design Visual

**Direção:** dark mode moderno com accent vibrante (Linear/Todoist).

| Token | Valor |
|---|---|
| Fundo | `#0E0F13` · Cards `#16181F` · Elevado `#1E212B` · Borda `#2A2E3A` |
| Texto | primário `#F2F3F7` · secundário `#9AA0B0` |
| Accent | `#7C5CFC` · Sucesso `#3DDC97` · Alerta `#FFB454` · Erro `#FF5C7A` |
| Prioridades | P1 `#FF5C7A` · P2 `#FFB454` · P3 `#5CC8FC` · P4 `#9AA0B0` |
| Raio | 12px cards / 8px inputs · Fonte Inter · Grid 8px |

- **Desktop ≥ 900px:** menu lateral (Hoje, Tarefas, Hábitos, Agenda, Treino, Corrida, Leitura, Escrita, Metas, Finanças, Dashboard, Config). Finanças abre com **abas "Fluxo" e "Investimentos"**.
- **Celular:** barra inferior — Hoje · Tarefas · **➕** (menu radial: tarefa, hábito, treino, corrida, leitura, gasto, aporte, peso, bloco) · Hábitos · Mais.
- Timer/Foco como pílula flutuante; Foco expande para tela cheia com anel de progresso.
- Tarefas: checkbox circular com cor da prioridade (padrão Todoist), etiquetas como chips coloridos, seções colapsáveis, drag-and-drop para reordenar/mover de seção (desktop) e menu "mover para…" (celular).
- Micro-animações: checkbox "pop", 🔥, 🏆, 🏅, barras animadas. Undo em toda exclusão/conclusão.
- Editor: tipografia serifada opcional, ~680px, modo foco, botão ⇄.
- Rituais como bottom-sheet leve — convite, não bloqueio.
- Cada Área com cor própria (paleta de 10) em chips, blocos e bordas.

---

## 7. Regras de Negócio
1. Tarefa recorrente concluída → próxima ocorrência; histórico preservado.
2. Streaks: diário quebra em dia ativo sem registro (tolerância opcional); semanal conta semanas cumpridas; mensagem de quebra preserva o recorde.
3. Hábito com `fonte_auto` nunca é marcado manualmente.
4. Vínculos de meta seguem a seção 4; progresso recalculável do histórico.
5. **Aporte/resgate nunca aparece em despesas nem no orçamento**; o fluxo do mês mostra "Investido no mês" como linha separada. Patrimônio = soma do saldo mais recente por ativo; rentabilidade simples = (saldo atual − total aportado + total resgatado) / total aportado. Ativo sem atualização de saldo há 60+ dias recebe lembrete discreto.
6. Lançamento `pago=false` vencendo ≤ 3 dias → alerta; "marcar pago" gera lançamento real. Primeiro acesso do mês gera recorrências.
7. Timer/Foco parado → tempo real no bloco; bloco de tarefa oferece concluí-la; `foco=true` conta nas estatísticas.
8. `treino_registros.exercicio_nome` desnormalizado. 1RM (Epley) exibido como estimativa, nunca prescrição. Registro de treino é pós-treino: formulário único, sem fluxo ao vivo.
9. Editor: autosave debounce ~1,5s, indicador "salvo ✓", rascunho local sobrevive a queda de internet.
10. Painel de leitura: embed → extração → colar texto; cache offline.
11. Revisão semanal: domingo em diante, lembrete até concluir, métricas congeladas; 3 prioridades viram tarefas P1 com `origem='revisao_semanal'`.
12. Offline-first: localStorage primeiro, sincroniza ao reconectar (last-write-wins).
13. Rollover consciente: decisão explícita por tarefa vencida; `abandonada=true` sai das listas, fica no histórico, não conta como falha.
14. Capacidade do dia: estimativas + blocos vs. janela útil configurável; >100% = alerta visual; nunca bloqueia.
15. Repetição espaçada: fila = notas com `proxima_revisao <= hoje` e não arquivadas (máx. 1–3/dia); "lembrei" avança 1→3→7→21→60→120 dias.
16. Conquistas: verificadas após registros relevantes; desbloqueio único.
17. Ritual diário opcional, sem penalidade.
18. PWA: `manifest.webmanifest` e `sw.js` como arquivos próprios (navegadores não aceitam service worker inline); o `sw.js` cacheia o app shell e as bibliotecas de CDN para abertura offline e instantânea.
19. **Parser de linguagem natural** (tarefas): reconhece data/hora pt-BR ("amanhã", "sexta", "9h", "14:30"), recorrência, "#projeto", "@etiqueta", "p1"–"p4"; tokens destacados antes de salvar; criar "#projeto" ou "@etiqueta" inexistente oferece criação na hora.
20. Tarefa com hora aparece na agenda do dia como item de horário (distinto de bloco; pode ser convertida em bloco com duração).

---

## 8. Roteiro de Construção (para a IA que vai gerar o código)
**Entregável: pacote de 3 arquivos estáticos — `index.html` (todo o app embutido) + `manifest.webmanifest` + `sw.js` (PWA).**

1. Base: roteamento hash, layout responsivo, tema, navegação, menu ➕, manifest PWA + service worker.
2. Dados: cliente Supabase REST + cache/fila offline + onboarding + Saúde do Sistema.
3. Tarefas Todoist-like (parser natural com hora, projetos/seções, etiquetas, comentários, links, filtros salvos, rollover/abandono).
4. Hábitos (3 tipos, streaks, heatmap, `fonte_auto`).
5. Tela Hoje v1 (tarefas + hábitos + agenda com tarefas com hora + timer + capacidade).
6. Ritual diário (planejar com rollover; encerrar com energia/humor).
7. Musculação (planilhas, registro pós-treino, gráficos carga/volume/1RM, PRs).
8. Corrida + Corpo.
9. Leitura + repetição espaçada + Insight do Dia.
10. Escrita (editor, autosave, modo ⇄, captura, streak do escritor).
11. Agenda semanal + templates + rotinas guiadas + relatório de tempo + Modo Foco.
12. Metas (todos os vínculos + visão anual).
13. Finanças: Fluxo completo.
14. Finanças: Investimentos (ativos, aportes/resgates, saldos, patrimônio, rentabilidade, meta de patrimônio).
15. Revisão semanal guiada.
16. Dashboard geral + Conquistas + export/import JSON.
17. Retrospectiva anual (com imagem compartilhável).

**Critérios de aceite:** 375px e 1440px; registro principal ≤ 2 toques; carrega < 2s; zero dependências pagas; sincroniza entre 2 dispositivos; usuário nunca abre o Supabase após a configuração; nada se perde offline; instalável como PWA; aportes jamais contaminam o orçamento de consumo.

---

## 9. Backlog (avaliado e deixado de fora da v1, por decisão consciente)
- Auto-agendamento por IA (Motion): custo contínuo e tira o controle manual.
- Integrações OAuth (Google Calendar, Strava, corretoras/open finance): complexidade e manutenção; v1 é manual por princípio.
- Social/accountability: sistema de usuário único.
- Flashcards completos: a repetição espaçada de insights cobre o caso.
- Anexos como arquivos (Supabase Storage), cotações automáticas de ativos, notificações push, calculadora de anilhas: candidatos à v1.1.


### 9.1 Avaliação: OpenClaw e agentes de IA pessoais
**O que é:** o OpenClaw é um framework open-source de assistente de IA pessoal que roda 24/7 em um computador seu (ou servidor) e conversa com você por WhatsApp/Telegram, executando tarefas reais por meio de "skills". O software em si é gratuito.

**É compatível com este sistema?** Sim, e por um motivo de arquitetura: todo o Life OS vive numa API REST aberta (Supabase). Um agente como o OpenClaw poderia receber uma skill simples com a URL e a chave do seu projeto e passar a **ler e escrever no mesmo banco que o app usa** — por exemplo: você manda "gastei 45 no mercado" ou "treino A feito: supino 80kg 4 séries" no WhatsApp e o agente cria o lançamento/sessão; de manhã ele te envia um resumo do seu dia (tarefas, hábitos, agenda) lido direto das tabelas. Nada no design atual precisa mudar para isso — o sistema já nasce "agent-ready".

**Por que NÃO entra na v1 (decisão consciente):**
1. **Custo:** o OpenClaw é grátis, mas rodar um agente não é — ele precisa de um modelo de IA (APIs pagas, tipicamente US$ 5–50/mês conforme o uso) e de uma máquina ligada 24/7 (PC próprio, mini PC ou VPS ~US$ 4–5/mês). Existem caminhos de custo zero (modelos locais com 16 GB+ de RAM, free tiers de API com limites de taxa), mas todos violam o princípio "zero manutenção e zero conhecimento técnico" deste projeto.
2. **Segurança:** dar a um agente autônomo acesso de escrita ao seu banco pessoal e às suas mensagens exige configuração cuidadosa (limites de ferramentas, isolamento de rede) — a própria comunidade do OpenClaw publica guia de segurança obrigatório.
3. **Complexidade operacional:** instalar, configurar e manter um agente 24/7 é um projeto em si, na contramão do "colar e usar".

**Caminho futuro recomendado (v2):** se um dia fizer sentido, a integração ideal é mínima — uma skill do agente com 3 operações (criar tarefa, criar lançamento, ler resumo do dia) usando a mesma API REST, com uma chave de escopo restrito. O spec atual não precisa de nenhuma alteração para deixar essa porta aberta.

---

## 10. Prompt pronto para gerar o código
> "Implemente integralmente o sistema descrito neste spec (Life OS Pessoal v4.1) como um pacote de 3 arquivos estáticos (index.html com todo CSS/JS embutido, manifest.webmanifest e sw.js), instalável como PWA, seguindo a ordem do roteiro da seção 8, as mitigações da seção 2.4, o modelo de dados da seção 5, as integrações da seção 4, as regras da seção 7 e o design da seção 6. Respeite o contrato 'Supabase invisível' da seção 2.1 e a regra de que aportes nunca entram no orçamento de consumo. Não use nenhum serviço pago. Comece pela etapa 1 e me entregue o arquivo funcional ao final de cada etapa."
