import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import { preloadImage, runBoot } from '../utils/bootTasks.js';
import { clashLayout, sheetPageOf } from '../utils/clashPose.js';
import { loadConfig, sheetUrl } from '../utils/characterConfig.js';
import { useAccents } from '../utils/useAccents.js';
import { Capsule, DiagonalBackdrop, KeyHints, Label, Spotlight } from './cvs2.jsx';
import FighterSprite from './FighterSprite.jsx';

// Tela de abertura: carrega o que o menu vai precisar (fontes, retratos, conta e
// os dois lutadores da cena), mostra uma barra que anda de verdade e diz que
// versao do jogo esta rodando. E util a cada atualizacao nova (o jogador ve que
// e a versao nova) e quando a conexao esta lenta (a tela avisa e deixa entrar
// assim mesmo, em vez de ficar parada).
//
// A cena e um confronto parado, como a tela de versus dos jogos de luta: dois
// lutadores sorteados, grandes e juntos, um acertando o soco no outro, com o
// estouro no ponto em que o punho encosta (src/utils/clashPose.js).
const MIN_SHOWN_MS = 3200;
const AUTH_WAIT_MS = 6000;
const SLOW_AFTER_MS = 4000;
const BAR = { x: 340, y: 692, width: 600 };

const BUILD_ID = import.meta.env.VITE_BUILD_ID ?? 'dev';
const BUILD_DATE = import.meta.env.VITE_BUILD_DATE ?? '';
const SEEN_KEY = 'mugen.lastBuild';

// O Ensina GOD fica de fora do sorteio: e segredo ate ser desbloqueado.
const POOL = characters.filter((entry) => entry.id !== 'ensina_god');

function pickPair() {
  const first = Math.floor(Math.random() * POOL.length);
  let second = Math.floor(Math.random() * (POOL.length - 1));
  if (second >= first) second += 1;
  return [POOL[first], POOL[second]];
}

// Compara com a ultima versao aberta neste navegador: diferente = acabou de
// atualizar. A primeira vez de todas nao conta como "atualizado".
function readUpdateNotice() {
  try {
    const last = window.localStorage.getItem(SEEN_KEY);
    window.localStorage.setItem(SEEN_KEY, BUILD_ID);
    return last !== null && last !== BUILD_ID;
  } catch {
    return false;
  }
}

const FONTS = [
  'italic 600 22px "Barlow Condensed"',
  'italic 800 28px "Barlow Condensed"',
  'italic 900 40px "Barlow Condensed"',
  '400 40px "Dela Gothic One"',
];

// Estrela do impacto: pontas alternadas longas e curtas, com um desvio fixo para
// nao ficar certinha demais.
function burstPoints(cx, cy, outer, inner, spikes = 14) {
  const points = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const angle = (Math.PI * i) / spikes + 0.2;
    const wobble = i % 2 === 0 ? 1 + ((i * 37) % 11) / 40 : 1;
    const radius = (i % 2 === 0 ? outer : inner) * wobble;
    points.push(`${(cx + Math.cos(angle) * radius).toFixed(1)},${(cy + Math.sin(angle) * radius).toFixed(1)}`);
  }
  return points.join(' ');
}

// Linhas de velocidade atras dos lutadores e a faisca do golpe na frente deles,
// na ponta do punho. As duas aparecem juntas, no instante do impacto.
function ImpactLines({ x, y }) {
  const lines = Array.from({ length: 12 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 12 + 0.3;
    const near = 120 + (i % 2) * 20;
    const far = 250 + (i % 3) * 55;
    return [x + Math.cos(angle) * near, y + Math.sin(angle) * near, x + Math.cos(angle) * far, y + Math.sin(angle) * far];
  });
  return (
    <g className="clash-burst" pointerEvents="none">
      <defs><clipPath id="clash-lines"><rect x={0} y={190} width={1280} height={450} /></clipPath></defs>
      <g clipPath="url(#clash-lines)" opacity={0.35}>
        {lines.map(([x1, y1, x2, y2]) => (
          <line key={`${x1}${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={PALETTE.textPrimary} strokeWidth={6} strokeLinecap="round" />
        ))}
      </g>
    </g>
  );
}

function ImpactSpark({ x, y }) {
  return (
    <g className="clash-burst clash-burst--spark" pointerEvents="none">
      <polygon points={burstPoints(x, y, 78, 32, 12)} fill={PALETTE.textPrimary} stroke={PALETTE.ink} strokeWidth={6} strokeLinejoin="round" />
      <polygon points={burstPoints(x, y, 54, 22, 9)} fill={PALETTE.fieldYellow} stroke={PALETTE.ink} strokeWidth={4} strokeLinejoin="round" />
    </g>
  );
}

export default function BootScreen({ leaving, onReady }) {
  const { loading } = useAuth();
  const [fraction, setFraction] = useState(0);
  const [pending, setPending] = useState(['FONTES']);
  const [tasksDone, setTasksDone] = useState(false);
  const [waited, setWaited] = useState(false);
  const [authGaveUp, setAuthGaveUp] = useState(false);
  const [slow, setSlow] = useState(false);
  const [updated] = useState(readUpdateNotice);
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  const readyRef = useRef(false);
  const [pair] = useState(pickPair);
  const [scene, setScene] = useState(null);
  const accents = useAccents(pair);

  useEffect(() => {
    let alive = true;
    runBoot([
      { label: 'FONTES', units: FONTS.length, run: (tick) => Promise.all(FONTS.map((font) => document.fonts.load(font).then(tick))) },
      {
        label: 'RETRATOS',
        units: characters.length,
        run: (tick) => Promise.all(characters.map((entry) => preloadImage(`${entry.dir}/${entry.portrait}`).then(tick))),
      },
      {
        // Os dois lutadores da cena: a config de cada um e so a pagina do atlas
        // em que mora o quadro usado (nao o atlas inteiro).
        label: 'LUTADORES',
        units: 2,
        run: async (tick) => {
          const [attackerConfig, defenderConfig] = await Promise.all(pair.map((entry) => loadConfig(entry)));
          const layout = clashLayout(attackerConfig, defenderConfig);
          if (alive) setScene(layout);
          const pages = [
            [pair[0], attackerConfig, layout.attacker],
            [pair[1], defenderConfig, layout.defender],
          ];
          await Promise.all(pages.map(async ([entry, config, side]) => {
            const file = config.sheets[sheetPageOf(config, side.sheetFrame)];
            await preloadImage(sheetUrl(entry, config, file));
            tick();
          }));
        },
      },
    ], {
      onProgress: (state) => {
        if (!alive) return;
        setFraction(state.fraction);
        setPending(state.pending);
      },
    }).then(() => alive && setTasksDone(true));

    const timers = [
      setTimeout(() => alive && setWaited(true), MIN_SHOWN_MS),
      setTimeout(() => alive && setAuthGaveUp(true), AUTH_WAIT_MS),
      setTimeout(() => alive && setSlow(true), SLOW_AFTER_MS),
    ];
    const connection = () => setOffline(navigator.onLine === false);
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
    };
  }, [pair]);

  const accountDone = !loading || authGaveUp;
  const ready = tasksDone && accountDone && waited;
  useEffect(() => {
    if (ready && !readyRef.current) {
      readyRef.current = true;
      onReady();
    }
  }, [ready, onReady]);

  // Demorou: Enter, Espaco ou um clique deixam entrar mesmo assim.
  useEffect(() => {
    if (!slow || ready) return undefined;
    const enter = (event) => {
      if (['Enter', 'Space', 'KeyJ'].includes(event.code)) onReady();
    };
    window.addEventListener('keydown', enter);
    return () => window.removeEventListener('keydown', enter);
  }, [slow, ready, onReady]);

  // A conta conta como um passo a mais: a barra so enche por inteiro quando ela
  // tambem terminou.
  const shown = Math.min(fraction, accountDone ? 1 : 0.94);
  const statusPending = !accountDone && pending.length === 0 ? ['CONTA'] : pending;
  let status = 'QUASE LA...';
  if (leaving || ready) status = 'PRONTO!';
  else if (statusPending.length > 0) status = `CARREGANDO ${statusPending[0]}...`;

  return (
    <div className={`boot-screen${leaving ? ' boot-screen--leaving' : ''}`}>
      <div className="boot-stage">
        {/* Fundo: cores, focos de luz e linhas de velocidade. */}
        <svg className="cvs2-svg" viewBox="0 0 1280 720">
          <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />
          {scene && pair.map((fighter, side) => {
            const place = side === 0 ? scene.attacker : scene.defender;
            return <Spotlight key={fighter.id} id={`boot${side}`} x={place.x} y={place.feetY} color={accents[side] ?? PALETTE.fieldYellow} />;
          })}
          {scene && <ImpactLines x={scene.contact.x} y={scene.contact.y} />}
        </svg>

        {/* Os dois lutadores como pano de fundo: esmaecidos, atras de tudo. */}
        <div className="boot-fighters">
          {scene && pair.map((fighter, side) => {
            const place = side === 0 ? scene.attacker : scene.defender;
            return (
              <div key={fighter.id} className="cvs2-sprite" style={{ left: place.x, top: place.feetY }}>
                <div
                  className={`cvs2-sprite__inner cvs2-sprite__inner--${side === 0 ? 'left' : 'right'} vs-enter`}
                  style={{ '--enter-from': side === 0 ? '-170px' : '170px', animationDuration: '380ms' }}
                >
                  <FighterSprite
                    entry={fighter} animation={place.clip} frameIndex={place.index}
                    scale={place.scale} flip={side === 1} pixelated
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Frente: faisca, titulo, nomes, barra e avisos. */}
        <svg className="cvs2-svg" viewBox="0 0 1280 720" pointerEvents="none">
          {scene && <g opacity={0.8}><ImpactSpark x={scene.contact.x} y={scene.contact.y} /></g>}

          <g className="menu-title menu-title--top">
            <Label x={640} y={112} size={100} anchor="middle" stroke={15} display>RUPTURA</Label>
          </g>
          <g className="menu-title menu-title--bottom">
            <Label x={640} y={190} size={82} anchor="middle" fill={PALETTE.fieldYellow} stroke={13} display>ARENA</Label>
          </g>

          {scene && pair.map((fighter, side) => (
            <g key={fighter.id} className={`vs-slide vs-slide--${side === 0 ? 'left' : 'right'}`} style={{ animationDelay: `${500 + side * 120}ms` }}>
              <Label
                x={side === 0 ? 48 : 1232} y={650} size={60} anchor={side === 0 ? 'start' : 'end'}
                fill={PALETTE.textPrimary} stroke={10} display
              >
                {fighter.name.toUpperCase()}
              </Label>
            </g>
          ))}

          <rect x={BAR.x} y={BAR.y} width={BAR.width} height={18} rx={9} fill={PALETTE.ink} stroke={PALETTE.textPrimary} strokeWidth={3} />
          <rect
            className="boot-bar" x={BAR.x + 3} y={BAR.y + 3} width={Math.max(0, (BAR.width - 6) * shown)} height={12} rx={6}
            fill={PALETTE.fieldYellow}
          />
          <Label x={640} y={BAR.y - 12} size={26} weight={800} anchor="middle" fill={ready ? PALETTE.fieldYellow : PALETTE.textPrimary} stroke={6}>
            {status}
          </Label>
          <Label x={BAR.x + BAR.width + 16} y={BAR.y + 17} size={22} weight={700} stroke={5}>
            {`${Math.round(shown * 100)}%`}
          </Label>

          {slow && !ready && (
            <Capsule x={850} y={36} width={390} size={21}>
              {offline ? 'SEM INTERNET · ENTER ENTRA ASSIM MESMO' : 'DEMORANDO · ENTER ENTRA ASSIM MESMO'}
            </Capsule>
          )}
          {updated && (
            <g className="boot-updated">
              <Capsule x={40} y={36} width={310} size={26}>VERSAO NOVA INSTALADA</Capsule>
            </g>
          )}
          <Label x={40} y={706} size={20} weight={700} stroke={5}>
            {`VERSAO ${BUILD_ID}${BUILD_DATE ? ` · ${BUILD_DATE}` : ''}`}
          </Label>
          {slow && !ready && <KeyHints x={1240} y={706} align="end" items={[{ keys: 'ENTER', text: 'ENTRAR' }]} />}

          <rect className="clash-flash" width={1280} height={720} fill={PALETTE.textPrimary} />
        </svg>
      </div>
      {slow && !ready && <button type="button" className="boot-skip" tabIndex={-1} onClick={onReady} aria-label="Entrar assim mesmo" />}
    </div>
  );
}
