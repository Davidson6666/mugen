import { useEffect, useState } from 'react';
import characters from '../data/characters.json';
import { PALETTE } from '../utils/palette.js';
import { useAccents } from '../utils/useAccents.js';
import { loadConfig } from '../utils/characterConfig.js';
import FighterSprite from './FighterSprite.jsx';
import { Label, Pedestal, Spotlight } from './cvs2.jsx';

// Lutador em destaque para as telas que sobraram com meia tela vazia (ranking,
// login): um por vez, com holofote e a frase dele, trocando a cada poucos
// segundos. O Ensina GOD fica de fora: e segredo ate ser desbloqueado.
const POOL = characters.filter((entry) => entry.id !== 'ensina_god');
const SWAP_MS = 6000;

export default function ShowcaseFighter({ x, y, flip = true }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * POOL.length));
  const [tagline, setTagline] = useState('');
  const fighter = POOL[index];
  const [accent] = useAccents([fighter]);

  useEffect(() => {
    const timer = setInterval(() => setIndex((current) => (current + 1) % POOL.length), SWAP_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    loadConfig(fighter).then((config) => alive && setTagline(config?.description ?? '')).catch(() => {});
    return () => { alive = false; };
  }, [fighter]);

  return (
    <div className="showcase" aria-hidden="true">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <Spotlight id="showcase" x={x} y={y} color={accent ?? PALETTE.fieldYellow} />
        <Pedestal x={x} y={y} />
        <g key={fighter.id} className="stage-name-in">
          <Label x={x} y={y + 78} size={38} anchor="middle" stroke={7}>{fighter.name.toUpperCase()}</Label>
          {tagline && <Label x={x} y={y + 108} size={22} weight={700} anchor="middle" fill={PALETTE.fieldYellow} stroke={5}>{tagline.toUpperCase()}</Label>}
        </g>
      </svg>
      <div className="cvs2-sprite" style={{ left: x, top: y }}>
        <div key={fighter.id} className="cvs2-sprite__inner cvs2-sprite__inner--right">
          <FighterSprite entry={fighter} flip={flip} />
        </div>
      </div>
    </div>
  );
}
