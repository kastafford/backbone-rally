import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {findShortcuts} from './shortcut-discovery.js';
import {jumpPoint,safeLanding,createShortcuts} from './shortcuts.js';
test('jump follows exact endpoints even between opposite strand orientations',()=>{
 const a=new THREE.Vector3(0,0,0),b=new THREE.Vector3(4,1,2),up=new THREE.Vector3(0,1,0),down=up.clone().negate();
 assert.ok(jumpPoint(a,b,up,down,0).distanceTo(a)<1e-8);
 assert.ok(jumpPoint(a,b,up,down,1).distanceTo(b)<1e-8);
 assert.ok(jumpPoint(a,b,up,down,.5).toArray().every(Number.isFinite));
 assert.ok(jumpPoint(a,b,up,down,.499).distanceTo(jumpPoint(a,b,up,down,.501))<.03);
 assert.equal(safeLanding(1.4,1.7),true);assert.equal(safeLanding(1.6,1.7),false);
});
test('aim freezes progress, release flies and commits only at landing; reset cancels flight',()=>{
 globalThis.document={createElement:()=>({classList:{add(){},remove(){}},setAttribute(){}}),querySelector:()=>({append(){}})};
 const state={distance:8,length:180,lateral:0,height:0,falling:false};let landed=0;
 const sample=t=>({p:new THREE.Vector3(t*20,0,0),right:new THREE.Vector3(1,0,0),up:new THREE.Vector3(0,1,0),forward:new THREE.Vector3(0,0,1),width:1.7});
 const api={scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),marble:new THREE.Group(),shadow:{visible:true},sound:{gesture(){}},landingUniform:{value:-1000},sample,status:()=>state,steer:()=>0,land(t,offset,safe){landed++;assert.equal(safe,true);state.distance=t*180;}};
 const samples=Array.from({length:46},(_,i)=>({residue:i})),residues=samples.map((_,i)=>({number:i+1,type:'loop'}));
 const first=findShortcuts({samples,length:180,residues,sample})[0];state.distance=first.from*180;const initial=state.distance;
 const shortcuts=createShortcuts(api);shortcuts.configure('CUSTOM',samples,180,residues);
 assert.equal(shortcuts.press(),true);assert.equal(shortcuts.update(.5),true);assert.equal(state.distance,initial);
 shortcuts.release();assert.equal(shortcuts.airborne,true);shortcuts.update(.5);assert.equal(landed,0);
 shortcuts.update(.7);assert.equal(landed,1);assert.equal(shortcuts.airborne,false);assert.ok(state.distance>initial+25);
 state.distance=initial;shortcuts.press();shortcuts.release();shortcuts.reset();shortcuts.update(2);assert.equal(landed,1);
 delete globalThis.document;
});
