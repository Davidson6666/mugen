// As conquistas que existem. O id e o que fica gravado no banco; nome e
// descricao sao so o que aparece na tela, entao da pra reescrever sem perder
// o que as contas ja ganharam.
//
// "unlocks" liga a conquista a um personagem travado: vencer o Modo Historia
// (ou seja, derrotar o Ensina GOD) e o que libera ele para uso.
export const ACHIEVEMENTS = [
  {
    id: 'story_champion',
    name: 'CAMPEAO DA HISTORIA',
    description: 'VENCEU O MODO HISTORIA E DERROTOU O ENSINA GOD',
    unlocks: 'ensina_god',
  },
  {
    id: 'first_win',
    name: 'PRIMEIRA VITORIA',
    description: 'GANHOU A PRIMEIRA PARTIDA',
  },
  {
    id: 'flawless',
    name: 'SEM SUSTO',
    description: 'GANHOU UMA PARTIDA POR 2 A 0',
  },
  {
    id: 'online_debut',
    name: 'ESTREIA ONLINE',
    description: 'JOGOU A PRIMEIRA PARTIDA CONTRA OUTRA PESSOA',
  },
  {
    id: 'online_win',
    name: 'SANGUE NOS OLHOS',
    description: 'GANHOU UMA PARTIDA ONLINE',
  },
  {
    id: 'five_characters',
    name: 'CURIOSO',
    description: 'VENCEU COM CINCO PERSONAGENS DIFERENTES',
  },
  {
    id: 'untouched',
    name: 'IMPECAVEL',
    description: 'GANHOU UMA PARTIDA SEM LEVAR UM UNICO GOLPE',
  },
  {
    id: 'comeback',
    name: 'VIRADA',
    description: 'VENCEU UM ROUND COM MENOS DE 10% DE VIDA',
  },
  {
    id: 'combo_15',
    name: 'MAQUINA DE COMBO',
    description: 'ACERTOU UM COMBO DE 15 GOLPES',
  },
  {
    id: 'all_characters',
    name: 'ELENCO COMPLETO',
    description: 'VENCEU COM TODOS OS PERSONAGENS DO JOGO',
  },
];

export const achievementById = (id) => ACHIEVEMENTS.find((entry) => entry.id === id) ?? null;

// Qual conquista libera cada personagem travado.
export const UNLOCKED_BY = Object.fromEntries(
  ACHIEVEMENTS.filter((entry) => entry.unlocks).map((entry) => [entry.unlocks, entry.id]),
);
