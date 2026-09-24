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
