import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import { assetManager } from '../systems/SpriteSheetManager.js';
import { Fighter } from '../systems/Fighter.js';
import { ComboDetector } from '../systems/ComboDetector.js';
import { AIController } from '../systems/AIController.js';
import { GameStateManager } from '../systems/GameStateManager.js';
import { Hud } from '../systems/Hud.js';
import { EffectManager } from '../systems/EffectManager.js';
import { resolveAttack, resolveBodyCollision } from '../systems/CollisionDetector.js';
import { InputHandler } from '../utils/InputHandler.js';
import { PALETTE, PALETTE_HEX } from '../utils/palette.js';
import characters from '../data/characters.json';
import maps from '../data/maps.json';

export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;

const ROUND_END_MESSAGE = {
  ko: 'K.O.',
  timeout: 'TEMPO ESGOTADO',
  doubleKo: 'EMPATE',
  timeDraw: 'EMPATE',
};

const NEUTRAL_COMMAND = {
  left: false,
  right: false,
  up: false,
  down: false,
  jump: false,
  punch: false,
  kick: false,
  special: false,
};

// Traduz o estado bruto do InputHandler no comando que o Fighter consome.
// A IA produz esse mesmo formato, entao o Fighter nao precisa saber quem esta
// no controle.
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
      fontSize: 13,
      fill: PALETTE.textSecondary,
      lineHeight: 17,
    },
  });
}

// Desenha hurtbox (sempre) e hitbox (so no frame ativo do golpe ou do efeito).
// Ferramenta de debug, separada do HUD de jogo.
function drawBoxes(layer, fighters, effects) {
  layer.clear();
  for (const fighter of fighters) {
    const hurt = fighter.hurtRect;
    layer
      .rect(hurt.x, hurt.y, hurt.width, hurt.height)
      .stroke({ color: PALETTE_HEX.player2, width: 1, alpha: 0.8 });
    if (fighter.activeAttack) {
      const hit = fighter.hitRect;
      layer
        .rect(hit.x, hit.y, hit.width, hit.height)
        .fill({ color: PALETTE_HEX.player1, alpha: 0.35 })
        .stroke({ color: PALETTE_HEX.player1, width: 1 });
    }
  }
  for (const effect of effects) {
    const hit = effect.hitRect;
    if (!hit) continue;
    layer
      .rect(hit.x, hit.y, hit.width, hit.height)
      .fill({ color: PALETTE_HEX.accent, alpha: 0.35 })
      .stroke({ color: PALETTE_HEX.accent, width: 1 });
  }
}

export default function GameCanvas({ setup, paused = false, onMatchEnd }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState('loading');
  // A configuracao da partida e capturada na montagem: ela nao muda enquanto a
  // luta acontece, e reconstruir o canvas no meio do combate seria um desastre.
  const setupRef = useRef(setup);
  const pausedRef = useRef(paused);
  const onMatchEndRef = useRef(onMatchEnd);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    onMatchEndRef.current = onMatchEnd;
  }, [onMatchEnd]);

  useEffect(() => {
    let disposed = false;
    let app = null;
    const input = new InputHandler();
    let onDebugKey = null;

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

      const matchSetup = setupRef.current;
      const stageEntry = maps.find((entry) => entry.id === matchSetup.mapId) ?? maps[0];
      const characterEntries = matchSetup.characters.map(
        (id) => characters.find((entry) => entry.id === id) ?? characters[0],
      );

      const [mapRecord, ...characterRecords] = await Promise.all([
        assetManager.loadMap(stageEntry),
        ...characterEntries.map((entry) => assetManager.loadCharacter(entry)),
      ]);
      if (disposed) return;

      const map = mapRecord.config;
      // Os pontos de partida saem dos limites do mapa, entao qualquer cenario
      // novo posiciona os lutadores sozinho.
      const span = map.rightBound - map.leftBound;
      const spawns = [map.leftBound + span * 0.3, map.rightBound - span * 0.3];

      const background = new Sprite(mapRecord.texture);
      background.width = map.width;
      background.height = map.height;
      instance.stage.addChild(background);

      const world = new Container();
      instance.stage.addChild(world);

      const fighters = spawns.map((x, index) => new Fighter({
        record: characterRecords[index],
        map,
        x,
        facing: index === 0 ? 1 : -1,
      }));
      const detectors = characterRecords.map(
        (record) => new ComboDetector(record.config.combos),
      );
      // A IA recebe os combos ja interpretados pelo detector, com tokens e
      // animacao resolvidos.
      const ai = new AIController(detectors[1].combos, matchSetup.difficulty);
      const match = new GameStateManager();
      const cpuEnabled = matchSetup.mode !== 'versusPlayer';
      let matchEndTimer = 0;

      const markers = [playerMarker(PALETTE_HEX.player1), playerMarker(PALETTE_HEX.player2)];
      for (const marker of markers) world.addChild(marker);
      const effectsBehind = new Container();
      world.addChild(effectsBehind);
      for (const fighter of fighters) world.addChild(fighter.sprite);
      const effectsInFront = new Container();
      world.addChild(effectsInFront);
      const effects = new EffectManager({
        back: effectsBehind,
        front: effectsInFront,
        bounds: { left: 0, right: STAGE_WIDTH },
      });

      // O Pixi rasteriza o texto na hora de criar: sem esperar a fonte bitmap
      // carregar, o HUD sairia desenhado com a fonte de fallback.
      await document.fonts.ready;
      if (disposed) return;

      const hud = new Hud({
        width: STAGE_WIDTH,
        names: fighters.map((fighter) => fighter.config.name),
        labels: ['1P', cpuEnabled ? 'CPU' : '2P'],
      });
      instance.stage.addChild(hud.view);

      const debugLayer = new Graphics();
      debugLayer.visible = false;
      instance.stage.addChild(debugLayer);

      const overlay = debugText();
      overlay.position.set(16, STAGE_HEIGHT - 60);
      instance.stage.addChild(overlay);

      function startRound(round) {
        fighters.forEach((fighter, index) => {
          fighter.resetForRound(spawns[index], index === 0 ? 1 : -1);
        });
        for (const detector of detectors) detector.reset();
        effects.clear();
        ai.reset();
        hud.announce(`ROUND ${round} — FIGHT!`, 110);
      }

      function handleMatchEvent(event) {
        if (event.type === 'roundEnd') {
          hud.announce(ROUND_END_MESSAGE[event.reason], 140);
          if (event.winner !== null) {
            fighters[event.winner].playRoundEndPose(true);
            fighters[1 - event.winner].playRoundEndPose(false);
          }
          return;
        }
        if (event.type === 'roundStart') {
          startRound(event.round);
          return;
        }
        if (event.type === 'matchEnd') {
          const label = event.winner === 1 && cpuEnabled ? 'CPU' : `PLAYER ${event.winner + 1}`;
          hud.announce(`${label} VENCE`, 600);
          // Deixa o anuncio na tela antes de entregar o resultado para a UI.
          matchEndTimer = 150;
        }
      }

      function restartMatch() {
        match.reset();
        startRound(1);
      }

      // Atalhos de desenvolvimento, fora do input map do jogo. A selecao de
      // modo e dificuldade sai daqui quando os menus existirem.
      onDebugKey = (event) => {
        if (event.code === 'Backquote') debugLayer.visible = !debugLayer.visible;
        if (event.code === 'KeyR') restartMatch();
      };
      window.addEventListener('keydown', onDebugKey);

      input.attach();
      setStatus('ready');
      startRound(1);

      let elapsed = 0;
      instance.ticker.add((ticker) => {
        if (pausedRef.current) return;

        const delta = ticker.deltaTime;
        input.poll();

        if (matchEndTimer > 0) {
          matchEndTimer -= delta;
          if (matchEndTimer <= 0) {
            onMatchEndRef.current?.({ winner: match.matchWinner, wins: [...match.wins] });
          }
        }

        const fighting = match.phase === 'fighting';
        const now = performance.now();

        fighters[0].faceTowards(fighters[1].x);
        fighters[1].faceTowards(fighters[0].x);

        fighters.forEach((fighter, index) => {
          let command = { ...NEUTRAL_COMMAND };
          if (fighting) {
            command = index === 1 && cpuEnabled
              ? ai.update(fighter, fighters[0], delta)
              : buildCommand(input, index);
            // O buffer le a direcao ja relativa ao lado que o personagem
            // encara, por isso o flip precisa acontecer antes.
            command.combo = detectors[index].feed(command, fighter.facing, now);
          }
          fighter.update(command, delta);
        });

        effects.collect(fighters);

        if (fighting) {
          resolveBodyCollision(fighters[0], fighters[1]);
          resolveAttack(fighters[0], fighters[1]);
          resolveAttack(fighters[1], fighters[0]);
        }
        // Fora do combate os efeitos terminam a animacao, mas nao acertam
        // mais ninguem: o round ja foi decidido.
        effects.update(delta, fighting ? fighters : []);

        const event = match.update(fighters, delta);
        if (event) handleMatchEvent(event);

        fighters.forEach((fighter, index) => {
          fighter.syncSprite();
          markers[index].position.set(fighter.x, map.groundLevel);
        });

        hud.update(
          {
            fighters,
            timeRemaining: match.timeRemaining,
            roundNumber: match.roundNumber,
            wins: match.wins,
            suddenDeath: match.isSuddenDeath,
            roundsToWin: match.roundsToWin,
          },
          delta,
        );

        if (debugLayer.visible) drawBoxes(debugLayer, fighters, effects.effects);

        elapsed += ticker.deltaMS;
        if (elapsed >= 250) {
          elapsed = 0;
          const cpu = cpuEnabled ? `cpu ${ai.difficulty}` : 'dois jogadores';
          overlay.text = [
            `fps ${ticker.FPS.toFixed(0)}   ${cpu}   \` caixas   R reiniciar`,
            fighters.map((fighter, index) => `p${index + 1} ${fighter.state}`).join('   '),
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
      if (onDebugKey) window.removeEventListener('keydown', onDebugKey);
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
