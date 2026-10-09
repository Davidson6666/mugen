import { useLayoutEffect, useRef, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';

// Cortina diagonal a cada troca de tela: a tela nova ja esta montada, mas a
// cortina preta (com uma ponta amarela, como as faixas dos menus) comeca
// cobrindo tudo e varre para o lado, descobrindo a tela. Entra no
// useLayoutEffect para a tela nova nunca aparecer inteira por um quadro antes.
export default function ScreenTransition() {
  const { screen } = useMenu();
  const previous = useRef(screen);
  const [wipe, setWipe] = useState(0);

  useLayoutEffect(() => {
    if (previous.current === screen) return;
    previous.current = screen;
    setWipe((count) => count + 1);
  }, [screen]);

  if (wipe === 0) return null;
  return (
    <div key={wipe} className="wipe" aria-hidden="true">
      <div className="wipe__edge" />
      <div className="wipe__panel" />
    </div>
  );
}
