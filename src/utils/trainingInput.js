// Historico de teclas da area de treino: cada aperto vira uma linha com a
// direcao (relativa ao lado que o lutador encara, como na lista de golpes) e
// os botoes. So entra linha nova quando algo muda.

const ARROWS = { '-1,-1': '↖', '0,-1': '↑', '1,-1': '↗', '-1,0': '←', '1,0': '→', '-1,1': '↙', '0,1': '↓', '1,1': '↘' };
const BUTTON_LETTERS = [['punch', 'P'], ['kick', 'K'], ['special', 'S']];

export function inputLabel(command, facing) {
  const right = command.right ? 1 : 0;
  const left = command.left ? 1 : 0;
  const horizontal = (right - left) * (facing === -1 ? -1 : 1);
  const vertical = (command.down ? 1 : 0) - (command.up || command.jump ? 1 : 0);
  const arrow = ARROWS[`${horizontal},${vertical}`] ?? '';
  const buttons = BUTTON_LETTERS.filter(([name]) => command[name]).map(([, letter]) => letter).join('+');
  return [arrow, buttons].filter(Boolean).join(' ');
}

export class InputHistory {
  constructor(size = 12) {
    this.size = size;
    this.entries = [];
    this.last = '';
  }

  // Devolve true se entrou linha nova.
  push(command, facing) {
    const label = inputLabel(command, facing);
    const pressedButton = BUTTON_LETTERS.some(([name]) => command[name]);
    if (!label || (label === this.last && !pressedButton)) {
      this.last = label;
      return false;
    }
    this.last = label;
    this.entries.unshift(label);
    if (this.entries.length > this.size) this.entries.length = this.size;
    return true;
  }
}

// Dano do combo no boneco: soma enquanto o combo dura. Quando o combo acaba
// o numero fica na tela ate o proximo comecar (ai zera). Guarda tambem o
// ultimo golpe e o maior combo da sessao.
export class ComboDamage {
  constructor() {
    this.current = 0;
    this.last = 0;
    this.best = 0;
    this.ended = true;
  }

  // damage: o quanto o boneco perdeu neste tick; comboCount: acertos seguidos
  // do atacante (zera quando o combo acaba).
  update(damage, comboCount) {
    if (damage > 0) {
      if (this.ended) this.current = 0;
      this.ended = false;
      this.current += damage;
      this.last = damage;
      this.best = Math.max(this.best, this.current);
    } else if (comboCount === 0) {
      this.ended = true;
    }
  }
}
