import { useEffect, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { reportMatchResult } from '../utils/matchmaking.js';
import { useAchievements } from '../context/AchievementsContext.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import FighterSprite from './FighterSprite.jsx';
import { Capsule, DiagonalBackdrop, Label, MenuOption, Pedestal } from './cvs2.jsx';

const MENU_OPTION = { id: 'menu', label: 'MENU PRINCIPAL' };
const DEFAULT_OPTIONS = [{ id: 'rematch', label: 'REVANCHE' }, MENU_OPTION];
const STORY_LOSS_OPTIONS = [{ id: 'retry', label: 'TENTAR NOVAMENTE' }, MENU_OPTION];
const STORY_WIN_OPTIONS = [{ id: 'continue', label: 'PROXIMA LUTA' }, MENU_OPTION];
const ONLINE_OPTIONS = [MENU_OPTION];

// O que mostrar depois de reportar quem ganhou pro servidor.
const RANKING_MESSAGE = {
  fechada: 'RANKING ATUALIZADO',
  esperando: 'ESPERANDO O ADVERSARIO CONFIRMAR O RESULTADO',
  conflito: 'OS DOIS LADOS DISCORDARAM: NINGUEM GANHOU ELO',
  'ja fechada': 'RANKING JA ATUALIZADO',
};

const optionPosition = (index) => {
  const y = 470 + index * 72;
  return [1212 - y - 16, y];
};

const STAND = [230, 560];

export default function ResultScreen() {
  const { resetTo } = useMenu();
  const { setup, result, applyStoryStage } = useGame();
  const { report } = useAchievements();
  const [index, setIndex] = useState(0);

  const winnerIndex = result?.winner ?? 0;
  const winner = characters.find((entry) => entry.id === setup.characters[winnerIndex]) ?? characters[0];
  const isStory = setup.mode === 'story';
  const online = setup.mode === 'online';
  let winnerLabel = winnerIndex === 1 && (setup.mode === 'versusCpu' || isStory) ? 'CPU' : `${winnerIndex + 1}P`;
  if (online) {
    winnerLabel = winnerIndex === setup.localPlayerIndex
      ? 'VOCE'
      : (setup.opponentName ?? 'ADVERSARIO').toUpperCase();
  }

  // No Modo Historia, derrota deixa tentar a mesma luta de novo e vitoria
  // avanca pra proxima (a ultima vitoria pula direto pra tela de campanha
  // vencida, em Battle.jsx - esta tela nao chega a aparecer nesse caso).
  // Online nao tem revanche: uma nova partida precisa passar pela fila de
  // novo, pra virar outra partida no servidor.
  let OPTIONS = DEFAULT_OPTIONS;
  if (isStory) OPTIONS = winnerIndex === 0 ? STORY_WIN_OPTIONS : STORY_LOSS_OPTIONS;
  if (online) OPTIONS = ONLINE_OPTIONS;

  const [ranking, setRanking] = useState(null);

  // Partida online: conta pro servidor quem ganhou. O Elo so mexe quando os
  // dois lados reportarem a mesma coisa; o W.O. nao vale ranking justamente
  // porque quem saiu nunca vai confirmar.
  const matchId = setup.matchId;
  const winnerUserId = online ? setup.playerIds?.[winnerIndex] : null;
  const walkover = Boolean(result?.walkover);
  useEffect(() => {
    if (!matchId || !winnerUserId || walkover) return undefined;
    let cancelled = false;
    reportMatchResult(matchId, winnerUserId).then(({ status, error: reportError }) => {
      if (cancelled) return;
      setRanking(reportError ? 'NAO FOI POSSIVEL ATUALIZAR O RANKING' : RANKING_MESSAGE[status] ?? null);
    });
    return () => { cancelled = true; };
  }, [matchId, winnerUserId, walkover]);

  // Conta a partida pra contabilidade das conquistas. O jogador e sempre o
  // lado 0, menos no online, onde depende de que lado a fila colocou ele.
  // W.O. fica de fora: ninguem jogou de verdade.
  const playerSide = online ? (setup.localPlayerIndex ?? 0) : 0;
  const playerWon = winnerIndex === playerSide;
  const score = result?.wins ?? [0, 0];
  const shutout = playerWon && score[playerSide] >= 2 && score[1 - playerSide] === 0;
  const myCharacter = setup.characters[playerSide];
  const mode = setup.mode;
  // "Sem levar um golpe" conta golpe que passou pela guarda: defender nao
  // estraga a conquista, levar sim.
  const untouched = playerWon && (result?.hitsTaken?.[playerSide] ?? 1) === 0;
  const comeback = Boolean(result?.comeback);
  const bestCombo = result?.bestCombo?.[playerSide] ?? 0;
  useEffect(() => {
    if (!result || walkover) return;
    report({ mode, won: playerWon, characterId: myCharacter, shutout, untouched, comeback, bestCombo });
    // Roda uma vez por fim de partida: as dependencias sao todas o retrato
    // dessa mesma partida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // W.O. nao vale ranking, e isso ja da pra dizer na hora de desenhar.
  const rankingMessage = walkover && online
    ? 'O ADVERSARIO SAIU: A PARTIDA NAO VALE RANKING'
    : ranking;

  const onMove = (_player, direction) => {
    if (direction === 'up' || direction === 'down') {
      setIndex((current) => (current + (direction === 'up' ? -1 : 1) + OPTIONS.length)
        % OPTIONS.length);
    }
  };

  const onConfirm = () => {
    const optionId = OPTIONS[index].id;
    if (optionId === 'continue') {
      // A proxima luta da campanha ja vem pronta da escada: adversario,
      // cenario e dificuldade. Nao passa por escolha de cenario nenhuma.
      applyStoryStage(setup.storyIndex + 1);
      resetTo('versus');
      return;
    }
    resetTo(optionId === 'rematch' || optionId === 'retry' ? 'versus' : 'mainMenu');
  };

  useMenuInput({ onMove, onConfirm });

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />

        <Label x={48} y={96} size={52} fill={winnerIndex === 0 ? PALETTE.cursorP1 : PALETTE.cursorP2}>
          {winnerLabel} VENCE
        </Label>
        <Label x={40} y={224} size={140} stroke={16}>{winner.name.toUpperCase()}</Label>
        <Label x={48} y={300} size={56} fill={PALETTE.fieldYellow} stroke={10}>WINS!</Label>
        {result?.walkover && (
          <Label x={48} y={356} size={30} weight={800} stroke={6}>O ADVERSARIO SAIU DA PARTIDA</Label>
        )}
        {rankingMessage && (
          <Label x={48} y={404} size={26} weight={800} fill={PALETTE.fieldYellow} stroke={6}>{rankingMessage}</Label>
        )}

        <Pedestal x={STAND[0]} y={STAND[1]} />

        {result && (
          <Capsule x={1240} y={96} width={300} size={52} align="end">
            {`${result.wins[0]} — ${result.wins[1]}`}
          </Capsule>
        )}

        {OPTIONS.map((option, position) => {
          const [x, y] = optionPosition(position);
          return (
            <MenuOption
              key={option.id}
              x={x} y={y}
              label={option.label}
              active={position === index}
              onPointerEnter={() => setIndex(position)}
              onClick={onConfirm}
            />
          );
        })}
      </svg>

      <div className="cvs2-sprite" style={{ left: STAND[0], top: STAND[1] }}>
        <FighterSprite entry={winner} animation="victoryPose" />
      </div>
    </div>
  );
}
