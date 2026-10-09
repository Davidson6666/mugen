import { useEffect, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { fetchLeaderboard } from '../utils/auth.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import FighterSprite from './FighterSprite.jsx';
import { DiagonalBackdrop, KeyHints, Label, MenuOption, Pedestal, Spotlight } from './cvs2.jsx';
import { useAccents } from '../utils/useAccents.js';
import { loadConfig } from '../utils/characterConfig.js';

const OPTIONS = [
  { id: 'versusCpu', label: 'VERSUS CPU', hint: 'ENFRENTE A MAQUINA EM UMA PARTIDA AVULSA' },
  { id: 'versusPlayer', label: 'VERSUS PLAYER', hint: 'DOIS JOGADORES NO MESMO TECLADO · JOGADOR 1 PRECISA LOGAR' },
  { id: 'online', label: 'PARTIDA ONLINE', hint: 'ENTRE NA FILA E ENFRENTE OUTRA PESSOA PELA INTERNET' },
  { id: 'ranking', label: 'RANKING ONLINE', hint: 'CRIE UMA CONTA E VEJA A CLASSIFICACAO' },
  { id: 'achievements', label: 'CONQUISTAS', hint: 'O QUE VOCE JA CONQUISTOU JOGANDO · UMA LISTA POR CONTA' },
  { id: 'story', label: 'MODO HISTORIA', hint: 'ENFRENTE UMA SEQUENCIA DE LUTAS ATE O FINAL' },
  { id: 'training', label: 'AREA DE TREINO', hint: 'TREINE GOLPES E COMBOS NUM BONECO QUE NAO REVIDA' },
  { id: 'settings', label: 'CONFIGURACOES', hint: 'CONTROLES E AJUSTES' },
];

// As opcoes descem acompanhando a borda da faixa diagonal, no campo azul.
// Como elas andam para a esquerda conforme descem, a primeira nao pode subir
// mais que isto (sairia pela direita da tela), e a ultima nao pode passar da
// linha de dica la embaixo - por isso as sete cabem apertadas, com a capsula
// mais baixa que o padrao.
const OPTION_WIDTH = 340;
const OPTION_HEIGHT = 42;

const optionPosition = (index) => {
  const y = 286 + index * 45;
  return [1212 - y - 16, y];
};

// Quem aparece no menu: um lutador por vez, em tamanho nativo, trocando a cada
// poucos segundos. O Ensina GOD fica de fora: e segredo ate ser desbloqueado.
const FEATURED = characters.filter((entry) => entry.id !== 'ensina_god');
const FEATURE_MS = 5200;

// Podio no canto de baixo: so entra quem ja jogou alguma partida online. Com
// o ranking zerado (todo mundo em 1200, sem partida) nao tem podio nenhum.
const PODIUM_SIZE = 3;
const PODIUM_COLORS = [PALETTE.fieldYellow, PALETTE.textPrimary, PALETTE.fieldOrangeLight];

export default function MainMenu() {
  const { go, setAfterLogin } = useMenu();
  const { startSetup } = useGame();
  const { profile, loading, logout } = useAuth();
  const [index, setIndex] = useState(0);
  const [podium, setPodium] = useState([]);
  const [featuredIndex, setFeaturedIndex] = useState(() => Math.floor(Math.random() * FEATURED.length));
  const [tagline, setTagline] = useState('');
  const featured = FEATURED[featuredIndex];
  const [accent] = useAccents([featured]);

  useEffect(() => {
    const timer = setInterval(() => setFeaturedIndex((current) => (current + 1) % FEATURED.length), FEATURE_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    loadConfig(featured).then((config) => alive && setTagline(config?.description ?? '')).catch(() => {});
    return () => { alive = false; };
  }, [featured]);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard().then(({ rows }) => {
      if (cancelled) return;
      const played = (rows ?? []).filter((row) => row.wins + row.losses > 0);
      setPodium(played.slice(0, PODIUM_SIZE));
    });
    return () => { cancelled = true; };
  }, []);

  const move = (_player, direction) => {
    if (direction === 'up') setIndex((current) => (current - 1 + OPTIONS.length) % OPTIONS.length);
    if (direction === 'down') setIndex((current) => (current + 1) % OPTIONS.length);
  };

  const confirm = () => {
    const option = OPTIONS[index];
    if (option.disabled) return;
    // Enquanto a sessao salva ainda esta sendo lida do Supabase, quem tem
    // conta ainda aparece como deslogado aqui - confirmar uma opcao que exige
    // login nesse instante mandaria pro login sem necessidade.
    if (loading && (option.id === 'online' || option.id === 'versusPlayer')) return;
    if (option.id === 'settings') {
      go('settings');
      return;
    }
    if (option.id === 'ranking') {
      setAfterLogin(null);
      go('leaderboard');
      return;
    }
    // A lista e por conta, mas da pra espiar deslogado: a tela avisa que
    // precisa entrar pra ganhar e guardar.
    if (option.id === 'achievements') {
      go('achievements');
      return;
    }
    // Partida online vale Elo, entao aqui a conta e obrigatoria (nao tem lado
    // "convidado" como no versus local). Escolhe o personagem antes de entrar
    // na fila: a escolha e trocada com o adversario quando a partida forma.
    if (option.id === 'online') {
      startSetup('online');
      if (!profile) {
        setAfterLogin('characterSelect');
        go('login');
        return;
      }
      go('characterSelect');
      return;
    }
    startSetup(option.id);
    // VERSUS PLAYER e local (mesmo teclado), mas o jogador 1 precisa estar
    // logado - o 2 entra como convidado, sem conta (como em outros jogos de
    // luta com versus local). O VERSUS CPU continua livre.
    if (option.id === 'versusPlayer' && !profile) {
      setAfterLogin('characterSelect');
      go('login');
      return;
    }
    go('characterSelect');
  };

  useMenuInput({ onMove: move, onConfirm: confirm });

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />

        {loading ? (
          <Label x={1240} y={38} size={24} weight={700} anchor="end" stroke={5}>
            CARREGANDO CONTA...
          </Label>
        ) : profile ? (
          <g onClick={logout} style={{ cursor: 'pointer' }}>
            <Label x={1240} y={38} size={24} weight={700} anchor="end" stroke={5}>
              LOGADO COMO {profile.username.toUpperCase()} · CLIQUE PARA SAIR
            </Label>
          </g>
        ) : (
          <g onClick={() => { setAfterLogin(null); go('login'); }} style={{ cursor: 'pointer' }}>
            <Label x={1240} y={38} size={24} weight={700} anchor="end" fill={PALETTE.fieldYellow} stroke={5}>
              NAO LOGADO · CLIQUE PARA ENTRAR
            </Label>
          </g>
        )}

        <Spotlight id="menu" x={180} y={470} color={accent ?? PALETTE.fieldYellow} />
        <g className="menu-title menu-title--top"><Label x={48} y={150} size={130} stroke={18}>RUPTURA</Label></g>
        <g className="menu-title menu-title--bottom"><Label x={96} y={260} size={120} fill={PALETTE.fieldYellow} stroke={16}>ARENA</Label></g>

        <Pedestal x={180} y={470} halfWidth={150} />
        <Label key={featured.id} x={44} y={330} size={26} weight={800} fill={PALETTE.fieldYellow} stroke={5}>
          {`${featured.name.toUpperCase()}${tagline ? ` · ${tagline.toUpperCase()}` : ''}`}
        </Label>

        {OPTIONS.map((option, position) => {
          const [x, y] = optionPosition(position);
          return (
            <MenuOption
              key={option.id}
              x={x} y={y} width={OPTION_WIDTH} height={OPTION_HEIGHT} order={position}
              label={option.label}
              active={position === index}
              disabled={option.disabled}
              onPointerEnter={() => setIndex(position)}
              onClick={confirm}
            />
          );
        })}

        {podium.length > 0 && (
          <g>
            <Label x={44} y={534} size={30} weight={800} fill={PALETTE.fieldYellow} stroke={6}>
              MELHORES DO RANKING
            </Label>
            {podium.map((row, position) => (
              <Label
                key={row.username}
                x={44} y={578 + position * 42} size={32} weight={800}
                fill={PODIUM_COLORS[position]} stroke={6}
              >
                {`${position + 1}  ${row.username.toUpperCase()}  ·  ${row.elo_rating}`}
              </Label>
            ))}
          </g>
        )}

        <Label x={1240} y={674} size={26} weight={800} anchor="end" stroke={6}>{OPTIONS[index].hint}</Label>
        <KeyHints x={1240} y={708} align="end" items={[{ keys: 'W/S', text: 'NAVEGA' }, { keys: 'J', text: 'CONFIRMA' }]} />
      </svg>

      {/* Mesmo ponto do pedestal: o sprite fica em pe em cima dele, centrado. */}
      <div className="cvs2-sprite" style={{ left: 180, top: 470 }}>
        <div key={featured.id} className="cvs2-sprite__inner cvs2-sprite__inner--left">
          <FighterSprite entry={featured} />
        </div>
      </div>
    </div>
  );
}
