'use strict';
/* ============ AUTENTICAÇÃO SUPABASE / GOOGLE ============ */
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

function updateAuthSession(session) {
  AUTH_STATE.ready = true;
  AUTH_STATE.session = session || null;
  AUTH_STATE.user = session && session.user ? session.user : null;
  setAuthButtonVisible(!AUTH_STATE.user);
  if (typeof window.atualizarSyncUI === 'function') window.atualizarSyncUI();
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

async function initAuth() {
  const btn = authButton();
  if (btn) btn.addEventListener('click', loginGoogle);

  const client = window.supabaseClient;
  if (client && client.auth && typeof client.auth.onAuthStateChange === 'function') {
    client.auth.onAuthStateChange((_event, session) => updateAuthSession(session));
  }

  await consumeOAuthRedirect();
  await restoreSession();
}

window.LifeOSAuth = {
  state: AUTH_STATE,
  initAuth,
  loginGoogle,
  logout,
  restoreSession,
  getOAuthRedirectUrl,
  consumeOAuthRedirect
};
