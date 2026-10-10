import {readFileSync,writeFileSync} from 'node:fs';
import {PNG} from 'pngjs';
const dir='public/assets/characters/humberto',path=`${dir}/humberto_config.json`;
const c=JSON.parse(readFileSync(path));
const source=PNG.sync.read(readFileSync('assets-src/humberto/combat-poses-alpha.png'));
const fxSource=PNG.sync.read(readFileSync('assets-src/humberto/combat-fx-source.png'));
const poses=new PNG({width:1280,height:1050}),fx=new PNG({width:256,height:256});
const regions=[];
const rowEdges=[0,265/1024,532/1024,788/1024].map(y=>Math.round(y*source.height));
// First three rows are unarmed attacks; katana keeps its full existing sheet.
for(let i=0;i<12;i++){
 const col=i%4,row=Math.floor(i/4),x0=Math.round(col*source.width/4);
 // Keep the raised sword from the unused fourth row out of the palm crop.
 const x1=Math.round((i===9?696/1536:(col+1)/4)*source.width);
 const y0=rowEdges[row],y1=rowEdges[row+1];
 let l=x1,r=x0,t=y1,b=y0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(source.data[(y*source.width+x)*4+3]>160){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
 regions.push({l,r,t,b});
}
const factor=60/Math.max(...regions.map(({t,b})=>b-t+1));
for(let i=0;i<12;i++){
 const {l,r,t,b}=regions[i],w=Math.round((r-l+1)*factor)*4,h=Math.round((b-t+1)*factor)*4;
 const dx=Math.floor((320-w)/8)*4,dy=330-h;
 if(dx<0)throw new Error(`Pose ${i} wider than cell`);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const sx=Math.min(r,l+Math.floor(Math.floor(x/4)/factor)),sy=Math.min(b,t+Math.floor(Math.floor(y/4)/factor));
   const from=(sy*source.width+sx)*4,to=((Math.floor(i/4)*350+dy+y)*1280+i%4*320+dx+x)*4;
   poses.data.set(source.data.subarray(from,from+4),to);
 }
}
for(let y=0;y<256;y++)for(let x=0;x<256;x++){
 const sx=Math.floor(x*fxSource.width/256),sy=Math.floor(y*fxSource.height/256),from=(sy*fxSource.width+sx)*4;
 fx.data.set(fxSource.data.subarray(from,from+4),(y*256+x)*4);
}
writeFileSync(`${dir}/humberto_combat_v2.png`,PNG.sync.write(poses));
writeFileSync(`${dir}/combat_fx_v2.png`,PNG.sync.write(fx));
const page=name=>{let p=c.sheets.indexOf(name);if(p<0){p=c.sheets.length;c.sheets.push(name);}return p;};
const p=page('humberto_combat_v2.png'),f=page('combat_fx_v2.png');
let first=c.atlas.findIndex(a=>a[0]===p);
if(first<0){first=c.atlas.length;c.atlas.push(...Array.from({length:12},(_,i)=>[p,i%4*320,Math.floor(i/4)*350,320,350,0,0]));}
const use=(name,frames,durations)=>{c.animations[name].frames=frames.map(i=>first+i);c.animations[name].durations=durations;};
use('punch',[0,1,2,3],[5,4,4,5]);use('punch2',[0,2,1,3],[4,4,4,6]);
use('kick',[4,5,6,7],[7,5,6,6]);
use('ionicPalm',[8,9,10,11],[8,6,4,12]);
use('special2',[8,9,10,11],[14,4,8,20]);
use('neutralizeHit',[8,9,10,11],[4,8,4,10]);
use('kiBlast',[8,9,10,11],[9,7,6,8]);
const grid={frameWidth:64,frameHeight:64,baseline:32};
const atlas=Array.from({length:16},(_,i)=>[f,i%4*64,Math.floor(i/4)*64,64,64,0,0]);
function reskin(id,frames,durations){const d=c.effects[id];d.spriteGridSize=grid;d.atlas=atlas;d.animation={frames,durations,loop:d.animation.loop};}
reskin('splash',[0,1,2,3],[3,4,4,5]);
reskin('spark',[0,1,3],[3,3,4]);
reskin('combustion',[4,5,6,7],[3,5,5,4]);
reskin('neutralBurst',[0,1,2,3],[3,4,4,5]);
reskin('kiBurst',[0,1,2,3],[3,4,4,5]);
reskin('finishFlash',[12,13,14,15],[2,3,3,2]);
for(const id of ['kiOrb','legendaryOrb','legendaryCannon'])reskin(id,[0,1,2,1],[3,3,3,3]);
c.effects.combatTrail={spriteGridSize:grid,atlas,animation:{frames:[12,13,14,15],durations:[2,2,2,3],loop:false},renderScale:2.1,lifetime:9,endWithMove:true};
c.effects.chemicalCharge={spriteGridSize:grid,atlas,animation:{frames:[0,1,0],durations:[3,3,3],loop:false},renderScale:1.8,lifetime:9,endWithMove:true};
c.effects.fireBreath={spriteGridSize:grid,atlas,animation:{frames:[4,5,6,7],durations:[3,3,3,3],loop:false},renderScale:2.5,lifetime:12,endWithMove:true,follow:'owner'};
c.effects.chemicalImpact={spriteGridSize:grid,atlas,animation:{frames:[0,1,2,3],durations:[3,4,4,5],loop:false},renderScale:3.3,lifetime:16};
c.effects.heavyImpact={spriteGridSize:grid,atlas,animation:{frames:[12,13,14,15],durations:[2,3,4,5],loop:false},renderScale:3.4,lifetime:14};
for(const id of ['six','seven'])c.effects[id].onHitSpawn={id:'heavyImpact'};
c.effects.flask.onHitSpawn={id:'chemicalImpact'};
function add(name,event){const a=c.animations[name];if(!a)return;a.events??=[];a.events=a.events.filter(e=>e.effect?.id!==event.effect.id);a.events.push(event);a.events.sort((a,b)=>a.at-b.at);}
for(const prefix of ['', 'legend_']) {
 for(const [name,at,y,x]of [['punch',5,175,220],['punch2',4,175,220],['kick',7,150,260],['uppercut',6,235,180]])add(prefix+name,{at,effect:{id:'combatTrail',offsetX:x,offsetY:y}});
 for(const [name,at]of [['ionicPalm',0],['kiBlast',0],['special2',3]])add(prefix+name,{at,effect:{id:'chemicalCharge',offsetX:55,offsetY:140}});
}
add('greatFireball',{at:22,effect:{id:'fireBreath',offsetX:110,offsetY:220}});
// The cutting storm is now animated hand-painted arcs around the victim.
// Its combat timing and damage stay unchanged; only the display changes.
reskin('judgementCuts',[8,9,10,8,9,10],[8,8,8,8,8,8]);
Object.assign(c.effects.judgementCuts,{cover:[680,480],renderScale:60});
for(const h of c.effects.judgementCuts.hits)h.box={offsetX:0,offsetY:14,width:64,height:36};
reskin('judgementEnd',[9,10,11],[5,5,10]);
Object.assign(c.effects.judgementEnd,{cover:[820,560],renderScale:60});
for(const h of c.effects.judgementEnd.hits)h.box={offsetX:0,offsetY:14,width:64,height:36};
c.effects.swordDraw={spriteGridSize:grid,atlas,animation:{frames:[8,9,11],durations:[3,3,4],loop:false},renderScale:6,lifetime:10,endWithMove:true};
add('judgementCutEnd',{at:30,effect:{id:'swordDraw',offsetX:160,offsetY:150}});
// Knockback launch schema uses vx/vy. Repair the older Humberto moves too.
for(const a of Object.values(c.animations))for(const h of a.hits??[])if(h.launch?.x!==undefined)h.launch={vx:h.launch.x,vy:Math.abs(h.launch.y)};
c.assetVersion='humberto-combat-v2';
writeFileSync(path,JSON.stringify(c,null,2)+'\n');
console.log('Combat animations and effects upgraded.');
