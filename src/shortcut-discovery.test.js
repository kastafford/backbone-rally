import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {parsePDB} from './protein.js';
import {findShortcuts} from './shortcut-discovery.js';
function course(id){
 const {residues}=parsePDB(readFileSync(new URL(`../public/structures/${id}.pdb`,import.meta.url),'utf8'));
 const curve=new T.CatmullRomCurve3(residues.map(r=>new T.Vector3(...r.xyz)),false,'centripetal');
 curve.arcLengthDivisions=residues.length*35;curve.updateArcLengths();
 const length=curve.getLength(),N=Math.max(1000,residues.length*24),frames=curve.computeFrenetFrames(N,false);
 const samples=Array.from({length:N+1},(_,i)=>({residue:curve.getUtoTmapping(i/N)*(residues.length-1)}));
 const sample=t=>{const i=Math.min(N,Math.round(t*N));return {p:curve.getPointAt(t),up:frames.binormals[i],right:frames.normals[i].clone().negate(),forward:frames.tangents[i],width:1.12};};
 return {samples,residues,length,sample};
}
for(const id of ['1CRN','1UBQ','1MBN'])test(`${id}: finds separated forward shortcuts without accession-specific rules`,()=>{
 const data=course(id),routes=findShortcuts(data);
 assert.ok(routes.length>=1&&routes.length<=2);
 assert.deepEqual(routes,findShortcuts(data));
 for(const r of routes){assert.ok(r.to>r.from);assert.ok((r.to-r.from)*data.length>=25);assert.ok(r.to-r.from<=.20);assert.ok((r.to-r.from)*data.length<=80);assert.ok(data.sample(r.from).p.distanceTo(data.sample(r.to).p)<=10);}
 if(routes.length===2)assert.ok(Math.abs(routes[0].from-routes[1].from)*data.length>=22);
});
test('no shortcuts when endpoints are unresolved or structure is extended',()=>{
 const data=course('1CRN');assert.deepEqual(findShortcuts({...data,gaps:[{start:0,end:1}]}),[]);
 const extended={...data,length:180,sample:t=>({p:new T.Vector3(t*180,0,0),up:new T.Vector3(0,1,0),right:new T.Vector3(0,0,1),forward:new T.Vector3(1,0,0),width:1.7})};
 assert.deepEqual(findShortcuts(extended),[]);
});
