import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MenuContext } from './MenuContext.js';
import { pathFor, screenFor } from '../routes.js';

// Navegacao entre telas sobre o React Router: cada tela tem uma URL (src/routes.js),
// o botao voltar do navegador funciona, e as telas continuam usando as mesmas
// tres funcoes de sempre, sem saber que existe uma URL.
export function MenuProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  // Pra onde voltar depois de um login pedido no meio de outro fluxo (ex.:
  // VERSUS PLAYER exige o jogador 1 logado): quem manda pra 'login' guarda
  // aqui a tela de destino; a LoginScreen le e limpa ao terminar.
  const [afterLogin, setAfterLogin] = useState(null);

  // Endereco que nao existe: nenhuma tela (a pagina 404 cuida dele).
  const screen = screenFor(location.pathname);
  // O Router guarda a posicao no historico: acima de 0 ha para onde voltar
  // dentro do jogo.
  const canGoBack = (window.history.state?.idx ?? 0) > 0;

  // replace: a nova tela substitui a atual no historico (a luta substitui a
  // tela de versus, senao o botao voltar do navegador reiniciaria a partida).
  const go = useCallback((target, { replace = false } = {}) => {
    navigate(pathFor(target), { replace });
  }, [navigate]);

  const back = useCallback(() => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate('/', { replace: true });
  }, [navigate]);

  // Vai para a tela sem deixar a anterior no historico (fim de partida, sair
  // para o menu): o voltar do navegador nao volta para dentro da partida.
  const resetTo = useCallback((target) => {
    navigate(pathFor(target), { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({ screen, canGoBack, go, back, resetTo, afterLogin, setAfterLogin }),
    [screen, canGoBack, go, back, resetTo, afterLogin],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}
