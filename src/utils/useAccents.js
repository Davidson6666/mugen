import { useEffect, useState } from 'react';
import { loadAccent } from './accentColor.js';

// Cor de destaque (tirada do retrato) de uma lista de personagens, na mesma
// ordem; null enquanto carrega ou se a imagem falhar.
export function useAccents(entries) {
  const [accents, setAccents] = useState(() => entries.map(() => null));
  const key = entries.map((entry) => entry.id).join(',');
  useEffect(() => {
    let alive = true;
    Promise.all(entries.map((entry) => loadAccent(
      `${entry.dir}/${entry.portrait}`,
      entry.portraitRect?.length === 4 ? entry.portraitRect : undefined,
    ))).then((colors) => alive && setAccents(colors));
    return () => { alive = false; };
    // A lista so muda quando muda quem esta nela (key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return accents;
}
