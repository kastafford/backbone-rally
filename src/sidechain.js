import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import tryptophan from './tryptophan.json';

// Ideal CCD tryptophan heavy-atom side chain, scaled for gameplay (not native placement).
export function createSidechain() {
  const group = new THREE.Group();
  const origin = tryptophan.atoms.find(a => a.name === 'CB').xyz;
  const points = new Map(tryptophan.atoms.map(a => [a.name, new THREE.Vector3(
    a.xyz[0] * .18, (origin[2] - a.xyz[2]) * .18 + .12, (a.xyz[1] - origin[1]) * .18
  )]));
  const parts = { carbon: [], nitrogen: [], bonds: [] };
  for (const atom of tryptophan.atoms) {
    const p = points.get(atom.name);
    const g = new THREE.SphereGeometry(atom.element === 'N' ? .115 : .105, 12, 8);
    g.translate(p.x,p.y,p.z);
    parts[atom.element === 'N' ? 'nitrogen' : 'carbon'].push(g);
  }
  for (const [a,b] of tryptophan.bonds) {
    const start=points.get(a),end=points.get(b),delta=end.clone().sub(start);
    const g=new THREE.CylinderGeometry(.041,.041,delta.length(),8);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
    const midpoint=start.clone().add(end).multiplyScalar(.5);g.translate(...midpoint);
    parts.bonds.push(g);
  }
  const colors={carbon:0xd2a570,nitrogen:0x839ee0,bonds:0xb8a28a};
  // Merge by material: only three draw calls for each complete side chain.
  for(const [kind,geometries] of Object.entries(parts)) {
    const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());
    const material=new THREE.MeshStandardMaterial({color:colors[kind],roughness:.4,metalness:.12});
    const mesh=new THREE.Mesh(geometry,material);mesh.userData.baseColor=colors[kind];group.add(mesh);
  }
  return group;
}
export function setSidechainHit(group, hit) {
  group.children.forEach(mesh=>{
    mesh.material.color.setHex(mesh.userData.baseColor);
    if(hit)mesh.material.color.multiplyScalar(.5);
  });
}
