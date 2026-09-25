import { useEffect, useState } from 'react';
import { loadConfig, sheetUrl } from '../utils/characterConfig.js';

// Quadro atual da animacao depois de "ticks" ticks de 60fps: por duracao de
// cada quadro (importados do MUGEN) ou pela velocidade fixa (speed).
function frameAt(clip, ticks) {
  if (!clip.durations) return clip.frames[Math.floor(ticks * clip.speed) % clip.frames.length];
  const total = clip.durations.reduce((sum, value) => sum + value, 0);
  let time = ticks % total;
  for (let index = 0; index < clip.durations.length; index += 1) {
    time -= clip.durations[index];
    if (time < 0) return clip.frames[index];
  }
  return clip.frames.at(-1);
}

// Sprite do proprio jogo, animado, no tamanho nativo: ampliar deixa cada pixel
// visivel e foi recusado. Os pes ficam na base da caixa, do mesmo jeito que o
// importador monta a grade.
export default function FighterSprite({ entry, animation = 'idle', scale: baseScale = 1, flip = false }) {
  const [config, setConfig] = useState(null);
  const [ticks, setTicks] = useState(0);

  useEffect(() => {
    let active = true;
    loadConfig(entry).then((loaded) => {
      if (active) setConfig(loaded);
    });
    return () => {
      active = false;
    };
  }, [entry]);

  const clip = config?.animations[animation];

  useEffect(() => {
    if (!clip) return undefined;
    // Quatro ticks por atualizacao: suave o bastante para uma pose parada.
    const interval = setInterval(() => setTicks((value) => value + 4), (1000 / 60) * 4);
    return () => clearInterval(interval);
  }, [clip]);

  if (!clip) return null;

  // Personagem de sprite pequeno aparece na mesma escala da luta.
  const scale = baseScale * (config.spriteScale ?? 1);
  const { frameWidth, frameHeight } = config.spriteGridSize;
  const frame = frameAt(clip, ticks);
  const box = {
    width: frameWidth * scale,
    height: frameHeight * scale,
    transform: flip ? 'scaleX(-1)' : undefined,
    // Ampliado: suave, sem pixel em bloco.
    imageRendering: scale === 1 ? undefined : 'auto',
  };

  if (config.atlas) {
    const [page, x, y, width, height, dx, dy] = config.atlas[frame];
    // O recorte e posicionado em pixels da celula; a escala vai no conjunto,
    // sem precisar saber o tamanho da pagina do atlas.
    return (
      <div className="fighter-sprite" style={{ ...box, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          <div
            style={{
              position: 'absolute',
              left: dx,
              top: dy,
              width,
              height,
              backgroundImage: `url(${sheetUrl(entry, config, config.sheets[page])})`,
              backgroundPosition: `${-x}px ${-y}px`,
            }}
          />
        </div>
      </div>
    );
  }

  const { cols } = config.spriteGridSize;
  return (
    <div
      className="fighter-sprite"
      style={{
        ...box,
        backgroundImage: `url(${entry.dir}/${config.spriteSheet})`,
        backgroundSize: `${cols * frameWidth * scale}px auto`,
        backgroundPosition: `${-(frame % cols) * frameWidth * scale}px ${-Math.floor(frame / cols) * frameHeight * scale}px`,
      }}
    />
  );
}
