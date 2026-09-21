import { useCallback, useMemo, useState } from 'react';
import { GameContext } from './GameContext.js';

const EMPTY_SETUP = {
  mode: null,
  characters: [null, null],
  mapId: null,
  difficulty: 'normal',
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

  const value = useMemo(
    () => ({
      setup,
      result,
      startSetup,
      chooseCharacter,
      chooseMap,
      chooseDifficulty,
      finishMatch: setResult,
    }),
    [setup, result, startSetup, chooseCharacter, chooseMap, chooseDifficulty],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
