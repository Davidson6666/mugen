import { useEffect, useState } from 'react';
import characters from '../data/characters.json';
import { loadConfig } from '../utils/characterConfig.js';
import { DIRECTION_KEYS, groupBySection, keysFor, moveListFor } from '../utils/moveList.js';

// Lista de golpes aberta pela pausa: um jogador por vez (1P / 2P), com as
// teclas daquele jogador. A navegacao (trocar jogador, rolar) vem da Battle.
export default function MoveList({ characterIds, player, scrollRef }) {
  const [configs, setConfigs] = useState({});

  useEffect(() => {
    let active = true;
    for (const id of new Set(characterIds)) {
      const entry = characters.find((character) => character.id === id);
      if (!entry) continue;
      loadConfig(entry).then((config) => {
        if (active) setConfigs((current) => ({ ...current, [id]: config }));
      });
    }
    return () => {
      active = false;
    };
  }, [characterIds]);

  const config = configs[characterIds[player]];
  const sections = config ? groupBySection(moveListFor(config)) : [];
  // Duas colunas de verdade (rolam juntas): cada secao vai para a mais curta.
  const columns = [[], []];
  const heights = [0, 0];
  for (const section of sections) {
    const target = heights[0] <= heights[1] ? 0 : 1;
    columns[target].push(section);
    heights[target] += section.entries.length + 1;
  }

  return (
    <div className="movelist">
      <div className="movelist__band">LISTA DE GOLPES</div>
      <div className="movelist__tabs">
        {characterIds.map((id, index) => (
          <span key={index} className={`movelist__tab movelist__tab--p${index + 1}${index === player ? ' is-active' : ''}`}>
            {index + 1}P · {(configs[id]?.name ?? id).toUpperCase()}
          </span>
        ))}
      </div>
      <p className="movelist__hint">
        Direções: {DIRECTION_KEYS[player]} · as setas valem olhando para a direita (virado para a esquerda, → e ← se invertem)
      </p>
      <div className="movelist__body" ref={scrollRef}>
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="movelist__column">
            {column.map((section) => (
              <section key={section.title} className="movelist__section">
                <h3>{section.title}</h3>
                {section.entries.map((move) => (
                  <div key={`${move.name}-${move.input}`} className="movelist__row">
                    <span className="movelist__name">{move.name}</span>
                    <span className="movelist__keys">
                      {keysFor(move, player).map((key, index) => (
                        <kbd key={index} className={key.button ? 'is-button' : key.held ? 'is-held' : undefined}>
                          {key.held ? `segure ${key.label}` : key.label}
                        </kbd>
                      ))}
                    </span>
                    {move.note && <span className="movelist__note">{move.note}</span>}
                  </div>
                ))}
              </section>
            ))}
          </div>
        ))}
      </div>
      <p className="movelist__footer">A / D troca o jogador · W / S rola · K ou ESC volta</p>
    </div>
  );
}
