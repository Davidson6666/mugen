import test from 'node:test';
import assert from 'node:assert/strict';
import {ComboDetector} from '../src/systems/ComboDetector.js';
import {arena,cast,command,hits,loadRecord,run,step} from './helpers/world.js';
const record=loadRecord('humberto');

for(const facing of [1,-1])for(const mode of [null,'legendary']) {
  test(`Judgement Cut End: comando e nove acertos ${facing}/${mode}`,()=>{
    const detector=new ComboDetector(record.config.combos);
    detector.feed(command({down:true}),facing,0,mode);
    const combo=detector.feed(command({[facing===1?'left':'right']:true,special:true}),facing,100,mode);
    assert.equal(combo.animation,'judgementCutEnd');
    const w=arena(record,facing===1?150:1100,facing===1?1100:150);
    w.fighters[0].mode=mode;
    run(w,cast(combo.animation),200);
    assert.equal(hits(w).length,9);
    assert.equal(w.fighters[1].health,60);
    assert.ok(Number.isFinite(w.fighters[1].x)&&Number.isFinite(w.fighters[1].y));
    assert.equal(w.fighters[1].grounded,true);
    assert.equal(w.effects.effects.length,0);
    assert.equal(w.fighters[0].state,'idle');
  });
}
test('Judgement: preparação sem dano e defesa bloqueia todos os cortes',()=>{
  const w=arena(record,400,900);
  for(let t=0;t<200;t++){
    step(w,t===0?cast('judgementCutEnd'):command(),command({right:true}));
    if(t<40)assert.equal(w.fighters[1].health,100);
  }
  assert.equal(hits(w).length,0);
  assert.equal(w.results.filter(r=>r.outcome==='block').length,9);
  assert.equal(w.effects.effects.length,0);
});
test('Judgement: limite compartilhado entre formas e restaurado no round',()=>{
  const w=run(arena(record,400,900),cast('judgementCutEnd'),650),a=w.fighters[0];
  a.mode='legendary';
  assert.equal(a.startAttack('judgementCutEnd'),false);
  a.resetForRound(400,1);
  assert.equal(a.startAttack('judgementCutEnd'),true);
});
test('Judgement: preparação interrompida limpa o cenário e não causa dano',()=>{
  const w=arena(record,600,640);
  step(w,cast('judgementCutEnd'),cast('punch'));
  for(let t=0;t<180;t++)step(w);
  assert.ok(w.fighters[0].health<100);
  assert.equal(w.fighters[1].health,100);
  assert.equal(w.effects.effects.length,0);
});
