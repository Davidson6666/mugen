import test from 'node:test';
import assert from 'node:assert/strict';
import { MenuInputGate } from '../src/utils/MenuInputGate.js';
import { InputHandler } from '../src/utils/InputHandler.js';
import { buildCommand } from '../src/utils/combatInput.js';
import { arena, loadRecord, command } from './helpers/world.js';
const pad=(pressed=[],axes=[0,0],id='DualSense')=>({id,index:0,axes,buttons:Array.from({length:17},(_,i)=>({pressed:pressed.includes(i),value:pressed.includes(i)?1:0}))});

test('menu: confirmação segurada não atravessa pausa, menu, personagem e cenário',()=>{
  for(const screen of ['menu','personagem','cenário']) {
    const gate=new MenuInputGate();
    for(let frame=0;frame<60;frame++)assert.equal(gate.ready(0,pad([0])),false,screen);
    assert.equal(gate.ready(0,pad()),false);
    assert.equal(gate.ready(0,pad([0])),true);
  }
});

test('menu: cancelar, direcional e reconexão também exigem soltar',()=>{
  const gate=new MenuInputGate();
  assert.equal(gate.ready(0,pad([1])),false);
  assert.equal(gate.ready(0,pad([], [0,1])),false);
  assert.equal(gate.ready(0,pad()),false);
  assert.equal(gate.ready(0,pad([1])),true);
  assert.equal(gate.ready(0,null),false);
  assert.equal(gate.ready(0,pad([0])),false);
  assert.equal(gate.ready(1,pad()),false);
  assert.equal(gate.ready(1,pad([0])),true);
});

test('defesa: L1/LB é segurado, bloqueia parado para ambos os lados e permite agachar',()=>{
  const input=new InputHandler();
  input.current=[input.readPlayer(0,[pad([4])]),input.readPlayer(1,[])];
  const held=buildCommand(input,0);
  assert.equal(held.guard,true);assert.equal(held.punch,false);
  for(const facing of [1,-1]) {
    const hero=arena(loadRecord('ensina_god'),400,1000).fighters[0];hero.facing=facing;
    const x=hero.x;
    hero.update({...held,right:true},1);
    assert.equal(hero.blocking,true);assert.equal(hero.x,x);assert.equal(hero.vx,0);
    hero.update({...held,down:true},1);
    assert.equal(hero.blocking,true);assert.equal(hero.state,'crouch');
    hero.update(command(),1);assert.equal(hero.blocking,false);
    hero.seals.noGuard=20;hero.update(held,1);assert.equal(hero.blocking,false);
  }
});

test('defesa: botão não cancela ataque nem permite bloquear no ar',()=>{
  const hero=arena(loadRecord('ensina_god'),400,1000).fighters[0];
  hero.update(command({punch:true,guard:true}),1);
  assert.equal(hero.state,'attack');assert.equal(hero.blocking,false);
  hero.endMove();hero.update(command({jump:true,guard:true}),1);
  assert.equal(hero.grounded,false);assert.equal(hero.blocking,false);
});
