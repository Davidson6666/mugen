# Revisão visual de combate

Direção escolhida: combinar anime, química e katana no pixel art do Humberto.

- Doze poses novas para preparação, extensão, continuação e recuperação de socos, chute e palmas. Usadas em sete animações da forma normal. A forma lendária conserva as poses de cabelo verde e recebe os novos efeitos.
- Impactos físicos dourados; carga e explosão de plasma verde; combustão em quatro fases; impactos adicionais dos projéteis Six Seven.
- Judgement Cut End com arcos curvos, cortes cruzados e fragmentos azul-violeta desenhados em sprite, substituindo as linhas SVG. Efeito de saque junto à espada. O cenário escuro continua em SVG.
- Katon com chama curta junto à boca no lançamento, além da bola de fogo e sua explosão.

Comandos e dano preservados. Correção adicional: as propriedades de lançamento dos golpes antigos do Humberto agora usam `vx/vy`, conforme o motor, impedindo posições inválidas após uppercut e rasteira.

Prévia de todos os ataques, com câmera próxima e opção de câmera lenta: `/docs/humberto-combat-preview.html`.

## Arquivos e reconstrução

Geração integrada ImageGen. Fontes em `assets-src/humberto/combat-poses-source.png`, `combat-poses-alpha.png` e `combat-fx-source.png`; saídas ativas `humberto_combat_v2.png` e `combat_fx_v2.png`. O script `node scripts/upgrade-humberto-combat.mjs` empacota os recortes com transparência e nearest-neighbor. Aplicar depois dos scripts de Judgement e Katon, caso esses sejam reconstruídos. As coordenadas das linhas foram ajustadas à folha gerada para excluir pés ou espadas de células vizinhas.

## Prompts

**Efeitos:** Production fighting game VFX sprite sheet, coarse crisp 16-bit pixel art with hard clusters and limited palettes, no smooth gradients, no text or numbers or UI icons. Four columns, four rows. Row 1: four frames of emerald chemical plasma palm explosion, ignition, expanding crescent, angular starburst, dissipating sparks. Row 2: four frames of orange chemical combustion, flame seed, upward-forward plume, turbulent blast, embers. Row 3: four frames of Vergil-inspired dimensional katana cuts, curved cyan-white crescent with violet afterimage, intersecting slashes, five curved trails and glass shards, dispersing shards. No straight parallel lines or magic circles. Row 4: golden physical hit impact, star, asymmetric white-gold burst, amber shards, dissipating sparks. Isolated transparent cells and consistent anchors.

**Poses:** Same Humberto from the body reference: middle-aged, short dark hair, black T-shirt, olive pants, cream-soled dark shoes, normal medium build. Crisp coarse 16-bit pixel art, about sixty logical pixels tall. Four columns, four rows. Punch sequence with twisted windup, full extension, followthrough and guard. Kick sequence with chambered knee, full side kick, recoil and guard. Chemical palm sequence with gathering hands near rear hip, forward double-palm thrust, rooted followthrough and recoil. Katana quickdraw sequence with crouching grip, upward draw, horizontal followthrough and sheathing. Strong weight transfer, consistent proportions, complete isolated figures, true alpha. No embedded large effects, costume changes or background.

**Transparência:** Remove all background and soft lighting behind the figures; preserve the sixteen poses, pixels, dimensions, layout, clothing, faces and sword, with genuine transparent alpha and no opaque backdrop.
