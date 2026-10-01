import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AchievementsContext } from './AchievementsContext.js';
import { useAuth } from './AuthContext.js';
import { fetchEarned, reportMatch } from '../utils/achievements.js';
import { UNLOCKED_BY } from '../data/achievements.js';

// Quanto tempo o aviso de conquista nova fica no canto da tela.
const TOAST_MS = 6000;

// Conquistas da conta logada, o aviso de quando uma e ganha, e quais
// personagens isso libera. Trocar de conta troca a lista inteira: elas sao da
// conta, nao do computador.
export function AchievementsProvider({ children }) {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;

  // Guardado junto com o dono: assim trocar de conta (ou sair) nao deixa a
  // lista da conta anterior aparecendo enquanto a nova ainda carrega.
  const [loaded, setLoaded] = useState({ userId: null, ids: [] });
  const [toasts, setToasts] = useState([]);
  const timers = useRef([]);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    fetchEarned().then(({ earned: rows }) => {
      if (!cancelled) setLoaded({ userId, ids: rows.map((row) => row.achievement_id) });
    });
    return () => { cancelled = true; };
  }, [userId]);

  const earned = useMemo(
    () => (userId && loaded.userId === userId ? loaded.ids : []),
    [userId, loaded],
  );

  useEffect(() => () => {
    for (const timer of timers.current) clearTimeout(timer);
  }, []);

  const has = useCallback((id) => earned.includes(id), [earned]);

  // Um personagem travado so pode ser escolhido por quem tem a conquista que
  // libera ele.
  const isCharacterUnlocked = useCallback((characterId) => {
    const needed = UNLOCKED_BY[characterId];
    return !needed || earned.includes(needed);
  }, [earned]);

  // Chamado no fim de uma partida. O servidor decide o que foi conquistado e
  // devolve so o que e novo, que vira aviso na tela.
  const report = useCallback(async (outcome) => {
    if (!userId) return [];
    const { unlocked, error } = await reportMatch(outcome);
    // Falha aqui some sem deixar rastro: o jogador nao ganha a conquista e
    // nada avisa. Entao reclama alto no console.
    if (error) {
      console.error('Nao foi possivel registrar a partida nas conquistas:', error);
      return [];
    }
    if (unlocked.length === 0) return [];
    setLoaded((current) => ({ userId, ids: [...new Set([...current.ids, ...unlocked])] }));
    setToasts((current) => [...current, ...unlocked]);
    const timer = setTimeout(() => {
      setToasts((current) => current.filter((id) => !unlocked.includes(id)));
    }, TOAST_MS);
    timers.current.push(timer);
    return unlocked;
  }, [userId]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((entry) => entry !== id));
  }, []);

  const value = useMemo(
    () => ({ earned, toasts, has, isCharacterUnlocked, report, dismiss, loggedIn: Boolean(userId) }),
    [earned, toasts, has, isCharacterUnlocked, report, dismiss, userId],
  );

  return <AchievementsContext.Provider value={value}>{children}</AchievementsContext.Provider>;
}
