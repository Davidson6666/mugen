import { useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { PALETTE } from '../utils/palette.js';
import { toPoints } from '../utils/cvs2Layout.js';
import characters from '../data/characters.json';
import maps from '../data/maps.json';
import { Capsule, DiagonalBackdrop, Label, MenuOption, Shape } from './cvs2.jsx';

const DIFFICULTIES = [
  { id: 'easy', label: 'FACIL' },
  { id: 'normal', label: 'NORMAL' },
  { id: 'hard', label: 'DIFICIL' },
];

// Modo Historia: 6 lutas, dificuldade sobe a cada duas.
const STORY_DIFFICULTY_BY_STAGE = ['easy', 'easy', 'normal', 'normal', 'hard', 'hard'];

function buildStoryLadder() {
  const shuffled = [...characters].sort(() => Math.random() - 0.5);
  return STORY_DIFFICULTY_BY_STAGE.map((difficulty, index) => ({
    opponentId: shuffled[index].id,
    difficulty,
  }));
}

// Previa do cenario numa moldura inclinada, como as barras de vida.
const PREVIEW = [[76, 138], [700, 138], [664, 488], [40, 488]];
const CURSOR_COLORS = [PALETTE.cursorP1, PALETTE.cursorP2];

// Lista de cenarios no campo azul, inclinando junto com a faixa.
const optionPosition = (index) => [900 - index * 18, 150 + index * 66];

export default function StageSelect() {
  const { go, back } = useMenu();
  const { setup, chooseMap, chooseCharacter, chooseDifficulty, setStoryOpponents } = useGame();
  const twoPlayers = setup.mode === 'versusPlayer';
  const isStory = setup.mode === 'story';

  const [cursors, setCursors] = useState([0, maps.length - 1]);
  const [votes, setVotes] = useState([null, null]);
  const [section, setSection] = useState('maps');
  const [difficultyIndex, setDifficultyIndex] = useState(
    Math.max(0, DIFFICULTIES.findIndex((entry) => entry.id === setup.difficulty)),
  );

  function startMatch(mapId) {
    chooseMap(mapId);
    if (isStory) {
      // A escala de adversarios/dificuldade da campanha e sorteada uma vez,
      // na primeira luta, e reaproveitada nas seguintes.
      let ladder = setup.storyOpponents;
      if (ladder.length === 0) {
        ladder = buildStoryLadder();
        setStoryOpponents(ladder);
      }
      const stage = ladder[setup.storyIndex];
      chooseDifficulty(stage.difficulty);
      chooseCharacter(1, stage.opponentId);
    } else if (!twoPlayers) {
      chooseDifficulty(DIFFICULTIES[difficultyIndex].id);
      // O oponente da CPU sai no sorteio: contra a maquina espelho e permitido.
      const opponent = characters[Math.floor(Math.random() * characters.length)];
      chooseCharacter(1, opponent.id);
    }
    go('versus');
  }

  const onMove = (player, direction) => {
    if (player === 1 && !twoPlayers) return;

    if (!twoPlayers && !isStory && section === 'difficulty') {
      if (direction === 'up') setSection('maps');
      if (direction === 'left') {
        setDifficultyIndex((current) => (current - 1 + DIFFICULTIES.length) % DIFFICULTIES.length);
      }
      if (direction === 'right') setDifficultyIndex((current) => (current + 1) % DIFFICULTIES.length);
      return;
    }

    if (votes[player] || (direction !== 'up' && direction !== 'down')) return;

    // Contra a CPU (fora da campanha), descer do ultimo cenario leva a
    // escolha de dificuldade - no Modo Historia a dificuldade ja vem definida.
    if (!twoPlayers && !isStory && direction === 'down' && cursors[player] === maps.length - 1) {
      setSection('difficulty');
      return;
    }

    setCursors((current) => {
      const next = [...current];
      const step = direction === 'up' ? -1 : 1;
      next[player] = (next[player] + step + maps.length) % maps.length;
      return next;
    });
  };

  const onConfirm = (player) => {
    if (player === 1 && !twoPlayers) return;

    if (!twoPlayers) {
      startMatch(maps[cursors[0]].id);
      return;
    }

    if (votes[player]) return;
    const next = [...votes];
    next[player] = maps[cursors[player]].id;
    setVotes(next);
    if (!next[0] || !next[1]) return;

    // Votos iguais valem direto; votos diferentes sorteiam entre os dois
    // escolhidos, nunca entre todos os mapas.
    const chosen = next[0] === next[1] ? next[0] : next[Math.floor(Math.random() * 2)];
    startMatch(chosen);
  };

  const onCancel = (player) => {
    if (player === 1 && !twoPlayers) return;
    if (twoPlayers && votes[player]) {
      setVotes((current) => {
        const next = [...current];
        next[player] = null;
        return next;
      });
      return;
    }
    if (!twoPlayers && section === 'difficulty') {
      setSection('maps');
      return;
    }
    if (player === 0) back();
  };

  useMenuInput({ onMove, onConfirm, onCancel, twoPlayers });

  const activePlayers = twoPlayers ? [0, 1] : [0];
  const previewed = maps[cursors[0]];

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />

        <Label x={48} y={112} size={72}>{twoPlayers ? 'VOTEM O CENARIO' : 'STAGE SELECT'}</Label>

        <defs><clipPath id="stage-preview"><polygon points={toPoints(PREVIEW)} /></clipPath></defs>
        <Shape points={PREVIEW} fill={PALETTE.ink} />
        <image
          href={`${previewed.dir}/${previewed.background}`}
          x={40} y={138} width={660} height={350} preserveAspectRatio="xMidYMid slice"
          clipPath="url(#stage-preview)"
        />
        <Capsule x={48} y={512} width={520} size={38}>{previewed.name.toUpperCase()}</Capsule>

        {maps.map((stage, index) => {
          const [x, y] = optionPosition(index);
          const here = activePlayers.filter((player) => cursors[player] === index);
          const votedBy = activePlayers.filter((player) => votes[player] === stage.id);
          return (
            <g key={stage.id}>
              <MenuOption
                x={x} y={y} width={340}
                label={stage.name.toUpperCase()}
                active={section === 'maps' && cursors[0] === index}
                onPointerEnter={() => {
                  setSection('maps');
                  setCursors((current) => [index, current[1]]);
                }}
                onClick={() => onConfirm(0)}
              />
              {here.map((player, order) => (
                <Label
                  key={player} x={x - 12 - order * 50} y={y + 42} size={32} anchor="end"
                  fill={CURSOR_COLORS[player]} stroke={6}
                >
                  {votedBy.includes(player) ? `${player + 1}P✓` : `${player + 1}P`}
                </Label>
              ))}
            </g>
          );
        })}

        {!twoPlayers && !isStory && (
          <g>
            <Label
              x={1240} y={538} size={30} weight={800} anchor="end"
              fill={section === 'difficulty' ? PALETTE.fieldYellow : PALETTE.textPrimary} stroke={6}
            >
              DIFICULDADE DA CPU
            </Label>
            {DIFFICULTIES.map((entry, index) => (
              <MenuOption
                key={entry.id}
                x={742 + index * 168} y={556} width={150}
                label={entry.label}
                active={index === difficultyIndex}
                marker={false}
                onPointerEnter={() => {
                  setSection('difficulty');
                  setDifficultyIndex(index);
                }}
                onClick={() => startMatch(maps[cursors[0]].id)}
              />
            ))}
          </g>
        )}

        {isStory && (
          <Label x={1240} y={610} size={30} weight={800} anchor="end" fill={PALETTE.fieldYellow} stroke={6}>
            {`MODO HISTORIA · LUTA ${setup.storyIndex + 1} DE ${STORY_DIFFICULTY_BY_STAGE.length}`}
          </Label>
        )}

        <Label x={1240} y={700} size={22} weight={600} anchor="end" stroke={5}>
          {twoPlayers
            ? 'CADA JOGADOR VOTA · VOTOS DIFERENTES SORTEIAM ENTRE OS DOIS'
            : 'W/S ESCOLHE · J CONFIRMA · K VOLTA'}
        </Label>
      </svg>
    </div>
  );
}
