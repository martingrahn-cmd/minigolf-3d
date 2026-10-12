import * as THREE from 'three';

// The bowl geometry, rolling surface and capture throat share these dimensions.
export function funnelSurface(x,z,funnel){
  if(!funnel)return null;
  const dx=x-funnel.x,dz=z-funnel.z,r=Math.hypot(dx,dz);
  if(r>=funnel.radius)return null;
  const span=funnel.radius-funnel.throat,t=Math.min(1,(funnel.radius-r)/span);
  const gradient=r>funnel.throat?2*funnel.depth*t/span:0;
  return {height:funnel.y-funnel.depth*t*t,slopeX:r?gradient*dx/r:0,slopeZ:r?gradient*dz/r:0};
}

export function entersFunnel(previous,ball,funnel){
  if(!funnel)return false;
  // Swept contact also catches a fast ball crossing the narrow throat in one step.
  const dx=ball.x-previous.x,dz=ball.z-previous.z,den=dx*dx+dz*dz;
  const t=den?THREE.MathUtils.clamp(((funnel.x-previous.x)*dx+(funnel.z-previous.z)*dz)/den,0,1):0;
  return Math.hypot(previous.x+dx*t-funnel.x,previous.z+dz*t-funnel.z)<=funnel.throat;
}

export function createFunnelTrack(funnel){
  if(!funnel)return null;
  const curve=new THREE.CatmullRomCurve3(funnel.path.map(p=>new THREE.Vector3(...p)),false,'centripetal');
  curve.arcLengthDivisions=1000;
  return {curve,duration:5.2,exit:curve.getPoint(1),direction:curve.getTangent(1).normalize()};
}

export function startFunnelRide(ball,funnel){
  const ground=funnelSurface(ball.x,ball.z,funnel)?.height??funnel.y;
  return {time:0,entry:new THREE.Vector3(ball.x,ground+.35,ball.z),exitSpeed:THREE.MathUtils.clamp(3.2+Math.hypot(ball.vx,ball.vz)*.3,3.5,6.2)};
}

export function sampleFunnelRide(ride,track){
  const lead=.32;
  if(ride.time<lead){
    const t=Math.max(0,ride.time/lead),ease=t*t*(3-2*t);
    return {position:ride.entry.clone().lerp(track.curve.getPoint(0),ease),finished:false,progress:0};
  }
  const progress=THREE.MathUtils.clamp((ride.time-lead)/track.duration,0,1);
  return {position:track.curve.getPointAt(progress),finished:progress===1,progress};
}
