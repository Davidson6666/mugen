import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture } from 'pixi.js';
import {arena,loadRecord,run,cast,step,command,hits,assertConfigIntegrity} from './helpers/world.js';
const record=loadRecord('humberto');
test('poses normais e lendárias preservadas e referências válidas',()=>{
 assert.equal(record.config.atlas.length,192);
 assertConfigIntegrity(assert,record.config);
 for(const def of Object.values(record.config.modes.legendary.animations))assert.ok(record.config.animations[def].frames.every(f=>f>=96&&f<192));
 for(const [normal,legendary] of record.config.modes.legendary.frameMap.entries()){
  assert.ok(record.config.atlas[normal]);assert.ok(record.config.atlas[legendary]);
  assert.notEqual(record.config.atlas[normal][0],record.config.atlas[legendary][0]);
 }
});

for(const move of ['greatFireball','judgementCutEnd'])test(`${move}: forma lendária muda só a textura e compartilha os limites`,()=>{
 const w=arena(record,400,900),f=w.fighters[0];
 f.frames=record.frames.map(()=>Texture.EMPTY);
 for(const frame of record.config.animations[move].frames)f.frames[record.config.modes.legendary.frameMap[frame]]=Texture.WHITE;
 f.mode='legendary';assert.equal(f.startAttack(move),true);
 const length=f.animation.length;
 for(let tick=0;tick<length;tick++){
  f.animation.update(1);f.syncSprite();
  assert.equal(f.sprite.texture,Texture.WHITE);
  assert.equal(f.animation.name,move);
 }
 f.mode=null;f.syncSprite();assert.equal(f.sprite.texture,Texture.EMPTY);
 assert.equal(f.startAttack(move),false);
});
test('transformação manual dura 12 segundos e não carrega entre rounds',()=>{
 const w=run(arena(record,400,700),cast('legendaryTransform'),50),f=w.fighters[0];assert.equal(f.mode,'legendary');assert.equal(f.awakened,true);assert.equal(f.damageScale,1.2);
 for(let i=0;i<740;i++)step(w);assert.equal(f.mode,null);assert.equal(f.awakened,false);assert.equal(w.effects.effects.length,0);
 f.resetForRound(400,1);assert.equal(f.awakeGauge,0);assert.equal(f.awakened,false);assert.equal(f.mode,null);
});
test('reiniciar o round durante a transformação limpa o modo e o bônus',()=>{
 const w=run(arena(record,400,700),cast('legendaryTransform'),50),f=w.fighters[0];
 assert.equal(f.awakened,true);f.resetForRound(400,1);
 assert.equal(f.awakened,false);assert.equal(f.awakeGauge,0);assert.equal(f.mode,null);assert.equal(f.damageScale,1);
});
for(const move of ['kiBlast','legend_kiBlast','legend_cannon'])test(move+' acerta e limpa os efeitos',()=>{const w=run(arena(record,400,700),cast(move),200);assert.equal(hits(w).length,1);assert.equal(w.effects.effects.length,0);});
test('petrificação para movimento, restaura e respeita defesa',()=>{
 const w=arena(record,400,700);step(w,cast('medusa'));let caught=false;
 for(let i=0;i<100;i++){step(w);if(w.fighters[1].seals.petrify>0){caught=true;break;}}
 assert.ok(caught);const b=w.fighters[1],x=b.x,y=b.y,frame=b.animation.sheetFrame;
 for(let i=0;i<30;i++)step(w,command(),command({left:true,punch:true}));assert.equal(b.x,x);assert.equal(b.y,y);assert.equal(b.animation.sheetFrame,frame);assert.equal(b.sprite.tint,0xb6b1a5);
 for(let i=0;i<100;i++)step(w);assert.ok(!b.seals.petrify);assert.ok(!b.sprite.filters?.length);
 const g=arena(record,400,700);for(let i=0;i<180;i++)step(g,i===0?cast('medusa'):command(),command({right:true}));assert.equal(hits(g).length,0);assert.ok(!g.fighters[1].seals.petrify);
});
