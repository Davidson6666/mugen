import test from 'node:test';
import assert from 'node:assert/strict';
import { arena, cast, command, hits, loadRecord, run, step } from './helpers/world.js';
import { ComboDetector } from '../src/systems/ComboDetector.js';
const record=loadRecord('ensina_god');
for(const [move,count] of [['crimsonEclipse',7],['blackHole',6],['meteorFall',1]]) {
 test(`Ensina cósmico: ${move} acerta e limpa os efeitos`,()=>{
  const world=run(arena(record,400,850),cast(move),240);
  assert.equal(hits(world).length,count);
  assert.equal(world.effects.effects.length,0);
 });
}
for(const [x,y] of [[150,1100],[1100,150]]) {
 test(`Eclipse inevitável: distância, guarda, invulnerabilidade e esquiva (${x})`,()=>{
  const world=arena(record,x,y);
  const rival=world.fighters[1];
  Object.defineProperty(rival,'invulnerable',{get:()=>true});
  rival.tryEvade=()=>{throw new Error('não deve consultar esquiva no Eclipse');};
  for(let t=0;t<230;t++){
   // Varia a posição durante a prisão para simular salto e teleporte.
   if(t%10===0){rival.x=t%20?1050:200;rival.y=world.fighters[0].map.groundLevel-160;rival.grounded=false;}
   step(world,t===0?cast('crimsonEclipse'):command(),command({[x<y?'right':'left']:true}));
  }
  assert.equal(hits(world).length,7);
  assert.equal(rival.health,record.config.stats.maxHealth-63);
 });
}
test('Eclipse: proteção e limite de duas execuções por round',()=>{
 const world=arena(record,400,850);
 const hero=world.fighters[0];
 step(world,cast('crimsonEclipse'));
 assert.equal(hero.invulnerable,true);
 for(let t=0;t<1000;t++) step(world);
 assert.equal(hero.invulnerable,false);
 step(world,cast('crimsonEclipse'));
 for(let t=0;t<1000;t++) step(world);
 assert.equal(hero.startAttack('crimsonEclipse'),false);
});
test('Novos comandos não substituem os três especiais anteriores',()=>{
 for(const facing of [1,-1]) for(const [cmd,expected] of [
  [{special:true,[facing===1?'left':'right']:true},'crimsonEclipse'],
  [{down:true,punch:true},'blackHole'],[{down:true,kick:true},'meteorFall'],
  [{special:true},'special1'],[{down:true,special:true},'special2'],
  [{special:true,[facing===1?'right':'left']:true},'special3']
 ]) assert.equal(new ComboDetector(record.config.combos).feed(command(cmd),facing,0).animation,expected);
});
