'use strict';
/* ════════════════════════════════════════════════════════════
   LIFE OS PESSOAL v4.1 — app completo em arquivo único
   Pacote: index.html + manifest.webmanifest + sw.js
   ════════════════════════════════════════════════════════════ */

/* ============ UTILITÁRIOS ============ */
const G_ICON = '<svg class="gi" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() :
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&3|8)).toString(16); }));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const sum = arr => arr.reduce((a, b) => a + (Number(b) || 0), 0);
const nowISO = () => new Date().toISOString();

/* --- datas (sempre fuso local) --- */
const pad2 = n => String(n).padStart(2, '0');
const dISO = d => d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
const hoje = () => dISO(new Date());
const dataHoje = hoje;
const pDate = iso => { const [y,m,d] = String(iso).slice(0,10).split('-').map(Number); return new Date(y, m-1, d); };
const addDias = (iso, n) => { const d = pDate(iso); d.setDate(d.getDate()+n); return dISO(d); };
const diffDias = (a, b) => Math.round((pDate(b) - pDate(a)) / 864e5);
const mesDe = iso => String(iso).slice(0,7);
const anoDe = iso => Number(String(iso).slice(0,4));
const inicioSemana = iso => { const d = pDate(iso); const dw = (d.getDay()+6)%7; d.setDate(d.getDate()-dw); return dISO(d); }; // segunda
const fimSemana = iso => addDias(inicioSemana(iso), 6); // domingo
const DIAS_SEM = ['dom','seg','ter','qua','qui','sex','sáb'];
const DIAS_SEM_FULL = ['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const MESES_C = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
function fmtData(iso, opts={}) {
  if (!iso) return '';
  const d = pDate(iso), t = hoje();
  if (iso === t && !opts.semHoje) return 'hoje';
  if (iso === addDias(t,1)) return 'amanhã';
  if (iso === addDias(t,-1)) return 'ontem';
  const base = DIAS_SEM[d.getDay()] + ', ' + d.getDate() + ' ' + MESES_C[d.getMonth()];
  return d.getFullYear() !== new Date().getFullYear() ? base + ' ' + d.getFullYear() : base;
}
const fmtDataCurta = iso => { if (!iso) return ''; const d = pDate(iso); return d.getDate() + '/' + pad2(d.getMonth()+1); };
const fmtMes = ym => MESES[Number(ym.slice(5,7))-1] + ' ' + ym.slice(0,4);
const fmtHora = h => h ? String(h).slice(0,5) : '';
const fmtMin = m => { m = Math.round(m||0); const h = Math.floor(m/60); return h ? h + 'h' + (m%60 ? pad2(m%60) : '') : m + 'min'; };
const fmtDur = s => { s = Math.max(0, Math.round(s)); const h = Math.floor(s/3600), m = Math.floor(s%3600/60), ss = s%60;
  return (h ? h + ':' + pad2(m) : m) + ':' + pad2(ss); };
const fmtBRL = v => (Number(v)||0).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
const fmtNum = (v, d=0) => (Number(v)||0).toLocaleString('pt-BR', {maximumFractionDigits:d, minimumFractionDigits:0});
const parseValor = s => { if (typeof s === 'number') return s; s = String(s||'').replace(/[R$\s.]/g,'').replace(',','.'); const v = parseFloat(s); return isNaN(v) ? 0 : v; };
const parseTempo = s => { // "52:30" | "1:02:30" | "52" (min) → segundos
  if (!s) return 0; const p = String(s).trim().split(':').map(Number);
  if (p.some(isNaN)) return 0;
  if (p.length === 3) return p[0]*3600 + p[1]*60 + p[2];
  if (p.length === 2) return p[0]*60 + p[1];
  return p[0]*60;
};
const ucfirst = s => s ? s[0].toUpperCase() + s.slice(1) : s;
const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');

/* --- paleta de áreas (10 cores, spec §6) --- */
const PALETA = ['#7C5CFC','#5CC8FC','#3DDC97','#FFB454','#FF5C7A','#F472B6','#A3E635','#38BDF8','#FB923C','#C084FC'];
const PRIO_COR = {1:'var(--p1)', 2:'var(--p2)', 3:'var(--p3)', 4:'var(--p4)'};

/* ============ GRÁFICOS SVG (renderização local, sem libs) ============ */
function svgLinha(pontos, o={}) { // pontos: [{x:label, y:num}]
  const W = o.w||560, H = o.h||180, P = 30, PB = 22;
  if (!pontos.length) return '<div class="empty small">sem dados ainda</div>';
  const ys = pontos.map(p => p.y);
  let mn = o.min ?? Math.min(...ys), mx = o.max ?? Math.max(...ys);
  if (mn === mx) { mn -= 1; mx += 1; }
  const padY = (mx-mn)*0.12; mn -= padY; mx += padY;
  const X = i => P + 6 + i*(W-P-16)/Math.max(1, pontos.length-1);
  const Y = v => H-PB - (v-mn)*(H-PB-10)/(mx-mn);
  const cor = o.cor || 'var(--acc)';
  const path = pontos.map((p,i) => (i?'L':'M') + X(i).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join(' ');
  const area = path + ' L' + X(pontos.length-1).toFixed(1) + ' ' + (H-PB) + ' L' + X(0).toFixed(1) + ' ' + (H-PB) + ' Z';
  const fmt = o.fmt || (v => fmtNum(v, 1));
  const last = pontos[pontos.length-1];
  const labStep = Math.ceil(pontos.length / (o.maxLabels||6));
  const labels = pontos.map((p,i) => (i % labStep === 0 || i === pontos.length-1) && p.x ?
    '<text x="'+X(i)+'" y="'+(H-6)+'" font-size="9.5" fill="#9AA0B0" text-anchor="middle">'+esc(p.x)+'</text>' : '').join('');
  return '<div class="chartbox"><svg viewBox="0 0 '+W+' '+H+'">'
    + '<defs><linearGradient id="g'+(svgLinha._i=(svgLinha._i||0)+1)+'" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0" stop-color="'+cor+'" stop-opacity=".28"/><stop offset="1" stop-color="'+cor+'" stop-opacity="0"/></linearGradient></defs>'
    + '<text x="2" y="12" font-size="9.5" fill="#9AA0B0">'+esc(fmt(mx-padY))+'</text>'
    + '<text x="2" y="'+(H-PB)+'" font-size="9.5" fill="#9AA0B0">'+esc(fmt(mn+padY))+'</text>'
    + '<path d="'+area+'" fill="url(#g'+svgLinha._i+')"/>'
    + '<path d="'+path+'" fill="none" stroke="'+cor+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
    + '<circle cx="'+X(pontos.length-1)+'" cy="'+Y(last.y)+'" r="3.6" fill="'+cor+'"/>'
    + '<text x="'+Math.min(X(pontos.length-1), W-34)+'" y="'+(Y(last.y)-8)+'" font-size="10.5" font-weight="700" fill="#F2F3F7" text-anchor="middle">'+esc(fmt(last.y))+'</text>'
    + labels + '</svg></div>';
}
function svgBarras(itens, o={}) { // [{x,y,cor?}] ou (valores, labels, opções)
  if (Array.isArray(o)) {
    const labels = o;
    const opts = arguments[2] || {};
    itens = (itens || []).map((valor, i) => ({ x: labels[i], y: valor, cor: opts.color || opts.cor }));
    o = opts;
  } else if ((itens || []).length && typeof itens[0] === 'number') {
    itens = itens.map((valor, i) => ({ x: i + 1, y: valor, cor: o.color || o.cor }));
  }
  const W = o.w||560, H = o.h||180, PB = 22, P = 28;
  if (!itens.length) return '<div class="empty small">sem dados ainda</div>';
  const mx = Math.max(...itens.map(i => Math.abs(i.y)), 1);
  const bw = Math.min(44, (W-P-10)/itens.length - 6);
  const fmt = o.fmt || (v => fmtNum(v));
  const bars = itens.map((it,i) => {
    const x = P + 4 + i*(W-P-10)/itens.length + ((W-P-10)/itens.length - bw)/2;
    const h = Math.abs(it.y)/mx*(H-PB-22);
    const y = H-PB-h;
    return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(h,1).toFixed(1)+'" rx="4" fill="'+(it.cor||'var(--acc)')+'"/>'
      + (o.vals !== false && it.y ? '<text x="'+(x+bw/2)+'" y="'+(y-4)+'" font-size="9" fill="#9AA0B0" text-anchor="middle">'+esc(fmt(it.y))+'</text>' : '')
      + (it.x !== undefined ? '<text x="'+(x+bw/2)+'" y="'+(H-6)+'" font-size="9.5" fill="#9AA0B0" text-anchor="middle">'+esc(it.x)+'</text>' : '');
  }).join('');
  return '<div class="chartbox"><svg viewBox="0 0 '+W+' '+H+'">'+bars+'</svg></div>';
}
function svgPizza(itens, o={}) { // [{label, valor, cor}]
  itens = itens.filter(i => i.valor > 0);
  if (!itens.length) return '<div class="empty small">sem dados ainda</div>';
  const tot = sum(itens.map(i => i.valor)); const R = 62, C = 70;
  let a0 = -Math.PI/2;
  const segs = itens.map(it => {
    const a1 = a0 + it.valor/tot*2*Math.PI;
    const large = (a1-a0) > Math.PI ? 1 : 0;
    const p = 'M'+C+' '+C+' L'+(C+R*Math.cos(a0)).toFixed(1)+' '+(C+R*Math.sin(a0)).toFixed(1)
      +' A'+R+' '+R+' 0 '+large+' 1 '+(C+R*Math.cos(a1)).toFixed(1)+' '+(C+R*Math.sin(a1)).toFixed(1)+' Z';
    a0 = a1;
    return '<path d="'+p+'" fill="'+it.cor+'" stroke="var(--card)" stroke-width="1.5"/>';
  }).join('');
  const leg = itens.map(it => '<span><i class="dot" style="background:'+it.cor+'"></i>'+esc(it.label)+' <b>'+esc(o.fmt ? o.fmt(it.valor) : fmtNum(it.valor))+'</b> ('+Math.round(it.valor/tot*100)+'%)</span>').join('');
  return '<div class="row" style="align-items:flex-start;gap:16px;flex-wrap:wrap"><svg width="140" height="140" viewBox="0 0 140 140">'+segs
    + '<circle cx="70" cy="70" r="34" fill="var(--card)"/></svg><div class="legend" style="flex-direction:column;align-items:flex-start;gap:6px">'+leg+'</div></div>';
}
function svgAnel(pct, o={}) {
  const R = o.r||84, SW = o.sw||10, C = R+SW, circ = 2*Math.PI*R;
  const off = circ*(1-clamp(pct,0,1));
  return '<svg width="'+C*2+'" height="'+C*2+'" viewBox="0 0 '+C*2+' '+C*2+'" style="transform:rotate(-90deg)">'
    + '<circle cx="'+C+'" cy="'+C+'" r="'+R+'" fill="none" stroke="var(--elev)" stroke-width="'+SW+'"/>'
    + '<circle cx="'+C+'" cy="'+C+'" r="'+R+'" fill="none" stroke="'+(o.cor||'var(--acc)')+'" stroke-width="'+SW+'" stroke-linecap="round" stroke-dasharray="'+circ+'" stroke-dashoffset="'+off+'" style="transition:stroke-dashoffset .6s"/></svg>';
}
function spark(vals, o={}) {
  if (!vals || vals.length < 2) return '<span class="muted tiny">—</span>';
  const W = o.w||90, H = o.h||26;
  let mn = Math.min(...vals), mx = Math.max(...vals); if (mn===mx){mn-=1;mx+=1;}
  const X = i => 2 + i*(W-4)/(vals.length-1), Y = v => H-3-(v-mn)*(H-6)/(mx-mn);
  const path = vals.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
  return '<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'"><path d="'+path+'" fill="none" stroke="'+(o.cor||'var(--acc)')+'" stroke-width="1.8" stroke-linecap="round"/><circle cx="'+X(vals.length-1)+'" cy="'+Y(vals[vals.length-1])+'" r="2.4" fill="'+(o.cor||'var(--acc)')+'"/></svg>';
}
function heatmapHTML(porDia, nDias=91, nivelFn) { // porDia: {iso: valor}
  const fim = hoje();
  const ini = addDias(fim, -(nDias-1));
  // alinhar ao domingo anterior
  let cur = ini; const padIni = pDate(ini).getDay();
  let cells = '';
  for (let i = 0; i < padIni; i++) cells += '<i style="visibility:hidden"></i>';
  while (cur <= fim) {
    const v = porDia[cur] || 0;
    const lvl = nivelFn ? nivelFn(v, cur) : (v >= 4 ? 4 : v >= 3 ? 3 : v >= 2 ? 2 : v >= 1 ? 1 : 0);
    cells += '<i class="'+(lvl?('l'+lvl):'')+(cur===fim?' tdy':'')+'" title="'+fmtData(cur,{semHoje:1})+': '+fmtNum(v,1)+'"></i>';
    cur = addDias(cur, 1);
  }
  return '<div class="heat">'+cells+'</div>';
}

/* ============ MARKDOWN mínimo (preview do editor / artigos) ============ */
function mdRender(src) {
  if (!src) return '';
  const lines = esc(src).split('\n');
  let out = [], inUl = false, inOl = false, inCode = false, inQ = false, buf = [];
  const flushP = () => { if (buf.length) { out.push('<p>'+inline(buf.join('<br>'))+'</p>'); buf = []; } };
  const closeLists = () => { if (inUl){out.push('</ul>');inUl=false;} if (inOl){out.push('</ol>');inOl=false;} if (inQ){out.push('</blockquote>');inQ=false;} };
  const inline = t => t
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  for (const ln of lines) {
    if (ln.startsWith('```')) { flushP(); closeLists(); inCode = !inCode; out.push(inCode ? '<pre><code>' : '</code></pre>'); continue; }
    if (inCode) { out.push(ln); continue; }
    const h = ln.match(/^(#{1,3})\s+(.*)/);
    if (h) { flushP(); closeLists(); out.push('<h'+h[1].length+'>'+inline(h[2])+'</h'+h[1].length+'>'); continue; }
    const li = ln.match(/^\s*[-*]\s+(.*)/);
    if (li) { flushP(); if(inOl){out.push('</ol>');inOl=false;} if(!inUl){out.push('<ul>');inUl=true;} out.push('<li>'+inline(li[1])+'</li>'); continue; }
    const oli = ln.match(/^\s*\d+[.)]\s+(.*)/);
    if (oli) { flushP(); if(inUl){out.push('</ul>');inUl=false;} if(!inOl){out.push('<ol>');inOl=true;} out.push('<li>'+inline(oli[1])+'</li>'); continue; }
    const q = ln.match(/^>\s?(.*)/);
    if (q) { flushP(); if(!inQ){out.push('<blockquote>');inQ=true;} out.push(inline(q[1])+'<br>'); continue; }
    if (!ln.trim()) { flushP(); closeLists(); continue; }
    if (inQ) { out.push('</blockquote>'); inQ = false; }
    buf.push(ln);
  }
  flushP(); closeLists(); if (inCode) out.push('</code></pre>');
  return out.join('\n');
}
const contarPalavras = t => (String(t||'').trim().match(/\S+/g) || []).length;

/* ============ DELEGAÇÃO DE EVENTOS ============ */
const Actions = {};
function act(name, fn) { Actions[name] = fn; }
function dispatch(attr, e) {
  const el = e.target.closest('['+attr+']'); if (!el) return;
  const fn = Actions[el.getAttribute(attr)];
  if (fn) { if (attr === 'data-act' && el.tagName === 'A') e.preventDefault(); fn(el, e); }
}
document.addEventListener('click', e => dispatch('data-act', e));
document.addEventListener('change', e => dispatch('data-chg', e));
document.addEventListener('input', e => dispatch('data-inp', e));
document.addEventListener('submit', e => { const el = e.target.closest('[data-sub]'); if (el && Actions[el.getAttribute('data-sub')]) { e.preventDefault(); Actions[el.getAttribute('data-sub')](el, e); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.matches('[data-enter]')) {
    const fn = Actions[e.target.getAttribute('data-enter')]; if (fn) { e.preventDefault(); fn(e.target, e); }
  }
  if (e.key === 'Escape') { closeModal(); }
});

/* ============ MODAIS / SHEETS ============ */
const _modals = [];
function modal(html, o={}) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = '<div class="box'+(o.wide?' wide':'')+'"><div class="grab"></div>'+html+'</div>';
  ov.addEventListener('mousedown', e => { if (e.target === ov && o.fixo !== true) closeModal(); });
  $('#overlays').appendChild(ov);
  _modals.push({ el: ov, onClose: o.onClose });
  if (o.onMount) o.onMount(ov);
  const foco = ov.querySelector('[autofocus]'); if (foco) setTimeout(() => foco.focus(), 60);
  return ov;
}
function closeModal(all) {
  if (!_modals.length) return;
  do { const m = _modals.pop(); m.el.remove(); if (m.onClose) m.onClose(); } while (all && _modals.length);
}
function confirmBox(msg, onYes, o={}) {
  modal('<div class="bx-h"><div class="h2">'+esc(o.titulo||'Confirmar')+'</div></div><p class="muted">'+msg+'</p>'
    + '<div class="bx-foot"><button class="btn ghost" data-act="m-close">Cancelar</button>'
    + '<button class="btn '+(o.perigo?'danger':'primary')+'" data-act="m-yes">'+esc(o.sim||'Confirmar')+'</button></div>',
    { onMount: ov => { ov.querySelector('[data-act=m-yes]').onclick = () => { closeModal(); onYes(); }; } });
}
act('m-close', () => closeModal());

/* ============ TOASTS + UNDO ============ */
function toast(msg, o={}) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = (o.icone ? '<span style="font-size:17px">'+o.icone+'</span>' : '') + '<span>'+msg+'</span>'
    + (o.undo ? '<button>Desfazer</button>' : '');
  if (o.undo) t.querySelector('button').onclick = () => { o.undo(); t.remove(); };
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, o.ms || 3800);
}
