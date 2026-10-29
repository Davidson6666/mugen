# Ruptura Arena

Jogo de luta 2D no navegador, no estilo dos fliperamas (Capcom vs SNK 2), feito com **React + PixiJS**. Tem 18 lutadores importados de pacotes MUGEN, partida contra a CPU, dois jogadores no mesmo teclado, partida online com ranking por Elo, Modo História, área de treino e conquistas.

> Projeto acadêmico, sem fins comerciais. Os créditos de cada personagem, cenário e fonte estão em [CREDITS.md](CREDITS.md).

## Como rodar

```bash
npm install
npm run dev        # servidor local (http://localhost:5173)
npm test           # testes da simulação, dos golpes e da câmera
npm run smoke      # abre cada tela num Chrome e falha se houver erro de console
npm run lint
npm run build      # versão de produção (PWA instalável)
```

Para o ranking e a partida online é preciso um projeto no [Supabase](https://supabase.com): crie `.env.local` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e rode `supabase/schema.sql` no SQL Editor. Sem isso o jogo funciona normalmente, só sem as partes online.

## Modos

| Modo | O que é |
| --- | --- |
| Versus CPU | Partida avulsa contra a máquina, em três dificuldades |
| Versus Player | Dois jogadores no mesmo teclado ou com controles (o 1P precisa de conta) |
| Partida online | Fila por Elo, lutas sincronizadas por *lockstep* |
| Modo História | Seis lutas com dificuldade crescente; vencer libera um lutador secreto |
| Área de treino | Boneco que não revida (parado ou defendendo, escolhido na pausa), com histórico de teclas e dano do combo na tela |

Controles padrão (remapeáveis em Configurações): `WASD` move, `J` soco, `K` chute, `L` especial. `J` + `K` juntos, colado no oponente, é o arremesso (não dá para defender; apertar junto também escapa). O segundo jogador usa as setas e `Num 1/2/3`. Controles de PS5 e Xbox em [docs/CONTROLES.md](docs/CONTROLES.md). A lista de golpes de cada lutador abre na pausa (`Esc`).

## Documentação do projeto

- [Diagrama de casos de uso](docs/casos-de-uso.png), com `<<include>>` e `<<extend>>`
- [Histórias de usuário](docs/HISTORIAS_DE_USUARIO.md), uma por caso de uso, com critérios de aceite
- [Quadro Kanban no Trello](docs/TRELLO.md): como montar e os cartões prontos para colar
- [Prints das telas](docs/telas/): abertura, menu, seleção, cenário, versus, luta, pausa, lista de golpes, Modo História, resultado, ranking, conquistas, treino, configurações, login e final da campanha

## Como o jogo é montado

- **Simulação determinística** a 60 ticks por segundo (`src/systems/`): a mesma partida dá o mesmo resultado nos dois computadores, e é isso que permite o online. Nada da simulação lê o relógio real ou a câmera.
- **Desenho separado da lógica**: câmera dinâmica, camera lenta do K.O., reflexo, estilhaços e HUD só mexem no que aparece, nunca no resultado.
- **Menus em SVG** no padrão visual do jogo (`src/components/cvs2.jsx`), com cor por modo (`src/utils/theme.js`) e navegação por teclado e controle.

## Lutadores e arte

Cada lutador vem de um pacote MUGEN e é convertido por um script (`scripts/import-<nome>.mjs`, comando `npm run assets:<nome>`). Os pacotes originais ficam em `assets-src/`, fora do git (são grandes).

Depois de reimportar alguém, rode `npm run assets:optimize`: ele converte os atlas de PNG para WebP sem perda (os pixels ficam idênticos e o download cai pela metade).

Equilíbrio entre os lutadores: `npm run balance:sim` (torneio da IA), `balance:audit` e `balance:tune`.

## Estrutura

```text
src/components   telas do jogo (menus, seleção, luta, resultado)
src/systems      simulação: lutador, colisão, câmera, HUD, áudio, online
src/data         lutadores, cenários, escada do Modo História
public/assets    atlas, retratos, sons e cenários
scripts          importadores de pacotes MUGEN e ferramentas
supabase         SQL do ranking online
test             testes (node --test)
```
