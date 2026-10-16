// Frase de vitoria de cada lutador, mostrada na tela de resultado (uma
// sorteada a cada vitoria). Frases proprias do jogo, no jeito de cada
// personagem, e curtas para caber numa linha.
export const VICTORY_QUOTES = {
  dante: ['Isso foi só o aquecimento. Cadê a festa?', 'Estilo também conta ponto, sabia?', 'Volta quando tiver mais graça.'],
  escanor: ['O sol está no alto. Ninguém me alcança.', 'Orgulho não é defeito quando se vence.', 'Ajoelhe-se diante do meio-dia.'],
  humberto: ['Reação concluída. Sobrou só o resíduo.', 'Tá na tabela periódica: eu ganho.', 'Six... seven! Próximo!'],
  itachi: ['Você vê só o que eu deixo você ver.', 'Ainda falta muito para você.', 'Abra os olhos. De verdade.'],
  reze: ['Bum. Simples assim.', 'Foi divertido enquanto durou.', 'Quer outra explosão?'],
  unohana: ['Fique quieto. Eu cuido dos ferimentos.', 'Uma boa luta também cura a alma.', 'Não se preocupe, vai doer só um pouco.'],
  aizen: ['Tudo correu como eu planejei.', 'Você nunca esteve no controle.', 'Desde o começo, essa luta era minha.'],
  gojo: ['Relaxa. Nem precisei tirar a venda.', 'Infinito demais pra você.', 'Foi mal, eu sou forte demais.'],
  sukuna: ['Você é só um inseto diante de mim.', 'Que tédio. Ninguém aqui me diverte?', 'Ajoelhe-se perante o rei.'],
  miku: ['Obrigada pela plateia!', 'Essa vitória tem ritmo!', 'Mais um bis?'],
  pikachu: ['Pika pika!', 'Pikachu!', 'Pi-ka-chuuu!'],
  killua: ['Rápido demais pra você, né?', 'Nem suei.', 'Volta quando treinar mais.'],
  goku: ['Que luta incrível! Vamos de novo?', 'Você é forte! Bora treinar junto!', 'Lutei tanto que fiquei com fome.'],
  tanjiro: ['Desculpa, mas eu não podia perder.', 'Respire fundo e levante. Você consegue.', 'Senti o cheiro da sua abertura.'],
  zenitsu: ['Eu ganhei?! Sério?! EU?!', 'Eu estava dormindo, não lembro de nada.', 'Nunca mais me assusta assim!'],
  nezuko: ['Mmm! Mmmm!', 'Hmm-hmm!', 'Mmmh! Mm-mm!'],
  chunli: ['Treino todo dia. Deu pra perceber?', 'Essas pernas não perdoam.', 'Caso encerrado.'],
  ensina_god: ['Compilou sem erro. Você não.', 'Prova surpresa: você reprovou.', 'Sem Ctrl+Z pra essa derrota.'],
};

export function pickVictoryQuote(id, random = Math.random) {
  const quotes = VICTORY_QUOTES[id];
  if (!quotes?.length) return null;
  return quotes[Math.floor(random() * quotes.length)];
}
