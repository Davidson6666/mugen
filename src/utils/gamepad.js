// Standard Gamepad API indices, shared by gameplay, menus and button legends.
export const PAD_BUTTONS = { punch:2, kick:1, special:3, jump:0, guard:4, moves:8, pause:9, up:12, down:13, left:14, right:15 };
export const PAD_LABELS = {
  xbox: ['A','B','X','Y','LB','RB','LT','RT','View','Menu'],
  playstation: ['✕','○','□','△','L1','R1','L2','R2','Create / Share','Options'],
  nintendo: ['B','A','Y','X','L','R','ZL','ZR','−','+'],
};
export function padFamily(id='') {
  if(/dualsense|dualshock|playstation|ps5|ps4|sony|054c/i.test(id))return 'playstation';
  if(/nintendo|switch|057e/i.test(id))return 'nintendo';
  return 'xbox';
}
export function padLabel(action,family='xbox') { return PAD_LABELS[family]?.[PAD_BUTTONS[action]] ?? action; }
export function buttonDown(pad,index) {
  const button=pad?.buttons?.[index];
  return Boolean(button?.pressed || button?.value>0.5);
}

export class GamepadSlots {
  constructor(){this.slots=[null,null];}
  assign(pads) {
    const connected=Array.from(pads??[]).filter(p=>p && p.connected!==false);
    this.slots=this.slots.map(slot=>connected.find(p=>p.index===slot?.index && p.id===slot?.id)??null);
    for(const pad of connected) {
      if(this.slots.some(slot=>slot?.index===pad.index))continue;
      const free=this.slots.indexOf(null);
      if(free>=0)this.slots[free]=pad;
    }
    return this.slots;
  }
}
const slots=new GamepadSlots();
export function connectedGamepads() {
  try{return slots.assign(typeof navigator!=='undefined' && navigator.getGamepads ? navigator.getGamepads():[]);}
  catch{return slots.assign([]);}
}
