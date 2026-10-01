import { createContext, useContext } from 'react';

export const AchievementsContext = createContext(null);

export function useAchievements() {
  const value = useContext(AchievementsContext);
  if (!value) throw new Error('useAchievements precisa estar dentro de AchievementsProvider');
  return value;
}
