'use strict';
/* ════════════════ FINANÇAS · FLUXO — dados de `movimentacoes` (Supabase) ════════════════
   Somente leitura: nunca usa dbUpsert/dbPatch/dbDelete, nunca entra em TABLES/pullAll/
   enqueue/flush. As consultas usam sb() (definida em app.js) diretamente contra as views
   v_movimentacoes_mensal / v_movimentacoes_categoria_mes / v_movimentacoes_cobertura e as
   tabelas movimentacoes / movimentacoes_detalhe, filtradas por ano_mes no servidor.
   Cache só em memória (nunca localStorage) — recarregado a cada sessão. */

const MOV = { mensal: {}, categorias: {}, cobertura: {}, lancamentos: {}, detalhe: {}, status: {}, erro: {} };

function movMensalZero(ym) {
  return { ano_mes: ym, entradas_operacionais: 0, saidas_operacionais: 0, saldo_operacional: 0,
    emprestimos_recebidos: 0, emprestimos_pagos: 0, aportes_investimento: 0, resgates_investimento: 0,
    caixa_liquido: 0, qtd_lancamentos: 0, qtd_revisar: 0 };
}
function movMesAdd(ym, delta) {
  let [y, m] = ym.split('-').map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return y + '-' + pad2(m);
}

async function fetchMovMensal(ym) {
  if (MOV.mensal[ym]) return MOV.mensal[ym];
  const linhas = await sb('GET', 'v_movimentacoes_mensal?ano_mes=eq.' + encodeURIComponent(ym) + '&select=*');
  MOV.mensal[ym] = (linhas && linhas[0]) || movMensalZero(ym);
  return MOV.mensal[ym];
}
async function fetchMovSerie(ateYm, n) {
  n = n || 6;
  const metas = [];
  for (let i = n - 1; i >= 0; i--) metas.push(movMesAdd(ateYm, -i));
  const faltam = metas.filter(m => !MOV.mensal[m]);
  if (faltam.length) {
    const lista = faltam.map(m => encodeURIComponent(m)).join(',');
    const linhas = await sb('GET', 'v_movimentacoes_mensal?ano_mes=in.(' + lista + ')&select=*');
    const porMes = {}; (linhas || []).forEach(l => { porMes[l.ano_mes] = l; });
    faltam.forEach(m => { MOV.mensal[m] = porMes[m] || movMensalZero(m); });
  }
  return metas.map(m => MOV.mensal[m]);
}
async function fetchMovCategorias(ym) {
  if (MOV.categorias[ym]) return MOV.categorias[ym];
  const linhas = await sb('GET', 'v_movimentacoes_categoria_mes?ano_mes=eq.' + encodeURIComponent(ym) + '&select=*');
  MOV.categorias[ym] = linhas || [];
  return MOV.categorias[ym];
}
async function fetchMovCobertura(ym) {
  if (MOV.cobertura[ym] !== undefined) return MOV.cobertura[ym];
  const linhas = await sb('GET', 'v_movimentacoes_cobertura?ano_mes=eq.' + encodeURIComponent(ym) + '&select=*');
  MOV.cobertura[ym] = (linhas && linhas[0]) || null;
  return MOV.cobertura[ym];
}
async function fetchMovLancamentos(ym) {
  if (MOV.lancamentos[ym]) return MOV.lancamentos[ym];
  const linhas = await sb('GET', 'movimentacoes?ano_mes=eq.' + encodeURIComponent(ym) + '&select=*&order=data.desc,id.desc');
  MOV.lancamentos[ym] = linhas || [];
  return MOV.lancamentos[ym];
}
async function fetchMovDetalhe(chave) {
  if (MOV.detalhe[chave]) return MOV.detalhe[chave];
  const linhas = await sb('GET', 'movimentacoes_detalhe?chave_consolidada=eq.' + encodeURIComponent(chave) + '&select=*&order=data.asc');
  MOV.detalhe[chave] = linhas || [];
  return MOV.detalhe[chave];
}
async function movCarregarMes(ym) {
  MOV.status[ym] = 'carregando'; MOV.erro[ym] = null;
  try {
    await Promise.all([fetchMovMensal(ym), fetchMovSerie(ym, 6), fetchMovCategorias(ym), fetchMovCobertura(ym), fetchMovLancamentos(ym)]);
    MOV.status[ym] = 'ok';
  } catch (e) {
    MOV.status[ym] = 'erro';
    MOV.erro[ym] = (e && e.msg) || String(e);
  }
}
function movInvalidarMes(ym) {
  for (let i = 0; i < 6; i++) delete MOV.mensal[movMesAdd(ym, -i)];
  delete MOV.categorias[ym]; delete MOV.cobertura[ym]; delete MOV.lancamentos[ym];
  delete MOV.status[ym]; delete MOV.erro[ym];
}

/* Emissor/meio → selo exibido na lista de lançamentos */
const MOV_EMISSOR_LABEL = { nubank: 'Nubank', bipa: 'Bipa', xp: 'XP', bradescard: 'Bradescard', varios: 'vários', nao_identificado: 'cartão' };
const movEmissorLabel = l => l.meio === 'conta' ? 'conta' : (MOV_EMISSOR_LABEL[l.emissor] || l.emissor || 'cartão');

/* Cores fixas por categoria_app (não há coluna de cor nas views) */
const MOV_CAT_CORES = {
  'Alimentação': '#FFB454', 'Transporte': '#C084FC', 'Saúde': '#FF5C7A', 'Educação': '#38BDF8', 'Moradia': '#5CC8FC',
  'Entretenimento': '#F472B6', 'Miscelaneous': '#9AA0B0', 'Salário': '#3DDC97', 'Rendimentos': '#A3E635', 'Outras fontes de renda': '#FB923C'
};
const movCatCor = nome => MOV_CAT_CORES[nome] || '#7C5CFC';

/* Notas de cobertura por mês — texto de auditoria (não existe coluna equivalente nas
   views; vem da conferência manual feita na carga dos dados, ver life_os_cobertura_mensal.csv).
   Não inventar/alterar: só os meses abaixo têm ressalva conhecida. */
const MOV_COBERTURA_NOTAS = {
  '2024-11': 'sem conta nem receitas neste mês (a planilha só tinha cartão) — não significa ausência de renda.',
  '2024-12': 'sem conta nem receitas neste mês (a planilha só tinha cartão) — não significa ausência de renda.',
  '2025-01': 'sem o salário da Urbanizadora (R$ 5.900).',
  '2025-08': 'aluguel: só R$ 1.250 lançado neste mês (normal R$ 2.500).',
  '2026-01': 'luz de janeiro paga em atraso (cai em fevereiro); Wise de janeiro recebida em fevereiro (R$ 2.075,23 em 04/02 e R$ 1.285,71 em 09/02).',
  '2026-03': 'luz paga em atraso.',
  '2026-04': 'extrato da conta só tem movimentos até 14/04; boleto Mercado Pago de 09/04 (R$ 467,84) marcado "a revisar".',
  '2026-05': 'sem parcela de empréstimo no extrato deste mês (Rafael está investigando).',
  '2026-07': 'academia (SESC) sem lançamento (investigando); cartão XP: fatura de 10/08 sem PDF, reconstruída manualmente (R$ 700,58) e confirmada pelo pagamento no extrato.',
  '2026-08': 'luz paga em atraso; academia (SESC) sem lançamento (investigando).',
  '2026-09': 'mês em aberto: conta e receitas cobertas até 17/09; compras de cartão só entram depois que as faturas fecharem (~01–03 do mês seguinte).'
};
