import { BALL_RADIUS, collideCircle } from './mechanics.js';

// Rendering, traffic lights and collisions share the same gate height.
export function gatePose(time,gate){
  const period=gate.closed+gate.opened+2*gate.travel;
  const t=((time%period)+period)%period;
  let amount=0,closing=false;
  if(t>=gate.closed&&t<gate.closed+gate.travel)amount=(t-gate.closed)/gate.travel;
  else if(t>=gate.closed+gate.travel&&t<gate.closed+gate.travel+gate.opened)amount=1;
  else if(t>=gate.closed+gate.travel+gate.opened){
    amount=1-(t-gate.closed-gate.travel-gate.opened)/gate.travel;closing=true;
  }
  const height=gate.lift*amount*amount*(3-2*amount);
  const passable=height>BALL_RADIUS*2+.04;
  return {height,passable,closing,signal:closing?'amber':passable?'green':'red'};
}

export function advanceGate(time,dt,ball,gate){
  const next=gatePose(time+dt,gate);
  const occupied=Math.abs(ball.x-gate.x)<gate.thickness/2+BALL_RADIUS+.08&&
    Math.abs(ball.z-gate.z)<gate.halfWidth+BALL_RADIUS;
  // A safety sensor holds a descending gate until the ball clears its footprint.
  return next.closing&&occupied&&gatePose(time,gate).passable?time:time+dt;
}

export function collideGate(ball,gate,time){
  let hit=false;
  for(const side of [-1,1])hit=collideCircle(ball,gate.x,gate.z+side*gate.postOffset,gate.postRadius)||hit;
  if(gatePose(time,gate).passable)return hit;
  const dx=ball.x-gate.x,dz=ball.z-gate.z;
  const halfX=gate.thickness/2,halfZ=gate.halfWidth;
  const px=Math.max(-halfX,Math.min(halfX,dx)),pz=Math.max(-halfZ,Math.min(halfZ,dz));
  const ex=dx-px,ez=dz-pz,d=Math.hypot(ex,ez);
  if(d>=BALL_RADIUS)return hit;
  let nx,nz,penetration;
  if(d>1e-7){nx=ex/d;nz=ez/d;penetration=BALL_RADIUS-d}
  else if(halfX-Math.abs(dx)<halfZ-Math.abs(dz)){
    nx=dx===0?(ball.vx>=0?-1:1):Math.sign(dx);nz=0;penetration=halfX-Math.abs(dx)+BALL_RADIUS;
  }else{nx=0;nz=Math.sign(dz)||1;penetration=halfZ-Math.abs(dz)+BALL_RADIUS}
  ball.x+=nx*penetration;ball.z+=nz*penetration;
  const incoming=ball.vx*nx+ball.vz*nz;
  if(incoming<0){ball.vx-=1.62*incoming*nx;ball.vz-=1.62*incoming*nz;hit=true}
  return hit;
}
