import test from 'node:test';
import assert from 'node:assert/strict';
import { GamepadSlots, padFamily, padLabel } from '../src/utils/gamepad.js';
import { InputHandler } from '../src/utils/InputHandler.js';
import { buildCommand } from '../src/utils/combatInput.js';
import { ComboDetector } from '../src/systems/ComboDetector.js';
import { keysFor } from '../src/utils/moveList.js';
import { arena,loadRecord } from './helpers/world.js';
const pad=(id,index,pressed=[],axes=[0,0])=>({id,index,connected:true,axes,buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0}))});
function sample(input,pads) {
  input.previous=input.current;
  input.current=[input.readPlayer(0,pads),input.readPlayer(1,pads)];
  return buildCommand(input,0);
}

test('controle: Xbox e DualSense usam os próprios símbolos na lista, teclado permanece',()=>{
  assert.equal(padFamily('DualSense Wireless Controller (054c:0ce6)'),'playstation');
  assert.equal(padFamily('Xbox 360 Controller (XInput STANDARD GAMEPAD)'),'xbox');
  assert.deepEqual(keysFor({input:'↓→S'},0,'playstation').map(x=>x.label),['↓','→','△']);
  assert.deepEqual(keysFor({input:'↓→S'},0,'xbox').map(x=>x.label),['↓','→','Y']);
  assert.deepEqual(keysFor({input:'↓→S'},0).map(x=>x.label),['↓','→','L']);
  assert.deepEqual(keysFor({input:'→→'},1,'playstation').map(x=>x.label),['→','→']);
  assert.deepEqual(keysFor({input:'↑↑'},0,'xbox').map(x=>x.label),['A','A']);
  assert.equal(padLabel('jump','playstation'),'✕');
  assert.equal(padLabel('punch','playstation'),'□');
});

test('controle: índices com lacunas, desconexão do P1 não rouba o controle do P2',()=>{
  const slots=new GamepadSlots(),a=pad('PS5',2),b=pad('Xbox',3);
  assert.deepEqual(slots.assign([null,null,a,b]),[a,b]);
  assert.deepEqual(slots.assign([null,null,null,b]),[null,b]);
  const replacement=pad('PS5 novo',0);
  assert.deepEqual(slots.assign([replacement,null,null,b]),[replacement,b]);
  assert.deepEqual(slots.assign([]),[null,null]);
});


test('controle: X/A pula sem atacar; segurar não consome o segundo salto',()=>{
  const hero=arena(loadRecord('ensina_god'),400,1000).fighters[0],input=new InputHandler();
  const first=sample(input,[pad('PS5',0,[0]),null]);
  assert.equal(first.jump,true);assert.equal(first.punch,false);assert.equal(first.special,false);
  hero.update(first,1);
  hero.update(sample(input,[pad('PS5',0,[0]),null]),1);
  assert.equal(hero.airJumpsLeft,1);
  hero.update(sample(input,[pad('PS5',0),null]),1);
  hero.update(sample(input,[pad('PS5',0,[0]),null]),1);
  assert.equal(hero.animation.name,'airJump');assert.equal(hero.airJumpsLeft,0);
});

test('controle: gatilhos e ombros não disparam golpes ou dash',()=>{
  const input=new InputHandler(),hero=arena(loadRecord('ensina_god'),400,1000).fighters[0];
  const detector=new ComboDetector(hero.config.combos);
  const c=sample(input,[pad('Xbox',0,[4,5,6,7]),null]);
  c.combo=detector.feed(c,1,0);
  assert.equal(c.combo,null);hero.update(c,1);assert.equal(hero.state,'idle');
});

test('controle: Atomic exige baixo, frente e triângulo/Y, nos dois lados',()=>{
  for(const facing of [1,-1]) {
    const hero=arena(loadRecord('ensina_god'),400,1000).fighters[0],input=new InputHandler();
    hero.facing=facing;
    const detector=new ComboDetector(hero.config.combos);
    const feed=(buttons,time)=>{const c=sample(input,[pad('PS5',0,buttons),null]);c.combo=detector.feed(c,facing,time,hero.comboModes);return c;};
    assert.notEqual(feed([3],0).combo?.animation,'iAmAtomic');
    detector.reset();feed([],20);feed([13],40);feed([facing===1?15:14],70);
    const c=feed([3],100);assert.equal(c.combo.animation,'iAmAtomic');hero.update(c,1);
    assert.equal(hero.animation.name,'iAmAtomic');
  }
});

test('controle: direção segurada e botão preservam Prova Surpresa',()=>{
  const hero=arena(loadRecord('ensina_god'),400,1000).fighters[0],input=new InputHandler();
  const detector=new ComboDetector(hero.config.combos);
  const c=sample(input,[pad('Xbox',0,[13,3]),null]);
  assert.equal(detector.feed(c,1,0).animation,'special2');
});

test('controle: dash continua no toque duplo do direcional',()=>{
  const detector=new ComboDetector([]),input=new InputHandler();
  const feed=(buttons,time)=>detector.feed(sample(input,[pad('Xbox',0,buttons),null]),1,time);
  assert.equal(feed([15],0),null);feed([],50);
  assert.equal(feed([15],100).animation,'dashForward');
});
