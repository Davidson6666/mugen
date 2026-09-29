// Original audio from the user-supplied video (20.00s–32.75s).
// Preserve voice pitch, speed and stereo; only fade cut edges to prevent clicks.
import { readFileSync, writeFileSync } from 'node:fs';
const dir='public/assets/characters/ensina_god';
const source=readFileSync('assets-src/ensina-god/atomic-video-source.wav');
let pcm, format;
for(let pos=12;pos+8<=source.length;) {
  const size=source.readUInt32LE(pos+4),id=source.toString('ascii',pos,pos+4);
  if(id==='fmt ')format=source.subarray(pos+8,pos+8+16);
  if(id==='data')pcm=source.subarray(pos+8,pos+8+size);
  pos+=8+size+(size%2);
}
if(!pcm||!format||format.readUInt16LE(0)!==1||format.readUInt16LE(14)!==16)throw new Error('Expected 16-bit PCM source');
const rate=format.readUInt32LE(4),channels=format.readUInt16LE(2),stride=channels*2;
function clip(name,start,duration,fadeIn=0.008,fadeOut=0.015) {
  const count=Math.round(duration*rate),offset=Math.round(start*rate)*stride;
  const data=Buffer.from(pcm.subarray(offset,offset+count*stride));
  if(data.length!==count*stride)throw new Error(name+': source too short');
  for(let i=0;i<count;i++) {
    const gain=Math.min(1,i/Math.max(1,fadeIn*rate),(count-1-i)/Math.max(1,fadeOut*rate));
    for(let ch=0;ch<channels;ch++) {const at=i*stride+ch*2;data.writeInt16LE(Math.round(data.readInt16LE(at)*gain),at);}
  }
  const header=Buffer.alloc(44);
  header.write('RIFF');header.writeUInt32LE(data.length+36,4);header.write('WAVEfmt ',8);
  header.writeUInt32LE(16,16);format.copy(header,20);header.write('data',36);header.writeUInt32LE(data.length,40);
  writeFileSync(dir+'/'+name+'.wav',Buffer.concat([header,data]));
  console.log(name,duration+'s; original video',20+start,'to',20+start+duration);
}
// Contiguous 25.00s–32.75s soundtrack, split at animation events (no overlap).
clip('atomic-charge',5,0.5,0.008,0.008);
clip('atomic-voice',5.5,5.05);
clip('atomic-blast',10.55,2.2,0.004,0.18);
