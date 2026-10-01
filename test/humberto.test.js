import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, run, step, mash } from './helpers/world.js';
const record=loadRecord('humberto');
test('Espada 67: dois cortes, guarda e comando nos dois lados',()=>{
 for(const facing of[1,-1]){
  const w=run(arena(record,facing===1?600:650,facing===1?650:600),cast('sword67'),80);
  assert.equal(hits(w).length,2);assert.equal(w.fighters[1].health,76);assert.equal(w.effects.effects.length,0);
  assert.equal(new ComboDetector(record.config.combos).feed(command({kick:true,[facing===1?'right':'left']:true}),facing,0).animation,'sword67');
 }
 const w=arena(record,600,650);
 for(let t=0;t<80;t++)step(w,t===0?cast('sword67'):command(),command({right:true}));
 assert.equal(hits(w).length,0);assert.equal(w.results.filter(x=>x.outcome==='block').length,2);
});
test('Humberto: atlas, reações, sons e referências completos',()=>{
 assertConfigIntegrity(assert,record.config);
 for(const file of [...record.config.sheets,...Object.values(record.config.sounds)])assert.ok(existsSync(new URL('../public/assets/characters/humberto/'+file,import.meta.url)),file);
 for(const name of ['launched','knockdown','getUp','hitAir','dashForward','dashBackward'])assert.ok(record.config.animations[name]);
 for(const a of record.config.atlas){assert.ok(a[5]>=0&&a[6]>=0);assert.ok(a[5]+a[3]<=320&&a[6]+a[4]<=300);}
});
for(const[move,count]of[['special1',1],['special2',4],['holmium67',7]]){
 test(`Humberto: ${move} acerta, pode ser defendido e termina`,()=>{
  const w=run(arena(record,400,700),cast(move),230);
  assert.equal(hits(w).length,count);assert.equal(w.effects.effects.length,0);
  const guard=arena(record,400,700);
  for(let t=0;t<230;t++)step(guard,t===0?cast(move):command(),command({right:true}));
  assert.equal(hits(guard).length,0);assert.ok(guard.results.some(r=>r.outcome==='block'));
 });
}
test('Humberto: aura aplica eco, expira e não causa recursão',()=>{
 const w=arena(record,400,700);run(w,cast('auraFarm'),65);
 assert.ok(w.fighters[0].buffs.chemicalAura>0);
 run(w,cast('special1'),100);assert.ok(hits(w).length>=2);
 for(let t=0;t<300;t++)step(w);
 assert.equal(w.fighters[0].buffs.chemicalAura,undefined);assert.equal(w.effects.effects.length,0);
});
test('Humberto: combo de socos conecta',()=>{
 const w=mash(arena(record,600,640),'punch',{ticks:100,gap:4});assert.ok(w.visited.has('punch2'));assert.ok(hits(w).length>=2);
});
test('Humberto: comandos espelhados e super limitado',()=>{
 for(const facing of[1,-1]){
  assert.equal(new ComboDetector(record.config.combos).feed(command({special:true,[facing===1?'left':'right']:true}),facing,0).animation,'auraFarm');
  assert.equal(new ComboDetector(record.config.combos).feed(command({special:true,[facing===1?'right':'left']:true}),facing,0).animation,'holmium67');
 }
 const w=arena(record,400,700);run(w,cast('holmium67'),600);run(w,cast('holmium67'),600);assert.equal(w.fighters[0].startAttack('holmium67'),false);
});
