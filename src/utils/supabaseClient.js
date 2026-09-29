import { createClient } from '@supabase/supabase-js';

// Credenciais em .env.local (fora do git). A chave aqui e a "publishable"
// (a antiga "anon"): e segura de expor no navegador, contanto que as tabelas
// tenham RLS (Row Level Security) configurado - e o caso das nossas.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn('Supabase nao configurado: faltam VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY em .env.local');
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
