import { GameProvider } from './context/GameProvider.jsx';
import { MenuProvider } from './context/MenuProvider.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
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
};

function Router() {
  const { screen } = useMenu();
  const Screen = SCREENS[screen] ?? MainMenu;
  return <Screen />;
}

export default function App() {
  const { fullscreen, scale } = useStageScale();
  return (
    <AuthProvider>
      <GameProvider>
        <MenuProvider>
          <div className={`app${fullscreen ? ' app--fullscreen' : ''}`} style={{ '--stage-scale': scale }}>
            <div className="app__stage">
              <Router />
            </div>
          </div>
        </MenuProvider>
      </GameProvider>
    </AuthProvider>
  );
}
