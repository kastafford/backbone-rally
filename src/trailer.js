import * as THREE from 'three';
import { jumpPoint } from './jump.js';

const W=1280,H=720,DURATION=20;
export async function setupTrailer(game) {
  await game.prepare();
  game.stripe.visible=false; // Keep the close-up expressions unobscured.
  // Keep the game canvas mounted so its resize observer doesn't zero the render target.
  document.querySelector('.app').style.cssText='position:fixed;left:-2000px;width:1280px;height:720px;pointer-events:none';
  const panel=document.createElement('main');
  panel.style.cssText='position:fixed;inset:0;background:#101b21;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px';
  panel.innerHTML='<canvas id="trailer-preview" width="1280" height="720" style="width:min(100%,1280px);max-height:80vh;object-fit:contain"></canvas><div style="display:flex;gap:18px;align-items:center"><button id="record-trailer" style="padding:12px 24px;border:0;border-radius:8px;background:#b6f9c9;color:#152824;font-weight:700">Record 20-second trailer</button><span id="record-status" role="status">Ready · 1280 × 720 · 30 fps</span></div>';
  document.body.append(panel);
  await document.fonts.ready;
  const output=panel.querySelector('canvas'),ctx=output.getContext('2d');
  const button=panel.querySelector('button'),status=panel.querySelector('[role=status]');
  const {camera,renderer,face,marble}=game;
  renderer.setPixelRatio(1);renderer.setSize(W,H,false);
  camera.aspect=W/H;camera.fov=46;camera.updateProjectionMatrix();
  const confetti=new THREE.Group();game.scene.add(confetti);
  const sparkGeometry=new THREE.OctahedronGeometry(.065);
  const sparkMaterial=new THREE.MeshBasicMaterial({color:0xffdf9b});
  for(let i=0;i<35;i++){const m=new THREE.Mesh(sparkGeometry,sparkMaterial);confetti.add(m);}
  const base=new THREE.Vector3();
  const route=game.routes.at(-1);
  if(!route)throw new Error('The trailer course needs a shortcut.');
  const launch=game.sample(route.from),landing=game.sample(route.to);
  const jumpStart=launch.p.clone().addScaledVector(launch.up,.53);
  const jumpEnd=landing.p.clone().addScaledVector(landing.up,.53);
  const arc=new THREE.Line(new THREE.BufferGeometry().setFromPoints(
    Array.from({length:65},(_,i)=>jumpPoint(jumpStart,jumpEnd,launch.up,landing.up,i/64,route.arcHeight))
  ),new THREE.LineBasicMaterial({color:0x9cefff,transparent:true,opacity:.65}));
  game.scene.add(arc);
  const jumpCenter=jumpStart.clone().lerp(jumpEnd,.5).addScaledVector(launch.up,1);

  function text(line,x,y,size=22,color='#e7f3eb',weight=500,align='left') {
    ctx.font=`${weight} ${size}px "Space Grotesk", sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(line,x,y);
  }
  let previous=0;
  function frame(t) {
    const dt=Math.max(0,Math.min(.05,t-previous));previous=t;
    let progress=0,offset=0,lift=0,falling=false,happy=false;
    const shortcut=t>=10&&t<13.5;
    const jumpT=THREE.MathUtils.clamp((t-10.85)/1.15,0,1);
    if(t<3){progress=0;}
    else if(t<7){progress=(t-3)/4*.29;offset=Math.sin((t-3)*2)*.32;lift=t>5.5&&t<6.5?Math.sin((t-5.5)*Math.PI)*1.2:0;happy=t>4.3&&t<5.4;}
    else if(t<10){
      progress=.33;
      const width=game.sample(progress).width;
      const exit=THREE.MathUtils.smoothstep(t,7,7.65);
      // Keep the entire sphere above the surface until its trailing edge clears it.
      const drop=Math.max(0,(t-7.65)/(10-7.65));
      offset=THREE.MathUtils.lerp(width*.6,width+.8,exit)+drop*.9;
      lift=-drop*drop*2.5;
      falling=true;
    }
    else if(shortcut){progress=jumpT<1?route.from:route.to;happy=jumpT===1;}
    else if(t<16){progress=.86+(t-13.5)/2.5*.14;offset=Math.sin((t-13.5)*2)*.16;}
    else {progress=1;happy=true;}
    game.pose(progress,offset,lift);
    if(shortcut){
      marble.position.copy(jumpPoint(jumpStart,jumpEnd,launch.up,landing.up,jumpT,route.arcHeight));
      game.shadow.visible=jumpT===0||jumpT===1;
    }
    arc.visible=shortcut&&t<12;
    const s=game.sample(progress);
    game.trackUniforms.raceMode.value=t<3||falling||shortcut?0:1;game.ghost(t>=3&&!falling&&!shortcut);
    if(t<3){const a=.45+t*.18,r=game.radius*2.5;camera.position.set(Math.sin(a)*r,game.radius*.65,Math.cos(a)*r);camera.up.set(0,1,0);camera.lookAt(0,-game.radius*.1,0);}
    else if(shortcut){
      camera.position.copy(jumpCenter).addScaledVector(launch.forward,-2).addScaledVector(launch.up,8).addScaledVector(launch.right,11);
      camera.up.copy(launch.up);camera.lookAt(jumpCenter);
    }
    else {
      const close=falling||t>=16;
      const behind=close?3.2:8,elevation=close?1.9:5;
      camera.position.copy(marble.position).addScaledVector(s.forward,-behind).addScaledVector(s.up,elevation).addScaledVector(s.right,falling?1.2:0);
      camera.up.copy(s.up);
      camera.lookAt(marble.position.clone().addScaledVector(s.forward,close?0:2.2));
    }
    game.items.forEach(item=>item.mesh.visible=item.t>progress+.004);
    if(happy)face.react('happy',.2);
    face.update(dt,{camera,position:marble.position,lookTarget:game.sample(Math.min(1,progress+.05)).p,falling,jumping:lift>.1||(shortcut&&jumpT>0&&jumpT<1),won:t>=16});
    confetti.visible=t>=16;
    if(confetti.visible){base.copy(marble.position);confetti.children.forEach((m,i)=>{const angle=i*2.399+t*.6,r=.9+(i%5)*.28;m.position.copy(base).addScaledVector(s.right,Math.cos(angle)*r).addScaledVector(s.up,Math.sin(angle)*r+.5).addScaledVector(s.forward,(i%3-1)*.5);m.rotation.set(t+i,t*.7,0);});}
    renderer.render(game.scene,camera);
    const bg=ctx.createRadialGradient(W*.5,H*.45,20,W*.5,H*.5,780);bg.addColorStop(0,'#23383d');bg.addColorStop(1,'#0b171e');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.drawImage(renderer.domElement,0,0,W,H);
    const shade=ctx.createLinearGradient(0,0,0,H);shade.addColorStop(0,'#0b171ed9');shade.addColorStop(.22,'#0b171e00');shade.addColorStop(.65,'#0b171e00');shade.addColorStop(1,'#0b171eed');ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
    text('backbone rally',48,52,25,'#b6f9c9',700);
    text('A MOLECULAR MARBLE RUN',W-48,50,13,'#a1b8b8',500,'right');
    if(t<3){text('Small marble.',48,555,54,'#f0f7ed',700);text('Big molecule.',48,615,54,'#b6f9c9',700);text('Race through a real protein.',48,657,23,'#a7bdbd');}
    else if(t<7){text('Follow the fold.',48,608,45,'#f0f7ed',700);text('Ride helices. Dodge side chains. Collect waters.',48,650,22,'#adc2c2');}
    else if(t<10){text('A little slip…',48,610,44,'#f0f7ed',700);text('A tiny heartbreak.',48,650,24,'#d8b6c9');}
    else if(shortcut){text('Take a leap through the fold.',48,610,44,'#f0f7ed',700);text('Spot a shortcut. Aim. Jump.',48,650,23,'#9cefff');}
    else if(t<16){text('One more roll.',48,610,44,'#f0f7ed',700);text('The C terminus is calling.',48,650,23,'#adc2c2');}
    else if(t<18){text('C TERMINUS REACHED',W/2,563,17,'#b6f9c9',600,'center');text('You followed the fold.',W/2,625,48,'#f0f7ed',700,'center');}
    else {ctx.fillStyle='#0b171e55';ctx.fillRect(0,0,W,H);text('backbone rally',W/2,558,62,'#b6f9c9',700,'center');text('Your next adventure is molecular.',W/2,603,24,'#e9f1e9',500,'center');ctx.fillStyle='#b6f9c9';ctx.beginPath();ctx.roundRect(W/2-90,628,180,44,8);ctx.fill();text('LET’S ROLL →',W/2,657,18,'#173329',700,'center');}
    // Gentle opening/closing fades, without hiding the expression beats.
    const fade=t<.4?1-t/.4:t>19.6?(t-19.6)/.4:0;
    if(fade>0){ctx.fillStyle=`rgba(11,23,30,${fade})`;ctx.fillRect(0,0,W,H);}
  }
  frame(.8);
  for(const [label,time] of [['Preview fall',8.4],['Preview drop',9.7],['Preview aim',10.5],['Preview jump',11.4],['Preview landing',12.4],['Preview finish',17]]){const preview=document.createElement('button');preview.textContent=label;preview.style.cssText='padding:8px 12px;background:#20383c;color:#dcecdf;border:1px solid #466166;border-radius:6px';preview.onclick=()=>{previous=time-1/30;frame(time);};panel.lastElementChild.append(preview);}
  button.onclick=async()=>{
    button.disabled=true;face.reset();previous=0;
    try {
      const mime=['video/mp4;codecs=avc1.42001f','video/webm;codecs=vp9','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
      if(!mime)throw new Error('This browser cannot record canvas video.');
      const stream=output.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6500000});
      const chunks=[];recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      const done=new Promise(resolve=>recorder.onstop=resolve);
      recorder.start();const start=performance.now();
      await new Promise(resolve=>{
        function step(now){const elapsed=(now-start)/1000;frame(Math.min(elapsed,DURATION));status.textContent=`Recording… ${Math.min(DURATION,Math.floor(elapsed))} / ${DURATION}s`;if(elapsed<DURATION)requestAnimationFrame(step);else resolve();}
        requestAnimationFrame(step);
      });
      recorder.stop();await done;stream.getTracks().forEach(track=>track.stop());
      status.textContent='Saving video…';
      const blob=new Blob(chunks,{type:mime});
      const response=await fetch('/__trailer-export',{method:'POST',headers:{'Content-Type':mime,'X-Backbone-Export':'1'},body:blob});
      if(!response.ok)throw new Error('Could not save the recording.');
      const result=await response.json();status.textContent=`Saved: ${result.file}`;frame(18);button.textContent='Record again';
    } catch(error){status.textContent=error.message;}
    finally {button.disabled=false;}
  };
}
