import test from 'node:test';
import assert from 'node:assert/strict';
import {statSync} from 'node:fs';
import {SoundtrackPlayer,TRACKS,DEFAULT_MUSIC_VOLUME} from '../src/systems/Soundtrack.js';
class FakeAudio {
  constructor(){this.paused=true;this.volume=0;this.src='';this.plays=0;this.currentTime=0;}
  play(){this.paused=false;this.plays++;return Promise.resolve();}
  pause(){this.paused=true;}
  load(){this.currentTime=0;}
  removeAttribute(){this.src='';}
}
const settle=p=>{for(let i=0;i<60;i++)p.tick();};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){const audio=new FakeAudio();let master=.8,music=DEFAULT_MUSIC_VOLUME;const p=new SoundtrackPlayer({audio,master:()=>master,music:()=>music});return {p,audio,master:v=>master=v,music:v=>music=v};}
test('trilha: arquivos reais disponíveis para todas as faixas',()=>{for(const track of TRACKS)assert.ok(statSync(`public${track.src}`).size>10000);});
test('trilha: espera gesto, volume discreto, pausa e retoma a mesma posição',async()=>{
 const {p,audio}=setup();p.setScene('menu');settle(p);assert.equal(audio.plays,0);
 p.unlock();await flush();settle(p);assert.ok(audio.volume<=.161);assert.ok(audio.volume>.15);
 audio.currentTime=42;p.setPaused(true);assert.equal(audio.paused,true);assert.equal(audio.volume,0);
 p.setPaused(false);await flush();assert.equal(audio.currentTime,42);assert.equal(audio.paused,false);
});
test('trilha: troca menu/luta sem sobreposição e reduz durante falas',async()=>{
 const {p,audio}=setup();p.setScene('menu');p.unlock();await Promise.resolve();settle(p);
 const first=audio.src;p.setScene('battle');assert.equal(audio.src,first,'desvanece antes da troca');
 settle(p);await Promise.resolve();assert.equal(audio.src,TRACKS.find(t=>t.scene==='battle').src);
 settle(p);const full=audio.volume;assert.ok(full<=.129);
 p.setDucked(true);settle(p);assert.ok(audio.volume<full*.36);
 p.setDucked(false);settle(p);assert.ok(audio.volume>full*.99);
});
test('trilha: volume zero e aba oculta suspendem a reprodução',async()=>{
 const s=setup();s.p.setScene('battle');s.p.unlock();await flush();settle(s.p);
 s.music(0);s.p.tick();assert.equal(s.audio.volume,0);assert.equal(s.audio.paused,true);
 s.music(.2);s.p.setHidden(true);assert.equal(s.audio.paused,true);
 s.p.setHidden(false);await flush();assert.equal(s.audio.paused,false);
 s.master(0);s.p.tick();assert.equal(s.audio.paused,true);
});
test('trilha: alterna faixas completas ao terminar e ao iniciar outra luta',()=>{
 const audio=new FakeAudio(),tracks=[{id:'menu',scene:'menu',src:'menu.mp3'},{id:'a',scene:'battle',src:'a.mp3'},{id:'b',scene:'battle',src:'b.mp3'}];
 const p=new SoundtrackPlayer({audio,tracks,master:()=>1,music:()=>.2});
 p.setScene('battle');assert.equal(audio.src,'a.mp3');audio.onended();assert.equal(audio.src,'b.mp3');
 p.setScene('menu');p.setScene('battle');assert.equal(audio.src,'a.mp3');
 audio.onerror();assert.equal(audio.src,'b.mp3');audio.onerror();assert.equal(audio.paused,true);
});
test('trilha: bloqueio de autoplay permite nova tentativa no próximo gesto',async()=>{
 const {p,audio}=setup();audio.play=()=>Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));
 p.setScene('menu');p.unlock();await new Promise(resolve=>setImmediate(resolve));assert.equal(p.unlocked,false);
 audio.play=FakeAudio.prototype.play;p.unlock();await Promise.resolve();assert.equal(audio.paused,false);
});
