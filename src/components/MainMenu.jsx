import { useEffect, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { fetchLeaderboard } from '../utils/auth.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import FighterSprite from './FighterSprite.jsx';
import { DiagonalBackdrop, Label, MenuOption, Pedestal } from './cvs2.jsx';

const OPTIONS = [
  { id: 'versusCpu', label: 'VERSUS CPU', hint: 'ENFRENTE A MAQUINA EM UMA PARTIDA AVULSA' },
  { id: 'versusPlayer', label: 'VERSUS PLAYER', hint: 'DOIS JOGADORES NO MESMO TECLADO · JOGADOR 1 PRECISA LOGAR' },
  { id: 'online', label: 'PARTIDA ONLINE', hint: 'ENTRE NA FILA E ENFRENTE OUTRA PESSOA PELA INTERNET' },
  { id: 'ranking', label: 'RANKING ONLINE', hint: 'CRIE UMA CONTA E VEJA A CLASSIFICACAO' },
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
const OPTION_HEIGHT = 46;

const optionPosition = (index) => {
  const y = 286 + index * 52;
  return [1212 - y - 16, y];
};

// Quem aparece no menu: os personagens com arte propria, em tamanho nativo.
const MENU_FIGHTERS = ['itachi']
  .map((id) => characters.find((entry) => entry.id === id))
  .filter(Boolean);

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

        <Label x={48} y={150} size={130} stroke={18}>RUPTURA</Label>
        <Label x={96} y={260} size={120} fill={PALETTE.fieldYellow} stroke={16}>ARENA</Label>

        <Pedestal x={180} y={470} halfWidth={150} />

        {OPTIONS.map((option, position) => {
          const [x, y] = optionPosition(position);
          return (
            <MenuOption
              key={option.id}
              x={x} y={y} width={OPTION_WIDTH} height={OPTION_HEIGHT}
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
        <Label x={1240} y={708} size={22} weight={600} anchor="end" stroke={5}>W/S NAVEGA · J CONFIRMA</Label>
      </svg>

      {MENU_FIGHTERS.map((fighter, position) => (
        // Mesmo ponto do pedestal: o sprite fica em pe em cima dele, centrado.
        <div key={fighter.id} className="cvs2-sprite" style={{ left: 180 + position * 110, top: 470 }}>
          <FighterSprite entry={fighter} flip={position === 1} />
        </div>
      ))}
    </div>
  );
}
