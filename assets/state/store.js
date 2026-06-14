'use strict';
/* ============ ESTADO GLOBAL / MODELO DE DADOS ============ */
/* ════════════════ ETAPA 2 — DADOS: Supabase REST + offline + onboarding + Saúde ════════════════ */

/* ---- Modelo de dados (espelho da seção 5; chave primária por tabela) ---- */
const TABLES = {
  areas:'id', projetos:'id', secoes:'id', etiquetas:'id', tarefas:'id', filtros:'id',
  habitos:'id', habito_registros:'id', blocos:'id', rotina_modelos:'id',
  dias:'data', metas:'id', meta_registros:'id',
  categorias_financeiras:'id', contas_financeiras:'id', lancamentos_financeiros:'id',
  investimentos_ativos:'id', investimentos_movimentos:'id', investimentos_saldos:'id',
  treino_planilhas:'id', treino_exercicios:'id', treino_sessoes:'id', treino_registros:'id',
  corridas:'id', corpo_registros:'id',
  livros:'id', artigos:'id', leitura_notas:'id', leitura_registros:'id',
  textos:'id', revisoes:'id', conquistas:'codigo', configuracoes:'chave', feedback:'id'
};
const ON_CONFLICT = { habito_registros:'habito_id,data', investimentos_saldos:'ativo_id,data',
  etiquetas:'user_id,nome', dias:'user_id,data', configuracoes:'user_id,chave', conquistas:'user_id,codigo' };

/* ---- Ordem de dependência: PAIS antes de FILHOS (evita violar FK no flush) ---- */
const TABLE_ORDER = [
  // raízes (sem dependências) primeiro
  'areas','etiquetas','filtros','categorias_financeiras','contas_financeiras',
  'investimentos_ativos','treino_planilhas','artigos','rotina_modelos',
  'corridas','corpo_registros','revisoes','conquistas','configuracoes','dias','feedback',
  // dependem de uma raiz
  'projetos','habitos','metas','livros','textos',
  // dependem de nível 2
  'secoes','habito_registros','meta_registros','lancamentos_financeiros',
  'investimentos_movimentos','investimentos_saldos','treino_exercicios','treino_sessoes',
  'leitura_notas','leitura_registros',
  // dependem de nível 3
  'tarefas','treino_registros',
  // dependem de nível 4
  'blocos'
];
const tableRank = t => { const i = TABLE_ORDER.indexOf(t); return i < 0 ? 500 : i; };

/* ---- Chaves estrangeiras: tabela → [[campo, tabela_pai, obrigatorio]] ----
   obrigatorio=true  → linha não existe sem o pai; se o pai sumiu, a linha é descartada.
   obrigatorio=false → vínculo opcional; se o pai sumiu, o campo vira null (não quebra a FK). */
const FK_REFS = {
  projetos:[['area_id','areas',true]],
  secoes:[['projeto_id','projetos',true]],
  tarefas:[['area_id','areas',false],['projeto_id','projetos',false],['secao_id','secoes',false]],
  habitos:[['area_id','areas',false]],
  habito_registros:[['habito_id','habitos',true]],
  blocos:[['area_id','areas',false],['projeto_id','projetos',false],['tarefa_id','tarefas',false]],
  metas:[['area_id','areas',false]],
  meta_registros:[['meta_id','metas',true]],
  lancamentos_financeiros:[['categoria_id','categorias_financeiras',false],['conta_id','contas_financeiras',false]],
  investimentos_movimentos:[['ativo_id','investimentos_ativos',true]],
  investimentos_saldos:[['ativo_id','investimentos_ativos',true]],
  treino_exercicios:[['planilha_id','treino_planilhas',true]],
  treino_sessoes:[['planilha_id','treino_planilhas',false]],
  treino_registros:[['sessao_id','treino_sessoes',true],['exercicio_id','treino_exercicios',false]],
  livros:[['area_id','areas',false]],
  leitura_notas:[['livro_id','livros',false],['artigo_id','artigos',false]],
  leitura_registros:[['livro_id','livros',true]],
  textos:[['area_id','areas',false]]
};

/* ---- Colunas EXATAS de cada tabela no Supabase (espelho do schema SQL) ----
   Usado para normalizar cada registro antes do envio: mesmo conjunto de chaves
   para todos (evita o 400 "All object keys must match") e sem campos extras
   (evita 400 "column ... does not exist"). user_id é acrescentado no flush. */
const COLS = {
  areas:['id','nome','cor','icone','ordem','criado_em'],
  projetos:['id','area_id','nome','icone','status','prazo','criado_em'],
  secoes:['id','projeto_id','nome','ordem'],
  etiquetas:['id','nome','cor'],
  tarefas:['id','titulo','descricao','area_id','projeto_id','secao_id','vencimento','hora','prioridade','estimativa_min','recorrencia','subtarefas','etiquetas','comentarios','links','ordem','origem','abandonada','concluida','concluida_em','criado_em','bloco_id'],
  filtros:['id','nome','criterios','ordem'],
  habitos:['id','nome','icone','area_id','tipo','meta_quantidade','unidade','freq_semanal','dias_ativos','tolerancia_streak','fonte_auto','ativo','criado_em'],
  habito_registros:['id','habito_id','data','valor'],
  blocos:['id','titulo','area_id','projeto_id','tarefa_id','inicio','fim','tempo_real_min','foco','template','ordem','projetos_incluidos'],
  rotina_modelos:['id','nome','guiada','blocos'],
  dias:['data','energia','humor','nota','planejado','encerrado'],
  metas:['id','nome','area_id','valor_alvo','valor_atual','unidade','direcao','prazo','ano','vinculo_tipo','vinculo_id','fator_conversao','concluida','criado_em'],
  meta_registros:['id','meta_id','data','valor','nota'],
  categorias_financeiras:['id','nome','tipo','cor','orcamento_mensal'],
  contas_financeiras:['id','nome','tipo'],
  lancamentos_financeiros:['id','tipo','valor','data','categoria_id','conta_id','descricao','pago','recorrencia','criado_em'],
  investimentos_ativos:['id','nome','classe','instituicao','ativo','criado_em'],
  investimentos_movimentos:['id','ativo_id','tipo','valor','data','nota','criado_em'],
  investimentos_saldos:['id','ativo_id','data','saldo'],
  treino_planilhas:['id','nome','ordem','ativo','criado_em'],
  treino_exercicios:['id','planilha_id','nome','grupo_muscular','series_alvo','observacao','ordem'],
  treino_sessoes:['id','planilha_id','data','nota','criado_em'],
  treino_registros:['id','sessao_id','exercicio_id','exercicio_nome','carga_max','series_feitas','observacao'],
  corridas:['id','data','distancia_km','tempo_seg','percepcao','tipo','nota','criado_em'],
  corpo_registros:['id','data','peso_kg','medidas'],
  livros:['id','titulo','autor','status','paginas_total','pagina_atual','inicio','fim','avaliacao','resenha','area_id','criado_em'],
  artigos:['id','titulo','url','fonte','status','conteudo_cache','criado_em'],
  leitura_notas:['id','livro_id','artigo_id','tipo','conteudo','pagina','tags','proxima_revisao','intervalo_dias','arquivada','criado_em'],
  leitura_registros:['id','livro_id','data','paginas'],
  textos:['id','titulo','conteudo','status','tags','area_id','palavras','criado_em','atualizado_em'],
  revisoes:['id','tipo','periodo_inicio','periodo_fim','metricas','respostas','criado_em'],
  conquistas:['codigo','desbloqueada_em'],
  configuracoes:['chave','valor'],
  feedback:['id','titulo','tipo','assunto','problema','solucao','status','criado_em']
};

/* ---- Estado local (offline-first, regra 12) ---- */
const LSK = { data:'lifeos.dados', queue:'lifeos.fila', cfg:'lifeos.supabase', flags:'lifeos.flags', dead:'lifeos.fila_erros' };
const appSupabaseConfig = () => window.LifeOSSupabase ? { url: window.LifeOSSupabase.url, key: window.LifeOSSupabase.anonKey } : {};
function tabelasVazias(){ return Object.fromEntries(Object.keys(TABLES).map(t => [t, []])); }
const S = { data: tabelasVazias(), queue: [], deadQueue: [], flushing: false, sincronizando: false,
  syncErr: null, syncPausado: false, retry: 0, retryTimer: null, lastPull: null };
let CFG = {};
let FLAGS = {};
function loadLocal() {
  try { CFG = JSON.parse(localStorage.getItem(LSK.cfg) || '{}'); } catch(_) { CFG = {}; }
  CFG = { ...CFG, ...appSupabaseConfig() };
  if (CFG.url && CFG.key) saveCfg();
  try { FLAGS = JSON.parse(localStorage.getItem(LSK.flags) || '{}'); } catch(_) { FLAGS = {}; }
  try {
    const d = JSON.parse(localStorage.getItem(LSK.data) || 'null');
    if (d) for (const t of Object.keys(TABLES)) S.data[t] = Array.isArray(d[t]) ? d[t] : [];
  } catch(_) {}
  dedupPorId(); // consolida qualquer id repetido herdado de cache corrompido
  try { S.queue = JSON.parse(localStorage.getItem(LSK.queue) || '[]'); } catch(_) { S.queue = []; }
  try { S.deadQueue = JSON.parse(localStorage.getItem(LSK.dead) || '[]'); } catch(_) { S.deadQueue = []; }
}
/* Deduplicação defensiva: nunca manter dois registros com a MESMA chave primária
   no cache local (realimentaria o loop). Mantém a última ocorrência. */
function dedupPorId() {
  for (const t of Object.keys(TABLES)) {
    const arr = S.data[t]; if (!Array.isArray(arr) || arr.length < 2) continue;
    const pk = TABLES[t], vistos = new Map();
    for (const r of arr) { const k = r[pk]; if (k != null) vistos.set(k, r); }
    if (vistos.size !== arr.length) S.data[t] = Array.from(vistos.values());
  }
}
const saveLocal = debounce(() => { try { localStorage.setItem(LSK.data, JSON.stringify(S.data)); } catch(e) { toast('Atenção: armazenamento local cheio.', {icone:'⚠️'}); } }, 250);
const saveQueue = () => { try { localStorage.setItem(LSK.queue, JSON.stringify(S.queue)); } catch(_) {} };
const saveDead = () => { try { localStorage.setItem(LSK.dead, JSON.stringify(S.deadQueue)); } catch(_) {} };
const saveFlags = () => localStorage.setItem(LSK.flags, JSON.stringify(FLAGS));
const saveCfg = () => localStorage.setItem(LSK.cfg, JSON.stringify(CFG));

/* ---- API local de dados ---- */
const T = t => S.data[t] || [];
const byId = (t, id) => T(t).find(r => r[TABLES[t]] === id);
const ordenar = (arr, fn, desc) => [...arr].sort((a, b) => { const x = fn(a), y = fn(b); return (x<y?-1:x>y?1:0) * (desc?-1:1); });
function dbUpsert(t, row) {
  const pk = TABLES[t];
  if (row[pk] === undefined || row[pk] === null) row[pk] = pk === 'id' ? uid() : row[pk];
  if (!row.criado_em && ['areas','projetos','tarefas','habitos','lancamentos_financeiros','investimentos_ativos','investimentos_movimentos','treino_planilhas','treino_sessoes','corridas','livros','artigos','leitura_notas','textos','revisoes','metas','feedback'].includes(t)) row.criado_em = nowISO();
  const arr = T(t);
  const i = arr.findIndex(r => r[pk] === row[pk]);
  if (i < 0) arr.push(row); else arr[i] = row;
  enqueue('up', t, [row]);
  saveLocal();
  return row;
}
function dbPatch(t, id, patch) {
  const row = byId(t, id);
  if (!row) return null;
  Object.assign(row, patch);
  enqueue('up', t, [row]);
  saveLocal();
  return row;
}
function dbDelete(t, id) {
  const pk = TABLES[t];
  const arr = T(t);
  const i = arr.findIndex(r => r[pk] === id);
  if (i < 0) return null;
  const [row] = arr.splice(i, 1);
  enqueue('del', t, id);
  saveLocal();
  return row;
}
/* configurações sincronizadas (tabela configuracoes) */
const getCfg = (chave, def) => { const r = byId('configuracoes', chave); return r && r.valor !== undefined && r.valor !== null ? r.valor : def; };
const setCfg = (chave, valor) => dbUpsert('configuracoes', { chave, valor });
