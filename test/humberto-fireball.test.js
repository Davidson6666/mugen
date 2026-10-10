import test from 'node:test';
import assert from 'node:assert/strict';
import {ComboDetector} from '../src/systems/ComboDetector.js';
import {arena,cast,command,hits,loadRecord,run,step} from './helpers/world.js';
const record=loadRecord('humberto');
for(const facing of [1,-1])for(const mode of [null,'legendary'])test(`Katon: comando e projétil ${facing}/${mode}`,()=>{
 const detector=new ComboDetector(record.config.combos);
 detector.feed(command({down:true}),facing,0,mode);
 const combo=detector.feed(command({[facing===1?'right':'left']:true,punch:true}),facing,100,mode);
 assert.equal(combo.animation,'greatFireball');
 const w=arena(record,facing===1?400:900,facing===1?900:400);w.fighters[0].mode=mode;
 run(w,cast(combo.animation),200);
 assert.equal(hits(w).length,1);assert.equal(w.fighters[1].health,78);
 assert.equal(w.effects.effects.length,0);assert.ok(Number.isFinite(w.fighters[1].x));
});
test('Katon: bloqueável, preparação interrompível, recarga e limpeza',()=>{
 const block=arena(record,400,900);
 for(let t=0;t<200;t++)step(block,t===0?cast('greatFireball'):command(),command({right:true}));
 assert.equal(hits(block).length,0);assert.equal(block.results.filter(r=>r.outcome==='block').length,1);
 assert.equal(block.effects.effects.length,0);
 const interrupted=arena(record,600,640);step(interrupted,cast('greatFireball'),cast('punch'));run(interrupted,command(),200);
 assert.equal(interrupted.fighters[1].health,100);assert.equal(interrupted.effects.effects.length,0);
 const cooldown=run(arena(record,400,900),cast('greatFireball'),60);
 assert.equal(cooldown.fighters[0].startAttack('greatFireball'),false);
 run(cooldown,command(),130);assert.equal(cooldown.fighters[0].startAttack('greatFireball'),true);
});
test('Katon: projétil que erra sai da arena sem efeitos órfãos',()=>{
 const w=arena(record,400,900);w.fighters[1].y=0;w.fighters[1].grounded=false;
 Object.defineProperty(w.fighters[1],'invulnerable',{get:()=>true});
 run(w,cast('greatFireball'),240);assert.equal(hits(w).length,0);assert.equal(w.effects.effects.length,0);
});
