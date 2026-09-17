import test from 'node:test';
import assert from 'node:assert/strict';
import {createSound} from './sound.js';
function fixture() {
  const started=[],stopped=[];
  const param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const context={state:'running',currentTime:0,destination:{},createGain:()=>({gain:param(),connect(){},disconnect(){}}),createOscillator(){const osc={frequency:param(),connect(){},disconnect(){},start(){started.push(osc);},stop(){stopped.push(osc);}};return osc;}};
  const values=new Map();const storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
  return {context,started,stopped,storage,sound:createSound({contextFactory:()=>context,storage})};
}
test('audio stays silent before gesture and remembers mute preference',async()=>{
  const f=fixture();f.sound.play('water');assert.equal(f.started.length,0);
  await f.sound.gesture('water');assert.equal(f.started.length,2);
  f.sound.setMuted(true);await f.sound.gesture('finish');assert.equal(f.started.length,2);
  const next=createSound({storage:f.storage});assert.equal(next.muted,true);
  f.sound.setMuted(false);await f.sound.gesture('jump');assert.equal(f.started.length,3);
});
test('pause cancels a cue waiting for browser audio permission',async()=>{
  const f=fixture();let resume;
  f.context.state='suspended';f.context.resume=()=>new Promise(resolve=>{resume=()=>{f.context.state='running';resolve();};});
  const pending=f.sound.gesture('start');f.sound.stop();resume();await pending;
  assert.equal(f.started.length,0);
  await f.sound.gesture('finish');assert.equal(f.started.length,5);
});
