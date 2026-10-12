import * as THREE from 'three';

const smooth=t=>{const p=THREE.MathUtils.clamp(t,0,1);return p*p*(3-2*p)};
export function createTubeCameraRail(track){
  if(!track)return null;
  const count=300,tangents=[],ups=[];
  let up=new THREE.Vector3(0,0,-1),previous=track.curve.getTangentAt(0);
  up.addScaledVector(previous,-up.dot(previous)).normalize();
  for(let i=0;i<=count;i++){
    const tangent=track.curve.getTangentAt(i/count);
    up.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(previous,tangent)).normalize();
    tangents.push(tangent);ups.push(up.clone());previous=tangent;
  }
  // Distribute the small roll correction along the ride; the outlet is upright.
  const end=tangents[count],worldUp=new THREE.Vector3(0,1,0).addScaledVector(end,-end.y).normalize();
  const twist=Math.atan2(new THREE.Vector3().crossVectors(ups[count],worldUp).dot(end),ups[count].dot(worldUp));
  ups.forEach((u,i)=>u.applyAxisAngle(tangents[i],twist*smooth(i/count)));
  return {track,ups,count,length:track.curve.getLength()};
}
export function tubeCameraPose(rail,progress){
  const p=THREE.MathUtils.clamp(progress,0,1),lag=THREE.MathUtils.lerp(2.8,1.4,smooth((p-.35)/.65));
  const distance=p*rail.length-lag,t=Math.max(0,distance/rail.length),curve=rail.track.curve;
  const position=distance<0?curve.getPointAt(0).addScaledVector(curve.getTangentAt(0),distance):curve.getPointAt(t);
  const u=t*rail.count,index=Math.min(rail.count-1,Math.floor(u));
  const up=rail.ups[index].clone().lerp(rail.ups[index+1],u-index).normalize();
  up.lerp(new THREE.Vector3(0,1,0),smooth((p-.85)/.15)).normalize();
  const target=curve.getPointAt(p).addScaledVector(curve.getTangentAt(p),.35);
  return {position,target,up,lag,fov:THREE.MathUtils.lerp(67,58,smooth((p-.78)/.22))};
}
export const tubeCameraBlend=time=>smooth(time/.95);
