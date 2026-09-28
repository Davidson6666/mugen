import { readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const dir='public/assets/characters/ensina_god';
const anim=(frames,durations,loop=false)=>({frames,durations,loop});

// Pack the generated costume separately: normal movement keeps its own sheet.
export function configureAtomicShadow(config) {
  const source=PNG.sync.read(readFileSync('assets-src/ensina-god/shadow-costume-source.png'));
  const output=new PNG({width:1280,height:600});
  const scale=0.60;
  for(let i=0;i<8;i++) {
    const x1=Math.round(i%4*source.width/4),x2=Math.round((i%4+1)*source.width/4);
    const y1=Math.round(Math.floor(i/4)*source.height/2),y2=Math.round((Math.floor(i/4)+1)*source.height/2);
    let left=x2,right=x1,top=y2,bottom=y1;
    for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++) {
      if(source.data[(y*source.width+x)*4+3]<24)continue;
      left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    }
    const width=Math.round((right-left+1)*scale),height=Math.round((bottom-top+1)*scale);
    const dx=Math.round((320-width)/2),dy=280-height;
    if(dx<0||dy<0)throw new Error(`Atomic costume ${i} exceeds cell`);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
      const from=((top+Math.min(bottom-top,Math.floor(y/scale)))*source.width+left+Math.min(right-left,Math.floor(x/scale)))*4;
      const to=((Math.floor(i/4)*300+dy+y)*output.width+i%4*320+dx+x)*4;
      output.data.set(source.data.subarray(from,from+4),to);
    }
  }
  writeFileSync(`${dir}/ensina_shadow_costume.png`,PNG.sync.write(output));
  const costumePage=config.sheets.push('ensina_shadow_costume.png')-1;
  const first=config.atlas.length;
  config.atlas.push(...Array.from({length:8},(_,i)=>[costumePage,i%4*320,Math.floor(i/4)*300,320,300,0,0]));
  const fxPage=config.sheets.push('ensina_atomic_pillar.png')-1;
  const fx=PNG.sync.read(readFileSync(`${dir}/ensina_atomic_pillar.png`));
  const cell=Math.ceil(Math.max(fx.width,fx.height)/4);
  const effect=(cells,durations,extra={})=>({
    spriteGridSize:{frameWidth:cell,frameHeight:cell,baseline:cell/2},
    atlas:cells.map(i=>{const x=Math.round(i%4*fx.width/4),y=Math.round(Math.floor(i/4)*fx.height/4);return [fxPage,x,y,Math.round((i%4+1)*fx.width/4)-x,Math.round((Math.floor(i/4)+1)*fx.height/4)-y,0,0];}),
    animation:anim(cells.map((_,i)=>i),durations),...extra,
  });
  const release=333,total=423;
  config.animations.iAmAtomic={
    ...anim(Array.from({length:8},(_,i)=>first+i),[18,30,60,90,135,18,36,36]),
    cooldown:600,float:true,invulnerable:[0,total],
    events:[
      {at:0,vx:0,vy:0,sound:'atomicCharge',stopWithMove:true,effect:{id:'atomicNight',target:'stage',offsetY:400}},
      {at:0,effect:{id:'atomicTransform',offsetY:130}},
      {at:18,effect:{id:'atomicCharge',offsetY:140}},
      {at:30,sound:'atomicVoice',stopWithMove:true},
      {at:90,effect:{id:'atomicCircle',offsetY:20}},
      {at:release,sound:'atomicBlast',effect:{id:'atomicFlash',target:'stage',offsetY:350}},
      {at:release,effect:{id:'atomicBlast',target:'stage',offsetY:1250}},
    ],
  };
  config.effects.atomicTransform=effect([12,13,14,15],[4,5,5,4],{follow:'owner',renderScale:1.6,layer:'back',lifetime:18,endWithMove:true});
  config.effects.atomicCharge=effect([0,1,2,3],[60,84,96,75],{follow:'owner',renderScale:2,layer:'back',lifetime:release-18,endWithMove:true});
  config.effects.atomicCircle=effect([12,13,14,15],[60,60,60,63],{follow:'owner',renderScale:2.3,layer:'back',lifetime:release-90,endWithMove:true});
  config.effects.atomicCircle.spriteGridSize.baseline=cell*0.9;
  config.effects.atomicCharge.spriteGridSize.baseline=cell*0.72;
  config.effects.atomicBlast=effect([4,5,6,7,8,9,10,11],[4,5,9,18,16,14,12,12],{
    cover:[1450,1100],lifetime:90,guaranteed:true,instantKill:true,noEcho:true,
    hits:[{from:2,until:3,damage:100,hitstun:60,push:0,heavy:true,box:{offsetX:0,offsetY:0,width:cell,height:cell}}],
  });
  const flashPage=config.sheets.push('ensina_atomic_flash.svg')-1;
  config.effects.atomicFlash={
    spriteGridSize:{frameWidth:512,frameHeight:256,baseline:128},
    atlas:Array.from({length:4},(_,i)=>[flashPage,i*512,0,512,256,0,0]),
    animation:anim([0,1,2,3],[1,1,2,2]),cover:[1600,1000],lifetime:6,
  };
  config.effects.atomicNight.animation=anim([0],[total]);
  config.effects.atomicNight.lifetime=total;
  config.assetVersion='ensina-shadow-video-v2';
}
