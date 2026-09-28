import { buttonDown } from './gamepad.js';

// A new screen must not consume the press that opened it. Also applies when
// a controller reconnects with a button or stick already held.
export class MenuInputGate {
  constructor() { this.devices = new Map(); }

  ready(player, pad) {
    const identity = pad ? `${pad.index}:${pad.id}` : null;
    let state = this.devices.get(player);
    if (!state || state.identity !== identity) {
      state = { identity, ready: false };
      this.devices.set(player, state);
    }
    if (!pad) return false;
    if (!state.ready) {
      const pressed = [0, 1, 12, 13, 14, 15].some(index => buttonDown(pad, index));
      const tilted = pad.axes.slice(0, 2).some(value => Math.abs(value) > 0.5);
      state.ready = !pressed && !tilted;
      return false;
    }
    return true;
  }
}
