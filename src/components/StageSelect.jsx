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

// Previa do cenario numa moldura inclinada, como as barras de vida.
const PREVIEW = [[76, 138], [700, 138], [664, 488], [40, 488]];
const CURSOR_COLORS = [PALETTE.cursorP1, PALETTE.cursorP2];

// Lista de cenarios no campo azul, inclinando junto com a faixa.
const optionPosition = (index) => [900 - index * 18, 150 + index * 66];

export default function StageSelect() {
  const { go, back } = useMenu();
  const { setup, chooseMap, chooseCharacter, chooseDifficulty } = useGame();
  const twoPlayers = setup.mode === 'versusPlayer';

  const [cursors, setCursors] = useState([0, maps.length - 1]);
  const [votes, setVotes] = useState([null, null]);
  const [difficultyIndex, setDifficultyIndex] = useState(
    Math.max(0, DIFFICULTIES.findIndex((entry) => entry.id === setup.difficulty)),
  );

  function startMatch(mapId) {
    chooseMap(mapId);
    if (!twoPlayers) {
      chooseDifficulty(DIFFICULTIES[difficultyIndex].id);
      // O oponente da CPU sai no sorteio: contra a maquina espelho e permitido.
      const opponent = characters[Math.floor(Math.random() * characters.length)];
      chooseCharacter(1, opponent.id);
    }
    go('versus');
  }

  const onMove = (player, direction) => {
    if (player === 1 && !twoPlayers) return;
    if (votes[player]) return;

    // A dificuldade fica sempre a um toque: esquerda e direita mexem nela de
    // qualquer cenario. Antes era preciso descer ate o ultimo mapa pra
    // alcanca-la, e como o cenario que vale e o que esta destacado, isso
    // obrigava a levar o ultimo mapa junto - nao dava pra escolher o primeiro
    // cenario e a dificuldade ao mesmo tempo.
    if (!twoPlayers && (direction === 'left' || direction === 'right')) {
      setDifficultyIndex((current) => (
        (current + (direction === 'left' ? -1 : 1) + DIFFICULTIES.length) % DIFFICULTIES.length
      ));
      return;
    }

    if (direction !== 'up' && direction !== 'down') return;

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
                active={cursors[0] === index}
                onPointerEnter={() => setCursors((current) => [index, current[1]])}
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

        {!twoPlayers && (
          <g>
            <Label
              x={1240} y={566} size={30} weight={800} anchor="end"
              fill={PALETTE.fieldYellow} stroke={6}
            >
              DIFICULDADE DA CPU
            </Label>
            {DIFFICULTIES.map((entry, index) => (
              <MenuOption
                key={entry.id}
                x={742 + index * 168} y={582} width={150}
                label={entry.label}
                active={index === difficultyIndex}
                marker={false}
                onPointerEnter={() => setDifficultyIndex(index)}
                onClick={() => setDifficultyIndex(index)}
              />
            ))}
          </g>
        )}


        <Label x={1240} y={700} size={22} weight={600} anchor="end" stroke={5}>
          {twoPlayers
            ? 'CADA JOGADOR VOTA · VOTOS DIFERENTES SORTEIAM ENTRE OS DOIS'
            : 'W/S ESCOLHE O CENARIO · A/D AJUSTA A DIFICULDADE · J CONFIRMA · K VOLTA'}
        </Label>
      </svg>
    </div>
  );
}
