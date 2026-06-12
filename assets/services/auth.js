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
  const url = new URL('.', window.location.href);
  url.hash = '';
  url.search = '';
  return url.href;
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

  await restoreSession();
}

window.LifeOSAuth = {
  state: AUTH_STATE,
  initAuth,
  loginGoogle,
  logout,
  restoreSession,
  getOAuthRedirectUrl
};
