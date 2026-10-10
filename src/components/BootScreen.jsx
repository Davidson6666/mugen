import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import { preloadImage, runBoot } from '../utils/bootTasks.js';
import { diamond } from '../utils/hudGeometry.js';
import { toPoints } from '../utils/cvs2Layout.js';
import { Capsule, DiagonalBackdrop, KeyHints, Label, PortraitCell } from './cvs2.jsx';

// Tela de abertura: carrega o que o menu vai precisar (fontes, retratos, conta),
// mostra uma barra que anda de verdade e diz que versao do jogo esta rodando. E
// util a cada atualizacao nova (o jogador ve que e a versao nova) e quando a
// conexao esta lenta (a tela avisa e deixa entrar assim mesmo, em vez de ficar
// parada).
const MIN_SHOWN_MS = 2200;
const AUTH_WAIT_MS = 6000;
const SLOW_AFTER_MS = 4000;
const BAR = { x: 340, y: 598, width: 600, height: 22, slant: 12 };

// Faixa com o elenco passando, nos losangos da tela de selecao. O Ensina GOD fica
// de fora: e segredo ate ser desbloqueado. Duas copias seguidas para o giro nao
// ter emenda.
const ROSTER = characters.filter((entry) => entry.id !== 'ensina_god' && entry.portrait);
const ROSTER_STEP = 112;
const RIBBON_Y = 470;

// Dicas que giram embaixo da barra enquanto carrega.
const TIPS = [
  'ESC NA LUTA ABRE A LISTA DE GOLPES DO SEU LUTADOR',
  'J SOCO · K CHUTE · L ESPECIAL (DA PRA TROCAR EM CONFIGURACOES)',
  'VENCA O MODO HISTORIA PARA LIBERAR UM LUTADOR SECRETO',
  'A AREA DE TREINO TEM UM BONECO QUE NAO REVIDA',
  'NA PARTIDA ONLINE, TODO MUNDO COMECA COM 1000 DE ELO',
  'CONTROLES DE PS5 E XBOX FUNCIONAM DIRETO',
];
const TIP_MS = 2600;

// Barra inclinada como a ponta da barra de vida.
function slanted(x, y, width, height, slant) {
  return toPoints([[x + slant, y], [x + width + slant, y], [x + width, y + height], [x, y + height]]);
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
  const [portraits, setPortraits] = useState(false);
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));

  useEffect(() => {
    let alive = true;
    runBoot([
      { label: 'FONTES', units: FONTS.length, run: (tick) => Promise.all(FONTS.map((font) => document.fonts.load(font).then(tick))) },
      {
        label: 'RETRATOS',
        units: characters.length,
        run: (tick) => Promise.all(characters.map((entry) => preloadImage(`${entry.dir}/${entry.portrait}`).then(tick)))
          .then(() => alive && setPortraits(true)),
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
    const rotate = setInterval(() => alive && setTip((value) => (value + 1) % TIPS.length), TIP_MS);
    const connection = () => setOffline(navigator.onLine === false);
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      clearInterval(rotate);
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

  const fill = Math.max(0, BAR.width * shown);
  return (
    <div className={`boot-screen${leaving ? ' boot-screen--leaving' : ''}`}>
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <defs>
          <filter id="boot-glow" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation={14} />
          </filter>
          <pattern id="boot-stripes" width={24} height={24} patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
            <rect width={10} height={24} fill={PALETTE.ink} opacity={0.16} />
          </pattern>
          <clipPath id="boot-bar-clip"><polygon points={slanted(BAR.x, BAR.y, BAR.width, BAR.height, BAR.slant)} /></clipPath>
          <clipPath id="boot-ribbon-clip"><rect x={0} y={RIBBON_Y - 62} width={1280} height={124} /></clipPath>
        </defs>
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />

        {/* Emblema atras do titulo: losango escuro com aro amarelo e aneis girando. */}
        <g className="boot-emblem">
          <circle className="boot-ring" cx={640} cy={222} r={250} fill="none" stroke={PALETTE.textPrimary} strokeWidth={4} strokeDasharray="4 22" opacity={0.35} />
          <circle className="boot-ring boot-ring--back" cx={640} cy={222} r={212} fill="none" stroke={PALETTE.fieldYellow} strokeWidth={3} strokeDasharray="60 30 8 30" opacity={0.5} />
          <polygon points={toPoints(diamond([640, 222], 178))} fill={PALETTE.ink} opacity={0.72} />
          <polygon points={toPoints(diamond([640, 222], 178))} fill="none" stroke={PALETTE.fieldYellow} strokeWidth={6} />
          <polygon points={toPoints(diamond([640, 222], 162))} fill="none" stroke={PALETTE.textPrimary} strokeWidth={2} opacity={0.4} />
        </g>

        <g className="boot-slam">
          <g filter="url(#boot-glow)" opacity={0.55}>
            <Label x={640} y={210} size={136} anchor="middle" fill={PALETTE.textPrimary} stroke={0} display>RUPTURA</Label>
          </g>
          <Label x={640} y={210} size={136} anchor="middle" stroke={18} display>RUPTURA</Label>
        </g>
        <g className="boot-slam boot-slam--late">
          <g filter="url(#boot-glow)" opacity={0.6}>
            <Label x={640} y={320} size={114} anchor="middle" fill={PALETTE.fieldYellow} stroke={0} display>ARENA</Label>
          </g>
          <Label x={640} y={320} size={114} anchor="middle" fill={PALETTE.fieldYellow} stroke={16} display>ARENA</Label>
        </g>

        {/* Elenco passando: entra quando os retratos ja carregaram. */}
        {portraits && <g className="boot-ribbon-in">
          <rect x={0} y={RIBBON_Y - 62} width={1280} height={124} fill={PALETTE.ink} opacity={0.82} />
          <rect x={0} y={RIBBON_Y - 64} width={1280} height={5} fill={PALETTE.fieldYellow} />
          <rect x={0} y={RIBBON_Y + 59} width={1280} height={5} fill={PALETTE.fieldYellow} />
          <g clipPath="url(#boot-ribbon-clip)">
            <g className="boot-ribbon" style={{ '--period': `${-ROSTER.length * ROSTER_STEP}px` }}>
              {[0, 1].map((copy) => ROSTER.map((entry, index) => (
                <PortraitCell
                  key={`${copy}-${entry.id}`} id={`boot-${copy}-${entry.id}`}
                  at={[60 + (copy * ROSTER.length + index) * ROSTER_STEP, RIBBON_Y]}
                  image={`${entry.dir}/${entry.portrait}`}
                />
              )))}
            </g>
          </g>
        </g>}

        <Label x={BAR.x} y={BAR.y - 14} size={28} weight={800} fill={ready ? PALETTE.fieldYellow : PALETTE.textPrimary} stroke={6}>
          {status}
        </Label>
        <Label x={BAR.x + BAR.width + BAR.slant} y={BAR.y - 14} size={28} weight={900} anchor="end" fill={PALETTE.fieldYellow} stroke={6}>
          {`${Math.round(shown * 100)}%`}
        </Label>
        <polygon points={slanted(BAR.x, BAR.y, BAR.width, BAR.height, BAR.slant)} fill={PALETTE.ink} stroke={PALETTE.textPrimary} strokeWidth={3} />
        <g clipPath="url(#boot-bar-clip)">
          <rect className="boot-bar" x={BAR.x} y={BAR.y} width={fill + BAR.slant} height={BAR.height} fill={PALETTE.fieldYellow} />
          <g className="boot-stripes">
            <rect x={BAR.x - 48} y={BAR.y} width={fill + BAR.slant + 48} height={BAR.height} fill="url(#boot-stripes)" />
          </g>
          <rect x={BAR.x} y={BAR.y} width={BAR.width + BAR.slant} height={6} fill="#fff" opacity={0.28} />
        </g>

        <g key={tip} className="boot-tip">
          <Label x={640} y={666} size={22} weight={700} anchor="middle" stroke={5}>
            <tspan fill={PALETTE.fieldYellow}>DICA · </tspan>{TIPS[tip]}
          </Label>
        </g>

        {slow && !ready && (
          <Capsule x={1240} y={36} width={520} size={22} align="end">
            {offline ? 'SEM INTERNET · VERIFIQUE A CONEXAO' : 'DEMORANDO MAIS QUE O NORMAL · CONEXAO LENTA'}
          </Capsule>
        )}
        {updated && (
          <g className="boot-updated">
            <Capsule x={40} y={36} width={310} size={26}>VERSAO NOVA INSTALADA</Capsule>
          </g>
        )}
        <Label x={40} y={704} size={20} weight={700} stroke={5}>
          {`VERSAO ${BUILD_ID}${BUILD_DATE ? ` · ${BUILD_DATE}` : ''}`}
        </Label>
        {slow && !ready && <KeyHints x={1240} y={704} align="end" items={[{ keys: 'ENTER', text: 'ENTRAR ASSIM MESMO' }]} />}
      </svg>
      {slow && !ready && <button type="button" className="boot-skip" tabIndex={-1} onClick={onReady} aria-label="Entrar assim mesmo" />}
    </div>
  );
}
