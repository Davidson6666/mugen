import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './AuthContext.js';
import { supabase } from '../utils/supabaseClient.js';
import { fetchOwnProfile, signIn, signOut, signUp } from '../utils/auth.js';

// Quem esta logado agora (perfil publico, com o Elo) e as acoes de conta.
// Igual ao GameProvider/MenuProvider: guarda o estado, as telas leem e chamam
// as funcoes.
export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Ao abrir o jogo, retoma a sessao salva (o Supabase guarda ela sozinho).
  useEffect(() => {
    let cancelled = false;
    fetchOwnProfile().then(({ profile: found }) => {
      if (!cancelled) setProfile(found ?? null);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  // Se a sessao cair (token expirado, logout em outra aba), acompanha aqui.
  useEffect(() => {
    if (!supabase) return undefined;
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setProfile(null);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const login = useCallback(async (username, password) => {
    const result = await signIn(username, password);
    if (result.profile) setProfile(result.profile);
    return result;
  }, []);

  const register = useCallback(async (username, password) => {
    const result = await signUp(username, password);
    if (result.profile) setProfile(result.profile);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ profile, loading, login, register, logout }),
    [profile, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
