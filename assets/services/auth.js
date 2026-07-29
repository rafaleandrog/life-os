'use strict';
/* ============ AUTENTICAÇÃO SUPABASE / GOOGLE ============ */

/* ---- Validade do login (regra do usuário) ----
   O Supabase não impõe prazo nenhum: a sessão se renova sozinha e dura
   indefinidamente. Esta é uma regra NOSSA, deliberada: passados N dias desde o
   login, o app encerra a sessão e pede o Google de novo.
   Para mudar o intervalo, troque só o número abaixo. 0 desliga a regra. */
const DIAS_ATE_REAUTENTICAR = 7;
const CHAVE_LOGIN = 'lifeos.loginEm';

function lerRegistroLogin() {
  try { return JSON.parse(localStorage.getItem(CHAVE_LOGIN) || 'null'); } catch (_) { return null; }
}
function marcarLoginSeNovo(userId) {
  const reg = lerRegistroLogin();
  if (reg && reg.userId === userId) return reg;                   // já contando para este usuário
  const novo = { userId, em: Date.now() };                        // 1ª vez que vemos esta conta: começa agora
  try { localStorage.setItem(CHAVE_LOGIN, JSON.stringify(novo)); } catch (_) {}
  return novo;
}
function esquecerRegistroLogin() { try { localStorage.removeItem(CHAVE_LOGIN); } catch (_) {} }
/* dias restantes até precisar reautenticar (null = regra desligada / sem registro) */
function diasRestantesLogin() {
  if (!(DIAS_ATE_REAUTENTICAR > 0)) return null;
  const reg = lerRegistroLogin();
  if (!reg) return null;
  return Math.max(0, DIAS_ATE_REAUTENTICAR - (Date.now() - reg.em) / 864e5);
}
function loginVencido(userId) {
  if (!(DIAS_ATE_REAUTENTICAR > 0)) return false;
  const reg = marcarLoginSeNovo(userId);
  return (Date.now() - reg.em) > DIAS_ATE_REAUTENTICAR * 864e5;
}

const AUTH_STATE = {
  ready: false,
  session: null,
  user: null,
  error: null
};

function authButton() {
  return document.getElementById('login-google');
}

function setAuthButtonVisible(visible) {
  const btn = authButton();
  if (!btn) return;
  btn.hidden = !visible;
}

let _authPintado = false;   // a tela já foi redesenhada sabendo quem está logado?
function updateAuthSession(session) {
  const antes = AUTH_STATE.user ? AUTH_STATE.user.id : null;
  AUTH_STATE.ready = true;
  AUTH_STATE.session = session || null;
  AUTH_STATE.user = session && session.user ? session.user : null;
  const agora = AUTH_STATE.user ? AUTH_STATE.user.id : null;
  setAuthButtonVisible(!AUTH_STATE.user);
  if (typeof window.atualizarSyncUI === 'function') window.atualizarSyncUI();
  // O boot renderiza ANTES de a sessão ser conhecida, então tudo que depende de
  // "está logado?" foi desenhado no escuro. Repinta na primeira resolução e
  // sempre que a conta mudar — mas não a cada renovação de token, para não
  // interromper o uso de hora em hora.
  if (!_authPintado || antes !== agora) {
    _authPintado = true;
    if (typeof window.render === 'function') {
      try { window.render({ manterScroll: true, semFade: true }); } catch (_) {}
    }
  }
  if (typeof window.LifeOSAfterAuthChange === 'function') window.LifeOSAfterAuthChange(AUTH_STATE);
}

function getOAuthRedirectUrl() {
  // Sempre a própria URL atual do app (origin + pathname), nunca escrita à mão —
  // assim o redirect bate exatamente com o Redirect URL cadastrado no Supabase.
  return window.location.origin + window.location.pathname;
}

// Detecta o retorno do OAuth (#access_token=...&refresh_token=...) e, caso o SDK
// ainda não tenha consumido, completa a sessão manualmente. Em seguida limpa o
// hash da URL com history.replaceState para não confundir o roteador por hash.
async function consumeOAuthRedirect() {
  const hash = window.location.hash || '';
  if (hash.indexOf('access_token=') === -1) return;
  const client = window.supabaseClient;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  try {
    if (client && client.auth) {
      // detectSessionInUrl normalmente já tratou; se não, garantimos via setSession
      const { data } = await client.auth.getSession();
      if ((!data || !data.session) && access_token && refresh_token) {
        await client.auth.setSession({ access_token, refresh_token });
      }
    }
  } catch (error) {
    console.error('Falha ao completar o login OAuth:', error);
  } finally {
    // Limpa o hash preservando o restante da URL (volta a ficar limpa)
    const clean = window.location.origin + window.location.pathname + window.location.search;
    try { history.replaceState(null, '', clean); } catch (_) { window.location.hash = ''; }
  }
}

async function loginGoogle() {
  const client = window.supabaseClient;
  if (!client || !client.auth) {
    AUTH_STATE.error = 'Supabase indisponível. Tente novamente em instantes.';
    toast(AUTH_STATE.error, { icone: '⚠️' });
    setAuthButtonVisible(true);
    return;
  }

  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getOAuthRedirectUrl(),
      queryParams: { prompt: 'select_account' }
    }
  });
  if (error) {
    AUTH_STATE.error = error.message;
    toast('Falha no login Google: ' + error.message, { icone: '❌' });
    setAuthButtonVisible(true);
  }
}

async function logout() {
  const client = window.supabaseClient;
  if (!client || !client.auth) return;
  const { error } = await client.auth.signOut();
  if (error) {
    toast('Falha ao sair: ' + error.message, { icone: '❌' });
    return;
  }
  esquecerRegistroLogin();   // próximo login recomeça a contagem dos N dias
  updateAuthSession(null);
  toast('Sessão encerrada.', { icone: '👋' });
}

async function restoreSession() {
  const client = window.supabaseClient;
  if (!client || !client.auth) {
    AUTH_STATE.ready = true;
    AUTH_STATE.error = 'Cliente Supabase não inicializado.';
    setAuthButtonVisible(true);
    return null;
  }

  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    updateAuthSession(data && data.session);
    return AUTH_STATE.session;
  } catch (error) {
    AUTH_STATE.ready = true;
    AUTH_STATE.error = error.message || String(error);
    console.error('Falha ao restaurar sessão Supabase:', error);
    setAuthButtonVisible(true);
    return null;
  }
}

/* Aplica a regra dos N dias: se o login já passou da validade, encerra a sessão
   e pede o Google de novo. Os dados locais e a fila offline não são tocados —
   só a sincronização pausa até entrar outra vez. */
async function aplicarValidadeLogin() {
  const client = window.supabaseClient;
  const user = AUTH_STATE.user;
  if (!client || !client.auth || !user) return false;
  if (!loginVencido(user.id)) return false;
  esquecerRegistroLogin();
  try { await client.auth.signOut(); } catch (error) { console.error('Falha ao encerrar sessão vencida:', error); }
  updateAuthSession(null);
  if (typeof toast === 'function') {
    toast('Passaram-se ' + DIAS_ATE_REAUTENTICAR + ' dias desde o último login — entre com o Google de novo para retomar a sincronização.',
      { icone: '🔐', ms: 6000 });
  }
  return true;
}

async function initAuth() {
  const btn = authButton();
  if (btn) btn.addEventListener('click', loginGoogle);

  const client = window.supabaseClient;
  if (client && client.auth && typeof client.auth.onAuthStateChange === 'function') {
    client.auth.onAuthStateChange((_event, session) => updateAuthSession(session));
  }

  await consumeOAuthRedirect();
  await restoreSession();
  await aplicarValidadeLogin();
}

window.LifeOSAuth = {
  state: AUTH_STATE,
  initAuth,
  loginGoogle,
  logout,
  restoreSession,
  getOAuthRedirectUrl,
  consumeOAuthRedirect,
  DIAS_ATE_REAUTENTICAR,
  diasRestantesLogin,
  aplicarValidadeLogin
};
