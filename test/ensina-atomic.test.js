import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { arena, cast, command, hits, loadRecord, step } from './helpers/world.js';
const record=loadRecord('ensina_god');

test('Ensina: segundo salto reinicia a pose, troca para queda e recupera ao aterrissar',()=>{
  const world=arena(record,400,1000), hero=world.fighters[0];
  step(world,command({jump:true}));
  for(let i=0;i<8;i++)step(world);
  step(world,command({jump:true}));
  assert.equal(hero.animation.name,'airJump');
  assert.equal(hero.airJumpsLeft,0);
  for(let i=0;i<14;i++)step(world);
  assert.equal(hero.animation.name,'jumpFall');
  for(let i=0;i<80;i++)step(world);
  assert.equal(hero.grounded,true);
  assert.equal(hero.airJumpsLeft,1);
});

for(const facing of [1,-1]) for(const backward of [false,true]) {
  test(`Ensina: dash aéreo ${facing}/${backward} mantém altura e gasta só um uso`,()=>{
    const world=arena(record,640,facing===1?1100:150),hero=world.fighters[0];
    step(world,command({jump:true}));
    for(let i=0;i<5;i++)step(world);
    const y=hero.y,x=hero.x,name=backward?'dashBackward':'dashForward';
    step(world,command({combo:{animation:name,movement:true}}));
    assert.equal(hero.state,'dash');
    for(let i=0;i<8;i++)step(world);
    assert.equal(hero.y,y);
    assert.ok((hero.x-x)*facing*(backward?-1:1)>50);
    assert.equal(hero.startDash(name),false);
    for(let i=0;i<100;i++)step(world);
    assert.equal(hero.airDashesLeft,1);
  });
}

for(const facing of [1,-1]) test(`Atomic: comando relativo ${facing}`,()=>{
  const detector=new ComboDetector(record.config.combos);
  detector.feed(command({down:true}),facing,0);
  const result=detector.feed(command({[facing===1?'right':'left']:true,special:true}),facing,100);
  assert.equal(result.animation,'iAmAtomic');
});

for(const [left,right] of [[150,1100],[1100,150]]) test(`Atomic: um KO inevitável com vida arbitrária (${left})`,()=>{
  const world=arena(record,left,right),[hero,rival]=world.fighters;
  rival.health=12345;
  Object.defineProperty(hero,'damageScale',{get:()=>0.001});
  Object.defineProperty(rival,'invulnerable',{get:()=>true});
  rival.tryEvade=()=>{throw new Error('Atomic não consulta esquiva');};
  const release=record.config.animations.iAmAtomic.events.find(e=>e.sound==='atomicBlast').at;
  for(let i=0;i<440;i++) {
    step(world,i===0?cast('iAmAtomic'):command(),command({[left<right?'right':'left']:true}));
    if(i<release+5) assert.equal(rival.health,12345,'preparação não causa dano');
  }
  assert.equal(rival.health,0);
  assert.equal(hits(world).length,1);
  assert.equal(hits(world)[0].outcome,'ko');
  assert.equal(world.effects.effects.length,0);
  assert.deepEqual(hero.pendingSounds.map(s=>s.key),['atomicCharge','atomicVoice','atomicBlast']);
  assert.equal(hero.startAttack('iAmAtomic'),false);
  hero.resetForRound(left,1);
  assert.equal(hero.startAttack('iAmAtomic'),true);
});

test('Atomic: roupa Shadow só durante o especial, voltando à roupa normal depois',()=>{
  const world=arena(record,400,900),hero=world.fighters[0];
  const costumePage=record.config.sheets.indexOf('ensina_shadow_costume.png');
  step(world,cast('iAmAtomic'));
  assert.equal(record.config.atlas[hero.animation.sheetFrame][0],costumePage);
  for(let t=0;t<430;t++)step(world);
  assert.equal(hero.animation.name,'idle');
  assert.notEqual(record.config.atlas[hero.animation.sheetFrame][0],costumePage);
});

test('Atomic: samples WAV estéreo reais e voz termina antes da detonação',()=>{
  const move=record.config.animations.iAmAtomic;
  const voiceAt=move.events.find(e=>e.sound==='atomicVoice').at;
  const blastAt=move.events.find(e=>e.sound==='atomicBlast').at;
  for(const key of ['atomicCharge','atomicVoice','atomicBlast']) {
    const data=readFileSync(`public/assets/characters/ensina_god/${record.config.sounds[key]}`);
    assert.equal(data.toString('ascii',0,4),'RIFF');
    assert.equal(data.readUInt16LE(22),2);
    if(key==='atomicVoice') assert.ok(voiceAt/60+data.readUInt32LE(40)/data.readUInt32LE(28)<=blastAt/60+0.01);
  }
});
