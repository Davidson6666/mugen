import { useCallback, useEffect, useRef, useState } from 'react';
import GameCanvas from './GameCanvas.jsx';
import MoveList from './MoveList.jsx';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { PALETTE } from '../utils/palette.js';
import { Label, MenuOption } from './cvs2.jsx';

const PAUSE_KEYS = ['Escape', 'ShiftLeft', 'ShiftRight'];
const PAUSE_OPTIONS = [
  { id: 'resume', label: 'CONTINUAR' },
  { id: 'moves', label: 'LISTA DE GOLPES' },
  { id: 'quit', label: 'SAIR PARA O MENU' },
];

export default function Battle() {
  const { resetTo } = useMenu();
  const { setup, finishMatch } = useGame();
  const [paused, setPaused] = useState(false);
  const [pauseIndex, setPauseIndex] = useState(0);
  // Lista de golpes aberta por cima da pausa, e de qual jogador (0 = 1P).
  const [moveListPlayer, setMoveListPlayer] = useState(null);
  const listOpenRef = useRef(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    listOpenRef.current = moveListPlayer !== null;
  }, [moveListPlayer]);

  // ESC e Shift sao compartilhados: no Versus Player qualquer um dos dois
  // jogadores pausa com a mesma tecla.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (!PAUSE_KEYS.includes(event.code)) return;
      event.preventDefault();
      // Com a lista aberta, ESC so fecha a lista e volta para a pausa.
      if (listOpenRef.current) {
        setMoveListPlayer(null);
        return;
      }
      setPaused((current) => !current);
      setPauseIndex(0);
      setMoveListPlayer(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onMove = (_player, direction) => {
    if (moveListPlayer !== null) {
      if (direction === 'left' || direction === 'right') setMoveListPlayer((current) => 1 - current);
      else scrollRef.current?.scrollBy({ top: direction === 'up' ? -90 : 90, behavior: 'smooth' });
      return;
    }
    if (direction === 'up' || direction === 'down') {
      setPauseIndex((current) => (current + (direction === 'up' ? -1 : 1) + PAUSE_OPTIONS.length)
        % PAUSE_OPTIONS.length);
    }
  };

  const onConfirm = (index = pauseIndex) => {
    if (moveListPlayer !== null) return;
    const option = PAUSE_OPTIONS[index].id;
    if (option === 'resume') setPaused(false);
    else if (option === 'moves') setMoveListPlayer(0);
    else resetTo('mainMenu');
  };

  const onCancel = () => {
    if (moveListPlayer !== null) setMoveListPlayer(null);
  };

  // O cancelar do menu (K) so fecha a lista de golpes: ESC ja e tratado pelo
  // listener de pausa acima, e os dois juntos alternariam a pausa duas vezes.
  useMenuInput({ onMove, onConfirm: () => onConfirm(), onCancel }, paused);

  const handleMatchEnd = useCallback((result) => {
    finishMatch(result);
    resetTo('result');
  }, [finishMatch, resetTo]);

  return (
    <div className="screen screen--battle">
      <GameCanvas setup={setup} paused={paused} onMatchEnd={handleMatchEnd} />

      {paused && (
        // Pausa no padrao dos anuncios do HUD: luta escurecida e faixa amarela.
        <div className="cvs2-screen cvs2-screen--overlay">
          {moveListPlayer === null && <svg className="cvs2-svg" viewBox="0 0 1280 720">
            <rect width={1280} height={720} fill={PALETTE.ink} opacity={0.6} />
            <rect x={-10} y={200} width={1300} height={130} fill={PALETTE.fieldYellow} stroke={PALETTE.ink} strokeWidth={8} />
            <Label x={640} y={305} size={120} anchor="middle" stroke={14}>PAUSA</Label>
            {PAUSE_OPTIONS.map((option, index) => (
              <MenuOption
                key={option.id}
                x={440 - index * 18} y={380 + index * 72} width={400}
                label={option.label}
                active={index === pauseIndex}
                onPointerEnter={() => setPauseIndex(index)}
                onClick={() => onConfirm(index)}
              />
            ))}
            <Label x={640} y={640} size={24} weight={600} anchor="middle" stroke={5}>ESC OU SHIFT RETOMA</Label>
          </svg>}
          {moveListPlayer !== null && (
            <MoveList characterIds={setup.characters} player={moveListPlayer} scrollRef={scrollRef} />
          )}
        </div>
      )}
    </div>
  );
}
