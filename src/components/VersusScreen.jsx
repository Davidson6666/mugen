import { useEffect, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { assetManager } from '../systems/SpriteSheetManager.js';
import { PALETTE } from '../utils/palette.js';
import { diamond } from '../utils/hudGeometry.js';
import characters from '../data/characters.json';
import maps from '../data/maps.json';
import FighterSprite from './FighterSprite.jsx';
import { Capsule, DiagonalBackdrop, Label, Pedestal, Shape, Spotlight } from './cvs2.jsx';
import { useAccents } from '../utils/useAccents.js';
import { STORY_LADDER } from '../data/storyLadder.js';

const MINIMUM_DISPLAY_MS = 2400;

// Cada lado no seu campo da faixa diagonal: P1 em cima a esquerda, P2 embaixo
// a direita, com o nome gigante e o personagem em tamanho nativo no pedestal.
const SIDES = [
  { tag: [60, 84, 'start'], name: [56, 168, 'start'], stand: [260, 520] },
  { tag: [1220, 560, 'end'], name: [1224, 648, 'end'], stand: [1020, 420] },
];

export default function VersusScreen() {
  const { go, resetTo } = useMenu();
  const { setup } = useGame();
  const [loaded, setLoaded] = useState(false);
  const [waited, setWaited] = useState(false);
  const [failed, setFailed] = useState(false);

  const fighters = setup.characters.map((id) => characters.find((entry) => entry.id === id));
  const stage = maps.find((entry) => entry.id === setup.mapId);
  const accents = useAccents(fighters);

  useEffect(() => {
    let cancelled = false;

    // So aqui os sprite sheets completos e o cenario entram: ate agora a
    // selecao usou apenas os retratos leves.
    Promise.all([
      ...fighters.map((entry) => assetManager.loadCharacter(entry)),
      assetManager.loadMap(stage),
    ])
      .then(() => !cancelled && setLoaded(true))
      .catch((error) => {
        console.error('Falha ao carregar os assets da luta:', error);
        if (!cancelled) setFailed(true);
      });

    const timer = setTimeout(() => !cancelled && setWaited(true), MINIMUM_DISPLAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // setup nao muda enquanto esta tela existe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loaded && waited) go('battle');
  }, [loaded, waited, go]);

  if (failed) {
    return (
      <div className="cvs2-screen">
        <svg className="cvs2-svg" viewBox="0 0 1280 720">
          <DiagonalBackdrop lattice={false} />
          <Label x={640} y={330} size={48} anchor="middle">NAO FOI POSSIVEL CARREGAR A LUTA</Label>
          <g onClick={() => resetTo('mainMenu')} style={{ cursor: 'pointer' }}>
            <Capsule x={510} y={380} width={260}>MENU</Capsule>
          </g>
        </svg>
      </div>
    );
  }

  let tags = ['1P', setup.mode === 'versusPlayer' ? '2P' : 'CPU'];
  if (setup.mode === 'training') tags = ['1P', 'BONECO'];
  if (setup.mode === 'online') {
    const opponent = (setup.opponentName ?? 'ADVERSARIO').toUpperCase();
    tags = setup.localPlayerIndex === 1 ? [opponent, 'VOCE'] : ['VOCE', opponent];
  }

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} />

        {fighters.map((fighter, player) => {
          const { tag, name, stand } = SIDES[player];
          return (
            <g key={player}>
              <Spotlight id={`vs${player}`} x={stand[0]} y={stand[1]} color={accents[player] ?? (player === 0 ? PALETTE.fieldYellow : PALETTE.cursorP2)} />
              <Pedestal x={stand[0]} y={stand[1]} />
              <g className={`vs-slide vs-slide--${player === 0 ? 'left' : 'right'}`}>
                <Label x={tag[0]} y={tag[1]} size={44} anchor={tag[2]} fill={player === 0 ? PALETTE.cursorP1 : PALETTE.cursorP2} stroke={8}>
                  {tags[player]}
                </Label>
                <Label x={name[0]} y={name[1]} size={104} anchor={name[2]} stroke={14}>{fighter.name.toUpperCase()}</Label>
              </g>
            </g>
          );
        })}

        <g className="vs-slam">
          <Shape points={diamond([640, 330], 118)} fill={PALETTE.emblem} />
          <Label x={640} y={392} size={180} anchor="middle" fill={PALETTE.fieldYellow} stroke={16}>VS</Label>
        </g>
        <rect className="vs-flash" width={1280} height={720} fill={PALETTE.textPrimary} pointerEvents="none" />

        <Capsule x={420} y={498} width={440} size={34}>{`STAGE · ${stage.name.toUpperCase()}`}</Capsule>
        {setup.mode === 'story' && (
          <Capsule x={420} y={545} width={440} size={26}>
            {`MODO HISTORIA · LUTA ${setup.storyIndex + 1} DE ${STORY_LADDER.length}`}
          </Capsule>
        )}
        <Label x={640} y={615} size={28} weight={800} anchor="middle" fill={loaded && waited ? PALETTE.fieldYellow : PALETTE.textPrimary} stroke={6}>
          {loaded && waited ? 'PRONTO!' : 'CARREGANDO...'}
        </Label>
        <rect x={440} y={634} width={400} height={10} rx={5} fill={PALETTE.ink} stroke={PALETTE.textPrimary} strokeWidth={2} />
        <rect className="vs-bar" x={442} y={636} width={396} height={6} rx={3} fill={PALETTE.fieldYellow} />
      </svg>

      {fighters.map((fighter, player) => (
        <div key={player} className="cvs2-sprite" style={{ left: SIDES[player].stand[0], top: SIDES[player].stand[1] }}>
          <div className={`cvs2-sprite__inner cvs2-sprite__inner--${player === 0 ? 'left' : 'right'} vs-enter`}>
            <FighterSprite entry={fighter} flip={player === 1} />
          </div>
        </div>
      ))}
    </div>
  );
}
