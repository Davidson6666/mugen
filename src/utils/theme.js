// Cor de cada contexto do jogo: o amarelo (moldura, capsulas, destaque) e a tinta
// preta ficam sempre; so os dois campos de cor mudam, para o jogador saber em que
// modo esta sem ler nada.
export const THEMES = {
  // Partida avulsa e menus gerais: o laranja e azul de sempre.
  versus: { a: '#F53C17', aDark: '#B81E10', aLight: '#FF5A33', b: '#1F4FD1', bLight: '#2B5FE0' },
  // Modo Historia e conquistas: violeta e carmesim, tom de campanha.
  story: { a: '#7A2BD9', aDark: '#46128F', aLight: '#9650F0', b: '#C4224F', bLight: '#DE4670' },
  // Treino: verde e aco, calmo, sem placar.
  training: { a: '#14A25A', aDark: '#0B6A3A', aLight: '#2DC47A', b: '#2B4A68', bLight: '#3C6389' },
  // Online, ranking e login: ciano e azul-marinho, de rede.
  online: { a: '#0EB4D8', aDark: '#087C98', aLight: '#38CDEA', b: '#1A2D8C', bLight: '#2B45B0' },
};

const BY_SCREEN = {
  leaderboard: 'online',
  login: 'online',
  matchmaking: 'online',
  achievements: 'story',
  storyEnding: 'story',
};

const BY_MODE = { story: 'story', training: 'training', online: 'online' };

// Telas de fluxo de partida seguem o modo; as soltas tem a propria cor.
export function themeFor(screen, mode) {
  if (BY_SCREEN[screen]) return THEMES[BY_SCREEN[screen]];
  const inFlow = ['characterSelect', 'stageSelect', 'versus', 'result'].includes(screen);
  return THEMES[(inFlow && BY_MODE[mode]) || 'versus'];
}
