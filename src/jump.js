import * as THREE from 'three';
export function jumpPoint(start,end,startUp,endUp,t,arcHeight=2.2) {
  const smooth=t*t*(3-2*t);
  const lift=startUp.clone().add(endUp);
  if(lift.lengthSq()<.05)lift.copy(startUp);
  return start.clone().lerp(end,smooth).addScaledVector(lift.normalize(),Math.sin(Math.PI*t)*arcHeight);
}
export function safeLanding(offset,width){return Math.abs(offset)<=width-.15;}

