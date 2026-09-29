export const PRESS_ACTIONS=['jump','punch','kick','special'];
export function buildCommand(input,player) {
  const held=input.state(player);
  const command={left:held.left,right:held.right,up:held.up,down:held.down,guard:held.guard,holding:{
    punch:held.punch,kick:held.kick,special:held.special,
  }};
  for(const action of PRESS_ACTIONS)command[action]=input.pressed(player,action);
  command.jump=command.jump||input.pressed(player,'up');
  return command;
}
