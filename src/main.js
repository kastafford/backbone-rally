import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { parsePDB, clamp, formatTime } from './protein.js';
import './style.css';
import { renderShortcutProgress } from './progress-shortcuts.js';
import { createShortcuts } from './shortcuts.js';
import { createSound } from './sound.js';
import { createSidechain, setSidechainHit } from './sidechain.js';
import { createMarbleFace } from './marble-face.js';

const sound = createSound();
const $ = s => document.querySelector(s);
const helixIcon = `<svg viewBox="0 0 40 40" fill="none"><path d="M10 5C42 10-2 17 29 23S4 34 28 37M28 3C-2 10 42 17 10 24S38 33 12 38" stroke="#b6f9c9" stroke-width="2.5"/><path d="M12 9h14M13 18h13M13 28h14" stroke="#b6f9c9" stroke-opacity=".3"/></svg>`;
const myoglobinIcon = `<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><g stroke-linecap="round" stroke-linejoin="round"><path d="M9 7C3 1 1 14 6 19M12 29C11 38 21 39 24 32M29 9C35 1 40 8 35 16" stroke="#88bbb8" stroke-width="1.5"/><path d="M8 6C18 7 1 12 11 14S4 20 13 22S7 28 15 30M20 33C30 31 13 27 23 25S16 19 25 17S19 11 27 9M32 13C41 15 25 19 34 21S27 27 35 29" stroke="#cf94b5" stroke-width="2.4"/><path d="m11 7 3 22m9 3 3-22m7 5 2 13" stroke="#cf94b5" stroke-opacity=".3" stroke-width="1.2"/><path d="m16 15 5 2-2 6-5-2Z" stroke="#e4ce86" stroke-width="1.3"/></g></svg>`;
$('#app').innerHTML = `<div class="app"><header><div class="brand">${helixIcon}<div class="brand-name">backbone<span>rally</span></div></div><div class="header-right"><span>A molecular marble run</span><span class="live">PLAYABLE EXPERIMENT</span></div></header><div class="workspace"><aside><div class="eyebrow">SMALL MARBLE. BIG MOLECULE.</div><h1 class="side-title">Take the scenic<br>route through life.</h1><p class="intro">Ride the ribbon. Find your flow.<br>Roll from the N to the C terminus of a real protein structure.</p><div class="section-label"><span class="eyebrow">Choose your protein</span><small>01 — 03</small></div><button class="course active" data-id="1CRN"><span class="course-icon">${helixIcon}</span><span class="course-main"><strong>Crambin</strong><small>1CRN · 46 residues · <span class="tag">Starter</span></small></span><span class="arrow">↗</span></button><button class="course" data-id="1UBQ"><span class="course-icon"><svg viewBox="0 0 40 40" fill="none"><path d="M8 5v27l5-5M20 35V8l-5 5M30 5v27l5-5" stroke="#a9b5ff" stroke-width="3" stroke-linecap="round"/></svg></span><span class="course-main"><strong>Ubiquitin</strong><small>1UBQ · 76 residues · Explorer</small></span><span class="arrow muted">↗</span></button><button class="course" data-id="1MBN"><span class="course-icon">${myoglobinIcon}</span><span class="course-main"><strong>Myoglobin</strong><small>1MBN · 153 residues · Endurance</small></span><span class="arrow muted">↗</span></button><form class="custom" id="pdb-form"><label class="eyebrow" for="pdb-input">Or explore your own</label><div class="input-row"><input id="pdb-input" aria-label="PDB accession code" placeholder="Enter PDB code, e.g. 1MBN" maxlength="4" pattern="[0-9][A-Za-z0-9]{3}" required><button aria-label="Load protein" id="load-pdb">↗</button></div><div class="hint" id="load-status" role="status">Any classic 4-character PDB ID. First protein chain.</div></form><div class="divider"></div><div class="eyebrow">Know your terrain</div><div class="legend"><span><i class="dot helix"></i>α-helix</span><span><i class="dot sheet"></i>β-sheet</span><span><i class="dot loop"></i>Loop</span></div><div class="divider"></div><div class="eyebrow">The controls</div><div class="controls"><span>Accelerate / brake</span><span class="keys"><kbd>W</kbd><kbd>S</kbd></span><span>Steer</span><span class="keys"><kbd>A</kbd><kbd>D</kbd></span><span>Jump / hold for shortcut</span><kbd>SPACE</kbd><span>Water boost</span><kbd>SHIFT</kbd><span>Pause / restart</span><span class="keys"><kbd>ESC</kbd><kbd>R</kbd></span></div><p class="side-footer">Arrow keys work too. Collect dark red waters for boost; avoid tryptophan side-chain obstacles.<br><a href="https://www.rcsb.org/" target="_blank" rel="noreferrer">Structure data by RCSB PDB ↗</a></p></aside><main class="stage"><canvas id="viewport" aria-label="Interactive 3D protein marble race"></canvas><div class="stage-top"><div class="course-heading"><div class="eyebrow" id="course-code">COURSE 01 / 1CRN</div><h2 id="protein-title">Crambin</h2><div class="sub" id="protein-meta">Loading molecular terrain…</div></div><div class="stage-actions"><button class="icon-button" id="courses-toggle">Courses</button><button class="icon-button" id="view-button">↻ Recenter</button><button class="icon-button" id="sound-button" aria-label="Mute sound effects" aria-pressed="false">Sound on</button><button class="icon-button" id="pause-button" aria-label="Pause game">Ⅱ</button></div></div><div class="view-label" id="view-label">ORBIT VIEW · DRAG TO EXPLORE</div><div class="world-label" id="n-label">N · START</div><div class="world-label end" id="c-label">C · FINISH</div><div class="start-card" id="start-card"><h3>A whole new kind of joyride.</h3><p>One tiny marble. A beautifully folded road.<br>Crambin has two fold shortcuts. Look for cyan rings; hold Jump to aim, release to leap.</p><button class="primary" id="start-button" disabled>Loading course… <span>→</span></button><div class="under-button">REAL BACKBONE. ARCADE PHYSICS.</div></div><div class="toast" role="status" aria-live="polite" id="toast"></div><div class="status-chip"><i></i><span id="structure-note">Backbone traced from experimental coordinates</span></div><div class="touch-controls"><div><button data-key="ArrowLeft" aria-label="Steer left">←</button><button data-key="ArrowRight" aria-label="Steer right">→</button></div><div><button data-key="Space" aria-label="Jump">↥</button><button data-key="ArrowUp" aria-label="Accelerate">▲</button><button data-key="ArrowDown" aria-label="Brake">▼</button></div></div><div class="bottom-bar"><div class="progress-block"><div class="progress-text"><span>N TERMINUS</span><span id="progress-text">0 / 46</span><span>C</span></div><div class="progress-track"><div class="progress-fill" id="progress-fill"></div><div id="progress-shortcuts" class="progress-shortcuts hidden" role="group" aria-label="Shortcut launch and landing positions"></div></div></div><div class="stat"><label>TIME</label><strong id="time">00:00.00</strong></div><div class="stat"><label>WATERS</label><strong class="orb" id="waters">0 <small>/ 8</small></strong></div><div class="stat"><label>SPEED</label><strong id="speed">0.0 <small>Å/s</small></strong></div></div><div class="modal hidden" id="modal"><div class="modal-card"><div class="eyebrow" id="modal-eyebrow">TAKE A BREATHER</div><h2 id="modal-title">Paused.</h2><p id="modal-body">Your marble is right where you left it.</p><button class="primary" id="modal-primary">Resume →</button><button class="icon-button" id="modal-secondary">Course overview</button></div></div></main></div><footer><span>BACKBONE RALLY <span style="color:#436068">/</span> EXPERIMENT 001</span><span>Follow the fold. Enjoy the ride.</span><span>BUILT FROM THE BUILDING BLOCKS OF LIFE</span></footer></div>`;

const canvas = $('#viewport');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x142229, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, .08, 1500);
camera.position.set(55,40,65);
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true; orbit.autoRotate = true; orbit.autoRotateSpeed = .45;
orbit.minDistance = 8; orbit.maxDistance = 500;
scene.add(new THREE.HemisphereLight(0xc8e7ee, 0x243746, 2.7));
const keyLight = new THREE.DirectionalLight(0xe6fff0, 3); keyLight.position.set(20,40,30); scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x95bfff, 2.4); rimLight.position.set(-30,-10,-20); scene.add(rimLight);
const ambientDots = new THREE.BufferGeometry();
const stars=[];let seed=319;
const random=()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};
for(let i=0;i<450;i++) stars.push((random()-.5)*240,(random()-.5)*180,(random()-.5)*240);
ambientDots.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
scene.add(new THREE.Points(ambientDots,new THREE.PointsMaterial({color:0x789c9f,size:.12,transparent:true,opacity:.38})));
const CHASE = { distance: 9, elevation: 6, lookAhead: 4, fov: 50 };
const trackUniforms={raceMode:{value:0},playerDistance:{value:0},landingDistance:{value:-1000}};
let ghostTrack;
const COLORS={helix:0xcf94b5,sheet:0xe4ce86,loop:0x88bbb8};
let courseGroup = new THREE.Group(); scene.add(courseGroup);
let protein, curve, frames, samples=[], length=1, segments=1000, radius=30, items=[], obstacles=[], gaps=[];
let state='loading', elapsed=0, distance=0, lateral=0, lateralVelocity=0, speed=0, height=0, jumpVelocity=0, waters=0, charge=0, checkpoint=0, falls=0, boostTime=0, fallTime=0, toastTime=0, loadedId='', loadToken=0;
const keys=new Set();
const marble=new THREE.Group();
const ball=new THREE.Mesh(new THREE.SphereGeometry(.5,32,24),new THREE.MeshPhysicalMaterial({color:0xe8f8f4,metalness:.18,roughness:.25,clearcoat:1}));
marble.add(ball);
const stripe = new THREE.Mesh(new THREE.TorusGeometry(.501,.032,8,40),new THREE.MeshStandardMaterial({color:0x235d58,metalness:.4,roughness:.3}));
ball.add(stripe);
const face=createMarbleFace();marble.add(face.group);
scene.add(marble);
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.62,24),new THREE.MeshBasicMaterial({color:0x09282a,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}));scene.add(shadow);
const shortcuts=createShortcuts({
  scene,camera,marble,shadow,sound,landingUniform:trackUniforms.landingDistance,sample,
  status:()=>({distance,length,lateral,height,falling:fallTime>0}),
  steer:()=>((keys.has('KeyD')||keys.has('ArrowRight'))?1:0)-((keys.has('KeyA')||keys.has('ArrowLeft'))?1:0),
  land(t,offset,safe){distance=t*length;lateral=offset;lateralVelocity=0;height=0;jumpVelocity=0;speed=4;updateMarble(0);
    if(safe){checkpoint=distance;sound.play('checkpoint');face.react('happy',1.5);showToast('Shortcut landed! New checkpoint · Keep rolling toward C');}
    else fall();
  }
});
const v=new THREE.Vector3();
// Frenet normal points screen-left when looking forward with the binormal as up.
// Negate it so positive lateral motion (D / right arrow) is screen-right.
function sample(t) {
  const x=clamp(t,0,1)*segments, i=Math.min(segments-1,Math.floor(x)), f=x-i;
  return {p:samples[i].p.clone().lerp(samples[i+1].p,f),right:frames.normals[i].clone().lerp(frames.normals[i+1],f).normalize().negate(),up:frames.binormals[i].clone().lerp(frames.binormals[i+1],f).normalize(),forward:frames.tangents[i].clone().lerp(frames.tangents[i+1],f).normalize(),width:samples[i].width*(1-f)+samples[i+1].width*f,index:Math.round(samples[i].residue)};
}
function place(mesh,t,offset=0,lift=0) {const s=sample(t);mesh.position.copy(s.p).addScaledVector(s.right,offset).addScaledVector(s.up,lift);return s;}
function disposeCourse(){courseGroup.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();});scene.remove(courseGroup);courseGroup=new THREE.Group();scene.add(courseGroup);}
function makeCourse(data){
  disposeCourse(); protein=data; items=[];obstacles=[];gaps=[];
  const points=data.residues.map(r=>new THREE.Vector3(...r.xyz));
  const center=new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());points.forEach(p=>p.sub(center));
  curve=new THREE.CatmullRomCurve3(points,false,'centripetal');curve.arcLengthDivisions=points.length*35;curve.updateArcLengths();length=curve.getLength();segments=Math.max(1000,points.length*24);frames=curve.computeFrenetFrames(segments,false);
  // Map uniform arc distance back to residue indices, so secondary structure stays aligned.
  samples=[];
  const widths={sheet:1.7,helix:1.4,loop:1.12};
  for(let i=0;i<=segments;i++){
    const u=i/segments,t=curve.getUtoTmapping(u),residue=t*(points.length-1);
    const left=Math.floor(residue),right=Math.min(left+1,points.length-1);
    // Ease across a residue interval instead of snapping width at its midpoint.
    const f=residue-left,blend=f*f*f*(f*(f*6-15)+10);
    const a=data.residues[left].type,b=data.residues[right].type;
    samples.push({p:curve.getPointAt(u),residue,
      width:THREE.MathUtils.lerp(widths[a],widths[b],blend),
      color:new THREE.Color(COLORS[a]).lerp(new THREE.Color(COLORS[b]),blend)});
  }
  for(const index of data.gaps){const a=samples.findIndex(s=>s.residue>=index-1),b=samples.findIndex(s=>s.residue>=index);if(a>=0&&b>a){const dist=(b-a)/segments*length;if(dist<=16)gaps.push({start:(a+(b-a)*.3)/segments,end:(a+(b-a)*.7)/segments});}}
  // Subdivide across the ribbon too: twisted turns need more than two triangles.
  const across=8,stride=across+1;
  const positions=[],colors=[],indices=[],pathDistances=[];
  for(let i=0;i<=segments;i++){
    const s=samples[i];
    for(let j=0;j<=across;j++){
      const side=j/across*2-1;
      const p=s.p.clone().addScaledVector(frames.normals[i],side*s.width);
      positions.push(...p);colors.push(s.color.r,s.color.g,s.color.b);
      pathDistances.push(i/segments*length);
    }
    if(i<segments&&!gaps.some(g=>i/segments>g.start&&i/segments<g.end)){
      for(let j=0;j<across;j++){
        const n=i*stride+j;
        indices.push(n,n+stride,n+1,n+1,n+stride,n+stride+1);
      }
    }
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geom.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geom.setIndex(indices);
  // Derive lighting from the actual tapered, twisted surface rather than the centerline.
  geom.computeVertexNormals();
  geom.setAttribute('pathDistance',new THREE.Float32BufferAttribute(pathDistances,1));
  const trackMaterial=new THREE.MeshStandardMaterial({vertexColors:true,metalness:.23,roughness:.43,side:THREE.DoubleSide});
  trackMaterial.onBeforeCompile=shader=>{Object.assign(shader.uniforms,trackUniforms);shader.vertexShader='attribute float pathDistance; varying float vPathDistance;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPathDistance = pathDistance;');shader.fragmentShader='uniform float raceMode; uniform float playerDistance; uniform float landingDistance; varying float vPathDistance;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nif (raceMode > 0.5 && (vPathDistance < playerDistance - 3.0 || vPathDistance > playerDistance + 22.0) && abs(vPathDistance - landingDistance) > 7.0) discard;');};
  courseGroup.add(new THREE.Mesh(geom,trackMaterial));
  ghostTrack=new THREE.Mesh(geom.clone(),new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.045,depthWrite:false,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1}));ghostTrack.visible=false;courseGroup.add(ghostTrack);
  // Thin luminous margins make the ribbon readable from both sides.
  for(const side of [-1,1]){const edge=[];for(let i=0;i<segments;i++){if(gaps.some(g=>i/segments>g.start&&i/segments<g.end))continue;for(const j of [i,i+1])edge.push(...samples[j].p.clone().addScaledVector(frames.normals[j],side*samples[j].width).addScaledVector(frames.binormals[j],.035));}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(edge,3));courseGroup.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xd5f5e4,transparent:true,opacity:.5})));}
  // Small cross-track marks suggest the individual residues without obscuring the track.
  for(let r=1;r<points.length-1;r++){const i=samples.findIndex(s=>s.residue>=r),s=sample(i/segments);const g=new THREE.BufferGeometry().setFromPoints([s.p.clone().addScaledVector(s.right,-s.width*.92).addScaledVector(s.up,.045),s.p.clone().addScaledVector(s.right,s.width*.92).addScaledVector(s.up,.045)]);courseGroup.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:0x203e3e,transparent:true,opacity:.22})));}
  for(let r=4;r<points.length-2;r+=5){const i=samples.findIndex(s=>s.residue>=r),t=i/segments;if(gaps.some(g=>t>g.start-.01&&t<g.end+.01))continue;const mesh=new THREE.Mesh(new THREE.SphereGeometry(.35,20,14),new THREE.MeshStandardMaterial({color:0x780f21,emissive:0x250208,emissiveIntensity:.2,metalness:.12,roughness:.26}));const offset=Math.sin(r*1.7)*.7;place(mesh,t,offset,.95);courseGroup.add(mesh);items.push({mesh,t,offset,collected:false});}
  for(let r=8;r<points.length-3;r+=9){const i=samples.findIndex(s=>s.residue>=r),t=i/segments;if(gaps.some(g=>t>g.start-.02&&t<g.end+.02))continue;const offset=(r%2?-.65:.65);const mesh=createSidechain();const pose=place(mesh,t,offset,.04);mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(pose.right,pose.up,pose.forward.clone().negate()));courseGroup.add(mesh);obstacles.push({mesh,t,offset,hit:false});}
  for(const t of [0,1]){const s=sample(t);const gate=new THREE.Mesh(new THREE.TorusGeometry(2,.065,8,64),new THREE.MeshStandardMaterial({color:t?0xb4a7ff:0xb6f9c9,emissive:t?0x675991:0x598565,emissiveIntensity:.6}));gate.position.copy(s.p).addScaledVector(s.up,.8);gate.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),s.forward);courseGroup.add(gate);}
  radius=new THREE.Box3().setFromPoints(points).getSize(new THREE.Vector3()).length()*.57;
  shortcuts.configure(data.id,samples,length,data.residues,gaps,obstacles);
  renderShortcutProgress($('#progress-shortcuts'),shortcuts.routes);
  $('#start-card p').textContent=shortcuts.count?`${shortcuts.count} fold shortcut${shortcuts.count===1?'':'s'} found. Look for cyan rings; hold Jump to aim, release to leap.`:'No convenient shortcuts found in this fold. Follow the ribbon and jump over obstacles.';
  reset();overview();
}
function reset(){shortcuts.reset();sound.stop();face.reset();distance=0;lateral=0;lateralVelocity=0;speed=0;height=0;jumpVelocity=0;elapsed=0;waters=0;charge=0;checkpoint=0;falls=0;boostTime=0;fallTime=0;keys.clear();items.forEach(i=>{i.collected=false;i.mesh.visible=true;});obstacles.forEach(o=>{o.hit=false;setSidechainHit(o.mesh,false);});updateMarble(0);updateHUD();}
function overview(){camera.fov=42;camera.updateProjectionMatrix();state='ready';trackUniforms.raceMode.value=0;if(ghostTrack)ghostTrack.visible=false;orbit.enabled=true;orbit.autoRotate=true;camera.up.set(0,1,0);camera.position.set(radius*1.75,radius*.9,radius*1.8);orbit.target.set(0,-radius*.45,0);camera.lookAt(orbit.target);$('#start-card').classList.remove('hidden');$('#modal').classList.add('hidden');$('.touch-controls').classList.remove('playing');$('#view-label').textContent='ORBIT VIEW · DRAG TO EXPLORE';$('#pause-button').textContent='Ⅱ';}
function start(){if(!protein)return;camera.fov=CHASE.fov;camera.updateProjectionMatrix();reset();sound.gesture('start');state='playing';trackUniforms.raceMode.value=1;if(ghostTrack)ghostTrack.visible=true;orbit.enabled=false;orbit.autoRotate=false;speed=4;$('#start-card').classList.add('hidden');$('#modal').classList.add('hidden');$('.app').classList.remove('course-menu');$('.touch-controls').classList.add('playing');$('#view-label').textContent='CHASE VIEW · N → C';const s=sample(0);camera.position.copy(s.p).addScaledVector(s.forward,-CHASE.distance).addScaledVector(s.up,CHASE.elevation);camera.up.copy(s.up);showToast('Hold W to roll · A / D to steer · Space to jump');}
function showToast(message){$('#toast').textContent=message;toastTime=3;$('#toast').classList.add('visible');}
function pause(){if(!['playing','paused'].includes(state))return;if(state==='paused'){sound.gesture();state='playing';$('#modal').classList.add('hidden');$('#pause-button').textContent='Ⅱ';return;}shortcuts.cancelAim();sound.stop();state='paused';keys.clear();$('#modal-eyebrow').textContent='TAKE A BREATHER';$('#modal-title').textContent='Paused.';$('#modal-body').textContent='Your marble is right where you left it.';$('#modal-primary').textContent='Resume →';$('#modal').classList.remove('hidden');$('#pause-button').textContent='▷';}
function win(){sound.stop();sound.play('finish');state='won';speed=0;let best;try{const k=`backbone-best-${loadedId}`,old=Number(localStorage.getItem(k));best=old>0?Math.min(old,elapsed):elapsed;localStorage.setItem(k,String(best));}catch{best=elapsed;}$('#modal-eyebrow').textContent='C TERMINUS REACHED';$('#modal-title').textContent='You followed the fold.';$('#modal-body').textContent=`${formatTime(elapsed)} · ${waters} / ${items.length} waters · ${falls} falls. Personal best: ${formatTime(best)}. Ready for another lap?`;$('#modal-primary').textContent='Race again →';$('#modal').classList.remove('hidden');$('.touch-controls').classList.remove('playing');}
function fall(){if(fallTime)return;sound.stop();sound.play('fall');fallTime=1;face.react('sad',2.5);falls++;speed=0;showToast('Off the ribbon! Returning to your checkpoint…');}
function updateMarble(dt){trackUniforms.playerDistance.value=distance;const s=place(marble,distance/length,lateral,.53+height);ball.rotateOnWorldAxis(s.right,speed*dt*1.7);shadow.position.copy(s.p).addScaledVector(s.right,lateral).addScaledVector(s.up,.055);shadow.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),s.up);shadow.scale.setScalar(Math.max(.35,1-height*.1));
  // A contact shadow belongs on the ribbon, never in the air beside it.
  const edgeFade=1-THREE.MathUtils.smoothstep(Math.abs(lateral),Math.max(0,s.width-.65),s.width-.15);
  shadow.material.opacity=.28*edgeFade*(1-THREE.MathUtils.smoothstep(height,0,4));
  shadow.visible=height>=0&&shadow.material.opacity>.005&&!gaps.some(g=>distance/length>g.start&&distance/length<g.end);return s;}
function updateGame(dt){
  elapsed+=dt;
  if(shortcuts.update(dt))return;
  if(fallTime>0){fallTime-=dt;height-=dt*(fallTime>.6?2:9);if(fallTime<=0){distance=checkpoint;lateral=0;lateralVelocity=0;height=0;jumpVelocity=0;speed=3;fallTime=0;sound.play('respawn');}updateMarble(dt);return;}
  const throttle=keys.has('KeyW')||keys.has('ArrowUp'),brake=keys.has('KeyS')||keys.has('ArrowDown');
  boostTime=Math.max(0,boostTime-dt);
  speed=clamp(speed+((throttle?5:-1.2)-(brake?13:0)+(boostTime>0?12:0))*dt,0,boostTime>0?18:10);
  const steer=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
  const s=sample(distance/length),ahead=sample((distance+1)/length);
  const bend=ahead.forward.clone().sub(s.forward).dot(s.right);
  lateralVelocity+=(steer*7-bend*speed*speed*.045)*dt;lateralVelocity*=Math.exp(-3.1*dt);lateral+=lateralVelocity*dt;
  const prev=distance;distance=Math.min(length,distance+speed*dt);
  if(height>0||jumpVelocity>0){jumpVelocity-=12*dt;height+=jumpVelocity*dt;if(height<0){height=0;jumpVelocity=0;if(Math.abs(lateral)<=s.width+.12&&!gaps.some(g=>distance/length>g.start&&distance/length<g.end))sound.play('land');}}
  if(Math.abs(lateral)>s.width+.12&&height<.45){fall();return;}
  if(gaps.some(g=>distance/length>g.start&&distance/length<g.end)&&height<.2){fall();return;}
  const upcoming=gaps.find(g=>g.start*length>distance&&g.start*length-distance<12);if(upcoming&&toastTime<=0)showToast('Backbone gap ahead — build speed and jump!');
  for(const i of items){if(!i.collected&&Math.abs(i.t*length-distance)<.9&&Math.abs(lateral-i.offset)<.85&&height<1.8){i.collected=true;i.mesh.visible=false;waters++;charge++;sound.play('water');face.react('happy',1.6);showToast(`Water collected · ${charge} boost${charge===1?'':'s'} ready · Shift`);}}
  for(const o of obstacles){if(!o.hit&&prev<=o.t*length+.7&&distance>=o.t*length-.7&&Math.abs(lateral-o.offset)<.82&&height<.85){o.hit=true;sound.play('bump');face.react('bump',1.3);speed*=.3;lateralVelocity+=lateral<o.offset?-2.5:2.5;setSidechainHit(o.mesh,true);showToast('Side-chain bump! Jump or steer around bulky side chains.');}}
  const interval=length/Math.ceil(protein.residues.length/10);const nextCheckpoint=Math.floor(distance/interval)*interval;
  if(nextCheckpoint>checkpoint&&!gaps.some(g=>nextCheckpoint/length>g.start-.015&&nextCheckpoint/length<g.end+.015)&&height<.1){checkpoint=nextCheckpoint;sound.play('checkpoint');showToast('Checkpoint reached ✦');}
  const here=updateMarble(dt);
  const target=here.p.clone().addScaledVector(here.right,lateral*.5).addScaledVector(here.up,CHASE.elevation).addScaledVector(here.forward,-CHASE.distance);
  camera.position.lerp(target,1-Math.exp(-5*dt));camera.up.lerp(here.up,1-Math.exp(-4*dt)).normalize();camera.lookAt(here.p.clone().addScaledVector(here.forward,CHASE.lookAhead).addScaledVector(here.up,.8));
  if(distance>=length-.1)win();
}
function updateHUD(){if(!protein)return;$('#progress-fill').style.width=`${distance/length*100}%`;$('#progress-text').textContent=`${distance===0?0:Math.min(protein.residues.length,sample(distance/length).index+1)} / ${protein.residues.length}`;$('#time').textContent=formatTime(elapsed);$('#waters').innerHTML=`${waters} <small>/ ${items.length}</small>`;$('#speed').innerHTML=`${speed.toFixed(1)} <small>Å/s</small>`;}
function label(el,t){const p=sample(t).p.clone().project(camera);el.style.left=`${(p.x*.5+.5)*canvas.clientWidth}px`;el.style.top=`${(-p.y*.5+.5)*canvas.clientHeight}px`;el.style.display=(p.z>1||p.z< -1||state==='playing'||state==='paused')?'none':'block';}
async function load(id){
  shortcuts.reset();sound.stop();const token=++loadToken;const oldState=state;state='loading';keys.clear();$('#start-button').disabled=true;$('#load-pdb').disabled=true;$('#load-status').textContent=`Loading ${id}…`;$('#load-status').classList.remove('error');
  try{const local=['1CRN','1UBQ','1MBN'].includes(id);const response=await fetch(local?`/structures/${id}.pdb`:`https://files.rcsb.org/download/${id}.pdb`,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error(`Could not find ${id}. Check the code and try again.`);const data=parsePDB(await response.text(),id);if(token!==loadToken)return;makeCourse(data);loadedId=id;const name={ '1CRN':'Crambin','1UBQ':'Ubiquitin','1MBN':'Myoglobin' }[id]||`Protein ${id}`;$('#course-code').textContent=`${id==='1CRN'?'COURSE 01':id==='1UBQ'?'COURSE 02':id==='1MBN'?'COURSE 03':'CUSTOM COURSE'} / ${id}`;$('#protein-title').textContent=name;$('#protein-meta').textContent=`${data.residues.length} residues · Chain ${data.chain} · ${length.toFixed(0)} Å of ribbon`;$('#load-status').textContent=data.gaps.length?`${data.gaps.length} backbone break(s); short gaps are jumpable, long gaps bridged.`:'First protein chain · Experimental backbone coordinates';$('#start-button').innerHTML='Let’s roll <span>→</span>';document.querySelectorAll('.course').forEach(b=>b.classList.toggle('active',b.dataset.id===id));$('.app').classList.remove('course-menu');}
  catch(error){if(token!==loadToken)return;state=protein?(oldState==='loading'?'ready':oldState):'loading';$('#load-status').textContent=error.name==='TimeoutError'?'The download timed out. Please try again.':error.message;$('#load-status').classList.add('error');if(!protein){$('#start-button').textContent='Retry loading';$('#start-button').disabled=false;}}
  finally{if(token===loadToken){$('#load-pdb').disabled=false;if(protein)$('#start-button').disabled=false;}}
}
function action(code){if(code==='Escape'){pause();return;}if(code==='KeyR'&&protein&&state!=='loading'){start();return;}if(code==='Space'){if(state==='ready'){start();return;}if(state==='playing'&&height===0&&!fallTime&&!shortcuts.airborne){if(shortcuts.press())return;jumpVelocity=6.5;height=.01;sound.gesture('jump');}}if((code==='ShiftLeft'||code==='ShiftRight')&&state==='playing'&&charge>0){charge--;boostTime=1.8;sound.gesture('boost');face.react('happy',1.8);showToast(`Water boost! ${charge} remaining`);}}
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(e.target instanceof HTMLButtonElement&&['Space','Enter'].includes(e.code))return;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(!keys.has(e.code))action(e.code);keys.add(e.code);});window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space'&&state==='playing')shortcuts.release();});window.addEventListener('blur',()=>{keys.clear();if(state==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
$('#start-button').onclick=()=>{if(protein)start();else load('1CRN');$('#start-button').blur();};$('#pause-button').onclick=()=>{pause();$('#pause-button').blur();};$('#modal-primary').onclick=()=>{if(state==='paused')pause();else start();$('#modal-primary').blur();};$('#modal-secondary').onclick=()=>{reset();overview();$('#modal-secondary').blur();};$('#view-button').onclick=()=>{if(state==='ready')overview();else showToast('Chase camera follows your marble. Pause to return to overview.');$('#view-button').blur();};$('#courses-toggle').onclick=()=>{if(innerWidth<=650){if(state==='playing')pause();$('.app').classList.toggle('course-menu');}else{if(state==='playing')pause();document.querySelector('aside').scrollTo({top:0,behavior:'smooth'});showToast('Choose a course in the left panel');}$('#courses-toggle').blur();};
for(const button of document.querySelectorAll('.course'))button.onclick=()=>load(button.dataset.id);
$('#pdb-form').onsubmit=e=>{e.preventDefault();load($('#pdb-input').value.trim().toUpperCase());$('#pdb-input').blur();};
for(const b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);action(b.dataset.key);});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{keys.delete(b.dataset.key);if(b.dataset.key==='Space'&&state==='playing'){if(event==='pointerup')shortcuts.release();else shortcuts.cancelAim();}});}
const resize=()=>{const w=canvas.parentElement.clientWidth,h=canvas.parentElement.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe(canvas.parentElement);resize();
let trailerActive=false;
let last=performance.now();
function animate(now){requestAnimationFrame(animate);if(trailerActive)return;const dt=Math.min((now-last)/1000,.04);last=now;if(state==='playing')updateGame(dt);else if(state==='ready')orbit.update();if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('#toast').classList.remove('visible');}for(const i of items)if(!i.collected)i.mesh.rotation.y+=dt*.8;if(protein){face.update(state==='paused'||state==='loading'?0:dt,{camera,position:marble.position,lookTarget:sample((distance+7)/length).p,falling:fallTime>0,jumping:height>.1||shortcuts.airborne,boosting:boostTime>0,won:state==='won'});label($('#n-label'),0);label($('#c-label'),1);updateHUD();}renderer.render(scene,camera);}
requestAnimationFrame(animate);load('1CRN');
// Read-only diagnostics for development and playtesting.
window.__rally={get state(){return state;},get snapshot(){return {id:loadedId,state,distance,length,lateral,speed,height,waters,charge,falls,checkpoint,elapsed,gaps:gaps.length};}};

// Opt-in cinematic recording page; normal gameplay is unaffected.
if(new URLSearchParams(location.search).has('trailer')) {
  trailerActive=true;
  import('./trailer.js').then(({setupTrailer})=>setupTrailer({
    scene,camera,renderer,marble,face,stripe,shadow,trackUniforms,
    get routes(){return shortcuts.routes;},
    async prepare(){await load('1CRN');if(!protein)throw new Error('Course failed to load');},
    sample, get length(){return length;}, get radius(){return radius;},
    pose(t,offset=0,lift=0){distance=t*length;lateral=offset;height=lift;updateMarble(1/30);},
    get items(){return items;},get obstacles(){return obstacles;},
    ghost(show){ghostTrack.visible=show;}
  })).catch(error=>{document.body.textContent=error.message;});
}

function updateSoundButton(){
  const button=$('#sound-button');
  button.textContent=sound.muted?'Sound off':'Sound on';
  button.setAttribute('aria-label',sound.muted?'Enable sound effects':'Mute sound effects');
  button.setAttribute('aria-pressed',String(sound.muted));
}
$('#sound-button').onclick=()=>{sound.setMuted(!sound.muted);updateSoundButton();if(!sound.muted)sound.gesture('water');$('#sound-button').blur();};
updateSoundButton();
