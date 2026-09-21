import { useEffect, useState } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { assetManager } from '../systems/SpriteSheetManager.js';
import characters from '../data/characters.json';
import maps from '../data/maps.json';

const MINIMUM_DISPLAY_MS = 1800;

export default function VersusScreen() {
  const { go, resetTo } = useMenu();
  const { setup } = useGame();
  const [loaded, setLoaded] = useState(false);
  const [waited, setWaited] = useState(false);
  const [failed, setFailed] = useState(false);

  const fighters = setup.characters.map((id) => characters.find((entry) => entry.id === id));
  const stage = maps.find((entry) => entry.id === setup.mapId);

  useEffect(() => {
    let cancelled = false;

    // So aqui os sprite sheets completos e o cenario entram: ate agora a
    // selecao usou apenas os retratos leves.
    Promise.all([
      ...fighters.map((entry) => assetManager.loadCharacter(entry)),
      assetManager.loadMap(stage),
    ])
      .then(() => !cancelled && setLoaded(true))
      .catch((error) => {
        console.error('Falha ao carregar os assets da luta:', error);
        if (!cancelled) setFailed(true);
      });

    const timer = setTimeout(() => !cancelled && setWaited(true), MINIMUM_DISPLAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // setup nao muda enquanto esta tela existe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loaded && waited) go('battle');
  }, [loaded, waited, go]);

  if (failed) {
    return (
      <div className="screen screen--versus">
        <p className="screen__warning is-visible">Nao foi possivel carregar a luta.</p>
        <button type="button" className="menu-list__item" onClick={() => resetTo('mainMenu')}>
          VOLTAR AO MENU
        </button>
      </div>
    );
  }

  return (
    <div className="screen screen--versus">
      <div className="versus">
        {fighters.map((fighter, player) => (
          <figure key={player} className={`versus__side versus__side--p${player + 1}`}>
            <img src={`${fighter.dir}/${fighter.portrait}`} alt="" />
            <figcaption>
              <span className="versus__tag">
                {player === 1 && setup.mode === 'versusCpu' ? 'CPU' : `P${player + 1}`}
              </span>
              <span className="versus__name">{fighter.name}</span>
            </figcaption>
          </figure>
        ))}
        <p className="versus__vs">VS</p>
      </div>

      <p className="versus__stage">{stage.name}</p>

      <div className="loading">
        <div className={`loading__bar ${loaded ? 'is-complete' : ''}`} />
        <p className="loading__label">{loaded ? 'PRONTO' : 'CARREGANDO...'}</p>
      </div>
    </div>
  );
}
