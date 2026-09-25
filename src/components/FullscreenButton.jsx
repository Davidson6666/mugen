// Botao do canto da janela que liga/desliga a tela cheia (o palco e ampliado
// por useStageScale, em src/utils/useStageScale.js).
export default function FullscreenButton({ fullscreen }) {
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.();
  };

  return (
    <button
      type="button"
      className="fullscreen-button"
      // Fora da navegacao por teclado: Espaco/Enter sao botoes do jogo e nao
      // podem apertar este botao sem querer.
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onClick={toggle}
      title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
    >
      <svg className="fullscreen-button__icon" viewBox="0 0 16 16" aria-hidden="true">
        {/* Quatro cantos: para fora (ampliar) ou para dentro (sair). */}
        <path d={fullscreen
          ? 'M5 1v4H1M11 1v4h4M5 15v-4H1M11 15v-4h4'
          : 'M1 5V1h4M15 5V1h-4M1 11v4h4M15 11v4h-4'}
        />
      </svg>
      {fullscreen ? 'SAIR' : 'TELA CHEIA'}
    </button>
  );
}
