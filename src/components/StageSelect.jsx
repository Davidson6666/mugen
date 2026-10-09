import { useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { PALETTE } from '../utils/palette.js';
import { toPoints } from '../utils/cvs2Layout.js';
import characters from '../data/characters.json';
import maps from '../data/maps.json';
import { Capsule, DiagonalBackdrop, KeyHints, Label, MenuOption, Shape } from './cvs2.jsx';

const DIFFICULTIES = [
  { id: 'easy', label: 'FACIL' },
  { id: 'normal', label: 'NORMAL' },
  { id: 'hard', label: 'DIFICIL' },
];

// Contra a CPU a tela e um passo a passo: escolhe o cenario e confirma,
// escolhe a dificuldade e confirma, e so entao o botao de comecar fica
// disponivel. Antes a partida comecava no primeiro confirmar, com o que
// estivesse destacado - rapido pra quem ja conhecia, confuso pra quem nao.
//
// Confirmar cada passo tambem resolve um problema antigo de outro jeito: como
// a escolha fica guardada, andar com o cursor depois nao troca mais o cenario
// sem querer.
const STEPS = [
  { id: 'map', title: 'ESCOLHA O CENARIO', hints: [{ keys: 'W/S', text: 'ESCOLHE' }, { keys: 'J', text: 'CONFIRMA' }, { keys: 'K', text: 'VOLTA' }] },
  { id: 'difficulty', title: 'ESCOLHA A DIFICULDADE', hints: [{ keys: 'A/D', text: 'ESCOLHE' }, { keys: 'J', text: 'CONFIRMA' }, { keys: 'K', text: 'VOLTA' }] },
  { id: 'start', title: 'TUDO PRONTO', hints: [{ keys: 'J', text: 'COMECA' }, { keys: 'K', text: 'VOLTA' }] },
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

  const [stepIndex, setStepIndex] = useState(0);
  const [chosenMap, setChosenMap] = useState(null);
  const [chosenDifficulty, setChosenDifficulty] = useState(null);
  const step = STEPS[stepIndex].id;

  function startMatch(mapId, difficulty) {
    chooseMap(mapId);
    if (!twoPlayers) {
      chooseDifficulty(difficulty);
      // O oponente da CPU sai no sorteio: contra a maquina espelho e permitido.
      const opponent = characters[Math.floor(Math.random() * characters.length)];
      chooseCharacter(1, opponent.id);
    }
    go('versus');
  }

  const onMove = (player, direction) => {
    if (player === 1 && !twoPlayers) return;
    if (votes[player]) return;

    if (!twoPlayers) {
      if (step === 'difficulty') {
        if (direction === 'up') { setStepIndex(0); return; }
        if (direction === 'left' || direction === 'right') {
          setDifficultyIndex((current) => (
            (current + (direction === 'left' ? -1 : 1) + DIFFICULTIES.length) % DIFFICULTIES.length
          ));
        }
        return;
      }
      if (step === 'start') {
        if (direction === 'up') setStepIndex(1);
        return;
      }
    }

    if (direction !== 'up' && direction !== 'down') return;

    setCursors((current) => {
      const next = [...current];
      const stepBy = direction === 'up' ? -1 : 1;
      next[player] = (next[player] + stepBy + maps.length) % maps.length;
      return next;
    });
  };

  const onConfirm = (player) => {
    if (player === 1 && !twoPlayers) return;

    if (!twoPlayers) {
      // Um passo por confirmada: cenario, dificuldade, e so entao comecar.
      if (step === 'map') {
        setChosenMap(cursors[0]);
        setStepIndex(1);
        return;
      }
      if (step === 'difficulty') {
        setChosenDifficulty(difficultyIndex);
        setStepIndex(2);
        return;
      }
      if (chosenMap === null || chosenDifficulty === null) return;
      startMatch(maps[chosenMap].id, DIFFICULTIES[chosenDifficulty].id);
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
    startMatch(chosen, DIFFICULTIES[difficultyIndex].id);
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
    // Volta um passo de cada vez; so sai da tela quando ja esta no primeiro.
    if (!twoPlayers && step === 'start') {
      setChosenDifficulty(null);
      setStepIndex(1);
      return;
    }
    if (!twoPlayers && step === 'difficulty') {
      setChosenMap(null);
      setStepIndex(0);
      return;
    }
    if (player === 0) back();
  };

  useMenuInput({ onMove, onConfirm, onCancel, twoPlayers });

  const activePlayers = twoPlayers ? [0, 1] : [0];
  const previewed = maps[cursors[0]];
  const ready = chosenMap !== null && chosenDifficulty !== null;

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />

        <Label x={48} y={100} size={62}>{twoPlayers ? 'VOTEM O CENARIO' : 'STAGE SELECT'}</Label>
        {!twoPlayers && (
          <Label x={48} y={132} size={26} weight={800} fill={PALETTE.fieldYellow} stroke={6}>
            {`PASSO ${stepIndex + 1} DE 3 · ${STEPS[stepIndex].title}`}
          </Label>
        )}

        <defs><clipPath id="stage-preview"><polygon points={toPoints(PREVIEW)} /></clipPath></defs>
        <Shape points={PREVIEW} fill={PALETTE.ink} />
        <g clipPath="url(#stage-preview)">
          {/* A chave troca a imagem a cada cenario e reinicia o fade com zoom. */}
          <image
            key={previewed.id} className="stage-preview-in"
            href={`${previewed.dir}/${previewed.background}`}
            x={40} y={138} width={660} height={350} preserveAspectRatio="xMidYMid slice"
            style={{ transformOrigin: '370px 313px', imageRendering: 'pixelated' }}
          />
          <polygon points={toPoints(PREVIEW)} fill="url(#stage-shade)" />
        </g>
        <defs>
          <linearGradient id="stage-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="60%" stopColor={PALETTE.ink} stopOpacity={0} />
            <stop offset="100%" stopColor={PALETTE.ink} stopOpacity={0.65} />
          </linearGradient>
        </defs>
        <Label x={680} y={470} size={26} weight={800} anchor="end" stroke={5}>{`${cursors[0] + 1} / ${maps.length}`}</Label>
        <g key={`name-${previewed.id}`} className="stage-name-in">
          <Capsule x={48} y={512} width={520} size={previewed.name.length > 22 ? 30 : 38}>{previewed.name.toUpperCase()}</Capsule>
        </g>

        {maps.map((stage, index) => {
          const [x, y] = optionPosition(index);
          const here = activePlayers.filter((player) => cursors[player] === index);
          const votedBy = activePlayers.filter((player) => votes[player] === stage.id);
          const picked = !twoPlayers && chosenMap === index;
          return (
            <g key={stage.id}>
              <MenuOption
                x={x} y={y} width={340}
                fontSize={stage.name.length > 22 ? 24 : stage.name.length > 16 ? 28 : 34}
                label={picked ? `${stage.name.toUpperCase()} ✓` : stage.name.toUpperCase()}
                active={picked || (step === 'map' && cursors[0] === index)}
                marker={!picked}
                onPointerEnter={() => {
                  if (twoPlayers || step === 'map') setCursors((current) => [index, current[1]]);
                }}
                onClick={() => {
                  if (!twoPlayers && step !== 'map') return;
                  setCursors((current) => [index, current[1]]);
                  onConfirm(0);
                }}
              />
              {here.map((player, order) => (
                <Label
                  key={player} x={x - 34 - order * 50} y={y + 42} size={32} anchor="end"
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
              fill={step === 'map' ? PALETTE.textSecondary : PALETTE.fieldYellow} stroke={6}
            >
              DIFICULDADE DA CPU
            </Label>
            {DIFFICULTIES.map((entry, index) => {
              const picked = chosenDifficulty === index;
              return (
                <MenuOption
                  key={entry.id}
                  x={742 + index * 168} y={582} width={150}
                  label={entry.label}
                  active={picked || (step === 'difficulty' && index === difficultyIndex)}
                  disabled={step === 'map'}
                  marker={false}
                  onPointerEnter={() => { if (step !== 'map') setDifficultyIndex(index); }}
                  onClick={() => {
                    if (step === 'map') return;
                    setDifficultyIndex(index);
                    setChosenDifficulty(index);
                    setStepIndex(2);
                  }}
                />
              );
            })}
          </g>
        )}

        {!twoPlayers && (
          <MenuOption
            x={48} y={580} width={420}
            label={ready ? 'COMECAR PARTIDA' : 'ESCOLHA CENARIO E DIFICULDADE'}
            active={step === 'start'}
            disabled={!ready}
            onClick={() => { if (ready) onConfirm(0); }}
          />
        )}

        {twoPlayers ? (
          <Label x={1240} y={700} size={22} weight={600} anchor="end" stroke={5}>
            CADA JOGADOR VOTA · VOTOS DIFERENTES SORTEIAM ENTRE OS DOIS
          </Label>
        ) : (
          <KeyHints x={1240} y={702} align="end" items={STEPS[stepIndex].hints} />
        )}
      </svg>
    </div>
  );
}
