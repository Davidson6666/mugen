import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

// De quanto em quanto tempo procurar versao nova. Sem isto, o app so
// descobriria ao ser fechado e aberto de novo - e quem deixa o jogo aberto
// nunca veria a atualizacao.
const CHECK_EVERY_MS = 60 * 1000;

// Qual pacote de codigo esta rodando agora nesta aba.
function loadedBundle() {
  return document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute('src') ?? null;
}

// Qual pacote o servidor esta entregando agora. Cada build gera um nome novo
// (o hash no meio), entao nome diferente = versao nova publicada.
async function deployedBundle() {
  const response = await fetch('/index.html', { cache: 'no-store' });
  const html = await response.text();
  return html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1] ?? null;
}

// Aviso de versao nova.
//
// Sao duas deteccoes, de proposito. A do service worker e a "certa", mas ela
// depende do Cache Storage do navegador funcionar - e ja vi maquina onde ele
// simplesmente falha, e ai o service worker nunca instala e nenhuma
// atualizacao chegaria. A comparacao do nome do pacote nao depende de nada
// disso: e so uma busca pelo index.html, entao funciona mesmo com o service
// worker morto.
export default function UpdateBanner() {
  const {
    needRefresh: [swNeedsRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const [newBuild, setNewBuild] = useState(false);

  useEffect(() => {
    // Em desenvolvimento o pacote nao tem hash e o proprio Vite ja recarrega
    // sozinho; isto so faz sentido no jogo publicado.
    if (!import.meta.env.PROD) return undefined;
    const running = loadedBundle();
    if (!running) return undefined;

    let cancelled = false;
    const check = async () => {
      try {
        const deployed = await deployedBundle();
        if (!cancelled && deployed && deployed !== running) setNewBuild(true);
      } catch {
        // Sem internet agora: tenta de novo no proximo intervalo.
      }
    };
    const timer = setInterval(check, CHECK_EVERY_MS);
    check();
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  if (!swNeedsRefresh && !newBuild) return null;

  const apply = () => {
    // Com o service worker vivo, e ele quem troca a versao e recarrega; sem
    // ele, recarregar a pagina ja basta (o navegador revalida o index.html).
    if (swNeedsRefresh) updateServiceWorker(true);
    else window.location.reload();
  };

  return (
    <button
      type="button"
      className="update-button"
      // Fora da navegacao por teclado: Espaco/Enter sao botoes do jogo e nao
      // podem apertar este botao sem querer.
      tabIndex={-1}
      onMouseDown={(event) => event.preventDefault()}
      onClick={apply}
      title="Uma versao nova do jogo esta pronta"
    >
      NOVA VERSAO · ATUALIZAR
    </button>
  );
}
