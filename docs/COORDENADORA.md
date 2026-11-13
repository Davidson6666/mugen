# Flavia (Coordenadora)

Professora de matemática e coordenadora do curso técnico, baseada nas fotos
fornecidas pelo usuário. Mantém o cabelo cacheado com mechas claras, o casaco
preto comprido, a blusa preta, a calça rosa e os sapatos pretos. Seu nome de exibição é Flavia.

São 100 poses próprias, 56 animações, cinco atlas WebP de personagem sem perda,
três atlas de efeitos, um cenário de tribunal, retrato e onze sons sintéticos. Os originais
ficam em `assets-src/coordenadora/`. Reconstrução:

```sh
npm run assets:coordenadora
```

## Movimentos

- Parada, caminhada para frente e para trás, virar, agachar e levantar.
- Pulo vertical, para frente e para trás; pulo duplo e aterrissagem.
- Dash e recuo rápido no chão e no ar.
- Defesa em pé e agachada, com saída da guarda.
- Soco, cruzado, uppercut, chute, rasteira, ataques agachados e no ar.
- Combos de soco, chute e sequência mista, continuando somente ao conectar.
- Arremesso com poses próprias de agarrar e jogar.
- Reações a golpes em pé, agachada e no ar; lançamento, queda, levantar e K.O.
- Poses de vitória e derrota.

## Especiais

Direções relativas à lutadora olhando para a direita; os comandos são
espelhados automaticamente do outro lado. P = soco; K = chute; S = especial.
A lista de golpes na pausa mostra o mapeamento de cada jogador.

| Golpe | Comando | Comportamento |
| --- | --- | --- |
| Equação Direta | S ou ↓→P | Símbolo de pi dourado em linha reta |
| Parábola | ↓ + S | Projétil verde em arco, sujeito à gravidade, que derruba |
| Plano Cartesiano | ← + S | Barreira geométrica que intercepta projéteis, sem causar dano |
| Conselho de Classe | ↓→S ou → + S | Marca o local do adversário e aplica até três impactos após o aviso |
| Espada do Carrasco | ↓←S | Lâmina de luz gigante com corte pesado que derruba |
| Tribunal da Coordenação | ↓↓S | Domínio inspirado no Higuruma: duas advertências e julgamento com possibilidade de expulsão |

O Conselho de Classe permite defesa e esquiva: a área fica parada no local
marcado. Não acompanha o adversário nem garante acerto. Possui recarga de
10 segundos e dois usos por round.

## Espada do Carrasco

Ataque inspirado na espada de luz do Higuruma, com 12 poses próprias: invocação,
lâmina fina de luz amarela e guarda de pontas em forma de estrela, preparação acima da cabeça, corte, recuperação
e dissolução. A área dos quadros foi ampliada para mostrar a arma inteira,
preservando a escala do corpo, o chão e as caixas dos movimentos anteriores.

Comando: **↓← + S** (jogador 1 olhando para a direita: **S, A + L**).
O movimento é espelhado do outro lado e consta na lista de golpes da pausa.
A preparação dura 26 ticks; a janela do corte vai dos ticks 26 a 37, com
um único acerto e derrubada. O dano base é 24, escalado pelo Rigor Crescente:
14,4 no início do round e 43,2 com a passiva no máximo, antes do balanceamento
e da redução por combos. Pode ser defendido, interrompido ou evitado com recuo.
A recarga é de 180 ticks (3 segundos), sem limite de usos por round.
O corte tem rastro de luz e dois sons próprios. Não concede a expulsão do domínio.

## Expansão de domínio

O Tribunal da Coordenação tem poses próprias de conjuração, martelo e sentença,
um juiz espectral com balança, cenário de tribunal, carimbos de advertência e
sons de julgamento. No teclado padrão do jogador 1, faça **baixo, baixo + L**.
O comando também aparece na lista de golpes da pausa, com as teclas de cada jogador.

A preparação pode ser interrompida nos primeiros 24 ticks (0,4 segundo).
Depois, a coordenadora e o alvo são posicionados no tribunal e o adversário
fica impedido de agir durante o julgamento. São dadas duas advertências de
dano não letal. No tick 112, o veredito verifica a vida restante do alvo:

- Até 30%: carimbo **EXPULSO**, K.O. e saída animada da arena.
- Acima de 30%: advertência final com dano, seguida da retomada da luta.

Há uma tentativa por round, consumida mesmo se a preparação for interrompida.
O alvo é solto se o julgamento for interrompido por outro acerto garantido.
No treino, o finalizador respeita a vida mínima do boneco. Todos os efeitos e
a expulsão são restaurados ao começar outro round.

## Passiva: Rigor Crescente

O dano começa em **60%** do valor normal e cresce continuamente com a vida
perdida por golpes e pela guarda, até **180%** após receber dano equivalente a
80% da vida máxima. Com os 100 pontos de vida atuais:

| Dano acumulado recebido | Multiplicador de dano |
| --- | --- |
| 0 | ×0,60 |
| 20 | ×0,90 |
| 40 | ×1,20 |
| 60 | ×1,50 |
| 80 ou mais | ×1,80 |

A passiva afeta golpes físicos e efeitos dos especiais e se combina com o
balanceamento do personagem. A expulsão continua sendo um finalizador. Cura
não remove o acúmulo; o início de cada round restaura o multiplicador inicial.
O indicador **RIGOR** no HUD mostra o multiplicador e a progressão em tempo real.

A lutadora está liberada nos modos normais do elenco. O modo História preserva
sua escada fixa e as regras do chefe Ensina GOD.
