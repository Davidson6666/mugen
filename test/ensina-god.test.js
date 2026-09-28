import test from 'node:test';
import assert from 'node:assert/strict';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, assertConfigIntegrity, cast, command, hits, loadRecord, run, step } from './helpers/world.js';
const record = loadRecord('ensina_god');
test('Ensina: frames e efeitos válidos',()=>assertConfigIntegrity(assert,record.config));
for(const [move,count] of [['special1',1],['special2',4],['special3',6]]) {
  test(`Ensina: ${move} alcança o rival e termina`,()=>{
    const world=run(arena(record,400,700),cast(move),240);
    assert.equal(hits(world).length,count);
    assert.ok(world.fighters[1].health>0,'um super não mata com vida cheia');
    assert.equal(world.effects.effects.length,0);
  });
  test(`Ensina: ${move} respeita defesa`,()=>{
    const world=arena(record,400,700);
    for(let t=0;t<240;t++) step(world,t===0?cast(move):command(),command({right:true}));
    assert.equal(hits(world).length,0);
    assert.ok(world.results.some(r=>r.outcome==='block'));
  });
}
test('Ensina: comandos relativos aos dois lados',()=>{
  for(const facing of [1,-1]) {
    assert.equal(new ComboDetector(record.config.combos).feed(command({special:true,down:true}),facing,0).animation,'special2');
    assert.equal(new ComboDetector(record.config.combos).feed(command({special:true,[facing===1?'right':'left']:true}),facing,0).animation,'special3');
  }
});
test('Ensina: receber golpe interrompe preparação do super',()=>{
  const world=arena(record,400,700);
  step(world,cast('special3'));
  world.fighters[0].takeHit(1,20);
  for(let t=0;t<150;t++) step(world);
  assert.equal(hits(world).length,0);
  assert.equal(world.effects.effects.length,0);
});
