import * as THREE from 'three';

// The face rides on the shell independently of its rolling stripe, so it stays readable.
export function createMarbleFace() {
  const group = new THREE.Group();
  const ink = new THREE.MeshBasicMaterial({ color: 0x163b3b });
  const white = new THREE.MeshBasicMaterial({ color: 0xfffef4 });
  const pink = new THREE.MeshBasicMaterial({ color: 0xf3a4a9 });
  const blue = new THREE.MeshBasicMaterial({ color: 0x8bdfff });
  const gold = new THREE.MeshBasicMaterial({ color: 0xffe891 });
  function sphere(parent, material, x, y, z, sx, sy, sz) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), material);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh);
    return mesh;
  }
  function stroke(parent, points, material = ink, thickness = .018) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, thickness, 6, false), material);
    parent.add(mesh); return mesh;
  }
  const eyes = [], brows = [], tears = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(side * .18, .105, .455); group.add(eye);
    sphere(eye, white, 0, 0, 0, .145, .175, .085);
    const pupil = sphere(eye, ink, 0, 0, .08, .074, .097, .025);
    sphere(pupil, white, -.27, .32, .9, .26, .24, .18);
    eyes.push({ eye, pupil });
    sphere(group, pink, side * .305, -.095, .406, .078, .039, .024);
    const brow = stroke(group, [[-.085,0,0],[0,.027,0],[.085,0,0]], ink, .019);
    brow.position.set(side*.18,.33,.415); brows.push(brow);
    const tearMaterial=blue.clone();tearMaterial.transparent=true;
    const tear = sphere(group, tearMaterial, side*.18,-.045,.555,.025,.05,.018);
    tear.name='tear';
    tear.visible=false; tears.push(tear);
  }
  const mouths = {};
  function mouth(name, points) { const g=new THREE.Group();stroke(g,points);group.add(g);mouths[name]=g; }
  mouth('smile',[[-.13,-.14,.48],[0,-.20,.505],[.13,-.14,.48]]);
  mouth('sad',[[-.13,-.21,.47],[0,-.14,.505],[.13,-.21,.47]]);
  mouth('bump',[[-.13,-.17,.48],[-.065,-.14,.50],[0,-.19,.51],[.065,-.14,.50],[.13,-.17,.48]]);
  const happy = new THREE.Group();
  // Wide crescent with raised corners: unmistakably a grin at racing scale.
  const grinShape = new THREE.Shape();
  grinShape.moveTo(-.175, -.105);
  grinShape.quadraticCurveTo(0, -.15, .175, -.105);
  grinShape.bezierCurveTo(.12, -.285, -.12, -.285, -.175, -.105);
  const grin = new THREE.Mesh(new THREE.ShapeGeometry(grinShape, 24), ink);
  grin.position.z = .52; happy.add(grin);
  const teethShape = new THREE.Shape();
  teethShape.moveTo(-.139, -.13);
  teethShape.quadraticCurveTo(0, -.162, .139, -.13);
  teethShape.quadraticCurveTo(0, -.239, -.139, -.13);
  const teeth = new THREE.Mesh(new THREE.ShapeGeometry(teethShape, 24), white);
  teeth.position.z = .523; happy.add(teeth);
  group.add(happy);mouths.happy=happy;
  const surprised = new THREE.Group();
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.058,.019,8,24),ink);
  ring.position.set(0,-.17,.505);surprised.add(ring);group.add(surprised);mouths.jump=surprised;
  const sparkles = new THREE.Group(); group.add(sparkles);
  for(let i=0;i<5;i++) {
    const spark=new THREE.Mesh(new THREE.OctahedronGeometry(.055),gold);
    const angle=i/5*Math.PI*2;spark.position.set(Math.cos(angle)*.68,Math.sin(angle)*.62,.12);
    sparkles.add(spark);
  }
  const gaze = new THREE.Vector3();
  let reaction='smile', remaining=0, clock=0;
  function react(kind, duration=1.4) { reaction=kind;remaining=duration; }
  function reset() { reaction='smile';remaining=0;clock=0; }
  function update(dt, { camera, position, lookTarget, falling=false, jumping=false, boosting=false, won=false }) {
    clock+=dt;remaining=Math.max(0,remaining-dt);
    const mood=falling?'sad':won?'happy':remaining>0?reaction:boosting?'happy':jumping?'jump':'smile';
    group.quaternion.copy(camera.quaternion);
    // Project the upcoming course into the face's coordinate system to move both pupils.
    gaze.copy(lookTarget).sub(position).applyQuaternion(camera.quaternion.clone().invert());
    const gx=THREE.MathUtils.clamp(gaze.x*.015,-.043,.043);
    const gy=THREE.MathUtils.clamp(gaze.y*.012,-.035,.045);
    const blinkPhase=clock%4.7;
    const blink=mood==='smile'&&blinkPhase>4.5?Math.max(.12,Math.abs(blinkPhase-4.6)/.1):1;
    eyes.forEach(({eye,pupil},i)=>{
      eye.scale.y=(mood==='happy'?.83:mood==='bump'?(i===0?.3:.8):mood==='sad'?.85:1)*blink;
      pupil.position.x=THREE.MathUtils.lerp(pupil.position.x,gx,1-Math.exp(-9*dt));
      pupil.position.y=THREE.MathUtils.lerp(pupil.position.y,mood==='sad'?-.032:gy,1-Math.exp(-9*dt));
      brows[i].rotation.z=(i===0?1:-1)*(mood==='sad'?.38:mood==='bump'?-.35:0);
      brows[i].position.y=mood==='jump'?.37:.33;
      const tearPhase=(clock*1.4+i*.3)%1;
      tears[i].visible=mood==='sad';
      // Start at the lower eyelid; fade out before reaching the cheeks.
      tears[i].position.y=-.045-tearPhase*.115;
      tears[i].material.opacity=Math.min(1,tearPhase*8)*(1-tearPhase);
    });
    Object.entries(mouths).forEach(([name,mesh])=>mesh.visible=name===mood);
    sparkles.visible=mood==='happy';sparkles.rotation.z=clock*1.5;
    sparkles.scale.setScalar(1+Math.sin(clock*9)*.08);
    group.rotation.z+=mood==='bump'?Math.sin(clock*30)*.09:0;
    group.userData.mood=mood;
  }
  reset();
  return { group, react, reset, update };
}
