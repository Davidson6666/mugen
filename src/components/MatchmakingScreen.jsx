import { useEffect, useRef, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { findMatch, leaveQueue, fetchProfileById, exchangePicks, markMatchStarted } from '../utils/matchmaking.js';
import { PALETTE } from '../utils/palette.js';
import maps from '../data/maps.json';
import { Capsule, DiagonalBackdrop, KeyHints, Label, Shape } from './cvs2.jsx';
import { diamond } from '../utils/hudGeometry.js';
import { toPoints } from '../utils/cvs2Layout.js';

const POLL_MS = 2000;
// Depois que os dois ja sabem a escolha um do outro, o canal fica no ar mais
// um instante: o outro lado pode estar recebendo a minha mensagem agora.
const HANDSHAKE_GRACE_MS = 900;

// Fila de partida online. Entra na fila, espera formar par, combina com o
// adversario qual personagem cada um escolheu e entao os dois montam
// exatamente a mesma partida (mesma ordem de personagens, mesmo cenario,
// mesma semente) antes de cair na luta.
export default function MatchmakingScreen() {
  const { back, resetTo } = useMenu();
  const { setup, startOnlineMatch } = useGame();
  const { profile, loading } = useAuth();
  const myId = profile?.id;
  const myCharacter = setup.characters[0];

  const [status, setStatus] = useState('searching');
  const [opponent, setOpponent] = useState(null);
  const [error, setError] = useState(null);
  const [seconds, setSeconds] = useState(0);
  // O setup montado fica aqui ate a carencia do aperto de mao passar.
  const startRef = useRef(null);

  useMenuInput({ onCancel: back });

  useEffect(() => {
    if (status !== 'searching') return undefined;
    const timer = setInterval(() => setSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (loading || !myId || !myCharacter) return undefined;

    let cancelled = false;
    let timer = 0;
    let stopExchange = null;
    let graceTimer = 0;

    const beginMatch = (match, opponentPick, opponentProfile) => {
      const iAmPlayer1 = match.player1_id === myId;
      const characters = iAmPlayer1 ? [myCharacter, opponentPick] : [opponentPick, myCharacter];
      const seed = Number(match.seed);
      startRef.current = {
        characters,
        // Cenario sorteado pela semente: os dois caem no mesmo sem precisar
        // combinar nada.
        mapId: maps[seed % maps.length].id,
        matchId: match.id,
        seed,
        localPlayerIndex: iAmPlayer1 ? 0 : 1,
        opponentName: opponentProfile?.username ?? 'ADVERSARIO',
        playerIds: [match.player1_id, match.player2_id],
      };
      markMatchStarted(match.id);
      graceTimer = setTimeout(() => {
        if (cancelled) return;
        stopExchange?.();
        startOnlineMatch(startRef.current);
        resetTo('versus');
      }, HANDSHAKE_GRACE_MS);
    };

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
      setStatus('pairing');

      stopExchange = exchangePicks({
        matchId: match.id,
        userId: myId,
        characterId: myCharacter,
        onOpponentPick: (characterId) => {
          if (cancelled || startRef.current) return;
          beginMatch(match, characterId, other);
        },
      });
    };

    tick();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(graceTimer);
      stopExchange?.();
      // Sair da tela (ou fechar o jogo) tira da fila: ninguem fica esperando
      // por alguem que nao esta mais na frente do computador.
      leaveQueue();
    };
  }, [loading, myId, myCharacter, startOnlineMatch, resetTo]);

  const dots = '.'.repeat(seconds % 4);
  // Estar deslogado ou sem personagem aqui e so um caso de tela, nao um estado
  // que precisa virar setState (o menu ja exige as duas coisas antes).
  const missing = !loading && (!myId || !myCharacter);
  const shownStatus = missing ? 'error' : status;
  const shownError = missing ? 'Escolha um personagem e entre na conta antes.' : error;

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />
        <Label x={48} y={130} size={90} display>PARTIDA ONLINE</Label>

        {shownStatus === 'searching' && (
          <g>
            {/* Radar: tres aneis que crescem e somem, e o losango da conta no meio. */}
            <g pointerEvents="none">
              {[0, 1, 2].map((ring) => (
                <polygon
                  key={ring} className="radar-ring" style={{ animationDelay: `${ring * 0.9}s` }}
                  points={toPoints(diamond([640, 300], 90))} fill="none" stroke={PALETTE.fieldYellow} strokeWidth={5}
                />
              ))}
              <polygon points={toPoints(diamond([640, 300], 58))} fill={PALETTE.fieldYellow} stroke={PALETTE.ink} strokeWidth={6} />
              <Label x={640} y={322} size={64} anchor="middle" fill={PALETTE.ink} stroke={0}>?</Label>
            </g>
            <Label x={640} y={470} size={46} anchor="middle" fill={PALETTE.fieldYellow} stroke={9} display>
              {`PROCURANDO${dots}`}
            </Label>
            <Label x={640} y={520} size={30} anchor="middle" stroke={6}>
              {`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} NA FILA`}
            </Label>
          </g>
        )}

        {shownStatus === 'pairing' && (
          <g>
            <Label x={640} y={300} size={56} anchor="middle" fill={PALETTE.fieldYellow} stroke={10}>
              ADVERSARIO ENCONTRADO!
            </Label>
            <Label x={640} y={400} size={90} anchor="middle" stroke={14}>
              {(opponent?.username ?? '???').toUpperCase()}
            </Label>
            <Capsule x={490} y={432} width={300} size={32}>
              {`ELO ${opponent?.elo_rating ?? '?'}`}
            </Capsule>
            <Label x={640} y={560} size={28} weight={800} anchor="middle" stroke={6}>
              COMBINANDO OS PERSONAGENS...
            </Label>
          </g>
        )}

        {shownStatus === 'error' && (
          <g>
            <Shape points={diamond([640, 290], 66)} fill={PALETTE.lifeTrail} />
            <Label x={640} y={318} size={80} anchor="middle" stroke={0}>!</Label>
            <Capsule x={290} y={390} width={700} size={32}>{shownError}</Capsule>
          </g>
        )}

        {profile && (
          <Capsule x={40} y={640} width={420} size={28}>
            {`VOCE · ${profile.username.toUpperCase()} · ELO ${profile.elo_rating}`}
          </Capsule>
        )}

        <KeyHints x={1240} y={702} align="end" items={[{ keys: 'K/ESC', text: 'CANCELA' }]} />
      </svg>
    </div>
  );
}
