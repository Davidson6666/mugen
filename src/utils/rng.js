// Sorteio deterministico: a mesma semente sempre da a mesma sequencia de
// numeros. Math.random() nao serve pro que a partida online precisa, porque
// cada computador sortearia uma coisa (o golpe sorteado do Hatsune, o
// espalhamento de um efeito, a esquiva do corvo) e as duas simulacoes
// separariam na hora.
//
// O algoritmo e o mulberry32: curto, rapido e bom o bastante pra jogo - nao
// serve pra nada que dependa de sorteio imprevisivel de verdade.
export function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Semente pra uma partida local, onde ninguem precisa combinar nada: o unico
// requisito e ser diferente a cada partida. Numa partida online a semente vem
// do servidor, igual pros dois lados.
export function randomSeed() {
  return Math.floor(Math.random() * 2147483647);
}
