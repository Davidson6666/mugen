// Modo Historia: a escada e fixa, igual toda vez (como o modo historia de um
// Mortal Kombat). O jogador so escolhe o proprio personagem - adversario,
// cenario e dificuldade de cada luta ja vem daqui, e por isso a tela de
// escolha de cenario fica de fora desse modo.
//
// A ordem sobe de proposito: comeca com quem bate leve, passa pelos tecnicos,
// e fecha com o Ensina GOD na Sala do Trono. Ele e forte de proposito, entao
// serve de muro final sem precisar de nenhum ajuste de equilibrio.
//
// Os seis cenarios do jogo entram um em cada luta, na ordem, pra campanha
// nunca repetir paisagem.
export const STORY_LADDER = [
  { opponentId: 'pikachu', mapId: 'map_01', difficulty: 'easy' },
  { opponentId: 'nezuko', mapId: 'map_02', difficulty: 'easy' },
  { opponentId: 'chunli', mapId: 'map_03', difficulty: 'normal' },
  { opponentId: 'itachi', mapId: 'map_04', difficulty: 'normal' },
  { opponentId: 'gojo', mapId: 'map_05', difficulty: 'hard' },
  { opponentId: 'ensina_god', mapId: 'throneroom', difficulty: 'hard' },
];
