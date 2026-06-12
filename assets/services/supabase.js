'use strict';
/* ============ SUPABASE CLIENT ============ */
const SUPABASE_URL = 'https://zzjqdftfstuakuhjhttb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6anFkZnRmc3R1YWt1aGpodHRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjk0ODksImV4cCI6MjA5Njg0NTQ4OX0.GkBX1WQzzxIUUFV6jckG0UrrpSp8eJu_a-s3wZmA3zw';

function createSupabaseClient() {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.warn('Biblioteca Supabase não carregada. O app continuará em modo local.');
    return null;
  }

  try {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (error) {
    console.error('Falha ao criar cliente Supabase:', error);
    return null;
  }
}

window.LifeOSSupabase = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  client: createSupabaseClient()
};
window.supabaseClient = window.LifeOSSupabase.client;
