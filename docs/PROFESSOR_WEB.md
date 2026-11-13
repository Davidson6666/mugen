# Professor Web

Lutador original baseado nas fotos fornecidas pelo usuário: camisa azul de
manga comprida, calça cinza, sapato preto e barba escura. O nome de exibição é
provisório até o usuário informar o nome desejado.

São 160 poses de pixel art: 72 normais, 72 da forma Deus da Guerra e 16 de
futebol, com transparência, escala uniforme e atlas WebP sem perda. Inclui
115 animações, retrato, 22 efeitos e 12 sons sintéticos.
Os originais estão em `assets-src/professor-web/`. Para reconstruir os recursos:

```sh
npm run assets:professor-web
```

## Movimentos

- Parado, andar para frente e para trás, virar, agachar e levantar.
- Pulo nas três direções, pulo duplo, queda e aterrissagem.
- Dash e recuo rápido no chão e no ar.
- Defesa em pé e agachada, com animações de saída da guarda.
- Soco, cruzado, uppercut, chute, rasteira e sequência mista.
- Soco agachado, rasteira, soco e chutes no ar.
- Arremesso universal com poses próprias de agarrar e jogar.
- Reações em pé, agachado e no ar; lançamento, queda, levantar e K.O.
- Poses de vitória e derrota.

## Golpes especiais

As direções abaixo consideram o lutador olhando para a direita. São espelhadas
automaticamente quando ele muda de lado.

| Golpe | Comando | Comportamento |
| --- | --- | --- |
| Pacote HTTP | Especial ou ↓→ + soco | Projétil azul de código |
| Firewall | ↓ + especial | Barreira próxima que acerta e intercepta projéteis |
| Deploy Final | ↓→ + especial ou → + especial | Três pacotes, dois usos por round e recarga de 10 segundos |
| Uppercut | → + soco | Lança o adversário para cima |
| Rasteira | ↓ + chute | Derruba o adversário |

## Futebol na forma normal

Os especiais de DW continuam disponíveis. As novas habilidades usam animações
de chute próprias e bolas independentes com rastros de energia e impactos.

| Golpe | Comando | Comportamento |
| --- | --- | --- |
| Chute de potência | → + K ou ↓→K | Bola com energia azul em linha reta |
| Chute com curva | ← + S | Bola azul em arco, sujeita à gravidade |
| Bicicleta | ↓←K | Salta e chuta uma bola dourada; possui aterrissagem própria |
| Golaço | ↓→↓→K | Superchute com bola dourada maior e finalização comemorando |

O Golaço permite dois usos por round e tem recarga de 10 segundos.

## Transformação Deus da Guerra

Ativação: **↓↓S**. No teclado padrão do jogador 1, aperte para baixo duas vezes
e depois o especial (L). A transformação tem uma tentativa por round,
dura 15 segundos e aumenta o dano em 15%. O HUD mostra o comando, o tempo
restante e quando o uso já foi gasto. Não depende de apanhar nem cura vida.
Se for interrompida antes de completar a preparação, não ativa.

A aparência é inspirada no Kratos nórdico: pele pálida, tatuagem vermelha,
armadura de couro, barba e machado. Movimentos, defesa, dano, queda, levantar,
arremesso e vitória usam sprites da forma transformada, sem voltar à camisa
azul no meio dessas ações. Os golpes de futebol e DW ficam na forma normal.

| Golpe | Comando transformado | Comportamento |
| --- | --- | --- |
| Combo de machado | PPP | Dois cortes e machadada final |
| Machadada e rasteira | KK | Corte pesado e varredura baixa |
| Arremesso do Leviatã | S | Machado giratório com retorno visual |
| Impacto Glacial | ↓ + S | Machadada que levanta estilhaços de gelo |
| Lâminas do Caos | → + S | Correntes flamejantes com até três acertos |
| Ascensão do Caos | ← + S | Correntes que lançam o adversário para cima |
| Lâmina do Olimpo | ↓→S | Espada azul com onda de energia; dois usos por round |

A Lâmina do Olimpo tem recarga de 10 segundos. Os golpes respeitam a defesa,
e os efeitos são removidos quando terminam. Ao acabar o tempo, a forma normal
volta automaticamente; a transformação é reiniciada ao começar outro round.

Soco repetido encadeia soco, cruzado e uppercut; chute repetido encadeia chute
e rasteira. Também é possível misturar os dois. As sequências precisam conectar
para continuar. A lista completa aparece na pausa, com os controles do jogador.

O personagem entra nos mesmos modos do elenco normal. Não altera os adversários
fixos da campanha nem o desbloqueio do chefe Ensina GOD.
