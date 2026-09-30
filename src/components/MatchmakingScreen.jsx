import { useEffect, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { findMatch, leaveQueue, fetchProfileById } from '../utils/matchmaking.js';
import { PALETTE } from '../utils/palette.js';
import { Capsule, DiagonalBackdrop, Label } from './cvs2.jsx';

const POLL_MS = 2000;

// Fila de partida online (Fase 2). Entra na fila, fica perguntando de dois em
// dois segundos se ja apareceu adversario, e mostra quem caiu contra voce. A
// partida em si (os dois jogando de verdade) ainda depende das fases de
// motor deterministico e rede.
export default function MatchmakingScreen() {
  const { back } = useMenu();
  const { profile, loading } = useAuth();
  const myId = profile?.id;

  const [status, setStatus] = useState('searching');
  const [opponent, setOpponent] = useState(null);
  const [error, setError] = useState(null);
  const [seconds, setSeconds] = useState(0);

  useMenuInput({ onCancel: back });

  useEffect(() => {
    if (status !== 'searching') return undefined;
    const timer = setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (loading || !myId) return undefined;

    let cancelled = false;
    let timer = 0;

    const tick = async () => {
      const { match, error: rpcError } = await findMatch();
      if (cancelled) return;
      if (rpcError) {
        setError(rpcError);
        setStatus('error');
        return;
      }
      if (!match) {
        timer = setTimeout(tick, POLL_MS);
        return;
      }
      const otherId = match.player1_id === myId ? match.player2_id : match.player1_id;
      const { profile: other } = await fetchProfileById(otherId);
      if (cancelled) return;
      setOpponent(other ?? null);
      setStatus('found');
    };

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      // Sair da tela (ou fechar o jogo) tira da fila: ninguem fica esperando
      // por alguem que nao esta mais na frente do computador.
      leaveQueue();
    };
  }, [loading, myId]);

  const dots = '.'.repeat(seconds % 4);
  // Estar deslogado aqui e so um caso de tela, nao um estado que precisa
  // virar setState (a tela do menu ja exige login antes de chegar aqui).
  const loggedOut = !loading && !myId;
  const shownStatus = loggedOut ? 'error' : status;
  const shownError = loggedOut ? 'Precisa estar logado para procurar partida.' : error;

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />
        <Label x={48} y={130} size={90}>PARTIDA ONLINE</Label>

        {shownStatus === 'searching' && (
          <g>
            <Label x={640} y={330} size={56} anchor="middle" fill={PALETTE.fieldYellow} stroke={10}>
              {`PROCURANDO ADVERSARIO${dots}`}
            </Label>
            <Label x={640} y={392} size={32} anchor="middle" stroke={6}>
              {`${seconds}s NA FILA`}
            </Label>
          </g>
        )}

        {shownStatus === 'found' && (
          <g>
            <Label x={640} y={300} size={56} anchor="middle" fill={PALETTE.fieldYellow} stroke={10}>
              ADVERSARIO ENCONTRADO!
            </Label>
            <Label x={640} y={400} size={90} anchor="middle" stroke={14}>
              {(opponent?.username ?? '???').toUpperCase()}
            </Label>
            <Capsule x={490} y={432} width={300} size={32} align="start">
              {`ELO ${opponent?.elo_rating ?? '?'}`}
            </Capsule>
            <Label x={640} y={560} size={26} weight={800} anchor="middle" stroke={6}>
              A PARTIDA EM SI AINDA NAO RODA: FALTAM AS FASES DE MOTOR E REDE
            </Label>
          </g>
        )}

        {shownStatus === 'error' && (
          <Label x={640} y={350} size={34} anchor="middle" fill={PALETTE.lifeTrail} stroke={8}>
            {shownError}
          </Label>
        )}

        {profile && (
          <Capsule x={40} y={640} width={420} size={28}>
            {`VOCE · ${profile.username.toUpperCase()} · ELO ${profile.elo_rating}`}
          </Capsule>
        )}

        <Label x={1240} y={700} size={22} weight={600} anchor="end" stroke={5}>
          {shownStatus === 'found' ? 'K OU ESC VOLTA' : 'K OU ESC CANCELA'}
        </Label>
      </svg>
    </div>
  );
}
