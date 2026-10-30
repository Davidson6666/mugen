// Rotas do jogo: cada tela tem um endereco proprio. O resto do codigo continua
// falando em "tela" (go('versus'), resetTo('mainMenu')...); esta tabela traduz
// a tela para a URL e de volta, e e o unico lugar que conhece os dois.
//
// guard: o que a tela precisa para abrir. Sem isso (por exemplo, quem digita
// /luta na barra de enderecos, sem ter escolhido lutador) volta ao menu.
//   'setup'  -> um modo de jogo ja escolhido
//   'result' -> uma partida que acabou
//   'auth'   -> conta logada (area protegida)
export const ROUTES = [
  { screen: 'mainMenu', path: '/' },
  { screen: 'characterSelect', path: '/personagem', guard: 'setup' },
  { screen: 'stageSelect', path: '/cenario', guard: 'setup' },
  { screen: 'versus', path: '/versus', guard: 'setup' },
  { screen: 'battle', path: '/luta', guard: 'setup' },
  { screen: 'result', path: '/resultado', guard: 'result' },
  { screen: 'storyEnding', path: '/final', guard: 'result' },
  { screen: 'matchmaking', path: '/fila', guard: 'setup' },
  { screen: 'leaderboard', path: '/ranking' },
  { screen: 'achievements', path: '/conquistas' },
  { screen: 'settings', path: '/configuracoes' },
  { screen: 'login', path: '/login' },
  { screen: 'register', path: '/cadastro' },
  { screen: 'account', path: '/conta', guard: 'auth' },
];

const byScreen = new Map(ROUTES.map((route) => [route.screen, route]));

export function pathFor(screen) {
  return byScreen.get(screen)?.path ?? '/';
}

// Tela de uma URL, ou null se o endereco nao existe (vira a pagina 404).
export function screenFor(pathname) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return ROUTES.find((route) => route.path === clean)?.screen ?? null;
}

export function guardFor(screen) {
  return byScreen.get(screen)?.guard ?? null;
}
