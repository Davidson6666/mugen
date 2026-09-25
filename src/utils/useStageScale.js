import { useEffect, useState } from 'react';

// Escala do palco na tela cheia: o palco do jogo tem
// tamanho fixo (1280x720); em tela cheia ele e ampliado para caber na tela,
// sem distorcer (App.css, --stage-scale).
const STAGE_WIDTH = 1280;
const STAGE_HEIGHT = 720;

export function useStageScale() {
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const update = () => {
      const active = Boolean(document.fullscreenElement);
      setFullscreen(active);
      setScale(active ? Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT) : 1);
    };
    document.addEventListener('fullscreenchange', update);
    window.addEventListener('resize', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return { fullscreen, scale };
}
