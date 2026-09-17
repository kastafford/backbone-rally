// Short original synth cues, generated locally: no downloads or background music.
const note = midi => 440 * 2 ** ((midi - 69) / 12);
export const CUES = {
  start: [[0,72,.16],[.13,76,.16],[.26,79,.26]],
  jump: [[0,64,.22,84,.14,'sine']],
  land: [[0,55,.09,48,.09,'sine']],
  water: [[0,84,.16,null,.16],[.08,91,.24,null,.12]],
  boost: [[0,60,.34,88,.13,'triangle'],[.12,79,.22],[.23,84,.3]],
  bump: [[0,48,.14,39,.2,'triangle'],[.08,61,.16,54,.1]],
  checkpoint: [[0,76,.18],[.13,83,.32]],
  fall: [[0,76,.85,52,.2,'sine'],[.1,64,.7,45,.06,'sine']],
  respawn: [[0,67,.12],[.1,72,.18]],
  finish: [[0,72,.3],[.15,76,.3],[.3,79,.3],[.45,84,.7],[.45,72,.7,null,.09]],
};

export function createSound({ contextFactory, storage } = {}) {
  let context, master, muted=false, generation=0;
  const voices = new Set();
  try { storage ??= globalThis.localStorage; muted=storage?.getItem('backbone-muted')==='true'; } catch {}
  function stop() {
    generation++;
    for(const {osc,gain} of voices) {
      try {osc.stop();osc.disconnect();gain.disconnect();} catch {}
    }
    voices.clear();
  }
  // Called only from user gestures; browsers require this to enable sound.
  async function unlock() {
    if(muted)return false;
    try {
      if(!context) {
        const Factory=globalThis.AudioContext||globalThis.webkitAudioContext;
        if(!contextFactory&&!Factory)return false;
        context=contextFactory?contextFactory():new Factory();
        master=context.createGain();master.gain.value=.32;master.connect(context.destination);
      }
      if(context.state==='suspended')await context.resume();
      return context.state==='running';
    } catch {return false;}
  }
  function play(name) {
    if(muted||context?.state!=='running'||!CUES[name])return;
    for(const [delay,midi,duration,endMidi,volume=.15,type='sine'] of CUES[name]) {
      if(voices.size>=24)break;
      const osc=context.createOscillator(),gain=context.createGain();
      const start=context.currentTime+delay,end=start+duration;
      osc.type=type;osc.frequency.setValueAtTime(note(midi),start);
      if(endMidi!=null)osc.frequency.exponentialRampToValueAtTime(note(endMidi),end);
      gain.gain.setValueAtTime(0,start);
      gain.gain.linearRampToValueAtTime(volume,start+.008);
      gain.gain.exponentialRampToValueAtTime(.0001,end);
      osc.connect(gain);gain.connect(master);
      const voice={osc,gain};voices.add(voice);
      osc.onended=()=>{osc.disconnect();gain.disconnect();voices.delete(voice);};
      osc.start(start);osc.stop(end+.02);
    }
  }
  async function gesture(name) {
    const token=generation;
    if(await unlock()&&token===generation)play(name);
  }
  function setMuted(value) {
    muted=value;stop();
    try {storage?.setItem('backbone-muted',String(muted));} catch {}
  }
  return {play,gesture,stop,setMuted,get muted(){return muted;}};
}
