# Ajustes necessários no `PARA_CLAUDE_CODE.md`

Dois trechos da seção **Arquivo de Configuração de Personagem** precisam de
correção antes da equipe escrever os configs dos 6 personagens reais. Os dois
problemas foram encontrados durante a implementação do combate e estão cobertos
por teste automatizado (`npm test`).

---

## 1. Os valores de `hitbox` do exemplo fazem todo golpe errar

### O problema

Com os números do exemplo, **nenhum ataque consegue conectar**, em nenhuma
distância. A conta, na escala de render 3x:

| medida | valor no exemplo | em pixels de tela |
|---|---|---|
| `hurtbox.width: 40` | meia largura = 20 | **60 px** do centro |
| distância mínima entre dois corpos | — | **120 px** (60 + 60) |
| `hitbox` (`offsetX: 25`, `width: 30`) | borda em 55, centro do frame em 40 | alcance de **45 px** do centro |

Encostados, a hurtbox do oponente começa a 60 px do centro do atacante, mas o
golpe só alcança 45 px. A hitbox do exemplo está centrada no corpo, não
projetada para a frente.

### A correção

Substituir o bloco `hitbox` no exemplo por valores com alcance real:

```json
  "hitbox": {
    "width": 34,
    "height": 30,
    "offsetX": 50,
    "offsetY": 30
  },
```

Isso dá 132 px de alcance, conectando entre 120 e 192 px de distância.

**Regra para quem for escrever os configs reais:** a borda direita da hitbox
(`offsetX + width`) precisa passar de `frameWidth / 2 + hurtbox.width`, senão o
golpe nunca alcança. Com frame de 80 px e hurtbox de 40, isso significa
`offsetX + width > 60`.

---

## 2. Não há como dizer qual animação um combo toca

### O problema

O schema de `combos` tem `id`, `input`, `damage`, `hitstun` e `cooldown`, mas
nenhum campo ligando o combo a uma animação. O exemplo `hadoken_like` é
claramente o `special1` — os valores batem (35 de dano, 20 de hitstun, cooldown
60) — mas isso está implícito, não declarado.

Sem esse campo, todo combo terminado em `P` tocaria a animação de soco simples,
e os três especiais de cada personagem ficariam inalcançáveis por comando.

### A correção

Adicionar o campo opcional `animation` aos combos do exemplo:

```json
  "combos": [
    {
      "id": "basic_punch",
      "input": "P",
      "damage": 15,
      "hitstun": 12
    },
    {
      "id": "forward_punch",
      "input": "→P",
      "animation": "special2",
      "damage": 20,
      "hitstun": 14
    },
    {
      "id": "hadoken_like",
      "input": "→↘↓P",
      "animation": "special1",
      "damage": 35,
      "hitstun": 20,
      "cooldown": 60
    }
  ],
```

O campo é opcional. Quando ausente, o combo cai no ataque básico do botão que
fecha o padrão (`P` → `punch`, `K` → `kick`, `S` → `special1`), então nenhum
config existente quebra.

---

## 3. Extensão implementada junto: `hitbox` por ataque

Não é correção de erro, é uma limitação que apareceu na prática: o schema previa
**uma hitbox por personagem**, então soco, chute e os três especiais teriam
exatamente o mesmo alcance — e num jogo de luta o chute precisa alcançar mais
que o soco.

Cada animação de ataque pode agora declarar a própria `hitbox`:

```json
    "kick": {
      "frames": [38, 39, 40, 41, 42, 43],
      "speed": 0.15,
      "loop": false,
      "hitboxFrame": 2,
      "damage": 18,
      "hitstun": 14,
      "hitbox": {
        "width": 44,
        "height": 26,
        "offsetX": 52,
        "offsetY": 44
      }
    },
```

Também é opcional: sem o campo, vale a `hitbox` do personagem, exatamente como
o documento descreve hoje. Vale documentar para a equipe poder usar.

---

## Notação de input aceita

O reconhecimento de combos entende estes tokens, e **as direções são sempre
relativas ao lado que o personagem encara** (`→` é "para frente", não "para a
direita"):

| token | significado |
|---|---|
| `→` `←` | frente, trás |
| `↑` `↓` | cima, baixo |
| `↗` `↘` `↖` `↙` | diagonais |
| `P` `K` `S` | soco, chute, especial |

Padrões mais longos têm prioridade sobre os mais curtos, e a janela do buffer de
input é de 500 ms.
