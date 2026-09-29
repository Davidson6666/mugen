import { useCallback, useMemo, useState } from 'react';
import { MenuContext } from './MenuContext.js';

// Navegacao entre telas com pilha de historico, para "voltar" funcionar em
// qualquer ponto do fluxo sem cada tela precisar saber de onde veio.
export function MenuProvider({ children }) {
  const [history, setHistory] = useState(['mainMenu']);
  // Pra onde voltar depois de um login pedido no meio de outro fluxo (ex.:
  // VERSUS PLAYER exige o jogador 1 logado): quem manda pra 'login' guarda
  // aqui a tela de destino; a LoginScreen le e limpa ao terminar.
  const [afterLogin, setAfterLogin] = useState(null);

  const go = useCallback((screen) => {
    setHistory((current) => [...current, screen]);
  }, []);

  const back = useCallback(() => {
    setHistory((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }, []);

  const resetTo = useCallback((screen) => {
    setHistory([screen]);
  }, []);

  const value = useMemo(
    () => ({ screen: history.at(-1), canGoBack: history.length > 1, go, back, resetTo, afterLogin, setAfterLogin }),
    [history, go, back, resetTo, afterLogin],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}
