import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {PNG} from 'pngjs';
import {ComboDetector} from '../src/systems/ComboDetector.js';
import {arena,assertConfigIntegrity,cast,command,hits,loadRecord,run,step,mash} from './helpers/world.js';
const record=loadRecord('humberto');
test('Humberto: novo atlas completo, transparente e efeitos em baixa resolução',()=>{
 assertConfigIntegrity(assert,record.config);
 const pages=record.config.sheets.map(f=>PNG.sync.read(readFileSync(new URL('../public/assets/characters/humberto/'+f,import.meta.url))));
 for(const def of [record.config,...Object.values(record.config.effects)])for(const [p,x,y,w,h,dx,dy]of def.atlas){assert.ok(x+w<=pages[p].width&&y+h<=pages[p].height);assert.ok(dx+w<=def.spriteGridSize.frameWidth&&dy+h<=def.spriteGridSize.frameHeight);}
 assert.equal(pages[2].width,256);assert.equal(pages[2].height,128);assert.ok(pages[2].data.some((v,i)=>i%4===3&&v===0));
 for(const file of Object.values(record.config.sounds))assert.ok(existsSync(new URL('../public/assets/characters/humberto/'+file,import.meta.url)));
 for(const old of ['sword67','auraFarm','holmium67'])assert.equal(record.config.animations[old],undefined);
 assert.equal(record.config.echo,undefined);
});
for(const [move,distance,count]of[['special1',300,1],['special2',50,1],['ionicPalm',60,1],['sixSeven',300,2]])for(const facing of[1,-1]){
 test(`Humberto ${move}: acerto, guarda, limpeza e orientação ${facing}`,()=>{
 const a=facing===1?400:850,b=a+distance*facing;
 const w=run(arena(record,a,b),cast(move),220);assert.equal(hits(w).length,count);assert.equal(w.effects.effects.length,0);
 const g=arena(record,a,b);for(let t=0;t<220;t++)step(g,t===0?cast(move):command(),command({[facing===1?'right':'left']:true}));
 assert.equal(hits(g).length,0);assert.ok(g.results.some(r=>r.outcome==='block'));assert.equal(g.effects.effects.length,0);
 });
}
test('Humberto: combustão não acerta de longe',()=>{assert.equal(hits(run(arena(record,400,750),cast('special2'),150)).length,0);});
test('Humberto: neutralização responde ao golpe durante a postura',()=>{
 const w=arena(record,600,640);step(w,cast('neutralize'));for(let i=0;i<7;i++)step(w);step(w,command(),cast('punch'));for(let i=0;i<80;i++)step(w);
 assert.ok(w.visited.has('neutralizeHit'));assert.equal(w.effects.effects.length,0);
 const idle=run(arena(record,400,700),cast('neutralize'),100);assert.equal(hits(idle).length,0);
});
test('Humberto: comandos espelhados e limite do super',()=>{
 for(const facing of[1,-1])assert.equal(new ComboDetector(record.config.combos).feed(command({special:true,[facing===1?'right':'left']:true}),facing,0).animation,'sixSeven');
 const w=arena(record,400,700);run(w,cast('sixSeven'),400);run(w,cast('sixSeven'),400);assert.equal(w.fighters[0].startAttack('sixSeven'),false);
});
test('Humberto: combo básico preservado',()=>{const w=mash(arena(record,600,640),'punch',{ticks:100,gap:4});assert.ok(w.visited.has('punch2'));});
