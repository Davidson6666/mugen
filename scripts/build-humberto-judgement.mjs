import {readFileSync,writeFileSync} from 'node:fs';
import {PNG} from 'pngjs';

const dir='public/assets/characters/humberto';
const path=`${dir}/humberto_config.json`;
const c=JSON.parse(readFileSync(path));
const source=PNG.sync.read(readFileSync('assets-src/humberto/judgement-source.png'));
const sheet=new PNG({width:1280,height:700});
// Pack the generated poses with nearest-neighbour sampling at the existing
// 60-pixel body resolution. Preserve alpha; feet share the original baseline.
const edges=[0,0.255,0.46,0.70,1];
for(let i=0;i<8;i++) {
  const col=i%4,row=Math.floor(i/4);
  const x1=Math.round(edges[col]*source.width),x2=Math.round(edges[col+1]*source.width);
  const y1=Math.round(row*source.height/2),y2=Math.round((row+1)*source.height/2);
  let l=x2,r=x1,t=y2,b=y1;
  for(let y=y1;y<y2;y++)for(let x=x1;x<x2;x++)if(source.data[(y*source.width+x)*4+3]>128){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  const factor=Math.min(240/(source.height*0.365),304/(r-l+1));
  const w=Math.round((r-l+1)*factor/4)*4,h=Math.round((b-t+1)*factor/4)*4;
  const dx=Math.floor((320-w)/8)*4,dy=330-h;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const sx=Math.min(r,l+Math.floor(Math.floor(x/4)*4/factor));
    const sy=Math.min(b,t+Math.floor(Math.floor(y/4)*4/factor));
    const from=(sy*source.width+sx)*4,to=((row*350+dy+y)*sheet.width+col*320+dx+x)*4;
    sheet.data.set(source.data.subarray(from,from+4),to);
  }
}
writeFileSync(`${dir}/humberto_judgement.png`,PNG.sync.write(sheet));
// Native SVG effects follow the game's existing screen-overlay format.
// Integer coordinates and hard edges retain the pixel aesthetic.
const cells=[];
for(let f=0;f<8;f++) {
  let art='';
  if(f===0) art='<rect width="320" height="180" fill="#080d25" fill-opacity=".86"/>';
  else if(f===7) art='<path d="M4 91L152 86L161 62L165 85L316 89L165 94L160 119L156 94Z" fill="#a3efff"/><path d="M10 90H310" stroke="#fff" stroke-width="2"/>';
  else {
    for(let n=0;n<4+f;n++) {
      const x=(n*53+f*17)%280+20,y=(n*31+f*13)%140+20;
      const rise=(n%2?1:-1)*(30+(n*7)%45);
      art+=`<path d="M${x-65} ${y-rise}L${x+65} ${y+rise}" stroke="#483a9b" stroke-width="5"/><path d="M${x-65} ${y-rise}L${x+65} ${y+rise}" stroke="#77dfff" stroke-width="2"/><path d="M${x-50} ${y-rise*.77}L${x+50} ${y+rise*.77}" stroke="#efffff" stroke-width="1"/>`;
    }
  }
  cells.push(`<svg x="${f*320}" width="320" height="180" viewBox="0 0 320 180" overflow="hidden">${art}</svg>`);
}
writeFileSync(`${dir}/judgement_fx.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="2560" height="180" shape-rendering="crispEdges">${cells.join('')}</svg>\n`);
const page=(name)=>{let p=c.sheets.indexOf(name);if(p<0){p=c.sheets.length;c.sheets.push(name);}return p;};
const bodyPage=page('humberto_judgement.png'),fxPage=page('judgement_fx.svg');
let first=c.atlas.findIndex(a=>a[0]===bodyPage);
if(first<0){first=c.atlas.length;c.atlas.push(...Array.from({length:8},(_,i)=>[bodyPage,i%4*320,Math.floor(i/4)*350,320,350,0,0]));}
const anim=(frames,durations)=>({frames,durations,loop:false});
const effect=(frames,durations,extra={})=>({spriteGridSize:{frameWidth:320,frameHeight:180,baseline:90},atlas:Array.from({length:8},(_,i)=>[fxPage,i*320,0,320,180,0,0]),animation:anim(frames,durations),endWithMove:true,...extra});
c.effects.judgementNight=effect([0],[136],{cover:[1500,900],layer:'back',lifetime:136});
c.effects.judgementCuts=effect([1,2,3,4,5,6],[8,8,8,8,8,8],{
  cover:[1400,760],renderScale:12,lifetime:48,follow:'target',
  hits:[{from:0,until:5,every:6,count:8,damage:3,hitstun:36,push:0,box:{offsetX:0,offsetY:0,width:320,height:180}}],
});
c.effects.judgementEnd=effect([7,6,5],[5,5,10],{
  cover:[1400,760],renderScale:12,lifetime:20,follow:'target',
  hits:[{from:0,until:0,damage:16,hitstun:40,push:7,heavy:true,launch:{vx:6,vy:6},box:{offsetX:0,offsetY:0,width:320,height:180}}],
});
c.animations.judgementCutEnd={...anim([0,1,2,3,4,5,6,7].map(n=>first+n),[18,12,6,12,42,12,6,36]),cooldown:600,perRound:1,invulnerable:[30,120],float:true,
  events:[
    {at:0,vx:0,vy:0,sound:'judgementDraw',effect:{id:'judgementNight',target:'stage',offsetY:450}},
    {at:42,sound:'judgementCuts',effect:{id:'judgementCuts',target:'opponent',offsetY:150}},
    {at:108,sound:'judgementEnd',effect:{id:'judgementEnd',target:'opponent',offsetY:150}},
  ],
};
// Both forms use the same attack name, so its round limit cannot be bypassed
// by transforming. The teacher's normal appearance is used for the sword move.
c.combos=c.combos.filter(x=>!x.id.startsWith('judgementCutEnd'));
for(const mode of [null,'legendary'])c.combos.unshift({id:`judgementCutEnd${mode?'Legend':''}`,input:'↓←S',animation:'judgementCutEnd',...(mode?{mode}:{})});
c.moveList=c.moveList.filter(x=>!x.name.startsWith('Judgement Cut End'));
c.moveList.push({section:'Katana',name:'Judgement Cut End — 1 por round',input:'↓←S'});
c.assetVersion='humberto-judgement-v1';
// Original synthesized sounds, with deterministic noise and short fades.
for(const [name,seconds] of [['judgementDraw',.5],['judgementCuts',.8],['judgementEnd',.65]]){
  const rate=22050,n=Math.round(rate*seconds),wav=Buffer.alloc(44+n*2);
  wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*2,40);
  let seed=67;
  for(let i=0;i<n;i++){
    const t=i/rate,u=t/seconds;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1,fade=Math.min(1,i/160,(n-i)/300);
    const pulse=name==='judgementCuts'?Math.exp(-((t%.1)*45)):Math.exp(-u*5);
    const tone=Math.sin(2*Math.PI*(name==='judgementEnd'?95:1300)*t*(1-u*.4));
    wav.writeInt16LE(Math.round((noise*.35+tone*.25)*pulse*fade*24000),44+i*2);
  }
  writeFileSync(`${dir}/${name}.wav`,wav);c.sounds[name]=`${name}.wav`;
}
writeFileSync(path,JSON.stringify(c,null,2)+'\n');
console.log('Judgement Cut End: sprites, effects, sounds and config built.');
