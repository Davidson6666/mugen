import test from 'node:test';
import assert from 'node:assert/strict';
import {arena,cast,hits,loadRecord,run} from './helpers/world.js';
const record=loadRecord('humberto');
for(const name of ['uppercut','sweep','legend_uppercut','legend_sweep'])test(`Humberto: ${name} lança sem perder o adversário da arena`,()=>{
 const w=run(arena(record,600,640),cast(name),200);
 assert.equal(hits(w).length,1);
 const b=w.fighters[1];assert.ok(Number.isFinite(b.x)&&Number.isFinite(b.y));assert.equal(b.grounded,true);
 assert.equal(w.effects.effects.length,0);
});
for(const [move,count]of [['punch',1],['punch2',1],['kick',1],['ionicPalm',1],['special2',1]])test(`Humberto: efeitos de ${move} não duplicam dano`,()=>{
 const w=run(arena(record,600,640),cast(move),200);
 assert.equal(hits(w).length,count);assert.equal(w.effects.effects.length,0);
});
