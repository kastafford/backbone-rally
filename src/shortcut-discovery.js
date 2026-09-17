import * as THREE from 'three';
import {jumpPoint} from './jump.js';

// Deterministic, bounded search shared by presets and downloaded PDBs.
export function findShortcuts({samples,length,residues,sample,gaps=[],obstacles=[]}) {
  if(residues.length<12||length<=0)return [];
  let segment=0;
  const nodes=residues.map((r,i)=>{
    if(i&&r.type!==residues[i-1].type)segment++;
    const index=samples.findIndex(s=>s.residue>=i);
    const t=index/(samples.length-1),s=sample(t);
    return {...s,t,i,type:r.type,segment};
  });
  const clearEndpoint=n=>n.t*length>4&&(1-n.t)*length>9&&n.width>=1.1&&
    !gaps.some(g=>n.t*length>g.start*length-5&&n.t*length<g.end*length+5)&&
    !obstacles.some(o=>Math.abs(o.t-n.t)*length<4);
  // Keep each hop local, even when distant sequence regions touch in 3D.
  const maxSkip=Math.min(length*.20,80);
  const candidates=[];
  for(let i=1;i<nodes.length-9;i++)for(let j=i+8;j<nodes.length-2;j++){
    const a=nodes[i],b=nodes[j];if(!clearEndpoint(a)||!clearEndpoint(b))continue;
    if(a.segment===b.segment&&a.type!=='loop')continue;
    const separation=a.p.distanceTo(b.p),saved=(b.t-a.t)*length;
    if(separation<3||separation>10||saved<25||saved>maxSkip||saved/separation<3)continue;
    // Prefer broad landing surfaces, short flights and modest sequence skips.
    const structured=(a.type!=='loop'?3:0)+(b.type!=='loop'?5:0);
    candidates.push({a,b,score:structured+b.width*3-saved*.03-separation});
  }
  candidates.sort((a,b)=>b.score-a.score||a.a.i-b.a.i||a.b.i-b.b.i);
  // Sample the ribbon at sub-marble spacing for a conservative clearance check.
  const surface=[];const steps=Math.ceil(length/.6);
  for(let i=0;i<=steps;i++){const t=i/steps;if(!gaps.some(g=>t>g.start&&t<g.end))surface.push(sample(t));}
  const delta=new THREE.Vector3();
  function clearArc(a,b,arcHeight){
    const start=a.p.clone().addScaledVector(a.up,.53),end=b.p.clone().addScaledVector(b.up,.53);
    for(let k=2;k<30;k++){
      const p=jumpPoint(start,end,a.up,b.up,k/32,arcHeight);
      for(const s of surface){
        delta.copy(p).sub(s.p);
        if(Math.abs(delta.dot(s.forward))<.4&&Math.abs(delta.dot(s.up))<.47&&Math.abs(delta.dot(s.right))<s.width+.35)return false;
      }
      for(const o of obstacles)if(o.mesh&&p.distanceTo(o.mesh.position)<1.05)return false;
    }
    return true;
  }
  const selected=[];
  for(const {a,b} of candidates.slice(0,160)){
    if(selected.some(r=>Math.abs(r.from-a.t)*length<22||Math.abs(r.to-b.t)*length<10))continue;
    const arcHeight=[2.2,3.5,5].find(h=>clearArc(a,b,h));if(!arcHeight)continue;
    const bothSheets=a.type==='sheet'&&b.type==='sheet',bothHelices=a.type==='helix'&&b.type==='helix';
    const name=bothSheets?'β-sheet hop':bothHelices?'Helix transfer':'Fold shortcut';
    const direction=a.forward.dot(b.forward)<-.35?'Opposing directions · turn toward C on landing':'Follow the fold toward C';
    selected.push({from:a.t,to:b.t,arcHeight,name,detail:`Residues ${residues[a.i].number} → ${residues[b.i].number} · ${direction}`});
    if(selected.length===2)break;
  }
  return selected.sort((a,b)=>a.from-b.from);
}
