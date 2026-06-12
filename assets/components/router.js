'use strict';
/* ============ ROTEADOR HASH ============ */
const Views = {};   // nome → {titulo, render(params) → html, mount(params)?}
function reg(nome, v) { Views[nome] = v; }
function nav(h) { if (location.hash === '#/'+h) render(); else location.hash = '#/' + h; }
function rotaAtual() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, '')) || 'hoje';
  const [nome, ...params] = h.split('/');
  return { nome: nome || 'hoje', params };
}
let _renderizando = false;
function render() {
  if (_renderizando) return; _renderizando = true;
  try {
    const r = rotaAtual();
    const v = Views[r.nome] || Views.hoje;
    $('#main').innerHTML = '<div class="fadein">' + v.render(r.params) + '</div>';
    if (v.mount) v.mount(r.params);
    renderNav(r.nome);
    if (window.renderTimerPill) renderTimerPill();
    window.scrollTo(0, 0);
  } finally { _renderizando = false; }
}
window.addEventListener('hashchange', render);

/* ============ NAVEGAÇÃO / LAYOUT ============ */
const MENU = [
  ['hoje','☀️','Hoje'], ['tarefas','✅','Tarefas'], ['habitos','🔁','Hábitos'], ['agenda','📅','Agenda'],
  ['treino','🏋️','Treino'], ['corrida','🏃','Corrida'], ['leitura','📖','Leitura'], ['escrita','✍️','Escrita'],
  ['metas','🎯','Metas'], ['financas','💰','Finanças'], ['dashboard','📊','Dashboard'], ['revisao','🧭','Revisão'], ['retro','🌅','Retro'], ['config','⚙️','Config']
];
function renderNav(atual) {
  const base = atual.split('/')[0];
  $('#sidebar').innerHTML = '<div class="logo"><span class="mark">⚡</span> Life OS</div>'
    + MENU.map(([r, em, l]) => '<button class="navit'+(base===r?' on':'')+'" data-act="nav" data-r="'+r+'"><span class="em">'+em+'</span>'+l+'</button>').join('')
    + '<div class="foot" data-act="nav" data-r="config">'+syncDotHTML()+'<span id="synclabel">'+syncLabel()+'</span></div>';
  const tit = (Views[base] && Views[base].titulo) || 'Life OS';
  $('#topbar').innerHTML = '<span style="font-size:19px">⚡</span><span class="t">'+esc(tit)+'</span>'
    + '<span class="row" data-act="nav" data-r="config" style="cursor:pointer">'+syncDotHTML()+'</span>';
  const tabs = [['hoje','☀️','Hoje'], ['tarefas','✅','Tarefas'], null, ['habitos','🔁','Hábitos'], ['mais','☰','Mais']];
  $('#tabbar').innerHTML = tabs.map(t => t === null
    ? '<div class="tb fab-slot"><button class="fab" data-act="fab">＋</button></div>'
    : '<button class="tb'+(base===t[0]?' on':'')+'" data-act="'+(t[0]==='mais'?'menu-mais':'nav')+'" data-r="'+t[0]+'"><span class="em">'+t[1]+'</span>'+t[2]+'</button>').join('');
  let fd = $('#fabdesk');
  if (!fd && matchMedia('(min-width:900px)').matches) {
    fd = document.createElement('button'); fd.id = 'fabdesk'; fd.className = 'fab-desktop'; fd.textContent = '＋';
    fd.setAttribute('data-act','fab'); document.body.appendChild(fd);
  }
}
function syncDotHTML() {
  const st = window.syncStatus ? syncStatus() : 'off';
  return '<span class="sync-dot '+st+'" title="estado da sincronização"></span>';
}
function syncLabel() {
  if (!window.syncStatus) return 'modo local';
  return {ok:'sincronizado', pend:'sincronizando…', err:'erro de sinc.', auth:'aguardando login', off:'Supabase indisponível'}[syncStatus()];
}
act('nav', el => nav(el.dataset.r));
act('menu-mais', () => {
  const itens = MENU.filter(([r]) => !['hoje','tarefas','habitos'].includes(r));
  modal('<div class="bx-h"><div class="h2">Mais</div></div><div class="fabmenu">'
    + itens.map(([r,em,l]) => '<button data-act="nav-close" data-r="'+r+'"><span class="em">'+em+'</span>'+l+'</button>').join('')
    + '</div>');
});
act('nav-close', el => { closeModal(); nav(el.dataset.r); });

/* ============ MENU ➕ (registro em ≤ 2 toques) ============ */
const FAB_ITENS = [
  ['qa-tarefa','✅','Tarefa'], ['qa-habito','🔁','Hábito'], ['qa-treino','🏋️','Treino'],
  ['qa-corrida','🏃','Corrida'], ['qa-leitura','📖','Leitura'], ['qa-gasto','💸','Gasto'],
  ['qa-aporte','📈','Aporte'], ['qa-peso','⚖️','Peso'], ['qa-bloco','⏱️','Bloco']
];
act('fab', () => {
  modal('<div class="bx-h"><div class="h2">Adicionar</div></div><div class="fabmenu">'
    + FAB_ITENS.map(([a,em,l]) => '<button data-act="'+a+'"><span class="em">'+em+'</span>'+l+'</button>').join('') + '</div>');
});
// Handlers padrão (substituídos pelos módulos nas próximas etapas)
FAB_ITENS.forEach(([a,,l]) => { if (!Actions[a]) act(a, () => { closeModal(); toast('“'+l+'” chega nas próximas etapas 🚧'); }); });

/* ============ PLACEHOLDERS (substituídos a cada etapa) ============ */
MENU.forEach(([r, em, l]) => {
  reg(r, {
    titulo: l,
    render: () => '<div class="h1">'+em+' '+l+'</div><div class="card"><div class="empty"><span class="em">🚧</span>'
      + 'O módulo <b>'+l+'</b> será entregue em uma próxima etapa do roteiro (seção 8 do spec).<br><span class="small muted">Etapa atual: 1 — base do app.</span></div></div>'
  });
});
