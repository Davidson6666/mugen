import { useEffect } from 'react';
import { useMenu } from '../context/MenuContext.js';
import { useGame } from '../context/GameContext.js';
import { useAchievements } from '../context/AchievementsContext.js';
import { useMenuInput } from '../utils/useMenuInput.js';
import { PALETTE } from '../utils/palette.js';
import characters from '../data/characters.json';
import FighterSprite from './FighterSprite.jsx';
import { Capsule, DiagonalBackdrop, Label, Pedestal, Spotlight } from './cvs2.jsx';
import { useAccents } from '../utils/useAccents.js';
import creditsRaw from '../../CREDITS.md?raw';

// Creditos que rolam no fim da campanha, tirados do proprio CREDITS.md: cada
// "## Nome" vira um titulo e as linhas de "- autor: **nome**" (ou, sem lista,
// o autor citado na frase de creditos do pacote) viram as linhas dele.
function parseCredits(markdown) {
  return markdown.split(/^## /m).slice(1).map((block) => {
    const [title, ...rest] = block.split('\n');
    const body = rest.join('\n');
    let lines = body.split('\n').filter((line) => line.startsWith('- ')).map((line) => line.slice(2).replace(/\*\*/g, '').replace(/`/g, ''));
    if (lines.length === 0) {
      const match = body.match(/[Cc]réditos do próprio pacote[^:]*:\s*\*\*(.+?)\*\*/);
      if (match) lines = [match[1]];
    }
    return { title: title.trim(), lines };
  }).filter((entry) => entry.lines.length > 0);
}
const CREDITS = parseCredits(creditsRaw);

const STAND = [230, 560];

// Fim do Modo Historia: mesma linguagem visual do ResultScreen, sem
// diferenciar por personagem (nenhum deles tem um final proprio).
export default function StoryEndingScreen() {
  const { resetTo } = useMenu();
  const { setup, result } = useGame();
  const { report } = useAchievements();

  const winner = characters.find((entry) => entry.id === setup.characters[0]) ?? characters[0];
  const [accent] = useAccents([winner]);

  // Chegar aqui e ter vencido a campanha inteira, inclusive o Ensina GOD: e o
  // que da a conquista que libera ele.
  const championCharacter = setup.characters[0];
  useEffect(() => {
    report({
      mode: 'story',
      won: true,
      characterId: championCharacter,
      storyComplete: true,
      // A luta final da campanha nao passa pela tela de resultado, entao os
      // numeros dela sao contados aqui.
      untouched: Boolean(result?.perfect?.[0]),
      comeback: Boolean(result?.comeback),
      bestCombo: result?.bestCombo?.[0] ?? 0,
      shutout: (result?.wins?.[1] ?? 1) === 0,
    });
    // So no fim da campanha, uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMenuInput({ onConfirm: () => resetTo('mainMenu'), onCancel: () => resetTo('mainMenu') });

  return (
    <div className="cvs2-screen">
      <svg className="cvs2-svg" viewBox="0 0 1280 720">
        <DiagonalBackdrop lattice={false} topWord="" bottomWord="" />

        <Spotlight id="ending" x={STAND[0]} y={STAND[1]} color={accent ?? PALETTE.fieldYellow} />
        <g className="vs-slam" style={{ animationDelay: '150ms' }}>
          <Label x={48} y={130} size={90} fill={PALETTE.fieldYellow} stroke={16} display>CAMPEAO!</Label>
        </g>
        <g className="menu-title menu-title--bottom">
          <Label x={48} y={220} size={44} weight={800} stroke={8}>MODO HISTORIA CONCLUIDO</Label>
        </g>

        <Pedestal x={STAND[0]} y={STAND[1]} ring />

        <g className="menu-opt" style={{ '--order': 3 }}>
          <Capsule x={48} y={280} width={620} size={34}>
            {`${winner.name.toUpperCase()} VENCEU TODAS AS LUTAS`}
          </Capsule>
        </g>

        <Label x={1240} y={700} size={22} weight={600} anchor="end" stroke={5}>J OU K VOLTA AO MENU</Label>
      </svg>

      <div className="credits-roll" aria-label="Creditos">
        <div className="credits-roll__track">
          <p className="credits-roll__title">RUPTURA ARENA</p>
          <p className="credits-roll__section">OBRIGADO POR JOGAR</p>
          {CREDITS.map((entry) => (
            <div key={entry.title} className="credits-roll__block">
              <p className="credits-roll__section">{entry.title.toUpperCase()}</p>
              {entry.lines.map((line) => <p key={line} className="credits-roll__line">{line}</p>)}
            </div>
          ))}
        </div>
      </div>

      <div className="cvs2-sprite" style={{ left: STAND[0], top: STAND[1] }}>
        <div className="cvs2-sprite__inner cvs2-sprite__inner--left">
          <FighterSprite entry={winner} animation="victoryPose" />
        </div>
      </div>
    </div>
  );
}
