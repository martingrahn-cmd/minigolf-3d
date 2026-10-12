// A quarter-turn escapement: the hand rests, warns, then rotates to the next hour.
// Angles use Three.js rotation around Y (positive X turns toward negative Z).
export function clockHandPose(time,c){
  const beat=c.hold+c.turn,step=Math.floor(Math.max(0,time)/beat),local=Math.max(0,time)-step*beat;
  const progress=Math.max(0,Math.min(1,(local-c.hold)/c.turn));
  const ease=progress*progress*(3-2*progress),aligned=step%2===0;
  const signal=aligned&&local<c.hold-c.warning?'green':aligned&&local<c.hold?'amber':'red';
  return {angle:(step+ease)*Math.PI/2,moving:local>=c.hold,signal};
}

export function inClockWell(x,z,c){
  return !!c&&Math.abs(x-c.x)<c.radius&&Math.abs(z-c.z)<c.radius;
}

export function onClockHand(x,z,time,c){
  if(!c)return false;
  const a=clockHandPose(time,c).angle,dx=x-c.x,dz=z-c.z;
  const along=dx*Math.cos(a)-dz*Math.sin(a),across=dx*Math.sin(a)+dz*Math.cos(a);
  return Math.abs(along)<=c.radius&&Math.abs(across)<=c.halfWidth;
}

export const supportedByClockHand=(x,z,time,c)=>!inClockWell(x,z,c)||onClockHand(x,z,time,c);

// A ball resting or rolling on the hand travels with its deck. Its own rolling
// velocity and aim stay relative to that deck; the rotation adds no free boost.
export function carryOnClockHand(ball,fromTime,toTime,c){
  if(!inClockWell(ball.x,ball.z,c)||!onClockHand(ball.x,ball.z,fromTime,c))return false;
  const delta=clockHandPose(toTime,c).angle-clockHandPose(fromTime,c).angle;
  const cos=Math.cos(delta),sin=Math.sin(delta),dx=ball.x-c.x,dz=ball.z-c.z,vx=ball.vx,vz=ball.vz;
  ball.x=c.x+dx*cos+dz*sin;ball.z=c.z-dx*sin+dz*cos;
  ball.vx=vx*cos+vz*sin;ball.vz=-vx*sin+vz*cos;
  if(Number.isFinite(ball.aim))ball.aim-=delta;
  return true;
}
