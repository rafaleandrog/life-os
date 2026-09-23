'use strict';
/* ════════════════ FINANÇAS · FLUXO — dados de `movimentacoes` (Supabase) ════════════════
   Somente leitura: nunca usa dbUpsert/dbPatch/dbDelete, nunca entra em TABLES/pullAll/
   enqueue/flush. As consultas usam sb() (definida em app.js) diretamente contra as views
   v_movimentacoes_mensal / v_movimentacoes_cobertura e as tabelas movimentacoes /
   movimentacoes_detalhe, filtradas por ano_mes no servidor.
   Cache só em memória (nunca localStorage) — recarregado a cada sessão.
   v_movimentacoes_categoria_mes não é mais lida: ela agrega e perde `descricao`, sem a
   qual não dá para separar os pagadores do salário nem listar lançamentos no drill-down.
   A agregação por categoria é feita no cliente, sobre as linhas de `movimentacoes`. */

const MOV = { mensal: {}, cobertura: {}, lancamentos: {}, detalhe: {}, salario: {}, status: {}, erro: {},
  parcelasAtivas: null, previsaoCustos: null, recorrentes: null, parcelasStatus: undefined, parcelasErro: null,
  catSerie: {}, resumoStatus: undefined, resumoErro: null };

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
function movMesesAte(ateYm, n) {
  const metas = [];
  for (let i = n - 1; i >= 0; i--) metas.push(movMesAdd(ateYm, -i));
  return metas;
}
async function fetchMovSerie(ateYm, n) {
  n = n || 6;
  const metas = movMesesAte(ateYm, n);
  const faltam = metas.filter(m => !MOV.mensal[m]);
  if (faltam.length) {
    const lista = faltam.map(m => encodeURIComponent(m)).join(',');
    const linhas = await sb('GET', 'v_movimentacoes_mensal?ano_mes=in.(' + lista + ')&select=*');
    const porMes = {}; (linhas || []).forEach(l => { porMes[l.ano_mes] = l; });
    faltam.forEach(m => { MOV.mensal[m] = porMes[m] || movMensalZero(m); });
  }
  return metas.map(m => MOV.mensal[m]);
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
/* Série de salário dos últimos n meses, para o card "Salário por fonte". As views
   agregadas não trazem `descricao`, que é o único campo que identifica o pagador, então
   esta é a única consulta que precisa ir à tabela — ~2 linhas por mês. Somente leitura. */
async function fetchMovSalarioSerie(ym, n) {
  n = n || 6;
  const chave = ym + ':' + n;
  if (MOV.salario[chave]) return MOV.salario[chave];
  const metas = movMesesAte(ym, n);
  const lista = metas.map(m => encodeURIComponent(m)).join(',');
  const linhas = await sb('GET', 'movimentacoes?tipo=eq.receita&categoria_app=eq.' + encodeURIComponent('Salário')
    + '&ano_mes=in.(' + lista + ')&select=ano_mes,data,descricao,descricao_normalizada,valor&order=data.asc');
  MOV.salario[chave] = { meses: metas, linhas: linhas || [] };
  return MOV.salario[chave];
}

/* Previsão de parcelas (Aux_Parcelas): independente do mês navegado em Fluxo — é uma
   projeção "a partir de hoje", não um recorte por ano_mes. Carregada uma vez por sessão
   (poucas linhas, ver §4 da instrução) e recarregada junto com o botão ⟳ de Fluxo. */
async function fetchParcelasAtivas() {
  if (MOV.parcelasAtivas) return MOV.parcelasAtivas;
  const linhas = await sb('GET', 'v_parcelas_ativas?select=*');
  MOV.parcelasAtivas = linhas || [];
  return MOV.parcelasAtivas;
}
/* v_previsao_custos: uma linha por item × mês previsto, de duas fontes —
   'parcela' (compras parceladas no cartão: parcela_atual/total_parcelas da última fatura)
   e 'recorrente' (pix/boleto/transferência da conta que se repetem; ver a migração
   supabase/migrations/20260923_previsao_custos.sql). Já vem com categoria. */
async function fetchPrevisaoCustos() {
  if (MOV.previsaoCustos) return MOV.previsaoCustos;
  const linhas = await sb('GET', 'v_previsao_custos?select=*&order=mes_previsto.asc');
  MOV.previsaoCustos = (linhas || []).filter(l => Number(l.valor_previsto) > 0);
  return MOV.previsaoCustos;
}
async function fetchRecorrentesAtivos() {
  if (MOV.recorrentes) return MOV.recorrentes;
  const linhas = await sb('GET', 'v_recorrentes_ativos?select=*&order=valor_mensal.desc');
  MOV.recorrentes = linhas || [];
  return MOV.recorrentes;
}
async function movCarregarParcelas() {
  MOV.parcelasStatus = 'carregando'; MOV.parcelasErro = null;
  try {
    await Promise.all([fetchParcelasAtivas(), fetchPrevisaoCustos(), fetchRecorrentesAtivos()]);
    MOV.parcelasStatus = 'ok';
  } catch (e) {
    MOV.parcelasStatus = 'erro';
    MOV.parcelasErro = (e && e.msg) || String(e);
  }
}
function movInvalidarParcelas() {
  MOV.parcelasAtivas = null; MOV.previsaoCustos = null; MOV.recorrentes = null;
  MOV.parcelasStatus = undefined; MOV.parcelasErro = null;
}

async function movCarregarMes(ym) {
  MOV.status[ym] = 'carregando'; MOV.erro[ym] = null;
  try {
    await Promise.all([fetchMovMensal(ym), fetchMovSerie(ym, 6), fetchMovCobertura(ym), fetchMovLancamentos(ym), fetchMovSalarioSerie(ym, 6)]);
    MOV.status[ym] = 'ok';
  } catch (e) {
    MOV.status[ym] = 'erro';
    MOV.erro[ym] = (e && e.msg) || String(e);
  }
}
function movInvalidarMes(ym) {
  for (let i = 0; i < 6; i++) delete MOV.mensal[movMesAdd(ym, -i)];
  delete MOV.cobertura[ym]; delete MOV.lancamentos[ym];
  MOV.salario = {};   // qualquer janela de 6 meses pode conter `ym`; o refetch é barato
  delete MOV.status[ym]; delete MOV.erro[ym];
}

/* Resumo geral (tela default de Finanças): histórico de 12 meses (v_movimentacoes_mensal)
   + os lançamentos crus do mês corrente, para a segmentação por categoria/subcategoria
   reaproveitar movCategoriaCardHTML com fidelidade total (a view agregada perde
   `descricao`, ver comentário no topo do arquivo). Independente do mês navegado em Fluxo. */
/* Despesa por categoria nos últimos n meses (gráfico "custo × teto por categoria").
   Aqui a view agregada basta: só precisa de (categoria_geral, categoria_especifica,
   categoria_app) para movCatExibicao — a separação do salário por pagador não se aplica
   a despesa. */
async function fetchMovCategoriaSerie(ym, n) {
  const chave = ym + ':' + n;
  if (MOV.catSerie[chave]) return MOV.catSerie[chave];
  const metas = movMesesAte(ym, n);
  const lista = metas.map(m => encodeURIComponent(m)).join(',');
  const linhas = await sb('GET', 'v_movimentacoes_categoria_mes?tipo=eq.despesa&grupo_fluxo=neq.investimento&ano_mes=in.(' + lista + ')'
    + '&select=ano_mes,categoria_app,categoria_geral,categoria_especifica,total');
  const porCat = {};
  (linhas || []).forEach(l => {
    const k = movCatExibicao(l);
    const c = porCat[k] || (porCat[k] = {});
    c[l.ano_mes] = (c[l.ano_mes] || 0) + Number(l.total);
  });
  MOV.catSerie[chave] = { meses: metas, porCat };
  return MOV.catSerie[chave];
}
async function movCarregarResumo(ym) {
  MOV.resumoStatus = 'carregando'; MOV.resumoErro = null;
  try {
    await Promise.all([fetchMovSerie(ym, 12), fetchMovLancamentos(ym), fetchMovCategoriaSerie(ym, 13)]);
    MOV.resumoStatus = 'ok';
  } catch (e) {
    MOV.resumoStatus = 'erro';
    MOV.resumoErro = (e && e.msg) || String(e);
  }
}
function movInvalidarResumo(ym) {
  for (let i = 0; i < 12; i++) delete MOV.mensal[movMesAdd(ym, -i)];
  delete MOV.lancamentos[ym];
  MOV.catSerie = {};
  MOV.resumoStatus = undefined; MOV.resumoErro = null;
}

/* Emissor/meio → selo exibido na lista de lançamentos */
const MOV_EMISSOR_LABEL = { nubank: 'Nubank', bipa: 'Bipa', xp: 'XP', bradescard: 'Bradescard', varios: 'vários', nao_identificado: 'cartão' };
const movEmissorLabel = l => l.meio === 'conta' ? 'conta' : (MOV_EMISSOR_LABEL[l.emissor] || l.emissor || 'cartão');

/* ── Categorias de exibição ──────────────────────────────────────────────────────
   `categoria_app` vem grossa demais do banco: a função Postgres mov_app() joga em
   'Miscelaneous' toda despesa cujo categoria_geral não esteja na whitelist de seis
   grupos, o que na prática é TODO o grupo 'Despesas Financeiras' — impostos,
   empréstimos e transferências familiares caíam na mesma fatia cinza, sem grupo
   visual próprio. Como mov_app() roda no INSERT (sem trigger), mexer nela não
   reclassificaria o histórico; então a categoria mostrada é derivada aqui, de
   (categoria_geral, categoria_especifica), que já vêm nas views e nos lançamentos.
   Nada é gravado — este módulo continua somente leitura. */
const MOV_CAT_REMAP = {
  'Despesas Financeiras|Impostos': 'Impostos',
  'Despesas Financeiras|Empréstimo': 'Dívidas e Empréstimos',
  'Despesas Financeiras|Empréstimo pago': 'Dívidas e Empréstimos',
  'Despesas Financeiras|Transferência Familiar': 'Transferência Familiar',
  'Despesas Financeiras|Taxas e Tarifas': 'Despesas Financeiras',
  'Despesas Financeiras|Serviços Digitais': 'Despesas Financeiras',
  'Despesas Financeiras|Outros': 'Despesas Financeiras'
  /* 'Despesas Financeiras|Investimento' não entra: já sai pelo filtro de grupo_fluxo. */
};

/* Fontes de salário. São dois pagadores e o nome de quem pagou só existe no texto da
   descrição — nem `categoria_especifica` (sempre 'Salário') nem `emissor` (sempre o
   banco que recebeu) distinguem os dois. O histórico tem variações de grafia
   ('PARANOAZINHO S A', 'PARANOAZINHO SA', 'S/A', 'Wise Brasil Corretora de Câmbio',
   'Wise Brasil Instituicao de Pagamento'), por isso o casamento é por regex sobre
   descricao_normalizada (minúscula, sem acento). A regra só vale dentro de Salário:
   a UP também paga reembolsos, que devem continuar em 'Outras fontes de renda'. */
const MOV_FONTES_SALARIO = [
  { re: /urbanizadora\s*paranoazinho/, nome: 'Salário · UP' },
  { re: /\bwise\b/,                   nome: 'Salário · Tipolis' }
];
function movFonteSalario(l) {
  const n = l.descricao_normalizada || norm(l.descricao || '');
  if (!n) return 'Salário';            // linha agregada (sem descrição): não dá para separar
  const f = MOV_FONTES_SALARIO.find(f => f.re.test(n));
  return f ? f.nome : 'Salário · outros';
}

/* Categoria mostrada nos cards "por categoria". Aceita tanto um lançamento de
   `movimentacoes` quanto uma linha de v_movimentacoes_categoria_mes. */
function movCatExibicao(l) {
  if (l.categoria_app === 'Salário') return movFonteSalario(l);
  return MOV_CAT_REMAP[l.categoria_geral + '|' + l.categoria_especifica] || l.categoria_app || '(sem categoria)';
}

/* Cores fixas por categoria (não há coluna de cor nas views) */
const MOV_CAT_CORES = {
  'Alimentação': '#FFB454', 'Transporte': '#C084FC', 'Saúde': '#FF5C7A', 'Educação': '#38BDF8', 'Moradia': '#5CC8FC',
  'Entretenimento': '#F472B6', 'Rendimentos': '#A3E635', 'Outras fontes de renda': '#FB923C',
  /* grupos que saíram de dentro do antigo 'Miscelaneous' */
  'Impostos': '#FACC15', 'Dívidas e Empréstimos': '#EF4444', 'Transferência Familiar': '#2DD4BF',
  'Despesas Financeiras': '#9AA0B0',
  /* salário por fonte */
  'Salário · UP': '#3DDC97', 'Salário · Tipolis': '#22D3EE', 'Salário · outros': '#86EFAC',
  /* fallbacks: só aparecem se o remap acima não pegar a linha */
  'Miscelaneous': '#9AA0B0', 'Salário': '#3DDC97'
};
const movCatCor = nome => MOV_CAT_CORES[nome] || '#7C5CFC';

/* Categorias de despesa elegíveis para "limite por categoria" (exclui fontes de renda/
   salário — limite é controle de gasto, não de entrada). Mesmos nomes de MOV_CAT_CORES,
   já que é sobre esse rótulo (movCatExibicao) que o gasto real do mês é agregado. */
const MOV_CAT_LIMITAVEIS = ['Alimentação', 'Transporte', 'Saúde', 'Educação', 'Moradia', 'Entretenimento',
  'Impostos', 'Dívidas e Empréstimos', 'Transferência Familiar', 'Despesas Financeiras'];

/* rótulo curto de mês para eixo de gráfico: '2026-08' → 'ago/26' */
const movMesCurto = ym => MESES_C[Number(ym.slice(5, 7)) - 1] + '/' + ym.slice(2, 4);

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
