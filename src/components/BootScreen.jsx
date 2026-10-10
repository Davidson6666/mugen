import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import { preloadImage, runBoot } from '../utils/bootTasks.js';
import { Capsule, DiagonalBackdrop, KeyHints, Label } from './cvs2.jsx';

// Tela de abertura: carrega o que o menu vai precisar (fontes, retratos, conta),
// mostra uma barra que anda de verdade e diz que versao do jogo esta rodando. E
// util a cada atualizacao nova (o jogador ve que e a versao nova) e quando a
// conexao esta lenta (a tela avisa e deixa entrar assim mesmo, em vez de ficar
// parada).
const MIN_SHOWN_MS = 700;
const AUTH_WAIT_MS = 6000;
const SLOW_AFTER_MS = 4000;
const BAR = { x: 340, y: 520, width: 600 };

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

        <Label x={640} y={250} size={150} anchor="middle" stroke={18} display>RUPTURA</Label>
        <Label x={640} y={372} size={130} anchor="middle" fill={PALETTE.fieldYellow} stroke={16} display>ARENA</Label>

        <rect x={BAR.x} y={BAR.y} width={BAR.width} height={18} rx={9} fill={PALETTE.ink} stroke={PALETTE.textPrimary} strokeWidth={3} />
        <rect
          className="boot-bar" x={BAR.x + 3} y={BAR.y + 3} width={Math.max(0, (BAR.width - 6) * shown)} height={12} rx={6}
          fill={PALETTE.fieldYellow}
        />
        <Label x={640} y={BAR.y - 18} size={30} weight={800} anchor="middle" fill={ready ? PALETTE.fieldYellow : PALETTE.textPrimary} stroke={6}>
          {status}
        </Label>
        <Label x={BAR.x + BAR.width} y={BAR.y + 48} size={22} weight={700} anchor="end" stroke={5}>
          {`${Math.round(shown * 100)}%`}
        </Label>

        {slow && !ready && (
          <g>
            <Capsule x={290} y={600} width={700} size={28}>
              {offline ? 'SEM INTERNET · VERIFIQUE A CONEXAO' : 'DEMORANDO MAIS QUE O NORMAL · A CONEXAO PODE ESTAR LENTA'}
            </Capsule>
            <KeyHints x={520} y={672} items={[{ keys: 'ENTER', text: 'ENTRAR ASSIM MESMO' }]} />
          </g>
        )}

        {updated && (
          <g className="boot-updated">
            <Capsule x={40} y={40} width={330} size={26}>VERSAO NOVA INSTALADA</Capsule>
          </g>
        )}
        <Label x={40} y={700} size={22} weight={700} stroke={5}>
          {`VERSAO ${BUILD_ID}${BUILD_DATE ? ` · ${BUILD_DATE}` : ''}`}
        </Label>
      </svg>
      {slow && !ready && <button type="button" className="boot-skip" tabIndex={-1} onClick={onReady} aria-label="Entrar assim mesmo" />}
    </div>
  );
}
