import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import { preloadImage, runBoot } from '../utils/bootTasks.js';
import { Capsule, DiagonalBackdrop, KeyHints, Label, Pedestal, Shape, Spotlight } from './cvs2.jsx';
import { diamond } from '../utils/hudGeometry.js';
import { useAccents } from '../utils/useAccents.js';
import FighterSprite from './FighterSprite.jsx';

// Tela de abertura: carrega o que o menu vai precisar (fontes, retratos, conta),
// mostra uma barra que anda de verdade e diz que versao do jogo esta rodando. E
// util a cada atualizacao nova (o jogador ve que e a versao nova) e quando a
// conexao esta lenta (a tela avisa e deixa entrar assim mesmo, em vez de ficar
// parada).
const MIN_SHOWN_MS = 2800;
const AUTH_WAIT_MS = 6000;
const SLOW_AFTER_MS = 4000;
const BAR = { x: 340, y: 652, width: 600 };

// Dois lutadores sorteados a cada abertura, de frente um para o outro. O Ensina
// GOD fica de fora: e segredo ate ser desbloqueado.
const POOL = characters.filter((entry) => entry.id !== 'ensina_god');
const STANDS = [[300, 540], [980, 540]];

function pickPair() {
  const first = Math.floor(Math.random() * POOL.length);
  let second = Math.floor(Math.random() * (POOL.length - 1));
  if (second >= first) second += 1;
  return [POOL[first], POOL[second]];
}

const BUILD_ID = import.meta.env.VITE_BUILD_ID ?? 'dev';
const BUILD_DATE = import.meta.env.VITE_BUILD_DATE ?? '';
const SEEN_KEY = 'mugen.lastBuild';

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
  }, []);

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
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />

        <Label x={640} y={150} size={118} anchor="middle" stroke={16} display>RUPTURA</Label>
        <Label x={640} y={240} size={100} anchor="middle" fill={PALETTE.fieldYellow} stroke={14} display>ARENA</Label>

        {pair.map((fighter, side) => (
          <g key={fighter.id}>
            <Spotlight id={`boot${side}`} x={STANDS[side][0]} y={STANDS[side][1]} color={accents[side] ?? PALETTE.fieldYellow} />
            <Pedestal x={STANDS[side][0]} y={STANDS[side][1]} />
            <g className={`vs-slide vs-slide--${side === 0 ? 'left' : 'right'}`} style={{ animationDelay: `${300 + side * 120}ms` }}>
              <Label x={STANDS[side][0]} y={STANDS[side][1] + 92} size={62} anchor="middle" stroke={10} display>
                {fighter.name.toUpperCase()}
              </Label>
            </g>
          </g>
        ))}
        <g className="vs-slam" style={{ animationDelay: '900ms' }}>
          <Shape points={diamond([640, 440], 84)} fill={PALETTE.emblem} />
          <Label x={640} y={470} size={110} anchor="middle" fill={PALETTE.fieldYellow} stroke={12} display>VS</Label>
        </g>

        <rect x={BAR.x} y={BAR.y} width={BAR.width} height={18} rx={9} fill={PALETTE.ink} stroke={PALETTE.textPrimary} strokeWidth={3} />
        <rect
          className="boot-bar" x={BAR.x + 3} y={BAR.y + 3} width={Math.max(0, (BAR.width - 6) * shown)} height={12} rx={6}
          fill={PALETTE.fieldYellow}
        />
        <Label x={640} y={BAR.y - 14} size={28} weight={800} anchor="middle" fill={ready ? PALETTE.fieldYellow : PALETTE.textPrimary} stroke={6}>
          {status}
        </Label>
        <Label x={BAR.x + BAR.width} y={BAR.y + 44} size={22} weight={700} anchor="end" stroke={5}>
          {`${Math.round(shown * 100)}%`}
        </Label>

        {slow && !ready && (
          <g>
            <Capsule x={390} y={40} width={700} size={26}>
              {offline ? 'SEM INTERNET · VERIFIQUE A CONEXAO' : 'DEMORANDO MAIS QUE O NORMAL · A CONEXAO PODE ESTAR LENTA'}
            </Capsule>
            <KeyHints x={520} y={692} items={[{ keys: 'ENTER', text: 'ENTRAR ASSIM MESMO' }]} />
          </g>
        )}

        {updated && (
          <g className="boot-updated">
            <Capsule x={40} y={40} width={310} size={26}>VERSAO NOVA INSTALADA</Capsule>
          </g>
        )}
        <Label x={40} y={700} size={22} weight={700} stroke={5}>
          {`VERSAO ${BUILD_ID}${BUILD_DATE ? ` · ${BUILD_DATE}` : ''}`}
        </Label>
      </svg>
      {pair.map((fighter, side) => (
        <div key={fighter.id} className="cvs2-sprite" style={{ left: STANDS[side][0], top: STANDS[side][1] }}>
          <div className={`cvs2-sprite__inner cvs2-sprite__inner--${side === 0 ? 'left' : 'right'} vs-enter`}>
            <FighterSprite entry={fighter} flip={side === 1} />
          </div>
        </div>
      ))}
      {slow && !ready && <button type="button" className="boot-skip" tabIndex={-1} onClick={onReady} aria-label="Entrar assim mesmo" />}
    </div>
  );
}
