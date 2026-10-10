import {readFileSync,writeFileSync} from 'node:fs';
import {PNG} from 'pngjs';
const dir='public/assets/characters/humberto';
const configPath=`${dir}/humberto_config.json`;
const c=JSON.parse(readFileSync(configPath));
const src=PNG.sync.read(readFileSync('assets-src/humberto/fireball-source.png'));
const poses=new PNG({width:1280,height:350}),fx=new PNG({width:256,height:128});
// Generated rows have extra headroom above the poses; use their inspected
// boundaries instead of cutting feet at a mathematical one-third division.
const rows=[0,.40,.68,1].map(y=>Math.round(y*src.height));
const bounds=[];
for(let i=0;i<4;i++){
  const x0=Math.floor(i*src.width/4),x1=Math.floor((i+1)*src.width/4),y1=rows[1];
  let l=x1,r=x0,t=y1,b=0;
  for(let y=0;y<y1;y++)for(let x=x0;x<x1;x++)if(src.data[(y*src.width+x)*4+3]>128){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  bounds.push({l,r,t,b});
}
const factor=60/Math.max(...bounds.map(({t,b})=>b-t+1));
for(let i=0;i<4;i++){
  const {l,r,t,b}=bounds[i],w=Math.round((r-l+1)*factor),h=Math.round((b-t+1)*factor);
  const dx=Math.floor((320-w*4)/8)*4,dy=330-h*4;
  for(let y=0;y<h*4;y++)for(let x=0;x<w*4;x++){
    const sx=Math.min(r,l+Math.floor(Math.floor(x/4)/factor)),sy=Math.min(b,t+Math.floor(Math.floor(y/4)/factor));
    const from=(sy*src.width+sx)*4,to=((dy+y)*poses.width+i*320+dx+x)*4;
    poses.data.set(src.data.subarray(from,from+4),to);
  }
}
for(let i=0;i<8;i++)for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const row=1+Math.floor(i/4);
  const sx=Math.floor((i%4+x/64)*src.width/4),sy=rows[row]+Math.floor(y/64*(rows[row+1]-rows[row]));
  const from=(sy*src.width+sx)*4,to=((Math.floor(i/4)*64+y)*256+i%4*64+x)*4;
  fx.data.set(src.data.subarray(from,from+4),to);
}
writeFileSync(`${dir}/humberto_fireball.png`,PNG.sync.write(poses));
writeFileSync(`${dir}/fireball_fx.png`,PNG.sync.write(fx));
const page=name=>{let p=c.sheets.indexOf(name);if(p<0){p=c.sheets.length;c.sheets.push(name);}return p;};
const bodyPage=page('humberto_fireball.png'),fxPage=page('fireball_fx.png');
let first=c.atlas.findIndex(a=>a[0]===bodyPage);
if(first<0){first=c.atlas.length;c.atlas.push(...Array.from({length:4},(_,i)=>[bodyPage,i*320,0,320,350,0,0]));}
const atlas=Array.from({length:8},(_,i)=>[fxPage,i%4*64,Math.floor(i/4)*64,64,64,0,0]);
const grid={frameWidth:64,frameHeight:64,baseline:32};
c.effects.greatFireball={spriteGridSize:grid,atlas,renderScale:5,
  animation:{frames:[0,1,2,3],durations:[5,5,5,5],loop:true},
  velocityX:20,lifetime:170,endAtWall:true,destroyOnHit:true,
  hits:[{from:0,until:3,damage:22,hitstun:30,push:6,heavy:true,box:{offsetX:15,offsetY:12,width:39,height:40}}],
  onHitSpawn:{id:'fireballImpact'},
};
c.effects.fireballImpact={spriteGridSize:grid,atlas,renderScale:5.5,
  animation:{frames:[4,5,6,7],durations:[4,5,6,7],loop:false},lifetime:22,
};
c.animations.greatFireball={frames:[first,first+1,first+2,first+3],durations:[12,10,18,14],loop:false,cooldown:180,
  events:[{at:0,sound:'fireballInhale',stopWithMove:true},{at:22,sound:'fireballBreath',effect:{id:'greatFireball',offsetX:195,offsetY:210}}],
};
c.combos=c.combos.filter(x=>!x.id.startsWith('greatFireball'));
for(const mode of [null,'legendary'])c.combos.unshift({id:`greatFireball${mode?'Legend':''}`,input:'↓→P',animation:'greatFireball',...(mode?{mode}:{})});
c.moveList=c.moveList.filter(x=>!x.name.startsWith('Katon'));
c.moveList.push({section:'Ninjutsu',name:'Katon — Grande Bola de Fogo',input:'↓→P'});
c.assetVersion='humberto-fireball-v1';
for(const [name,seconds]of [['fireballInhale',.36],['fireballBreath',.8]]){
 const rate=22050,n=Math.round(rate*seconds),wav=Buffer.alloc(44+n*2);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*2,40);
 let seed=42,low=0;
 for(let i=0;i<n;i++){
   const t=i/rate,u=i/n;seed=(Math.imul(seed,1664525)+1013904223)>>>0;low=low*.7+(seed/2147483648-1)*.3;
   const envelope=name==='fireballInhale'?Math.sin(Math.PI*u)*.3:Math.exp(-u*3)*Math.min(1,i/250);
   const value=(low*.85+Math.sin(2*Math.PI*70*t)*.15)*envelope*Math.min(1,(n-i)/250);
   wav.writeInt16LE(Math.round(value*28000),44+i*2);
 }
 writeFileSync(`${dir}/${name}.wav`,wav);c.sounds[name]=`${name}.wav`;
}
writeFileSync(configPath,JSON.stringify(c,null,2)+'\n');
console.log('Katon integrated.');
