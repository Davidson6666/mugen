import { useCallback, useMemo, useState } from 'react';
import { GameContext } from './GameContext.js';

const EMPTY_SETUP = {
  mode: null,
  characters: [null, null],
  mapId: null,
  difficulty: 'normal',
  // So usado no Modo Historia: lista de adversarios/dificuldade sorteada no
  // inicio da campanha, e em qual luta dela o jogador esta agora.
  storyOpponents: [],
  storyIndex: 0,
  // So usado na partida online: identificacao da partida no servidor, a
  // semente que faz os dois lados sortearem igual, qual dos dois lados sou eu
  // e o nome de quem esta do outro lado.
  matchId: null,
  seed: null,
  localPlayerIndex: 0,
  opponentName: null,
};

// Tudo que a partida precisa saber antes de comecar, e o resultado depois que
// ela termina. As telas escrevem aqui; a tela de luta le.
export function GameProvider({ children }) {
  const [setup, setSetup] = useState(EMPTY_SETUP);
  const [result, setResult] = useState(null);

  const startSetup = useCallback((mode) => {
    setSetup({ ...EMPTY_SETUP, mode });
    setResult(null);
  }, []);

  const chooseCharacter = useCallback((player, characterId) => {
    setSetup((current) => {
      const characters = [...current.characters];
      characters[player] = characterId;
      return { ...current, characters };
    });
  }, []);

  const chooseMap = useCallback((mapId) => {
    setSetup((current) => ({ ...current, mapId }));
  }, []);

  const chooseDifficulty = useCallback((difficulty) => {
    setSetup((current) => ({ ...current, difficulty }));
  }, []);

  const setStoryOpponents = useCallback((opponents) => {
    setSetup((current) => ({ ...current, storyOpponents: opponents }));
  }, []);

  const advanceStory = useCallback(() => {
    setSetup((current) => ({ ...current, storyIndex: current.storyIndex + 1 }));
  }, []);

  // Partida online: os dois lados montam exatamente este mesmo setup (mesma
  // ordem de personagens, mesmo cenario, mesma semente), so mudando qual e o
  // lado local.
  const startOnlineMatch = useCallback((online) => {
    setSetup({ ...EMPTY_SETUP, mode: 'online', ...online });
    setResult(null);
  }, []);

  const value = useMemo(
    () => ({
      setup,
      result,
      startSetup,
      chooseCharacter,
      chooseMap,
      chooseDifficulty,
      setStoryOpponents,
      advanceStory,
      startOnlineMatch,
      finishMatch: setResult,
    }),
    [setup, result, startSetup, chooseCharacter, chooseMap, chooseDifficulty, setStoryOpponents, advanceStory, startOnlineMatch],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
