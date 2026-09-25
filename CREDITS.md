# Créditos de arte

## Itachi

Personagem importado do pacote MUGEN **"Uchiha Itachi"**, usado sem fins comerciais em projeto acadêmico. Créditos do próprio pacote (`!Credit.txt`):

- personagem base: **CobraG6**
- folha de sprites do Itachi: **spectrososuke**
- sprites adicionais, personagem e Susanoo: **om Hy**
- ajuda com os sprites: **sumairu14**

O script `scripts/import-itachi.mjs` converte o pacote para o formato do jogo, com sprites, duração de cada quadro, caixas de acerto, efeitos (Amaterasu, shuriken, Susanoo) e retrato. O pacote original fica em `assets-src/itachi/mugen/`, fora do git, porque o .sff tem 59 MB. Para regerar: `npm run assets:itachi`.

As faíscas de impacto usadas por todo o elenco (`public/assets/fx/`) também vêm desse pacote.

Itachi Uchiha e Naruto são propriedade de Masashi Kishimoto / Shueisha / Studio Pierrot.

## Escanor

Personagem importado do pacote MUGEN **"Escanor RSK OP"**, usado sem fins comerciais em projeto acadêmico. Créditos do próprio pacote (`Escanor RSK OP.def`):

- personagem original: **Soulfire**
- primeira edição: **Inseph**
- versão usada: **Rimihf**, editada por **Kuro**

O script `scripts/import-escanor.mjs` converte o pacote (golpes do modo normal e do The One, efeitos, retrato). O pacote fica em `assets-src/escanor/mugen/`, fora do git. Para regerar: `npm run assets:escanor`.

Escanor e Nanatsu no Taizai são propriedade de Nakaba Suzuki / Kodansha.

## Yoruichi

Personagem importada do pacote MUGEN **"Yoruichi Shihoin" (Bleach Mugen Project)**, usada sem fins comerciais em projeto acadêmico. Créditos do próprio pacote (`Readme.txt`):

- sprites e animações: **Sixfortyfive**
- programação: **Alchemist**

O script `scripts/import-yoruichi.mjs` converte o pacote (SFF v1 com a paleta `yoruichi1.act`). O pacote fica em `assets-src/yoruichi/mugen/`, fora do git. Para regerar: `npm run assets:yoruichi`.

Yoruichi Shihouin e Bleach são propriedade de Tite Kubo / Shueisha / Studio Pierrot.

## Aizen

Personagem importado do pacote MUGEN **"Aizen Sosuke TYBW"**, usado sem fins comerciais em projeto acadêmico. Créditos do próprio pacote (`Aizen_TYBW.def`): autor **Null**, a partir do trabalho de **Salah**.

O pacote original é "apelão" (Supernull, golpes que tiram a vida inteira); o script `scripts/import-aizen.mjs` traz só os golpes, com dano normal. O pacote fica em `assets-src/aizen/mugen/`, fora do git. Para regerar: `npm run assets:aizen`.

Sōsuke Aizen e Bleach são propriedade de Tite Kubo / Shueisha / Studio Pierrot.

## Gojo

Personagem importado do pacote MUGEN/Ikemen **"WR-Gojo"**, usado sem fins comerciais em projeto acadêmico. Créditos do próprio pacote (`WR-Gojo.def`): **Witherower** (Kuro Aonix / dawsaw).

O script `scripts/import-gojo.mjs` converte o pacote (SFF v1 com a paleta `PALETTE/1.act`; os efeitos mantêm as próprias cores). O pacote fica em `assets-src/gojo/mugen/`, fora do git. Para regerar: `npm run assets:gojo`.

Satoru Gojo e Jujutsu Kaisen são propriedade de Gege Akutami / Shueisha / MAPPA.

## Sukuna

Personagem importado do pacote MUGEN **"Unfair Sukuna"**, usado sem fins comerciais em projeto acadêmico. Créditos do próprio pacote (`Unfair Sukuna.def`): **Joey Joestar**, editado por **AikijinX**, **JeanneSoul**, **Adventurer**, **Sage Of Mugen** e **Kuro**.

No pacote, todo golpe acerta a tela inteira; o script `scripts/import-sukuna.mjs` troca isso por caixas de acerto do tamanho do golpe e dano normal. O pacote fica em `assets-src/sukuna/mugen/`, fora do git. Para regerar: `npm run assets:sukuna`.

Ryōmen Sukuna e Jujutsu Kaisen são propriedade de Gege Akutami / Shueisha / MAPPA.

## Unohana

Personagem importada do pacote MUGEN **"RetsuUnohana"**, usada sem fins comerciais em projeto acadêmico. Créditos do próprio pacote (`RetsuUnohana.def`): **Mounir**.

O script `scripts/import-unohana.mjs` converte o pacote (SFF v2 com sprites RLE8). O pacote fica em `assets-src/unohana/mugen/`, fora do git. Para regerar: `npm run assets:unohana`.

Retsu Unohana e Bleach são propriedade de Tite Kubo / Shueisha / Studio Pierrot.

## Miku

Personagem importada do pacote MUGEN **"HATSUNE MIKU"**, usada sem fins comerciais em projeto acadêmico. Créditos do próprio pacote (`miku.def`): **YU-TOHARU**.

O script `scripts/import-miku.mjs` converte o pacote (SFF v1 com a paleta `data/act/miku1.act`). As músicas dos supers (Hatsune Music, Nico Nico All Stars, Ievan Polkka, Cinderella Romance) saem do `miku.snd` do pacote e são convertidas para MP3 pelo ffmpeg (sem ffmpeg, ficam em WAV). O pacote fica em `assets-src/miku/mugen/`, fora do git. Para regerar: `npm run assets:miku`.

Hatsune Miku é propriedade da Crypton Future Media. As músicas pertencem aos seus compositores e produtores; estão aqui como vieram no pacote, sem fins comerciais.

## Dante

Personagem importado do pacote MUGEN **"Dante_AI"**, usado sem fins comerciais em projeto acadêmico. Créditos do próprio pacote (`Dante_AI.def`): **bugya**.

O script `scripts/import-dante.mjs` converte o pacote (SFF v1 com a paleta `dante.act`, sprites em alta resolução guardados pela metade). As vozes, os cortes e os tiros saem do `dante2.snd` do pacote e são convertidos para MP3 pelo ffmpeg (sem ffmpeg, ficam em WAV). O pacote fica em `assets-src/dante/mugen/`, fora do git. Para regerar: `npm run assets:dante`.

Dante e Devil May Cry são propriedade da Capcom.
