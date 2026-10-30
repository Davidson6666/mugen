# Ruptura Arena

Jogo de luta 2D no navegador, no estilo dos fliperamas (Capcom vs SNK 2), feito com **React + PixiJS**. Tem 18 lutadores importados de pacotes MUGEN, partida contra a CPU, dois jogadores no mesmo teclado, partida online com ranking por Elo, Modo História, área de treino e conquistas.

> Projeto acadêmico, sem fins comerciais. Os créditos de cada personagem, cenário e fonte estão em [CREDITS.md](CREDITS.md).

## Aplicação publicada

**Endereço:** _preencher depois da publicação_ (veja [Publicação](#publicação)).

## Como rodar

Precisa de Node 20 ou mais novo.

```bash
npm install
cp .env.example .env.local   # e preencha com os dados do seu projeto no Supabase
npm run dev                  # servidor local (http://localhost:5173)
```

Outros comandos:

```bash
npm test           # testes da simulação, dos golpes, da câmera, das rotas e da validação
npm run smoke      # abre cada tela e cada rota num Chrome e falha se houver erro de console
npm run net:check  # mede a rede da partida online (dois Chromes, servidor x conexão direta)
npm run lint
npm run build      # versão de produção (PWA instalável)
```

Sem o Supabase o jogo funciona normalmente (CPU, versus local, história e treino); só ficam de fora a conta, o ranking e a partida online.

## Variáveis de ambiente

Ficam em `.env.local` (fora do git). O arquivo [`.env.example`](.env.example) mostra o formato, sem credenciais.

| Variável | O que é |
| --- | --- |
| `VITE_SUPABASE_URL` | Endereço do projeto no Supabase (`https://xxxx.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Chave pública `anon` do projeto. Pode ir para o navegador porque as tabelas têm RLS |

A chave `service_role` (administrativa) **nunca** entra no projeto nem no navegador.

## Preparando o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) e copie, em **Project Settings > API**, a URL e a chave `anon` para o `.env.local`.
2. Em **SQL Editor > New query**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e rode. Ele cria as tabelas, liga o RLS, cria as políticas e as funções do ranking e da fila. Pode rodar de novo sem problema (usa `if not exists`).
3. Em **Authentication > Sign In / Providers > Email**, deixe o provedor de e-mail ligado e **desligue "Confirm email"**. Assim a conta vale logo depois do cadastro. (Se você deixar ligado, o jogo pede para confirmar o e-mail e cria o perfil no primeiro acesso.)
4. Opcional: [`supabase/elo-inicial-1000.sql`](supabase/elo-inicial-1000.sql) acerta o Elo inicial em 1000 e [`supabase/reset-ranking.sql`](supabase/reset-ranking.sql) zera o ranking.

### Tabelas e políticas de acesso (RLS)

Todas as tabelas têm RLS ligado. O navegador só usa a chave `anon`; quem manda no que cada pessoa pode fazer é o banco.

| Tabela | Leitura | Escrita |
| --- | --- | --- |
| `profiles` (nome de exibição, Elo, vitórias e derrotas) | Pública: é o ranking | Cada conta cria só o próprio perfil. **Não existe política de UPDATE**: nem o dono muda o Elo, só a função `report_match_result` (no servidor) |
| `queue` (fila da partida online) | Cada um vê só a própria linha | Entra pela função `find_match`; cada um só apaga a própria linha (sair da fila) |
| `matches` (partidas online) | Os dois jogadores veem a própria partida | Só pelas funções do servidor (`find_match`, `start_match`, `report_match_result`) |
| `achievements`, `character_wins` | Cada um vê só as próprias conquistas | Só pela função do servidor `record_match_result` |

O ranking é **por Elo**: ao fim de uma partida online, `report_match_result` calcula e grava o novo Elo dos dois jogadores. Quem perde pontos continua no banco; o ranking mostra a classificação atual.

## Autenticação e navegação

- **Cadastro** (`/cadastro`): e-mail, nome no ranking, senha e repetição, validados com Zod. O e-mail fica só na conta do Supabase; o ranking mostra apenas o nome escolhido.
- **Login** (`/login`): e-mail e senha (contas antigas, criadas só com nome de usuário, entram pelo usuário). A sessão continua ao recarregar a página.
- **Minha conta** (`/conta`): área protegida, só abre com login e tem o logout. Sem login, manda para `/login` e volta depois de entrar.
- Dá para jogar sem conta. A conta é pedida para a partida online e para o Versus Player (jogador 1).

| Rota | Tela |
| --- | --- |
| `/` | Menu principal |
| `/personagem`, `/cenario`, `/versus`, `/luta`, `/resultado`, `/final`, `/fila` | Fluxo da partida (voltam ao menu se abertas sem partida) |
| `/ranking`, `/conquistas`, `/configuracoes` | Ranking, conquistas e controles |
| `/login`, `/cadastro`, `/conta` | Conta |
| qualquer outra | Página "não encontrada" (404) |

As rotas usam o React Router (`src/routes.js` lista todas). O estado de sessão fica em contexto (`src/context/AuthProvider.jsx`) e as chamadas ao Supabase ficam em `src/utils/auth.js`, `matchmaking.js` e `achievements.js`, fora dos componentes.

## Publicação

O projeto é um app estático (Vite), pronto para a Vercel; o [`vercel.json`](vercel.json) já manda qualquer endereço para o `index.html`, que é o que faz as rotas funcionarem ao abrir ou recarregar uma URL direta.

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório do GitHub.
2. Em **Environment Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (os mesmos do `.env.local`).
3. Faça o deploy e cole o endereço em **Aplicação publicada**, acima.
4. No Supabase, em **Authentication > URL Configuration**, ponha esse endereço em **Site URL**.

## Modos

| Modo | O que é |
| --- | --- |
| Versus CPU | Partida avulsa contra a máquina, em três dificuldades |
| Versus Player | Dois jogadores no mesmo teclado ou com controles (o 1P precisa de conta) |
| Partida online | Fila por Elo, lutas sincronizadas por *lockstep*; os comandos vão direto de um jogador ao outro (WebRTC) e, se isso não abrir, pelo servidor. O canto da tela mostra o caminho e o ping |
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

> **Cuidado ao reimportar.** O `config.json` de cada lutador em `public/assets/characters/` já tem ajustes feitos à mão depois da importação (danos do balanceamento, sons, correções de golpes e de caixas de acerto), e rodar `npm run assets:<nome>` **sobrescreve tudo isso** com o que o MUGEN diz. Trate o config como a fonte de verdade: faça commit antes, reimporte, confira com `git diff` e restaure o que não quiser perder. Corrigir só o script de importação não muda o jogo.

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
