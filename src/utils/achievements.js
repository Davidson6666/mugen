import { supabase } from './supabaseClient.js';

// Conquistas da conta logada. Quem joga sem conta nao ganha nada - elas sao da
// conta, nao do computador - entao tudo aqui devolve vazio sem supabase.

export async function fetchEarned() {
  if (!supabase) return { earned: [] };
  const { data, error } = await supabase
    .from('achievements')
    .select('achievement_id, earned_at')
    .order('earned_at', { ascending: true });
  if (error) return { earned: [], error: error.message };
  return { earned: data ?? [] };
}

// Conta o fim de uma partida e devolve so as conquistas novas, pra tela poder
// avisar. Quem decide o que foi conquistado e o servidor (record_match_result
// no schema.sql), nao esta tela.
export async function reportMatch({
  mode, won, characterId,
  shutout = false, storyComplete = false,
  untouched = false, comeback = false, bestCombo = 0,
}) {
  if (!supabase) return { unlocked: [] };
  const { data, error } = await supabase.rpc('record_match_result', {
    p_mode: mode ?? null,
    p_won: Boolean(won),
    p_character: characterId ?? null,
    p_shutout: Boolean(shutout),
    p_story_complete: Boolean(storyComplete),
    p_untouched: Boolean(untouched),
    p_comeback: Boolean(comeback),
    p_best_combo: Number(bestCombo) || 0,
  });
  if (error) return { unlocked: [], error: error.message };
  return { unlocked: data ?? [] };
}
