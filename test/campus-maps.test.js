import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import { cameraTarget, resolveCameraOptions } from '../src/systems/Camera.js';
import { STORY_LADDER } from '../src/data/storyLadder.js';
import { TRAINING_MAP } from '../src/data/training.js';

const read = p => readFileSync(new URL(p, import.meta.url));
const maps = JSON.parse(read('../src/data/maps.json'));
test('campus: catálogo, história e treino só referenciam os seis novos mapas', () => {
 const ids = maps.map(m => m.id);
 assert.equal(new Set(ids).size, 6);
 assert.ok(ids.every(id => id.startsWith('utfpr_')));
 assert.deepEqual(STORY_LADDER.map(r => r.mapId), ids);
 assert.ok(ids.includes(TRAINING_MAP));
 const dirs = readdirSync(new URL('../public/assets/maps/', import.meta.url), {withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>e.name).sort();
 assert.deepEqual(dirs, [...ids].sort());
});
for(const entry of maps) {
 test('campus: '+entry.id+' tem arte pequena, preview válido e câmera dentro da arena', () => {
  const dir='../public'+entry.dir+'/';
  const map=JSON.parse(read(dir+entry.config));
  const png=PNG.sync.read(read(dir+map.backgroundImage));
  assert.equal(entry.background,map.backgroundImage);
  assert.equal(map.id,entry.id);
  assert.equal(map.name,entry.name);
  assert.deepEqual([png.width,png.height],[512,288]);
  assert.equal(map.rightBound-map.leftBound,700);
  assert.equal(map.width/png.width,map.height/png.height);
  for(let i=3;i<png.data.length;i+=4)assert.equal(png.data[i],255);
  const center=(map.leftBound+map.rightBound)/2;
  for(const xs of [[center-110,center+110],[map.leftBound,map.rightBound],[map.leftBound,map.leftBound+70],[map.rightBound-70,map.rightBound]]){
   for(const lift of [0,130,280]) {
    const fighters=xs.map((x,i)=>({x,y:map.groundLevel-(i?0:lift),bodyHeight:96}));
    const c=cameraTarget({fighters,map,view:{width:1280,height:720},options:resolveCameraOptions(map)});
    const left=c.x-640/c.zoom,right=c.x+640/c.zoom,top=c.y-360/c.zoom,bottom=c.y+360/c.zoom;
    assert.ok(left>=-0.001&&right<=map.width+.001&&top>=-.001&&bottom<=map.height+.001);
    for(const f of fighters){ assert.ok(f.x-24>=left&&f.x+24<=right);assert.ok(f.y<=bottom&&f.y-f.bodyHeight>=top); }
   }
  }
 });
}

