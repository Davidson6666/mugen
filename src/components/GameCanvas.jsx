import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import { SpriteSheetManager } from '../systems/SpriteSheetManager.js';
import { Fighter } from '../systems/Fighter.js';
import { resolveBodyCollision } from '../systems/CollisionDetector.js';
import { InputHandler } from '../utils/InputHandler.js';
import { PALETTE, PALETTE_HEX } from '../utils/palette.js';
import characters from '../data/characters.json';
import maps from '../data/maps.json';

export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;

// Traduz o estado bruto do InputHandler no comando que o Fighter consome.
// A IA vai produzir esse mesmo formato, entao o Fighter nao precisa saber quem
// esta no controle.
function buildCommand(input, player) {
  const held = input.state(player);
  return {
    left: held.left,
    right: held.right,
    up: held.up,
    down: held.down,
    jump: input.pressed(player, 'up'),
    punch: input.pressed(player, 'punch'),
    kick: input.pressed(player, 'kick'),
    special: input.pressed(player, 'special'),
  };
}

function playerMarker(color) {
  const marker = new Graphics();
  marker.ellipse(0, 0, 26, 8).fill({ color, alpha: 0.55 });
  return marker;
}

function debugText() {
  return new Text({
    text: '',
    style: {
      fontFamily: 'monospace',
      fontSize: 14,
      fill: PALETTE.textSecondary,
      lineHeight: 18,
    },
  });
}

export default function GameCanvas() {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let disposed = false;
    let app = null;
    const input = new InputHandler();

    async function boot() {
      const instance = new Application();
      await instance.init({
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        background: PALETTE.bgPrimary,
        antialias: false,
      });
      // O StrictMode monta e desmonta o efeito: sem esta guarda, o canvas do
      // primeiro boot fica orfao no DOM.
      if (disposed) {
        instance.destroy(true, { children: true });
        return;
      }
      app = instance;
      instance.canvas.style.display = 'block';
      containerRef.current.appendChild(instance.canvas);

      const assets = new SpriteSheetManager();
      const [mapRecord, characterRecord] = await Promise.all([
        assets.loadMap(maps[0]),
        assets.loadCharacter(characters[0]),
      ]);
      if (disposed) return;

      const map = mapRecord.config;

      const background = new Sprite(mapRecord.texture);
      background.width = map.width;
      background.height = map.height;
      instance.stage.addChild(background);

      const world = new Container();
      instance.stage.addChild(world);

      const fighters = [
        new Fighter({ record: characterRecord, map, x: 440, facing: 1 }),
        new Fighter({ record: characterRecord, map, x: 840, facing: -1 }),
      ];
      const markers = [playerMarker(PALETTE_HEX.player1), playerMarker(PALETTE_HEX.player2)];
      for (const marker of markers) world.addChild(marker);
      for (const fighter of fighters) world.addChild(fighter.sprite);

      const overlay = debugText();
      overlay.position.set(16, 16);
      instance.stage.addChild(overlay);

      input.attach();
      setStatus('ready');

      let elapsed = 0;
      instance.ticker.add((ticker) => {
        const delta = ticker.deltaTime;
        input.poll();

        fighters[0].faceTowards(fighters[1].x);
        fighters[1].faceTowards(fighters[0].x);
        fighters[0].update(buildCommand(input, 0), delta);
        fighters[1].update(buildCommand(input, 1), delta);
        resolveBodyCollision(fighters[0], fighters[1]);

        fighters.forEach((fighter, index) => {
          fighter.syncSprite();
          markers[index].position.set(fighter.x, map.groundLevel);
        });

        elapsed += ticker.deltaMS;
        if (elapsed >= 250) {
          elapsed = 0;
          overlay.text = [
            `fps ${ticker.FPS.toFixed(0)}`,
            ...fighters.map((fighter, index) => {
              const facing = fighter.facing === 1 ? '>' : '<';
              const guard = fighter.blocking ? ' block' : '';
              return `p${index + 1} ${facing} ${fighter.animation.name}${guard}`;
            }),
          ].join('\n');
        }
      });
    }

    boot().catch((error) => {
      console.error('Falha ao iniciar o jogo:', error);
      if (!disposed) setStatus('error');
    });

    return () => {
      disposed = true;
      input.detach();
      if (app) {
        app.destroy(true, { children: true });
        app = null;
      }
    };
  }, []);

  return (
    <div className="game-canvas">
      <div ref={containerRef} className="game-canvas__surface" />
      {status !== 'ready' && (
        <p className="game-canvas__status">
          {status === 'loading' ? 'Carregando assets...' : 'Erro ao carregar. Veja o console.'}
        </p>
      )}
    </div>
  );
}
