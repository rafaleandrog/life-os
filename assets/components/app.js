'use strict';
/* ============ BOOTSTRAP DA APLICAÇÃO ============ */
const BootHooks = [];

/* ---- SQL idempotente (seção 5 do spec — botão "copiar SQL") ---- */
const SQL_SETUP = `-- LIFE OS v4.1 — script de criação (idempotente; pode rodar mais de uma vez)
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
  icone text default '📁',
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
  hora time,
  prioridade int default 4,
  estimativa_min int,
  recorrencia jsonb,
  subtarefas jsonb default '[]',
  etiquetas text[] default '{}',
  comentarios jsonb default '[]',
  links jsonb default '[]',
  ordem int default 0,
  origem text,
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
  tipo text not null,
  meta_quantidade numeric, unidade text, freq_semanal int,
  dias_ativos int[] default '{0,1,2,3,4,5,6}',
  tolerancia_streak boolean default false,
  fonte_auto text,
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
  vinculo_tipo text,
  vinculo_id uuid, fator_conversao numeric default 1,
  concluida boolean default false, criado_em timestamptz default now());

create table if not exists meta_registros (
  id uuid primary key default gen_random_uuid(),
  meta_id uuid references metas(id) on delete cascade,
  data date default current_date, valor numeric not null, nota text);

-- ===== FINANÇAS · FLUXO =====
create table if not exists categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null, tipo text not null,
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
  classe text default 'outros',
  instituicao text, ativo boolean default true,
  criado_em timestamptz default now());

create table if not exists investimentos_movimentos (
  id uuid primary key default gen_random_uuid(),
  ativo_id uuid references investimentos_ativos(id) on delete cascade,
  tipo text not null,
  valor numeric not null, data date not null default current_date,
  nota text, criado_em timestamptz default now());

create table if not exists investimentos_saldos (
  id uuid primary key default gen_random_uuid(),
  ativo_id uuid references investimentos_ativos(id) on delete cascade,
  data date not null default current_date,
  saldo numeric not null,
  unique (ativo_id, data));

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
  exercicio_nome text not null,
  carga_max numeric, series_feitas int, observacao text);

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
  tipo text not null,
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
  tipo text default 'semanal',
  periodo_inicio date not null, periodo_fim date not null,
  metricas jsonb, respostas jsonb,
  criado_em timestamptz default now());

create table if not exists conquistas (
  codigo text primary key,
  desbloqueada_em timestamptz default now());

-- ===== CONFIGURAÇÕES =====
create table if not exists configuracoes (chave text primary key, valor jsonb);

-- ===== BUGS E SUGESTÕES =====
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  problema text, solucao text,
  status text default 'aberto',
  criado_em timestamptz default now());`;

/* ---- Cliente REST do Supabase (erros amigáveis em pt-BR) ---- */
async function sb(metodo, caminho, corpo, headersExtra) {
  const url = String(CFG.url || '').replace(/\/+$/, '') + '/rest/v1/' + caminho;
  let bearer = window.LifeOSAuth && window.LifeOSAuth.state && window.LifeOSAuth.state.session
    ? window.LifeOSAuth.state.session.access_token
    : null;
  if (!bearer && window.supabaseClient && window.supabaseClient.auth) {
    try {
      const { data } = await window.supabaseClient.auth.getSession();
      bearer = data && data.session ? data.session.access_token : null;
    } catch (_) {}
  }
  const headers = { apikey: CFG.key, Authorization: 'Bearer ' + (bearer || CFG.key), ...(headersExtra || {}) };
  if (corpo != null) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(url, { method: metodo, headers, body: corpo != null ? JSON.stringify(corpo) : undefined });
  } catch (e) {
    throw { tipo:'rede', msg: navigator.onLine
      ? 'Não consegui falar com o Supabase. O projeto pode estar pausado por inatividade — abra a Saúde do Sistema.'
      : 'Você está offline. Os registros ficam na fila e sincronizam quando a internet voltar.' };
  }
  if (!res.ok) {
    let det = ''; try { const j = await res.json(); det = j.message || j.hint || j.error || ''; } catch(_) {}
    if (res.status === 401 || res.status === 403) throw { tipo:'auth', status:res.status, msg:'Sessão Google ausente, expirada ou sem permissão para acessar o Supabase.' };
    if (res.status === 404 || /does not exist|42P01/i.test(det)) throw { tipo:'tabela', status:res.status, msg:'Falta tabela no banco. Abra a Saúde do Sistema e use o botão "copiar SQL".', det };
    if (res.status >= 500) throw { tipo:'servidor', status:res.status, msg:'O Supabase respondeu com erro ('+res.status+'). Se persistir, o projeto pode estar pausado — veja a Saúde do Sistema.' };
    throw { tipo:'outro', status:res.status, msg:'Erro do banco ('+res.status+'). '+det };
  }
  if (res.status === 204) return null;
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

/* ---- Fila offline (zero perda de registros) ---- */
function enqueue(op, t, payload) {
  if (!CFG.url || !CFG.key) return; // sem Supabase configurado: nada a sincronizar
  if (op === 'up') {
    const pk = TABLES[t];
    const last = S.queue[S.queue.length - 1];
    if (last && last.op === 'up' && last.t === t) {
      for (const r of payload) {
        const i = last.rows.findIndex(x => x[pk] === r[pk]);
        if (i < 0) last.rows.push({...r}); else last.rows[i] = {...r};
      }
    } else S.queue.push({ op:'up', t, rows: payload.map(r => ({...r})) });
  } else {
    S.queue.push({ op:'del', t, id: payload });
  }
  saveQueue();
  // Uma ação nova do usuário merece tentativa limpa: sai da pausa e zera o backoff.
  S.syncPausado = false; S.retry = 0;
  scheduleFlush();
  atualizarSyncUI();
}
const scheduleFlush = debounce(() => flush(), 900);

/* Rótulos amigáveis das tabelas (mensagens de erro em pt-BR) */
const TABELA_ROTULO = { areas:'área', projetos:'projeto', secoes:'seção', tarefas:'tarefa',
  habitos:'hábito', habito_registros:'registro de hábito', metas:'meta', meta_registros:'registro de meta',
  lancamentos_financeiros:'lançamento', investimentos_ativos:'ativo', investimentos_movimentos:'movimento',
  investimentos_saldos:'saldo', treino_planilhas:'planilha de treino', treino_sessoes:'sessão de treino',
  treino_registros:'registro de treino', corridas:'corrida', corpo_registros:'medida corporal',
  livros:'livro', artigos:'artigo', leitura_notas:'nota de leitura', textos:'texto', blocos:'bloco' };
const rotuloTabela = t => TABELA_ROTULO[t] || t;

/* Backoff anti-piscar: 2s, 5s, 15s; depois pausa e espera ação do usuário. */
const RETRY_BACKOFF = [2000, 5000, 15000];
function agendarRetry() {
  if (S.retryTimer) return;
  if (S.retry >= RETRY_BACKOFF.length) { S.syncPausado = true; S.retry = 0; atualizarSyncUI(); return; }
  const ms = RETRY_BACKOFF[S.retry];
  S.retryTimer = setTimeout(() => { S.retryTimer = null; S.retry++; flush(true); }, ms);
}

/* Saneia FKs: vínculo opcional órfão → null; vínculo obrigatório órfão → descarta a linha.
   Como o flush envia PAIS antes de FILHOS, um pai existente localmente já estará no banco. */
function sanearLinha(t, row) {
  const refs = FK_REFS[t];
  if (!refs) return { row };
  let saida = row;
  for (const [campo, paiTab, obrig] of refs) {
    const pid = row[campo];
    if (pid == null || pid === '') continue;
    if (byId(paiTab, pid)) continue;            // pai existe localmente → enviado antes → ok
    if (obrig) return { descartar: true, motivo: campo + ' aponta para ' + rotuloTabela(paiTab) + ' inexistente' };
    if (saida === row) saida = { ...row };
    saida[campo] = null;                          // vínculo opcional órfão → nulo
  }
  return { row: saida };
}
/* Mapeia o objeto local para o formato EXATO da tabela: só as colunas existentes,
   sempre o mesmo conjunto (ausentes → null), sem campos extras. Acrescenta user_id.
   Resolve o 400 "All object keys must match" e o 400 "column does not exist". */
function normalizar(t, row, userId) {
  const cols = COLS[t];
  const out = {};
  if (!cols) { Object.assign(out, row); }
  else for (const c of cols) { const v = row[c]; out[c] = (v === undefined ? null : v); }
  if (userId != null) out.user_id = userId;
  return out;
}
function logFalha(t, op, payload, e) {
  try { console.error('[Life OS] Falha de sincronização', { tabela: t, operacao: op, status: e && e.status, motivo: e && e.msg, payload }); } catch (_) {}
}
function removerDaFila(it) { const j = S.queue.indexOf(it); if (j >= 0) S.queue.splice(j, 1); saveQueue(); }
function paraQuarentena(it, motivo, payload) {
  S.deadQueue.push({ op: it.op, t: it.t, rows: it.rows, id: it.id, motivo, payload: payload || null, quando: nowISO() });
  if (S.deadQueue.length > 200) S.deadQueue = S.deadQueue.slice(-200);
  saveDead();
}
function notificarFalhaSync(e, it) {
  const agora = Date.now();
  if (flush._ultimoToast && agora - flush._ultimoToast < 8000) return;
  flush._ultimoToast = agora;
  let msg, dica = '';
  if (it) { msg = '1 registro de "' + rotuloTabela(it.t) + '" foi recusado pelo banco: ' + (e.msg || ('erro ' + (e.status || ''))); dica = ' Abra a Saúde do Sistema para descartar ou reenviar.'; }
  else if (e.tipo === 'auth') { msg = 'Sincronização pausada: ' + e.msg; dica = ' Entre de novo com o Google em Config.'; }
  else if (e.tipo === 'tabela') { msg = 'Sincronização pausada: ' + e.msg; dica = ' Rode o SQL na Saúde do Sistema.'; }
  else { msg = 'Sem conexão com o Supabase agora.'; dica = ' Vou tentar de novo automaticamente.'; }
  toast(msg + dica, { icone:'⚠️', ms:7000 });
}

async function flush(forcar) {
  if (S.flushing) return;
  if (S.syncPausado && !forcar) { atualizarSyncUI(); return; }   // não retenta em loop: espera o usuário
  if (!CFG.url || !CFG.key || !usuarioAutenticado() || !S.queue.length) { atualizarSyncUI(); return; }
  if (S.retryTimer) { clearTimeout(S.retryTimer); S.retryTimer = null; }
  S.flushing = true; atualizarSyncUI();
  const me = usuarioAtual();
  let transitorio = false;
  if (me && me.id) {
    // Ordem: todos os UPSERTS primeiro (pai→filho), depois os DELETES (filho→pai).
    // Assim a repontagem de filhos é gravada antes de apagar pais duplicados (sem FK/cascade indevido).
    const ordenada = S.queue.map((it, i) => ({ it, i }))
      .sort((a, b) => {
        const da = a.it.op === 'del' ? 1 : 0, db = b.it.op === 'del' ? 1 : 0;
        if (da !== db) return da - db;
        const rk = da ? (tableRank(b.it.t) - tableRank(a.it.t)) : (tableRank(a.it.t) - tableRank(b.it.t));
        return rk || (a.i - b.i);
      })
      .map(x => x.it);
    laco:
    for (const it of ordenada) {
      if (S.queue.indexOf(it) < 0) continue;
      if (it.op === 'del') {
        try { await sb('DELETE', it.t + '?' + TABLES[it.t] + '=eq.' + encodeURIComponent(it.id)); removerDaFila(it); }
        catch (e) {
          S.syncErr = e.msg || String(e);
          if (e.tipo === 'rede' || e.tipo === 'servidor') { transitorio = true; notificarFalhaSync(e); break laco; }
          if (e.tipo === 'auth' || e.tipo === 'tabela') { S.syncPausado = true; notificarFalhaSync(e); break laco; }
          logFalha(it.t, 'del', { id: it.id }, e);
          paraQuarentena({ op:'del', t:it.t, id:it.id }, e.msg || ('erro ' + (e.status || '')), { id: it.id });
          removerDaFila(it); notificarFalhaSync(e, it);
        }
        continue;
      }
      // 'up' — UM registro por requisição, normalizado (à prova de "All object keys must match")
      const oc = ON_CONFLICT[it.t] || TABLES[it.t];
      const restantes = it.rows.slice();
      while (restantes.length) {
        const r = restantes[0];
        const s = sanearLinha(it.t, r);
        if (s.descartar) { paraQuarentena({ op:'up', t:it.t, rows:[r] }, s.motivo, normalizar(it.t, r, me.id)); restantes.shift(); continue; }
        const payload = normalizar(it.t, s.row, me.id);   // cada linha pertence à conta logada (RLS)
        try {
          await sb('POST', it.t + '?on_conflict=' + oc, [payload], { Prefer: 'resolution=merge-duplicates,return=minimal' });
          restantes.shift();
        } catch (e) {
          S.syncErr = e.msg || String(e);
          if (e.tipo === 'rede' || e.tipo === 'servidor') { transitorio = true; it.rows = restantes; saveQueue(); notificarFalhaSync(e); break laco; }
          if (e.tipo === 'auth' || e.tipo === 'tabela') { S.syncPausado = true; it.rows = restantes; saveQueue(); notificarFalhaSync(e); break laco; }
          // erro de dados desta linha (400/409/422…): isola SÓ ela na quarentena e segue
          logFalha(it.t, 'up', payload, e);
          paraQuarentena({ op:'up', t:it.t, rows:[r] }, e.msg || ('erro ' + (e.status || '')), payload);
          notificarFalhaSync(e, it); restantes.shift();
        }
      }
      if (S.queue.indexOf(it) >= 0) { if (restantes.length) { it.rows = restantes; saveQueue(); } else removerDaFila(it); }
    }
  }
  S.flushing = false;
  if (!transitorio && !S.syncPausado && !S.queue.length) {
    if (!S.deadQueue.length) { S.syncErr = null; FLAGS.lastSync = nowISO(); saveFlags(); }
    S.retry = 0;
    // confirmado: limpa os indicadores "salvando" sem piscar nem mexer no scroll
    if (typeof document !== 'undefined' && document.querySelector && document.querySelector('.task .saving')) render({ manterScroll:true, semFade:true });
  } else if (transitorio && !S.syncPausado) {
    agendarRetry();
  }
  atualizarSyncUI();
}
async function pullTable(t) {
  let out = [], from = 0; const page = 1000;
  for (;;) {
    const r = await sb('GET', t + '?select=*', null, { Range: from + '-' + (from + page - 1) });
    out = out.concat(r || []);
    if (!r || r.length < page) break;
    from += page;
  }
  return out;
}
/* Conjunto de ids com escrita PENDENTE (na fila ou em quarentena) por tabela.
   Usado para (a) não deixar o servidor remover otimistas da UI e (b) marcar "salvando". */
function idsPendentes(t) {
  const pk = TABLES[t], set = new Set();
  for (const it of S.queue) if (it.op === 'up' && it.t === t && it.rows) for (const r of it.rows) set.add(r[pk]);
  for (const it of S.deadQueue) if (it.op === 'up' && it.t === t && it.rows) for (const r of it.rows) set.add(r[pk]);
  return set;
}
const estaPendente = (t, id) => {
  for (const it of S.queue) if (it.op === 'up' && it.t === t && it.rows && it.rows.some(r => r[TABLES[t]] === id)) return true;
  return false;
};
/* Mescla as operações ainda pendentes (fila) e os recusados (quarentena) POR CIMA do
   snapshot do servidor — assim um item otimista criado antes/durante o pull nunca some. */
function mesclarPendentes(novo) {
  const sobre = (t, rows) => {
    const pk = TABLES[t]; const arr = novo[t] || (novo[t] = []);
    for (const r of rows) { const i = arr.findIndex(x => x[pk] === r[pk]); if (i >= 0) arr[i] = r; else arr.push(r); }
  };
  for (const it of S.queue) {
    if (it.op === 'up' && it.rows) sobre(it.t, it.rows);
    else if (it.op === 'del' && novo[it.t]) novo[it.t] = novo[it.t].filter(x => x[TABLES[it.t]] !== it.id);
  }
  // recusados (não salvos) continuam visíveis localmente para o usuário resolver
  for (const it of S.deadQueue) if (it.op === 'up' && it.rows) sobre(it.t, it.rows);
}
async function pullAll(silencioso) {
  if (!CFG.url || !CFG.key || !usuarioAutenticado()) return false;
  await flush();
  if (!navigator.onLine) return false; // offline: não lê; pendências ficam na fila
  const novo = {};
  try { for (const t of Object.keys(TABLES)) novo[t] = await pullTable(t); }
  catch (e) { S.syncErr = e.msg || String(e); atualizarSyncUI(); return false; } // blip de rede: não sobrescreve
  // dedup defensivo por id no que veio da nuvem (cache nunca recebe id repetido)
  for (const t of Object.keys(TABLES)) {
    const pk = TABLES[t], m = new Map();
    for (const r of novo[t]) if (r[pk] != null) m.set(r[pk], r);
    if (m.size !== novo[t].length) novo[t] = Array.from(m.values());
  }
  const totalNuvem = Object.values(novo).reduce((a, arr) => a + arr.length, 0);
  const totalLocal = Object.values(S.data).reduce((a, arr) => a + arr.length, 0);
  if (!totalNuvem && totalLocal && !S.queue.length && !S.deadQueue.length) return 'vazio'; // nuvem vazia p/ esta conta
  // RECONCILIAÇÃO: nunca remover da UI um item ainda pendente/otimista (criado antes ou DURANTE o pull)
  mesclarPendentes(novo);
  S.lastPull = nowISO(); S.syncErr = null;
  const mudou = JSON.stringify(novo) !== JSON.stringify(S.data);
  if (!mudou) { atualizarSyncUI(); return 'igual'; } // nuvem == local → não re-renderiza (sem piscar)
  S.data = novo; saveLocal();
  if (!silencioso) toast('Sincronizado ✓', { icone:'🔄' });
  atualizarSyncUI();
  return true;
}
async function fullPush() { // conectar depois: envia tudo que existe localmente
  for (const t of Object.keys(TABLES)) {
    const rows = T(t);
    for (let i = 0; i < rows.length; i += 200) enqueue('up', t, rows.slice(i, i + 200));
  }
  await flush();
}

/* Consolida duplicatas de PAIS por chave de negócio (nome), repontando os filhos
   para o registro canônico (o mais antigo) e apagando os excedentes no banco.
   Corrige bancos que já acumularam áreas/categorias/etc. repetidas. Retorna nº removido. */
const DEDUP_PLANOS = [
  { t:'areas', chave:r=>r.nome, filhos:[['projetos','area_id'],['tarefas','area_id'],['habitos','area_id'],['metas','area_id'],['livros','area_id'],['textos','area_id'],['blocos','area_id']] },
  { t:'categorias_financeiras', chave:r=>r.nome, filhos:[['lancamentos_financeiros','categoria_id']] },
  { t:'contas_financeiras', chave:r=>r.nome, filhos:[['lancamentos_financeiros','conta_id']] },
  { t:'etiquetas', chave:r=>r.nome, filhos:[] }, // referenciadas por nome (text[]), sem repontar
  { t:'projetos', chave:r=>(r.area_id||'')+'|'+r.nome, filhos:[['secoes','projeto_id'],['tarefas','projeto_id'],['blocos','projeto_id']] },
  { t:'secoes', chave:r=>(r.projeto_id||'')+'|'+r.nome, filhos:[['tarefas','secao_id']] },
  { t:'treino_planilhas', chave:r=>r.nome, filhos:[['treino_exercicios','planilha_id'],['treino_sessoes','planilha_id']] },
  { t:'investimentos_ativos', chave:r=>r.nome, filhos:[['investimentos_movimentos','ativo_id'],['investimentos_saldos','ativo_id']] }
];
function dedupRemoto() {
  let removidos = 0;
  for (const p of DEDUP_PLANOS) {
    const arr = T(p.t); if (arr.length < 2) continue;
    const pk = TABLES[p.t];
    const ordenado = [...arr].sort((a,b) => String(a.criado_em||'').localeCompare(String(b.criado_em||'')));
    const canon = new Map();      // chave → id canônico (1º/mais antigo)
    const remap = {};             // idDuplicado → idCanônico
    for (const r of ordenado) {
      const k = p.chave(r), id = r[pk];
      if (!canon.has(k)) canon.set(k, id);
      else if (canon.get(k) !== id) remap[id] = canon.get(k);
    }
    const dups = Object.keys(remap);
    if (!dups.length) continue;
    // 1) reponta filhos para o id canônico (enfileira update)
    for (const [ct, campo] of p.filhos) {
      for (const c of T(ct)) if (remap[c[campo]] !== undefined) { c[campo] = remap[c[campo]]; enqueue('up', ct, [c]); }
    }
    // 2) remove duplicatas do cache local
    S.data[p.t] = arr.filter(r => remap[r[pk]] === undefined);
    // 3) apaga as duplicatas no banco (flush envia DELETES depois dos UPDATES)
    for (const id of dups) { enqueue('del', p.t, id); removidos++; }
  }
  if (removidos) saveLocal();
  return removidos;
}

/* Reset seguro: descarta TODO o estado local (fila + cache + erros), relê o banco
   limpo e reconstrói o cache a partir dele. Para quando o estado local corromper. */
async function reconstruirDoBanco() {
  if (!CFG.url || !CFG.key || !usuarioAutenticado()) { toast('Entre com o Google primeiro.', {icone:'🔐'}); return; }
  S.queue = []; S.deadQueue = []; saveQueue(); saveDead();
  S.syncErr = null; S.syncPausado = false; S.retry = 0;
  if (S.retryTimer) { clearTimeout(S.retryTimer); S.retryTimer = null; }
  S.data = tabelasVazias(); saveLocal();
  FLAGS.seeded = true; saveFlags();            // já há conta na nuvem: nunca re-semear por cima
  const novo = {};
  for (const t of Object.keys(TABLES)) {
    const pk = TABLES[t], m = new Map();
    for (const r of await pullTable(t)) if (r[pk] != null) m.set(r[pk], r); // dedup por id
    novo[t] = Array.from(m.values());
  }
  S.data = novo; S.lastPull = nowISO(); saveLocal();
  const limpos = dedupRemoto();                // consolida pais repetidos por nome e reponta filhos
  if (limpos) await flush();                    // grava repontagem + apaga duplicatas no banco
  render();
  return limpos;
}
function syncStatus() {
  if (!CFG.url || !CFG.key) return 'off';
  if (window.LifeOSAuth && window.LifeOSAuth.state && window.LifeOSAuth.state.ready && !window.LifeOSAuth.state.user) return 'auth';
  if (S.syncPausado) return 'pausado';            // backoff esgotado: espera ação do usuário
  if (S.deadQueue.length) return 'err';           // itens recusados aguardando descarte/reenvio
  if (S.flushing || S.queue.length) return 'pend';
  return 'ok';
}
function atualizarSyncUI() {
  const st = syncStatus();
  const tip = S.deadQueue.length ? (S.deadQueue.length + ' item(ns) recusado(s). Último: ' + (S.syncErr || '—'))
    : (S.syncErr ? 'Sinc.: ' + S.syncErr : 'estado da sincronização');
  $$('.sync-dot').forEach(d => { d.className = 'sync-dot ' + st; d.title = tip; });
  const l = $('#synclabel'); if (l) l.textContent = syncLabel();
}
function usuarioAutenticado() {
  return !!(window.LifeOSAuth && window.LifeOSAuth.state && window.LifeOSAuth.state.user);
}
/* usuário logado normalizado {id, email, nome, avatar} (a partir da sessão do Supabase Auth) */
function usuarioAtual() {
  const u = window.LifeOSAuth && window.LifeOSAuth.state && window.LifeOSAuth.state.user;
  if (!u) return null;
  const md = u.user_metadata || (u.identities && u.identities[0] && u.identities[0].identity_data) || {};
  return { id: u.id, email: u.email || md.email || '', nome: md.full_name || md.name || '', avatar: md.avatar_url || md.picture || '' };
}
function logout() { if (window.LifeOSAuth && window.LifeOSAuth.logout) window.LifeOSAuth.logout(); }
act('auth-login', () => { if (window.LifeOSAuth && window.LifeOSAuth.loginGoogle) window.LifeOSAuth.loginGoogle(); });
act('auth-logout', () => confirmBox('Sair da conta Google? Os dados locais continuam neste dispositivo; a sincronização pausa até entrar de novo.', () => logout()));
act('auth-copy-url', () => { const u = new URL('.', location.href); u.hash=''; u.search=''; copiarTexto(u.href, 'URL do app copiada — cole em Site URL no Supabase.'); });
async function sincronizarNuvemInicial(silencioso) {
  if (!CFG.url || !CFG.key) { atualizarSyncUI(); return false; }
  if (!usuarioAutenticado()) {
    S.syncErr = null;
    atualizarSyncUI();
    return false;
  }
  if (S.sincronizando) return false;   // MUTEX: nunca rodar dois ciclos ao mesmo tempo
  S.sincronizando = true;              // (era a causa do seed triplicado no 1º login)
  try {
    // banco ainda sem proteção por usuário? guia a migração e não tenta sincronizar
    const chk = await verificarTabelas().catch(() => null);
    if (chk && (chk.faltando.length || chk.precisaMigrar)) { atualizarSyncUI(); modalMigracao(chk); render(); return false; }
    await flush();
    const ok = await pullAll(true);
    let precisaRender = (ok === true); // só re-renderiza quando os dados realmente mudaram (anti-piscar)
    if (ok === 'vazio') { // nuvem vazia para esta conta e há dados locais → envia tudo (idempotente)
      await fullPush();
      if (!S.queue.length && !silencioso) toast('Seus dados deste dispositivo foram enviados para a sua conta ✓', { icone:'☁️', ms:5500 });
    } else if ((ok === true || ok === 'igual') && !FLAGS.seeded && !T('areas').length) {
      seedData(); // só semeia se a nuvem estiver realmente vazia e nunca semeado antes
      await flush();
      precisaRender = true;
    }
    if (!silencioso && ok === true) toast('Sincronizado ✓', { icone:'🔄' });
    // re-render de background: preserva o scroll e não "pisca" (sem fade)
    if (precisaRender) render({ manterScroll: true, semFade: true }); else atualizarSyncUI();
    return ok;
  } finally {
    S.sincronizando = false;
  }
}
window.LifeOSAfterAuthChange = state => {
  if (state && state.user) sincronizarNuvemInicial(true).catch(e => { S.syncErr = e.msg || String(e); atualizarSyncUI(); });
};
window.addEventListener('online', () => {
  toast('Internet de volta — sincronizando…', {icone:'🌐'});
  sincronizarNuvemInicial(true).catch(() => {});
});

/* ---- Helpers de formulário genérico (usados por todos os módulos) ---- */
function fldHTML(f, v) {
  const val = v === undefined || v === null ? (f.def !== undefined ? f.def : '') : v;
  const req = f.req ? ' data-req="1"' : '';
  let inp = '';
  switch (f.t || 'text') {
    case 'text': inp = '<input class="input" name="'+f.k+'" value="'+esc(val)+'" placeholder="'+esc(f.ph||'')+'"'+req+(f.foco?' autofocus':'')+'>'; break;
    case 'num': inp = '<input class="input" name="'+f.k+'" type="number" inputmode="decimal" step="'+(f.step||'any')+'" value="'+esc(val)+'" placeholder="'+esc(f.ph||'')+'"'+req+'>'; break;
    case 'money': inp = '<input class="input" name="'+f.k+'" inputmode="decimal" value="'+(val!==''?String(val).replace('.',','):'')+'" placeholder="'+esc(f.ph||'0,00')+'"'+req+'>'; break;
    case 'date': inp = '<input class="input" name="'+f.k+'" type="date" value="'+esc(val)+'"'+req+'>'; break;
    case 'time': inp = '<input class="input" name="'+f.k+'" type="time" value="'+esc(fmtHora(val))+'">'; break;
    case 'ta': inp = '<textarea class="textarea" name="'+f.k+'" rows="'+(f.rows||3)+'" placeholder="'+esc(f.ph||'')+'">'+esc(val)+'</textarea>'; break;
    case 'sel': inp = '<select class="select" name="'+f.k+'">'+(f.opts||[]).map(o => {
        const ov = o.v !== undefined ? o.v : o, ot = o.t !== undefined ? o.t : o;
        return '<option value="'+esc(ov)+'"'+(String(ov)===String(val)?' selected':'')+'>'+esc(ot)+'</option>';
      }).join('')+'</select>'; break;
    case 'chk': return '<label class="checkline"><input type="checkbox" name="'+f.k+'"'+(val?' checked':'')+'> '+esc(f.l)+(f.dica?' <span class="muted small">— '+esc(f.dica)+'</span>':'')+'</label>';
    case 'cor': return '<div class="field"><label>'+esc(f.l)+'</label><div class="row wrap" data-cor="'+f.k+'" data-val="'+esc(val||PALETA[0])+'">'
      + PALETA.map(c => '<span class="dot" data-act="fld-cor" data-c="'+c+'" style="width:26px;height:26px;cursor:pointer;background:'+c+';outline:'+(c===(val||PALETA[0])?'2px solid #fff':'none')+';outline-offset:2px"></span>').join('')+'</div></div>';
    case 'stars': return '<div class="field"><label>'+esc(f.l)+'</label><div class="stars" data-stars="'+f.k+'" data-val="'+(val||0)+'">'
      + [1,2,3,4,5].map(n => '<span data-act="fld-star" data-v="'+n+'" class="'+(n<=(val||0)?'on':'')+'">★</span>').join('')+'</div></div>';
    case 'range': inp = '<div class="row"><input type="range" name="'+f.k+'" min="'+(f.min||1)+'" max="'+(f.max||5)+'" value="'+(val||f.min||1)+'" style="flex:1;accent-color:var(--acc)" data-inp="fld-range"><b data-rangeval>'+(val||f.min||1)+'</b></div>'; break;
  }
  return '<div class="field'+(f.meia?' meia':'')+'"><label>'+esc(f.l)+(f.req?' *':'')+'</label>'+inp+(f.dica?'<span class="tiny muted">'+esc(f.dica)+'</span>':'')+'</div>';
}
act('fld-cor', el => { const box = el.closest('[data-cor]'); box.dataset.val = el.dataset.c;
  box.querySelectorAll('.dot').forEach(d => d.style.outline = d.dataset.c === el.dataset.c ? '2px solid #fff' : 'none'); });
act('fld-star', el => { const box = el.closest('[data-stars]'); const v = Number(el.dataset.v);
  box.dataset.val = v; box.querySelectorAll('span').forEach((s,i) => s.classList.toggle('on', i < v)); });
act('fld-range', el => { el.parentElement.querySelector('[data-rangeval]').textContent = el.value; });
function formHTML(fields, vals) {
  vals = vals || {};
  let out = '', meia = [];
  const flushMeia = () => { if (meia.length) { out += '<div class="frow">'+meia.join('')+'</div>'; meia = []; } };
  for (const f of fields) {
    const h = fldHTML(f, vals[f.k]);
    if (f.meia) { meia.push(h); if (meia.length === 2) flushMeia(); } else { flushMeia(); out += h; }
  }
  flushMeia();
  return out;
}
function lerForm(box, fields) {
  const o = {};
  let ok = true;
  for (const f of fields) {
    if (f.t === 'cor') { o[f.k] = box.querySelector('[data-cor="'+f.k+'"]').dataset.val; continue; }
    if (f.t === 'stars') { o[f.k] = Number(box.querySelector('[data-stars="'+f.k+'"]').dataset.val) || null; continue; }
    const el = box.querySelector('[name="'+f.k+'"]'); if (!el) continue;
    let v;
    if (f.t === 'chk') v = el.checked;
    else if (f.t === 'num' || f.t === 'range') v = el.value === '' ? null : Number(el.value);
    else if (f.t === 'money') v = el.value === '' ? null : parseValor(el.value);
    else v = el.value.trim ? el.value.trim() : el.value;
    if (f.req && (v === '' || v === null || v === undefined)) { el.classList.add('shake'); el.style.borderColor = 'var(--err)'; setTimeout(()=>{el.classList.remove('shake');el.style.borderColor='';}, 900); ok = false; }
    if (v === '') v = null;
    o[f.k] = v;
  }
  return ok ? o : null;
}
function editModal(o) { // {titulo, fields, vals, onSave, onDelete, extra, salvar}
  modal('<div class="bx-h"><div class="h2">'+esc(o.titulo)+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<form data-sub="em-save">'+formHTML(o.fields, o.vals)+(o.extra||'')
    + '<div class="bx-foot">'
    + (o.onDelete ? '<button type="button" class="btn danger" data-act="em-del">Excluir</button><span class="sp"></span>' : '')
    + '<button type="button" class="btn ghost" data-act="m-close">Cancelar</button>'
    + '<button type="submit" class="btn primary">'+esc(o.salvar||'Salvar')+'</button></div></form>',
    { onMount: ov => {
        ov._fields = o.fields;
        Actions['em-save'] = form => { const vals = lerForm(form, o.fields); if (!vals) return; closeModal(); o.onSave(vals); };
        if (o.onDelete) Actions['em-del'] = () => confirmBox('Excluir mesmo? Você poderá desfazer logo em seguida.', () => { closeModal(); o.onDelete(); }, {perigo:1, sim:'Excluir'});
        if (o.onMount) o.onMount(ov);
      } });
}

/* ---- helpers de área/projeto ---- */
const areaDe = id => byId('areas', id);
const corArea = id => (areaDe(id) || {}).cor || '#9AA0B0';
function areaChipHTML(id) {
  const a = areaDe(id); if (!a) return '';
  return '<span class="areachip" style="background:'+a.cor+'22;color:'+a.cor+'">'+a.icone+' '+esc(a.nome)+'</span>';
}
const optsAreas = (semVazio) => (semVazio ? [] : [{v:'',t:'— sem área —'}]).concat(ordenar(T('areas'), a => a.ordem||0).map(a => ({v:a.id, t:a.icone+' '+a.nome})));
const optsProjetos = () => [{v:'',t:'— caixa de entrada —'}].concat(ordenar(T('projetos').filter(p=>p.status!=='arquivado'), p => p.nome).map(p => ({v:p.id, t:(p.icone||'📁')+' '+p.nome})));
// emoji do projeto na COR da área a que ele pertence (vínculo visual claro)
function projIconeHTML(p) { return p ? '<span style="color:'+corArea(p.area_id)+'">'+(p.icone||'📁')+'</span>' : ''; }
function projLabelHTML(p) { return p ? projIconeHTML(p)+' '+esc(p.nome) : ''; }

async function copiarTexto(t, msg) {
  try { await navigator.clipboard.writeText(t); }
  catch (_) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try{document.execCommand('copy');}catch(__){} ta.remove(); }
  toast(msg || 'Copiado para a área de transferência ✓', { icone:'📋' });
}
act('copiar-sql', () => copiarTexto(sqlSetup(), 'SQL copiado! Cole no SQL Editor do Supabase e clique em Run.'));

/* ---- Dados de exemplo (primeiro acesso) ---- */
/* UUID determinístico a partir de uma string — ids estáveis para os DADOS DE EXEMPLO,
   garantindo que o seed seja idempotente por id (reenvios = atualização, nunca duplicata). */
function detUUID(seed) {
  const s = 'lifeos:' + seed; let x = 0x811c9dc5 >>> 0;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 0x01000193) >>> 0; }
  let hex = '';
  while (hex.length < 32) { x = Math.imul(x ^ (x >>> 15), 0x2c1b3c6d) >>> 0; x = Math.imul(x ^ (x >>> 13), 0x297a2d39) >>> 0; x ^= x >>> 16; hex += ('00000000' + (x >>> 0).toString(16)).slice(-8); }
  hex = hex.slice(0, 32);
  return hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32);
}
function seedData() {
  if (FLAGS.seeded || T('areas').length) return;   // semeia UMA única vez por dispositivo
  FLAGS.seeded = true; saveFlags();
  const aP = dbUpsert('areas', {id:detUUID('area:pessoal'),  nome:'Pessoal',  cor:'#7C5CFC', icone:'🏠', ordem:0});
  const aT = dbUpsert('areas', {id:detUUID('area:trabalho'), nome:'Trabalho', cor:'#5CC8FC', icone:'💼', ordem:1});
  const aS = dbUpsert('areas', {id:detUUID('area:saude'),    nome:'Saúde',    cor:'#3DDC97', icone:'🏃', ordem:2});
  const aM = dbUpsert('areas', {id:detUUID('area:mente'),    nome:'Mente',    cor:'#FFB454', icone:'📚', ordem:3});
  const aF = dbUpsert('areas', {id:detUUID('area:financas'), nome:'Finanças', cor:'#F472B6', icone:'💰', ordem:4});
  dbUpsert('etiquetas', {id:detUUID('etq:urgente'), nome:'urgente', cor:'#FF5C7A'});
  dbUpsert('etiquetas', {id:detUUID('etq:casa'), nome:'casa', cor:'#3DDC97'});
  dbUpsert('etiquetas', {id:detUUID('etq:rapido'), nome:'rápido', cor:'#5CC8FC'});
  dbUpsert('categorias_financeiras', {id:detUUID('cat:salario'), nome:'Salário', tipo:'entrada', cor:'#3DDC97'});
  dbUpsert('categorias_financeiras', {id:detUUID('cat:alimentacao'), nome:'Alimentação', tipo:'saida', cor:'#FFB454', orcamento_mensal:800});
  dbUpsert('categorias_financeiras', {id:detUUID('cat:moradia'), nome:'Moradia', tipo:'saida', cor:'#5CC8FC', orcamento_mensal:1500});
  dbUpsert('categorias_financeiras', {id:detUUID('cat:transporte'), nome:'Transporte', tipo:'saida', cor:'#C084FC', orcamento_mensal:300});
  dbUpsert('categorias_financeiras', {id:detUUID('cat:lazer'), nome:'Lazer', tipo:'saida', cor:'#F472B6', orcamento_mensal:250});
  dbUpsert('categorias_financeiras', {id:detUUID('cat:assinaturas'), nome:'Assinaturas', tipo:'saida', cor:'#FF5C7A', orcamento_mensal:120});
  dbUpsert('contas_financeiras', {id:detUUID('conta:principal'), nome:'Conta principal', tipo:'conta'});
  dbUpsert('contas_financeiras', {id:detUUID('conta:carteira'), nome:'Carteira', tipo:'dinheiro'});
  const proj = dbUpsert('projetos', {id:detUUID('proj:comecar'), area_id:aP.id, nome:'Começar no Life OS', status:'ativo'});
  const sec = dbUpsert('secoes', {id:detUUID('sec:primeiros'), projeto_id:proj.id, nome:'Primeiros passos', ordem:0});
  dbUpsert('tarefas', {titulo:'Explorar a tela Hoje', projeto_id:proj.id, secao_id:sec.id, area_id:aP.id, vencimento:hoje(), prioridade:2, estimativa_min:10, ordem:0});
  dbUpsert('tarefas', {titulo:'Criar meu primeiro hábito', projeto_id:proj.id, secao_id:sec.id, area_id:aP.id, vencimento:hoje(), prioridade:3, estimativa_min:5, ordem:1});
  dbUpsert('tarefas', {titulo:'Fazer um backup (Config → Exportar)', projeto_id:proj.id, secao_id:sec.id, area_id:aP.id, vencimento:addDias(hoje(), 7), prioridade:4, estimativa_min:5, ordem:2});
  dbUpsert('habitos', {nome:'Beber água', icone:'💧', area_id:aS.id, tipo:'quantidade', meta_quantidade:8, unidade:'copos'});
  dbUpsert('habitos', {nome:'Meditar', icone:'🧘', area_id:aM.id, tipo:'diario'});
  dbUpsert('habitos', {nome:'Treinar', icone:'🏋️', area_id:aS.id, tipo:'semanal', freq_semanal:3, fonte_auto:'treino'});
  dbUpsert('habitos', {nome:'Correr', icone:'🏃', area_id:aS.id, tipo:'semanal', freq_semanal:2, fonte_auto:'corrida'});
  dbUpsert('habitos', {nome:'Ler', icone:'📖', area_id:aM.id, tipo:'quantidade', meta_quantidade:10, unidade:'páginas', fonte_auto:'leitura'});
  const plA = dbUpsert('treino_planilhas', {nome:'Treino A — Peito/Tríceps', ordem:0});
  [['Supino reto','Peito',4],['Supino inclinado c/ halteres','Peito',3],['Crucifixo','Peito',3],['Tríceps testa','Tríceps',3],['Tríceps corda','Tríceps',3]]
    .forEach(([n,g,s],i) => dbUpsert('treino_exercicios', {planilha_id:plA.id, nome:n, grupo_muscular:g, series_alvo:s, ordem:i}));
  const plB = dbUpsert('treino_planilhas', {nome:'Treino B — Costas/Bíceps', ordem:1});
  [['Barra fixa','Costas',4],['Remada curvada','Costas',4],['Puxada alta','Costas',3],['Rosca direta','Bíceps',3],['Rosca martelo','Bíceps',3]]
    .forEach(([n,g,s],i) => dbUpsert('treino_exercicios', {planilha_id:plB.id, nome:n, grupo_muscular:g, series_alvo:s, ordem:i}));
  const ano = new Date().getFullYear();
  dbUpsert('metas', {nome:'Ler 12 livros em '+ano, area_id:aM.id, valor_alvo:12, unidade:'livros', vinculo_tipo:'livros', ano});
  dbUpsert('metas', {nome:'Correr 300 km em '+ano, area_id:aS.id, valor_alvo:300, unidade:'km', vinculo_tipo:'corrida_km', ano});
}

/* ---- Onboarding (configuração única — seção 2.2) ---- */
function instrucoesSupabaseHTML() {
  return '<details class="help"><summary>Supabase já está pronto</summary>'
    + '<p class="small muted">A configuração do projeto fica embutida no app. Para sincronizar, basta entrar com Google; não é necessário colar URL, chave pública ou qualquer código.</p>'
    + '<button class="btn small" data-act="copiar-sql">📋 Copiar SQL de criação</button></details>';
}
function showOnboarding() {
  const pg = document.createElement('div');
  pg.className = 'fullpage'; pg.id = 'onboard';
  document.body.appendChild(pg);
  let passo = 0;
  const setPasso = p => { passo = p; draw(); };
  function draw() {
    const dots = '<div class="steps-dots">'+[0,1].map(i => '<i class="'+(i===passo?'on':'')+'"></i>').join('')+'</div>';
    if (passo === 0) {
      pg.innerHTML = '<div class="inner center">'
        + '<div style="font-size:54px">⚡</div><div class="h1" style="font-size:28px">Life OS</div>'
        + '<p class="muted">Tarefas, hábitos, tempo, metas, treino, corrida, leitura, escrita e finanças — tudo em um lugar, com Supabase já configurado.</p>'
        + '<div class="col" style="margin-top:22px">'
        + '<button class="btn primary big" data-ob="start">Começar agora</button>'
        + '<span class="tiny muted">Entre com Google quando quiser sincronizar seus dados entre dispositivos.</span></div>'+dots+'</div>';
    } else {
      pg.innerHTML = '<div class="inner center">'
        + '<div style="font-size:48px">🔒</div><div class="h1">PIN local (opcional)</div>'
        + '<p class="muted small">Um PIN simples pedido ao abrir o app neste dispositivo. Você pode pular.</p>'
        + '<div class="row" style="justify-content:center"><input class="input" id="ob-pin" inputmode="numeric" maxlength="6" placeholder="4–6 dígitos" style="width:170px;text-align:center;font-size:20px;letter-spacing:6px"></div>'
        + '<div class="row" style="margin-top:18px;justify-content:center"><button class="btn ghost" data-ob="pular">Pular</button>'
        + '<button class="btn primary" data-ob="pin">Definir PIN e começar</button></div>'+dots+'</div>';
    }
  }
  pg.addEventListener('click', async e => {
    const b = e.target.closest('[data-ob]'); if (!b) return;
    const acao = b.dataset.ob;
    if (acao === 'start') setPasso(1);
    if (acao === 'pular') finalizar();
    if (acao === 'pin') {
      const p = pg.querySelector('#ob-pin').value.trim();
      if (!/^\d{4,6}$/.test(p)) { toast('PIN deve ter de 4 a 6 dígitos.', {icone:'🔒'}); return; }
      FLAGS.pinHash = await hashPin(p); FLAGS.pinLen = p.length; saveFlags();
      finalizar();
    }
  });
  function finalizar() {
    FLAGS.onboarded = true; saveFlags();
    pg.remove();
    render();
    toast('Bem-vindo ao Life OS! 🎉 Entre com Google para sincronizar.', {ms:5200});
  }
  draw();
}
async function hashPin(p) {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lifeos:'+p));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,'0')).join('');
  } catch (_) { return 'plain:'+p; }
}
async function verificarTabelas() {
  const nomes = Object.keys(TABLES);
  const faltando = [];
  let okCount = 0;
  try { await sb('GET', 'areas?select=id&limit=1'); }
  catch (e) { if (e.tipo !== 'tabela') return { erro: e.msg || String(e), faltando: [], ok: 0 }; }
  const checks = await Promise.all(nomes.map(async t => {
    try { await sb('GET', t + '?select=' + TABLES[t] + '&limit=1'); return { t, ok: true }; }
    catch (e) { return { t, ok: false, tipo: e.tipo }; }
  }));
  for (const c of checks) { if (c.ok) okCount++; else faltando.push(c.t); }
  // banco já tem proteção por usuário (coluna user_id)? se não, precisa rodar o SQL de atualização
  let precisaMigrar = false;
  if (!faltando.includes('areas')) {
    try { await sb('GET', 'areas?select=user_id&limit=1'); }
    catch (e) { if (/user_id|42703|column/i.test(e.det || e.msg || '')) precisaMigrar = true; }
  }
  return { faltando, ok: okCount, precisaMigrar };
}
/* SQL completo: criação + login Google (coluna user_id, adoção dos dados e RLS por usuário).
   Gerado na hora para incluir o id da conta logada — assim os dados antigos viram seus. */
function sqlSetup() {
  const me = usuarioAtual();
  const uid = me && me.id, email = me && me.email;
  let s = SQL_SETUP + '\n\n';
  s += '-- ===== LOGIN GOOGLE: dados por usuário (user_id + Row-Level Security) =====\n';
  s += uid
    ? '-- Dados já existentes serão adotados pela conta ' + (email || uid) + '.\n'
    : '-- ATENÇÃO: gere este script com o login Google já feito no app, para os dados existentes serem adotados pela sua conta.\n';
  for (const t of Object.keys(TABLES)) {
    s += '\nalter table ' + t + ' add column if not exists user_id uuid default auth.uid();';
    if (uid) s += "\nupdate " + t + " set user_id = '" + uid + "' where user_id is null;";
    s += '\ncreate index if not exists ' + t + '_user_idx on ' + t + '(user_id);'
      + '\nalter table ' + t + ' enable row level security;'
      + '\ndrop policy if exists ' + t + '_own on ' + t + ';'
      + '\ncreate policy ' + t + '_own on ' + t + ' for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());\n';
  }
  s += `
-- colunas novas em tabelas já existentes (idempotente)
alter table projetos add column if not exists icone text default '📁';

-- chaves únicas passam a valer por usuário
alter table etiquetas drop constraint if exists etiquetas_nome_key;
create unique index if not exists etiquetas_user_nome on etiquetas(user_id, nome);
alter table dias drop constraint if exists dias_pkey;
create unique index if not exists dias_user_data on dias(user_id, data);
alter table configuracoes drop constraint if exists configuracoes_pkey;
create unique index if not exists configuracoes_user_chave on configuracoes(user_id, chave);
alter table conquistas drop constraint if exists conquistas_pkey;
create unique index if not exists conquistas_user_codigo on conquistas(user_id, codigo);
-- pronto! Volte ao app e toque em "Já rodei — verificar".`;
  return s;
}
function modalMigracao(chk) {
  const u = usuarioAtual();
  const ref = String(CFG.url || '').replace(/^https:\/\//, '').split('.')[0];
  modal('<div class="bx-h"><div class="h2">🔁 Atualize o banco (1 minuto, uma única vez)</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<p class="small muted" style="margin-top:0">Para o login Google funcionar com seus dados protegidos por conta, o banco precisa de um script de atualização. Ele é <b>seguro</b>: não apaga nada e pode rodar mais de uma vez.</p>'
    + (chk.faltando && chk.faltando.length ? '<div class="banner warn tiny">Faltam tabelas: <b>' + esc(chk.faltando.slice(0, 5).join(', ')) + (chk.faltando.length > 5 ? '…' : '') + '</b></div>' : '')
    + (chk.precisaMigrar ? '<div class="banner acc tiny">As tabelas existem, mas ainda não têm a proteção por usuário (coluna user_id + RLS).</div>' : '')
    + (u ? '<p class="small" style="margin:8px 0">O script já <b>adota os seus dados atuais</b> para a conta <b>' + esc(u.email || '') + '</b>.</p>'
         : '<div class="banner warn tiny">Entre com o Google antes de copiar o script, para ele adotar seus dados para a sua conta.</div>')
    + '<ol class="small muted" style="padding-left:18px;line-height:1.8"><li>Toque em <b>Copiar SQL</b> abaixo.</li>'
    + '<li>Abra o <b>SQL Editor</b> do seu projeto Supabase e cole (Ctrl/Cmd+V).</li>'
    + '<li>Clique em <b>Run</b> e volte aqui.</li></ol>'
    + '<div class="bx-foot"><button class="btn" data-act="copiar-sql">📋 Copiar SQL</button>'
    + (ref ? '<a class="btn" target="_blank" rel="noopener" href="https://supabase.com/dashboard/project/' + esc(ref) + '/sql/new">Abrir SQL Editor ↗</a>' : '')
    + '<span class="sp"></span><button class="btn primary" data-act="auth-verificar">Já rodei — verificar</button></div>');
}
act('auth-verificar', async () => {
  closeModal();
  toast('Verificando o banco…', { icone:'🩺' });
  await sincronizarNuvemInicial(false).catch(() => {});
  const chk = await verificarTabelas().catch(() => null);
  if (chk && !chk.faltando.length && !chk.precisaMigrar) toast('Banco atualizado e sincronização ativa ✓', { icone:'✅', ms:5000 });
});

/* ---- Tela de bloqueio (PIN) ---- */
function showLock() {
  if (!FLAGS.pinHash) return;
  let dig = '';
  const pg = document.createElement('div');
  pg.className = 'fullpage'; pg.style.zIndex = 95;
  const draw = () => {
    pg.innerHTML = '<div class="inner center"><div style="font-size:44px">⚡</div><div class="h2" style="margin-top:8px">Digite seu PIN</div>'
      + '<div class="pindots">'+Array.from({length: FLAGS.pinLen||4}, (_,i) => '<i class="'+(i<dig.length?'on':'')+'"></i>').join('')+'</div>'
      + '<div class="pinpad">'+[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(n => n===''?'<span></span>':'<button data-pin="'+n+'">'+n+'</button>').join('')+'</div></div>';
  };
  pg.addEventListener('click', async e => {
    const b = e.target.closest('[data-pin]'); if (!b) return;
    const v = b.dataset.pin;
    if (v === '⌫') dig = dig.slice(0, -1);
    else if (dig.length < (FLAGS.pinLen||6)) dig += v;
    draw();
    if (dig.length === (FLAGS.pinLen||4)) {
      if (await hashPin(dig) === FLAGS.pinHash) pg.remove();
      else { dig = ''; draw(); pg.querySelector('.pindots').classList.add('shake'); }
    }
  });
  draw();
  document.body.appendChild(pg);
}

/* ---- SAÚDE DO SISTEMA (seção 2.1 — obrigatória) ---- */
reg('saude', {
  titulo: 'Saúde do Sistema',
  render: () => '<div class="h1">🩺 Saúde do Sistema</div>'
    + '<p class="muted small">Verifica conexão, tabelas e fila offline. Se algo faltar, a instrução aparece aqui — em português, com 1 clique.</p>'
    + '<div id="saude-out"><div class="card"><div class="empty"><span class="em">⏳</span>Verificando…</div></div></div>'
    + '<div class="row wrap"><button class="btn primary" data-act="saude-run">🔄 Verificar agora</button>'
    + '<button class="btn" data-act="copiar-sql">📋 Copiar SQL de criação</button>'
    + '<button class="btn" data-act="nav" data-r="config">⚙️ Config</button></div>',
  mount: () => rodarSaude()
});
act('saude-run', () => rodarSaude());
async function rodarSaude() {
  const out = $('#saude-out'); if (!out) return;
  const linha = (ok, titulo, det, extra) => '<div class="item" style="cursor:default"><span style="font-size:17px">'+(ok==='ok'?'✅':ok==='warn'?'⚠️':'❌')+'</span>'
    + '<div class="grow"><div class="ttl">'+titulo+'</div><div class="sub">'+det+'</div>'+(extra||'')+'</div></div>';
  let html = '';
  if (!CFG.url || !CFG.key) {
    html += linha('err', 'Supabase não inicializado', 'A configuração embutida do app não foi carregada. Recarregue a página limpando o cache do navegador.');
    html += linha('ok', 'Dados locais', T('tarefas').length + ' tarefas, ' + T('habito_registros').length + ' registros de hábito salvos neste dispositivo.');
    out.innerHTML = '<div class="card pad0"><div class="list">'+html+'</div></div>';
    return;
  }
  if (window.LifeOSAuth && window.LifeOSAuth.state.ready && !usuarioAutenticado()) {
    html += linha('warn', 'Login Google pendente', 'Entre com Google para liberar sincronização e restaurar sua sessão Supabase.');
  }
  html += linha(navigator.onLine ? 'ok' : 'warn', 'Internet', navigator.onLine ? 'Conectado.' : 'Offline — registros ficam na fila e sincronizam quando voltar.');
  out.innerHTML = '<div class="card pad0"><div class="list">'+html+linha('warn','Conexão com o Supabase','Verificando…')+'</div></div>';
  let conexaoOk = false;
  try {
    await sb('GET', 'areas?select=id&limit=1');
    conexaoOk = true;
    html += linha('ok', 'Conexão com o Supabase', 'Projeto respondendo normalmente. URL: ' + esc(CFG.url.replace(/^https:\/\//,'').slice(0, 30)) + '…');
  } catch (e) {
    if (e.tipo === 'tabela') { conexaoOk = true; html += linha('ok', 'Conexão com o Supabase', 'Projeto responde, mas faltam tabelas (veja abaixo).'); }
    else if (e.tipo === 'auth') html += linha('warn', 'Login Google necessário', esc(e.msg), '<div class="row" style="margin-top:8px"><button class="btn small primary" id="saude-login-google" data-act="login-google">Entrar com Google</button></div>');
    else html += linha('err', 'Projeto não responde — possivelmente PAUSADO por inatividade',
      'O plano gratuito pausa após 7 dias sem uso. <b>Seus dados estão preservados.</b> Restaurar leva 1 clique:',
      '<ol class="small muted" style="padding-left:18px;margin:6px 0"><li>Abra <a href="https://supabase.com/dashboard" target="_blank" rel="noopener">supabase.com/dashboard</a></li><li>Entre no seu projeto</li><li>Clique em <b>Restore project</b> e aguarde ~2 min</li></ol>'
      + '<button class="btn small primary" data-act="saude-run">Verificar de novo</button>');
  }
  if (conexaoOk) {
    const r = await verificarTabelas();
    if (r.faltando.length) {
      html += linha('err', 'Faltam ' + r.faltando.length + ' tabelas no banco', '<b>' + r.faltando.join(', ') + '</b>',
        '<div class="small muted" style="margin:6px 0">Abra o <b>SQL Editor</b> no painel do Supabase, cole o script (botão abaixo) e clique em <b>Run</b>. O script é seguro: não apaga nada e pode rodar várias vezes.</div>'
        + '<div class="row"><button class="btn small" data-act="copiar-sql">📋 Copiar SQL</button><button class="btn small primary" data-act="saude-run">Verificar de novo</button></div>');
    } else {
      html += linha('ok', 'Tabelas', 'Todas as ' + r.ok + ' tabelas do modelo de dados existem.');
    }
    if (r.precisaMigrar) {
      html += linha('err', 'Banco precisa do script de atualização (login Google)', 'As tabelas ainda não têm a proteção por usuário (user_id + RLS). Rode o SQL uma vez — ele adota seus dados atuais para a sua conta.',
        '<div class="row" style="margin-top:8px"><button class="btn small" data-act="copiar-sql">📋 Copiar SQL</button><button class="btn small primary" data-act="saude-run">Verificar de novo</button></div>');
    } else if (!r.faltando.length && usuarioAtual()) {
      html += linha('ok', 'Proteção por usuário (RLS)', 'Cada registro é gravado e lido apenas pela sua conta (' + esc(usuarioAtual().email||'') + ').');
    }
  }
  if (S.syncPausado) {
    html += linha('err', 'Sincronização pausada', 'Tentei algumas vezes sem sucesso e parei para não ficar reenviando em loop. ' + (S.syncErr ? 'Motivo: ' + esc(S.syncErr) : '') ,
      '<div class="row" style="margin-top:8px"><button class="btn small primary" data-act="sync-tentar">Tentar de novo agora</button></div>');
  }
  const fila = S.queue.length;
  html += linha(fila ? 'warn' : 'ok', 'Fila offline', fila
    ? fila + ' alterações aguardando envio.' + (S.syncErr && !S.syncPausado ? ' Último erro: ' + esc(S.syncErr) : '')
    : 'Nada pendente. Última sincronização: ' + (FLAGS.lastSync ? fmtData(FLAGS.lastSync.slice(0,10)) + ' ' + FLAGS.lastSync.slice(11,16) : '—'),
    fila && !S.syncPausado ? '<div class="row" style="margin-top:8px"><button class="btn small primary" data-act="sync-agora">Enviar agora</button></div>' : '');
  if (S.deadQueue.length) {
    const itens = S.deadQueue.map((d, i) => {
      const qtd = d.op === 'up' ? (d.rows ? d.rows.length : 1) + ' registro(s)' : 'exclusão';
      let pl = ''; try { pl = d.payload ? JSON.stringify(d.payload) : ''; } catch (_) {}
      const tip = (d.op + ' em ' + d.t + (pl ? ' — payload: ' + pl : '')).slice(0, 600);
      return '<div class="row wrap" style="gap:6px;padding:6px 0;border-top:1px solid var(--bd2)" title="' + esc(tip) + '">'
        + '<div class="grow"><b>' + esc(rotuloTabela(d.t)) + '</b> — ' + esc(qtd) + '<div class="small muted">' + esc(d.motivo || 'recusado pelo banco') + '</div></div>'
        + '<button class="btn small" data-act="dead-requeue" data-i="' + i + '">Reenviar</button>'
        + '<button class="btn small" data-act="dead-descartar" data-i="' + i + '">Descartar</button></div>';
    }).join('');
    html += linha('err', S.deadQueue.length + ' registro(s) não salvos na nuvem',
      'O banco recusou estes itens (ex.: vínculo inválido). Eles seguem guardados localmente. Reenvie depois de corrigir, ou descarte:',
      itens + '<div class="row" style="margin-top:8px"><button class="btn small" data-act="dead-requeue-todos">Reenviar todos</button><button class="btn small" data-act="dead-descartar-todos">Descartar todos</button></div>');
  }
  const ue = FLAGS.ultimoExport;
  const dias = ue ? diffDias(ue.slice(0,10), hoje()) : null;
  html += linha(!ue || dias > 30 ? 'warn' : 'ok', 'Backup', ue ? 'Último export: ' + fmtData(ue.slice(0,10)) + (dias > 30 ? ' — recomendado exportar 1×/mês.' : '.') : 'Nenhum backup ainda — exporte 1×/mês em Config → Dados.');
  out.innerHTML = '<div class="card pad0"><div class="list">'+html+'</div></div>';
}
act('login-google', () => { if (window.LifeOSAuth) window.LifeOSAuth.loginGoogle(); });
act('sync-agora', async () => {
  await sincronizarNuvemInicial(false);
  if (!usuarioAutenticado()) toast('Entre com Google para sincronizar.', {icone:'🔐'});
  else if (!S.queue.length) toast('Tudo sincronizado ✓', {icone:'✅'});
  else toast(S.syncErr || 'Ainda há pendências.', {icone:'⚠️'});
  rodarSaude();
});
act('sync-tentar', async () => {       // retomar após pausa do backoff
  S.syncPausado = false; S.retry = 0; S.syncErr = null;
  await sincronizarNuvemInicial(false);
  if (S.syncPausado) toast(S.syncErr || 'Ainda não consegui sincronizar.', {icone:'⚠️'});
  else if (!S.queue.length && !S.deadQueue.length) toast('Tudo sincronizado ✓', {icone:'✅'});
  rodarSaude();
});
function reenfileirarMorto(d) {        // devolve um item da quarentena para a fila
  if (d.op === 'up' && d.rows) enqueue('up', d.t, d.rows);
  else if (d.op === 'del') enqueue('del', d.t, d.id);
}
act('dead-descartar', el => { const i = +el.dataset.i; S.deadQueue.splice(i, 1); saveDead(); atualizarSyncUI(); rodarSaude(); toast('Item descartado.', {icone:'🗑️'}); });
act('dead-descartar-todos', () => confirmBox('Descartar todos os ' + S.deadQueue.length + ' registros recusados? Eles serão removidos da fila e não voltarão.', () => {
  S.deadQueue = []; saveDead(); atualizarSyncUI(); rodarSaude(); toast('Fila de erros limpa.', {icone:'🗑️'}); }, {perigo:1, sim:'Descartar'}));
act('dead-requeue', async el => { const i = +el.dataset.i; const [d] = S.deadQueue.splice(i, 1); saveDead(); if (d) reenfileirarMorto(d); await flush(true); rodarSaude(); });
act('dead-requeue-todos', async () => { const itens = S.deadQueue.slice(); S.deadQueue = []; saveDead(); itens.forEach(reenfileirarMorto); await flush(true); rodarSaude();
  toast(S.deadQueue.length ? 'Alguns ainda foram recusados — veja os detalhes.' : 'Reenviados ✓', {icone: S.deadQueue.length ? '⚠️' : '✅'}); });

/* ---- CONFIG ---- */
reg('config', {
  titulo: 'Config',
  render: () => {
    const st = syncStatus();
    const stTxt = {ok:'<span class="ok">● Sincronizado</span>', pend:'<span class="warn">● Sincronizando ('+S.queue.length+' pendentes)</span>', err:'<span class="err">● '+S.deadQueue.length+' item(ns) recusado(s) — ver Saúde</span>', pausado:'<span class="err">● Sincronização pausada — ver Saúde</span>', auth:'<span class="warn">● Aguardando login Google</span>', off:'<span class="muted">● Supabase indisponível</span>'}[st];
    const u = usuarioAtual();
    const appUrl = (() => { const x = new URL('.', location.href); x.hash=''; x.search=''; return x.href; })();
    const contaCard = '<div class="card"><div class="card-h"><div class="h2">👤 Conta (login Google)</div></div>'
      + (u
        ? '<div class="row" style="margin-bottom:10px">'
          + (u.avatar ? '<img class="avatar" src="'+esc(u.avatar)+'" alt="" referrerpolicy="no-referrer">' : '<span class="avatar" style="display:inline-flex;align-items:center;justify-content:center">👤</span>')
          + '<div class="grow"><div style="font-weight:700">'+esc(u.nome || 'Conectado')+'</div><div class="small muted">'+esc(u.email||'')+'</div></div>'
          + '<button class="btn small" data-act="auth-logout">Sair</button></div>'
          + '<p class="tiny muted" style="margin:0">Seus dados são gravados na sua conta e protegidos por usuário (RLS). Cada alteração é salva no banco automaticamente.</p>'
        : '<p class="small muted" style="margin:0 0 10px">Entre com o Google para sincronizar com a nuvem. Sem login, o app continua funcionando neste dispositivo e guarda tudo numa fila.</p>'
          + '<div class="row"><button class="gbtn" data-act="auth-login">'+G_ICON+' Entrar com Google</button></div>')
      + '<details class="help" style="margin-top:10px"><summary>Login não funciona? Confira as URLs no Supabase</summary>'
        + '<p class="small muted">No painel do Supabase, em <b>Authentication → URL Configuration</b>:</p>'
        + '<ul class="small muted" style="padding-left:18px;line-height:1.8">'
        + '<li><b>Site URL</b>: <code>'+esc(appUrl)+'</code> <button class="btn small ghost" data-act="auth-copy-url">copiar</button></li>'
        + '<li><b>Redirect URLs</b>: adicione <code>'+esc(appUrl)+'</code> (e <code>'+esc(appUrl)+'*</code>)</li></ul>'
        + '<p class="small muted">E em <b>Authentication → Providers → Google</b>, o provedor precisa estar ativado.</p></details>'
      + '</div>';
    return '<div class="h1">⚙️ Config</div>'
    + contaCard
    + '<div class="card"><div class="card-h"><div class="h2">☁️ Supabase (sincronização)</div></div>'
      + '<p class="small" style="margin:0 0 10px">'+stTxt+(FLAGS.lastSync?' <span class="muted">· último envio '+esc(FLAGS.lastSync.slice(11,16))+'</span>':'')+'</p>'
      + '<p class="small muted" style="margin:0 0 10px">Projeto Supabase já configurado: <b>'+esc((CFG.url||'').replace(/^https:\/\//,'').split('.')[0]||'Life OS')+'</b>. Não é necessário colar URL nem chave pública.</p>'
      + '<div class="row wrap">'
      + '<button class="btn primary" data-act="nav" data-r="saude">🩺 Saúde do Sistema</button>'
      + (CFG.url ? '<button class="btn" data-act="cfg-pull">⬇️ Recarregar da nuvem</button><button class="btn" data-act="sync-agora">⬆️ Sincronizar agora</button><button class="btn" data-act="cfg-rebuild">🛠️ Reconstruir do banco</button>' : '')
      + '<button class="btn ghost" data-act="copiar-sql">📋 Copiar SQL</button></div></div>'
    + '<div class="card"><div class="card-h"><div class="h2">🎛️ Preferências</div></div><div id="cfg-prefs">'
      + formHTML(prefsFields(), prefsVals()) + '</div>'
      + '<button class="btn primary" data-act="cfg-prefs-save">Salvar preferências</button></div>'
    + '<div class="card"><div class="card-h"><div class="h2">🗂️ Áreas da vida</div><button class="btn small" data-act="area-add">+ Área</button></div>'
      + '<div class="row wrap">' + ordenar(T('areas'), a => a.ordem||0).map(a =>
        '<span class="chip" data-act="area-edit" data-id="'+a.id+'" style="border-color:'+a.cor+'55"><span class="dot" style="background:'+a.cor+'"></span>'+a.icone+' '+esc(a.nome)+'</span>').join('')
      + (T('areas').length ? '' : '<span class="muted small">Nenhuma área ainda.</span>') + '</div></div>'
    + '<div class="card"><div class="card-h"><div class="h2">🏷️ Etiquetas</div><button class="btn small" data-act="etq-add">+ Etiqueta</button></div>'
      + '<div class="row wrap">' + ordenar(T('etiquetas'), e2 => e2.nome).map(e2 =>
        '<span class="chip" data-act="etq-edit" data-id="'+e2.id+'" style="border-color:'+(e2.cor||'#9AA0B0')+'66;color:'+(e2.cor||'var(--txt)')+'">@'+esc(e2.nome)+'</span>').join('')
      + (T('etiquetas').length ? '' : '<span class="muted small">Nenhuma etiqueta.</span>') + '</div></div>'
    + '<div class="card"><div class="card-h"><div class="h2">🔒 Segurança</div></div>'
      + '<p class="small muted" style="margin:0 0 10px">'+(FLAGS.pinHash ? 'PIN ativo neste dispositivo.' : 'Sem PIN. O PIN vale só neste dispositivo.')+'</p>'
      + '<div class="row wrap"><button class="btn" data-act="pin-set">'+(FLAGS.pinHash?'Trocar PIN':'Definir PIN')+'</button>'
      + (FLAGS.pinHash ? '<button class="btn danger" data-act="pin-rm">Remover PIN</button>' : '') + '</div></div>'
    + '<div class="card"><div class="card-h"><div class="h2">💾 Dados e backup</div></div>'
      + '<p class="small muted" style="margin:0 0 10px">Backup recomendado: 1×/mês. Último: <b>'+(FLAGS.ultimoExport ? fmtData(FLAGS.ultimoExport.slice(0,10)) : 'nunca')+'</b></p>'
      + '<div class="row wrap"><button class="btn primary" data-act="exportar">⬇️ Exportar JSON</button>'
      + '<button class="btn" data-act="importar">⬆️ Importar JSON</button>'
      + '<button class="btn danger" data-act="apagar-local">🗑️ Apagar dados locais</button></div></div>'
    + feedbackCardHTML()
    + '<div class="card"><div class="h3">Sobre</div><p class="small muted" style="margin:0">Life OS Pessoal v4.2 (login Google + dados por usuário) · estrutura modular · custo R$ 0,00 · seus dados, suas regras.</p></div>';
  }
});
function prefsFields() {
  return [
    {k:'nome', l:'Seu nome (para a saudação)', ph:'ex.: Rafael'},
    {k:'janela_util', t:'num', l:'Janela útil do dia (horas) — barra de capacidade', meia:1, def:8},
    {k:'reps_padrao', t:'num', l:'Repetições por série (estimar 1RM)', meia:1, def:10},
    {k:'pomo_foco', t:'num', l:'Pomodoro: foco (min)', meia:1, def:25},
    {k:'pomo_pausa', t:'num', l:'Pomodoro: pausa (min)', meia:1, def:5},
    {k:'editor_serif', t:'chk', l:'Editor com fonte serifada', def:false}
  ];
}
function prefsVals() {
  return { nome:getCfg('nome',''), janela_util:getCfg('janela_util',8), reps_padrao:getCfg('reps_padrao',10),
    pomo_foco:getCfg('pomo_foco',25), pomo_pausa:getCfg('pomo_pausa',5), editor_serif:getCfg('editor_serif',false) };
}
act('cfg-prefs-save', () => {
  const v = lerForm($('#cfg-prefs'), prefsFields()); if (!v) return;
  setCfg('nome', v.nome||''); setCfg('janela_util', v.janela_util||8); setCfg('reps_padrao', v.reps_padrao||10);
  setCfg('pomo_foco', v.pomo_foco||25); setCfg('pomo_pausa', v.pomo_pausa||5); setCfg('editor_serif', !!v.editor_serif);
  toast('Preferências salvas ✓', {icone:'✅'});
});
act('cfg-conectar', () => {
  closeModal();
  modal('<div class="bx-h"><div class="h2">☁️ Supabase já configurado</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="banner ok">As credenciais públicas do projeto já estão embutidas no app. Você não precisa informar nenhum código.</div>'
    + '<p class="small muted">Para acessar seus dados, use o botão <b>Entrar com Google</b>. A sincronização começa automaticamente após a sessão ser restaurada.</p>'
    + '<div class="bx-foot"><button class="btn primary" data-act="m-close">Entendi</button></div>');
});
act('cfg-pull', () => confirmBox('Recarregar tudo da nuvem? Alterações locais já sincronizadas são mantidas; pendências na fila são preservadas.', async () => {
  if (!usuarioAutenticado()) { toast('Entre com Google para recarregar da nuvem.', {icone:'🔐'}); return; }
  try { const ok = await pullAll(); if (ok) render(); else toast('Há pendências na fila — envie antes (Saúde do Sistema).', {icone:'⚠️'}); }
  catch (e) { toast(e.msg || String(e), {icone:'❌'}); }
}));
act('cfg-rebuild', () => confirmBox('Reconstruir do banco? Isto APAGA o estado local deste dispositivo (fila + cache) e relê tudo da sua conta no Supabase, consolidando duplicatas. Use quando algo ficar inconsistente. Seus dados na nuvem são preservados.', async () => {
  try {
    const limpos = await reconstruirDoBanco();
    toast(limpos ? ('Reconstruído ✓ ' + limpos + ' duplicata(s) consolidada(s).') : 'Reconstruído do banco ✓', {icone:'🛠️', ms:5000});
  } catch (e) { toast('Falha ao reconstruir: ' + (e.msg || String(e)), {icone:'❌'}); }
}, {sim:'Reconstruir'}));

/* ============ BUGS E SUGESTÕES (coleta + export CSV) ============ */
const FEEDBACK_STATUS = { aberto:{l:'aberto', c:'var(--warn)'}, implementado:{l:'implementado', c:'var(--ok)'}, descartado:{l:'descartado', c:'var(--txt2)'} };
act('feedback-open', () => editModal({
  titulo:'🐛 Bug ou sugestão',
  salvar:'Registrar',
  fields:[
    {k:'titulo', l:'Título', req:1, foco:1, ph:'Resumo curto'},
    {k:'problema', t:'ta', l:'(i) Qual é o problema?', rows:3, ph:'O que está errado, confuso ou faltando'},
    {k:'solucao', t:'ta', l:'(ii) Qual solução você sugere?', rows:3, ph:'Como deveria funcionar'}
  ],
  onSave: v => { dbUpsert('feedback', { titulo:v.titulo, problema:v.problema||'', solucao:v.solucao||'', status:'aberto' });
    toast('Registrado ✓ Obrigado!', {icone:'🐛'}); render(); }
}));
function feedbackCardHTML() {
  const itens = ordenar(T('feedback'), f => f.criado_em || '', true);
  const linha = f => {
    const st = FEEDBACK_STATUS[f.status] || FEEDBACK_STATUS.aberto;
    return '<div class="item" style="align-items:flex-start">'
      + '<div class="grow"><div class="ttl">'+esc(f.titulo)+' <span class="tag" style="background:'+st.c+'22;color:'+st.c+'">'+st.l+'</span></div>'
      + (f.problema ? '<div class="sub"><b>Problema:</b> '+esc(f.problema)+'</div>' : '')
      + (f.solucao ? '<div class="sub"><b>Sugestão:</b> '+esc(f.solucao)+'</div>' : '')
      + '<div class="row wrap" style="margin-top:6px">'
      + '<button class="btn small" data-act="feedback-status" data-id="'+f.id+'" data-s="'+(f.status==='implementado'?'aberto':'implementado')+'">'+(f.status==='implementado'?'↩︎ Reabrir':'✅ Implementado')+'</button>'
      + '<button class="btn small" data-act="feedback-status" data-id="'+f.id+'" data-s="descartado">🗂️ Descartar</button>'
      + '<button class="btn small danger" data-act="feedback-del" data-id="'+f.id+'">🗑️ Excluir</button>'
      + '</div></div></div>';
  };
  return '<div class="card"><div class="card-h"><div class="h2">🐛 Bugs e sugestões</div>'
    + (itens.length ? '<button class="btn small" data-act="feedback-export">⬇️ Exportar CSV</button>' : '') + '</div>'
    + '<p class="small muted" style="margin:0 0 10px">Use o botão 🐛 flutuante para registrar. Marque <b>Implementado</b> conforme resolver e exporte em CSV para colar numa IA.</p>'
    + (itens.length ? '<div class="list">'+itens.map(linha).join('')+'</div>'
        : '<div class="empty"><span class="em">🐛</span>Nenhum registro ainda.</div>') + '</div>';
}
act('feedback-status', el => { dbPatch('feedback', el.dataset.id, { status: el.dataset.s }); render(); });
act('feedback-del', el => confirmBox('Excluir este registro de bug/sugestão?', () => { dbDelete('feedback', el.dataset.id); render(); toast('Removido.', {icone:'🗑️'}); }, {perigo:1, sim:'Excluir'}));
act('feedback-export', () => {
  const itens = ordenar(T('feedback'), f => f.criado_em || '', true);
  if (!itens.length) { toast('Nada para exportar.', {icone:'📭'}); return; }
  const cel = s => '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"';
  const cols = [['titulo','Título'],['problema','Problema'],['solucao','Sugestão'],['status','Status'],['criado_em','Criado em']];
  const csv = '﻿' + cols.map(c => cel(c[1])).join(';') + '\r\n'
    + itens.map(f => cols.map(c => cel(c[0] === 'criado_em' ? String(f.criado_em||'').slice(0,16).replace('T',' ') : f[c[0]])).join(';')).join('\r\n');
  const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'lifeos-bugs-sugestoes-' + hoje() + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  toast('CSV exportado ✓', {icone:'📄'});
});
act('pin-set', () => {
  modal('<div class="bx-h"><div class="h2">Definir PIN</div></div>'
    + '<div class="field"><label>PIN (4–6 dígitos)</label><input class="input" id="pin-novo" inputmode="numeric" maxlength="6" autofocus style="text-align:center;font-size:20px;letter-spacing:6px"></div>'
    + '<div class="bx-foot"><button class="btn ghost" data-act="m-close">Cancelar</button><button class="btn primary" data-act="pin-save">Salvar</button></div>');
});
act('pin-save', async () => {
  const p = $('#pin-novo').value.trim();
  if (!/^\d{4,6}$/.test(p)) { toast('PIN deve ter de 4 a 6 dígitos.', {icone:'🔒'}); return; }
  FLAGS.pinHash = await hashPin(p); FLAGS.pinLen = p.length; saveFlags();
  closeModal(); render(); toast('PIN definido ✓', {icone:'🔒'});
});
act('pin-rm', () => confirmBox('Remover o PIN deste dispositivo?', () => { delete FLAGS.pinHash; delete FLAGS.pinLen; saveFlags(); render(); toast('PIN removido.', {icone:'🔓'}); }));

/* áreas / etiquetas CRUD */
const areaFields = [
  {k:'nome', l:'Nome', req:1, foco:1},
  {k:'icone', l:'Ícone (emoji)', meia:1, def:'📌'},
  {k:'ordem', t:'num', l:'Ordem', meia:1, def:0},
  {k:'cor', t:'cor', l:'Cor'}
];
act('area-add', () => editModal({ titulo:'Nova área', fields:areaFields, onSave: v => { dbUpsert('areas', v); render(); } }));
act('area-edit', el => {
  const a = byId('areas', el.dataset.id);
  editModal({ titulo:'Editar área', fields:areaFields, vals:a,
    onSave: v => { dbPatch('areas', a.id, v); render(); },
    onDelete: () => { const bkp = {...a}; dbDelete('areas', a.id); render();
      toast('Área excluída.', { undo: () => { dbUpsert('areas', bkp); render(); } }); } });
});
const etqFields = [ {k:'nome', l:'Nome (sem espaços)', req:1, foco:1}, {k:'cor', t:'cor', l:'Cor'} ];
act('etq-add', () => editModal({ titulo:'Nova etiqueta', fields:etqFields, onSave: v => { v.nome = v.nome.replace(/\s+/g,'-').toLowerCase(); dbUpsert('etiquetas', v); render(); } }));
act('etq-edit', el => {
  const t = byId('etiquetas', el.dataset.id);
  editModal({ titulo:'Editar etiqueta', fields:etqFields, vals:t,
    onSave: v => { v.nome = v.nome.replace(/\s+/g,'-').toLowerCase(); dbPatch('etiquetas', t.id, v); render(); },
    onDelete: () => { const bkp = {...t}; dbDelete('etiquetas', t.id); render();
      toast('Etiqueta excluída.', { undo: () => { dbUpsert('etiquetas', bkp); render(); } }); } });
});

/* export / import / apagar */
act('exportar', () => {
  const blob = new Blob([JSON.stringify({ app:'lifeos', versao:'4.1', exportado_em: nowISO(), dados: S.data }, null, 1)], { type:'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lifeos-backup-' + hoje() + '.json';
  a.click(); URL.revokeObjectURL(a.href);
  FLAGS.ultimoExport = nowISO(); saveFlags();
  toast('Backup exportado ✓', {icone:'💾'});
});
act('importar', () => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => {
    const f = inp.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result);
        if (!j || !j.dados) throw new Error('formato');
        confirmBox('Importar backup de <b>'+esc((j.exportado_em||'').slice(0,10))+'</b>? Os dados atuais deste dispositivo serão <b>substituídos</b>'+(CFG.url?' e enviados ao Supabase':'')+'.',
          async () => {
            for (const t of Object.keys(TABLES)) S.data[t] = Array.isArray(j.dados[t]) ? j.dados[t] : [];
            saveLocal();
            if (CFG.url) { await fullPush(); }
            render(); toast('Backup importado ✓', {icone:'✅'});
          }, {perigo:1, sim:'Importar'});
      } catch (_) { toast('Arquivo inválido — esperado um backup do Life OS.', {icone:'❌'}); }
    };
    rd.readAsText(f);
  };
  inp.click();
});
act('apagar-local', () => confirmBox('Apagar TODOS os dados locais deste dispositivo? '+(CFG.url?'Os dados na nuvem (Supabase) permanecem — você pode recarregá-los depois.':'<b>Sem Supabase conectado, isso apaga tudo de verdade.</b>'),
  () => { localStorage.removeItem(LSK.data); localStorage.removeItem(LSK.queue); localStorage.removeItem(LSK.flags); location.reload(); }, {perigo:1, sim:'Apagar tudo'}));

/* ---- boot da etapa 2 ---- */
loadLocal();
BootHooks.push(() => {
  showLock();
  if (!FLAGS.onboarded) {
    FLAGS.onboarded = true;
    saveFlags();
  }
  sincronizarNuvemInicial(true).catch(e => { S.syncErr = e.msg || String(e); atualizarSyncUI(); });
  setInterval(() => sincronizarNuvemInicial(true).catch(() => {}), 45000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (!S.lastPull || Date.now() - new Date(S.lastPull).getTime() > 10*60*1000)) {
      sincronizarNuvemInicial(true).catch(() => {});
    }
  });
});
/* ════════════════ ETAPA 3 — TAREFAS (Todoist completo) ════════════════ */
function addCSS(css) { const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }
addCSS('.tar-grid{display:grid;grid-template-columns:235px 1fr;gap:18px;align-items:start}'
 + '@media(max-width:899px){.tar-grid{grid-template-columns:1fr}.tar-aside{display:none}}'
 + '.tar-aside .navit{padding:7px 10px;font-size:13.5px}'
 + '.tar-vistas{display:none}@media(max-width:899px){.tar-vistas{display:flex;gap:7px;overflow-x:auto;padding:2px 0 10px;-webkit-overflow-scrolling:touch}}'
 + '.sec-head{display:flex;align-items:center;gap:8px;padding:10px 4px 4px;font-weight:700;font-size:13px;color:var(--txt2)}'
 + '.day-head{font-weight:700;font-size:13px;color:var(--txt2);padding:12px 4px 2px;text-transform:capitalize}');

/* ---- Parser de linguagem natural pt-BR (regra 19) ---- */
const DOW_NOMES = { domingo:0, segunda:1, terca:2, 'terça':2, quarta:3, quinta:4, sexta:5, sabado:6, 'sábado':6 };
function proxDow(dow, aPartir) { // inclui o próprio dia
  let d = aPartir || hoje();
  for (let i = 0; i < 8; i++) { if (pDate(d).getDay() === dow) return d; d = addDias(d, 1); }
  return d;
}
function parseNL(txt) {
  let s = ' ' + String(txt || '') + ' ';
  const toks = [];
  const eat = (re, fn) => { const m = s.match(re); if (m) { s = s.replace(re, ' '); fn(m); } return !!m; };
  const out = { titulo:'', vencimento:null, hora:null, recorrencia:null, prioridade:4, projeto_id:null, projetoDesconhecido:null, estimativa_min:null, etiquetas:[], etiquetasNovas:[], tokens:toks };
  // #projeto — só VINCULA a projeto existente (criar projeto é só pelo formulário, com área obrigatória)
  eat(/#([\p{L}\d_-]+)/u, m => {
    const nome = m[1];
    const p = T('projetos').find(x => norm(x.nome).startsWith(norm(nome)));
    if (p) { out.projeto_id = p.id; toks.push({tipo:'proj', label:'# '+(p.icone||'📁')+' '+p.nome, raw:m[0]}); }
    else { out.projetoDesconhecido = nome; toks.push({tipo:'proj', label:'# '+nome+' — criar?', raw:m[0]}); }
  });
  // @etiquetas (várias)
  for (let g = 0; g < 5; g++) {
    if (!eat(/@([\p{L}\d_-]+)/u, m => {
      const nome = m[1].toLowerCase();
      const e = T('etiquetas').find(x => norm(x.nome) === norm(nome));
      if (e) { out.etiquetas.push(e.nome); toks.push({tipo:'tag', label:'@ '+e.nome, raw:m[0]}); }
      else { out.etiquetasNovas.push(nome); out.etiquetas.push(nome); toks.push({tipo:'tag', label:'@ '+nome+' (nova)', raw:m[0]}); }
    })) break;
  }
  // prioridade
  eat(/\bp([1-4])\b/i, m => { out.prioridade = Number(m[1]); toks.push({tipo:'pri', label:'P'+m[1], raw:m[0]}); });
  // duração estimada (QUANTO TEMPO leva): d5, d15, d30, d60, d90… (minutos) — distinto de 9h/14h (QUANDO ocorre)
  eat(/\bd(\d{1,3})\b/i, m => { out.estimativa_min = Number(m[1]); toks.push({tipo:'dur', label:'⏳ '+fmtMin(Number(m[1])), raw:m[0]}); });
  // recorrências (antes das datas)
  const dowAlt = '(?:segunda|ter[cç]a|quarta|quinta|sexta|s[áa]bado|domingo)(?:-feira)?';
  eat(/\btodo dia (\d{1,2})\b/i, m => { out.recorrencia = {tipo:'mensal', dia:Number(m[1])}; toks.push({tipo:'rec', label:'🔁 todo dia '+m[1], raw:m[0]}); });
  if (!out.recorrencia) eat(/\ba cada (\d{1,3}) dias?\b/i, m => { out.recorrencia = {tipo:'intervalo', intervalo:Number(m[1])}; toks.push({tipo:'rec', label:'🔁 a cada '+m[1]+' dias', raw:m[0]}); });
  if (!out.recorrencia) eat(/\b(todo dia|todos os dias|diariamente)\b/i, () => { out.recorrencia = {tipo:'diaria'}; toks.push({tipo:'rec', label:'🔁 todo dia', raw:''}); });
  if (!out.recorrencia) eat(new RegExp('\\btodas?\\s+(?:as\\s+)?((?:'+dowAlt+'(?:\\s*(?:,|e)\\s*)?)+)','iu'), m => recSemanal(m));
  if (!out.recorrencia) eat(new RegExp('\\btodos?\\s+(?:os\\s+)?((?:'+dowAlt+'(?:\\s*(?:,|e)\\s*)?)+)','iu'), m => recSemanal(m));
  function recSemanal(m) {
    const dias = [...m[1].matchAll(new RegExp(dowAlt,'giu'))].map(x => DOW_NOMES[norm(x[0]).replace('-feira','')]).filter(d => d !== undefined);
    if (dias.length) { out.recorrencia = {tipo:'semanal', dias:[...new Set(dias)].sort()}; toks.push({tipo:'rec', label:'🔁 '+dias.map(d => DIAS_SEM[d]).join(', '), raw:m[0]}); }
  }
  if (!out.recorrencia) eat(/\b(todo m[eê]s|mensalmente)\b/i, () => { out.recorrencia = {tipo:'mensal'}; toks.push({tipo:'rec', label:'🔁 todo mês', raw:''}); });
  if (!out.recorrencia) eat(/\b(toda semana|semanalmente)\b/i, () => { out.recorrencia = {tipo:'semanal'}; toks.push({tipo:'rec', label:'🔁 toda semana', raw:''}); });
  // datas
  const setData = (iso, label, raw) => { out.vencimento = iso; toks.push({tipo:'data', label:'📅 '+label, raw}); };
  eat(/\bdepois de amanh[ãa]\b/i, m => setData(addDias(hoje(),2), 'depois de amanhã', m[0])) ||
  eat(/\bamanh[ãa]\b/i, m => setData(addDias(hoje(),1), 'amanhã', m[0])) ||
  eat(/\bhoje\b/i, m => setData(hoje(), 'hoje', m[0])) ||
  eat(/\bpr[óo]xima semana\b/i, m => setData(addDias(inicioSemana(hoje()),7), 'próx. semana', m[0])) ||
  eat(/\bem (\d{1,3}) dias?\b/i, m => setData(addDias(hoje(), Number(m[1])), 'em '+m[1]+' dias', m[0])) ||
  eat(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, m => {
    let y = m[3] ? (m[3].length === 2 ? 2000+Number(m[3]) : Number(m[3])) : new Date().getFullYear();
    let iso = y + '-' + pad2(m[2]) + '-' + pad2(m[1]);
    if (!m[3] && iso < hoje()) iso = (y+1) + iso.slice(4);
    setData(iso, fmtDataCurta(iso) + (m[3]?'/'+y:''), m[0]);
  }) ||
  eat(/\bdia (\d{1,2})\b/i, m => {
    const dia = Number(m[1]); const d = new Date(); let iso = d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(dia);
    if (iso < hoje()) { const d2 = new Date(d.getFullYear(), d.getMonth()+1, dia); iso = dISO(d2); }
    setData(iso, 'dia '+dia, m[0]);
  }) ||
  eat(new RegExp('\\b(?:pr[óo]xima\\s+)?('+dowAlt+')\\b','iu'), m => {
    const dow = DOW_NOMES[norm(m[1]).replace('-feira','')];
    if (dow !== undefined) setData(proxDow(dow), DIAS_SEM_FULL[dow], m[0]);
  });
  // hora
  const setHora = (h, mi, raw) => { h = Number(h); mi = Number(mi||0);
    if (h >= 0 && h <= 23 && mi <= 59) { out.hora = pad2(h)+':'+pad2(mi); toks.push({tipo:'hora', label:'⏰ '+pad2(h)+':'+pad2(mi), raw}); } };
  eat(/\b(\d{1,2}):(\d{2})\b/, m => setHora(m[1], m[2], m[0])) ||
  eat(/\b(\d{1,2})h(\d{2})?\b/i, m => setHora(m[1], m[2], m[0])) ||
  eat(/\b[àa]s (\d{1,2})\b/i, m => setHora(m[1], 0, m[0]));
  // completa recorrência sem data explícita
  if (out.recorrencia && !out.vencimento) {
    const r = out.recorrencia;
    if (r.tipo === 'diaria' || r.tipo === 'intervalo') out.vencimento = hoje();
    else if (r.tipo === 'semanal' && r.dias) out.vencimento = proxDow(r.dias[0]);
    else if (r.tipo === 'semanal') { r.dias = [pDate(hoje()).getDay()]; out.vencimento = hoje(); }
    else if (r.tipo === 'mensal') {
      const dia = r.dia || pDate(hoje()).getDate(); r.dia = dia;
      out.vencimento = hoje().slice(0,8) + pad2(Math.min(dia,28));
      if (out.vencimento < hoje()) out.vencimento = proximaData(r, hoje());
    }
  }
  if (out.recorrencia && out.recorrencia.tipo === 'mensal' && !out.recorrencia.dia) out.recorrencia.dia = pDate(out.vencimento || hoje()).getDate();
  if (out.recorrencia && out.recorrencia.tipo === 'semanal' && !out.recorrencia.dias) out.recorrencia.dias = [pDate(out.vencimento || hoje()).getDay()];
  out.titulo = s.replace(/\s+/g,' ').trim();
  return out;
}
function proximaData(rec, apos) { // regra 1
  const base = apos || hoje();
  if (!rec) return null;
  if (rec.tipo === 'diaria') return addDias(base, 1);
  if (rec.tipo === 'intervalo') return addDias(base, Math.max(1, rec.intervalo||1));
  if (rec.tipo === 'semanal') {
    const dias = (rec.dias && rec.dias.length ? rec.dias : [pDate(base).getDay()]).sort();
    let d = addDias(base, 1);
    for (let i = 0; i < 8; i++) { if (dias.includes(pDate(d).getDay())) return d; d = addDias(d, 1); }
    return d;
  }
  if (rec.tipo === 'mensal') {
    const dt = pDate(base); const dia = rec.dia || dt.getDate();
    const prox = new Date(dt.getFullYear(), dt.getMonth()+1, 1);
    const ultimo = new Date(prox.getFullYear(), prox.getMonth()+1, 0).getDate();
    prox.setDate(Math.min(dia, ultimo));
    return dISO(prox);
  }
  return null;
}
const recLabel = r => !r ? '' : r.tipo === 'diaria' ? 'todo dia' : r.tipo === 'intervalo' ? 'a cada '+r.intervalo+'d'
  : r.tipo === 'semanal' ? (r.dias||[]).map(d => DIAS_SEM[d]).join(',') : 'todo dia '+(r.dia||1);

/* ---- Quick add (registro ≤ 5s) ---- */
function quickAddHTML(ctx) {
  window._qaCtx = ctx || {};
  return '<div class="qa-box"><form data-sub="qa-sub"><div class="qa-inwrap">'
    + '<input class="input" id="qa-inp" data-inp="qa-parse" autocomplete="off" placeholder="'+esc(ctx && ctx.ph || '+ ex.: Pagar internet amanhã 9h d30 #casa @contas p2')+'">'
    + '<div class="qa-ac" id="qa-ac" hidden></div></div>'
    + '</form><div class="qa-tokens" id="qa-toks"></div></div>';
}
act('qa-parse', el => {
  const p = parseNL(el.value);
  const cls = {data:'dt', hora:'hr', dur:'dur', rec:'rec', proj:'proj', tag:'tag', pri:'pri'};
  $('#qa-toks').innerHTML = p.tokens.map(t =>
    '<span class="tok '+(cls[t.tipo]||'')+'">'+esc(t.label)+(t.raw?'<button type="button" data-act="qa-tok-rm" data-raw="'+esc(t.raw)+'">✕</button>':'')+'</span>').join('');
  acAtualizar(el);
});
act('qa-tok-rm', el => { const inp = $('#qa-inp'); inp.value = inp.value.replace(el.dataset.raw, ' ').replace(/\s+/g,' '); Actions['qa-parse'](inp); inp.focus(); });
act('qa-sub', () => {
  const inp = $('#qa-inp'); const p = parseNL(inp.value);
  if (!p.titulo) { toast('Escreva o título da tarefa.', {icone:'✍️'}); return; }
  acFechar();
  const concluir = () => { criarTarefaParseada(p, window._qaCtx || {}); window._qaRefoco = true; render(); };
  if (p.projetoDesconhecido) ofereceCriarProjeto(p, concluir); else concluir();
});

/* ---- Autocomplete de # (projetos) e @ (etiquetas) — Tab/Enter completa, ↑/↓ navega ---- */
function acAtualizar(inp) {
  const ac = $('#qa-ac'); if (!ac) return;
  const pos = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
  const m = inp.value.slice(0, pos).match(/([#@])([\p{L}\d_-]*)$/u);
  if (!m) { acFechar(); return; }
  const tipo = m[1], frag = m[2];
  let itens;
  if (tipo === '#') itens = ordenar(T('projetos').filter(p => p.status !== 'arquivado' && norm(p.nome).includes(norm(frag))), p => p.nome)
    .slice(0, 6).map(p => ({ valor: p.nome, html: projIconeHTML(p) + ' ' + esc(p.nome) + ' <span class="muted tiny">' + esc((areaDe(p.area_id) || {}).nome || '') + '</span>' }));
  else itens = ordenar(T('etiquetas').filter(e => norm(e.nome).includes(norm(frag))), e => e.nome)
    .slice(0, 6).map(e => ({ valor: e.nome, html: '<span class="dot" style="background:' + (e.cor || '#9AA0B0') + '"></span> @' + esc(e.nome) }));
  if (!itens.length) { acFechar(); return; }
  window._ac = { aberto: true, tipo, start: pos - m[0].length, len: m[0].length, itens, idx: 0 };
  acRender();
}
function acRender() {
  const ac = $('#qa-ac'), st = window._ac; if (!ac || !st || !st.aberto) return;
  ac.innerHTML = st.itens.map((it, i) => '<div class="qa-ac-item' + (i === st.idx ? ' on' : '') + '" data-act="qa-ac-pick" data-i="' + i + '">' + it.html + '</div>').join('');
  ac.hidden = false;
}
function acFechar() { const ac = $('#qa-ac'); if (ac) { ac.hidden = true; ac.innerHTML = ''; } if (window._ac) window._ac.aberto = false; }
function acCompletar(inp, i) {
  const st = window._ac; if (!st || !st.aberto) return false;
  const it = st.itens[i == null ? st.idx : i]; if (!it) return false;
  const v = inp.value;
  inp.value = v.slice(0, st.start) + st.tipo + it.valor + ' ' + v.slice(st.start + st.len);
  const caret = st.start + st.tipo.length + it.valor.length + 1;
  acFechar();
  try { inp.setSelectionRange(caret, caret); } catch (_) {}
  Actions['qa-parse'](inp); inp.focus();
  return true;
}
act('qa-ac-pick', el => acCompletar($('#qa-inp'), Number(el.dataset.i)));
document.addEventListener('keydown', e => {
  if (!e.target || e.target.id !== 'qa-inp') return;
  const st = window._ac; if (!st || !st.aberto) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); st.idx = (st.idx + 1) % st.itens.length; acRender(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); st.idx = (st.idx - 1 + st.itens.length) % st.itens.length; acRender(); }
  else if (e.key === 'Tab' || e.key === 'Enter') { if (acCompletar(e.target)) { e.preventDefault(); e.stopPropagation(); } }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); acFechar(); }
}, true);
document.addEventListener('click', e => { if (window._ac && window._ac.aberto && !e.target.closest('#qa-ac') && e.target.id !== 'qa-inp') acFechar(); });
function ofereceCriarProjeto(p, depois) {
  const nome = p.projetoDesconhecido;
  modal('<div class="bx-h"><div class="h2">Projeto não existe</div></div>'
    + '<p class="muted">O projeto <b>' + esc(nome) + '</b> não existe. O que deseja fazer?</p>'
    + '<div class="bx-foot" style="flex-wrap:wrap;gap:8px">'
    + '<button class="btn ghost" data-act="m-close">Cancelar</button>'
    + '<button class="btn" data-act="qa-semproj">Criar sem projeto</button>'
    + '<button class="btn primary" data-act="qa-criaproj">Criar projeto</button></div>');
  Actions['qa-semproj'] = () => { closeModal(); p.projeto_id = null; p.projetoDesconhecido = null; depois(); };
  Actions['qa-criaproj'] = () => { closeModal();
    editModal({ titulo:'Novo projeto', fields: resolveOpts(projFields), vals:{ nome: ucfirst(nome), icone:'📁', status:'ativo' },
      onSave: v => { const np = dbUpsert('projetos', v); p.projeto_id = np.id; p.projetoDesconhecido = null; depois(); } });
  };
}
function criarTarefaParseada(p, ctx) {
  for (const en of p.etiquetasNovas) dbUpsert('etiquetas', {nome: en, cor:'#9AA0B0'});
  const projeto_id = p.projeto_id || ctx.projeto_id || null;
  const proj = byId('projetos', projeto_id);
  const t = dbUpsert('tarefas', {
    titulo: p.titulo, descricao: null,
    area_id: proj ? proj.area_id : (ctx.area_id || null), // área herdada do projeto escolhido
    projeto_id, secao_id: p.projeto_id ? null : (ctx.secao_id || null),
    vencimento: p.vencimento || ctx.def_venc || null,
    hora: p.hora, prioridade: p.prioridade,
    estimativa_min: (p.estimativa_min != null ? p.estimativa_min : 5), // toda tarefa tem duração; padrão 5min
    recorrencia: p.recorrencia, subtarefas: [], etiquetas: p.etiquetas,
    comentarios: [], links: [], ordem: Date.now() % 100000, origem: ctx.origem || null,
    abandonada: false, concluida: false, concluida_em: null
  });
  toast('Tarefa criada ✓', {icone:'✅', undo: () => { dbDelete('tarefas', t.id); render(); }});
  return t;
}

/* ---- item de tarefa ---- */
const etiquetaCor = nome => (T('etiquetas').find(e => e.nome === nome) || {}).cor || '#9AA0B0';
function vencHTML(t) {
  if (!t.vencimento) return '';
  const atras = !t.concluida && t.vencimento < hoje();
  return '<span class="'+(atras?'err':t.vencimento===hoje()?'ok':'')+'">📅 '+fmtData(t.vencimento)+(t.hora?' ⏰'+fmtHora(t.hora):'')+'</span>';
}
function taskItemHTML(t, o={}) {
  const proj = byId('projetos', t.projeto_id);
  const sub = [
    vencHTML(t),
    t.recorrencia ? '<span class="acc">🔁 '+esc(recLabel(t.recorrencia))+'</span>' : '',
    (!o.semProjeto && proj) ? '<span>'+projLabelHTML(proj)+'</span>' : '',
    (t.etiquetas||[]).map(e => '<span class="tag" style="background:'+etiquetaCor(e)+'22;color:'+etiquetaCor(e)+'">@'+esc(e)+'</span>').join(''),
    (t.subtarefas||[]).length ? '<span>☑ '+(t.subtarefas.filter(s=>s.feito).length)+'/'+t.subtarefas.length+'</span>' : '',
    (t.comentarios||[]).length ? '<span>💬 '+t.comentarios.length+'</span>' : '',
    (t.links||[]).length ? '<span>🔗 '+t.links.length+'</span>' : '',
    t.estimativa_min ? '<span>⏳ '+fmtMin(t.estimativa_min)+'</span>' : ''
  ].filter(Boolean).join(' ');
  const salvando = estaPendente('tarefas', t.id) ? '<span class="saving" title="salvando…">⟳</span>' : '';
  return '<div class="item task'+(t.concluida?' done':'')+'" data-tid="'+t.id+'" '+(o.drag?'draggable="true"':'')+'>'
    + '<button class="check p'+(t.prioridade||4)+(t.concluida?' ck':'')+'" data-act="task-toggle" data-id="'+t.id+'"></button>'
    + '<div class="grow" data-act="task-open" data-id="'+t.id+'"><div class="ttl">'+esc(t.titulo)+salvando+'</div>'
    + (sub ? '<div class="sub">'+sub+'</div>' : '') + '</div>'
    + (o.rollover ? '<button class="btn small" data-act="rollover-menu" data-id="'+t.id+'">decidir</button>' : '')
    + '</div>';
}
const tarefasPendentes = () => T('tarefas').filter(t => !t.concluida && !t.abandonada);

/* ---- concluir / recorrência (regra 1) ---- */
act('task-toggle', el => {
  const t = byId('tarefas', el.dataset.id); if (!t) return;
  if (!t.concluida) {
    el.classList.add('ck','pop');
    setTimeout(() => concluirTarefa(t.id), 200);
  } else {
    dbPatch('tarefas', t.id, {concluida:false, concluida_em:null});
    render();
  }
});
function concluirTarefa(id) {
  const t = byId('tarefas', id); if (!t || t.concluida) return;
  dbPatch('tarefas', id, {concluida:true, concluida_em: nowISO()});
  let prox = null;
  if (t.recorrencia) {
    prox = dbUpsert('tarefas', {...t, id: undefined, criado_em: undefined,
      concluida:false, concluida_em:null, vencimento: proximaData(t.recorrencia, t.vencimento || hoje()),
      subtarefas: (t.subtarefas||[]).map(s => ({...s, feito:false}))});
  }
  if (window.aoConcluirTarefa) aoConcluirTarefa(t);
  toast(t.recorrencia ? 'Feita! Próxima: '+fmtData(prox.vencimento)+' 🔁' : 'Tarefa concluída ✓', {
    icone:'🎉',
    undo: () => { dbPatch('tarefas', id, {concluida:false, concluida_em:null}); if (prox) dbDelete('tarefas', prox.id); render(); }
  });
  if (window.checkConquistas) checkConquistas('tarefa');
  render();
}

/* ---- rollover consciente (regras 13 / 3.2) ---- */
act('rollover-menu', el => abrirRollover(el.dataset.id));
function abrirRollover(id, aoDecidir) {
  const t = byId('tarefas', id); if (!t) return;
  modal('<div class="bx-h"><div class="h2">Tarefa vencida</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<p style="margin:0 0 4px;font-weight:700">'+esc(t.titulo)+'</p>'
    + '<p class="muted small" style="margin:0 0 14px">venceu '+fmtData(t.vencimento)+'. O que fazer com ela? (decidir é o que importa — abandonar também vale)</p>'
    + '<div class="col">'
    + '<button class="btn big" data-rv="hoje">☀️ Fazer hoje</button>'
    + '<div class="row"><input type="date" class="input" id="rv-data" value="'+addDias(hoje(),1)+'" style="flex:1"><button class="btn" data-rv="reagendar">📅 Reagendar</button></div>'
    + '<button class="btn big" data-rv="inbox">📥 Caixa de entrada (sem data)</button>'
    + '<button class="btn big" data-rv="abandonar">🕊️ Abandonar (sai da lista, fica no histórico)</button>'
    + '</div>',
    { onMount: ov => ov.addEventListener('click', e => {
        const b = e.target.closest('[data-rv]'); if (!b) return;
        const acao = b.dataset.rv;
        if (acao === 'hoje') dbPatch('tarefas', id, {vencimento: hoje()});
        if (acao === 'reagendar') dbPatch('tarefas', id, {vencimento: ov.querySelector('#rv-data').value || addDias(hoje(),1)});
        if (acao === 'inbox') dbPatch('tarefas', id, {vencimento:null, projeto_id:null, secao_id:null});
        if (acao === 'abandonar') { dbPatch('tarefas', id, {abandonada:true});
          toast('Abandonar também é decidir. 🕊️', {undo: () => { dbPatch('tarefas', id, {abandonada:false}); render(); }}); }
        closeModal();
        if (aoDecidir) aoDecidir(); else render();
      }) });
}

/* ---- detalhe da tarefa ---- */
act('task-open', el => abrirTarefa(el.dataset.id));
function abrirTarefa(id) {
  const t = byId('tarefas', id); if (!t) return;
  const recT = (t.recorrencia||{}).tipo || '';
  const html = '<div class="bx-h"><span class="check p'+(t.prioridade||4)+(t.concluida?' ck':'')+'" data-act="task-toggle" data-id="'+t.id+'"></span>'
    + '<div class="h2" style="flex:1">Tarefa</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="field"><input class="input" id="td-titulo" value="'+esc(t.titulo)+'" style="font-weight:700;font-size:16px"></div>'
    + '<div class="field"><textarea class="textarea" id="td-desc" rows="2" placeholder="Descrição…">'+esc(t.descricao||'')+'</textarea></div>'
    + '<div class="frow"><div class="field"><label>Projeto</label><select class="select" id="td-proj" data-chg="td-proj-chg">'
    + optsProjetos().map(o => '<option value="'+o.v+'"'+(o.v===(t.projeto_id||'')?' selected':'')+'>'+esc(o.t)+'</option>').join('') + '</select></div>'
    + '<div class="field"><label>Seção</label><select class="select" id="td-sec">'+secaoOpts(t.projeto_id, t.secao_id)+'</select></div></div>'
    + '<div class="frow"><div class="field"><label>Área</label><select class="select" id="td-area">'
    + optsAreas().map(o => '<option value="'+o.v+'"'+(o.v===(t.area_id||'')?' selected':'')+'>'+esc(o.t)+'</option>').join('') + '</select></div>'
    + '<div class="field"><label>Prioridade</label><select class="select" id="td-pri">'
    + [1,2,3,4].map(p => '<option value="'+p+'"'+(p===(t.prioridade||4)?' selected':'')+'>P'+p+(p===1?' — máxima':p===4?' — normal':'')+'</option>').join('') + '</select></div></div>'
    + '<div class="frow"><div class="field"><label>Vencimento</label><input type="date" class="input" id="td-venc" value="'+(t.vencimento||'')+'"></div>'
    + '<div class="field"><label>Hora (entra na agenda)</label><input type="time" class="input" id="td-hora" value="'+(fmtHora(t.hora)||'')+'"></div></div>'
    + '<div class="frow"><div class="field"><label>Estimativa (min)</label><input type="number" class="input" id="td-est" value="'+(t.estimativa_min||'')+'"></div>'
    + '<div class="field"><label>Recorrência</label><select class="select" id="td-rec">'
    + [['','sem repetição'],['diaria','todo dia'],['semanal','semanal'],['mensal','mensal'],['intervalo','a cada N dias']]
      .map(([v,l]) => '<option value="'+v+'"'+(v===recT?' selected':'')+'>'+l+'</option>').join('') + '</select></div></div>'
    + '<div id="td-rec-extra">'+recExtraHTML(t.recorrencia)+'</div>'
    + '<div class="field"><label>Etiquetas</label><div class="row wrap" id="td-tags">'
    + T('etiquetas').map(e => '<span class="chip mini'+((t.etiquetas||[]).includes(e.nome)?' sel':'')+'" data-act="td-tag" data-n="'+esc(e.nome)+'" style="color:'+(e.cor||'inherit')+'">@'+esc(e.nome)+'</span>').join('')
    + '<span class="chip mini" data-act="etq-add">+ nova</span></div></div>'
    + '<div class="field"><label>Subtarefas</label><div id="td-subs">'+subtarefasHTML(t)+'</div>'
    + '<form data-sub="td-sub-add" class="row"><input class="input" id="td-sub-inp" placeholder="+ subtarefa"><button class="btn small" type="submit">Add</button></form></div>'
    + '<div class="field"><label>Links / anexos</label><div id="td-links">'+linksHTML(t)+'</div>'
    + '<form data-sub="td-link-add" class="frow"><input class="input" id="td-link-t" placeholder="título"><input class="input" id="td-link-u" placeholder="https://…"><button class="btn small" type="submit">Add</button></form></div>'
    + '<div class="field"><label>Comentários</label><div id="td-coms">'+comentariosHTML(t)+'</div>'
    + '<form data-sub="td-com-add" class="row"><input class="input" id="td-com-inp" placeholder="+ comentário"><button class="btn small" type="submit">Add</button></form></div>'
    + '<div class="bx-foot"><button class="btn danger" data-act="td-del">Excluir</button>'
    + (!t.concluida && !t.abandonada ? '<button class="btn ghost" data-act="td-abandonar">🕊️ Abandonar</button>' : '')
    + (t.abandonada ? '<button class="btn ghost" data-act="td-retomar">Retomar</button>' : '')
    + '<span class="sp"></span><button class="btn primary" data-act="td-save">Salvar</button></div>';
  modal(html, { wide:true });
  window._tdId = id;
}
function secaoOpts(projId, secId) {
  const secs = ordenar(T('secoes').filter(s => s.projeto_id === projId), s => s.ordem||0);
  return '<option value="">— sem seção —</option>' + secs.map(s => '<option value="'+s.id+'"'+(s.id===secId?' selected':'')+'>'+esc(s.nome)+'</option>').join('');
}
function recExtraHTML(rec) {
  if (!rec) return '';
  if (rec.tipo === 'semanal') return '<div class="row wrap" style="margin:-4px 0 12px">'
    + DIAS_SEM.map((d,i) => '<span class="chip mini'+((rec.dias||[]).includes(i)?' sel':'')+'" data-act="td-rec-dia" data-d="'+i+'">'+d+'</span>').join('') + '</div>';
  if (rec.tipo === 'intervalo') return '<div class="field"><label>A cada quantos dias</label><input type="number" class="input" id="td-rec-int" value="'+(rec.intervalo||2)+'"></div>';
  if (rec.tipo === 'mensal') return '<div class="field"><label>Dia do mês</label><input type="number" class="input" id="td-rec-dia-mes" min="1" max="31" value="'+(rec.dia||1)+'"></div>';
  return '';
}
act('td-proj-chg', el => { $('#td-sec').innerHTML = secaoOpts(el.value || null, null); });
act('td-rec', () => {});
document.addEventListener('change', e => {
  if (e.target.id === 'td-rec') {
    const tipo = e.target.value;
    const rec = tipo ? {tipo, dias: tipo==='semanal'?[pDate(hoje()).getDay()]:undefined, intervalo: tipo==='intervalo'?2:undefined, dia: tipo==='mensal'?pDate(hoje()).getDate():undefined} : null;
    $('#td-rec-extra').innerHTML = recExtraHTML(rec);
  }
});
act('td-rec-dia', el => el.classList.toggle('sel'));
act('td-tag', el => el.classList.toggle('sel'));
function subtarefasHTML(t) {
  return (t.subtarefas||[]).map((s,i) => '<div class="subtask-line"><button class="check p4'+(s.feito?' ck':'')+'" data-act="td-sub-tg" data-i="'+i+'" style="width:17px;height:17px"></button>'
    + '<span style="flex:1;'+(s.feito?'text-decoration:line-through;color:var(--txt2)':'')+'">'+esc(s.texto)+'</span>'
    + '<button class="iconbtn" data-act="td-sub-rm" data-i="'+i+'">✕</button></div>').join('') || '<span class="muted tiny">nenhuma</span>';
}
function linksHTML(t) {
  return (t.links||[]).map((l,i) => '<div class="subtask-line">🔗 <a href="'+esc(l.url)+'" target="_blank" rel="noopener" style="flex:1">'+esc(l.titulo||l.url)+'</a>'
    + '<button class="iconbtn" data-act="td-link-rm" data-i="'+i+'">✕</button></div>').join('') || '<span class="muted tiny">nenhum</span>';
}
function comentariosHTML(t) {
  return (t.comentarios||[]).map((c,i) => '<div class="subtask-line" style="align-items:flex-start"><div style="flex:1"><div class="tiny muted">'+fmtData((c.criado_em||'').slice(0,10))+' '+(c.criado_em||'').slice(11,16)+'</div>'+esc(c.texto)+'</div>'
    + '<button class="iconbtn" data-act="td-com-rm" data-i="'+i+'">✕</button></div>').join('') || '<span class="muted tiny">nenhum</span>';
}
const tdT = () => byId('tarefas', window._tdId);
act('td-sub-add', () => { const t = tdT(); const v = $('#td-sub-inp').value.trim(); if (!v) return;
  dbPatch('tarefas', t.id, {subtarefas:[...(t.subtarefas||[]), {texto:v, feito:false}]}); $('#td-subs').innerHTML = subtarefasHTML(tdT()); $('#td-sub-inp').value=''; });
act('td-sub-tg', el => { const t = tdT(); const subs = [...t.subtarefas]; subs[el.dataset.i].feito = !subs[el.dataset.i].feito;
  dbPatch('tarefas', t.id, {subtarefas:subs}); $('#td-subs').innerHTML = subtarefasHTML(tdT()); });
act('td-sub-rm', el => { const t = tdT(); const subs = [...t.subtarefas]; subs.splice(el.dataset.i,1);
  dbPatch('tarefas', t.id, {subtarefas:subs}); $('#td-subs').innerHTML = subtarefasHTML(tdT()); });
act('td-link-add', () => { const t = tdT(); const u = $('#td-link-u').value.trim(); if (!u) return;
  dbPatch('tarefas', t.id, {links:[...(t.links||[]), {titulo: $('#td-link-t').value.trim()||u, url:u}]});
  $('#td-links').innerHTML = linksHTML(tdT()); $('#td-link-t').value=''; $('#td-link-u').value=''; });
act('td-link-rm', el => { const t = tdT(); const ls = [...t.links]; ls.splice(el.dataset.i,1); dbPatch('tarefas', t.id, {links:ls}); $('#td-links').innerHTML = linksHTML(tdT()); });
act('td-com-add', () => { const t = tdT(); const v = $('#td-com-inp').value.trim(); if (!v) return;
  dbPatch('tarefas', t.id, {comentarios:[...(t.comentarios||[]), {texto:v, criado_em: nowISO()}]});
  $('#td-coms').innerHTML = comentariosHTML(tdT()); $('#td-com-inp').value=''; });
act('td-com-rm', el => { const t = tdT(); const cs = [...t.comentarios]; cs.splice(el.dataset.i,1); dbPatch('tarefas', t.id, {comentarios:cs}); $('#td-coms').innerHTML = comentariosHTML(tdT()); });
act('td-abandonar', () => { const t = tdT(); dbPatch('tarefas', t.id, {abandonada:true}); closeModal(); render();
  toast('Abandonar também é decidir. 🕊️', {undo: () => { dbPatch('tarefas', t.id, {abandonada:false}); render(); }}); });
act('td-retomar', () => { const t = tdT(); dbPatch('tarefas', t.id, {abandonada:false}); closeModal(); render(); });
act('td-del', () => { const t = {...tdT()};
  confirmBox('Excluir a tarefa "'+esc(t.titulo)+'"?', () => { dbDelete('tarefas', t.id); closeModal(); render();
    toast('Tarefa excluída.', {undo: () => { dbUpsert('tarefas', t); render(); }}); }, {perigo:1, sim:'Excluir'}); });
act('td-save', () => {
  const t = tdT(); if (!t) return;
  const tipo = $('#td-rec') ? $('#td-rec').value : '';
  let rec = null;
  if (tipo === 'diaria') rec = {tipo:'diaria'};
  if (tipo === 'semanal') rec = {tipo:'semanal', dias: $$('#td-rec-extra .chip.sel').map(c => Number(c.dataset.d))};
  if (tipo === 'intervalo') rec = {tipo:'intervalo', intervalo: Number(($('#td-rec-int')||{}).value)||2};
  if (tipo === 'mensal') rec = {tipo:'mensal', dia: Number(($('#td-rec-dia-mes')||{}).value)||1};
  if (rec && rec.tipo === 'semanal' && !rec.dias.length) rec.dias = [pDate(hoje()).getDay()];
  dbPatch('tarefas', t.id, {
    titulo: $('#td-titulo').value.trim() || t.titulo,
    descricao: $('#td-desc').value.trim() || null,
    projeto_id: $('#td-proj').value || null,
    secao_id: $('#td-sec').value || null,
    area_id: $('#td-area').value || null,
    prioridade: Number($('#td-pri').value) || 4,
    vencimento: $('#td-venc').value || null,
    hora: $('#td-hora').value || null,
    estimativa_min: Number($('#td-est').value) || null,
    recorrencia: rec,
    etiquetas: $$('#td-tags .chip.sel').map(c => c.dataset.n)
  });
  closeModal(); render(); toast('Salvo ✓');
});

/* ---- página TAREFAS ---- */
reg('tarefas', {
  titulo: 'Tarefas',
  render: (params) => {
    const vista = params[0] ? params.join('/') : 'v/hoje';
    return '<div class="tar-grid"><aside class="tar-aside card" style="position:sticky;top:14px">'+tarAsideHTML(vista)+'</aside>'
      + '<div>'+tarVistasMobileHTML(vista)+'<div id="tar-conteudo">'+tarConteudoHTML(vista)+'</div></div></div>';
  },
  mount: () => {
    if (window._qaRefoco) { window._qaRefoco = false; const i = $('#qa-inp'); if (i) i.focus(); }
    bindTaskDnD();
  }
});
function tarAsideHTML(vista) {
  const pend = tarefasPendentes();
  const nHoje = pend.filter(t => t.vencimento && t.vencimento <= hoje()).length;
  const nInbox = pend.filter(t => !t.projeto_id).length;
  const li = (rota, em, nome, n) => '<button class="navit'+(vista===rota?' on':'')+'" data-act="nav" data-r="tarefas/'+rota+'"><span class="em">'+em+'</span><span style="flex:1">'+nome+'</span>'+(n?'<span class="badge">'+n+'</span>':'')+'</button>';
  let html = li('v/hoje','☀️','Hoje',nHoje) + li('v/semana','📆','Próximos 7 dias','') + li('v/inbox','📥','Caixa de entrada',nInbox) + li('v/feitas','✔️','Concluídas','');
  const filtros = ordenar(T('filtros'), f => f.ordem||0);
  html += '<div class="sec-head">Filtros <span class="sp"></span><button class="iconbtn" data-act="filtro-add" title="novo filtro">＋</button></div>';
  html += filtros.map(f => li('filtro/'+f.id,'🔍',esc(f.nome),'')).join('') || '<span class="tiny muted" style="padding:0 12px">crie filtros salvos</span>';
  html += '<div class="sec-head">Projetos <span class="sp"></span><button class="iconbtn" data-act="proj-add" title="novo projeto">＋</button></div>';
  const areasOrd = ordenar(T('areas'), a => a.ordem||0);
  for (const a of [...areasOrd, null]) {
    const projs = T('projetos').filter(p => (a ? p.area_id === a.id : !p.area_id) && p.status !== 'arquivado');
    if (!projs.length) continue;
    if (a) html += '<div class="tiny" style="padding:6px 12px 0;color:'+a.cor+';font-weight:700">'+a.icone+' '+esc(a.nome).toUpperCase()+'</div>';
    html += projs.map(p => li('projeto/'+p.id, projIconeHTML(p), esc(p.nome), pend.filter(t=>t.projeto_id===p.id).length)).join('');
  }
  const tagsUsadas = ordenar(T('etiquetas'), e => e.nome);
  if (tagsUsadas.length) {
    html += '<div class="sec-head">Etiquetas</div>' + tagsUsadas.map(e => li('etiqueta/'+encodeURIComponent(e.nome),'🏷️','@'+esc(e.nome), '')).join('');
  }
  return html;
}
function tarVistasMobileHTML(vista) {
  const chip = (rota, l) => '<span class="chip'+(vista===rota?' sel':'')+'" data-act="nav" data-r="tarefas/'+rota+'">'+l+'</span>';
  return '<div class="tar-vistas">'+chip('v/hoje','☀️ Hoje')+chip('v/semana','📆 7 dias')+chip('v/inbox','📥 Inbox')
    + '<span class="chip" data-act="tar-projetos-sheet">📁 Projetos</span><span class="chip" data-act="tar-mais-sheet">⋯</span>'+chip('v/feitas','✔️ Feitas')+'</div>';
}
act('tar-projetos-sheet', () => {
  modal('<div class="bx-h"><div class="h2">Projetos</div><button class="btn small" data-act="proj-add">+ Novo</button></div><div class="list">'
    + T('projetos').filter(p => p.status !== 'arquivado').map(p => '<div class="item" data-act="nav-close" data-r="tarefas/projeto/'+p.id+'"><span>'+projIconeHTML(p)+'</span><div class="grow"><div class="ttl">'+esc(p.nome)+'</div><div class="sub">'+(areaDe(p.area_id)?areaChipHTML(p.area_id):'')+'</div></div></div>').join('')
    + '</div>');
});
act('tar-mais-sheet', () => {
  modal('<div class="bx-h"><div class="h2">Etiquetas e filtros</div><button class="btn small" data-act="filtro-add">+ Filtro</button></div>'
    + '<div class="h3">Filtros</div><div class="row wrap">'+ (T('filtros').map(f => '<span class="chip" data-act="nav-close" data-r="tarefas/filtro/'+f.id+'">🔍 '+esc(f.nome)+'</span>').join('') || '<span class="muted small">nenhum</span>') +'</div><hr class="sep">'
    + '<div class="h3">Etiquetas</div><div class="row wrap">'+ (T('etiquetas').map(e => '<span class="chip" data-act="nav-close" data-r="tarefas/etiqueta/'+encodeURIComponent(e.nome)+'">@'+esc(e.nome)+'</span>').join('') || '<span class="muted small">nenhuma</span>') +'</div>');
});
function tarConteudoHTML(vista) {
  const [tipo, arg] = vista.split('/');
  if (tipo === 'v' && arg === 'hoje') return vistaHojeHTML();
  if (tipo === 'v' && arg === 'semana') return vistaSemanaHTML();
  if (tipo === 'v' && arg === 'inbox') return vistaInboxHTML();
  if (tipo === 'v' && arg === 'feitas') return vistaFeitasHTML();
  if (tipo === 'projeto') return vistaProjetoHTML(arg);
  if (tipo === 'etiqueta') return vistaEtiquetaHTML(decodeURIComponent(arg));
  if (tipo === 'filtro') return vistaFiltroHTML(arg);
  return vistaHojeHTML();
}
const ordTarefa = t => (t.hora ? '1'+t.hora : '2') + (t.prioridade||4) + (t.vencimento||'9999');
function vistaHojeHTML() {
  const pend = tarefasPendentes();
  const atrasadas = ordenar(pend.filter(t => t.vencimento && t.vencimento < hoje()), t => t.vencimento);
  const deHoje = ordenar(pend.filter(t => t.vencimento === hoje()), ordTarefa);
  const feitasHoje = T('tarefas').filter(t => t.concluida && (t.concluida_em||'').slice(0,10) === hoje());
  let html = '<div class="h1">☀️ Hoje <span class="muted" style="font-weight:400;font-size:14px">'+fmtData(hoje(),{semHoje:1})+'</span></div>';
  html += '<div class="card">'+quickAddHTML({def_venc: hoje()})+'</div>';
  if (atrasadas.length) html += '<div class="card pad0"><div class="sec-head" style="padding:12px 14px 4px"><span class="err">⏰ Atrasadas ('+atrasadas.length+')</span></div><div class="list" style="padding:0 10px 8px">'
    + atrasadas.map(t => taskItemHTML(t, {rollover:true})).join('') + '</div></div>';
  html += '<div class="card pad0"><div class="list" style="padding:4px 10px">'
    + (deHoje.map(t => taskItemHTML(t)).join('') || '<div class="empty"><span class="em">🌤️</span>Nada para hoje. Adicione acima ou puxe do backlog.</div>') + '</div></div>';
  if (feitasHoje.length) html += '<details class="help"><summary>✔️ Concluídas hoje ('+feitasHoje.length+')</summary><div class="list">'+feitasHoje.map(t => taskItemHTML(t)).join('')+'</div></details>';
  return html;
}
function vistaSemanaHTML() {
  let html = '<div class="h1">📆 Próximos 7 dias</div><div class="card">'+quickAddHTML({})+'</div><div class="card pad0" style="padding:4px 12px 10px">';
  const pend = tarefasPendentes();
  const atrasadas = pend.filter(t => t.vencimento && t.vencimento < hoje());
  if (atrasadas.length) html += '<div class="day-head err">⏰ atrasadas</div><div class="list">'+ordenar(atrasadas, t=>t.vencimento).map(t => taskItemHTML(t, {rollover:true})).join('')+'</div>';
  for (let i = 0; i < 7; i++) {
    const d = addDias(hoje(), i);
    const ts = ordenar(pend.filter(t => t.vencimento === d), ordTarefa);
    html += '<div class="day-head">'+fmtData(d)+'</div>';
    html += ts.length ? '<div class="list">'+ts.map(t => taskItemHTML(t)).join('')+'</div>' : '<div class="tiny muted" style="padding:2px 6px 6px">—</div>';
  }
  return html + '</div>';
}
function vistaInboxHTML() {
  const ts = ordenar(tarefasPendentes().filter(t => !t.projeto_id), t => -(new Date(t.criado_em||0)).getTime());
  return '<div class="h1">📥 Caixa de entrada</div><div class="card">'+quickAddHTML({})+'</div>'
    + '<div class="card pad0"><div class="list" style="padding:4px 10px">'
    + (ts.map(t => taskItemHTML(t)).join('') || '<div class="empty"><span class="em">📭</span>Inbox zerada. Que paz.</div>') + '</div></div>';
}
function vistaFeitasHTML() {
  const feitas = ordenar(T('tarefas').filter(t => t.concluida), t => t.concluida_em||'', true).slice(0, 120);
  const aband = T('tarefas').filter(t => t.abandonada && !t.concluida);
  let html = '<div class="h1">✔️ Concluídas</div><div class="card pad0" style="padding:4px 12px 10px">';
  let dia = null;
  for (const t of feitas) {
    const d = (t.concluida_em||'').slice(0,10);
    if (d !== dia) { dia = d; html += '<div class="day-head">'+fmtData(d)+'</div>'; }
    html += taskItemHTML(t);
  }
  if (!feitas.length) html += '<div class="empty"><span class="em">🏁</span>Nenhuma concluída ainda.</div>';
  html += '</div>';
  if (aband.length) html += '<details class="help"><summary>🕊️ Abandonadas ('+aband.length+') — decisões legítimas, não falhas</summary><div class="list">'+aband.map(t => taskItemHTML(t)).join('')+'</div></details>';
  return html;
}
function vistaProjetoHTML(pid) {
  const p = byId('projetos', pid);
  if (!p) return '<div class="empty">Projeto não encontrado.</div>';
  const todas = T('tarefas').filter(t => t.projeto_id === pid && !t.abandonada);
  const feitas = todas.filter(t => t.concluida).length;
  const pct = todas.length ? Math.round(feitas/todas.length*100) : 0;
  const secs = ordenar(T('secoes').filter(s => s.projeto_id === pid), s => s.ordem||0);
  let html = '<div class="row" style="margin-bottom:6px"><div class="h1" style="flex:1">'+projLabelHTML(p)+'</div>'
    + '<button class="btn small" data-act="proj-edit" data-id="'+pid+'">✏️</button>'
    + '<button class="btn small" data-act="sec-add" data-id="'+pid+'">+ Seção</button></div>'
    + '<div class="row" style="margin-bottom:10px">'+areaChipHTML(p.area_id)
    + '<span class="badge'+(p.status==='ativo'?' ok':'')+'">'+esc(p.status||'ativo')+'</span>'
    + (p.prazo?'<span class="badge">até '+fmtData(p.prazo)+'</span>':'')
    + '<div class="bar" style="flex:1;max-width:200px"><i style="width:'+pct+'%"></i></div><span class="tiny muted">'+pct+'%</span></div>'
    + '<div class="card">'+quickAddHTML({projeto_id:pid, area_id:p.area_id, ph:'+ tarefa neste projeto…'})+'</div>';
  const grupos = [{id:null, nome:null}, ...secs];
  for (const g of grupos) {
    const ts = ordenar(todas.filter(t => !t.concluida && (g.id ? t.secao_id === g.id : !t.secao_id)), t => t.ordem||0);
    if (g.id) {
      html += '<div class="sec-head collap" data-act="sec-collap"><span class="arr">▼</span> '+esc(g.nome)+' <span class="badge">'+ts.length+'</span><span class="sp"></span>'
        + '<button class="iconbtn" data-act="sec-edit" data-id="'+g.id+'">✏️</button></div>';
    } else if (ts.length) html += '<div class="sec-head">— sem seção</div>';
    html += '<div class="card pad0 sec-body" data-sec="'+(g.id||'')+'" data-proj="'+pid+'"><div class="list" style="padding:2px 10px;min-height:14px">'
      + ts.map(t => taskItemHTML(t, {semProjeto:true, drag:true})).join('') + '</div></div>';
  }
  const conc = todas.filter(t => t.concluida);
  if (conc.length) html += '<details class="help"><summary>✔️ Concluídas ('+conc.length+')</summary><div class="list">'+conc.slice(0,40).map(t => taskItemHTML(t,{semProjeto:true})).join('')+'</div></details>';
  return html;
}
act('sec-collap', el => { el.classList.toggle('closed'); const body = el.nextElementSibling; if (body) body.style.display = el.classList.contains('closed') ? 'none' : ''; });
function vistaEtiquetaHTML(nome) {
  const ts = ordenar(tarefasPendentes().filter(t => (t.etiquetas||[]).includes(nome)), ordTarefa);
  return '<div class="h1">🏷️ @'+esc(nome)+'</div><div class="card pad0"><div class="list" style="padding:4px 10px">'
    + (ts.map(t => taskItemHTML(t)).join('') || '<div class="empty"><span class="em">🏷️</span>Nenhuma tarefa com esta etiqueta.</div>') + '</div></div>';
}
/* ---- filtros salvos ---- */
function avaliarFiltro(c, t) {
  if (!c) return false;
  if (!c.incluir_concluidas && (t.concluida || t.abandonada)) return false;
  if (c.prioridades && c.prioridades.length && !c.prioridades.includes(t.prioridade||4)) return false;
  if (c.areas && c.areas.length && !c.areas.includes(t.area_id)) return false;
  if (c.projetos && c.projetos.length && !c.projetos.includes(t.projeto_id)) return false;
  if (c.etiquetas && c.etiquetas.length && !c.etiquetas.some(e => (t.etiquetas||[]).includes(e))) return false;
  if (c.venc === 'hoje' && t.vencimento !== hoje()) return false;
  if (c.venc === 'semana' && !(t.vencimento && t.vencimento <= fimSemana(hoje()))) return false;
  if (c.venc === 'atrasadas' && !(t.vencimento && t.vencimento < hoje() && !t.concluida)) return false;
  if (c.venc === 'sem_data' && t.vencimento) return false;
  return true;
}
function vistaFiltroHTML(fid) {
  const f = byId('filtros', fid);
  if (!f) return '<div class="empty">Filtro não encontrado.</div>';
  const ts = ordenar(T('tarefas').filter(t => avaliarFiltro(f.criterios, t)), ordTarefa);
  return '<div class="row" style="margin-bottom:8px"><div class="h1" style="flex:1">🔍 '+esc(f.nome)+'</div>'
    + '<button class="btn small" data-act="filtro-edit" data-id="'+fid+'">✏️ Editar</button></div>'
    + '<div class="card pad0"><div class="list" style="padding:4px 10px">'
    + (ts.map(t => taskItemHTML(t)).join('') || '<div class="empty"><span class="em">🔍</span>Nada bate com este filtro.</div>') + '</div></div>';
}
function filtroModal(f) {
  const c = (f && f.criterios) || {};
  const chips = (lista, sels, attr) => lista.map(([v,l]) => '<span class="chip mini'+((sels||[]).includes(v)?' sel':'')+'" data-fl="'+attr+'" data-v="'+esc(v)+'">'+l+'</span>').join('');
  modal('<div class="bx-h"><div class="h2">'+(f?'Editar':'Novo')+' filtro</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="field"><label>Nome *</label><input class="input" id="fl-nome" value="'+esc(f?f.nome:'')+'" placeholder="ex.: Urgente do trabalho esta semana" autofocus></div>'
    + '<div class="field"><label>Prioridades</label><div class="row wrap">'+chips([[1,'P1'],[2,'P2'],[3,'P3'],[4,'P4']], c.prioridades, 'pri')+'</div></div>'
    + '<div class="field"><label>Áreas</label><div class="row wrap">'+chips(T('areas').map(a=>[a.id, a.icone+' '+esc(a.nome)]), c.areas, 'area')+'</div></div>'
    + '<div class="field"><label>Projetos</label><div class="row wrap">'+chips(T('projetos').filter(p=>p.status!=='arquivado').map(p=>[p.id, esc(p.nome)]), c.projetos, 'proj')+'</div></div>'
    + '<div class="field"><label>Etiquetas</label><div class="row wrap">'+chips(T('etiquetas').map(e=>[e.nome, '@'+esc(e.nome)]), c.etiquetas, 'tag')+'</div></div>'
    + '<div class="field"><label>Vencimento</label><select class="select" id="fl-venc">'
    + [['','qualquer'],['hoje','hoje'],['semana','até o fim da semana'],['atrasadas','atrasadas'],['sem_data','sem data']]
      .map(([v,l]) => '<option value="'+v+'"'+(v===(c.venc||'')?' selected':'')+'>'+l+'</option>').join('')+'</select></div>'
    + '<label class="checkline"><input type="checkbox" id="fl-conc"'+(c.incluir_concluidas?' checked':'')+'> incluir concluídas</label>'
    + '<div class="bx-foot">'+(f?'<button class="btn danger" data-act="filtro-del" data-id="'+f.id+'">Excluir</button><span class="sp"></span>':'')
    + '<button class="btn ghost" data-act="m-close">Cancelar</button><button class="btn primary" data-act="filtro-save" data-id="'+(f?f.id:'')+'">Salvar</button></div>',
    { onMount: ov => ov.addEventListener('click', e => { const ch = e.target.closest('[data-fl]'); if (ch) ch.classList.toggle('sel'); }) });
}
act('filtro-add', () => filtroModal(null));
act('filtro-edit', el => filtroModal(byId('filtros', el.dataset.id)));
act('filtro-save', el => {
  const nome = $('#fl-nome').value.trim(); if (!nome) { toast('Dê um nome ao filtro.'); return; }
  const pega = attr => $$('.chip.sel[data-fl="'+attr+'"]').map(c => attr==='pri' ? Number(c.dataset.v) : c.dataset.v);
  const criterios = { prioridades: pega('pri'), areas: pega('area'), projetos: pega('proj'), etiquetas: pega('tag'),
    venc: $('#fl-venc').value || null, incluir_concluidas: $('#fl-conc').checked };
  const f = dbUpsert('filtros', { id: el.dataset.id || undefined, nome, criterios, ordem: T('filtros').length });
  closeModal(); nav('tarefas/filtro/'+f.id);
});
act('filtro-del', el => { const f = {...byId('filtros', el.dataset.id)}; dbDelete('filtros', el.dataset.id); closeModal(); nav('tarefas');
  toast('Filtro excluído.', {undo: () => { dbUpsert('filtros', f); render(); }}); });

/* ---- projetos / seções CRUD ---- */
const projFields = [
  {k:'nome', l:'Nome', req:1, foco:1},
  {k:'icone', l:'Emoji do projeto', meia:1, def:'📁'},
  {k:'area_id', t:'sel', l:'Área da vida (obrigatória)', meia:1, req:1, opts: () => optsAreas(true)},
  {k:'status', t:'sel', l:'Status', meia:1, opts:[['ativo','ativo'],['pausado','pausado'],['concluido','concluído'],['arquivado','arquivado']].map(([v,t])=>({v,t}))},
  {k:'prazo', t:'date', l:'Prazo', meia:1}
];
const resolveOpts = fields => fields.map(f => ({...f, opts: typeof f.opts === 'function' ? f.opts() : f.opts}));
act('proj-add', () => { closeModal(); editModal({ titulo:'Novo projeto', fields: resolveOpts(projFields),
  onSave: v => { const p = dbUpsert('projetos', v); nav('tarefas/projeto/'+p.id); } }); });
act('proj-edit', el => {
  const p = byId('projetos', el.dataset.id);
  editModal({ titulo:'Editar projeto', fields: resolveOpts(projFields), vals: p,
    onSave: v => { dbPatch('projetos', p.id, v); render(); },
    onDelete: () => {
      const secs = T('secoes').filter(s => s.projeto_id === p.id);
      T('tarefas').filter(t => t.projeto_id === p.id).forEach(t => dbPatch('tarefas', t.id, {projeto_id:null, secao_id:null}));
      secs.forEach(s => dbDelete('secoes', s.id));
      dbDelete('projetos', p.id);
      nav('tarefas');
      toast('Projeto excluído. As tarefas foram para a caixa de entrada.');
    } });
});
act('sec-add', el => {
  const pid = el.dataset.id;
  editModal({ titulo:'Nova seção', fields:[{k:'nome', l:'Nome', req:1, foco:1, ph:'ex.: Backlog / Fazendo / Feito'}],
    onSave: v => { dbUpsert('secoes', {projeto_id: pid, nome: v.nome, ordem: T('secoes').filter(s=>s.projeto_id===pid).length}); render(); } });
});
act('sec-edit', el => {
  const s = byId('secoes', el.dataset.id);
  const irmas = ordenar(T('secoes').filter(x => x.projeto_id === s.projeto_id), x => x.ordem||0);
  const idx = irmas.findIndex(x => x.id === s.id);
  editModal({ titulo:'Seção', fields:[{k:'nome', l:'Nome', req:1, foco:1}], vals: s,
    extra: '<div class="row" style="margin-bottom:10px"><button type="button" class="btn small" data-act="sec-move" data-id="'+s.id+'" data-d="-1"'+(idx<=0?' disabled':'')+'>↑ subir</button>'
      + '<button type="button" class="btn small" data-act="sec-move" data-id="'+s.id+'" data-d="1"'+(idx>=irmas.length-1?' disabled':'')+'>↓ descer</button></div>',
    onSave: v => { dbPatch('secoes', s.id, v); render(); },
    onDelete: () => { T('tarefas').filter(t => t.secao_id === s.id).forEach(t => dbPatch('tarefas', t.id, {secao_id:null}));
      dbDelete('secoes', s.id); render(); toast('Seção excluída (tarefas mantidas no projeto).'); } });
});
act('sec-move', el => {
  const s = byId('secoes', el.dataset.id); const d = Number(el.dataset.d);
  const irmas = ordenar(T('secoes').filter(x => x.projeto_id === s.projeto_id), x => x.ordem||0);
  const i = irmas.findIndex(x => x.id === s.id), j = i + d;
  if (j < 0 || j >= irmas.length) return;
  dbPatch('secoes', irmas[i].id, {ordem:j}); dbPatch('secoes', irmas[j].id, {ordem:i});
  closeModal(); render();
});

/* ---- drag & drop (desktop) ---- */
let _dragTaskId = null;
function bindTaskDnD() {
  $$('.task[draggable]').forEach(el => {
    el.addEventListener('dragstart', () => { _dragTaskId = el.dataset.tid; el.classList.add('dragging'); });
    el.addEventListener('dragend', () => { el.classList.remove('dragging'); $$('.drag-over').forEach(x => x.classList.remove('drag-over')); });
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => { e.preventDefault(); soltarTarefa(el.dataset.tid, el.closest('.sec-body')); });
  });
  $$('.sec-body').forEach(sec => {
    sec.addEventListener('dragover', e => { e.preventDefault(); sec.classList.add('drag-over'); });
    sec.addEventListener('dragleave', () => sec.classList.remove('drag-over'));
    sec.addEventListener('drop', e => { e.preventDefault(); if (e.target.closest('.task')) return; soltarTarefa(null, sec); });
  });
}
function soltarTarefa(antesDeId, secBody) {
  if (!_dragTaskId || !secBody) return;
  const secId = secBody.dataset.sec || null;
  const projId = secBody.dataset.proj;
  const ids = $$('.sec-body[data-sec="'+(secId||'')+'"] .task').map(el => el.dataset.tid).filter(i => i !== _dragTaskId);
  const pos = antesDeId ? ids.indexOf(antesDeId) : ids.length;
  ids.splice(pos < 0 ? ids.length : pos, 0, _dragTaskId);
  ids.forEach((tid, i) => { const t = byId('tarefas', tid); if (!t) return;
    const patch = {ordem: i*10};
    if (tid === _dragTaskId) { patch.secao_id = secId; patch.projeto_id = projId; }
    dbPatch('tarefas', tid, patch);
  });
  _dragTaskId = null;
  render();
}

/* ---- FAB: nova tarefa ---- */
act('qa-tarefa', () => {
  closeModal();
  modal('<div class="bx-h"><div class="h2">✅ Nova tarefa</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + quickAddHTML({ph:'ex.: Reunião sexta 14:30 #trabalho @urgente p1'})
    + '<p class="tiny muted" style="margin:10px 2px 0">Entendo: <kbd>amanhã</kbd> <kbd>sexta 14:30</kbd> <kbd>d30</kbd> (duração) <kbd>a cada 3 dias</kbd> <kbd>dia 15</kbd> <kbd>#projeto</kbd> <kbd>@etiqueta</kbd> <kbd>p1</kbd>–<kbd>p4</kbd></p>'
    + '<div class="bx-foot"><button class="btn primary" data-act="qa-sub-modal">Criar tarefa</button></div>',
    { onMount: ov => setTimeout(() => { const i = ov.querySelector('#qa-inp'); if (i) i.focus(); }, 80) });
});
act('qa-sub-modal', () => {
  const inp = $('#qa-inp'); const p = parseNL(inp.value);
  if (!p.titulo) { toast('Escreva o título da tarefa.', {icone:'✍️'}); return; }
  acFechar();
  const concluir = () => { criarTarefaParseada(p, {}); closeModal(); render(); };
  if (p.projetoDesconhecido) ofereceCriarProjeto(p, concluir); else concluir();
});
/* ════════════════ ETAPA 4 — HÁBITOS (3 tipos, streaks, heatmap, fonte_auto) ════════════════ */
const regDoDia = (h, data) => T('habito_registros').find(r => r.habito_id === h.id && r.data === (data || hoje()));
const diaAtivo = (h, data) => (h.dias_ativos && h.dias_ativos.length ? h.dias_ativos : [0,1,2,3,4,5,6]).includes(pDate(data).getDay());
function diaFeito(h, data) {
  const r = regDoDia(h, data); if (!r) return false;
  if (h.tipo === 'quantidade') return Number(r.valor) >= Number(h.meta_quantidade || 1);
  return Number(r.valor) > 0;
}
const habitosAtivos = () => T('habitos').filter(h => h.ativo !== false);

/* streaks (regra 2): diário quebra em dia ativo sem registro (tolerância perdoa 1 a cada 7 dias ativos);
   semanal conta semanas cumpridas; recorde preservado sempre */
function streakDiario(h) {
  const regs = T('habito_registros').filter(r => r.habito_id === h.id);
  if (!regs.length) return { atual: 0, recorde: 0 };
  const primeiro = regs.reduce((a, r) => r.data < a ? r.data : a, hoje());
  // dias ativos do primeiro registro até hoje
  const dias = [];
  for (let d = primeiro; d <= hoje(); d = addDias(d, 1)) if (diaAtivo(h, d)) dias.push(d);
  let recorde = 0, run = 0, desdePerdao = 99;
  for (const d of dias) {
    desdePerdao++;
    if (diaFeito(h, d)) { run++; }
    else if (d === hoje()) { /* hoje ainda não conta como quebra */ }
    else if (h.tolerancia_streak && run > 0 && desdePerdao >= 7) { desdePerdao = 0; }
    else { run = 0; }
    if (run > recorde) recorde = run;
  }
  return { atual: run, recorde };
}
function streakSemanal(h) {
  const regs = T('habito_registros').filter(r => r.habito_id === h.id && Number(r.valor) > 0);
  if (!regs.length) return { atual: 0, recorde: 0, estaSemana: 0 };
  const porSemana = {};
  for (const r of regs) porSemana[inicioSemana(r.data)] = (porSemana[inicioSemana(r.data)] || 0) + 1;
  const alvo = h.freq_semanal || 1;
  const semanaAtual = inicioSemana(hoje());
  const primeiro = regs.reduce((a, r) => r.data < a ? r.data : a, hoje());
  let recorde = 0, run = 0;
  for (let s = inicioSemana(primeiro); s <= semanaAtual; s = addDias(s, 7)) {
    const ok = (porSemana[s] || 0) >= alvo;
    if (ok) run++;
    else if (s !== semanaAtual) run = 0; // semana corrente em andamento não quebra
    if (run > recorde) recorde = run;
  }
  return { atual: run, recorde, estaSemana: porSemana[semanaAtual] || 0 };
}
function habitoStreak(h) { return h.tipo === 'semanal' ? streakSemanal(h) : streakDiario(h); }

/* marcar / desmarcar (manual) — regra 3: fonte_auto nunca manual */
function marcarHabito(h, delta, data) {
  data = data || hoje();
  if (h.fonte_auto) { toast('Este hábito é automático — registre '+({treino:'um treino 🏋️',corrida:'uma corrida 🏃',leitura:'páginas lidas 📖'}[h.fonte_auto]||'no módulo')+' e ele marca sozinho.', {icone:'🔗'}); return false; }
  const reg = regDoDia(h, data);
  if (h.tipo === 'quantidade') {
    const novo = Math.max(0, (reg ? Number(reg.valor) : 0) + (delta === undefined ? 1 : delta));
    if (reg) dbPatch('habito_registros', reg.id, { valor: novo });
    else dbUpsert('habito_registros', { habito_id: h.id, data, valor: novo });
    if (novo >= Number(h.meta_quantidade || 1)) toast(h.icone + ' ' + esc(h.nome) + ': meta do dia batida! 🔥', {icone:'🎯'});
  } else {
    if (reg) dbDelete('habito_registros', reg.id);
    else { dbUpsert('habito_registros', { habito_id: h.id, data, valor: 1 });
      const s = habitoStreak(h); if (s.atual >= 2) toast('🔥 ' + s.atual + (h.tipo==='semanal'?' semanas':' dias') + ' seguidos de ' + esc(h.nome) + '!'); }
  }
  if (window.checkConquistas) checkConquistas('habito');
  return true;
}
/* integração automática (treino / corrida / leitura) — seção 4 */
function autoHabito(fonte, valor) {
  habitosAtivos().filter(h => h.fonte_auto === fonte).forEach(h => {
    const reg = regDoDia(h);
    if (h.tipo === 'quantidade') {
      const novo = (reg ? Number(reg.valor) : 0) + (valor || 1);
      if (reg) dbPatch('habito_registros', reg.id, { valor: novo });
      else dbUpsert('habito_registros', { habito_id: h.id, data: hoje(), valor: novo });
    } else if (!reg) {
      dbUpsert('habito_registros', { habito_id: h.id, data: hoje(), valor: valor || 1 });
    }
  });
}

/* chips de hábitos (Hoje + página) — 1 toque */
function habitoChipsHTML() {
  const hs = habitosAtivos().filter(h => h.tipo === 'semanal' || diaAtivo(h, hoje()));
  if (!hs.length) return '';
  return '<div class="row wrap">' + hs.map(h => {
    const feito = h.tipo === 'semanal' ? !!regDoDia(h) : diaFeito(h, hoje());
    const reg = regDoDia(h);
    let extra = '';
    if (h.tipo === 'quantidade') extra = ' ' + fmtNum(reg ? reg.valor : 0) + '/' + fmtNum(h.meta_quantidade||1);
    if (h.tipo === 'semanal') { const s = streakSemanal(h); extra = ' ' + s.estaSemana + '/' + (h.freq_semanal||1) + ' sem.'; }
    return '<span class="chip'+(feito?' done':'')+'" data-act="hab-marcar" data-id="'+h.id+'">'+h.icone+' '+esc(h.nome)+extra+(h.fonte_auto?' 🔗':'')+'</span>';
  }).join('') + '</div>';
}
act('hab-marcar', el => {
  const h = byId('habitos', el.dataset.id); if (!h) return;
  if (h.tipo === 'quantidade' && Number(h.meta_quantidade) > 1 && !h.fonte_auto) {
    const reg = regDoDia(h);
    modal('<div class="bx-h"><div class="h2">'+h.icone+' '+esc(h.nome)+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
      + '<p class="muted small" style="margin-top:0">Hoje: <b>'+fmtNum(reg?reg.valor:0)+'</b> / '+fmtNum(h.meta_quantidade)+' '+esc(h.unidade||'')+'</p>'
      + '<div class="row"><button class="btn big" data-act="hab-qtd" data-id="'+h.id+'" data-d="1">+1</button>'
      + '<button class="btn big" data-act="hab-qtd" data-id="'+h.id+'" data-d="-1">−1</button></div>'
      + '<form class="row" style="margin-top:10px" data-sub="hab-qtd-livre" data-id="'+h.id+'">'
      + '<input class="input" type="number" step="any" id="hab-qtd-inp" placeholder="quantidade…" style="flex:1"><button class="btn primary" type="submit">Somar</button></form>');
  } else {
    const antes = regDoDia(h) ? {...regDoDia(h)} : null;
    if (marcarHabito(h)) render();
  }
});
act('hab-qtd', el => { const h = byId('habitos', el.dataset.id); marcarHabito(h, Number(el.dataset.d)); closeModal(); render(); });
act('hab-qtd-livre', form => { const h = byId('habitos', form.dataset.id); const v = Number($('#hab-qtd-inp').value);
  if (v) { marcarHabito(h, v); } closeModal(); render(); });

/* heatmap de um hábito */
function heatmapHabito(h, nDias) {
  const porDia = {};
  T('habito_registros').filter(r => r.habito_id === h.id).forEach(r => porDia[r.data] = Number(r.valor) || 0);
  const meta = h.tipo === 'quantidade' ? Number(h.meta_quantidade || 1) : 1;
  return heatmapHTML(porDia, nDias || 91, v => v >= meta ? 4 : v >= meta*0.66 ? 3 : v >= meta*0.33 ? 2 : v > 0 ? 1 : 0);
}

/* página HÁBITOS */
reg('habitos', {
  titulo: 'Hábitos',
  render: () => {
    const hs = habitosAtivos();
    const arquivados = T('habitos').filter(h => h.ativo === false);
    let html = '<div class="row" style="margin-bottom:10px"><div class="h1" style="flex:1">🔁 Hábitos</div><button class="btn primary small" data-act="hab-add">+ Hábito</button></div>';
    html += '<div class="card"><div class="h3">Hoje</div>' + (habitoChipsHTML() || '<span class="muted small">Nenhum hábito para hoje.</span>') + '</div>';
    html += hs.map(h => {
      const s = habitoStreak(h);
      const tipoLabel = h.tipo === 'diario' ? 'diário' : h.tipo === 'semanal' ? (h.freq_semanal||1)+'×/semana' : fmtNum(h.meta_quantidade||1)+' '+esc(h.unidade||'')+'/dia';
      const recomeço = s.atual === 0 && s.recorde > 0;
      return '<div class="card"><div class="card-h"><span style="font-size:22px">'+h.icone+'</span>'
        + '<div style="flex:1"><div class="h2" style="margin:0">'+esc(h.nome)+(h.fonte_auto?' <span class="badge acc">auto 🔗</span>':'')+'</div>'
        + '<div class="tiny muted">'+tipoLabel+' · '+(areaDe(h.area_id)?areaDe(h.area_id).nome:'sem área')+(h.tolerancia_streak?' · tolerância ✓':'')+'</div></div>'
        + '<div class="center"><div style="font-size:17px;font-weight:800">'+(s.atual>0?'<span class="fire">🔥</span> '+s.atual:'—')+'</div><div class="tiny muted">recorde '+s.recorde+'</div></div>'
        + '<button class="iconbtn" data-act="hab-edit" data-id="'+h.id+'">✏️</button></div>'
        + (recomeço ? '<div class="banner acc" style="margin:4px 0 10px">🌱 Recomeço faz parte. Seu recorde de <b>'+s.recorde+(h.tipo==='semanal'?' semanas':' dias')+'</b> continua seu.</div>' : '')
        + heatmapHabito(h) + '</div>';
    }).join('') || '<div class="card"><div class="empty"><span class="em">🔁</span>Crie seu primeiro hábito — pequeno e fácil de manter.</div></div>';
    if (arquivados.length) html += '<details class="help"><summary>📦 Arquivados ('+arquivados.length+')</summary><div class="row wrap" style="margin-top:8px">'
      + arquivados.map(h => '<span class="chip" data-act="hab-edit" data-id="'+h.id+'">'+h.icone+' '+esc(h.nome)+'</span>').join('') + '</div></details>';
    return html;
  }
});
const habFields = () => [
  {k:'nome', l:'Nome', req:1, foco:1, ph:'ex.: Meditar'},
  {k:'icone', l:'Ícone (emoji)', meia:1, def:'✅'},
  {k:'area_id', t:'sel', l:'Área', meia:1, opts: optsAreas()},
  {k:'tipo', t:'sel', l:'Tipo', opts:[{v:'diario',t:'Diário (marcar o dia)'},{v:'semanal',t:'Semanal (X vezes por semana)'},{v:'quantidade',t:'Quantidade por dia (ex.: 8 copos)'}]},
  {k:'meta_quantidade', t:'num', l:'Meta por dia (se quantidade)', meia:1},
  {k:'unidade', l:'Unidade', meia:1, ph:'copos, páginas…'},
  {k:'freq_semanal', t:'num', l:'Vezes por semana (se semanal)', meia:1},
  {k:'fonte_auto', t:'sel', l:'Marcação automática', meia:1, opts:[{v:'',t:'manual'},{v:'treino',t:'🏋️ ao registrar treino'},{v:'corrida',t:'🏃 ao registrar corrida'},{v:'leitura',t:'📖 ao registrar leitura'}], dica:'hábito automático nunca é marcado à mão'},
  {k:'tolerancia_streak', t:'chk', l:'Tolerância no streak', dica:'perdoa 1 falha a cada 7 dias ativos'}
];
function diasAtivosChips(sel) {
  return '<div class="field"><label>Dias ativos</label><div class="row wrap" id="hab-dias">'
    + DIAS_SEM.map((d,i) => '<span class="chip mini'+((sel||[0,1,2,3,4,5,6]).includes(i)?' sel':'')+'" data-act="td-rec-dia" data-d="'+i+'">'+d+'</span>').join('') + '</div></div>';
}
act('hab-add', () => editModal({ titulo:'Novo hábito', fields: habFields(), extra: diasAtivosChips(null),
  onSave: v => { v.dias_ativos = $$('#hab-dias .chip.sel').map(c => Number(c.dataset.d)); if (!v.dias_ativos.length) v.dias_ativos = [0,1,2,3,4,5,6];
    v.fonte_auto = v.fonte_auto || null; v.ativo = true; dbUpsert('habitos', v); render(); } }));
act('hab-edit', el => {
  const h = byId('habitos', el.dataset.id);
  editModal({ titulo:'Editar hábito', fields: habFields(), vals: h, extra: diasAtivosChips(h.dias_ativos)
      + '<button type="button" class="btn small'+(h.ativo===false?' ok':'')+'" data-act="hab-arq" data-id="'+h.id+'" style="margin-bottom:10px">'+(h.ativo===false?'▶️ Reativar hábito':'📦 Arquivar hábito (pausa sem perder histórico)')+'</button>',
    onSave: v => { v.dias_ativos = $$('#hab-dias .chip.sel').map(c => Number(c.dataset.d)); if (!v.dias_ativos.length) v.dias_ativos = [0,1,2,3,4,5,6];
      v.fonte_auto = v.fonte_auto || null; dbPatch('habitos', h.id, v); render(); },
    onDelete: () => {
      const regs = T('habito_registros').filter(r => r.habito_id === h.id);
      const bkpH = {...h}, bkpR = regs.map(r => ({...r}));
      regs.forEach(r => dbDelete('habito_registros', r.id));
      dbDelete('habitos', h.id); render();
      toast('Hábito e histórico excluídos.', {undo: () => { dbUpsert('habitos', bkpH); bkpR.forEach(r => dbUpsert('habito_registros', r)); render(); }});
    } });
});
act('hab-arq', el => { const h = byId('habitos', el.dataset.id); dbPatch('habitos', h.id, {ativo: h.ativo === false}); closeModal(); render(); });

/* FAB: hábito */
act('qa-habito', () => {
  closeModal();
  modal('<div class="bx-h"><div class="h2">🔁 Marcar hábito</div><button class="btn small" data-act="hab-add-close">+ Novo</button></div>'
    + (habitoChipsHTML() || '<div class="empty"><span class="em">🔁</span>Nenhum hábito ainda.</div>'));
});
act('hab-add-close', () => { closeModal(); Actions['hab-add'](); });
/* ════════════════ ETAPA 5 — TELA HOJE v1 (tarefas + hábitos + agenda + timer + capacidade) ════════════════ */
const HojeExtras = { alertas: [], cartoes: [] }; // módulos posteriores se penduram aqui

/* ---- blocos: helpers ---- */
const blocoMin = b => Math.max(0, (new Date(b.fim) - new Date(b.inicio)) / 60000);
const blocosDoDia = data => T('blocos').filter(b => dISO(new Date(b.inicio)) === data);
function isoLocal(data, hora) { const d = pDate(data); const [h, m] = String(hora||'00:00').split(':').map(Number); d.setHours(h, m||0, 0, 0); return d.toISOString(); }
const horaDe = iso => { const d = new Date(iso); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };

/* ---- capacidade do dia (regra 14 — nunca bloqueia) ---- */
function capacidadeDia(data) {
  data = data || hoje();
  const janela = Math.max(1, Number(getCfg('janela_util', 8))) * 60;
  const bs = blocosDoDia(data);
  const comBloco = new Set(bs.map(b => b.tarefa_id).filter(Boolean));
  let min = 0;
  for (const t of tarefasPendentes().filter(t => t.vencimento === data)) if (!comBloco.has(t.id)) min += Number(t.estimativa_min) || 0;
  for (const b of bs) min += blocoMin(b);
  return { min, janela, pct: min / janela };
}
function capacidadeHTML(data) {
  const c = capacidadeDia(data);
  const cls = c.pct > 1 ? 'err' : c.pct > 0.8 ? 'warn' : 'ok';
  return '<div class="card" style="padding:12px 16px"><div class="row" style="margin-bottom:6px">'
    + '<span class="small bold">Capacidade do dia</span><span class="sp"></span>'
    + '<span class="small '+cls+'">'+fmtMin(c.min)+' de '+fmtMin(c.janela)+(c.pct>1?' — acima do realista ⚠️':'')+'</span></div>'
    + '<div class="bar thick"><i class="'+cls+'" style="width:'+clamp(c.pct*100,2,100)+'%"></i></div>'
    + (c.pct > 1 ? '<div class="tiny warn" style="margin-top:6px">Planejar demais é o caminho do abandono — considere reagendar algo.</div>' : '')
    + '</div>';
}

/* ---- agenda do dia (05h–24h) ---- */
const H_INI = 5, H_FIM = 24, PXH = 52;
function agendaDiaHTML(data) {
  data = data || hoje();
  let horas = '';
  for (let h = H_INI; h < H_FIM; h++) horas += '<div class="tl-hour" data-act="bloco-novo-hora" data-data="'+data+'" data-h="'+h+'"><span class="hh">'+pad2(h)+'h</span></div>';
  let evs = '';
  for (const b of blocosDoDia(data)) {
    const ini = new Date(b.inicio), fim = new Date(b.fim);
    const top = (ini.getHours() - H_INI) * PXH + ini.getMinutes() * PXH / 60;
    const alt = Math.max(20, (fim - ini) / 36e5 * PXH - 2);
    const cor = corArea(b.area_id);
    evs += '<div class="tl-ev" data-act="bloco-edit" data-id="'+b.id+'" style="top:'+top+'px;height:'+alt+'px;background:'+cor+'1f;border-color:'+cor+'66;color:'+cor+'">'
      + (b.foco?'🎯 ':'')+esc(b.titulo)+'<div class="t">'+horaDe(b.inicio)+'–'+horaDe(b.fim)+(b.tempo_real_min?' · real '+fmtMin(b.tempo_real_min):'')+'</div></div>';
  }
  for (const t of tarefasPendentes().filter(t => t.vencimento === data && t.hora)) {
    const [h, m] = t.hora.split(':').map(Number);
    if (h < H_INI) continue;
    const top = (h - H_INI) * PXH + (m||0) * PXH / 60;
    evs += '<div class="tl-task" style="top:'+top+'px" title="tarefa com hora">'
      + '<span data-act="task-open" data-id="'+t.id+'" style="flex:1">⏰ '+fmtHora(t.hora)+' · '+esc(t.titulo)+'</span>'
      + '<button class="iconbtn" data-act="task-to-bloco" data-id="'+t.id+'" title="virar bloco com duração">⤵</button></div>';
  }
  let agora = '';
  if (data === hoje()) {
    const n = new Date();
    if (n.getHours() >= H_INI) agora = '<div class="tl-now" style="top:'+((n.getHours()-H_INI)*PXH + n.getMinutes()*PXH/60)+'px"></div>';
  }
  return '<div class="tl-wrap"><div class="timeline" data-agenda-dia="'+data+'">'+horas+evs+agora+'</div></div>';
}
act('bloco-novo-hora', (el, e) => {
  if (e.target.closest('.tl-ev,.tl-task')) return;
  blocoModal(null, { data: el.dataset.data, inicio: pad2(el.dataset.h)+':00', fim: pad2(Math.min(23, Number(el.dataset.h)+1))+':00' });
});
act('task-to-bloco', el => {
  const t = byId('tarefas', el.dataset.id); if (!t || !t.hora) return;
  const dur = Number(t.estimativa_min) || 60;
  const ini = isoLocal(t.vencimento, t.hora);
  const b = dbUpsert('blocos', { titulo: t.titulo, area_id: t.area_id, projeto_id: t.projeto_id, tarefa_id: t.id,
    inicio: ini, fim: new Date(new Date(ini).getTime() + dur*60000).toISOString(), foco: false });
  toast('Bloco criado na agenda ✓', {icone:'📅', undo: () => { dbDelete('blocos', b.id); render(); }});
  render();
});
function blocoModal(b, defs) {
  const v = b ? { titulo:b.titulo, area_id:b.area_id||'', tarefa_id:b.tarefa_id||'', data: dISO(new Date(b.inicio)), inicio: horaDe(b.inicio), fim: horaDe(b.fim), foco: !!b.foco }
              : { data: hoje(), inicio:'09:00', fim:'10:00', ...(defs||{}) };
  const fields = [
    {k:'titulo', l:'Título', req:1, foco:1, ph:'ex.: Deep work — projeto X'},
    {k:'area_id', t:'sel', l:'Área', opts: optsAreas()},
    {k:'tarefa_id', t:'sel', l:'Tarefa vinculada', opts: [{v:'',t:'— nenhuma —'}].concat(tarefasPendentes().slice(0,80).map(t => ({v:t.id, t:t.titulo})))},
    {k:'data', t:'date', l:'Data', meia:1},
    {k:'inicio', t:'time', l:'Início', meia:1},
    {k:'fim', t:'time', l:'Fim', meia:1},
    {k:'foco', t:'chk', l:'Bloco de foco 🎯'}
  ];
  editModal({ titulo: b ? 'Editar bloco' : 'Novo bloco', fields, vals: v,
    onSave: nv => {
      if (!nv.inicio || !nv.fim) { toast('Defina início e fim.'); return; }
      const row = { id: b ? b.id : undefined, titulo: nv.titulo, area_id: nv.area_id||null, projeto_id: b ? b.projeto_id : null,
        tarefa_id: nv.tarefa_id||null, inicio: isoLocal(nv.data, nv.inicio), fim: isoLocal(nv.data, nv.fim >= nv.inicio ? nv.fim : nv.inicio),
        tempo_real_min: b ? b.tempo_real_min : null, foco: !!nv.foco, template: b ? b.template : null };
      dbUpsert('blocos', row); render();
    },
    onDelete: b ? () => { const bkp = {...b}; dbDelete('blocos', b.id); render();
      toast('Bloco excluído.', {undo: () => { dbUpsert('blocos', bkp); render(); }}); } : null });
}
act('bloco-edit', el => blocoModal(byId('blocos', el.dataset.id)));
act('qa-bloco', () => { closeModal(); blocoModal(null); });

/* ---- TIMER persistente (livre / pomodoro / foco — regra 7) ---- */
const TIMER_LS = 'lifeos.timer';
let TIMER = null;
try { TIMER = JSON.parse(localStorage.getItem(TIMER_LS) || 'null'); } catch(_) {}
const timerSalvar = () => { if (TIMER) localStorage.setItem(TIMER_LS, JSON.stringify(TIMER)); else localStorage.removeItem(TIMER_LS); };
function beep() {
  try { const ctx = new (window.AudioContext||window.webkitAudioContext)(); const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; g.gain.value = .07; o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 300);
  } catch(_) {}
  if (navigator.vibrate) navigator.vibrate(180);
}
function timerIniciar(o) {
  const cfgF = Number(getCfg('pomo_foco',25)), cfgP = Number(getCfg('pomo_pausa',5));
  TIMER = { modo: o.modo||'livre', inicio: Date.now(), inicioFase: Date.now(), fase:'foco', acumFoco: 0,
    rotulo: o.rotulo || (o.modo==='pomo'?'Pomodoro':o.modo==='foco'?'Foco':'Tempo livre'),
    tarefa_id: o.tarefa_id||null, area_id: o.area_id||null, alvoFoco: cfgF, alvoPausa: cfgP, alvoMin: o.alvoMin||null };
  timerSalvar(); renderTimerPill();
  if (o.modo === 'foco') abrirFoco();
}
function timerMinTrabalhados() {
  if (!TIMER) return 0;
  if (TIMER.modo === 'pomo') return (TIMER.acumFoco||0) + (TIMER.fase==='foco' ? (Date.now()-TIMER.inicioFase)/60000 : 0);
  return (Date.now() - TIMER.inicio) / 60000;
}
function textoTimer() {
  if (!TIMER) return '';
  if (TIMER.modo === 'pomo') {
    const alvo = (TIMER.fase==='foco' ? TIMER.alvoFoco : TIMER.alvoPausa) * 60;
    const resta = Math.max(0, alvo - (Date.now()-TIMER.inicioFase)/1000);
    return (TIMER.fase==='foco'?'':'☕ ') + fmtDur(resta);
  }
  return fmtDur((Date.now() - TIMER.inicio)/1000);
}
function timerParar(salvar) {
  if (!TIMER) return;
  const t = TIMER, min = Math.round(timerMinTrabalhados());
  TIMER = null; timerSalvar(); renderTimerPill();
  fecharFoco();
  if (salvar && min >= 1) {
    const fim = new Date(), ini = new Date(fim.getTime() - min*60000);
    const tarefa = t.tarefa_id ? byId('tarefas', t.tarefa_id) : null;
    dbUpsert('blocos', { titulo: t.rotulo, area_id: t.area_id || (tarefa ? tarefa.area_id : null),
      projeto_id: tarefa ? tarefa.projeto_id : null, tarefa_id: t.tarefa_id,
      inicio: ini.toISOString(), fim: fim.toISOString(), tempo_real_min: min, foco: t.modo === 'foco' });
    toast('⏱️ ' + fmtMin(min) + ' registrados' + (t.modo==='foco' ? ' em foco 🎯' : '') + '.');
    if (tarefa && !tarefa.concluida) {
      modal('<div class="bx-h"><div class="h2">Bloco encerrado</div></div>'
        + '<p>Concluir a tarefa <b>'+esc(tarefa.titulo)+'</b>?</p>'
        + '<div class="bx-foot"><button class="btn ghost" data-act="m-close">Ainda não</button>'
        + '<button class="btn primary" data-act="timer-concluir-tarefa" data-id="'+tarefa.id+'">✓ Concluir</button></div>');
    }
  } else if (!salvar) toast('Timer descartado.');
  render();
}
act('timer-concluir-tarefa', el => { closeModal(); concluirTarefa(el.dataset.id); });
function renderTimerPill() {
  const el = $('#timerpill'); if (!el) return;
  if (!TIMER) { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = 'block';
  el.innerHTML = '<div class="pill" data-act="timer-abrir"><span>'+(TIMER.modo==='pomo'?'🍅':TIMER.modo==='foco'?'🎯':'⏱️')+'</span>'
    + '<b id="tp-tempo">'+textoTimer()+'</b><span class="lbl">'+esc(TIMER.rotulo)+'</span></div>';
}
act('timer-abrir', () => {
  if (!TIMER) return;
  modal('<div class="bx-h"><div class="h2">'+(TIMER.modo==='pomo'?'🍅 Pomodoro':TIMER.modo==='foco'?'🎯 Foco':'⏱️ Timer')+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="center" style="margin:8px 0 16px"><div style="font-size:42px;font-weight:800;font-variant-numeric:tabular-nums" id="tm-big">'+textoTimer()+'</div>'
    + '<div class="muted small">'+esc(TIMER.rotulo)+(TIMER.modo==='pomo'?' · ciclo de '+TIMER.alvoFoco+'/'+TIMER.alvoPausa+' min':'')+'</div></div>'
    + '<div class="col">'
    + '<button class="btn primary big" data-act="timer-stop-salvar">✓ Parar e salvar ('+fmtMin(timerMinTrabalhados())+')</button>'
    + (TIMER.modo!=='pomo' ? '<button class="btn big" data-act="timer-tela-cheia">🎯 Tela cheia</button>' : '')
    + '<button class="btn ghost big" data-act="timer-descartar">🗑 Descartar</button></div>');
});
act('timer-stop-salvar', () => { closeModal(); timerParar(true); });
act('timer-descartar', () => { closeModal(); timerParar(false); });
act('timer-tela-cheia', () => { closeModal(); abrirFoco(); });
act('timer-start', el => {
  const sel = $('#tm-tarefa');
  const tid = sel && sel.value || null;
  const tarefa = tid ? byId('tarefas', tid) : null;
  timerIniciar({ modo: el.dataset.m, tarefa_id: tid, rotulo: tarefa ? tarefa.titulo : undefined, area_id: tarefa ? tarefa.area_id : null });
  render();
});

/* foco em tela cheia (atrito positivo para sair) */
function abrirFoco() {
  fecharFoco();
  const f = document.createElement('div');
  f.className = 'focus-full'; f.id = 'focofull';
  document.body.appendChild(f);
  desenharFoco();
}
function fecharFoco() { const f = $('#focofull'); if (f) f.remove(); }
function desenharFoco() {
  const f = $('#focofull'); if (!f || !TIMER) { fecharFoco(); return; }
  const alvo = (TIMER.alvoMin || (TIMER.modo==='pomo' ? (TIMER.fase==='foco'?TIMER.alvoFoco:TIMER.alvoPausa) : 50)) * 60;
  const el = TIMER.modo==='pomo' ? (Date.now()-TIMER.inicioFase)/1000 : (Date.now()-TIMER.inicio)/1000;
  f.innerHTML = '<div class="muted small">'+(TIMER.fase==='pausa'?'☕ pausa':'🎯 em foco')+'</div>'
    + '<div class="ringwrap">'+svgAnel(Math.min(1, el/alvo), {r:108, sw:11, cor: TIMER.fase==='pausa'?'var(--ok)':'var(--acc)'})
    + '<div class="mid"><div class="tm">'+textoTimer()+'</div><div class="muted small" style="max-width:200px">'+esc(TIMER.rotulo)+'</div></div></div>'
    + '<div class="row"><button class="btn" data-act="foco-sair">Sair</button><button class="btn primary" data-act="timer-stop-salvar">✓ Concluir bloco</button></div>';
}
act('foco-sair', () => {
  modal('<div class="bx-h"><div class="h2">Sair do foco?</div></div><p class="muted small" style="margin-top:0">Sem punição — mas que tal mais 5 minutos?</p>'
    + '<div class="bx-foot"><button class="btn ghost" data-act="m-close">Continuar focado</button>'
    + '<button class="btn" data-act="foco-minimizar">Minimizar (timer segue)</button>'
    + '<button class="btn primary" data-act="timer-stop-salvar">Parar e salvar</button></div>');
});
act('foco-minimizar', () => { closeModal(); fecharFoco(); });
setInterval(() => {
  if (!TIMER) return;
  const tp = $('#tp-tempo'); if (tp) tp.textContent = textoTimer();
  const big = $('#tm-big'); if (big) big.textContent = textoTimer();
  if ($('#focofull')) desenharFoco();
  if (TIMER.modo === 'pomo') {
    const alvo = (TIMER.fase==='foco' ? TIMER.alvoFoco : TIMER.alvoPausa) * 60;
    if ((Date.now() - TIMER.inicioFase)/1000 >= alvo) {
      beep();
      if (TIMER.fase === 'foco') { TIMER.acumFoco = (TIMER.acumFoco||0) + TIMER.alvoFoco; TIMER.fase = 'pausa'; toast('🍅 Ciclo completo! Pausa de '+TIMER.alvoPausa+' min ☕'); }
      else { TIMER.fase = 'foco'; toast('🍅 De volta ao foco!'); }
      TIMER.inicioFase = Date.now(); timerSalvar(); renderTimerPill();
    }
  }
}, 1000);

/* ---- TELA HOJE ---- */
function timerCardHTML() {
  if (TIMER) {
    return '<div class="card"><div class="row"><span style="font-size:20px">'+(TIMER.modo==='pomo'?'🍅':TIMER.modo==='foco'?'🎯':'⏱️')+'</span>'
      + '<div class="grow"><b id="tm-big">'+textoTimer()+'</b><div class="tiny muted">'+esc(TIMER.rotulo)+'</div></div>'
      + '<button class="btn small primary" data-act="timer-stop-salvar">✓ Parar</button>'
      + '<button class="btn small" data-act="timer-tela-cheia">🎯</button></div></div>';
  }
  const tarefasHoje = tarefasPendentes().filter(t => t.vencimento && t.vencimento <= hoje());
  return '<div class="card"><div class="row wrap">'
    + '<select class="select" id="tm-tarefa" style="flex:1;min-width:150px"><option value="">⏱️ Timer — vincular tarefa (opcional)</option>'
    + tarefasHoje.map(t => '<option value="'+t.id+'">'+esc(t.titulo)+'</option>').join('') + '</select>'
    + '<button class="btn" data-act="timer-start" data-m="livre">▶ Livre</button>'
    + '<button class="btn" data-act="timer-start" data-m="pomo">🍅 Pomodoro</button>'
    + '<button class="btn" data-act="timer-start" data-m="foco">🎯 Foco</button></div></div>';
}
reg('hoje', {
  titulo: 'Hoje',
  render: () => {
    const h = new Date().getHours();
    const nome = getCfg('nome','');
    const saud = (h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite') + (nome ? ', ' + esc(nome) : '') + '!';
    const pend = tarefasPendentes();
    const atrasadas = ordenar(pend.filter(t => t.vencimento && t.vencimento < hoje()), t => t.vencimento);
    const deHoje = ordenar(pend.filter(t => t.vencimento === hoje()), ordTarefa);
    const habPend = habitosAtivos().filter(hb => (hb.tipo === 'semanal' ? !regDoDia(hb) : (diaAtivo(hb, hoje()) && !diaFeito(hb, hoje())))).length;
    const cap = capacidadeDia();
    let html = '<div class="h1">'+saud+'</div>'
      + '<p class="muted small" style="margin:-2px 0 12px">'+ucfirst(fmtData(hoje(),{semHoje:1}))+' · '
      + deHoje.length+' tarefa'+(deHoje.length===1?'':'s')+(atrasadas.length?' <span class="err">(+'+atrasadas.length+' atrasadas)</span>':'')
      + ' · '+habPend+' hábito'+(habPend===1?'':'s')+' pendente'+(habPend===1?'':'s')+' · '+fmtMin(cap.min)+' planejadas</p>';
    for (const fn of HojeExtras.alertas) { try { html += fn() || ''; } catch(e) {} }
    if (window.ritualBotoesHTML) html += ritualBotoesHTML();
    html += capacidadeHTML();
    if (window.insightDoDiaHTML) { try { html += insightDoDiaHTML() || ''; } catch(e) {} }
    html += '<div class="row wrap" style="margin-bottom:14px">'
      + '<button class="btn" data-act="qa-treino">🏋️ Treino de hoje</button>'
      + '<button class="btn" data-act="qa-corrida">🏃 Corrida</button>'
      + '<button class="btn" data-act="qa-leitura">📖 Leitura</button>'
      + '<button class="btn" data-act="qa-gasto">💸 Gasto</button></div>';
    html += '<div class="grid2"><div>'
      + '<div class="card">'+quickAddHTML({def_venc: hoje(), ph:'+ tarefa para hoje… (ex.: ligar médico 15h p2)'})+'</div>';
    if (atrasadas.length) html += '<div class="card pad0"><div class="sec-head" style="padding:10px 14px 2px"><span class="err">⏰ Atrasadas — decida o destino</span></div><div class="list" style="padding:0 10px 8px">'
      + atrasadas.slice(0, 6).map(t => taskItemHTML(t, {rollover:true})).join('')
      + (atrasadas.length > 6 ? '<div class="tiny muted center" style="padding:6px">+'+(atrasadas.length-6)+' na visão Tarefas</div>' : '') + '</div></div>';
    html += '<div class="card pad0"><div class="sec-head" style="padding:10px 14px 2px">✅ Tarefas de hoje</div><div class="list hoje-tarefas" style="padding:0 10px 8px">'
      + (deHoje.map(t => taskItemHTML(t, {drag:true})).join('') || '<div class="empty" style="padding:18px"><span class="em">🌤️</span>Dia limpo. Adicione acima ou planeje com o ritual.</div>') + '</div></div>'
      + '<div class="card"><div class="h3">🔁 Hábitos de hoje</div>'+(habitoChipsHTML() || '<span class="muted small">Nenhum hábito ativo.</span>')+'</div>'
      + timerCardHTML();
    for (const fn of HojeExtras.cartoes) { try { html += fn() || ''; } catch(e) {} }
    html += '</div><div><div class="card"><div class="card-h"><div class="h2">📅 Agenda do dia</div><button class="btn small" data-act="qa-bloco">+ Bloco</button></div>'
      + agendaDiaHTML() + '</div></div></div>';
    return html;
  },
  mount: () => {
    if (window._qaRefoco) { window._qaRefoco = false; const i = $('#qa-inp'); if (i) i.focus(); }
    // arrastar tarefa → agenda (time-blocking)
    $$('.hoje-tarefas .task[draggable]').forEach(el => {
      el.addEventListener('dragstart', () => { _dragTaskId = el.dataset.tid; el.classList.add('dragging'); });
      el.addEventListener('dragend', () => el.classList.remove('dragging'));
    });
    $$('.tl-hour').forEach(hr => {
      hr.addEventListener('dragover', e => { e.preventDefault(); hr.classList.add('drag-over'); });
      hr.addEventListener('dragleave', () => hr.classList.remove('drag-over'));
      hr.addEventListener('drop', e => {
        e.preventDefault(); hr.classList.remove('drag-over');
        const t = byId('tarefas', _dragTaskId); if (!t) return;
        const dur = Number(t.estimativa_min) || 60;
        const ini = isoLocal(hr.dataset.data, pad2(hr.dataset.h)+':00');
        dbUpsert('blocos', { titulo: t.titulo, area_id: t.area_id, projeto_id: t.projeto_id, tarefa_id: t.id,
          inicio: ini, fim: new Date(new Date(ini).getTime()+dur*60000).toISOString(), foco:false });
        _dragTaskId = null;
        toast('Bloco criado para "'+esc(t.titulo)+'" ✓', {icone:'📅'});
        render();
      });
    });
  }
});
/* ════════════════ ETAPA 6 — RITUAL DIÁRIO (planejar / encerrar — opcional, sem punição) ════════════════ */
const diaRow = data => byId('dias', data || hoje());
function ritualBotoesHTML() {
  const d = diaRow() || {};
  return '<div class="row" style="margin-bottom:14px">'
    + '<button class="btn '+(d.planejado?'ok':'primary')+'" data-act="ritual-planejar" style="flex:1">'+(d.planejado?'✓ Dia planejado':'▶ Planejar o dia')+'</button>'
    + '<button class="btn '+(d.encerrado?'ok':'')+'" data-act="ritual-encerrar" style="flex:1">'+(d.encerrado?'✓ Dia encerrado':'◼ Encerrar o dia')+'</button></div>';
}
/* ---- Planejar (manhã, ~2 min) ---- */
act('ritual-planejar', () => {
  window._ritPasso = tarefasPendentes().some(t => t.vencimento && t.vencimento < hoje()) ? 1 : 2;
  modal('<div id="rit-box"></div>', { onMount: () => ritDraw(), fixo: true });
});
function ritDraw() {
  const box = $('#rit-box'); if (!box) return;
  const passo = window._ritPasso;
  const dots = '<div class="steps-dots">'+[1,2,3].map(i => '<i class="'+(i===passo?'on':'')+'"></i>').join('')+'</div>';
  if (passo === 1) {
    const atras = ordenar(tarefasPendentes().filter(t => t.vencimento && t.vencimento < hoje()), t => t.vencimento);
    if (!atras.length) { window._ritPasso = 2; ritDraw(); return; }
    box.innerHTML = '<div class="bx-h"><div class="h2">☀️ 1/3 · Tarefas vencidas</div><button class="iconbtn" data-act="m-close">✕</button></div>'
      + '<p class="muted small" style="margin-top:0">Rollover consciente: decida o destino de cada uma. Abandonar é legítimo.</p>'
      + '<div class="list">' + atras.map(t => taskItemHTML(t, {rollover:true})).join('') + '</div>'
      + '<div class="bx-foot"><button class="btn primary" data-act="rit-prox">Continuar →</button></div>' + dots;
  } else if (passo === 2) {
    const cap = capacidadeDia();
    const cls = cap.pct > 1 ? 'err' : cap.pct > 0.8 ? 'warn' : 'ok';
    const deHoje = ordenar(tarefasPendentes().filter(t => t.vencimento === hoje()), t => t.prioridade||4);
    const backlog = ordenar(tarefasPendentes().filter(t => !t.vencimento), t => t.prioridade||4).slice(0, 20);
    const linha = (t, sel) => '<div class="item" data-act="rit-toggle" data-id="'+t.id+'" style="padding:8px 4px">'
      + '<span class="check p'+(t.prioridade||4)+(sel?' ck':'')+'" style="border-radius:6px"></span>'
      + '<div class="grow"><div class="ttl">'+esc(t.titulo)+'</div><div class="sub">'+(t.estimativa_min?'⏳ '+fmtMin(t.estimativa_min):'sem estimativa')+(t.hora?' · ⏰'+fmtHora(t.hora):'')+'</div></div></div>';
    box.innerHTML = '<div class="bx-h"><div class="h2">☀️ 2/3 · O que cabe no dia?</div><button class="iconbtn" data-act="m-close">✕</button></div>'
      + '<div style="position:sticky;top:-18px;background:var(--card);padding:6px 0;z-index:2"><div class="row" style="margin-bottom:4px"><span class="small bold">Capacidade</span><span class="sp"></span><span class="small '+cls+'">'+fmtMin(cap.min)+' / '+fmtMin(cap.janela)+'</span></div>'
      + '<div class="bar"><i class="'+cls+'" style="width:'+clamp(cap.pct*100,2,100)+'%"></i></div></div>'
      + '<div class="sec-head">Para hoje ('+deHoje.length+') — toque para tirar</div><div class="list">'+(deHoje.map(t => linha(t, true)).join('')||'<span class="tiny muted">nada ainda</span>')+'</div>'
      + '<div class="sec-head">Backlog (sem data) — toque para puxar</div><div class="list">'+(backlog.map(t => linha(t, false)).join('')||'<span class="tiny muted">backlog vazio</span>')+'</div>'
      + '<div class="bx-foot"><button class="btn primary" data-act="rit-prox">Continuar →</button></div>' + dots;
  } else {
    const p1s = tarefasPendentes().filter(t => t.vencimento === hoje() && (t.prioridade||4) === 1);
    const comBloco = new Set(blocosDoDia(hoje()).map(b => b.tarefa_id).filter(Boolean));
    const semBloco = p1s.filter(t => !comBloco.has(t.id));
    box.innerHTML = '<div class="bx-h"><div class="h2">☀️ 3/3 · Blocos para as P1</div><button class="iconbtn" data-act="m-close">✕</button></div>'
      + (semBloco.length
        ? '<p class="muted small" style="margin-top:0">Reservar horário para o mais importante multiplica a chance de acontecer.</p><div class="list">'
          + semBloco.map(t => { const slot = proximoSlotLivre(Number(t.estimativa_min)||60);
            return '<div class="item" style="cursor:default"><div class="grow"><div class="ttl">'+esc(t.titulo)+'</div><div class="sub">P1 · '+(t.estimativa_min?fmtMin(t.estimativa_min):'60min')+'</div></div>'
              + '<button class="btn small primary" data-act="rit-bloco" data-id="'+t.id+'" data-slot="'+slot+'">📅 '+slot.slice(11,16)+'</button></div>'; }).join('') + '</div>'
        : '<div class="empty"><span class="em">'+(p1s.length?'👏':'🧘')+'</span>'+(p1s.length?'Todas as P1 de hoje já têm bloco na agenda.':'Sem P1 hoje — dia de fluxo.')+'</div>')
      + '<div class="bx-foot"><button class="btn primary big" data-act="rit-fim">✓ Começar o dia</button></div>' + dots;
  }
}
function proximoSlotLivre(durMin) {
  const ocup = blocosDoDia(hoje()).map(b => [new Date(b.inicio).getTime(), new Date(b.fim).getTime()]);
  const agora = new Date();
  let ini = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), Math.max(H_INI, agora.getHours()), agora.getMinutes() < 30 ? 30 : 0);
  if (agora.getMinutes() >= 30) ini.setHours(ini.getHours() + 1);
  if (ini < agora) ini = new Date(agora.getTime() + 10*60000);
  for (let i = 0; i < 36; i++) {
    const fim = new Date(ini.getTime() + durMin*60000);
    if (fim.getHours() >= H_FIM && fim.getMinutes() > 0) break;
    const livre = !ocup.some(([a, b]) => ini.getTime() < b && fim.getTime() > a);
    if (livre) return ini.toISOString();
    ini = new Date(ini.getTime() + 30*60000);
  }
  return ini.toISOString();
}
act('rit-prox', () => { window._ritPasso++; ritDraw(); });
act('rit-toggle', el => {
  const t = byId('tarefas', el.dataset.id); if (!t) return;
  dbPatch('tarefas', t.id, { vencimento: t.vencimento === hoje() ? null : hoje() });
  ritDraw();
});
act('rit-bloco', el => {
  const t = byId('tarefas', el.dataset.id); if (!t) return;
  const ini = el.dataset.slot, dur = Number(t.estimativa_min) || 60;
  dbUpsert('blocos', { titulo: t.titulo, area_id: t.area_id, projeto_id: t.projeto_id, tarefa_id: t.id,
    inicio: ini, fim: new Date(new Date(ini).getTime() + dur*60000).toISOString(), foco: false });
  toast('Bloco criado ✓', {icone:'📅'});
  ritDraw();
});
act('rit-fim', () => {
  dbUpsert('dias', { data: hoje(), ...(diaRow()||{}), planejado: true });
  closeModal(true); render();
  toast('Dia planejado. Agora é executar — um passo de cada vez. 💪', {ms:4500});
});
/* ---- Encerrar (noite, ~30 s) ---- */
act('ritual-encerrar', () => {
  const d = diaRow() || {};
  const feitas = T('tarefas').filter(t => t.concluida && (t.concluida_em||'').slice(0,10) === hoje()).length;
  const habs = habitosAtivos().filter(h => h.tipo !== 'semanal' && diaAtivo(h, hoje()));
  const habsOk = habs.filter(h => diaFeito(h, hoje())).length + habitosAtivos().filter(h => h.tipo==='semanal' && regDoDia(h)).length;
  const minFoco = sum(blocosDoDia(hoje()).filter(b => b.tempo_real_min).map(b => b.tempo_real_min));
  const escala = (nome, val, emojis) => '<div class="field"><label>'+nome+'</label><div class="row">'
    + [1,2,3,4,5].map(n => '<button type="button" class="chip'+(val===n?' sel':'')+'" data-rit-esc="'+nome+'" data-v="'+n+'" style="flex:1;justify-content:center">'+emojis[n-1]+'</button>').join('')+'</div></div>';
  modal('<div class="bx-h"><div class="h2">🌙 Encerrar o dia</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="row" style="margin-bottom:12px"><div class="kpi" style="flex:1"><div class="l">tarefas</div><div class="v">'+feitas+'</div></div>'
    + '<div class="kpi" style="flex:1"><div class="l">hábitos</div><div class="v">'+habsOk+'</div></div>'
    + '<div class="kpi" style="flex:1"><div class="l">tempo real</div><div class="v" style="font-size:17px">'+fmtMin(minFoco)+'</div></div></div>'
    + escala('Energia', d.energia, ['🪫','😴','😐','🙂','⚡'])
    + escala('Humor', d.humor, ['😞','😕','😐','🙂','😄'])
    + '<div class="field"><label>Nota do dia (opcional)</label><textarea class="textarea" id="rit-nota" rows="2" placeholder="o que vale lembrar de hoje?">'+esc(d.nota||'')+'</textarea></div>'
    + '<div class="bx-foot"><button class="btn ghost" data-act="m-close">Depois</button><button class="btn primary" data-act="rit-encerrar-save">✓ Fechar o dia</button></div>',
    { onMount: ov => {
        ov._energia = d.energia || null; ov._humor = d.humor || null;
        ov.addEventListener('click', e => {
          const b = e.target.closest('[data-rit-esc]'); if (!b) return;
          const grupo = b.dataset.ritEsc;
          if (grupo === 'Energia') ov._energia = Number(b.dataset.v); else ov._humor = Number(b.dataset.v);
          ov.querySelectorAll('[data-rit-esc="'+grupo+'"]').forEach(c => c.classList.toggle('sel', c === b));
        });
      } });
});
act('rit-encerrar-save', el => {
  const ov = el.closest('.overlay');
  dbUpsert('dias', { data: hoje(), ...(diaRow()||{}), energia: ov._energia, humor: ov._humor,
    nota: $('#rit-nota').value.trim() || null, encerrado: true });
  closeModal(); render();
  toast((ov._energia && ov._energia <= 2 ? 'Dia pesado — descansar também é progresso. 🌙' : 'Dia fechado. Até amanhã! 🌙'), {ms:4200});
});
/* ════════════════ ETAPA 7 — MUSCULAÇÃO (registro pós-treino, sem timer de descanso) ════════════════ */
const GRUPOS_MUSC = ['Peito','Costas','Pernas','Ombros','Bíceps','Tríceps','Core','Glúteos','Panturrilha','Outro'];
const repsPadrao = () => Math.max(1, Number(getCfg('reps_padrao', 10)));
const epley = (carga, reps) => carga * (1 + reps / 30); // exibido sempre como ESTIMATIVA (regra 8)
const exsDaPlanilha = pid => ordenar(T('treino_exercicios').filter(e => e.planilha_id === pid), e => e.ordem||0);
const regsDaSessao = sid => T('treino_registros').filter(r => r.sessao_id === sid);
function ultimaSessao(planilhaId) {
  return ordenar(T('treino_sessoes').filter(s => s.planilha_id === planilhaId), s => s.data + (s.criado_em||''), true)[0] || null;
}
function maxCargaHistorica(exNome, ateSessaoId) {
  let max = 0;
  for (const r of T('treino_registros')) {
    if (r.exercicio_nome !== exNome || r.sessao_id === ateSessaoId) continue;
    if (Number(r.carga_max) > max) max = Number(r.carga_max);
  }
  return max;
}

/* ---- registro do treino do dia (~1 min) ---- */
act('qa-treino', () => {
  closeModal();
  const pls = ordenar(T('treino_planilhas').filter(p => p.ativo !== false), p => p.ordem||0);
  if (!pls.length) { toast('Crie uma planilha primeiro (página Treino).', {icone:'🏋️'}); nav('treino'); return; }
  modal('<div class="bx-h"><div class="h2">🏋️ Qual treino você fez?</div><button class="iconbtn" data-act="m-close">✕</button></div><div class="col">'
    + pls.map(p => { const ult = ultimaSessao(p.id);
      return '<button class="btn big" data-act="treino-form" data-id="'+p.id+'" style="justify-content:space-between">'
        + '<span>'+esc(p.nome)+'</span><span class="tiny muted">'+(ult ? 'último: '+fmtData(ult.data) : 'nunca feito')+'</span></button>'; }).join('')
    + '</div>');
});
act('treino-form', el => {
  const p = byId('treino_planilhas', el.dataset.id); if (!p) return;
  const exs = exsDaPlanilha(p.id);
  const ult = ultimaSessao(p.id);
  const ultRegs = ult ? regsDaSessao(ult.id) : [];
  const refDe = ex => ultRegs.find(r => r.exercicio_id === ex.id) || ultRegs.find(r => r.exercicio_nome === ex.nome);
  closeModal();
  modal('<div class="bx-h"><div class="h2">🏋️ '+esc(p.nome)+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + (ult ? '<p class="tiny muted" style="margin-top:0">Valores da última sessão ('+fmtData(ult.data)+') já preenchidos — ajuste só o que mudou.</p>' : '')
    + '<div class="frow"><div class="field"><label>Data</label><input type="date" class="input" id="tr-data" value="'+hoje()+'"></div></div>'
    + exs.map(ex => { const ref = refDe(ex);
      return '<div style="border-top:1px solid var(--border);padding:9px 0" data-ex="'+ex.id+'" data-nome="'+esc(ex.nome)+'">'
        + '<div class="row" style="margin-bottom:6px"><b class="small">'+esc(ex.nome)+'</b><span class="tiny muted">'+esc(ex.grupo_muscular||'')+' · alvo '+(ex.series_alvo||3)+'×</span>'
        + (ex.observacao ? '<span class="tiny muted" title="'+esc(ex.observacao)+'">ℹ️</span>' : '') + '</div>'
        + '<div class="row"><input class="input" type="number" step="any" inputmode="decimal" data-carga placeholder="carga (kg)" value="'+(ref && ref.carga_max != null ? ref.carga_max : '')+'" style="flex:1">'
        + '<input class="input" type="number" inputmode="numeric" data-series placeholder="séries" value="'+(ref && ref.series_feitas != null ? ref.series_feitas : (ex.series_alvo||3))+'" style="width:84px">'
        + '<input class="input" data-obs placeholder="obs" value="" style="flex:1"></div></div>'; }).join('')
    + (exs.length ? '' : '<div class="empty">Esta planilha não tem exercícios — edite-a na página Treino.</div>')
    + '<div class="field" style="margin-top:10px"><label>Nota da sessão</label><input class="input" id="tr-nota" placeholder="como foi?"></div>'
    + '<div class="bx-foot"><button class="btn ghost" data-act="m-close">Cancelar</button>'
    + '<button class="btn primary big" data-act="treino-salvar" data-pl="'+p.id+'">✓ Salvar treino</button></div>', { wide:true });
});
act('treino-salvar', el => {
  const ov = el.closest('.overlay');
  const data = ov.querySelector('#tr-data').value || hoje();
  const linhas = [...ov.querySelectorAll('[data-ex]')].map(div => ({
    exercicio_id: div.dataset.ex, exercicio_nome: div.dataset.nome,
    carga_max: div.querySelector('[data-carga]').value === '' ? null : Number(div.querySelector('[data-carga]').value),
    series_feitas: div.querySelector('[data-series]').value === '' ? null : Number(div.querySelector('[data-series]').value),
    observacao: div.querySelector('[data-obs]').value.trim() || null
  })).filter(l => l.carga_max != null || l.series_feitas != null);
  if (!linhas.length) { toast('Preencha pelo menos um exercício.', {icone:'🏋️'}); return; }
  const sessao = dbUpsert('treino_sessoes', { planilha_id: el.dataset.pl, data, nota: ov.querySelector('#tr-nota').value.trim() || null });
  const prs = [];
  for (const l of linhas) {
    if (l.carga_max != null && l.carga_max > 0 && l.carga_max > maxCargaHistorica(l.exercicio_nome, sessao.id)) prs.push(l.exercicio_nome + ' ' + fmtNum(l.carga_max,1) + 'kg');
    dbUpsert('treino_registros', { sessao_id: sessao.id, ...l });
  }
  autoHabito('treino', 1);
  closeModal(true);
  toast('Treino registrado ✓ ('+linhas.length+' exercícios)', {icone:'🏋️', undo: () => {
    regsDaSessao(sessao.id).forEach(r => dbDelete('treino_registros', r.id));
    dbDelete('treino_sessoes', sessao.id); render();
  }});
  if (prs.length) setTimeout(() => toast('🏆 PR! ' + prs.join(' · '), {ms:6000}), 700);
  if (window.checkConquistas) checkConquistas('treino');
  render();
});

/* ---- página TREINO ---- */
reg('treino', {
  titulo: 'Treino',
  render: (params) => {
    const sessoes = ordenar(T('treino_sessoes'), s => s.data + (s.criado_em||''), true);
    const exNomes = [...new Set(T('treino_registros').filter(r => r.carga_max != null).map(r => r.exercicio_nome))].sort();
    const exSel = params[0] === 'ex' ? decodeURIComponent(params[1]) : (window._trEx || exNomes[0] || '');
    window._trEx = exSel;
    let html = '<div class="row" style="margin-bottom:10px"><div class="h1" style="flex:1">🏋️ Treino</div>'
      + '<button class="btn primary" data-act="qa-treino">+ Registrar treino</button></div>';
    // planilhas
    html += '<div class="grid2">' + ordenar(T('treino_planilhas').filter(p => p.ativo !== false), p => p.ordem||0).map(p => {
      const exs = exsDaPlanilha(p.id); const ult = ultimaSessao(p.id);
      const n = T('treino_sessoes').filter(s => s.planilha_id === p.id).length;
      return '<div class="card"><div class="card-h"><div class="h2">'+esc(p.nome)+'</div><button class="iconbtn" data-act="planilha-edit" data-id="'+p.id+'">✏️</button></div>'
        + '<div class="tiny muted" style="margin-bottom:8px">'+exs.length+' exercícios · '+n+' sessões · '+(ult?'último '+fmtData(ult.data):'nunca feito')+'</div>'
        + '<div class="tiny muted" style="margin-bottom:10px">'+exs.slice(0,5).map(e => esc(e.nome)).join(' · ')+(exs.length>5?' …':'')+'</div>'
        + '<button class="btn small primary" data-act="treino-form" data-id="'+p.id+'">Registrar este treino</button></div>';
    }).join('') + '</div>'
    + '<button class="btn small" data-act="planilha-add" style="margin-bottom:14px">+ Nova planilha</button>';
    // análise por exercício
    if (exNomes.length) {
      const regs = T('treino_registros').filter(r => r.exercicio_nome === exSel && r.carga_max != null)
        .map(r => ({ ...r, data: (byId('treino_sessoes', r.sessao_id)||{}).data })).filter(r => r.data);
      const serie = ordenar(regs, r => r.data).map(r => ({ x: fmtDataCurta(r.data), y: Number(r.carga_max) }));
      const max = Math.max(...regs.map(r => Number(r.carga_max)), 0);
      const ult = serie.length ? serie[serie.length-1].y : 0;
      const reps = repsPadrao();
      html += '<div class="card"><div class="card-h"><div class="h2">📈 Evolução de carga</div>'
        + '<select class="select" style="max-width:230px" data-chg="treino-ex-sel">'+exNomes.map(n => '<option'+(n===exSel?' selected':'')+'>'+esc(n)+'</option>').join('')+'</select></div>'
        + svgLinha(serie, { fmt: v => fmtNum(v,1)+'kg' })
        + '<div class="row wrap" style="margin-top:10px">'
        + '<span class="badge acc">carga atual '+fmtNum(ult,1)+'kg</span>'
        + '<span class="badge warn">🏆 recorde '+fmtNum(max,1)+'kg</span>'
        + '<span class="badge">1RM estimado (Epley, '+reps+' reps): <b>'+fmtNum(epley(ult, reps),1)+'kg</b></span>'
        + '</div><div class="tiny muted" style="margin-top:6px">1RM é estimativa de referência, nunca prescrição. Ajuste as repetições padrão em Config.</div></div>';
    }
    // volume por sessão
    const ultimas = sessoes.slice(0, 12).reverse();
    if (ultimas.length) {
      const reps = repsPadrao();
      const vol = ultimas.map(s => ({ x: fmtDataCurta(s.data), y: Math.round(sum(regsDaSessao(s.id).map(r => (Number(r.carga_max)||0) * (Number(r.series_feitas)||0) * reps)) / 1000) }));
      html += '<div class="card"><div class="h2">🔢 Volume aproximado por sessão <span class="tiny muted">(t = carga×séries×'+reps+' reps)</span></div>'
        + svgBarras(vol, { fmt: v => v+'t' }) + '</div>';
    }
    // frequência
    const porDia = {}; sessoes.forEach(s => porDia[s.data] = (porDia[s.data]||0) + 1);
    const nSem = T('treino_sessoes').filter(s => s.data >= inicioSemana(hoje())).length;
    html += '<div class="card"><div class="card-h"><div class="h2">📅 Frequência</div><span class="badge ok">'+nSem+' nesta semana</span><span class="badge">'+sessoes.length+' no total</span></div>'
      + heatmapHTML(porDia, 119, v => v ? 4 : 0) + '</div>';
    // histórico
    html += '<div class="card pad0"><div class="sec-head" style="padding:12px 14px 4px">Histórico</div><div class="list" style="padding:0 10px 8px">'
      + (sessoes.slice(0, 30).map(s => { const pl = byId('treino_planilhas', s.planilha_id);
        return '<div class="item" data-act="sessao-abrir" data-id="'+s.id+'"><span>🏋️</span><div class="grow"><div class="ttl">'+esc(pl?pl.nome:'Treino')+'</div>'
          + '<div class="sub">'+fmtData(s.data)+' · '+regsDaSessao(s.id).length+' exercícios'+(s.nota?' · '+esc(s.nota):'')+'</div></div></div>'; }).join('')
      || '<div class="empty"><span class="em">🏋️</span>Nenhum treino ainda. Registrar leva ~1 minuto.</div>') + '</div></div>';
    return html;
  }
});
act('treino-ex-sel', el => { window._trEx = el.value; render(); });
act('sessao-abrir', el => {
  const s = byId('treino_sessoes', el.dataset.id); if (!s) return;
  const pl = byId('treino_planilhas', s.planilha_id);
  const regs = regsDaSessao(s.id);
  modal('<div class="bx-h"><div class="h2">🏋️ '+esc(pl?pl.nome:'Treino')+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<p class="muted small" style="margin-top:0">'+fmtData(s.data)+(s.nota?' · '+esc(s.nota):'')+'</p>'
    + '<table class="tbl"><tr><th>Exercício</th><th class="num">Carga</th><th class="num">Séries</th></tr>'
    + regs.map(r => '<tr><td>'+esc(r.exercicio_nome)+(r.observacao?'<div class="tiny muted">'+esc(r.observacao)+'</div>':'')+'</td>'
      + '<td class="num">'+(r.carga_max!=null?fmtNum(r.carga_max,1)+'kg':'—')+'</td><td class="num">'+(r.series_feitas??'—')+'</td></tr>').join('')+'</table>'
    + '<div class="bx-foot"><button class="btn danger" data-act="sessao-del" data-id="'+s.id+'">Excluir sessão</button><span class="sp"></span><button class="btn" data-act="m-close">Fechar</button></div>');
});
act('sessao-del', el => {
  const s = byId('treino_sessoes', el.dataset.id);
  confirmBox('Excluir esta sessão e seus registros?', () => {
    const bkpS = {...s}, bkpR = regsDaSessao(s.id).map(r => ({...r}));
    bkpR.forEach(r => dbDelete('treino_registros', r.id));
    dbDelete('treino_sessoes', s.id);
    closeModal(true); render();
    toast('Sessão excluída.', {undo: () => { dbUpsert('treino_sessoes', bkpS); bkpR.forEach(r => dbUpsert('treino_registros', r)); render(); }});
  }, {perigo:1, sim:'Excluir'});
});

/* ---- editor de planilha ---- */
act('planilha-add', () => editModal({ titulo:'Nova planilha', fields:[{k:'nome', l:'Nome', req:1, foco:1, ph:'ex.: Treino C — Pernas'}],
  onSave: v => { const p = dbUpsert('treino_planilhas', { nome: v.nome, ordem: T('treino_planilhas').length, ativo: true }); render(); Actions['planilha-edit']({dataset:{id:p.id}}); } }));
act('planilha-edit', el => {
  const p = byId('treino_planilhas', el.dataset.id); if (!p) return;
  const exs = exsDaPlanilha(p.id);
  modal('<div class="bx-h"><div class="h2">✏️ '+esc(p.nome)+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="field"><label>Nome</label><input class="input" id="pl-nome" value="'+esc(p.nome)+'"></div>'
    + '<div class="field"><label>Exercícios (em ordem)</label><div class="list">'
    + exs.map((ex, i) => '<div class="item" style="cursor:default"><div class="grow"><div class="ttl">'+esc(ex.nome)+'</div>'
      + '<div class="sub">'+esc(ex.grupo_muscular||'')+' · '+(ex.series_alvo||3)+'× '+(ex.observacao?' · '+esc(ex.observacao):'')+'</div></div>'
      + '<button class="iconbtn" data-act="ex-move" data-id="'+ex.id+'" data-d="-1"'+(i===0?' disabled':'')+'>↑</button>'
      + '<button class="iconbtn" data-act="ex-move" data-id="'+ex.id+'" data-d="1"'+(i===exs.length-1?' disabled':'')+'>↓</button>'
      + '<button class="iconbtn" data-act="ex-edit" data-id="'+ex.id+'">✏️</button></div>').join('')
    + (exs.length ? '' : '<span class="muted tiny">nenhum exercício</span>') + '</div></div>'
    + '<button class="btn small" data-act="ex-add" data-pl="'+p.id+'">+ Exercício</button>'
    + '<div class="bx-foot"><button class="btn danger" data-act="planilha-del" data-id="'+p.id+'">Excluir</button><span class="sp"></span>'
    + '<button class="btn primary" data-act="planilha-save" data-id="'+p.id+'">Salvar</button></div>', { wide:true });
});
act('planilha-save', el => { dbPatch('treino_planilhas', el.dataset.id, { nome: $('#pl-nome').value.trim() || 'Planilha' }); closeModal(); render(); });
act('planilha-del', el => {
  const p = byId('treino_planilhas', el.dataset.id);
  confirmBox('Excluir a planilha "'+esc(p.nome)+'"? O histórico de sessões é preservado (nomes de exercícios ficam gravados nos registros).', () => {
    exsDaPlanilha(p.id).forEach(ex => dbDelete('treino_exercicios', ex.id));
    dbDelete('treino_planilhas', p.id);
    closeModal(true); render();
  }, {perigo:1, sim:'Excluir'});
});
const exFields = [
  {k:'nome', l:'Nome', req:1, foco:1, ph:'ex.: Supino reto'},
  {k:'grupo_muscular', t:'sel', l:'Grupo muscular', meia:1, opts: GRUPOS_MUSC},
  {k:'series_alvo', t:'num', l:'Séries-alvo', meia:1, def:3},
  {k:'observacao', l:'Observação técnica', ph:'ex.: pegada fechada, 2s na descida'}
];
act('ex-add', el => { const pid = el.dataset.pl;
  editModal({ titulo:'Novo exercício', fields: exFields,
    onSave: v => { dbUpsert('treino_exercicios', { planilha_id: pid, ...v, ordem: exsDaPlanilha(pid).length }); closeModal(true); render(); Actions['planilha-edit']({dataset:{id:pid}}); } }); });
act('ex-edit', el => {
  const ex = byId('treino_exercicios', el.dataset.id);
  editModal({ titulo:'Exercício', fields: exFields, vals: ex,
    onSave: v => { dbPatch('treino_exercicios', ex.id, v); closeModal(true); render(); Actions['planilha-edit']({dataset:{id:ex.planilha_id}}); },
    onDelete: () => { dbDelete('treino_exercicios', ex.id); closeModal(true); render(); Actions['planilha-edit']({dataset:{id:ex.planilha_id}}); } });
});
act('ex-move', el => {
  const ex = byId('treino_exercicios', el.dataset.id); const d = Number(el.dataset.d);
  const irmaos = exsDaPlanilha(ex.planilha_id);
  const i = irmaos.findIndex(x => x.id === ex.id), j = i + d;
  if (j < 0 || j >= irmaos.length) return;
  dbPatch('treino_exercicios', irmaos[i].id, {ordem: j}); dbPatch('treino_exercicios', irmaos[j].id, {ordem: i});
  closeModal(true); Actions['planilha-edit']({dataset:{id:ex.planilha_id}});
});
/* ════════════════ ETAPA 8 — CORRIDA + CORPO ════════════════ */
const paceSeg = c => c.distancia_km > 0 ? c.tempo_seg / c.distancia_km : 0;
const paceFmt = segKm => { if (!segKm || !isFinite(segKm)) return '—'; const m = Math.floor(segKm/60), s = Math.round(segKm%60); return m + ':' + pad2(s) + '/km'; };
const TIPOS_CORRIDA = ['leve','longo','intervalado','ritmo','prova','outro'];

act('qa-corrida', () => {
  closeModal();
  modal('<div class="bx-h"><div class="h2">🏃 Registrar corrida</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="frow"><div class="field"><label>Distância (km) *</label><input class="input" id="cr-km" type="number" step="any" inputmode="decimal" data-inp="cr-pace" autofocus></div>'
    + '<div class="field"><label>Tempo (mm:ss ou hh:mm:ss) *</label><input class="input" id="cr-tempo" placeholder="52:30" data-inp="cr-pace"></div></div>'
    + '<div class="banner acc" id="cr-pace-out" style="margin-bottom:12px">Pace: —</div>'
    + '<div class="frow"><div class="field"><label>Data</label><input class="input" type="date" id="cr-data" value="'+hoje()+'"></div>'
    + '<div class="field"><label>Tipo</label><select class="select" id="cr-tipo">'+TIPOS_CORRIDA.map(t => '<option>'+t+'</option>').join('')+'</select></div></div>'
    + '<div class="field"><label>Percepção de esforço (1 fácil – 10 máximo)</label><div class="row"><input type="range" min="1" max="10" value="5" id="cr-perc" style="flex:1;accent-color:var(--acc)" data-inp="cr-perc-out"><b id="cr-perc-v">5</b></div></div>'
    + '<div class="field"><label>Nota</label><input class="input" id="cr-nota" placeholder="como foi?"></div>'
    + '<div class="bx-foot"><button class="btn ghost" data-act="m-close">Cancelar</button><button class="btn primary" data-act="corrida-salvar">✓ Salvar corrida</button></div>');
});
act('cr-pace', () => {
  const km = Number($('#cr-km').value), seg = parseTempo($('#cr-tempo').value);
  $('#cr-pace-out').textContent = (km > 0 && seg > 0) ? 'Pace: ' + paceFmt(seg/km) + ' · ' + fmtDur(seg) + ' para ' + fmtNum(km,2) + ' km' : 'Pace: —';
});
act('cr-perc-out', el => { $('#cr-perc-v').textContent = el.value; });
act('corrida-salvar', () => {
  const km = Number($('#cr-km').value), seg = parseTempo($('#cr-tempo').value);
  if (!(km > 0) || !(seg > 0)) { toast('Preencha distância e tempo.', {icone:'🏃'}); return; }
  const antes = recordesCorrida();
  const c = dbUpsert('corridas', { data: $('#cr-data').value || hoje(), distancia_km: km, tempo_seg: seg,
    percepcao: Number($('#cr-perc').value) || null, tipo: $('#cr-tipo').value, nota: $('#cr-nota').value.trim() || null });
  autoHabito('corrida', km);
  closeModal();
  toast('🏃 ' + fmtNum(km,2) + ' km @ ' + paceFmt(seg/km) + ' registrados ✓', { undo: () => { dbDelete('corridas', c.id); render(); } });
  const dep = recordesCorrida();
  const novos = [];
  if (dep.maiorKm > antes.maiorKm) novos.push('maior distância: '+fmtNum(dep.maiorKm,2)+'km');
  if (antes.melhorPace && dep.melhorPace < antes.melhorPace) novos.push('melhor pace: '+paceFmt(dep.melhorPace));
  if (novos.length) setTimeout(() => toast('🏆 Recorde! ' + novos.join(' · '), {ms:6000}), 700);
  if (window.checkConquistas) checkConquistas('corrida');
  render();
});
function recordesCorrida() {
  const cs = T('corridas');
  const out = { maiorKm: 0, melhorPace: null, melhorPace5: null, maisKmMes: 0, maisKmSemana: 0, total: 0 };
  const porMes = {}, porSem = {};
  for (const c of cs) {
    const km = Number(c.distancia_km) || 0;
    out.total += km;
    if (km > out.maiorKm) out.maiorKm = km;
    const p = paceSeg(c);
    if (km >= 1 && p > 0 && (out.melhorPace === null || p < out.melhorPace)) out.melhorPace = p;
    if (km >= 5 && p > 0 && (out.melhorPace5 === null || p < out.melhorPace5)) out.melhorPace5 = p;
    porMes[mesDe(c.data)] = (porMes[mesDe(c.data)] || 0) + km;
    porSem[inicioSemana(c.data)] = (porSem[inicioSemana(c.data)] || 0) + km;
  }
  for (const m in porMes) if (porMes[m] > out.maisKmMes) out.maisKmMes = porMes[m];
  for (const s in porSem) if (porSem[s] > out.maisKmSemana) out.maisKmSemana = porSem[s];
  return out;
}

/* ---- CORPO ---- */
const MEDIDAS = [['cintura','Cintura'],['quadril','Quadril'],['peito','Peito'],['braco','Braço'],['coxa','Coxa']];
act('qa-peso', () => {
  closeModal();
  const ult = ordenar(T('corpo_registros'), r => r.data, true)[0];
  modal('<div class="bx-h"><div class="h2">⚖️ Peso e medidas</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="frow"><div class="field"><label>Peso (kg)</label><input class="input" id="cp-peso" type="number" step="any" inputmode="decimal" autofocus placeholder="'+(ult&&ult.peso_kg?fmtNum(ult.peso_kg,1):'')+'"></div>'
    + '<div class="field"><label>Data</label><input class="input" type="date" id="cp-data" value="'+hoje()+'"></div></div>'
    + '<details class="help"><summary>Medidas (cm, opcionais)</summary><div class="frow" style="flex-wrap:wrap;margin-top:8px">'
    + MEDIDAS.map(([k,l]) => '<div class="field" style="min-width:100px"><label>'+l+'</label><input class="input" type="number" step="any" id="cp-'+k+'" placeholder="'+(ult&&ult.medidas&&ult.medidas[k]?ult.medidas[k]:'')+'"></div>').join('')
    + '</div></details>'
    + '<div class="bx-foot"><button class="btn ghost" data-act="m-close">Cancelar</button><button class="btn primary" data-act="corpo-salvar">✓ Salvar</button></div>');
});
act('corpo-salvar', () => {
  const peso = $('#cp-peso').value === '' ? null : Number($('#cp-peso').value);
  const medidas = {};
  let temMedida = false;
  MEDIDAS.forEach(([k]) => { const v = $('#cp-'+k).value; if (v !== '') { medidas[k] = Number(v); temMedida = true; } });
  if (peso == null && !temMedida) { toast('Preencha pelo menos o peso ou uma medida.'); return; }
  const r = dbUpsert('corpo_registros', { data: $('#cp-data').value || hoje(), peso_kg: peso, medidas: temMedida ? medidas : null });
  closeModal();
  toast('Registro corporal salvo ✓', {icone:'📏', undo: () => { dbDelete('corpo_registros', r.id); render(); }});
  render();
});

/* ---- página CORRIDA (abas Corrida | Corpo) ---- */
reg('corrida', {
  titulo: 'Corrida',
  render: (params) => {
    const aba = params[0] === 'corpo' ? 'corpo' : 'corrida';
    let html = '<div class="row" style="margin-bottom:10px"><div class="h1" style="flex:1">🏃 Corrida & Corpo</div>'
      + '<div class="seg"><button class="'+(aba==='corrida'?'on':'')+'" data-act="nav" data-r="corrida">🏃 Corrida</button>'
      + '<button class="'+(aba==='corpo'?'on':'')+'" data-act="nav" data-r="corrida/corpo">📏 Corpo</button></div></div>';
    return html + (aba === 'corrida' ? corridaTabHTML() : corpoTabHTML());
  }
});
function corridaTabHTML() {
  const cs = ordenar(T('corridas'), c => c.data + (c.criado_em||''), true);
  const rec = recordesCorrida();
  const anoAtual = new Date().getFullYear();
  const kmAno = sum(cs.filter(c => anoDe(c.data) === anoAtual).map(c => c.distancia_km));
  let html = '<button class="btn primary" data-act="qa-corrida" style="margin-bottom:14px">+ Registrar corrida</button>';
  html += '<div class="grid4">'
    + '<div class="kpi"><div class="l">km no ano</div><div class="v">'+fmtNum(kmAno,1)+'</div></div>'
    + '<div class="kpi"><div class="l">🏆 melhor pace</div><div class="v" style="font-size:18px">'+paceFmt(rec.melhorPace)+'</div><div class="d muted tiny">≥5km: '+paceFmt(rec.melhorPace5)+'</div></div>'
    + '<div class="kpi"><div class="l">🏆 maior distância</div><div class="v">'+fmtNum(rec.maiorKm,1)+' km</div></div>'
    + '<div class="kpi"><div class="l">🏆 melhor mês</div><div class="v">'+fmtNum(rec.maisKmMes,0)+' km</div></div></div>';
  if (cs.length) {
    const ultimas = ordenar(cs.slice(0, 20), c => c.data);
    html += '<div class="card"><div class="h2">⏱️ Pace no tempo</div>'
      + svgLinha(ultimas.map(c => ({ x: fmtDataCurta(c.data), y: Math.round(paceSeg(c)) })), { fmt: v => paceFmt(v), cor:'var(--p3)' })
      + '<div class="tiny muted">menor = mais rápido</div></div>';
    const semanas = [];
    for (let i = 11; i >= 0; i--) {
      const s = addDias(inicioSemana(hoje()), -7*i);
      semanas.push({ x: fmtDataCurta(s), y: Math.round(sum(cs.filter(c => inicioSemana(c.data) === s).map(c => c.distancia_km))*10)/10 });
    }
    html += '<div class="card"><div class="h2">📊 Volume semanal (12 semanas)</div>' + svgBarras(semanas, { fmt: v => v+'km' }) + '</div>';
    const meses = [];
    for (let m = 0; m < 12; m++) {
      const ym = anoAtual + '-' + pad2(m+1);
      meses.push({ x: MESES_C[m], y: Math.round(sum(cs.filter(c => mesDe(c.data) === ym).map(c => c.distancia_km))) });
    }
    html += '<div class="card"><div class="h2">📈 km por mês em '+anoAtual+'</div>' + svgBarras(meses, { fmt: v => v }) + '</div>';
  }
  html += '<div class="card pad0"><div class="sec-head" style="padding:12px 14px 4px">Histórico</div><div class="list" style="padding:0 10px 8px">'
    + (cs.slice(0, 30).map(c => '<div class="item" data-act="corrida-edit" data-id="'+c.id+'"><span>🏃</span><div class="grow">'
      + '<div class="ttl">'+fmtNum(c.distancia_km,2)+' km · '+paceFmt(paceSeg(c))+'</div>'
      + '<div class="sub">'+fmtData(c.data)+' · '+fmtDur(c.tempo_seg)+' · '+esc(c.tipo||'')+(c.percepcao?' · esforço '+c.percepcao+'/10':'')+(c.nota?' · '+esc(c.nota):'')+'</div></div></div>').join('')
    || '<div class="empty"><span class="em">🏃</span>Primeira corrida ainda não registrada.</div>') + '</div></div>';
  return html;
}
act('corrida-edit', el => {
  const c = byId('corridas', el.dataset.id); if (!c) return;
  editModal({ titulo:'Editar corrida', fields: [
      {k:'data', t:'date', l:'Data', meia:1},
      {k:'distancia_km', t:'num', l:'Distância (km)', meia:1, req:1},
      {k:'tempo', l:'Tempo (mm:ss)', meia:1, req:1},
      {k:'tipo', t:'sel', l:'Tipo', meia:1, opts: TIPOS_CORRIDA},
      {k:'percepcao', t:'num', l:'Percepção 1–10', meia:1},
      {k:'nota', l:'Nota'}
    ], vals: {...c, tempo: fmtDur(c.tempo_seg)},
    onSave: v => { const seg = parseTempo(v.tempo); if (!(seg>0) || !(v.distancia_km>0)) { toast('Tempo/distância inválidos.'); return; }
      dbPatch('corridas', c.id, { data: v.data, distancia_km: v.distancia_km, tempo_seg: seg, tipo: v.tipo, percepcao: v.percepcao, nota: v.nota }); render(); },
    onDelete: () => { const bkp = {...c}; dbDelete('corridas', c.id); render();
      toast('Corrida excluída.', {undo: () => { dbUpsert('corridas', bkp); render(); }}); } });
});
function corpoTabHTML() {
  const rs = ordenar(T('corpo_registros'), r => r.data);
  const comPeso = rs.filter(r => r.peso_kg != null);
  const ult = rs[rs.length-1];
  let html = '<button class="btn primary" data-act="qa-peso" style="margin-bottom:14px">+ Registrar peso/medidas</button>';
  if (comPeso.length) {
    const atual = comPeso[comPeso.length-1], primeiro = comPeso[0];
    html += '<div class="grid3">'
      + '<div class="kpi"><div class="l">peso atual</div><div class="v">'+fmtNum(atual.peso_kg,1)+' kg</div><div class="d muted tiny">'+fmtData(atual.data)+'</div></div>'
      + '<div class="kpi"><div class="l">variação total</div><div class="v '+(atual.peso_kg-primeiro.peso_kg<=0?'ok':'warn')+'">'+(atual.peso_kg-primeiro.peso_kg>0?'+':'')+fmtNum(atual.peso_kg-primeiro.peso_kg,1)+' kg</div></div>'
      + '<div class="kpi"><div class="l">registros</div><div class="v">'+rs.length+'</div></div></div>'
      + '<div class="card"><div class="h2">⚖️ Evolução do peso</div>'
      + svgLinha(comPeso.slice(-30).map(r => ({ x: fmtDataCurta(r.data), y: Number(r.peso_kg) })), { fmt: v => fmtNum(v,1)+'kg', cor:'var(--ok)' }) + '</div>';
  }
  if (ult && ult.medidas) {
    const ant = [...rs].reverse().find(r => r !== ult && r.medidas);
    html += '<div class="card"><div class="h2">📏 Últimas medidas <span class="tiny muted">('+fmtData(ult.data)+')</span></div><div class="row wrap">'
      + MEDIDAS.filter(([k]) => ult.medidas[k] != null).map(([k,l]) => {
        const d = ant && ant.medidas && ant.medidas[k] != null ? ult.medidas[k] - ant.medidas[k] : null;
        return '<div class="kpi" style="min-width:110px"><div class="l">'+l+'</div><div class="v" style="font-size:18px">'+fmtNum(ult.medidas[k],1)+' cm</div>'
          + (d !== null ? '<div class="d '+(d<=0?'ok':'warn')+'">'+(d>0?'+':'')+fmtNum(d,1)+'</div>' : '') + '</div>'; }).join('') + '</div></div>';
  }
  html += '<div class="card pad0"><div class="sec-head" style="padding:12px 14px 4px">Histórico</div><div class="list" style="padding:0 10px 8px">'
    + ([...rs].reverse().slice(0, 20).map(r => '<div class="item" style="cursor:default"><span>📏</span><div class="grow">'
      + '<div class="ttl">'+(r.peso_kg!=null?fmtNum(r.peso_kg,1)+' kg':'medidas')+'</div><div class="sub">'+fmtData(r.data)
      + (r.medidas ? ' · ' + MEDIDAS.filter(([k]) => r.medidas[k]!=null).map(([k,l]) => l+' '+r.medidas[k]).join(', ') : '') + '</div></div>'
      + '<button class="iconbtn" data-act="corpo-del" data-id="'+r.id+'">✕</button></div>').join('')
    || '<div class="empty"><span class="em">📏</span>Nenhum registro corporal.</div>') + '</div></div>';
  return html;
}
act('corpo-del', el => { const r = {...byId('corpo_registros', el.dataset.id)}; dbDelete('corpo_registros', el.dataset.id); render();
  toast('Registro excluído.', {undo: () => { dbUpsert('corpo_registros', r); render(); }}); });
/* ════════════════ ETAPA 9 — LEITURA + REPETIÇÃO ESPAÇADA + INSIGHT DO DIA ════════════════ */
const INTERVALOS_SRS = [1, 3, 7, 21, 60, 120];
const STATUS_LIVRO = [['quero_ler','📚 quero ler'],['lendo','📖 lendo'],['concluido','✅ concluído'],['abandonado','🕊️ abandonado']];
const notasDe = (campo, id) => T('leitura_notas').filter(n => n[campo] === id);
const fonteDaNota = n => n.livro_id ? (byId('livros', n.livro_id)||{}).titulo : n.artigo_id ? (byId('artigos', n.artigo_id)||{}).titulo : null;

/* ---- fila de repetição espaçada (regra 15) ---- */
function filaInsights() {
  return ordenar(T('leitura_notas').filter(n => n.tipo === 'insight' && !n.arquivada && (n.proxima_revisao || hoje()) <= hoje()),
    n => n.proxima_revisao || '').slice(0, 3);
}
function insightDoDiaHTML() {
  const fila = filaInsights();
  if (!fila.length) return '';
  const n = fila[0];
  const fonte = fonteDaNota(n);
  return '<div class="card" style="border-color:rgba(124,92,252,.45)"><div class="card-h"><div class="h2">💡 Insight do Dia</div>'
    + (fila.length > 1 ? '<span class="badge acc">'+fila.length+' na fila</span>' : '') + '</div>'
    + '<div class="prose" style="font-size:15px;margin-bottom:10px">'+mdRender(n.conteudo)+'</div>'
    + (fonte ? '<div class="tiny muted" style="margin-bottom:10px">— '+esc(fonte)+(n.pagina?', p. '+n.pagina:'')+'</div>' : '')
    + '<div class="row wrap"><button class="btn small primary" data-act="srs-lembrei" data-id="'+n.id+'">✓ Lembrei</button>'
    + '<button class="btn small" data-act="srs-arquivar" data-id="'+n.id+'">📦 Arquivar</button>'
    + '<button class="btn small" data-act="srs-editor" data-id="'+n.id+'">✍️ Abrir no editor</button></div></div>';
}
act('srs-lembrei', el => {
  const n = byId('leitura_notas', el.dataset.id); if (!n) return;
  const atual = Number(n.intervalo_dias) || 1;
  const prox = INTERVALOS_SRS.find(i => i > atual) || 120;
  dbPatch('leitura_notas', n.id, { intervalo_dias: prox, proxima_revisao: addDias(hoje(), prox) });
  toast('💡 Volta em ' + prox + ' dias.');
  render();
});
act('srs-arquivar', el => {
  const n = byId('leitura_notas', el.dataset.id); if (!n) return;
  dbPatch('leitura_notas', n.id, { arquivada: true });
  toast('Insight arquivado.', { undo: () => { dbPatch('leitura_notas', n.id, { arquivada: false }); render(); } });
  render();
});
act('srs-editor', el => {
  const n = byId('leitura_notas', el.dataset.id); if (!n) return;
  const fonte = fonteDaNota(n);
  const tx = dbUpsert('textos', { titulo: 'Sobre: ' + (n.conteudo.slice(0, 40)) + (n.conteudo.length > 40 ? '…' : ''),
    conteudo: '> ' + n.conteudo.replace(/\n/g, '\n> ') + (fonte ? '\n> — ' + fonte : '') + '\n\n', status: 'rascunho',
    tags: ['insight'], palavras: contarPalavras(n.conteudo), atualizado_em: nowISO() });
  Actions['srs-lembrei'](el);
  nav('escrita/editor/' + tx.id);
});

/* ---- registrar páginas (FAB / atalho Hoje) ---- */
act('qa-leitura', () => {
  closeModal();
  const lendo = T('livros').filter(l => l.status === 'lendo');
  if (!lendo.length) { toast('Marque um livro como "lendo" primeiro.', {icone:'📖'}); nav('leitura'); return; }
  modal('<div class="bx-h"><div class="h2">📖 Registrar leitura</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="field"><label>Livro</label><select class="select" id="lt-livro">'
    + lendo.map(l => '<option value="'+l.id+'">'+esc(l.titulo)+' ('+(l.pagina_atual||0)+'/'+(l.paginas_total||'?')+')</option>').join('') + '</select></div>'
    + '<div class="field"><label>Páginas lidas agora</label><input class="input" type="number" id="lt-pgs" inputmode="numeric" autofocus placeholder="ex.: 12"></div>'
    + '<div class="bx-foot"><button class="btn ghost" data-act="m-close">Cancelar</button><button class="btn primary" data-act="leitura-salvar">✓ Registrar</button></div>');
});
act('leitura-salvar', () => {
  const livro = byId('livros', $('#lt-livro').value);
  const pgs = Number($('#lt-pgs').value);
  if (!livro || !(pgs > 0)) { toast('Quantas páginas você leu?', {icone:'📖'}); return; }
  registrarPaginas(livro, pgs);
  closeModal();
});
function registrarPaginas(livro, pgs) {
  const reg = dbUpsert('leitura_registros', { livro_id: livro.id, data: hoje(), paginas: pgs });
  const novaPag = Math.min((livro.pagina_atual || 0) + pgs, livro.paginas_total || 99999);
  dbPatch('livros', livro.id, { pagina_atual: novaPag });
  autoHabito('leitura', pgs);
  toast('📖 +' + pgs + ' páginas em "' + esc(livro.titulo) + '"', { undo: () => {
    dbDelete('leitura_registros', reg.id); dbPatch('livros', livro.id, { pagina_atual: livro.pagina_atual || 0 }); render(); } });
  if (window.checkConquistas) checkConquistas('leitura');
  if (livro.paginas_total && novaPag >= livro.paginas_total && livro.status !== 'concluido') {
    setTimeout(() => modal('<div class="bx-h"><div class="h2">🎉 Terminou o livro?</div></div>'
      + '<p><b>'+esc(livro.titulo)+'</b> chegou à última página!</p>'
      + '<div class="bx-foot"><button class="btn ghost" data-act="m-close">Ainda não</button>'
      + '<button class="btn primary" data-act="livro-concluir" data-id="'+livro.id+'">✅ Concluir livro</button></div>'), 600);
  }
  render();
}
act('livro-concluir', el => {
  dbPatch('livros', el.dataset.id, { status: 'concluido', fim: hoje() });
  closeModal(); render();
  toast('Livro concluído! 🎉 Avalie-o quando quiser.', {icone:'📚'});
  if (window.checkConquistas) checkConquistas('leitura');
});

/* ---- página LEITURA ---- */
reg('leitura', {
  titulo: 'Leitura',
  render: (params) => {
    const aba = params[0] || 'livros';
    let html = '<div class="row" style="margin-bottom:10px"><div class="h1" style="flex:1">📖 Leitura</div>'
      + '<div class="seg"><button class="'+(aba==='livros'?'on':'')+'" data-act="nav" data-r="leitura">📚 Livros</button>'
      + '<button class="'+(aba==='artigos'?'on':'')+'" data-act="nav" data-r="leitura/artigos">📰 Artigos</button>'
      + '<button class="'+(aba==='insights'?'on':'')+'" data-act="nav" data-r="leitura/insights">💡 Insights</button></div></div>';
    if (aba === 'artigos') return html + artigosTabHTML();
    if (aba === 'insights') return html + insightsTabHTML();
    return html + livrosTabHTML();
  }
});
function livroCardHTML(l) {
  const pct = l.paginas_total ? Math.round((l.pagina_atual||0)/l.paginas_total*100) : 0;
  return '<div class="card" style="margin-bottom:10px"><div class="row" data-act="livro-abrir" data-id="'+l.id+'" style="cursor:pointer">'
    + '<span style="font-size:24px">📕</span><div class="grow"><b>'+esc(l.titulo)+'</b>'
    + '<div class="tiny muted">'+esc(l.autor||'')+(l.avaliacao?' · '+'★'.repeat(l.avaliacao):'')+(l.area_id?' · '+(areaDe(l.area_id)||{}).nome:'')+'</div>'
    + (l.status==='lendo' && l.paginas_total ? '<div class="row" style="margin-top:6px"><div class="bar" style="flex:1"><i style="width:'+pct+'%"></i></div><span class="tiny muted">'+(l.pagina_atual||0)+'/'+l.paginas_total+' ('+pct+'%)</span></div>' : '')
    + '</div>'+(l.status==='lendo' ? '<button class="btn small primary" data-act="livro-pgs" data-id="'+l.id+'">+ págs</button>' : '')+'</div></div>';
}
function livrosTabHTML() {
  const ls = T('livros');
  const grupo = st => ls.filter(l => l.status === st);
  let html = '<button class="btn primary" data-act="livro-add" style="margin-bottom:14px">+ Livro</button>';
  const lendo = grupo('lendo'), querLer = grupo('quero_ler'), conc = ordenar(grupo('concluido'), l => l.fim||'', true), aband = grupo('abandonado');
  if (lendo.length) html += '<div class="sect"><div class="h2">📖 Lendo agora</div></div>' + lendo.map(livroCardHTML).join('');
  if (querLer.length) html += '<div class="sect"><div class="h2">📚 Quero ler</div></div>' + querLer.map(livroCardHTML).join('');
  if (conc.length) html += '<div class="sect"><div class="h2">✅ Concluídos ('+conc.length+')</div></div>' + conc.map(livroCardHTML).join('');
  if (aband.length) html += '<details class="help"><summary>🕊️ Abandonados ('+aband.length+')</summary>' + aband.map(livroCardHTML).join('') + '</details>';
  if (!ls.length) html += '<div class="card"><div class="empty"><span class="em">📚</span>Sua biblioteca começa com o primeiro livro.</div></div>';
  return html;
}
act('livro-pgs', el => {
  const l = byId('livros', el.dataset.id);
  modal('<div class="bx-h"><div class="h2">📖 '+esc(l.titulo)+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="field"><label>Páginas lidas agora</label><input class="input" type="number" id="lt-pgs" autofocus></div>'
    + '<div class="bx-foot"><button class="btn primary" data-act="livro-pgs-save" data-id="'+l.id+'">✓ Registrar</button></div>');
});
act('livro-pgs-save', el => { const l = byId('livros', el.dataset.id); const p = Number($('#lt-pgs').value);
  if (!(p>0)) { toast('Quantas páginas?'); return; } closeModal(); registrarPaginas(l, p); });
const livroFields = () => [
  {k:'titulo', l:'Título', req:1, foco:1},
  {k:'autor', l:'Autor', meia:1},
  {k:'area_id', t:'sel', l:'Área', meia:1, opts: optsAreas()},
  {k:'status', t:'sel', l:'Status', meia:1, opts: STATUS_LIVRO.map(([v,t]) => ({v,t}))},
  {k:'paginas_total', t:'num', l:'Total de páginas', meia:1},
  {k:'pagina_atual', t:'num', l:'Página atual', meia:1},
  {k:'inicio', t:'date', l:'Começou em', meia:1},
  {k:'fim', t:'date', l:'Terminou em', meia:1},
  {k:'avaliacao', t:'stars', l:'Avaliação'},
  {k:'resenha', t:'ta', l:'Resenha / impressões', rows:3}
];
act('livro-add', () => editModal({ titulo:'Novo livro', fields: livroFields(), vals:{status:'quero_ler'},
  onSave: v => { dbUpsert('livros', v); render(); } }));
act('livro-abrir', el => {
  const l = byId('livros', el.dataset.id); if (!l) return;
  editModal({ titulo:'📕 Livro', fields: livroFields(), vals: l,
    extra: '<div class="field"><label>Notas deste livro</label>'+notasListaHTML(notasDe('livro_id', l.id))+'</div>'
      + notaFormHTML('livro', l.id),
    onSave: v => { if (v.status === 'concluido' && !v.fim) v.fim = hoje(); if (v.status === 'lendo' && !v.inicio) v.inicio = hoje();
      dbPatch('livros', l.id, v); render(); if (window.checkConquistas) checkConquistas('leitura'); },
    onDelete: () => { notasDe('livro_id', l.id).forEach(n => dbDelete('leitura_notas', n.id));
      T('leitura_registros').filter(r => r.livro_id === l.id).forEach(r => dbDelete('leitura_registros', r.id));
      dbDelete('livros', l.id); render(); toast('Livro excluído.'); } });
});

/* ---- notas (citação / anotação / insight) ---- */
function notasListaHTML(notas) {
  if (!notas.length) return '<span class="muted tiny">nenhuma nota ainda</span>';
  const icone = { citacao:'❝', anotacao:'📝', insight:'💡' };
  return '<div class="list">' + ordenar(notas, n => n.criado_em||'', true).map(n =>
    '<div class="item" style="cursor:default;align-items:flex-start"><span>'+icone[n.tipo]+'</span>'
    + '<div class="grow"><div style="white-space:pre-wrap;font-size:13.5px">'+esc(n.conteudo)+'</div>'
    + '<div class="sub">'+(n.pagina?'p. '+n.pagina+' · ':'')+(n.tags||[]).map(t => '#'+esc(t)).join(' ')
    + (n.tipo==='insight' && !n.arquivada ? ' · 🔁 revisão '+fmtData(n.proxima_revisao||hoje()) : '')+'</div></div>'
    + '<button class="iconbtn" data-act="nota-del" data-id="'+n.id+'">✕</button></div>').join('') + '</div>';
}
function notaFormHTML(refTipo, refId) {
  return '<div class="card" style="background:var(--bg);padding:12px"><div class="row" style="margin-bottom:8px" id="nota-tipos">'
    + [['citacao','❝ citação'],['anotacao','📝 anotação'],['insight','💡 insight']].map(([v,l],i) =>
      '<span class="chip mini'+(i===2?' sel':'')+'" data-act="nota-tipo" data-v="'+v+'">'+l+'</span>').join('') + '</div>'
    + '<textarea class="textarea" id="nota-txt" rows="2" placeholder="escreva a nota…"></textarea>'
    + '<div class="row" style="margin-top:8px"><input class="input" id="nota-pag" type="number" placeholder="pág." style="width:80px">'
    + '<input class="input" id="nota-tags" placeholder="tags, separadas, por, vírgula" style="flex:1">'
    + '<button class="btn small primary" data-act="nota-add" data-rt="'+refTipo+'" data-rid="'+refId+'">＋</button></div></div>';
}
act('nota-tipo', el => { $$('#nota-tipos .chip').forEach(c => c.classList.remove('sel')); el.classList.add('sel'); });
act('nota-add', el => {
  const txt = $('#nota-txt').value.trim();
  if (!txt) { toast('Escreva a nota.'); return; }
  const tipo = ($('#nota-tipos .chip.sel')||{}).dataset ? $('#nota-tipos .chip.sel').dataset.v : 'insight';
  criarNota({ tipo, conteudo: txt, pagina: Number($('#nota-pag').value)||null,
    tags: $('#nota-tags').value.split(',').map(s => s.trim()).filter(Boolean),
    livro_id: el.dataset.rt === 'livro' ? el.dataset.rid : null,
    artigo_id: el.dataset.rt === 'artigo' ? el.dataset.rid : null });
  $('#nota-txt').value = ''; $('#nota-tags').value = ''; $('#nota-pag').value = '';
  toast((tipo==='insight'?'💡 Insight salvo — entra na repetição espaçada.':'Nota salva ✓'));
});
function criarNota(n) {
  const row = dbUpsert('leitura_notas', { ...n, proxima_revisao: addDias(hoje(), 1), intervalo_dias: 1, arquivada: false });
  if (window.checkConquistas) checkConquistas('leitura');
  return row;
}
act('nota-del', el => { const n = {...byId('leitura_notas', el.dataset.id)}; dbDelete('leitura_notas', el.dataset.id);
  el.closest('.item').remove(); toast('Nota excluída.', {undo: () => { dbUpsert('leitura_notas', n); render(); }}); });

/* ---- artigos (3 modos em cascata: embed → extração → colar) ---- */
function artigosTabHTML() {
  const as = ordenar(T('artigos'), a => a.criado_em||'', true);
  const paraLer = as.filter(a => a.status !== 'lido'), lidos = as.filter(a => a.status === 'lido');
  const item = a => '<div class="item" data-act="artigo-abrir" data-id="'+a.id+'"><span>📰</span><div class="grow">'
    + '<div class="ttl">'+esc(a.titulo)+'</div><div class="sub">'+esc(a.fonte||(a.url?new URL(a.url).hostname:''))
    + (a.conteudo_cache?' · <span class="ok">offline ✓</span>':'')+'</div></div>'
    + (a.status!=='lido'?'<button class="btn small" data-act="artigo-lido" data-id="'+a.id+'">✓ lido</button>':'')+'</div>';
  return '<button class="btn primary" data-act="artigo-add" style="margin-bottom:14px">+ Artigo (URL ou texto)</button>'
    + '<div class="card pad0"><div class="sec-head" style="padding:12px 14px 4px">Para ler ('+paraLer.length+')</div><div class="list" style="padding:0 10px 8px">'
    + (paraLer.map(item).join('') || '<div class="empty small">nada na fila</div>') + '</div></div>'
    + (lidos.length ? '<details class="help"><summary>✅ Lidos ('+lidos.length+')</summary><div class="list">'+lidos.map(item).join('')+'</div></details>' : '');
}
act('artigo-add', () => editModal({ titulo:'Novo artigo', fields: [
    {k:'titulo', l:'Título', req:1, foco:1},
    {k:'url', l:'URL (opcional — dá para colar o texto depois)', ph:'https://…'},
    {k:'fonte', l:'Fonte', ph:'ex.: newsletter X'}
  ], onSave: v => { const a = dbUpsert('artigos', { ...v, status:'para_ler' }); render(); abrirArtigo(a.id); } }));
act('artigo-lido', el => { dbPatch('artigos', el.dataset.id, { status:'lido' }); render(); });
act('artigo-abrir', el => abrirArtigo(el.dataset.id));
function abrirArtigo(id) {
  const a = byId('artigos', id); if (!a) return;
  modal('<div class="bx-h"><div class="h2" style="font-size:15px">📰 '+esc(a.titulo)+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div id="art-corpo">'+artigoCorpoHTML(a)+'</div>'
    + '<hr class="sep"><div class="h3">Notas</div>'+notasListaHTML(notasDe('artigo_id', a.id))+notaFormHTML('artigo', a.id)
    + '<div class="bx-foot"><button class="btn danger" data-act="artigo-del" data-id="'+a.id+'">Excluir</button><span class="sp"></span>'
    + (a.status!=='lido'?'<button class="btn" data-act="artigo-lido-fechar" data-id="'+a.id+'">✓ Marcar lido</button>':'')
    + '<button class="btn" data-act="m-close">Fechar</button></div>', { wide:true });
}
function artigoCorpoHTML(a) {
  if (a.conteudo_cache) return '<div class="prose" style="max-height:46vh;overflow:auto;border:1px solid var(--border);border-radius:10px;padding:14px" data-leitura-pane>'
    + mdRender(a.conteudo_cache) + '</div><div class="row" style="margin-top:8px"><button class="btn small ghost" data-act="artigo-limpar-cache" data-id="'+a.id+'">🗑 limpar texto salvo</button>'
    + (a.url?'<a class="btn small ghost" href="'+esc(a.url)+'" target="_blank" rel="noopener">🌐 abrir original</a>':'')+'</div>';
  return '<div class="banner acc">Escolha como ler — os modos caem em cascata se um falhar:</div>'
    + '<div class="row wrap" style="margin-bottom:10px">'
    + (a.url ? '<button class="btn" data-act="artigo-embed" data-id="'+a.id+'">🌐 1 · Embed</button>'
      + '<button class="btn" data-act="artigo-extrair" data-id="'+a.id+'">✨ 2 · Extrair texto limpo</button>' : '')
    + '<button class="btn" data-act="artigo-colar" data-id="'+a.id+'">📋 '+(a.url?'3 · ':'')+'Colar texto</button></div>'
    + '<div id="art-leitor"></div>';
}
act('artigo-embed', el => {
  const a = byId('artigos', el.dataset.id);
  $('#art-leitor').innerHTML = '<iframe src="'+esc(a.url)+'" style="width:100%;height:46vh;border:1px solid var(--border);border-radius:10px;background:#fff"></iframe>'
    + '<div class="tiny muted" style="margin-top:6px">Página em branco? O site bloqueia embed — use "Extrair texto" ou "Colar texto".</div>';
});
act('artigo-extrair', async el => {
  const a = byId('artigos', el.dataset.id);
  $('#art-leitor').innerHTML = '<div class="banner acc">✨ Extraindo texto limpo… (serviço gratuito r.jina.ai)</div>';
  try {
    const res = await fetch('https://r.jina.ai/' + a.url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    let txt = await res.text();
    if (txt.length > 200000) txt = txt.slice(0, 200000) + '\n\n[texto truncado]';
    dbPatch('artigos', a.id, { conteudo_cache: txt });
    $('#art-corpo').innerHTML = artigoCorpoHTML(byId('artigos', a.id));
    toast('Texto extraído e salvo para leitura offline ✓', {icone:'✨'});
  } catch (e) {
    $('#art-leitor').innerHTML = '<div class="banner warn">A extração falhou (limite do serviço gratuito ou bloqueio do site). O fluxo não trava: use <b>Colar texto</b>.</div>';
  }
});
act('artigo-colar', el => {
  $('#art-leitor').innerHTML = '<textarea class="textarea" id="art-colado" rows="7" placeholder="cole aqui o texto do artigo…"></textarea>'
    + '<button class="btn primary small" data-act="artigo-colar-save" data-id="'+el.dataset.id+'" style="margin-top:8px">Salvar texto</button>';
});
act('artigo-colar-save', el => {
  const txt = $('#art-colado').value.trim();
  if (!txt) { toast('Cole o texto primeiro.'); return; }
  dbPatch('artigos', el.dataset.id, { conteudo_cache: txt });
  $('#art-corpo').innerHTML = artigoCorpoHTML(byId('artigos', el.dataset.id));
  toast('Texto salvo (disponível offline) ✓');
});
act('artigo-limpar-cache', el => { dbPatch('artigos', el.dataset.id, { conteudo_cache: null });
  $('#art-corpo').innerHTML = artigoCorpoHTML(byId('artigos', el.dataset.id)); });
act('artigo-lido-fechar', el => { dbPatch('artigos', el.dataset.id, { status:'lido' }); closeModal(); render(); });
act('artigo-del', el => {
  const a = byId('artigos', el.dataset.id);
  confirmBox('Excluir o artigo e suas notas?', () => {
    notasDe('artigo_id', a.id).forEach(n => dbDelete('leitura_notas', n.id));
    dbDelete('artigos', a.id); closeModal(true); render();
  }, {perigo:1, sim:'Excluir'});
});

/* ---- aba Meus Insights ---- */
function insightsTabHTML() {
  const filtro = window._insFiltro || 'insight';
  const busca = window._insBusca || '';
  let notas = T('leitura_notas').filter(n => filtro === 'todas' ? true : n.tipo === filtro);
  if (!window._insArq) notas = notas.filter(n => !n.arquivada);
  if (busca) notas = notas.filter(n => norm(n.conteudo).includes(norm(busca)) || (n.tags||[]).some(t => norm(t).includes(norm(busca))));
  const naFila = filaInsights().length;
  return (naFila ? '<div class="banner acc">💡 ' + naFila + ' insight'+(naFila>1?'s':'')+' na fila de revisão de hoje — veja na tela Hoje.</div>' : '')
    + '<div class="row wrap" style="margin-bottom:12px">'
    + [['insight','💡 insights'],['citacao','❝ citações'],['anotacao','📝 anotações'],['todas','todas']].map(([v,l]) =>
      '<span class="chip'+(filtro===v?' sel':'')+'" data-act="ins-filtro" data-v="'+v+'">'+l+'</span>').join('')
    + '<span class="chip'+(window._insArq?' sel':'')+'" data-act="ins-arq">📦 arquivadas</span>'
    + '<input class="input" data-inp="ins-busca" value="'+esc(busca)+'" placeholder="🔎 buscar…" style="flex:1;min-width:140px"></div>'
    + '<div class="card pad0"><div class="list" style="padding:4px 10px">'
    + (ordenar(notas, n => n.criado_em||'', true).slice(0, 60).map(n => {
      const fonte = fonteDaNota(n);
      return '<div class="item" style="cursor:default;align-items:flex-start"><span>'+({citacao:'❝',anotacao:'📝',insight:'💡'}[n.tipo])+'</span>'
        + '<div class="grow"><div style="white-space:pre-wrap">'+esc(n.conteudo)+'</div>'
        + '<div class="sub">'+(fonte?'— '+esc(fonte)+' · ':'')+(n.tags||[]).map(t => '#'+esc(t)).join(' ')
        + (n.tipo==='insight'?(n.arquivada?' · arquivada':' · 🔁 '+fmtData(n.proxima_revisao||hoje())):'')+'</div></div>'
        + (n.tipo==='insight' && !n.arquivada ? '<button class="iconbtn" title="arquivar" data-act="srs-arquivar" data-id="'+n.id+'">📦</button>' : '')
        + '<button class="iconbtn" data-act="srs-editor" data-id="'+n.id+'" title="abrir no editor">✍️</button>'
        + '<button class="iconbtn" data-act="nota-del" data-id="'+n.id+'">✕</button></div>'; }).join('')
    || '<div class="empty"><span class="em">💡</span>Salve insights ao ler — eles voltam para você na hora certa.</div>') + '</div></div>';
}
act('ins-filtro', el => { window._insFiltro = el.dataset.v; render(); });
act('ins-arq', () => { window._insArq = !window._insArq; render(); });
act('ins-busca', debounce(el => { window._insBusca = el.value; const r = rotaAtual(); if (r.nome==='leitura') { $('#main .fadein').innerHTML = Views.leitura.render(r.params); } }, 300));
/* ════════════════ ETAPA 10 — ESCRITA (editor, autosave, modo ⇄, captura, streak) ════════════════ */
addCSS('.ed-wrap{max-width:760px;margin:0 auto}.ed-ta{width:100%;min-height:58vh;background:var(--bg);border:1px solid var(--border);border-radius:12px;'
 + 'padding:22px;color:var(--txt);font-size:16px;line-height:1.75;outline:none;resize:vertical}'
 + '.ed-ta:focus{border-color:var(--acc)}.ed-ta.serif{font-family:var(--serif);font-size:17.5px}'
 + '.ed-split{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}'
 + '@media(max-width:899px){.ed-split{grid-template-columns:1fr}.ed-pane-leitura{order:-1}}'
 + '.ed-foco{position:fixed;inset:0;background:var(--bg);z-index:75;overflow:auto;padding:26px 16px}'
 + '.cap-bar{position:sticky;top:0;z-index:4;display:none;gap:8px;background:var(--elev);border:1px solid var(--acc);border-radius:10px;padding:7px 10px;margin-bottom:8px}');

const STATUS_TEXTO = [['rascunho','📝 rascunho'],['em_revisao','🔍 em revisão'],['concluido','✅ concluído']];
function escritaLog() { return getCfg('escrita_log', {}) || {}; }
function registrarEscritaLog(delta) {
  if (!(delta > 0)) return;
  const log = { ...escritaLog() };
  log[hoje()] = (log[hoje()] || 0) + delta;
  setCfg('escrita_log', log);
  if (window.checkConquistas) checkConquistas('escrita');
}
function streakEscritor() {
  const log = escritaLog();
  let d = (log[hoje()] || 0) > 0 ? hoje() : addDias(hoje(), -1), n = 0;
  while ((log[d] || 0) > 0) { n++; d = addDias(d, -1); }
  return n;
}
function palavrasSemana(ini) { const log = escritaLog(); let tot = 0; for (let i = 0; i < 7; i++) tot += log[addDias(ini, i)] || 0; return tot; }

/* ---- página ESCRITA (lista) ---- */
reg('escrita', {
  titulo: 'Escrita',
  render: (params) => {
    if (params[0] === 'editor') return editorHTML(params[1]);
    const ts = ordenar(T('textos'), t => t.atualizado_em || t.criado_em || '', true);
    const stk = streakEscritor();
    const semanas = [];
    for (let i = 7; i >= 0; i--) { const s = addDias(inicioSemana(hoje()), -7*i); semanas.push({ x: fmtDataCurta(s), y: palavrasSemana(s) }); }
    let html = '<div class="row" style="margin-bottom:10px"><div class="h1" style="flex:1">✍️ Escrita</div>'
      + '<button class="btn primary" data-act="texto-novo">+ Novo texto</button></div>'
      + '<div class="grid3">'
      + '<div class="kpi"><div class="l">🔥 streak do escritor</div><div class="v">'+stk+' dia'+(stk===1?'':'s')+'</div></div>'
      + '<div class="kpi"><div class="l">palavras esta semana</div><div class="v">'+fmtNum(palavrasSemana(inicioSemana(hoje())))+'</div></div>'
      + '<div class="kpi"><div class="l">textos</div><div class="v">'+ts.length+'</div></div></div>'
      + '<div class="card"><div class="h2">📈 Palavras por semana</div>'+svgBarras(semanas, { fmt: v => fmtNum(v) })+'</div>'
      + '<div class="card pad0"><div class="list" style="padding:4px 10px">'
      + (ts.map(t => '<div class="item" data-act="texto-abrir" data-id="'+t.id+'"><span>📄</span><div class="grow">'
        + '<div class="ttl">'+esc(t.titulo)+'</div><div class="sub">'+(STATUS_TEXTO.find(s=>s[0]===t.status)||['',t.status])[1]
        + ' · '+fmtNum(t.palavras||0)+' palavras · '+fmtData((t.atualizado_em||t.criado_em||'').slice(0,10))
        + ' '+(t.tags||[]).map(tg => '#'+esc(tg)).join(' ')+'</div></div></div>').join('')
      || '<div class="empty"><span class="em">✍️</span>Comece um texto — o editor salva sozinho a cada pausa.</div>') + '</div></div>';
    return html;
  }
});
act('texto-novo', () => { const t = dbUpsert('textos', { titulo:'Sem título', conteudo:'', status:'rascunho', tags:[], palavras:0, atualizado_em: nowISO() }); nav('escrita/editor/'+t.id); });
act('texto-abrir', el => nav('escrita/editor/'+el.dataset.id));

/* ---- editor ---- */
function editorHTML(id) {
  const t = byId('textos', id);
  if (!t) return '<div class="empty">Texto não encontrado.</div>';
  window._edPalavrasAntes = t.palavras || 0;
  const serif = getCfg('editor_serif', false);
  const leitura = window._edLeitura;
  const edPane = '<div class="ed-pane-editor">'
    + '<div class="row wrap" style="margin-bottom:10px">'
    + '<input class="input" id="ed-titulo" data-inp="ed-mudou" value="'+esc(t.titulo)+'" style="flex:1;min-width:160px;font-weight:700;font-size:16px">'
    + '<select class="select" id="ed-status" data-chg="ed-mudou" style="width:auto">'+STATUS_TEXTO.map(([v,l]) => '<option value="'+v+'"'+(v===t.status?' selected':'')+'>'+l+'</option>').join('')+'</select>'
    + '<select class="select" id="ed-areasel" data-chg="ed-mudou" style="width:auto">'+optsAreas().map(o => '<option value="'+o.v+'"'+(o.v===(t.area_id||'')?' selected':'')+'>'+esc(o.t)+'</option>').join('')+'</select>'
    + '</div>'
    + '<div class="row wrap" style="margin-bottom:10px">'
    + '<input class="input" id="ed-tags" data-inp="ed-mudou" value="'+esc((t.tags||[]).join(', '))+'" placeholder="tags, por, vírgula" style="flex:1;min-width:120px">'
    + ['**','*','## ','> ','- ','[]('].map((mk,i) => '<button class="btn small icon" data-act="ed-md" data-mk="'+esc(mk)+'" title="markdown">'+['B','I','H','❝','•','🔗'][i]+'</button>').join('')
    + '</div>'
    + (window._edPreview
      ? '<div class="prose'+(serif?' serif':'')+'" style="border:1px solid var(--border);border-radius:12px;padding:22px;min-height:40vh" id="ed-preview">'+mdRender(t.conteudo||'')+'</div>'
      : '<textarea class="ed-ta'+(serif?' serif':'')+'" id="ed-area" data-inp="ed-input" placeholder="Escreva…  (markdown: ## título, **negrito**, > citação)">'+esc(t.conteudo||'')+'</textarea>')
    + '</div>';
  const leituraPane = leitura ? '<div class="ed-pane-leitura card" style="position:sticky;top:14px;max-height:84vh;overflow:auto">'+painelLeituraHTML()+'</div>' : '';
  return '<div class="row wrap" style="margin-bottom:12px">'
    + '<button class="btn small" data-act="nav" data-r="escrita">← Textos</button>'
    + '<span class="badge" id="ed-count">'+fmtNum(t.palavras||0)+' palavras</span>'
    + '<span class="tiny ok" id="ed-status-save">salvo ✓</span><span class="sp"></span>'
    + '<button class="btn small'+(window._edPreview?' primary':'')+'" data-act="ed-preview">👁 '+(window._edPreview?'Editar':'Preview')+'</button>'
    + '<button class="btn small'+(leitura?' primary':'')+'" data-act="ed-leitura">⇄ Leitura</button>'
    + '<button class="btn small" data-act="ed-foco">🎯 Foco</button>'
    + '<button class="btn small danger icon" data-act="texto-del" data-id="'+t.id+'">🗑</button></div>'
    + (leitura ? '<div class="ed-split">'+leituraPane+edPane+'</div>' : '<div class="ed-wrap">'+edPane+'</div>');
}
let _edSaveTimer = null;
function edTextoAtual() { const r = rotaAtual(); return r.nome === 'escrita' && r.params[0] === 'editor' ? byId('textos', r.params[1]) : null; }
act('ed-input', () => {
  const ta = $('#ed-area'); if (!ta) return;
  $('#ed-count').textContent = fmtNum(contarPalavras(ta.value)) + ' palavras';
  $('#ed-status-save').textContent = 'digitando…'; $('#ed-status-save').className = 'tiny muted';
  clearTimeout(_edSaveTimer);
  _edSaveTimer = setTimeout(edSalvar, 1500); // autosave debounce ~1,5s (regra 9)
});
act('ed-mudou', () => { clearTimeout(_edSaveTimer); _edSaveTimer = setTimeout(edSalvar, 800); });
function edSalvar() {
  const t = edTextoAtual(); if (!t) return;
  const ta = $('#ed-area');
  const conteudo = ta ? ta.value : t.conteudo;
  const palavras = contarPalavras(conteudo);
  const delta = palavras - (window._edPalavrasAntes || 0);
  if (delta > 0) registrarEscritaLog(delta);
  window._edPalavrasAntes = palavras;
  dbPatch('textos', t.id, {
    titulo: ($('#ed-titulo')||{value:t.titulo}).value.trim() || 'Sem título',
    status: ($('#ed-status')||{value:t.status}).value,
    area_id: $('#ed-areasel') ? ($('#ed-areasel').value || null) : t.area_id,
    tags: (($('#ed-tags')||{value:''}).value || '').split(',').map(s => s.trim()).filter(Boolean),
    conteudo, palavras, atualizado_em: nowISO()
  });
  const st = $('#ed-status-save'); if (st) { st.textContent = 'salvo ✓'; st.className = 'tiny ok'; }
}
act('ed-md', el => {
  const ta = $('#ed-area'); if (!ta) { toast('Saia do preview para editar.'); return; }
  const mk = el.dataset.mk, s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e);
  let ins;
  if (mk === '**' || mk === '*') ins = mk + (sel || 'texto') + mk;
  else if (mk === '[](') ins = '[' + (sel || 'link') + '](url)';
  else ins = mk + (sel || '');
  ta.value = ta.value.slice(0, s) + ins + ta.value.slice(e);
  ta.focus(); ta.selectionStart = ta.selectionEnd = s + ins.length;
  Actions['ed-input']();
});
act('ed-preview', () => { edSalvar(); window._edPreview = !window._edPreview; render(); });
act('ed-leitura', () => { edSalvar(); window._edLeitura = !window._edLeitura; render(); });
act('texto-del', el => {
  const t = byId('textos', el.dataset.id);
  confirmBox('Excluir o texto "'+esc(t.titulo)+'"?', () => {
    const bkp = {...t}; dbDelete('textos', t.id); nav('escrita');
    toast('Texto excluído.', {undo: () => { dbUpsert('textos', bkp); render(); }});
  }, {perigo:1, sim:'Excluir'});
});
/* modo foco do editor */
act('ed-foco', () => {
  const t = edTextoAtual(); if (!t) return;
  edSalvar();
  const f = document.createElement('div');
  f.className = 'ed-foco'; f.id = 'edfoco';
  f.innerHTML = '<div class="ed-wrap"><div class="row" style="margin-bottom:12px"><span class="muted small">🎯 modo foco — só você e o texto</span><span class="sp"></span>'
    + '<span class="badge" id="ed-count">'+fmtNum(t.palavras||0)+' palavras</span><span class="tiny ok" id="ed-status-save">salvo ✓</span>'
    + '<button class="btn small" data-act="ed-foco-sair">Sair</button></div>'
    + '<textarea class="ed-ta'+(getCfg('editor_serif',false)?' serif':'')+'" id="ed-area" data-inp="ed-input" style="min-height:80vh">'+esc(t.conteudo||'')+'</textarea></div>';
  document.body.appendChild(f);
  const ta = f.querySelector('#ed-area'); ta.focus(); ta.selectionStart = ta.value.length;
});
act('ed-foco-sair', () => { edSalvar(); const f = $('#edfoco'); if (f) f.remove(); render(); });

/* ---- painel de leitura do editor (URL / embed / colar / biblioteca / insights) ---- */
function painelLeituraHTML() {
  const fonte = window._edFonte || { tipo: 'biblioteca' };
  const tabs = [['biblioteca','📑'],['url','🌐'],['colar','📋'],['insights','💡']];
  let corpo = '';
  if (fonte.tipo === 'biblioteca') {
    if (fonte.artigo_id) {
      const a = byId('artigos', fonte.artigo_id);
      corpo = a ? '<div class="row" style="margin-bottom:8px"><button class="btn small" data-act="ed-lt-voltar">←</button><b class="small" style="flex:1">'+esc(a.titulo)+'</b></div>'
        + (a.conteudo_cache
          ? '<div class="prose" style="font-size:14px" data-leitura-pane data-ref-artigo="'+a.id+'">'+mdRender(a.conteudo_cache)+'</div>'
          : '<div class="banner warn small">Sem texto salvo. '+(a.url?'<button class="btn small" data-act="ed-lt-extrair" data-id="'+a.id+'">✨ Extrair agora</button>':'')+'</div>') : 'artigo sumiu';
    } else {
      corpo = '<div class="list">' + (ordenar(T('artigos'), a => a.criado_em||'', true).map(a =>
        '<div class="item" data-act="ed-lt-artigo" data-id="'+a.id+'"><span>📰</span><div class="grow"><div class="ttl small">'+esc(a.titulo)+'</div>'
        + '<div class="sub">'+(a.conteudo_cache?'<span class="ok">offline ✓</span>':'sem cache')+'</div></div></div>').join('')
        || '<div class="empty small">nenhum artigo na biblioteca</div>') + '</div>';
    }
  } else if (fonte.tipo === 'url') {
    corpo = '<form class="row" data-sub="ed-lt-url" style="margin-bottom:8px"><input class="input" id="ed-lt-url-inp" placeholder="https://…" value="'+esc(fonte.url||'')+'"><button class="btn small primary" type="submit">Ler</button></form>'
      + (fonte.url ? '<div class="row wrap" style="margin-bottom:8px"><button class="btn small" data-act="ed-lt-url-extrair">✨ Extrair texto</button><button class="btn small" data-act="ed-lt-url-embed">🌐 Embed</button></div>' : '')
      + '<div id="ed-lt-url-out">'+(fonte.html||'')+'</div>';
  } else if (fonte.tipo === 'colar') {
    corpo = (fonte.texto
      ? '<div class="prose" style="font-size:14px" data-leitura-pane>'+mdRender(fonte.texto)+'</div><button class="btn small ghost" data-act="ed-lt-colar-limpar" style="margin-top:8px">limpar</button>'
      : '<textarea class="textarea" id="ed-lt-colar" rows="6" placeholder="cole o texto de referência…"></textarea><button class="btn small primary" data-act="ed-lt-colar-ok" style="margin-top:8px">Usar texto</button>');
  } else {
    corpo = '<div class="list">' + (ordenar(T('leitura_notas').filter(n => n.tipo === 'insight' && !n.arquivada), n => n.criado_em||'', true).slice(0, 30).map(n =>
      '<div class="item" style="align-items:flex-start"><span>💡</span><div class="grow small" style="white-space:pre-wrap">'+esc(n.conteudo)+'</div>'
      + '<button class="iconbtn" data-act="ed-lt-inserir-insight" data-id="'+n.id+'" title="inserir no texto">↘</button></div>').join('')
      || '<div class="empty small">sem insights ainda</div>') + '</div>';
  }
  return '<div class="row" style="margin-bottom:10px">'
    + tabs.map(([v, em]) => '<button class="btn small'+(fonte.tipo===v?' primary':'')+'" data-act="ed-lt-tab" data-v="'+v+'">'+em+'</button>').join('')
    + '<span class="sp"></span><span class="tiny muted">selecione texto p/ capturar</span></div>'
    + '<div class="cap-bar" id="cap-bar"><button class="btn small" data-act="cap-citar">❝ Citar no texto</button>'
    + '<button class="btn small" data-act="cap-insight">💡 Salvar insight</button></div>' + corpo;
}
function edRefreshLeitura() { const p = $('.ed-pane-leitura'); if (p) { p.innerHTML = painelLeituraHTML(); } }
act('ed-lt-tab', el => { window._edFonte = { tipo: el.dataset.v }; edRefreshLeitura(); });
act('ed-lt-artigo', el => { window._edFonte = { tipo:'biblioteca', artigo_id: el.dataset.id }; edRefreshLeitura(); });
act('ed-lt-voltar', () => { window._edFonte = { tipo:'biblioteca' }; edRefreshLeitura(); });
act('ed-lt-extrair', async el => {
  const a = byId('artigos', el.dataset.id);
  try { const res = await fetch('https://r.jina.ai/' + a.url); if (!res.ok) throw 0;
    dbPatch('artigos', a.id, { conteudo_cache: (await res.text()).slice(0, 200000) }); edRefreshLeitura();
  } catch (_) { toast('Extração falhou — cole o texto na aba 📋.', {icone:'⚠️'}); }
});
act('ed-lt-url', () => { const url = $('#ed-lt-url-inp').value.trim(); if (!url) return; window._edFonte = { tipo:'url', url }; edRefreshLeitura(); });
act('ed-lt-url-extrair', async () => {
  const f = window._edFonte;
  $('#ed-lt-url-out').innerHTML = '<div class="banner acc small">extraindo…</div>';
  try { const res = await fetch('https://r.jina.ai/' + f.url); if (!res.ok) throw 0;
    f.html = '<div class="prose" style="font-size:14px" data-leitura-pane>'+mdRender((await res.text()).slice(0, 200000))+'</div>';
    $('#ed-lt-url-out').innerHTML = f.html;
  } catch (_) { $('#ed-lt-url-out').innerHTML = '<div class="banner warn small">Falhou. Tente o embed ou cole o texto (aba 📋).</div>'; }
});
act('ed-lt-url-embed', () => {
  const f = window._edFonte;
  f.html = '<iframe src="'+esc(f.url)+'" style="width:100%;height:52vh;border:1px solid var(--border);border-radius:10px;background:#fff"></iframe>';
  $('#ed-lt-url-out').innerHTML = f.html;
});
act('ed-lt-colar-ok', () => { const v = $('#ed-lt-colar').value.trim(); if (!v) return; window._edFonte = { tipo:'colar', texto: v }; edRefreshLeitura(); });
act('ed-lt-colar-limpar', () => { window._edFonte = { tipo:'colar' }; edRefreshLeitura(); });
act('ed-lt-inserir-insight', el => {
  const n = byId('leitura_notas', el.dataset.id); if (!n) return;
  edInserir('\n> ' + n.conteudo.replace(/\n/g, '\n> ') + (fonteDaNota(n) ? '\n> — ' + fonteDaNota(n) : '') + '\n\n');
});
function edInserir(txt) {
  const ta = $('#ed-area');
  if (!ta) { toast('Abra o modo edição (saia do preview).'); return; }
  const s = ta.selectionStart ?? ta.value.length;
  ta.value = ta.value.slice(0, s) + txt + ta.value.slice(ta.selectionEnd ?? s);
  Actions['ed-input']();
  toast('Inserido no texto ✓');
}
/* captura por seleção (mouseup/touchend no painel de leitura) */
['mouseup','touchend'].forEach(ev => document.addEventListener(ev, () => {
  const bar = $('#cap-bar'); if (!bar) return;
  setTimeout(() => {
    const sel = window.getSelection();
    const txt = sel ? String(sel).trim() : '';
    const dentro = sel && sel.anchorNode && sel.anchorNode.parentElement && sel.anchorNode.parentElement.closest('[data-leitura-pane]');
    if (txt && dentro) { window._edSel = { texto: txt, artigo_id: (dentro.dataset||{}).refArtigo || null }; bar.style.display = 'flex'; }
    else bar.style.display = 'none';
  }, 30);
}));
act('cap-citar', () => {
  const s = window._edSel; if (!s) return;
  edInserir('\n> ' + s.texto.replace(/\n/g, '\n> ') + '\n\n');
  if (s.artigo_id) criarNota({ tipo:'citacao', conteudo: s.texto, artigo_id: s.artigo_id, tags: [] });
  $('#cap-bar').style.display = 'none';
});
act('cap-insight', () => {
  const s = window._edSel; if (!s) return;
  criarNota({ tipo:'insight', conteudo: s.texto, artigo_id: s.artigo_id || null, tags: [] });
  toast('💡 Insight salvo — entra na repetição espaçada.');
  $('#cap-bar').style.display = 'none';
});
/* ════════════════ ETAPA 11 — AGENDA SEMANAL + TEMPLATES + ROTINAS GUIADAS + RELATÓRIO ════════════════ */
const PXH_W = 30; // px por hora na grade semanal
function agendaSemanaHTML(ini) {
  const horas = H_FIM - H_INI;
  let head = '<div class="wh"></div>', cols = '';
  for (let i = 0; i < 7; i++) {
    const d = addDias(ini, i);
    head += '<div class="wh'+(d===hoje()?' acc':'')+'" data-act="nav" data-r="agenda/dia/'+d+'" style="cursor:pointer">'+DIAS_SEM[pDate(d).getDay()]+'<br>'+pDate(d).getDate()+'</div>';
    let evs = '';
    for (const b of blocosDoDia(d)) {
      const bi = new Date(b.inicio), bf = new Date(b.fim);
      const top = Math.max(0, (bi.getHours()-H_INI)*PXH_W + bi.getMinutes()*PXH_W/60);
      const alt = Math.max(14, (bf-bi)/36e5*PXH_W - 2);
      const cor = corArea(b.area_id);
      evs += '<div class="tl-ev" data-act="bloco-edit" data-id="'+b.id+'" style="left:2px;right:2px;top:'+top+'px;height:'+alt+'px;background:'+cor+'22;border-color:'+cor+'66;color:'+cor+';font-size:10px;padding:1px 4px">'+(b.foco?'🎯':'')+esc(b.titulo)+'</div>';
    }
    for (const t of tarefasPendentes().filter(t => t.vencimento === d && t.hora)) {
      const [h, m] = t.hora.split(':').map(Number);
      if (h < H_INI) continue;
      evs += '<div class="tl-task" data-act="task-open" data-id="'+t.id+'" style="left:2px;right:2px;top:'+((h-H_INI)*PXH_W+(m||0)*PXH_W/60)+'px;font-size:9.5px;padding:0 4px">⏰'+esc(t.titulo)+'</div>';
    }
    let linhas = '';
    for (let h = 0; h < horas; h++) linhas += '<div data-act="ag-slot" data-data="'+d+'" data-h="'+(H_INI+h)+'" style="height:'+PXH_W+'px;border-bottom:1px dashed rgba(42,46,58,.4);cursor:pointer"></div>';
    cols += '<div class="weekcol">'+linhas+evs+'</div>';
  }
  let eixo = '';
  for (let h = H_INI; h < H_FIM; h++) eixo += '<div style="height:'+PXH_W+'px;font-size:9.5px;color:var(--txt2);text-align:right;padding-right:6px">'+pad2(h)+'h</div>';
  return '<div class="card pad0" style="overflow-x:auto"><div class="weekgrid" style="min-width:680px">'+head+'<div>'+eixo+'</div>'+cols+'</div></div>';
}
act('ag-slot', el => blocoModal(null, { data: el.dataset.data, inicio: pad2(el.dataset.h)+':00', fim: pad2(Math.min(23, Number(el.dataset.h)+1))+':00' }));

reg('agenda', {
  titulo: 'Agenda',
  render: (params) => {
    const aba = params[0] || 'semana';
    let html = '<div class="row wrap" style="margin-bottom:10px"><div class="h1" style="flex:1">📅 Agenda</div>'
      + '<div class="seg"><button class="'+(aba==='semana'?'on':'')+'" data-act="nav" data-r="agenda">Semana</button>'
      + '<button class="'+(aba==='dia'?'on':'')+'" data-act="nav" data-r="agenda/dia/'+hoje()+'">Dia</button>'
      + '<button class="'+(aba==='rotinas'?'on':'')+'" data-act="nav" data-r="agenda/rotinas">Rotinas</button>'
      + '<button class="'+(aba==='relatorio'?'on':'')+'" data-act="nav" data-r="agenda/relatorio">Relatório</button></div></div>';
    if (aba === 'semana') {
      const ini = params[1] || inicioSemana(hoje());
      html += '<div class="row" style="margin-bottom:10px"><button class="btn small" data-act="nav" data-r="agenda/semana/'+addDias(ini,-7)+'">←</button>'
        + '<b class="small" style="flex:1;text-align:center">'+fmtDataCurta(ini)+' – '+fmtDataCurta(addDias(ini,6))+'</b>'
        + '<button class="btn small" data-act="nav" data-r="agenda">hoje</button>'
        + '<button class="btn small" data-act="nav" data-r="agenda/semana/'+addDias(ini,7)+'">→</button></div>'
        + agendaSemanaHTML(ini);
    } else if (aba === 'dia') {
      const d = params[1] || hoje();
      html += '<div class="row" style="margin-bottom:10px"><button class="btn small" data-act="nav" data-r="agenda/dia/'+addDias(d,-1)+'">←</button>'
        + '<b class="small" style="flex:1;text-align:center">'+ucfirst(fmtData(d))+'</b>'
        + '<button class="btn small" data-act="nav" data-r="agenda/dia/'+hoje()+'">hoje</button>'
        + '<button class="btn small" data-act="nav" data-r="agenda/dia/'+addDias(d,1)+'">→</button></div>'
        + '<div class="row wrap" style="margin-bottom:10px"><button class="btn small primary" data-act="qa-bloco">+ Bloco</button>'
        + '<button class="btn small" data-act="modelo-salvar-dia" data-d="'+d+'">💾 Salvar dia como modelo</button>'
        + '<button class="btn small" data-act="modelo-aplicar" data-d="'+d+'">📋 Aplicar modelo</button></div>'
        + '<div class="card">'+agendaDiaHTML(d)+'</div>';
    } else if (aba === 'rotinas') {
      html += rotinasTabHTML();
    } else {
      const ini = params[1] || inicioSemana(hoje());
      html += relatorioTabHTML(ini);
    }
    return html;
  },
  mount: (params) => {
    if ((params[0]||'semana') === 'dia') {
      let x0 = null;
      const tl = $('.timeline'); if (!tl) return;
      tl.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, {passive:true});
      tl.addEventListener('touchend', e => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        const d = params[1] || hoje();
        if (dx < -60) nav('agenda/dia/'+addDias(d,1));
        if (dx > 60) nav('agenda/dia/'+addDias(d,-1));
        x0 = null;
      }, {passive:true});
    }
  }
});

/* ---- templates de rotina ---- */
act('modelo-salvar-dia', el => {
  const d = el.dataset.d;
  const bs = blocosDoDia(d);
  if (!bs.length) { toast('Este dia não tem blocos para salvar.'); return; }
  editModal({ titulo:'Salvar dia como modelo', fields:[{k:'nome', l:'Nome do modelo', req:1, foco:1, ph:'ex.: Dia ideal de trabalho'}],
    onSave: v => {
      dbUpsert('rotina_modelos', { nome: v.nome, guiada: false,
        blocos: ordenar(bs, b => b.inicio).map(b => ({ titulo: b.titulo, inicio: horaDe(b.inicio), dur_min: Math.round(blocoMin(b)), area_id: b.area_id || null })) });
      toast('Modelo salvo ✓ (aba Rotinas)', {icone:'💾'}); render();
    } });
});
act('modelo-aplicar', el => {
  const d = el.dataset.d;
  const ms = T('rotina_modelos');
  if (!ms.length) { toast('Nenhum modelo salvo ainda.'); return; }
  modal('<div class="bx-h"><div class="h2">📋 Aplicar modelo em '+fmtData(d)+'</div><button class="iconbtn" data-act="m-close">✕</button></div><div class="col">'
    + ms.map(m => '<button class="btn big" data-act="modelo-aplicar-ok" data-id="'+m.id+'" data-d="'+d+'" style="justify-content:space-between"><span>'+(m.guiada?'🧭 ':'')+esc(m.nome)+'</span><span class="tiny muted">'+(m.blocos||[]).length+' blocos</span></button>').join('')+'</div>');
});
act('modelo-aplicar-ok', el => {
  const m = byId('rotina_modelos', el.dataset.id); const d = el.dataset.d;
  const criados = [];
  for (const it of (m.blocos||[])) {
    if (!it.inicio) continue;
    const ini = isoLocal(d, it.inicio);
    criados.push(dbUpsert('blocos', { titulo: it.titulo, area_id: it.area_id||null,
      inicio: ini, fim: new Date(new Date(ini).getTime() + (it.dur_min||60)*60000).toISOString(), foco: false, template: m.nome }));
  }
  closeModal(); render();
  toast(criados.length + ' blocos criados a partir de "'+esc(m.nome)+'" ✓', { undo: () => { criados.forEach(b => dbDelete('blocos', b.id)); render(); } });
});
function rotinasTabHTML() {
  const ms = T('rotina_modelos');
  return '<button class="btn primary" data-act="modelo-novo" style="margin-bottom:14px">+ Novo modelo / rotina guiada</button>'
    + (ms.map(m => '<div class="card"><div class="card-h"><div class="h2">'+(m.guiada?'🧭 ':'📋 ')+esc(m.nome)+'</div>'
      + (m.guiada ? '<button class="btn small primary" data-act="rotina-exec" data-id="'+m.id+'">▶ Executar</button>' : '')
      + '<button class="iconbtn" data-act="modelo-edit" data-id="'+m.id+'">✏️</button></div>'
      + '<div class="tiny muted">'+(m.blocos||[]).map(b => (b.inicio?b.inicio+' ':'')+esc(b.titulo)+' ('+(b.dur_min||0)+'min)').join(' · ')+'</div></div>').join('')
    || '<div class="card"><div class="empty"><span class="em">📋</span>Modelos aplicam um dia inteiro de blocos com 1 toque.<br>Rotinas guiadas executam passo a passo com timer.</div></div>');
}
function modeloEditor(m) {
  const blocos = m ? [...(m.blocos||[])] : [{ titulo:'', inicio:'07:00', dur_min:15 }];
  window._modBlocos = blocos;
  const linha = (b, i) => '<div class="row" style="margin-bottom:6px" data-mb="'+i+'">'
    + '<input class="input" value="'+esc(b.titulo||'')+'" data-mb-t placeholder="passo/bloco" style="flex:2">'
    + '<input class="input" type="time" value="'+esc(b.inicio||'')+'" data-mb-i style="width:96px" title="hora (vazio em rotina guiada)">'
    + '<input class="input" type="number" value="'+(b.dur_min||15)+'" data-mb-d style="width:70px" title="minutos">'
    + '<button class="iconbtn" data-act="mod-rm" data-i="'+i+'">✕</button></div>';
  modal('<div class="bx-h"><div class="h2">'+(m?'Editar':'Novo')+' modelo</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="field"><label>Nome *</label><input class="input" id="mod-nome" value="'+esc(m?m.nome:'')+'" autofocus></div>'
    + '<label class="checkline"><input type="checkbox" id="mod-guiada"'+(m&&m.guiada?' checked':'')+'> 🧭 Rotina guiada (executa passo a passo com timer)</label>'
    + '<div class="field" style="margin-top:8px"><label>Blocos / passos</label><div id="mod-blocos">'+blocos.map(linha).join('')+'</div>'
    + '<button class="btn small" data-act="mod-add">+ passo</button></div>'
    + '<div class="bx-foot">'+(m?'<button class="btn danger" data-act="mod-del" data-id="'+m.id+'">Excluir</button><span class="sp"></span>':'')
    + '<button class="btn primary" data-act="mod-save" data-id="'+(m?m.id:'')+'">Salvar</button></div>', { wide:true });
}
act('modelo-novo', () => modeloEditor(null));
act('modelo-edit', el => modeloEditor(byId('rotina_modelos', el.dataset.id)));
act('mod-add', () => { const div = document.createElement('div');
  $('#mod-blocos').insertAdjacentHTML('beforeend', '<div class="row" style="margin-bottom:6px"><input class="input" data-mb-t placeholder="passo/bloco" style="flex:2"><input class="input" type="time" data-mb-i style="width:96px"><input class="input" type="number" value="15" data-mb-d style="width:70px"><button class="iconbtn" data-act="mod-rm-el">✕</button></div>'); });
act('mod-rm', el => el.closest('.row').remove());
act('mod-rm-el', el => el.closest('.row').remove());
act('mod-save', el => {
  const nome = $('#mod-nome').value.trim(); if (!nome) { toast('Dê um nome.'); return; }
  const blocos = [...$('#mod-blocos').querySelectorAll('.row')].map(r => ({
    titulo: r.querySelector('[data-mb-t]').value.trim(), inicio: r.querySelector('[data-mb-i]').value || null,
    dur_min: Number(r.querySelector('[data-mb-d]').value) || 15
  })).filter(b => b.titulo);
  if (!blocos.length) { toast('Adicione pelo menos um passo.'); return; }
  dbUpsert('rotina_modelos', { id: el.dataset.id || undefined, nome, guiada: $('#mod-guiada').checked, blocos });
  closeModal(); render();
});
act('mod-del', el => { const m = {...byId('rotina_modelos', el.dataset.id)}; dbDelete('rotina_modelos', el.dataset.id); closeModal(); render();
  toast('Modelo excluído.', {undo: () => { dbUpsert('rotina_modelos', m); render(); }}); });

/* ---- rotina guiada (execução passo a passo) ---- */
act('rotina-exec', el => {
  const m = byId('rotina_modelos', el.dataset.id); if (!m || !(m.blocos||[]).length) return;
  window._rotina = { modelo: m, passo: 0, inicioPasso: Date.now(), feitos: [] };
  const f = document.createElement('div'); f.className = 'focus-full'; f.id = 'rotinafull';
  document.body.appendChild(f);
  desenharRotina();
});
function desenharRotina() {
  const f = $('#rotinafull'); const r = window._rotina;
  if (!f || !r) { if (f) f.remove(); return; }
  const passo = r.modelo.blocos[r.passo];
  const alvo = (passo.dur_min || 15) * 60;
  const el = (Date.now() - r.inicioPasso) / 1000;
  f.innerHTML = '<div class="muted small">🧭 '+esc(r.modelo.nome)+' · passo '+(r.passo+1)+'/'+r.modelo.blocos.length+'</div>'
    + '<div class="h1" style="font-size:26px;text-align:center">'+esc(passo.titulo)+'</div>'
    + '<div class="ringwrap">'+svgAnel(Math.min(1, el/alvo), {r:96, sw:10, cor: el>=alvo?'var(--ok)':'var(--acc)'})
    + '<div class="mid"><div class="tm" style="font-size:34px">'+fmtDur(Math.max(0, alvo-el))+'</div><div class="tiny muted">'+(el>=alvo?'tempo cumprido ✓':'restante')+'</div></div></div>'
    + '<div class="row"><button class="btn" data-act="rotina-pular">Pular</button>'
    + '<button class="btn primary big" data-act="rotina-feito">✓ Feito, próximo</button>'
    + '<button class="btn ghost" data-act="rotina-sair">Encerrar</button></div>';
}
setInterval(() => { if ($('#rotinafull')) desenharRotina(); }, 1000);
function rotinaAvancar(registrar) {
  const r = window._rotina; if (!r) return;
  const passo = r.modelo.blocos[r.passo];
  const min = Math.max(1, Math.round((Date.now() - r.inicioPasso) / 60000));
  if (registrar) {
    const fim = new Date(), ini = new Date(fim.getTime() - min*60000);
    r.feitos.push(dbUpsert('blocos', { titulo: passo.titulo, area_id: passo.area_id||null,
      inicio: ini.toISOString(), fim: fim.toISOString(), tempo_real_min: min, foco: false, template: r.modelo.nome }));
  }
  r.passo++;
  if (r.passo >= r.modelo.blocos.length) {
    const n = r.feitos.length;
    window._rotina = null; const f = $('#rotinafull'); if (f) f.remove();
    toast('🧭 Rotina concluída! '+n+' de '+r.modelo.blocos.length+' passos registrados.', {ms:5000});
    render();
  } else { r.inicioPasso = Date.now(); desenharRotina(); }
}
act('rotina-feito', () => rotinaAvancar(true));
act('rotina-pular', () => rotinaAvancar(false));
act('rotina-sair', () => confirmBox('Encerrar a rotina agora? Os passos já feitos ficam registrados.', () => {
  window._rotina = null; const f = $('#rotinafull'); if (f) f.remove(); render();
}));

/* ---- relatório de tempo (planejado × realizado + foco) ---- */
function horasPorArea(ini, fim) {
  const out = {};
  for (const b of T('blocos')) {
    const d = dISO(new Date(b.inicio));
    if (d < ini || d > fim) continue;
    const k = b.area_id || 'sem';
    out[k] = out[k] || { plan: 0, real: 0, foco: 0 };
    out[k].plan += blocoMin(b);
    out[k].real += Number(b.tempo_real_min) || 0;
    if (b.foco) out[k].foco += Number(b.tempo_real_min) || 0;
  }
  return out;
}
function relatorioTabHTML(ini) {
  const fim = addDias(ini, 6);
  const porArea = horasPorArea(ini, fim);
  const blocosSemana = T('blocos').filter(b => { const d = dISO(new Date(b.inicio)); return d >= ini && d <= fim; });
  const focoSessoes = blocosSemana.filter(b => b.foco && b.tempo_real_min);
  const focoMin = sum(focoSessoes.map(b => b.tempo_real_min));
  const linhas = Object.entries(porArea).map(([k, v]) => {
    const a = k === 'sem' ? { nome:'— sem área', cor:'#9AA0B0', icone:'▫️' } : (areaDe(k) || { nome:'?', cor:'#9AA0B0', icone:'▫️' });
    return { a, ...v };
  }).sort((x, y) => y.plan - x.plan);
  return '<div class="row" style="margin-bottom:10px"><button class="btn small" data-act="nav" data-r="agenda/relatorio/'+addDias(ini,-7)+'">←</button>'
    + '<b class="small" style="flex:1;text-align:center">'+fmtDataCurta(ini)+' – '+fmtDataCurta(fim)+'</b>'
    + '<button class="btn small" data-act="nav" data-r="agenda/relatorio/'+addDias(ini,7)+'">→</button></div>'
    + '<div class="grid3">'
    + '<div class="kpi"><div class="l">planejado</div><div class="v">'+fmtMin(sum(linhas.map(l=>l.plan)))+'</div></div>'
    + '<div class="kpi"><div class="l">realizado (timer)</div><div class="v">'+fmtMin(sum(linhas.map(l=>l.real)))+'</div></div>'
    + '<div class="kpi"><div class="l">🎯 foco</div><div class="v">'+fmtMin(focoMin)+'</div><div class="d muted tiny">'+focoSessoes.length+' sessões</div></div></div>'
    + '<div class="card"><div class="h2">Planejado × realizado por área</div><table class="tbl"><tr><th>Área</th><th class="num">Planejado</th><th class="num">Realizado</th><th class="num">%</th></tr>'
    + (linhas.map(l => '<tr><td><span class="areachip" style="background:'+l.a.cor+'22;color:'+l.a.cor+'">'+l.a.icone+' '+esc(l.a.nome)+'</span></td>'
      + '<td class="num">'+fmtMin(l.plan)+'</td><td class="num">'+fmtMin(l.real)+'</td>'
      + '<td class="num '+(l.plan&&l.real/l.plan>=0.7?'ok':'muted')+'">'+(l.plan?Math.round(l.real/l.plan*100)+'%':'—')+'</td></tr>').join('')
      || '<tr><td colspan="4" class="muted center">sem blocos nesta semana</td></tr>') + '</table></div>'
    + '<div class="card"><div class="h2">🥧 Distribuição do tempo planejado</div>'
    + svgPizza(linhas.map(l => ({ label: l.a.nome, valor: Math.round(l.plan), cor: l.a.cor })), { fmt: v => fmtMin(v) }) + '</div>';
}
/* ════════════════ ETAPA 12 — METAS (vínculos automáticos + visão anual) ════════════════ */
const VINCULOS_META = [
  ['', '✋ manual'], ['habito', '🔁 hábito'], ['categoria_financeira', '💰 categoria financeira'],
  ['corrida_km', '🏃 km de corrida'], ['livros', '📚 livros concluídos'],
  ['treino_sessoes', '🏋️ sessões de treino'], ['peso', '⚖️ peso corporal'], ['patrimonio', '📈 patrimônio']
];
function janelaMeta(m) {
  if (m.ano) return [m.ano + '-01-01', m.ano + '-12-31'];
  const ini = (m.criado_em || nowISO()).slice(0, 10);
  return [ini, m.prazo || '9999-12-31'];
}
function metaProgresso(m) { // regra 4: sempre recalculável do histórico
  const [ini, fim] = janelaMeta(m);
  const dentro = d => d >= ini && d <= fim;
  let atual = 0;
  switch (m.vinculo_tipo) {
    case 'habito':
      atual = sum(T('habito_registros').filter(r => r.habito_id === m.vinculo_id && dentro(r.data)).map(r => r.valor)) * (Number(m.fator_conversao) || 1); break;
    case 'categoria_financeira':
      atual = sum(T('lancamentos_financeiros').filter(l => l.categoria_id === m.vinculo_id && l.pago && dentro(l.data)).map(l => l.valor)); break;
    case 'corrida_km':
      atual = sum(T('corridas').filter(c => dentro(c.data)).map(c => c.distancia_km)); break;
    case 'livros':
      atual = T('livros').filter(l => l.status === 'concluido' && l.fim && dentro(l.fim)).length; break;
    case 'treino_sessoes':
      atual = T('treino_sessoes').filter(s => dentro(s.data)).length; break;
    case 'peso': {
      const regs = ordenar(T('corpo_registros').filter(r => r.peso_kg != null), r => r.data);
      atual = regs.length ? Number(regs[regs.length - 1].peso_kg) : 0; break;
    }
    case 'patrimonio':
      atual = window.patrimonioTotal ? patrimonioTotal() : 0; break;
    default:
      atual = (Number(m.valor_atual) || 0) + sum(T('meta_registros').filter(r => r.meta_id === m.id).map(r => r.valor));
  }
  const alvo = Number(m.valor_alvo) || 1;
  const reduzir = m.direcao === 'reduzir';
  const atingida = reduzir ? (atual > 0 && atual <= alvo) : atual >= alvo;
  const pct = reduzir ? (atual > 0 ? clamp(alvo / atual, 0, 1) : 0) : clamp(atual / alvo, 0, 1);
  // ritmo necessário
  const fimReal = m.prazo || (m.ano ? m.ano + '-12-31' : null);
  let ritmo = null, semanasRestantes = null;
  if (fimReal && fimReal >= hoje() && !reduzir && !atingida) {
    semanasRestantes = Math.max(1, Math.ceil(diffDias(hoje(), fimReal) / 7));
    ritmo = (alvo - atual) / semanasRestantes;
  }
  // status (heurística linear)
  let status = 'andamento';
  if (m.concluida || atingida) status = 'batida';
  else if (fimReal && fimReal < hoje()) status = 'vencida';
  else if (fimReal && !reduzir) {
    const [i2] = janelaMeta(m);
    const total = Math.max(1, diffDias(i2, fimReal));
    const decorrido = clamp(diffDias(i2, hoje()) / total, 0, 1);
    if (pct < decorrido * 0.7) status = 'risco';
  }
  return { atual, alvo, pct, atingida, ritmo, semanasRestantes, status, reduzir };
}
function metaCardHTML(m) {
  const p = metaProgresso(m);
  const cor = p.status === 'batida' ? 'var(--ok)' : p.status === 'risco' ? 'var(--warn)' : p.status === 'vencida' ? 'var(--err)' : 'var(--acc)';
  const stBadge = { batida:'<span class="badge ok">🎉 batida</span>', risco:'<span class="badge warn">em risco</span>',
    vencida:'<span class="badge err">prazo vencido</span>', andamento:'<span class="badge acc">no caminho</span>' }[p.status];
  const vinculo = VINCULOS_META.find(v => v[0] === (m.vinculo_tipo || ''));
  return '<div class="card"><div class="card-h"><div class="h2" style="font-size:15px">'+esc(m.nome)+'</div>'+stBadge
    + '<button class="iconbtn" data-act="meta-edit" data-id="'+m.id+'">✏️</button></div>'
    + '<div class="row" style="margin-bottom:6px"><div class="bar thick" style="flex:1"><i style="width:'+Math.round(p.pct*100)+'%;background:'+cor+'"></i></div>'
    + '<b class="small">'+Math.round(p.pct*100)+'%</b></div>'
    + '<div class="row wrap tiny muted">'
    + '<span><b style="color:var(--txt)">'+fmtNum(p.atual, 1)+'</b> / '+fmtNum(p.alvo, 1)+' '+esc(m.unidade||'')+(p.reduzir?' (reduzir)':'')+'</span>'
    + (vinculo && vinculo[0] ? '<span>· '+vinculo[1]+'</span>' : '')
    + (m.prazo ? '<span>· até '+fmtData(m.prazo)+'</span>' : m.ano ? '<span>· '+m.ano+'</span>' : '')
    + (p.ritmo != null && p.ritmo > 0 ? '<span>· precisa de <b style="color:var(--warn)">'+fmtNum(p.ritmo, 1)+' '+esc(m.unidade||'')+'/sem</b></span>' : '')
    + (areaDe(m.area_id) ? '<span>· '+areaChipHTML(m.area_id)+'</span>' : '') + '</div>'
    + (!m.vinculo_tipo ? '<button class="btn small" data-act="meta-reg" data-id="'+m.id+'" style="margin-top:8px">+ Registrar progresso</button>' : '')
    + '</div>';
}
reg('metas', {
  titulo: 'Metas',
  render: (params) => {
    const aba = params[0] === 'ano' ? 'ano' : 'ativas';
    let html = '<div class="row" style="margin-bottom:10px"><div class="h1" style="flex:1">🎯 Metas</div>'
      + '<div class="seg"><button class="'+(aba==='ativas'?'on':'')+'" data-act="nav" data-r="metas">Ativas</button>'
      + '<button class="'+(aba==='ano'?'on':'')+'" data-act="nav" data-r="metas/ano">Visão anual</button></div>'
      + '<button class="btn primary small" data-act="meta-add">+ Meta</button></div>';
    if (aba === 'ativas') {
      const ativas = T('metas').filter(m => !m.concluida);
      const concluidas = T('metas').filter(m => m.concluida);
      html += ativas.map(metaCardHTML).join('') || '<div class="card"><div class="empty"><span class="em">🎯</span>Metas viram progresso visível — crie a primeira.</div></div>';
      if (concluidas.length) html += '<details class="help"><summary>🏁 Concluídas ('+concluidas.length+')</summary>'+concluidas.map(metaCardHTML).join('')+'</details>';
    } else {
      const ano = Number(params[1]) || new Date().getFullYear();
      const doAno = T('metas').filter(m => (m.ano || (m.prazo ? anoDe(m.prazo) : null)) === ano);
      const batidas = doAno.filter(m => metaProgresso(m).atingida || m.concluida).length;
      html += '<div class="row" style="margin-bottom:10px"><button class="btn small" data-act="nav" data-r="metas/ano/'+(ano-1)+'">←</button>'
        + '<b style="flex:1;text-align:center">'+ano+'</b><button class="btn small" data-act="nav" data-r="metas/ano/'+(ano+1)+'">→</button></div>'
        + '<div class="grid3"><div class="kpi"><div class="l">metas do ano</div><div class="v">'+doAno.length+'</div></div>'
        + '<div class="kpi"><div class="l">batidas</div><div class="v ok">'+batidas+'</div></div>'
        + '<div class="kpi"><div class="l">taxa</div><div class="v">'+(doAno.length?Math.round(batidas/doAno.length*100):0)+'%</div></div></div>'
        + doAno.map(metaCardHTML).join('')
        + '<button class="btn" data-act="nav" data-r="retrospectiva" style="margin-top:6px">🎉 Ver retrospectiva do ano</button>';
    }
    return html;
  }
});
function metaModal(m) {
  const vals = m || { direcao:'aumentar', ano: new Date().getFullYear(), fator_conversao: 1 };
  const vincOpts = tipo => tipo === 'habito' ? habitosAtivos().map(h => ({v:h.id, t:h.icone+' '+h.nome}))
    : tipo === 'categoria_financeira' ? T('categorias_financeiras').map(c => ({v:c.id, t:c.nome})) : [];
  modal('<div class="bx-h"><div class="h2">'+(m?'Editar':'Nova')+' meta</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="field"><label>Nome *</label><input class="input" id="mt-nome" value="'+esc(vals.nome||'')+'" autofocus placeholder="ex.: Correr 300 km no ano"></div>'
    + '<div class="frow"><div class="field"><label>Alvo *</label><input class="input" type="number" step="any" id="mt-alvo" value="'+(vals.valor_alvo??'')+'"></div>'
    + '<div class="field"><label>Unidade</label><input class="input" id="mt-uni" value="'+esc(vals.unidade||'')+'" placeholder="km, livros, R$…"></div></div>'
    + '<div class="frow"><div class="field"><label>Vínculo automático</label><select class="select" id="mt-vinc" data-chg="mt-vinc-chg">'
    + VINCULOS_META.map(([v,l]) => '<option value="'+v+'"'+(v===(vals.vinculo_tipo||'')?' selected':'')+'>'+l+'</option>').join('')+'</select></div>'
    + '<div class="field"><label>Direção</label><select class="select" id="mt-dir">'
    + [['aumentar','⬆️ aumentar'],['reduzir','⬇️ reduzir']].map(([v,l]) => '<option value="'+v+'"'+(v===vals.direcao?' selected':'')+'>'+l+'</option>').join('')+'</select></div></div>'
    + '<div class="field" id="mt-vinc-id-box" style="'+(vincOpts(vals.vinculo_tipo).length?'':'display:none')+'"><label>Qual?</label><select class="select" id="mt-vinc-id">'
    + vincOpts(vals.vinculo_tipo).map(o => '<option value="'+o.v+'"'+(o.v===vals.vinculo_id?' selected':'')+'>'+esc(o.t)+'</option>').join('')+'</select></div>'
    + '<div class="frow"><div class="field"><label>Ano (opcional)</label><input class="input" type="number" id="mt-ano" value="'+(vals.ano||'')+'"></div>'
    + '<div class="field"><label>Prazo (opcional)</label><input class="input" type="date" id="mt-prazo" value="'+(vals.prazo||'')+'"></div></div>'
    + '<div class="frow"><div class="field"><label>Área</label><select class="select" id="mt-area">'
    + optsAreas().map(o => '<option value="'+o.v+'"'+(o.v===(vals.area_id||'')?' selected':'')+'>'+esc(o.t)+'</option>').join('')+'</select></div>'
    + '<div class="field"><label>Fator de conversão</label><input class="input" type="number" step="any" id="mt-fator" value="'+(vals.fator_conversao??1)+'"></div></div>'
    + (m ? '<label class="checkline"><input type="checkbox" id="mt-conc"'+(m.concluida?' checked':'')+'> marcar como concluída</label>' : '')
    + '<div class="bx-foot">'+(m?'<button class="btn danger" data-act="meta-del" data-id="'+m.id+'">Excluir</button><span class="sp"></span>':'')
    + '<button class="btn ghost" data-act="m-close">Cancelar</button><button class="btn primary" data-act="meta-save" data-id="'+(m?m.id:'')+'">Salvar</button></div>');
}
act('mt-vinc-chg', el => {
  const tipo = el.value;
  const box = $('#mt-vinc-id-box'), sel = $('#mt-vinc-id');
  const opts = tipo === 'habito' ? habitosAtivos().map(h => ({v:h.id, t:h.icone+' '+h.nome}))
    : tipo === 'categoria_financeira' ? T('categorias_financeiras').map(c => ({v:c.id, t:c.nome})) : [];
  if (opts.length) { box.style.display = ''; sel.innerHTML = opts.map(o => '<option value="'+o.v+'">'+esc(o.t)+'</option>').join(''); }
  else box.style.display = 'none';
  if (tipo === 'peso') $('#mt-dir').value = 'reduzir';
});
act('meta-add', () => metaModal(null));
act('meta-edit', el => metaModal(byId('metas', el.dataset.id)));
act('meta-save', el => {
  const nome = $('#mt-nome').value.trim(), alvo = Number($('#mt-alvo').value);
  if (!nome || !(alvo > 0)) { toast('Preencha nome e alvo.'); return; }
  const tipo = $('#mt-vinc').value || null;
  dbUpsert('metas', { id: el.dataset.id || undefined, nome, valor_alvo: alvo, unidade: $('#mt-uni').value.trim() || null,
    vinculo_tipo: tipo, vinculo_id: ($('#mt-vinc-id-box').style.display === 'none' ? null : $('#mt-vinc-id').value || null),
    direcao: $('#mt-dir').value, ano: Number($('#mt-ano').value) || null, prazo: $('#mt-prazo').value || null,
    area_id: $('#mt-area').value || null, fator_conversao: Number($('#mt-fator').value) || 1,
    valor_atual: el.dataset.id ? byId('metas', el.dataset.id).valor_atual : 0,
    concluida: $('#mt-conc') ? $('#mt-conc').checked : false });
  closeModal(); render();
});
act('meta-del', el => { const m = {...byId('metas', el.dataset.id)};
  T('meta_registros').filter(r => r.meta_id === m.id).forEach(r => dbDelete('meta_registros', r.id));
  dbDelete('metas', el.dataset.id); closeModal(); render();
  toast('Meta excluída.', {undo: () => { dbUpsert('metas', m); render(); }}); });
act('meta-reg', el => {
  const m = byId('metas', el.dataset.id);
  modal('<div class="bx-h"><div class="h2">'+esc(m.nome)+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="frow"><div class="field"><label>Quanto somar</label><input class="input" type="number" step="any" id="mr-val" autofocus></div>'
    + '<div class="field"><label>Data</label><input class="input" type="date" id="mr-data" value="'+hoje()+'"></div></div>'
    + '<div class="field"><label>Nota</label><input class="input" id="mr-nota"></div>'
    + '<div class="bx-foot"><button class="btn primary" data-act="meta-reg-save" data-id="'+m.id+'">✓ Registrar</button></div>');
});
act('meta-reg-save', el => {
  const v = Number($('#mr-val').value);
  if (!v) { toast('Informe o valor.'); return; }
  dbUpsert('meta_registros', { meta_id: el.dataset.id, data: $('#mr-data').value || hoje(), valor: v, nota: $('#mr-nota').value.trim() || null });
  closeModal(); render();
  const m = byId('metas', el.dataset.id), p = metaProgresso(m);
  toast(p.atingida ? '🎉 Meta "'+esc(m.nome)+'" batida!' : 'Progresso registrado ✓ ('+Math.round(p.pct*100)+'%)');
});
/* ════════════════ ETAPA 13 — FINANÇAS · FLUXO (Painel A) ════════════════ */
const lancDoMes = ym => T('lancamentos_financeiros').filter(l => mesDe(l.data) === ym);
const catFin = id => byId('categorias_financeiras', id);
const aportadoNoMes = ym => sum(T('investimentos_movimentos').filter(v => v.tipo === 'aporte' && mesDe(v.data) === ym).map(v => v.valor));
function resumoMes(ym) {
  const ls = lancDoMes(ym);
  const entradas = sum(ls.filter(l => l.tipo === 'entrada' && l.pago).map(l => l.valor));
  const saidas = sum(ls.filter(l => l.tipo === 'saida' && l.pago).map(l => l.valor));
  return { entradas, saidas, saldo: entradas - saidas, investido: aportadoNoMes(ym),
    pendentes: T('lancamentos_financeiros').filter(l => !l.pago && l.data <= fimDoMes(ym)).length };
}
const fimDoMes = ym => { const [y, m] = ym.split('-').map(Number); return ym + '-' + pad2(new Date(y, m, 0).getDate()); };
function gastoCategoriaMes(catId, ym) {
  return sum(lancDoMes(ym).filter(l => l.categoria_id === catId && l.tipo === 'saida' && l.pago).map(l => l.valor));
}
const corOrcamento = pct => pct > 1 ? 'err' : pct >= 0.8 ? 'warn' : 'ok';

/* geração de recorrências na virada do mês (regra 6) */
function gerarRecorrenciasDoMes() {
  const ym = mesDe(hoje());
  if (getCfg('fin_mes_gerado') === ym) return;
  let n = 0;
  for (const t of T('lancamentos_financeiros').filter(l => l.recorrencia && l.recorrencia.freq === 'mensal')) {
    if (mesDe(t.data) === ym) continue;
    const [y, m] = ym.split('-').map(Number);
    const dia = Math.min((t.recorrencia.dia || pDate(t.data).getDate()), new Date(y, m, 0).getDate());
    const jaExiste = T('lancamentos_financeiros').some(l => l.id !== t.id && mesDe(l.data) === ym
      && norm(l.descricao || '') === norm(t.descricao || '') && l.categoria_id === t.categoria_id);
    if (!jaExiste) { dbUpsert('lancamentos_financeiros', { tipo: t.tipo, valor: t.valor, data: ym + '-' + pad2(dia),
      categoria_id: t.categoria_id, conta_id: t.conta_id, descricao: t.descricao, pago: false, recorrencia: null }); n++; }
  }
  setCfg('fin_mes_gerado', ym);
  if (n) toast(n + ' lançamento'+(n>1?'s':'')+' recorrente'+(n>1?'s':'')+' do mês gerado'+(n>1?'s':'')+' 📆');
}
BootHooks.push(() => { if (FLAGS.onboarded) gerarRecorrenciasDoMes(); });

/* alerta na Hoje: contas vencendo ≤ 3 dias */
HojeExtras.alertas.push(() => {
  const limite = addDias(hoje(), 3);
  const venc = T('lancamentos_financeiros').filter(l => !l.pago && l.data <= limite);
  if (!venc.length) return '';
  const atrasos = venc.filter(l => l.data < hoje()).length;
  return '<div class="banner '+(atrasos ? 'err' : 'warn')+'" data-act="nav" data-r="financas" style="cursor:pointer">💸 '
    + venc.length + ' conta'+(venc.length>1?'s':'')+' vencendo em até 3 dias ('+fmtBRL(sum(venc.map(l=>l.valor)))+')'
    + (atrasos ? ' — '+atrasos+' já vencida'+(atrasos>1?'s':'') : '') + ' →</div>';
});

/* ---- registro rápido de gasto (FAB / atalho) ---- */
act('qa-gasto', () => { closeModal(); lancRapidoModal('saida'); });
function lancRapidoModal(tipo) {
  const cats = T('categorias_financeiras').filter(c => c.tipo === tipo);
  modal('<div class="bx-h"><div class="h2">'+(tipo==='saida'?'💸 Novo gasto':'💵 Nova entrada')+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="field"><label>Valor (R$) *</label><input class="input" id="lc-valor" inputmode="decimal" autofocus placeholder="0,00" style="font-size:22px;font-weight:700"></div>'
    + '<div class="frow"><div class="field"><label>Categoria</label><select class="select" id="lc-cat">'
    + cats.map(c => '<option value="'+c.id+'">'+esc(c.nome)+'</option>').join('') + '<option value="">— sem categoria —</option></select></div>'
    + '<div class="field"><label>Conta</label><select class="select" id="lc-conta">'
    + T('contas_financeiras').map(c => '<option value="'+c.id+'">'+esc(c.nome)+'</option>').join('') + '<option value="">—</option></select></div></div>'
    + '<div class="frow"><div class="field"><label>Descrição</label><input class="input" id="lc-desc" placeholder="ex.: mercado"></div>'
    + '<div class="field"><label>Data</label><input class="input" type="date" id="lc-data" value="'+hoje()+'"></div></div>'
    + '<label class="checkline"><input type="checkbox" id="lc-pago" checked> já '+(tipo==='saida'?'pago':'recebido')+'</label>'
    + '<div class="bx-foot"><button class="btn primary big" data-act="lc-salvar" data-tipo="'+tipo+'">✓ Salvar</button></div>');
}
act('lc-salvar', el => {
  const valor = parseValor($('#lc-valor').value);
  if (!(valor > 0)) { toast('Informe o valor.'); return; }
  const tipo = el.dataset.tipo;
  const catId = $('#lc-cat').value || null;
  const l = dbUpsert('lancamentos_financeiros', { tipo, valor, data: $('#lc-data').value || hoje(),
    categoria_id: catId, conta_id: $('#lc-conta').value || null,
    descricao: $('#lc-desc').value.trim() || null, pago: $('#lc-pago').checked, recorrencia: null });
  closeModal();
  toast((tipo==='saida'?'💸 −':'💵 +') + fmtBRL(valor) + ' registrado ✓', { undo: () => { dbDelete('lancamentos_financeiros', l.id); render(); } });
  if (tipo === 'saida' && catId) {
    const c = catFin(catId);
    if (c && c.orcamento_mensal > 0) {
      const pct = gastoCategoriaMes(catId, mesDe(hoje())) / c.orcamento_mensal;
      if (pct > 1) setTimeout(() => toast('🔴 ' + esc(c.nome) + ' estourou o orçamento (' + Math.round(pct*100) + '%)', {ms:5000}), 600);
      else if (pct >= 0.8) setTimeout(() => toast('🟡 ' + esc(c.nome) + ' chegou a ' + Math.round(pct*100) + '% do orçamento', {ms:5000}), 600);
    }
  }
  if (window.checkConquistas) checkConquistas('financas');
  render();
});

/* ---- página FINANÇAS (abas Fluxo | Investimentos) ---- */
reg('financas', {
  titulo: 'Finanças',
  render: (params) => {
    const aba = params[0] === 'investimentos' ? 'investimentos' : 'fluxo';
    let html = '<div class="row wrap" style="margin-bottom:10px"><div class="h1" style="flex:1">💰 Finanças</div>'
      + '<div class="seg"><button class="'+(aba==='fluxo'?'on':'')+'" data-act="nav" data-r="financas">💸 Fluxo</button>'
      + '<button class="'+(aba==='investimentos'?'on':'')+'" data-act="nav" data-r="financas/investimentos">📈 Investimentos</button></div></div>';
    if (aba === 'investimentos') return html + (window.investTabHTML ? investTabHTML(params) : '<div class="card"><div class="empty"><span class="em">🚧</span>Investimentos chegam na próxima etapa.</div></div>');
    return html + fluxoTabHTML(params[1] || mesDe(hoje()));
  }
});
function fluxoTabHTML(ym) {
  const r = resumoMes(ym);
  const [y, m] = ym.split('-').map(Number);
  const mesAnt = m === 1 ? (y-1)+'-12' : y+'-'+pad2(m-1);
  const mesProx = m === 12 ? (y+1)+'-01' : y+'-'+pad2(m+1);
  let html = '<div class="row" style="margin-bottom:10px"><button class="btn small" data-act="nav" data-r="financas/fluxo/'+mesAnt+'">←</button>'
    + '<b style="flex:1;text-align:center">'+ucfirst(fmtMes(ym))+'</b>'
    + '<button class="btn small" data-act="nav" data-r="financas/fluxo/'+mesProx+'">→</button></div>'
    + '<div class="grid4">'
    + '<div class="kpi"><div class="l">entradas</div><div class="v ok">'+fmtBRL(r.entradas)+'</div></div>'
    + '<div class="kpi"><div class="l">saídas</div><div class="v err">'+fmtBRL(r.saidas)+'</div></div>'
    + '<div class="kpi"><div class="l">saldo do mês</div><div class="v '+(r.saldo>=0?'ok':'err')+'">'+fmtBRL(r.saldo)+'</div></div>'
    + '<div class="kpi" style="border-color:rgba(124,92,252,.5)"><div class="l acc">📈 investido no mês</div><div class="v acc">'+fmtBRL(r.investido)+'</div><div class="d muted tiny">aporte não é despesa</div></div></div>'
    + '<div class="row wrap" style="margin:2px 0 14px">'
    + '<button class="btn primary" data-act="qa-gasto">+ Gasto</button>'
    + '<button class="btn" data-act="lc-nova-entrada">+ Entrada</button>'
    + '<button class="btn" data-act="lc-completo">+ Conta a pagar / recorrente</button>'
    + '<button class="btn ghost" data-act="fin-cats">🏷️ Categorias</button>'
    + '<button class="btn ghost" data-act="fin-contas">🏦 Contas</button></div>';
  // contas a pagar / receber
  const pend = ordenar(T('lancamentos_financeiros').filter(l => !l.pago), l => l.data).filter(l => l.data <= fimDoMes(ym));
  if (pend.length) {
    html += '<div class="card pad0"><div class="sec-head" style="padding:12px 14px 4px">📌 A pagar / receber</div><div class="list" style="padding:0 10px 8px">'
      + pend.map(l => { const atras = l.data < hoje();
        return '<div class="item" data-act="lc-edit" data-id="'+l.id+'"><span>'+(l.tipo==='saida'?'💸':'💵')+'</span>'
          + '<div class="grow"><div class="ttl">'+esc(l.descricao||((catFin(l.categoria_id)||{}).nome)||'lançamento')+'</div>'
          + '<div class="sub"><span class="'+(atras?'err':l.data<=addDias(hoje(),3)?'warn':'')+'">vence '+fmtData(l.data)+'</span>'
          + (catFin(l.categoria_id)?' · '+esc(catFin(l.categoria_id).nome):'')+'</div></div>'
          + '<b class="'+(l.tipo==='saida'?'err':'ok')+'">'+fmtBRL(l.valor)+'</b>'
          + '<button class="btn small ok" data-act="lc-pagar" data-id="'+l.id+'">✓ '+(l.tipo==='saida'?'pagar':'receber')+'</button></div>'; }).join('') + '</div></div>';
  }
  // orçamento por categoria
  const catsOrc = T('categorias_financeiras').filter(c => c.tipo === 'saida' && c.orcamento_mensal > 0);
  if (catsOrc.length) {
    html += '<div class="card"><div class="h2">🎯 Orçamento do mês</div>' + catsOrc.map(c => {
      const gasto = gastoCategoriaMes(c.id, ym), pct = gasto / c.orcamento_mensal;
      return '<div style="margin-bottom:10px"><div class="row tiny" style="margin-bottom:4px"><span class="dot" style="background:'+(c.cor||'#5CC8FC')+'"></span><b>'+esc(c.nome)+'</b><span class="sp"></span>'
        + '<span class="'+corOrcamento(pct)+'">'+fmtBRL(gasto)+' / '+fmtBRL(c.orcamento_mensal)+' ('+Math.round(pct*100)+'%)</span></div>'
        + '<div class="bar"><i class="'+corOrcamento(pct)+'" style="width:'+clamp(pct*100,2,100)+'%"></i></div></div>';
    }).join('') + '<div class="tiny muted">Aportes em investimentos nunca entram aqui — patrimônio não é consumo.</div></div>';
  }
  // entradas × saídas (6 meses)
  let barras = '', mm = ym;
  const grupos = [];
  for (let i = 0; i < 6; i++) { grupos.unshift(mm); const [yy, mo] = mm.split('-').map(Number); mm = mo === 1 ? (yy-1)+'-12' : yy+'-'+pad2(mo-1); }
  const maxV = Math.max(...grupos.map(g => { const rr = resumoMes(g); return Math.max(rr.entradas, rr.saidas); }), 1);
  grupos.forEach((g, i) => {
    const rr = resumoMes(g);
    const x = 30 + i * 86;
    barras += '<rect x="'+x+'" y="'+(150 - rr.entradas/maxV*130)+'" width="26" height="'+Math.max(1, rr.entradas/maxV*130)+'" rx="4" fill="var(--ok)"/>'
      + '<rect x="'+(x+30)+'" y="'+(150 - rr.saidas/maxV*130)+'" width="26" height="'+Math.max(1, rr.saidas/maxV*130)+'" rx="4" fill="var(--err)"/>'
      + '<text x="'+(x+28)+'" y="166" font-size="10" fill="#9AA0B0" text-anchor="middle">'+MESES_C[Number(g.slice(5,7))-1]+'</text>';
  });
  html += '<div class="card"><div class="h2">📊 Entradas × saídas (6 meses)</div><div class="chartbox"><svg viewBox="0 0 560 172">'+barras+'</svg></div>'
    + '<div class="legend"><span><i class="dot" style="background:var(--ok)"></i>entradas</span><span><i class="dot" style="background:var(--err)"></i>saídas</span></div></div>';
  // pizza por categoria
  const porCat = {};
  lancDoMes(ym).filter(l => l.tipo === 'saida' && l.pago).forEach(l => { const k = l.categoria_id || 'sem'; porCat[k] = (porCat[k]||0) + Number(l.valor); });
  html += '<div class="card"><div class="h2">🥧 Saídas por categoria</div>'
    + svgPizza(Object.entries(porCat).map(([k, v]) => ({ label: k === 'sem' ? 'sem categoria' : (catFin(k)||{}).nome || '?', valor: v, cor: k === 'sem' ? '#9AA0B0' : (catFin(k)||{}).cor || '#5CC8FC' })), { fmt: fmtBRL }) + '</div>';
  // lançamentos do mês
  const doMes = ordenar(lancDoMes(ym), l => l.data + (l.criado_em||''), true);
  html += '<div class="card pad0"><div class="sec-head" style="padding:12px 14px 4px">Lançamentos de '+fmtMes(ym)+' ('+doMes.length+')</div><div class="list" style="padding:0 10px 8px">'
    + (doMes.slice(0, 60).map(l => '<div class="item" data-act="lc-edit" data-id="'+l.id+'"><span>'+(l.tipo==='saida'?'💸':'💵')+'</span>'
      + '<div class="grow"><div class="ttl">'+esc(l.descricao||((catFin(l.categoria_id)||{}).nome)||'lançamento')+(l.recorrencia?' <span class="badge acc">🔁 modelo</span>':'')+(!l.pago?' <span class="badge warn">pendente</span>':'')+'</div>'
      + '<div class="sub">'+fmtData(l.data)+(catFin(l.categoria_id)?' · '+esc(catFin(l.categoria_id).nome):'')+'</div></div>'
      + '<b class="'+(l.tipo==='saida'?'err':'ok')+'">'+(l.tipo==='saida'?'−':'+')+fmtBRL(l.valor)+'</b></div>').join('')
    || '<div class="empty"><span class="em">💸</span>Nenhum lançamento neste mês.</div>') + '</div></div>';
  return html;
}
act('lc-nova-entrada', () => lancRapidoModal('entrada'));
act('lc-pagar', el => {
  const l = byId('lancamentos_financeiros', el.dataset.id);
  dbPatch('lancamentos_financeiros', l.id, { pago: true });
  toast('✓ ' + fmtBRL(l.valor) + ' marcado como ' + (l.tipo==='saida'?'pago':'recebido') + '.', { undo: () => { dbPatch('lancamentos_financeiros', l.id, {pago:false}); render(); } });
  if (window.checkConquistas) checkConquistas('financas');
  render();
});
const lancFields = () => [
  {k:'tipo', t:'sel', l:'Tipo', meia:1, opts:[{v:'saida',t:'💸 saída'},{v:'entrada',t:'💵 entrada'}]},
  {k:'valor', t:'money', l:'Valor (R$)', meia:1, req:1},
  {k:'descricao', l:'Descrição'},
  {k:'categoria_id', t:'sel', l:'Categoria', meia:1, opts: [{v:'',t:'—'}].concat(T('categorias_financeiras').map(c => ({v:c.id, t:(c.tipo==='entrada'?'💵 ':'💸 ')+c.nome})))},
  {k:'conta_id', t:'sel', l:'Conta', meia:1, opts: [{v:'',t:'—'}].concat(T('contas_financeiras').map(c => ({v:c.id, t:c.nome})))},
  {k:'data', t:'date', l:'Data/vencimento', meia:1},
  {k:'pago', t:'chk', l:'Pago / recebido'},
  {k:'recorrente', t:'chk', l:'Repete todo mês (modelo recorrente)', dica:'gera lançamento pendente na virada do mês'}
];
act('lc-completo', () => editModal({ titulo:'Novo lançamento', fields: lancFields(), vals:{tipo:'saida', data: hoje(), pago:false},
  onSave: v => { salvarLancCompleto(v, null); } }));
act('lc-edit', el => {
  const l = byId('lancamentos_financeiros', el.dataset.id);
  editModal({ titulo:'Lançamento', fields: lancFields(), vals: {...l, recorrente: !!l.recorrencia},
    onSave: v => salvarLancCompleto(v, l),
    onDelete: () => { const bkp = {...l}; dbDelete('lancamentos_financeiros', l.id); render();
      toast('Lançamento excluído.', {undo: () => { dbUpsert('lancamentos_financeiros', bkp); render(); }}); } });
});
function salvarLancCompleto(v, existente) {
  if (!(v.valor > 0)) { toast('Informe o valor.'); return; }
  dbUpsert('lancamentos_financeiros', { id: existente ? existente.id : undefined, tipo: v.tipo, valor: v.valor,
    data: v.data || hoje(), categoria_id: v.categoria_id || null, conta_id: v.conta_id || null,
    descricao: v.descricao || null, pago: !!v.pago,
    recorrencia: v.recorrente ? { freq:'mensal', dia: pDate(v.data || hoje()).getDate() } : null });
  render();
}
/* categorias e contas */
const catFinFields = [
  {k:'nome', l:'Nome', req:1, foco:1},
  {k:'tipo', t:'sel', l:'Tipo', meia:1, opts:[{v:'saida',t:'💸 saída'},{v:'entrada',t:'💵 entrada'}]},
  {k:'orcamento_mensal', t:'money', l:'Orçamento mensal (R$)', meia:1, dica:'só para saídas'},
  {k:'cor', t:'cor', l:'Cor'}
];
act('fin-cats', () => {
  modal('<div class="bx-h"><div class="h2">🏷️ Categorias</div><button class="btn small" data-act="cat-add">+ Nova</button></div><div class="list">'
    + T('categorias_financeiras').map(c => '<div class="item" data-act="cat-edit" data-id="'+c.id+'"><span class="dot" style="background:'+(c.cor||'#5CC8FC')+'"></span>'
      + '<div class="grow"><div class="ttl">'+esc(c.nome)+'</div><div class="sub">'+(c.tipo==='entrada'?'entrada':'saída')+(c.orcamento_mensal?' · orçamento '+fmtBRL(c.orcamento_mensal):'')+'</div></div></div>').join('')+'</div>');
});
act('cat-add', () => { closeModal(); editModal({ titulo:'Nova categoria', fields: catFinFields, vals:{tipo:'saida'},
  onSave: v => { dbUpsert('categorias_financeiras', v); render(); } }); });
act('cat-edit', el => { closeModal();
  const c = byId('categorias_financeiras', el.dataset.id);
  editModal({ titulo:'Categoria', fields: catFinFields, vals: c,
    onSave: v => { dbPatch('categorias_financeiras', c.id, v); render(); },
    onDelete: () => { dbDelete('categorias_financeiras', c.id); render(); toast('Categoria excluída (lançamentos preservados).'); } }); });
act('fin-contas', () => {
  modal('<div class="bx-h"><div class="h2">🏦 Contas</div><button class="btn small" data-act="conta-add">+ Nova</button></div><div class="list">'
    + T('contas_financeiras').map(c => '<div class="item" data-act="conta-edit" data-id="'+c.id+'"><span>🏦</span><div class="grow"><div class="ttl">'+esc(c.nome)+'</div><div class="sub">'+esc(c.tipo||'conta')+'</div></div></div>').join('')+'</div>');
});
const contaFields = [ {k:'nome', l:'Nome', req:1, foco:1}, {k:'tipo', t:'sel', l:'Tipo', opts:['conta','dinheiro','cartão','poupança','outro']} ];
act('conta-add', () => { closeModal(); editModal({ titulo:'Nova conta', fields: contaFields, onSave: v => { dbUpsert('contas_financeiras', v); render(); } }); });
act('conta-edit', el => { closeModal();
  const c = byId('contas_financeiras', el.dataset.id);
  editModal({ titulo:'Conta', fields: contaFields, vals: c,
    onSave: v => { dbPatch('contas_financeiras', c.id, v); render(); },
    onDelete: () => { dbDelete('contas_financeiras', c.id); render(); } }); });
/* ════════════════ ETAPA 14 — FINANÇAS · INVESTIMENTOS (Painel B) ════════════════ */
const CLASSES_ATIVO = [['renda_fixa','Renda fixa'],['acoes','Ações'],['fiis','FIIs'],['cripto','Cripto'],['outros','Outros']];
const classeLabel = c => (CLASSES_ATIVO.find(x => x[0] === c) || ['', 'Outros'])[1];
function saldoAtualAtivo(id) {
  const ss = ordenar(T('investimentos_saldos').filter(s => s.ativo_id === id), s => s.data, true);
  return ss.length ? { saldo: Number(ss[0].saldo), data: ss[0].data } : null;
}
function patrimonioTotal() {
  let tot = 0;
  for (const a of T('investimentos_ativos').filter(a => a.ativo !== false)) {
    const s = saldoAtualAtivo(a.id);
    if (s) tot += s.saldo;
  }
  return tot;
}
const movsAtivo = id => T('investimentos_movimentos').filter(m => m.ativo_id === id);
function rentabilidadeAtivo(id) { // regra 5: (saldo atual − total aportado + total resgatado) / total aportado
  const aportes = sum(movsAtivo(id).filter(m => m.tipo === 'aporte').map(m => m.valor));
  const resgates = sum(movsAtivo(id).filter(m => m.tipo === 'resgate').map(m => m.valor));
  const s = saldoAtualAtivo(id);
  if (!aportes || !s) return null;
  return (s.saldo - aportes + resgates) / aportes;
}
function rentabilidadeGeral() {
  const aportes = sum(T('investimentos_movimentos').filter(m => m.tipo === 'aporte').map(m => m.valor));
  const resgates = sum(T('investimentos_movimentos').filter(m => m.tipo === 'resgate').map(m => m.valor));
  if (!aportes) return null;
  return (patrimonioTotal() - aportes + resgates) / aportes;
}
function serieMensalPatrimonio(n) {
  const out = [];
  const agora = new Date();
  for (let i = (n||12) - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const fim = dISO(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    let tot = 0;
    for (const a of T('investimentos_ativos')) {
      const ss = ordenar(T('investimentos_saldos').filter(s => s.ativo_id === a.id && s.data <= fim), s => s.data, true);
      if (ss.length) tot += Number(ss[0].saldo);
    }
    out.push({ x: MESES_C[d.getMonth()], y: Math.round(tot) });
  }
  let i0 = out.findIndex(p => p.y > 0);
  return i0 > 0 ? out.slice(Math.max(0, i0 - 1)) : out;
}

/* ---- aporte rápido (FAB) — NUNCA entra como despesa ---- */
act('qa-aporte', () => {
  closeModal();
  const ativos = T('investimentos_ativos').filter(a => a.ativo !== false);
  if (!ativos.length) { toast('Cadastre um ativo primeiro.', {icone:'📈'}); nav('financas/investimentos'); return; }
  modal('<div class="bx-h"><div class="h2">📈 Aporte / resgate</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + '<div class="row" style="margin-bottom:12px" id="ap-tipo"><span class="chip sel" data-act="ap-tipo-sel" data-v="aporte" style="flex:1;justify-content:center">📥 Aporte</span>'
    + '<span class="chip" data-act="ap-tipo-sel" data-v="resgate" style="flex:1;justify-content:center">📤 Resgate</span></div>'
    + '<div class="field"><label>Valor (R$) *</label><input class="input" id="ap-valor" inputmode="decimal" autofocus placeholder="0,00" style="font-size:22px;font-weight:700"></div>'
    + '<div class="frow"><div class="field"><label>Ativo</label><select class="select" id="ap-ativo">'
    + ativos.map(a => '<option value="'+a.id+'">'+esc(a.nome)+'</option>').join('') + '</select></div>'
    + '<div class="field"><label>Data</label><input class="input" type="date" id="ap-data" value="'+hoje()+'"></div></div>'
    + '<div class="field"><label>Nota</label><input class="input" id="ap-nota" placeholder="opcional"></div>'
    + '<div class="banner acc tiny">Aporte sai do caixa mas é patrimônio: <b>não entra nas despesas nem no orçamento</b>. O fluxo mostra "Investido no mês" como linha separada.</div>'
    + '<div class="bx-foot"><button class="btn primary big" data-act="ap-salvar">✓ Registrar</button></div>');
});
act('ap-tipo-sel', el => { $$('#ap-tipo .chip').forEach(c => c.classList.remove('sel')); el.classList.add('sel'); });
act('ap-salvar', () => {
  const valor = parseValor($('#ap-valor').value);
  if (!(valor > 0)) { toast('Informe o valor.'); return; }
  const tipo = ($('#ap-tipo .chip.sel')||{dataset:{v:'aporte'}}).dataset.v;
  const mv = dbUpsert('investimentos_movimentos', { ativo_id: $('#ap-ativo').value, tipo, valor,
    data: $('#ap-data').value || hoje(), nota: $('#ap-nota').value.trim() || null });
  closeModal();
  toast((tipo==='aporte' ? '📥 Aporte de ' : '📤 Resgate de ') + fmtBRL(valor) + ' registrado ✓',
    { undo: () => { dbDelete('investimentos_movimentos', mv.id); render(); } });
  if (window.checkConquistas) checkConquistas('investimento');
  render();
});

/* ---- aba Investimentos ---- */
function investTabHTML() {
  const ativos = T('investimentos_ativos');
  const patr = patrimonioTotal();
  const rg = rentabilidadeGeral();
  const ymAtual = mesDe(hoje());
  const aportadoAno = sum(T('investimentos_movimentos').filter(m => m.tipo === 'aporte' && anoDe(m.data) === new Date().getFullYear()).map(m => m.valor));
  let html = '<div class="grid4">'
    + '<div class="kpi"><div class="l">🏛️ patrimônio total</div><div class="v acc">'+fmtBRL(patr)+'</div></div>'
    + '<div class="kpi"><div class="l">investido no mês</div><div class="v">'+fmtBRL(aportadoNoMes(ymAtual))+'</div></div>'
    + '<div class="kpi"><div class="l">aportado no ano</div><div class="v">'+fmtBRL(aportadoAno)+'</div></div>'
    + '<div class="kpi"><div class="l">rentabilidade simples</div><div class="v '+(rg==null?'muted':rg>=0?'ok':'err')+'">'+(rg==null?'—':(rg>=0?'+':'')+fmtNum(rg*100,1)+'%')+'</div><div class="d muted tiny">saldo vs aportado</div></div></div>'
    + '<div class="row wrap" style="margin:2px 0 14px"><button class="btn primary" data-act="qa-aporte">+ Aporte / resgate</button>'
    + '<button class="btn" data-act="ativo-add">+ Ativo</button></div>';
  // meta de patrimônio
  const metaPatr = T('metas').find(m => m.vinculo_tipo === 'patrimonio' && !m.concluida);
  if (metaPatr) {
    const p = metaProgresso(metaPatr);
    const fimMeta = metaPatr.prazo || (metaPatr.ano ? metaPatr.ano + '-12-31' : null);
    const meses = fimMeta && fimMeta > hoje() ? Math.max(1, Math.round(diffDias(hoje(), fimMeta) / 30)) : null;
    html += '<div class="card" style="border-color:rgba(124,92,252,.5)"><div class="card-h"><div class="h2">🎯 '+esc(metaPatr.nome)+'</div>'
      + '<button class="iconbtn" data-act="meta-edit" data-id="'+metaPatr.id+'">✏️</button></div>'
      + '<div class="row"><div class="bar thick" style="flex:1"><i style="width:'+Math.round(p.pct*100)+'%"></i></div><b class="small">'+Math.round(p.pct*100)+'%</b></div>'
      + '<div class="tiny muted" style="margin-top:6px">'+fmtBRL(p.atual)+' de '+fmtBRL(p.alvo)
      + (meses && !p.atingida ? ' · ritmo necessário: <b class="warn">'+fmtBRL((p.alvo-p.atual)/meses)+'/mês</b> por '+meses+' meses' : p.atingida ? ' · 🎉 batida!' : '')+'</div></div>';
  } else {
    html += '<div class="card"><div class="row"><span class="muted small" style="flex:1">Defina uma meta de patrimônio ("chegar a R$ X") com ritmo de aporte calculado.</span>'
      + '<button class="btn small" data-act="invest-meta-criar">🎯 Criar meta</button></div></div>';
  }
  // evolução
  const serie = serieMensalPatrimonio(12);
  if (serie.some(p => p.y > 0)) html += '<div class="card"><div class="h2">📈 Evolução do patrimônio</div>'
    + svgLinha(serie, { fmt: v => 'R$' + fmtNum(v/1000,1) + 'k', cor:'var(--acc)' }) + '</div>';
  // ativos
  html += ativos.filter(a => a.ativo !== false).map(a => {
    const s = saldoAtualAtivo(a.id);
    const rent = rentabilidadeAtivo(a.id);
    const aportado = sum(movsAtivo(a.id).filter(m => m.tipo === 'aporte').map(m => m.valor));
    const velho = s && diffDias(s.data, hoje()) >= 60;
    return '<div class="card"><div class="card-h"><div style="flex:1"><div class="h2" style="margin:0">'+esc(a.nome)+'</div>'
      + '<div class="tiny muted">'+classeLabel(a.classe)+(a.instituicao?' · '+esc(a.instituicao):'')+'</div></div>'
      + '<div class="center"><div style="font-weight:800;font-size:16px">'+(s?fmtBRL(s.saldo):'—')+'</div>'
      + '<div class="tiny '+(velho?'warn':'muted')+'">'+(s ? (velho?'⏰ ':'')+'saldo de '+fmtData(s.data) : 'sem saldo ainda')+'</div></div>'
      + '<button class="iconbtn" data-act="ativo-edit" data-id="'+a.id+'">✏️</button></div>'
      + (velho ? '<div class="banner warn tiny" style="margin:2px 0 10px">Este ativo está há '+diffDias(s.data, hoje())+' dias sem atualização de saldo — que tal atualizar?</div>' : '')
      + '<div class="row wrap tiny muted" style="margin-bottom:10px"><span>aportado: <b>'+fmtBRL(aportado)+'</b></span>'
      + (rent != null ? '<span>· rentabilidade: <b class="'+(rent>=0?'ok':'err')+'">'+(rent>=0?'+':'')+fmtNum(rent*100,1)+'%</b></span>' : '') + '</div>'
      + '<div class="row wrap"><button class="btn small primary" data-act="saldo-atualizar" data-id="'+a.id+'">💰 Atualizar saldo</button>'
      + '<button class="btn small" data-act="qa-aporte">+ aporte</button></div></div>';
  }).join('') || '<div class="card"><div class="empty"><span class="em">📈</span>Cadastre seus ativos (CDB, ações, FIIs, cripto…) e acompanhe o patrimônio crescer.</div></div>';
  // movimentos recentes
  const movs = ordenar(T('investimentos_movimentos'), m => m.data + (m.criado_em||''), true).slice(0, 20);
  if (movs.length) html += '<div class="card pad0"><div class="sec-head" style="padding:12px 14px 4px">Movimentos recentes</div><div class="list" style="padding:0 10px 8px">'
    + movs.map(m => { const a = byId('investimentos_ativos', m.ativo_id);
      return '<div class="item" style="cursor:default"><span>'+(m.tipo==='aporte'?'📥':'📤')+'</span><div class="grow">'
        + '<div class="ttl">'+(m.tipo==='aporte'?'Aporte':'Resgate')+' · '+esc(a?a.nome:'?')+'</div>'
        + '<div class="sub">'+fmtData(m.data)+(m.nota?' · '+esc(m.nota):'')+'</div></div>'
        + '<b class="'+(m.tipo==='aporte'?'acc':'warn')+'">'+fmtBRL(m.valor)+'</b>'
        + '<button class="iconbtn" data-act="mov-del" data-id="'+m.id+'">✕</button></div>'; }).join('') + '</div></div>';
  const inativos = ativos.filter(a => a.ativo === false);
  if (inativos.length) html += '<details class="help"><summary>📦 Ativos encerrados ('+inativos.length+')</summary><div class="row wrap" style="margin-top:8px">'
    + inativos.map(a => '<span class="chip" data-act="ativo-edit" data-id="'+a.id+'">'+esc(a.nome)+'</span>').join('') + '</div></details>';
  return html;
}
act('invest-meta-criar', () => { metaModal(null); setTimeout(() => { $('#mt-vinc').value = 'patrimonio'; $('#mt-uni').value = 'R$'; $('#mt-nome').value = 'Chegar a R$ '; $('#mt-nome').focus(); }, 80); });
act('mov-del', el => { const m = {...byId('investimentos_movimentos', el.dataset.id)}; dbDelete('investimentos_movimentos', el.dataset.id); render();
  toast('Movimento excluído.', {undo: () => { dbUpsert('investimentos_movimentos', m); render(); }}); });
const ativoFields = [
  {k:'nome', l:'Nome', req:1, foco:1, ph:'ex.: Tesouro Selic 2029'},
  {k:'classe', t:'sel', l:'Classe', meia:1, opts: CLASSES_ATIVO.map(([v,t]) => ({v,t}))},
  {k:'instituicao', l:'Instituição', meia:1, ph:'corretora/banco'},
  {k:'ativo', t:'chk', l:'Ativo (em carteira)', def:true}
];
act('ativo-add', () => editModal({ titulo:'Novo ativo', fields: ativoFields, vals:{ativo:true, classe:'renda_fixa'},
  onSave: v => { const a = dbUpsert('investimentos_ativos', v); render(); Actions['saldo-atualizar']({dataset:{id:a.id}}); } }));
act('ativo-edit', el => {
  const a = byId('investimentos_ativos', el.dataset.id);
  editModal({ titulo:'Editar ativo', fields: ativoFields, vals: a,
    onSave: v => { dbPatch('investimentos_ativos', a.id, v); render(); },
    onDelete: () => confirmBox('Excluir o ativo, seus movimentos e saldos? (encerrar mantém o histórico)', () => {
      movsAtivo(a.id).forEach(m => dbDelete('investimentos_movimentos', m.id));
      T('investimentos_saldos').filter(s => s.ativo_id === a.id).forEach(s => dbDelete('investimentos_saldos', s.id));
      dbDelete('investimentos_ativos', a.id); render();
    }, {perigo:1, sim:'Excluir tudo'}) });
});
act('saldo-atualizar', el => {
  const a = byId('investimentos_ativos', el.dataset.id); if (!a) return;
  const s = saldoAtualAtivo(a.id);
  modal('<div class="bx-h"><div class="h2">💰 Saldo de '+esc(a.nome)+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + (s ? '<p class="tiny muted" style="margin-top:0">Último: '+fmtBRL(s.saldo)+' em '+fmtData(s.data)+'</p>' : '')
    + '<div class="frow"><div class="field"><label>Saldo total hoje (R$) *</label><input class="input" id="sd-valor" inputmode="decimal" autofocus placeholder="0,00" style="font-size:20px;font-weight:700"></div>'
    + '<div class="field"><label>Data</label><input class="input" type="date" id="sd-data" value="'+hoje()+'"></div></div>'
    + '<div class="bx-foot"><button class="btn primary" data-act="saldo-salvar" data-id="'+a.id+'">✓ Salvar snapshot</button></div>');
});
act('saldo-salvar', el => {
  const valor = parseValor($('#sd-valor').value);
  if (!(valor >= 0) || $('#sd-valor').value === '') { toast('Informe o saldo.'); return; }
  const data = $('#sd-data').value || hoje();
  const existente = T('investimentos_saldos').find(s => s.ativo_id === el.dataset.id && s.data === data);
  if (existente) dbPatch('investimentos_saldos', existente.id, { saldo: valor });
  else dbUpsert('investimentos_saldos', { ativo_id: el.dataset.id, data, saldo: valor });
  closeModal();
  toast('Patrimônio atualizado: ' + fmtBRL(patrimonioTotal()) + ' 🏛️');
  if (window.checkConquistas) checkConquistas('investimento');
  render();
});
/* ════════════════ ETAPA 15 — REVISÃO SEMANAL GUIADA ════════════════ */
function semanaEmRevisao() { // semana (seg–dom) cujo domingo já chegou
  const dom = fimSemana(hoje());
  const fim = dom <= hoje() ? dom : addDias(dom, -7);
  return { ini: addDias(fim, -6), fim };
}
function revisaoPendente() {
  const { fim } = semanaEmRevisao();
  return !T('revisoes').some(r => r.tipo === 'semanal' && r.periodo_fim === fim);
}
HojeExtras.alertas.push(() => revisaoPendente()
  ? '<div class="banner acc" data-act="nav" data-r="revisao" style="cursor:pointer">🧭 Revisão semanal pendente — ~10 min para fechar a semana com clareza →</div>' : '');

function metricasSemana(ini, fim) {
  const noPeriodo = d => d >= ini && d <= fim;
  const tarefas = T('tarefas').filter(t => t.concluida && noPeriodo((t.concluida_em||'').slice(0,10))).length;
  let habPoss = 0, habFeitos = 0;
  for (const h of habitosAtivos()) {
    if (h.tipo === 'semanal') { habPoss += h.freq_semanal || 1;
      habFeitos += Math.min(T('habito_registros').filter(r => r.habito_id === h.id && noPeriodo(r.data) && Number(r.valor) > 0).length, h.freq_semanal || 1); }
    else for (let d = ini; d <= fim; d = addDias(d, 1)) if (diaAtivo(h, d)) { habPoss++; if (diaFeito(h, d)) habFeitos++; }
  }
  const log = escritaLog();
  let palavras = 0; for (let d = ini; d <= fim; d = addDias(d, 1)) palavras += log[d] || 0;
  const energias = T('dias').filter(d => noPeriodo(d.data) && d.energia).map(d => d.energia);
  const ym = mesDe(fim);
  return {
    tarefas, habitos_pct: habPoss ? Math.round(habFeitos / habPoss * 100) : null,
    treinos: T('treino_sessoes').filter(s => noPeriodo(s.data)).length,
    km: Math.round(sum(T('corridas').filter(c => noPeriodo(c.data)).map(c => c.distancia_km)) * 10) / 10,
    paginas: sum(T('leitura_registros').filter(r => noPeriodo(r.data)).map(r => r.paginas)),
    palavras,
    gasto_semana: sum(T('lancamentos_financeiros').filter(l => l.tipo === 'saida' && l.pago && noPeriodo(l.data)).map(l => l.valor)),
    gasto_mes: sum(lancDoMes(ym).filter(l => l.tipo === 'saida' && l.pago).map(l => l.valor)),
    orcamento_mes: sum(T('categorias_financeiras').filter(c => c.tipo === 'saida').map(c => c.orcamento_mensal || 0)),
    aportes_mes: aportadoNoMes(ym),
    energia_media: energias.length ? Math.round(sum(energias) / energias.length * 10) / 10 : null,
    foco_min: sum(T('blocos').filter(b => b.foco && b.tempo_real_min && noPeriodo(dISO(new Date(b.inicio)))).map(b => b.tempo_real_min))
  };
}
function metricasCardsHTML(mx) {
  const kpi = (l, v, d) => '<div class="kpi"><div class="l">'+l+'</div><div class="v" style="font-size:19px">'+v+'</div>'+(d?'<div class="d muted tiny">'+d+'</div>':'')+'</div>';
  return '<div class="grid4" style="margin-bottom:4px">'
    + kpi('✅ tarefas', mx.tarefas) + kpi('🔁 hábitos', mx.habitos_pct != null ? mx.habitos_pct + '%' : '—')
    + kpi('🏋️ treinos', mx.treinos) + kpi('🏃 km', fmtNum(mx.km,1))
    + kpi('📖 páginas', mx.paginas) + kpi('✍️ palavras', fmtNum(mx.palavras))
    + kpi('🎯 foco', fmtMin(mx.foco_min)) + kpi('⚡ energia média', mx.energia_media != null ? mx.energia_media + '/5' : '—')
    + kpi('💸 gasto no mês', fmtBRL(mx.gasto_mes), mx.orcamento_mes ? Math.round(mx.gasto_mes / mx.orcamento_mes * 100) + '% do orçamento' : 'sem orçamento')
    + kpi('📈 aportes no mês', fmtBRL(mx.aportes_mes), 'fora do consumo') + '</div>';
}
reg('revisao', {
  titulo: 'Revisão semanal',
  render: (params) => {
    if (params[0] === 'historico') return revisaoHistoricoHTML();
    const { ini, fim } = semanaEmRevisao();
    const feita = T('revisoes').find(r => r.tipo === 'semanal' && r.periodo_fim === fim);
    const passo = window._revPasso || 1;
    let html = '<div class="row" style="margin-bottom:8px"><div class="h1" style="flex:1">🧭 Revisão semanal</div>'
      + '<button class="btn small" data-act="nav" data-r="revisao/historico">Histórico</button></div>'
      + '<p class="muted small" style="margin:0 0 12px">Semana de '+fmtDataCurta(ini)+' a '+fmtDataCurta(fim)+(feita?' · <span class="ok">já concluída ✓</span> (refazer substitui)':'')+'</p>'
      + '<div class="steps-dots" style="justify-content:flex-start">'+[1,2,3,4].map(i => '<i class="'+(i===passo?'on':'')+'"></i>').join('')+'</div>';
    const mx = metricasSemana(ini, fim);
    if (passo === 1) {
      html += '<div class="card"><div class="h2">1/4 · O retrospecto — números prontos</div>'+metricasCardsHTML(mx)+'</div>'
        + '<button class="btn primary big" data-act="rev-prox">Continuar →</button>';
    } else if (passo === 2) {
      const streaks = habitosAtivos().map(h => ({ h, s: habitoStreak(h) })).filter(x => x.s.atual > 0).sort((a, b) => b.s.atual - a.s.atual).slice(0, 5);
      const emRisco = T('metas').filter(m => !m.concluida).map(m => ({ m, p: metaProgresso(m) })).filter(x => x.p.status === 'risco' || x.p.status === 'vencida');
      html += '<div class="card"><div class="h2">2/4 · Streaks vivos 🔥</div>'
        + (streaks.length ? '<div class="row wrap">'+streaks.map(x => '<span class="chip">'+x.h.icone+' '+esc(x.h.nome)+' <b>'+x.s.atual+(x.h.tipo==='semanal'?'sem':'d')+'</b></span>').join('')+'</div>'
          : '<span class="muted small">Nenhum streak ativo — recomeçar também é constância.</span>') + '</div>'
        + '<div class="card"><div class="h2">Metas pedindo atenção ⚠️</div>'
        + (emRisco.length ? emRisco.map(x => metaCardHTML(x.m)).join('') : '<span class="muted small">Nenhuma meta em risco. 👏</span>') + '</div>'
        + '<button class="btn primary big" data-act="rev-prox">Continuar →</button>';
    } else if (passo === 3) {
      const r = window._revResp || {};
      html += '<div class="card"><div class="h2">3/4 · Três perguntas</div>'
        + '<div class="field"><label>O que funcionou esta semana?</label><textarea class="textarea" id="rev-q1" rows="2">'+esc(r.q1||'')+'</textarea></div>'
        + '<div class="field"><label>O que travou ou drenou energia?</label><textarea class="textarea" id="rev-q2" rows="2">'+esc(r.q2||'')+'</textarea></div>'
        + '<div class="field"><label>O que aprendeu / quer lembrar?</label><textarea class="textarea" id="rev-q3" rows="2">'+esc(r.q3||'')+'</textarea></div>'
        + '<div class="field"><label>As 3 prioridades da próxima semana (viram tarefas P1 reais)</label>'
        + [0,1,2].map(i => '<input class="input" id="rev-p'+i+'" value="'+esc((r.prioridades||[])[i]||'')+'" placeholder="prioridade '+(i+1)+'" style="margin-bottom:6px">').join('') + '</div></div>'
        + '<button class="btn primary big" data-act="rev-prox">Continuar →</button>';
    } else {
      html += '<div class="card"><div class="h2">4/4 · Planejar a semana</div>'
        + '<p class="muted small">Suas prioridades virarão tarefas P1 na segunda-feira. Reserve blocos para elas:</p>'
        + '<div class="row wrap" style="margin-bottom:10px">'
        + '<button class="btn" data-act="nav" data-r="agenda/semana/'+addDias(semanaEmRevisao().fim,1)+'">📅 Abrir agenda da próxima semana</button>'
        + '<button class="btn" data-act="modelo-aplicar" data-d="'+addDias(semanaEmRevisao().fim,1)+'">📋 Aplicar modelo na segunda</button></div>'
        + '<button class="btn primary big" data-act="rev-concluir">✓ Concluir revisão</button></div>';
    }
    return html;
  }
});
act('rev-prox', () => {
  if ((window._revPasso || 1) === 3) {
    window._revResp = { q1: $('#rev-q1').value.trim(), q2: $('#rev-q2').value.trim(), q3: $('#rev-q3').value.trim(),
      prioridades: [0,1,2].map(i => $('#rev-p'+i).value.trim()).filter(Boolean) };
  }
  window._revPasso = (window._revPasso || 1) + 1;
  render();
});
act('rev-concluir', () => {
  const { ini, fim } = semanaEmRevisao();
  const resp = window._revResp || {};
  const mx = metricasSemana(ini, fim); // métricas congeladas (regra 11)
  const anterior = T('revisoes').find(r => r.tipo === 'semanal' && r.periodo_fim === fim);
  if (anterior) dbDelete('revisoes', anterior.id);
  dbUpsert('revisoes', { tipo:'semanal', periodo_inicio: ini, periodo_fim: fim, metricas: mx, respostas: resp });
  const segunda = addDias(fim, 1);
  (resp.prioridades || []).forEach((p, i) => dbUpsert('tarefas', { titulo: p, prioridade: 1, vencimento: segunda,
    origem: 'revisao_semanal', ordem: i, subtarefas: [], etiquetas: [], comentarios: [], links: [],
    abandonada: false, concluida: false }));
  window._revPasso = 1; window._revResp = null;
  nav('hoje');
  toast('🧭 Semana fechada! ' + ((resp.prioridades||[]).length ? (resp.prioridades.length + ' prioridades viraram tarefas P1 de segunda.') : 'Boa semana!'), {ms:5500});
  if (window.checkConquistas) checkConquistas('revisao');
});
function revisaoHistoricoHTML() {
  const rs = ordenar(T('revisoes').filter(r => r.tipo === 'semanal'), r => r.periodo_fim, true);
  return '<div class="row" style="margin-bottom:10px"><div class="h1" style="flex:1">🧭 Revisões anteriores</div>'
    + '<button class="btn small" data-act="nav" data-r="revisao">← Voltar</button></div>'
    + '<div class="card pad0"><div class="list" style="padding:4px 10px">'
    + (rs.map(r => '<div class="item" data-act="rev-abrir" data-id="'+r.id+'"><span>🧭</span><div class="grow">'
      + '<div class="ttl">'+fmtDataCurta(r.periodo_inicio)+' – '+fmtDataCurta(r.periodo_fim)+'</div>'
      + '<div class="sub">'+(r.metricas?('✅'+r.metricas.tarefas+' · 🏋️'+r.metricas.treinos+' · 🏃'+fmtNum(r.metricas.km,1)+'km · ✍️'+fmtNum(r.metricas.palavras)):'')+'</div></div></div>').join('')
    || '<div class="empty"><span class="em">🧭</span>Nenhuma revisão concluída ainda.</div>') + '</div></div>';
}
act('rev-abrir', el => {
  const r = byId('revisoes', el.dataset.id); if (!r) return;
  const resp = r.respostas || {};
  modal('<div class="bx-h"><div class="h2">🧭 '+fmtDataCurta(r.periodo_inicio)+' – '+fmtDataCurta(r.periodo_fim)+'</div><button class="iconbtn" data-act="m-close">✕</button></div>'
    + (r.metricas ? metricasCardsHTML(r.metricas) : '')
    + (resp.q1 ? '<div class="field"><label>Funcionou</label><p class="small" style="margin:2px 0">'+esc(resp.q1)+'</p></div>' : '')
    + (resp.q2 ? '<div class="field"><label>Travou</label><p class="small" style="margin:2px 0">'+esc(resp.q2)+'</p></div>' : '')
    + (resp.q3 ? '<div class="field"><label>Aprendi</label><p class="small" style="margin:2px 0">'+esc(resp.q3)+'</p></div>' : '')
    + ((resp.prioridades||[]).length ? '<div class="field"><label>Prioridades</label><div class="row wrap">'+resp.prioridades.map(p => '<span class="chip mini">'+esc(p)+'</span>').join('')+'</div></div>' : ''),
    { wide:true });
});
/* ============ ETAPA 16: Dashboard Geral + Conquistas ============ */
/* ============ ETAPA 16: Dashboard Geral + Conquistas ============ */
function kpiHTML(l, v, d) {
  return '<div class="kpi"><div class="l">'+l+'</div><div class="v">'+v+'</div>'+(d?'<div class="d muted tiny">'+d+'</div>':'')+'</div>';
}
reg('dashboard', {
  titulo: 'Dashboard',
  render() {
    const h0 = hoje(), ini7 = addDias(h0, -6), ym = mesDe(h0);
    const mx = metricasSemana(ini7, h0); // mesmas métricas congeladas da revisão (últimos 7 dias)
    const pendHoje = T('tarefas').filter(t => !t.concluida && !t.abandonada && t.vencimento === h0).length;
    const feitasHoje = T('tarefas').filter(t => t.concluida && (t.concluida_em||'').slice(0,10) === h0).length;
    const rm = resumoMes(ym);
    const pat = patrimonioTotal();
    // melhor streak entre hábitos ativos
    let melhor = null;
    for (const h of habitosAtivos()) { const s = habitoStreak(h); if (s.atual > 0 && (!melhor || s.atual > melhor.atual)) melhor = { atual: s.atual, h }; }
    // metas
    const metasAtivas = T('metas').filter(m => !m.concluida);
    const metasBatidas = T('metas').filter(m => m.concluida || metaProgresso(m).atingida).length;
    const metasRisco = metasAtivas.filter(m => { const st = metaProgresso(m).status; return st === 'risco' || st === 'vencida'; });
    // tarefas concluídas por dia — 14 dias
    const barras = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDias(h0, -i);
      barras.push({ x: (i % 2 === 0) ? d.slice(8) : '', y: T('tarefas').filter(t => t.concluida && (t.concluida_em||'').slice(0,10) === d).length });
    }
    // heatmap geral de hábitos (12 semanas): % dos hábitos diários cumpridos no dia
    const porDia = {};
    const hsDiarios = habitosAtivos().filter(h => h.tipo !== 'semanal');
    if (hsDiarios.length) for (let d = addDias(h0, -83); d <= h0; d = addDias(d, 1)) {
      let poss = 0, fei = 0;
      for (const h of hsDiarios) if (diaAtivo(h, d)) { poss++; if (diaFeito(h, d)) fei++; }
      if (poss) porDia[d] = fei / poss;
    }
    const serieP = serieMensalPatrimonio(12);
    const topMetas = metasAtivas.map(m => ({ m, p: metaProgresso(m) })).sort((a, b) => b.p.pct - a.p.pct).slice(0, 3);
    checkConquistas('dashboard');

    return '<div class="row" style="margin-bottom:10px"><div class="h1" style="flex:1">📊 Dashboard</div>'
      + '<button class="btn small" data-act="nav" data-r="retro">🌅 Retrospectiva</button></div>'
      + '<div class="grid4" style="margin-bottom:14px">'
      + kpiHTML('✅ tarefas hoje', feitasHoje + '<span class="muted" style="font-size:14px"> feitas</span>', pendHoje ? pendHoje + ' pendentes' : 'dia limpo')
      + kpiHTML('🔁 hábitos (7d)', mx.habitos_pct != null ? mx.habitos_pct + '%' : '—', melhor ? '🔥 melhor streak: ' + melhor.atual + (melhor.h.tipo === 'semanal' ? ' sem' : ' dias') : '')
      + kpiHTML('🎯 foco (7d)', fmtMin(mx.foco_min), mx.energia_media != null ? '⚡ energia ' + mx.energia_media + '/5' : '')
      + kpiHTML('🏋️ treinos (7d)', mx.treinos, '🏃 ' + fmtNum(mx.km, 1) + ' km')
      + kpiHTML('📖 páginas (7d)', fmtNum(mx.paginas), '✍️ ' + fmtNum(mx.palavras) + ' palavras')
      + kpiHTML('💸 gasto no mês', fmtBRL(rm.saidas), rm.entradas ? 'saldo ' + fmtBRL(rm.saldo) : 'sem entradas no mês')
      + kpiHTML('📈 investido no mês', fmtBRL(rm.investido), 'fora do consumo')
      + kpiHTML('🏦 patrimônio', fmtBRL(pat), metasAtivas.length ? metasBatidas + ' metas batidas' : '')
      + '</div>'
      + '<div class="grid2">'
      + '<div class="card"><div class="h3" style="margin-bottom:6px">✅ Tarefas concluídas — 14 dias</div>' + svgBarras(barras, { h:150 }) + '</div>'
      + '<div class="card"><div class="h3" style="margin-bottom:6px">🏦 Patrimônio — 12 meses</div>'
        + (serieP.some(p => p.y > 0) ? svgLinha(serieP, { h:150, fmt: v => fmtBRL(v) }) : '<div class="empty small">registre saldos em Finanças → Investimentos</div>') + '</div>'
      + '</div>'
      + (hsDiarios.length ? '<div class="card"><div class="h3" style="margin-bottom:6px">🔁 Constância dos hábitos — 12 semanas</div>'
        + heatmapHTML(porDia, 84, v => v >= 1 ? 4 : v >= 0.75 ? 3 : v >= 0.4 ? 2 : v > 0 ? 1 : 0) + '</div>' : '')
      + (topMetas.length ? '<div class="card"><div class="card-h"><div class="h2">🎯 Metas em destaque</div>'
        + '<button class="btn small" data-act="nav" data-r="metas">ver todas →</button></div>'
        + topMetas.map(x => '<div class="row" style="margin-bottom:8px"><span class="small grow" style="font-weight:600">' + esc(x.m.nome) + '</span>'
          + '<div class="bar" style="width:130px"><i style="width:' + Math.round(x.p.pct * 100) + '%"></i></div>'
          + '<b class="small" style="width:42px;text-align:right">' + Math.round(x.p.pct * 100) + '%</b></div>').join('')
        + (metasRisco.length ? '<div class="banner warn tiny" style="margin-top:6px">⚠️ ' + metasRisco.length + ' meta' + (metasRisco.length > 1 ? 's' : '') + ' em risco ou vencida' + (metasRisco.length > 1 ? 's' : '') + '</div>' : '')
        + '</div>' : '')
      + '<div class="card"><div class="card-h"><div class="h2">🏆 Conquistas</div>'
      + '<button class="btn small" data-act="nav" data-r="conquistas">ver todas →</button></div>'
      + conquistasResumoHTML() + '</div>';
  }
});

/* ---- Conquistas (salvas na tabela `conquistas` → sincronizam entre dispositivos) ---- */
const CONQUISTAS_DEF = [
  { id:'primeira_tarefa', icon:'✅', nome:'Primeiro check', desc:'Conclua sua primeira tarefa.',
    check: () => T('tarefas').some(t => t.concluida) },
  { id:'tarefas_100', icon:'💯', nome:'Centenário', desc:'Conclua 100 tarefas.',
    check: () => T('tarefas').filter(t => t.concluida).length >= 100 },
  { id:'streak_7', icon:'🔥', nome:'Em chamas', desc:'Streak de 7 em algum hábito.',
    check: () => habitosAtivos().some(h => habitoStreak(h).atual >= 7) },
  { id:'streak_30', icon:'🌟', nome:'Mês sólido', desc:'Streak de 30 em algum hábito.',
    check: () => habitosAtivos().some(h => habitoStreak(h).atual >= 30) },
  { id:'treino_1', icon:'🏋️', nome:'Primeiro treino', desc:'Registre seu primeiro treino.',
    check: () => T('treino_sessoes').length > 0 },
  { id:'treino_10', icon:'💪', nome:'Consistente', desc:'10 treinos registrados.',
    check: () => T('treino_sessoes').length >= 10 },
  { id:'corrida_50km', icon:'🏃', nome:'Rodou 50', desc:'Acumule 50 km de corrida.',
    check: () => sum(T('corridas').map(c => c.distancia_km)) >= 50 },
  { id:'corrida_200km', icon:'🚀', nome:'Maratonista de base', desc:'Acumule 200 km de corrida.',
    check: () => sum(T('corridas').map(c => c.distancia_km)) >= 200 },
  { id:'livro_1', icon:'📚', nome:'Primeira página virada', desc:'Conclua seu primeiro livro.',
    check: () => T('livros').some(l => l.status === 'concluido') },
  { id:'livro_5', icon:'🦉', nome:'Leitor de verdade', desc:'Conclua 5 livros.',
    check: () => T('livros').filter(l => l.status === 'concluido').length >= 5 },
  { id:'palavras_1k', icon:'✍️', nome:'Escritor', desc:'Escreva 1.000 palavras.',
    check: () => sum(Object.values(escritaLog())) >= 1000 },
  { id:'palavras_10k', icon:'📜', nome:'Ensaísta', desc:'Escreva 10.000 palavras.',
    check: () => sum(Object.values(escritaLog())) >= 10000 },
  { id:'foco_10h', icon:'🎯', nome:'Profundo', desc:'10 horas de foco registradas.',
    check: () => sum(T('blocos').filter(b => b.foco).map(b => b.tempo_real_min || 0)) >= 600 },
  { id:'revisao_1', icon:'🧭', nome:'Piloto', desc:'Conclua sua primeira revisão semanal.',
    check: () => T('revisoes').some(r => r.tipo === 'semanal') },
  { id:'revisao_4', icon:'🔭', nome:'Disciplinado', desc:'4 revisões semanais concluídas.',
    check: () => T('revisoes').filter(r => r.tipo === 'semanal').length >= 4 },
  { id:'aporte_1', icon:'📈', nome:'Investidor', desc:'Registre seu primeiro aporte.',
    check: () => T('investimentos_movimentos').some(m => m.tipo === 'aporte') },
  { id:'patrimonio_100k', icon:'💰', nome:'Seis dígitos', desc:'Patrimônio acima de R$ 100 mil.',
    check: () => patrimonioTotal() >= 100000 },
  { id:'meta_batida', icon:'🏆', nome:'Alvo no centro', desc:'Bata uma meta.',
    check: () => T('metas').some(m => m.concluida || metaProgresso(m).atingida) }
];
function conquistasMapa() { const m = {}; for (const c of T('conquistas')) m[c.codigo] = c.desbloqueada_em || true; return m; }
function checkConquistas(origem) {
  // migra conquistas antigas guardadas só no navegador (versões anteriores)
  try {
    const old = JSON.parse(localStorage.getItem('lcos_conquistas') || 'null');
    if (old) { for (const k of Object.keys(old)) if (!byId('conquistas', k)) dbUpsert('conquistas', { codigo:k, desbloqueada_em: old[k] || nowISO() });
      localStorage.removeItem('lcos_conquistas'); }
  } catch (_) {}
  const tem = conquistasMapa();
  const novas = [];
  for (const c of CONQUISTAS_DEF) {
    if (tem[c.id]) continue;
    try { if (c.check()) { dbUpsert('conquistas', { codigo: c.id, desbloqueada_em: nowISO() }); novas.push(c); } } catch (_) {}
  }
  if (novas.length === 1) toast('🏆 Conquista desbloqueada: <b>' + esc(novas[0].nome) + '</b>!', { ms: 5000 });
  else if (novas.length > 1) toast('🏆 ' + novas.length + ' conquistas desbloqueadas! Veja no Dashboard.', { ms: 5000 });
}
window.checkConquistas = checkConquistas;
BootHooks.push(() => { if (FLAGS.onboarded) { try { checkConquistas('boot'); } catch (_) {} } });
function conquistasResumoHTML() {
  const tem = conquistasMapa();
  const ok = CONQUISTAS_DEF.filter(c => tem[c.id]).length;
  return '<div class="row wrap" style="gap:8px;margin-bottom:8px">'
    + CONQUISTAS_DEF.map(c => '<span title="' + esc(c.nome) + ' — ' + esc(c.desc) + '" style="font-size:23px;' + (tem[c.id] ? '' : 'opacity:.22;filter:grayscale(1)') + '">' + c.icon + '</span>').join('')
    + '</div><div class="small muted">' + ok + ' de ' + CONQUISTAS_DEF.length + ' desbloqueadas</div>';
}
reg('conquistas', {
  titulo: 'Conquistas',
  render() {
    checkConquistas('tela');
    const tem = conquistasMapa();
    return '<div class="row" style="margin-bottom:12px"><div class="h1" style="flex:1">🏆 Conquistas</div>'
      + '<button class="btn small" data-act="nav" data-r="dashboard">← Dashboard</button></div>'
      + '<div class="card pad0"><div class="list" style="padding:4px 10px">'
      + CONQUISTAS_DEF.map(c => {
        const q = tem[c.id];
        return '<div class="item" style="cursor:default;' + (q ? '' : 'opacity:.45') + '">'
          + '<span style="font-size:26px;' + (q ? '' : 'filter:grayscale(1)') + '">' + c.icon + '</span>'
          + '<div class="grow"><div class="ttl">' + esc(c.nome) + (q ? ' <span class="badge ok">✓</span>' : '') + '</div>'
          + '<div class="sub">' + esc(c.desc) + (q && typeof q === 'string' ? ' · ' + fmtDataCurta(q.slice(0,10)) : '') + '</div></div></div>';
      }).join('') + '</div></div>';
  }
});

/* lembrete na Hoje: entrar com o Google quando a sincronização estiver pausada */
HojeExtras.alertas.push(() => {
  if (!CFG.url || !CFG.key || usuarioAutenticado()) return '';
  return '<div class="banner warn" data-act="auth-login" style="cursor:pointer">🔑 Sincronização pausada — toque para entrar com o Google e salvar tudo na nuvem →</div>';
});

/* ============ ETAPA 17: Retrospectiva Anual ============ */
reg('retro', {
  titulo: 'Retrospectiva',
  render(params) {
    const anoAtual = anoDe(hoje());
    const ano = Number(params[0]) || anoAtual;
    const ini = ano + '-01-01', fim = ano + '-12-31';
    const noAno = d => d && d >= ini && d <= fim;

    const tarefas = T('tarefas').filter(t => t.concluida && noAno((t.concluida_em||'').slice(0,10))).length;
    const diasComHabito = new Set(T('habito_registros').filter(r => noAno(r.data) && Number(r.valor) > 0).map(r => r.data)).size;
    const corridasAno = T('corridas').filter(c => noAno(c.data));
    const km = sum(corridasAno.map(c => c.distancia_km));
    const treinos = T('treino_sessoes').filter(s => noAno(s.data)).length;
    const livros = T('livros').filter(l => l.status === 'concluido' && noAno(l.fim)).length;
    const paginas = sum(T('leitura_registros').filter(r => noAno(r.data)).map(r => r.paginas));
    const log = escritaLog();
    const palavras = sum(Object.keys(log).filter(noAno).map(d => log[d]));
    const focoMin = sum(T('blocos').filter(b => b.foco && b.inicio && noAno(dISO(new Date(b.inicio)))).map(b => b.tempo_real_min || 0));
    const revisoes = T('revisoes').filter(r => r.tipo === 'semanal' && noAno(r.periodo_fim)).length;
    const metasBatidas = T('metas').filter(m => (m.ano === ano || (m.prazo && anoDe(m.prazo) === ano)) && (m.concluida || metaProgresso(m).atingida)).length;
    const lancsAno = T('lancamentos_financeiros').filter(l => l.pago && noAno(l.data));
    const entradas = sum(lancsAno.filter(l => l.tipo === 'entrada').map(l => l.valor));
    const saidas = sum(lancsAno.filter(l => l.tipo === 'saida').map(l => l.valor));
    const aportes = sum(T('investimentos_movimentos').filter(m => m.tipo === 'aporte' && noAno(m.data)).map(m => m.valor));
    const pat = patrimonioTotal();

    const kmMes = MESES_C.map((nome, i) => ({ x: nome, y: Math.round(sum(corridasAno.filter(c => Number(c.data.slice(5,7)) === i + 1).map(c => c.distancia_km)) * 10) / 10 }));

    return '<div class="row" style="margin-bottom:12px">'
      + '<button class="btn small" data-act="nav" data-r="retro/' + (ano - 1) + '">←</button>'
      + '<div class="h1" style="flex:1;text-align:center">🌅 Retrospectiva ' + ano + '</div>'
      + (ano < anoAtual ? '<button class="btn small" data-act="nav" data-r="retro/' + (ano + 1) + '">→</button>' : '<span style="width:34px"></span>') + '</div>'
      + (ano === anoAtual && hoje().slice(5,7) !== '12' ? '<div class="banner acc tiny" style="margin-bottom:10px">O ano ainda está rolando — estes números crescem até dezembro. 😉</div>' : '')
      + '<div class="grid4" style="margin-bottom:14px">'
      + kpiHTML('✅ tarefas concluídas', fmtNum(tarefas), '')
      + kpiHTML('🔁 dias com hábitos', fmtNum(diasComHabito), 'de ' + (ano === anoAtual ? diffDias(ini, hoje()) + 1 : 365))
      + kpiHTML('🏃 km corridos', fmtNum(km, 1), corridasAno.length + ' corridas')
      + kpiHTML('🏋️ treinos', fmtNum(treinos), '')
      + kpiHTML('📚 livros concluídos', fmtNum(livros), fmtNum(paginas) + ' páginas')
      + kpiHTML('✍️ palavras escritas', fmtNum(palavras), '')
      + kpiHTML('🎯 foco', fmtMin(focoMin), '')
      + kpiHTML('🧭 revisões semanais', fmtNum(revisoes), metasBatidas ? metasBatidas + ' metas batidas' : '')
      + '</div>'
      + (km > 0 ? '<div class="card"><div class="h3" style="margin-bottom:6px">🏃 Km por mês</div>' + svgBarras(kmMes, { h:150, vals:false }) + '</div>' : '')
      + '<div class="grid4" style="margin-bottom:14px">'
      + kpiHTML('💵 entradas', fmtBRL(entradas), '')
      + kpiHTML('💸 saídas', fmtBRL(saidas), '')
      + kpiHTML('📈 investido', fmtBRL(aportes), 'fora do consumo')
      + kpiHTML('🏦 patrimônio atual', fmtBRL(pat), '')
      + '</div>'
      + '<div class="row"><button class="btn primary" data-act="retro-compartilhar" data-ano="' + ano + '">📤 Compartilhar resumo</button></div>';
  }
});
act('retro-compartilhar', el => {
  const ano = Number(el.dataset.ano) || anoDe(hoje());
  const ini = ano + '-01-01', fim = ano + '-12-31';
  const noAno = d => d && d >= ini && d <= fim;
  const tarefas = T('tarefas').filter(t => t.concluida && noAno((t.concluida_em||'').slice(0,10))).length;
  const km = sum(T('corridas').filter(c => noAno(c.data)).map(c => c.distancia_km));
  const treinos = T('treino_sessoes').filter(s => noAno(s.data)).length;
  const livros = T('livros').filter(l => l.status === 'concluido' && noAno(l.fim)).length;
  const log = escritaLog();
  const palavras = sum(Object.keys(log).filter(noAno).map(d => log[d]));
  const texto = '🌅 Meu ' + ano + ' no Life OS\n\n'
    + '✅ ' + fmtNum(tarefas) + ' tarefas concluídas\n'
    + '🏃 ' + fmtNum(km, 1) + ' km corridos\n'
    + '🏋️ ' + fmtNum(treinos) + ' treinos\n'
    + '📚 ' + fmtNum(livros) + ' livros\n'
    + '✍️ ' + fmtNum(palavras) + ' palavras escritas';
  if (navigator.share) navigator.share({ title: 'Life OS ' + ano, text: texto }).catch(() => {});
  else copiarTexto(texto, '📋 Resumo copiado — cole onde quiser!');
});
/* ==FIM_ETAPAS== */

/* ============ BOOT ============ */
function runBootHooks() {
  BootHooks.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
}
function boot() {
  render();
  const authReady = window.LifeOSAuth && typeof window.LifeOSAuth.initAuth === 'function'
    ? window.LifeOSAuth.initAuth().catch(e => console.error('Falha ao inicializar autenticação:', e))
    : Promise.resolve();
  authReady.finally(runBootHooks);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
