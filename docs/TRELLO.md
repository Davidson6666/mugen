# Quadro Kanban no Trello — Ruptura Arena

O projeto usa **Kanban**: as tarefas andam por colunas, da esquerda para a direita, conforme são feitas. Não há sprints de tamanho fixo. Pedidos novos que aparecem durante o projeto entram no Backlog e seguem o mesmo caminho.

## Montando o quadro (uns 10 minutos)

1. Entre em [trello.com](https://trello.com) e crie uma conta grátis (dá para entrar com o Google).
2. Clique em **Criar → Criar quadro** e dê o nome **Ruptura Arena**.
3. Crie as colunas (no Trello elas se chamam "listas"), nesta ordem:
   **Backlog · A Fazer · Fazendo · Em Teste · Feito**
4. Em cada coluna, clique em **Adicionar um cartão**, cole um dos blocos abaixo inteiro e confirme. O Trello pergunta se você quer criar **um cartão por linha**: escolha que sim.
5. Em **Compartilhar**, convide o diekred e o professor.
6. Etiquetas sugeridas (menu do quadro → Etiquetas): **História de usuário** (verde), **Técnico** (azul), **Visual** (roxo), **Documentação** (amarelo).

Dentro de cada cartão dá para pôr quem é o responsável, o prazo e uma checklist. Para as histórias, cole os critérios de aceite de [HISTORIAS_DE_USUARIO.md](HISTORIAS_DE_USUARIO.md) como checklist.

## Coluna "Feito"

Histórias de usuário (todas já funcionam no jogo):

```text
HU01 - Jogar contra a CPU
HU02 - Jogar Versus Local (2 jogadores)
HU03 - Jogar Partida Online
HU04 - Buscar Oponente (fila por Elo)
HU05 - Jogar Modo História
HU06 - Liberar Lutador Secreto
HU07 - Treinar Golpes
HU08 - Executar Combate
HU09 - Selecionar Personagem
HU10 - Selecionar Mapa
HU11 - Pausar Partida
HU12 - Ver Lista de Golpes
HU13 - Pedir Revanche
HU14 - Ver Ranking
HU15 - Fazer Login / Criar Conta
HU16 - Ver Conquistas
HU17 - Configurar Controles e Som
```

Tarefas técnicas e visuais já entregues:

```text
Motor de luta: golpes, dano, defesa, combos e rounds (21/09)
IA da CPU com três dificuldades (21/09)
Importar os lutadores de pacotes MUGEN (22/09 a 05/10)
Equilíbrio entre os lutadores com torneio da IA (28/09)
Suporte a controles de PS5 e Xbox (28/09)
Contas e ranking com Supabase (29/09)
Jogo instalável como aplicativo (PWA) (29/09)
Partida online sincronizada e Elo (30/09)
Controles remapeáveis (01/10)
Conquistas por conta (01/10)
Cenários do campus UTFPR-CM (05/10)
Câmera dinâmica na luta (04/10)
Repaginação visual de todas as telas (09/10 e 10/10)
K.O. com câmera lenta e efeitos de impacto (10/10)
Tela de abertura com progresso e versão do jogo (10/10)
Trilha sonora com volume ajustável (10/10)
Setas 1P e 2P sobre os lutadores (15/10)
README e créditos de personagens, cenários e sons (10/10)
Testes automatizados (669 testes passando)
Diagrama de casos de uso com include e extend (15/10)
Histórias de usuário (15/10)
Prints de todas as telas (15/10)
Protótipo das telas aprovado pelo professor (prints das telas)
Sequências de golpes básicos do Ensina GOD e do Humberto (15/10)
Correção: pressão infinita na defesa (Chun-Li e Aizen) (15/10)
Arremesso para todos os lutadores (15/10)
Combo longo perde força (15/10)
Atraso do online combinado pela conexão (15/10)
Corte de super na tela (15/10)
Frase de vitória de cada lutador (15/10)
Área de treino: teclas, dano do combo e boneco que defende (15/10)
Correção: setas 1P/2P cobriam o lutador nas animações (15/10)
Correção: laços infinitos (Chun-Li no K + L, Gojo, Pikachu, Killua, Tanjiro) (15/10)
Movimento mais rápido: andar, dash e pulo, e palco mais largo (28/10)
Correção: golpes que "não contavam" (L engolido e aperto perdido) (29/10)
Correção: golpes quebrados por dados (L do Aizen, tiros do Dante, Byakurai) (29/10)
Correção: tecla R reiniciava a luta no online e erro de rede em inglês (29/10)
Equilíbrio: Reze e Sukuna perdem dano (29/10)
Controles na tela para jogar no celular (29/10)
Teste das telas: npm run smoke (29/10)
Acessibilidade: página em pt-BR e menus com papel para leitor de tela (29/10)
Online: conexão direta entre os jogadores (WebRTC) e indicador de ping (29/10)
Limpeza: arquivo sem uso removido e avisos sobre importadores (29/10)
```

## Coluna "A Fazer"

```text
Revisar o diagrama de casos de uso com a equipe
Testar Versus Local e Partida Online com duas pessoas
Testar o online entre dois computadores e ver se o indicador mostra DIRETO
Decidir sobre as músicas comerciais no repositório (Tekken 3, DMC3, Bayonetta)
```

## Coluna "Backlog"

Ideias e pedidos que ainda não foram priorizados. Pedidos novos do professor entram aqui primeiro e depois sobem para "A Fazer".

```text
Novos lutadores
Novos cenários
Reze ainda forte (77% na IA): revisar bdBarrage e bdEscalate
Defesa alta/baixa e defesa no ar
Golpes de média distância que erram colado (raikoho, phantomSlash, nezuko, thunderDive)
```

## Como usar no dia a dia

- Começou uma tarefa: arraste o cartão para **Fazendo** e coloque seu nome nele.
- Terminou e falta testar: **Em Teste**.
- Testou e funcionou: **Feito**. Se der, cole no cartão o link do commit no GitHub que fez aquilo.
- Evite ter muitos cartões em "Fazendo" ao mesmo tempo (no Kanban, o ideal é no máximo 2 ou 3 por pessoa).
