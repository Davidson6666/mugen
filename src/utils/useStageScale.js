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

  useEffect(() => {
    // No app instalado (janela propria, sem abas/barra de endereco) nao tem
    // mais botao de tela cheia - entao pede tela cheia sozinho assim que o
    // jogador tocar em algo. O navegador exige um gesto real do usuario pra
    // isso (nao rola pedir isso ja no carregamento da pagina), entao usa o
    // primeiro clique/tecla como esse gesto.
    const installed = window.matchMedia?.('(display-mode: standalone)').matches
      || window.matchMedia?.('(display-mode: fullscreen)').matches;
    if (!installed || document.fullscreenElement) return;

    const requestOnce = () => {
      document.documentElement.requestFullscreen?.().catch(() => {});
      window.removeEventListener('keydown', requestOnce);
      window.removeEventListener('pointerdown', requestOnce);
    };
    window.addEventListener('keydown', requestOnce);
    window.addEventListener('pointerdown', requestOnce);
    return () => {
      window.removeEventListener('keydown', requestOnce);
      window.removeEventListener('pointerdown', requestOnce);
    };
  }, []);

  useEffect(() => {
    // Em tela cheia, o Esc normalmente sai da tela cheia - um saco num jogo
    // onde Esc e a tecla de pausa e de voltar. A Keyboard Lock existe pra
    // isso: com ela, o Esc chega no jogo em vez de o navegador engolir. Quem
    // quiser mesmo sair da tela cheia segura o Esc por ~2 segundos.
    //
    // So funciona em navegador baseado em Chromium e em pagina segura
    // (https ou localhost); onde nao houver, o Esc volta a sair da tela
    // cheia como antes, e o jogo continua funcionando igual.
    if (!fullscreen) return undefined;
    navigator.keyboard?.lock?.(['Escape']).catch(() => {});
    return () => navigator.keyboard?.unlock?.();
  }, [fullscreen]);

  return { fullscreen, scale };
}
