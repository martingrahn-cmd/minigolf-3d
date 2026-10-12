import { BALL_RADIUS } from './mechanics.js';

// One pose drives the visible rope, acorn and the moving collision volume.
export function pendulumPose(time,p){
  const omega=Math.PI*2/p.period,phase=time*omega+(p.phase||0);
  const angle=p.amplitude*Math.sin(phase),angularVelocity=p.amplitude*omega*Math.cos(phase);
  return {angle,x:p.x,y:p.pivotY-p.length*Math.cos(angle),z:p.z+p.length*Math.sin(angle),
    vz:p.length*Math.cos(angle)*angularVelocity,vy:p.length*Math.sin(angle)*angularVelocity};
}

export function collidePendulum(ball,p,time){
  if(!p)return false;
  const pose=pendulumPose(time,p),dy=BALL_RADIUS+.04-pose.y,radius=p.radius+BALL_RADIUS;
  // The acorn rises as it swings out. Balls can genuinely roll beneath it.
  if(Math.abs(dy)>=radius)return false;
  const reach=Math.sqrt(radius*radius-dy*dy),dx=ball.x-pose.x,dz=ball.z-pose.z,d=Math.hypot(dx,dz);
  if(d>=reach)return false;
  const nx=d>.00001?dx/d:0,nz=d>.00001?dz/d:Math.sign(pose.vz)||1;
  ball.x=pose.x+nx*(reach+.001);ball.z=pose.z+nz*(reach+.001);
  const incoming=ball.vx*nx+(ball.vz-pose.vz)*nz;
  if(incoming<0){ball.vx-=1.8*incoming*nx;ball.vz-=1.8*incoming*nz}
  const speed=Math.hypot(ball.vx,ball.vz);
  if(speed>26.5){ball.vx*=26.5/speed;ball.vz*=26.5/speed}
  return true;
}
