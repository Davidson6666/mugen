import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import BootScreen from './components/BootScreen.jsx';
import { GameProvider } from './context/GameProvider.jsx';
import { MenuProvider } from './context/MenuProvider.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import { AchievementsProvider } from './context/AchievementsProvider.jsx';
import { useMenu } from './context/MenuContext.js';
import { useAuth } from './context/AuthContext.js';
import { useGame } from './context/GameContext.js';
import { ROUTES, guardFor } from './routes.js';
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
import AccountScreen from './components/AccountScreen.jsx';
import NotFoundScreen from './components/NotFoundScreen.jsx';
import AchievementToast from './components/AchievementToast.jsx';
import UpdateBanner from './components/UpdateBanner.jsx';
import ScreenTransition from './components/ScreenTransition.jsx';
import { setSoundtrackScene } from './systems/Soundtrack.js';
import { useStageScale } from './utils/useStageScale.js';
import './App.css';

// Tela de cada rota (os enderecos estao em src/routes.js).
const SCREENS = {
  mainMenu: <MainMenu />,
  characterSelect: <CharacterSelect />,
  stageSelect: <StageSelect />,
  versus: <VersusScreen />,
  battle: <Battle />,
  result: <ResultScreen />,
  storyEnding: <StoryEndingScreen />,
  settings: <SettingsScreen />,
  login: <LoginScreen mode="login" />,
  register: <LoginScreen mode="register" />,
  leaderboard: <LeaderboardScreen />,
  matchmaking: <MatchmakingScreen />,
  achievements: <AchievementsScreen />,
  account: <AccountScreen />,
};

// Manda para o login quem esta sem sessao, guardando para onde a pessoa vai
// voltar depois de entrar.
function RedirectToLogin({ then }) {
  const { setAfterLogin } = useMenu();
  useEffect(() => { setAfterLogin(then); }, [setAfterLogin, then]);
  return <Navigate to="/login" replace />;
}

// Pre-condicao de cada tela (src/routes.js): luta sem lutador escolhido,
// resultado sem partida ou conta sem login voltam ao menu / ao login em vez de
// abrir uma tela quebrada (por exemplo, quem recarrega a pagina no meio da luta).
function Guarded({ screen, children }) {
  const guard = guardFor(screen);
  const { setup, result } = useGame();
  const { profile, loading } = useAuth();
  if (guard === 'setup' && !setup.mode) return <Navigate to="/" replace />;
  if (guard === 'result' && !result) return <Navigate to="/" replace />;
  if (guard === 'auth') {
    if (loading) return null;
    if (!profile) return <RedirectToLogin then={screen} />;
  }
  return children;
}

function Router() {
  return (
    <Routes>
      {ROUTES.map(({ screen, path }) => (
        <Route key={screen} path={path} element={<Guarded screen={screen}>{SCREENS[screen]}</Guarded>} />
      ))}
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
  );
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
