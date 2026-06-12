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
  textos:'id', revisoes:'id', conquistas:'codigo', configuracoes:'chave'
};
const ON_CONFLICT = { habito_registros:'habito_id,data', investimentos_saldos:'ativo_id,data', etiquetas:'nome' };

/* ---- Estado local (offline-first, regra 12) ---- */
const LSK = { data:'lifeos.dados', queue:'lifeos.fila', cfg:'lifeos.supabase', flags:'lifeos.flags' };
function tabelasVazias(){ return Object.fromEntries(Object.keys(TABLES).map(t => [t, []])); }
const S = { data: tabelasVazias(), queue: [], flushing: false, syncErr: null, lastPull: null };
let CFG = {};
let FLAGS = {};
function loadLocal() {
  try { CFG = JSON.parse(localStorage.getItem(LSK.cfg) || '{}'); } catch(_) { CFG = {}; }
  try { FLAGS = JSON.parse(localStorage.getItem(LSK.flags) || '{}'); } catch(_) { FLAGS = {}; }
  try {
    const d = JSON.parse(localStorage.getItem(LSK.data) || 'null');
    if (d) for (const t of Object.keys(TABLES)) S.data[t] = Array.isArray(d[t]) ? d[t] : [];
  } catch(_) {}
  try { S.queue = JSON.parse(localStorage.getItem(LSK.queue) || '[]'); } catch(_) { S.queue = []; }
}
const saveLocal = debounce(() => { try { localStorage.setItem(LSK.data, JSON.stringify(S.data)); } catch(e) { toast('Atenção: armazenamento local cheio.', {icone:'⚠️'}); } }, 250);
const saveQueue = () => { try { localStorage.setItem(LSK.queue, JSON.stringify(S.queue)); } catch(_) {} };
const saveFlags = () => localStorage.setItem(LSK.flags, JSON.stringify(FLAGS));
const saveCfg = () => localStorage.setItem(LSK.cfg, JSON.stringify(CFG));

/* ---- API local de dados ---- */
const T = t => S.data[t] || [];
const byId = (t, id) => T(t).find(r => r[TABLES[t]] === id);
const ordenar = (arr, fn, desc) => [...arr].sort((a, b) => { const x = fn(a), y = fn(b); return (x<y?-1:x>y?1:0) * (desc?-1:1); });
function dbUpsert(t, row) {
  const pk = TABLES[t];
  if (row[pk] === undefined || row[pk] === null) row[pk] = pk === 'id' ? uid() : row[pk];
  if (!row.criado_em && ['areas','projetos','tarefas','habitos','lancamentos_financeiros','investimentos_ativos','investimentos_movimentos','treino_planilhas','treino_sessoes','corridas','livros','artigos','leitura_notas','textos','revisoes','metas'].includes(t)) row.criado_em = nowISO();
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
