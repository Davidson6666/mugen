import { useCallback, useEffect, useState } from 'react';
import BootScreen from './components/BootScreen.jsx';
import { GameProvider } from './context/GameProvider.jsx';
import { MenuProvider } from './context/MenuProvider.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import { AchievementsProvider } from './context/AchievementsProvider.jsx';
import { useMenu } from './context/MenuContext.js';
import MainMenu from './components/MainMenu.jsx';
import CharacterSelect from './components/CharacterSelect.jsx';
import StageSelect from './components/StageSelect.jsx';
import VersusScreen from './components/VersusScreen.jsx';
import Battle from './components/Battle.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import StoryEndingScreen from './components/StoryEndingScreen.jsx';
import SettingsScreen from './components/SettingsScreen.jsx';
import LoginScreen from './components/LoginScreen.jsx';
import LeaderboardScreen from './components/LeaderboardScreen.jsx';
import MatchmakingScreen from './components/MatchmakingScreen.jsx';
import AchievementsScreen from './components/AchievementsScreen.jsx';
import AchievementToast from './components/AchievementToast.jsx';
import UpdateBanner from './components/UpdateBanner.jsx';
import ScreenTransition from './components/ScreenTransition.jsx';
import { setSoundtrackScene } from './systems/Soundtrack.js';
import { useStageScale } from './utils/useStageScale.js';
import './App.css';

const SCREENS = {
  mainMenu: MainMenu,
  characterSelect: CharacterSelect,
  stageSelect: StageSelect,
  versus: VersusScreen,
  battle: Battle,
  result: ResultScreen,
  storyEnding: StoryEndingScreen,
  settings: SettingsScreen,
  login: LoginScreen,
  leaderboard: LeaderboardScreen,
  matchmaking: MatchmakingScreen,
  achievements: AchievementsScreen,
};

function Router() {
  const { screen } = useMenu();
  const Screen = SCREENS[screen] ?? MainMenu;
  return <Screen />;
}

export default function App() {
  return (
    <AuthProvider>
      <AchievementsProvider>
        <GameProvider>
          <MenuProvider>
            <Stage />
          </MenuProvider>
        </GameProvider>
      </AchievementsProvider>
    </AuthProvider>
  );
}

// Grao de filme por cima dos menus (nao da luta: la quebraria o pixel art). E uma
// textura fixa, sem JS, so para tirar o aspecto de cor chapada.
function Grain() {
  const { screen } = useMenu();
  // A trilha muda entre menus e arena sem sobrepor músicas.
  useEffect(() => {
    setSoundtrackScene(screen === 'battle' ? 'battle' : 'menu');
  }, [screen]);
  if (screen === 'battle') return null;
  return <div className="grain" aria-hidden="true" />;
}

// Separado do App porque o hook da escala precisa rodar dentro dos providers.
function Stage() {
  const { fullscreen, scale } = useStageScale();
  // 'loading' -> 'leaving' (a abertura some) -> 'done'. O menu so entra quando a
  // abertura termina, e suas animacoes de entrada acontecem com ela saindo.
  const [boot, setBoot] = useState('loading');
  const finishBoot = useCallback(() => {
    setBoot((current) => (current === 'loading' ? 'leaving' : current));
  }, []);
  useEffect(() => {
    if (boot !== 'leaving') return undefined;
    const timer = setTimeout(() => setBoot('done'), 600);
    return () => clearTimeout(timer);
  }, [boot]);
  return (
    <div className={`app app--fullscreen${fullscreen ? ' app--real-fullscreen' : ''}`} style={{ '--stage-scale': scale }}>
      <div className="app__stage">
        {boot !== 'loading' && <Router />}
        <Grain />
        {boot !== 'loading' && <ScreenTransition />}
        {boot !== 'done' && <BootScreen leaving={boot === 'leaving'} onReady={finishBoot} />}
      </div>
      <AchievementToast />
      <UpdateBanner />
    </div>
  );
}
