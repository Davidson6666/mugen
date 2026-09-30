import { useCallback, useMemo, useState } from 'react';
import { GameContext } from './GameContext.js';
import { STORY_LADDER } from '../data/storyLadder.js';

const EMPTY_SETUP = {
  mode: null,
  characters: [null, null],
  mapId: null,
  difficulty: 'normal',
  // So usado no Modo Historia: em qual luta da campanha o jogador esta. Quem
  // e o adversario, o cenario e a dificuldade de cada luta vem da escada fixa
  // (src/data/storyLadder.js), nao daqui.
  storyIndex: 0,
  // So usado na partida online: identificacao da partida no servidor, a
  // semente que faz os dois lados sortearem igual, qual dos dois lados sou eu
  // e o nome de quem esta do outro lado.
  matchId: null,
  seed: null,
  localPlayerIndex: 0,
  opponentName: null,
  // Dono de cada lado, na mesma ordem dos personagens: precisa pra dizer ao
  // servidor quem ganhou no fim.
  playerIds: [null, null],
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

  // Modo Historia: monta a luta de numero "index" da escada fixa - adversario,
  // cenario e dificuldade de uma vez so. Serve tanto pra primeira luta (logo
  // depois de escolher o personagem) quanto pra avancar pra proxima.
  const applyStoryStage = useCallback((index) => {
    const stage = STORY_LADDER[index];
    if (!stage) return;
    setSetup((current) => ({
      ...current,
      storyIndex: index,
      characters: [current.characters[0], stage.opponentId],
      mapId: stage.mapId,
      difficulty: stage.difficulty,
    }));
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
      applyStoryStage,
      startOnlineMatch,
      finishMatch: setResult,
    }),
    [setup, result, startSetup, chooseCharacter, chooseMap, chooseDifficulty, applyStoryStage, startOnlineMatch],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
