import { GameProvider } from './context/GameProvider.jsx';
import { MenuProvider } from './context/MenuProvider.jsx';
import { useMenu } from './context/MenuContext.js';
import MainMenu from './components/MainMenu.jsx';
import CharacterSelect from './components/CharacterSelect.jsx';
import StageSelect from './components/StageSelect.jsx';
import VersusScreen from './components/VersusScreen.jsx';
import Battle from './components/Battle.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import SettingsScreen from './components/SettingsScreen.jsx';
import './App.css';

const SCREENS = {
  mainMenu: MainMenu,
  characterSelect: CharacterSelect,
  stageSelect: StageSelect,
  versus: VersusScreen,
  battle: Battle,
  result: ResultScreen,
  settings: SettingsScreen,
};

function Router() {
  const { screen } = useMenu();
  const Screen = SCREENS[screen] ?? MainMenu;
  return <Screen />;
}

export default function App() {
  return (
    <GameProvider>
      <MenuProvider>
        <div className="app">
          <div className="app__stage">
            <Router />
            <div className="app__scanlines" aria-hidden="true" />
          </div>
        </div>
      </MenuProvider>
    </GameProvider>
  );
}
