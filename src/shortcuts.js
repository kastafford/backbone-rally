import * as THREE from 'three';

import { jumpPoint, safeLanding } from './jump.js';
import { findShortcuts } from './shortcut-discovery.js';
export { jumpPoint, safeLanding } from './jump.js';

export function createShortcuts(api) {
  const root=new THREE.Group();api.scene.add(root);
  const material=new THREE.LineBasicMaterial({color:0x9cefff,transparent:true,opacity:.85});
  const line=new THREE.Line(new THREE.BufferGeometry(),material);root.add(line);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.65,.06,8,40),new THREE.MeshBasicMaterial({color:0x9cefff}));root.add(ring);
  const markers=new THREE.Group();root.add(markers);
  const help=document.createElement('div');help.className='shortcut-help hidden';help.setAttribute('role','status');document.querySelector('.stage').append(help);
  let routes=[],aim=null,flight=null;
  function clearAim(){aim=null;line.visible=ring.visible=false;help.classList.add('hidden');api.landingUniform.value=-1000;}
  function reset(){clearAim();flight=null;}
  function configure(id,samples,length,residues=[],gaps=[],obstacles=[]){
    reset();routes=[];
    markers.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});markers.clear();
    routes=findShortcuts({samples,length,residues,gaps,obstacles,sample:api.sample});
    for(const r of routes){r.distance=r.from*length;r.saved=Math.round((r.to-r.from)*length);for(const [t,landing]of[[r.from,false],[r.to,true]]){const s=api.sample(t);const m=new THREE.Mesh(new THREE.TorusGeometry(landing?.85:.55,.035,6,32),new THREE.MeshBasicMaterial({color:landing?0xc5a9ff:0x9cefff}));m.position.copy(s.p).addScaledVector(s.up,.08);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),s.up);markers.add(m);}}
  }
  function available(){const p=api.status();return routes.find(r=>Math.abs(r.distance-p.distance)<3.8);}
  function press(){const p=api.status(),r=available();if(!r||p.height>0||p.falling||flight)return false;aim={route:r,offset:p.lateral*.6};api.sound.gesture();return true;}
  function endpoints(){const p=api.status(),a=api.sample(p.distance/p.length),b=api.sample(aim.route.to);return {a,b,start:a.p.clone().addScaledVector(a.right,p.lateral).addScaledVector(a.up,.53),end:b.p.clone().addScaledVector(b.right,aim.offset).addScaledVector(b.up,.53)};}
  function release(){if(!aim)return;const {a,b,start,end}=endpoints();flight={route:aim.route,offset:aim.offset,start,end,a,b,time:0};api.sound.gesture('jump');clearAim();api.landingUniform.value=flight.route.to*api.status().length;}
  function update(dt){
    const p=api.status();
    if(flight){flight.time=Math.min(1,flight.time+dt/1.15);const f=flight;api.marble.position.copy(jumpPoint(f.start,f.end,f.a.up,f.b.up,f.time,f.route.arcHeight));api.shadow.visible=false;
      const orientation=s=>new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(s.right,s.up,s.forward.clone().negate()));
      const q=orientation(f.a).slerp(orientation(f.b),f.time);
      const up=new THREE.Vector3(0,1,0).applyQuaternion(q),forward=new THREE.Vector3(0,0,-1).applyQuaternion(q);
      const target=api.marble.position.clone().addScaledVector(up,6).addScaledVector(forward,-8);api.camera.position.lerp(target,1-Math.exp(-4*dt));api.camera.up.lerp(up,1-Math.exp(-4*dt)).normalize();api.camera.lookAt(api.marble.position);
      if(f.time>=1){flight=null;api.landingUniform.value=-1000;api.land(f.route.to,f.offset,safeLanding(f.offset,f.b.width));}return true;}
    if(aim){const {a,b,start,end}=endpoints();aim.offset=THREE.MathUtils.clamp(aim.offset+api.steer()*dt*2,-b.width-1,b.width+1);const good=safeLanding(aim.offset,b.width);
      line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(Array.from({length:41},(_,i)=>jumpPoint(start,end,a.up,b.up,i/40,aim.route.arcHeight)));
      ring.position.copy(end).addScaledVector(b.up,-.43);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),b.up);ring.material.color.setHex(good?0x9cefff:0xff8c91);line.material.color.copy(ring.material.color);line.visible=ring.visible=true;api.landingUniform.value=aim.route.to*p.length;
      help.textContent=`${aim.route.name} · ${aim.route.detail} · A/D aim · Release Jump ${good?'to leap':'— landing misses!'}`;help.classList.remove('hidden');return true;}
    const r=!p.falling&&p.height===0?available():null;
    if(r){help.textContent=`${r.name} → saves ${r.saved} Å · Hold Jump to preview, release to leap`;help.classList.remove('hidden');}else help.classList.add('hidden');
    return false;
  }
  return {configure,reset,press,release,update,cancelAim(){if(aim)clearAim();},get routes(){return routes.map(({from,to,arcHeight,name,detail})=>({from,to,arcHeight,name,detail}));},get count(){return routes.length;},get airborne(){return !!flight;}};
}
