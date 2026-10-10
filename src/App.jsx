import { useEffect } from 'react';
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
import { setMenuMusic } from './systems/MenuAudio.js';
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
  // A trilha dos menus acompanha o grao: toca em tudo menos na luta.
  useEffect(() => {
    setMenuMusic(screen !== 'battle');
  }, [screen]);
  if (screen === 'battle') return null;
  return <div className="grain" aria-hidden="true" />;
}

// Separado do App porque o hook da escala precisa rodar dentro dos providers.
function Stage() {
  const { fullscreen, scale } = useStageScale();
  return (
    <div className={`app${fullscreen ? ' app--fullscreen' : ''}`} style={{ '--stage-scale': scale }}>
      <div className="app__stage">
        <Router />
        <Grain />
        <ScreenTransition />
      </div>
      <AchievementToast />
      <UpdateBanner />
    </div>
  );
}
