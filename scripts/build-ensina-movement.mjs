// Pack generated artwork without repainting it; preserve alpha and align feet.
// Sources and generation prompts: assets-src/ensina-god and character ART.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { configureAtomicShadow } from './lib/ensina-atomic-shadow.mjs';
const dir = 'public/assets/characters/ensina_god';
const read = (path) => PNG.sync.read(readFileSync(path));
const motion = read('assets-src/ensina-god/movement-source-v2.png');
const walk = read('assets-src/ensina-god/walk-source.png');
const sheet = new PNG({ width: 1280, height: 1200 });
function pack(source, region, index, factor, floor = 280) {
  const [x1, y1, x2, y2] = region;
  let left = x2, top = y2, right = x1, bottom = y1;
  for (let y = y1; y < y2; y++) for (let x = x1; x < x2; x++) {
    if (source.data[(y * source.width + x) * 4 + 3] < 24) continue;
    left = Math.min(left, x); top = Math.min(top, y);
    right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  const width = Math.round((right - left + 1) * factor);
  const height = Math.round((bottom - top + 1) * factor);
  const dx = Math.round((320 - width) / 2), dy = floor - height;
  if (dx < 0 || dy < 0) throw new Error(`Sprite ${index} exceeds cell`);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const from = ((top + Math.min(bottom-top, Math.floor(y/factor))) * source.width + left + Math.min(right-left, Math.floor(x/factor))) * 4;
    const to = ((Math.floor(index/4)*300 + dy+y)*sheet.width + (index%4)*320 + dx+x)*4;
    sheet.data.set(source.data.subarray(from, from+4), to);
  }
}
for (let i=0;i<4;i++) pack(walk, [i*543,0,(i+1)*543,724], i, 242/588);
// Alpha bounds retain each complete pose, including the raised energy blade.
const rows=[0,360,660,1086];
const regions=Array.from({length:12},(_,i)=>[(i%4)*362,rows[Math.floor(i/4)],(i%4+1)*362,rows[Math.floor(i/4)+1]]);
regions.forEach((r,i)=>pack(motion,r,i+4,0.78,i<4 ? 250 : 280));
writeFileSync(`${dir}/ensina_movement.png`, PNG.sync.write(sheet));
const path = `${dir}/ensina_god_config.json`;
const config = JSON.parse(readFileSync(path));
config.sheets = config.sheets.slice(0,4).concat('ensina_movement.png','ensina_atomic_fx.png');
config.atlas = config.atlas.slice(0,24).concat(Array.from({length:16},(_,i)=>[4,(i%4)*320,Math.floor(i/4)*300,320,300,0,0]));
const anim = (frames,durations,loop=false) => ({frames,durations,loop});
Object.assign(config.animations, {
  walkForward: anim([24,25,26,27],[6,6,6,6],true),
  walkBackward: anim([27,26,25,24],[7,7,7,7],true),
  airJump: anim([28,29,30,31],[3,4,3,5]),
  jumpFall: anim([31],[8],true),
  falling: anim([34],[8],true),
  launched: anim([35,34],[6,12]),
  hitReaction: anim([35],[14]), hitAir: anim([35,34],[7,10]),
  knockdown: anim([15],[28]), getUp: anim([4,0],[8,8]),
});
for(const name of ['dashForward','dashBackward','airDashForward','airDashBackward']) {
  config.animations[name] = {
    ...anim([32,33,32],[3,9,4]),
    dash:{speed:name.includes('Backward')?23:30,moveFrom:0,moveUntil:1,invulnerableFrom:0,invulnerableUntil:1},
    effect:{id:'atomicStep',offsetY:10,scale:[1.4,0.5],lifetime:16},
  };
}
config.airJumpEffect = {id:'atomicStep',offsetY:0,scale:0.75};
config.animations.iAmAtomic = {
  ...anim([36,37,38,39],[36,54,150,78]),
  cooldown:600, float:true, invulnerable:[0,318],
  events:[
    {at:0,vx:0,vy:0,sound:'atomicCharge',stopWithMove:true,effect:{id:'atomicNight',target:'stage',offsetY:400}},
    {at:0,effect:{id:'atomicCharge',offsetY:140}},
    {at:30,sound:'atomicVoice',stopWithMove:true},
    {at:36,effect:{id:'atomicCircle',offsetY:0}},
    {at:240,sound:'atomicBlast',effect:{id:'atomicBlast',target:'stage',offsetY:350}},
  ],
};
const fx = read(`${dir}/ensina_atomic_fx.png`);
const effect = (cells,durations,extra={}) => ({
  spriteGridSize:{frameWidth:320,frameHeight:320,baseline:160},
  atlas:cells.map(i=>{const x=Math.round(i%4*fx.width/4),y=Math.round(Math.floor(i/4)*fx.height/4);return [5,x,y,Math.round((i%4+1)*fx.width/4)-x,Math.round((Math.floor(i/4)+1)*fx.height/4)-y,3,3];}),
  animation:anim(cells.map((_,i)=>i),durations), ...extra,
});
config.effects.atomicCharge=effect([0,1,2,3],[24,36,60,120],{follow:'owner',renderScale:1.6,layer:'back',lifetime:240,endWithMove:true});
config.effects.atomicCircle=effect([12,13,14,15],[48,48,48,60],{follow:'owner',renderScale:2,layer:'back',lifetime:204,endWithMove:true});
config.effects.atomicStep=effect([12,13,14,15],[3,3,4,6],{lifetime:16});
config.effects.atomicBlast=effect([4,5,6,7,8,9,10,11],[4,5,7,12,12,12,12,14],{
  cover:[1400,850],lifetime:78,guaranteed:true,instantKill:true,noEcho:true,
  hits:[{from:2,until:3,damage:100,hitstun:60,push:0,heavy:true,box:{offsetX:0,offsetY:0,width:320,height:320}}],
});
// Reuse the native SVG background format with a dedicated violet treatment.
config.sheets.push('ensina_atomic_stage.svg');
config.effects.atomicNight={
  spriteGridSize:{frameWidth:512,frameHeight:256,baseline:128},
  atlas:[[6,0,0,512,256,0,0]],animation:anim([0],[318]),
  cover:[1600,1000],layer:'back',lifetime:318,
};
config.combos=config.combos.filter(c=>c.id!=='iAmAtomic');
config.combos.unshift({id:'iAmAtomic',input:'↓→S',animation:'iAmAtomic'});
config.moveList=config.moveList.filter(c=>!['Movimento','Finalizador absoluto'].includes(c.section));
config.moveList.push(
  {section:'Movimento',name:'Pulo duplo — aperte novamente no ar',input:'↑↑'},
  {section:'Movimento',name:'Dash / dash aéreo',input:'→→'},
  {section:'Movimento',name:'Recuo / recuo aéreo',input:'←←'},
  {section:'Finalizador absoluto',name:'I AM ATOMIC — hit kill inevitável',input:'↓→S'},
);
Object.assign(config.sounds,{atomicCharge:'atomic-charge.wav',atomicVoice:'atomic-voice.wav',atomicBlast:'atomic-blast.wav'});
config.assetVersion='ensina-atomic-20260928';
configureAtomicShadow(config);
writeFileSync(path,`${JSON.stringify(config,null,2)}\n`);
console.log('Packed movement sprites and configured I AM ATOMIC.');
