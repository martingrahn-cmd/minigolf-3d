import { WALLS, POST_COLLIDERS, SPINNER, PIPE_GUIDES, pipeCoordinates, pipeWorld } from './layout.js';

export const BALL_RADIUS = .31;
export const PERFECT_ZONE = .10;
export const CUP_CAPTURE_RADIUS = .32;
export const CUP_SOFT_RADIUS = .38;
export const CUP_CAPTURE_SPEED = 3.6;
export function cupCaptureRadius(speed){
  const soft=Math.max(0,Math.min(1,(2.8-speed)/1.4));
  return CUP_CAPTURE_RADIUS+(CUP_SOFT_RADIUS-CUP_CAPTURE_RADIUS)*soft;
}
export function shouldSink(ball,cup){
  const speed=Math.hypot(ball.vx,ball.vz);
  return Math.hypot(ball.x-cup.x,ball.z-cup.z)<cupCaptureRadius(speed)&&speed<CUP_CAPTURE_SPEED;
}
const puttAssist=power=>Math.max(0,Math.min(1,(.5-power)/.3));
export const perfectZone=(power=1)=>PERFECT_ZONE+.18*puttAssist(power);
export function powerAt(seconds) {
  const t=(seconds/1.8)%2;
  return t<=1?t:2-t;
}
export function precisionAt(seconds) {
  const t=(seconds/1.2)%2;
  return t<=1?-1+2*t:3-2*t;
}
export function shotError(needle,power=1) {
  const p=Math.max(0,Math.min(1,power));
  const zone=perfectZone(p),miss=Math.max(0,Math.min(1,(Math.abs(needle)-zone)/(1-zone)));
  return Math.sign(needle)*miss*(5+10*p**1.25)*(1-.7*puttAssist(p))*Math.PI/180;
}
export function shotSpeed(power) {
  const p=Math.max(0,Math.min(1,power));
  return .7+17.5*p+8.3*p**3;
}

export function collideBumper(ball,bumper){
  const dx=ball.x-bumper.x,dz=ball.z-bumper.z,d=Math.hypot(dx,dz);
  if(d>=bumper.r+BALL_RADIUS)return false;
  const nx=d>1e-6?dx/d:1,nz=d>1e-6?dz/d:0;
  const incoming=ball.vx*nx+ball.vz*nz;
  collideCircle(ball,bumper.x,bumper.z,bumper.r);
  if(incoming>=0)return false;
  const speed=Math.max(8,Math.min(16,Math.hypot(ball.vx,ball.vz)+3));
  ball.vx=nx*speed;ball.vz=nz*speed;
  return true;
}

export function collideCircle(ball,x,z,r) {
  const dx=ball.x-x,dz=ball.z-z,d=Math.hypot(dx,dz),limit=r+BALL_RADIUS;
  if(d>=limit)return false;
  const nx=d>1e-6?dx/d:1,nz=d>1e-6?dz/d:0;
  ball.x=x+nx*limit;ball.z=z+nz*limit;
  const dot=ball.vx*nx+ball.vz*nz;
  if(dot<0){ball.vx-=1.6*dot*nx;ball.vz-=1.6*dot*nz}
  return true;
}

export function collideWalls(ball,boundaries=WALLS,posts=POST_COLLIDERS) {
  let hit=false;
  for(const e of boundaries) {
    if(e.open)continue;
    const radius=BALL_RADIUS+(e.radius??.10);
    const ex=e.bx-e.ax,ez=e.bz-e.az;
    const t=Math.max(0,Math.min(1,((ball.x-e.ax)*ex+(ball.z-e.az)*ez)/(ex*ex+ez*ez)));
    const px=e.ax+ex*t,pz=e.az+ez*t,dx=ball.x-px,dz=ball.z-pz,d=Math.hypot(dx,dz);
    if(d>=radius)continue;
    const interior=dx*e.nx+dz*e.nz;
    const nx=d>1e-6&&interior>=0?dx/d:e.nx,nz=d>1e-6&&interior>=0?dz/d:e.nz;
    ball.x=px+nx*radius;ball.z=pz+nz*radius;
    const dot=ball.vx*nx+ball.vz*nz;
    if(dot<0){ball.vx-=1.62*dot*nx;ball.vz-=1.62*dot*nz;hit=true}
  }
  for(const p of posts)hit=collideCircle(ball,p.x,p.z,p.r)||hit;
  return hit;
}

export function collideSpinner(ball,angle,spinner=SPINNER) {
  const dx=ball.x-spinner.x,dz=ball.z-spinner.z;
  if(dx*dx+dz*dz>(spinner.reach+BALL_RADIUS)**2)return false;
  const c=Math.cos(angle),s=Math.sin(angle);
  // Three.js rotation around +Y maps local +X toward world -Z.
  let lx=dx*c-dz*s,lz=dx*s+dz*c,hit=false;
  for(let axis=0;axis<spinner.axes;axis++) {
    const px=axis===0?Math.max(-(spinner.reach-spinner.radius),Math.min(spinner.reach-spinner.radius,lx)):0;
    const pz=axis===1?Math.max(-(spinner.reach-spinner.radius),Math.min(spinner.reach-spinner.radius,lz)):0;
    const ax=lx-px,az=lz-pz,d=Math.hypot(ax,az),limit=BALL_RADIUS+spinner.radius;
    if(d>=limit)continue;
    const nx=d>.0001?ax/d:0,nz=d>.0001?az/d:1;
    lx=px+nx*limit;lz=pz+nz*limit;
    const wx=nx*c+nz*s,wz=-nx*s+nz*c;
    const surfaceX=spinner.speed*dz,surfaceZ=-spinner.speed*dx;
    const dot=(ball.vx-surfaceX)*wx+(ball.vz-surfaceZ)*wz;
    if(dot<0){ball.vx-=1.55*dot*wx;ball.vz-=1.55*dot*wz}
    hit=true;
  }
  ball.x=spinner.x+lx*c+lz*s;ball.z=spinner.z-lx*s+lz*c;
  return collideCircle(ball,spinner.x,spinner.z,spinner.radius)||hit;
}

// Enter only through the mouth plane while travelling into the pipe.
// Side/rear contact can no longer trigger transport through the blue shell.
export function entersPipe(previous,ball){
  const before=pipeCoordinates(previous.x,previous.z),after=pipeCoordinates(ball.x,ball.z);
  if(before.along>0||after.along<0||after.along<=before.along)return false;
  const t=-before.along/(after.along-before.along);
  const across=before.across+(after.across-before.across)*t;
  return Math.abs(across)<=.621-BALL_RADIUS;
}
export function collidePipe(ball){
  for(const {a,b} of PIPE_GUIDES){
    const dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((ball.x-a.x)*dx+(ball.z-a.z)*dz)/(dx*dx+dz*dz)));
    collideCircle(ball,a.x+t*dx,a.z+t*dz,.065);
  }
  // The inlet sleeve is a real obstacle outside the opening.
  const local=pipeCoordinates(ball.x,ball.z);
  if(local.along>0&&local.along<1.15){
    const center=pipeWorld(Math.min(.75,local.along));
    collideCircle(ball,center.x,center.z,.72);
  }
  collideCircle(ball,2.55,-4.1,.70);
}

export function springImpulse(ball,spring){
  let dx=spring.dx,dz=spring.dz;
  if(spring.target){
    dx=spring.target.x-ball.x;dz=spring.target.z-ball.z;
    const length=Math.hypot(dx,dz);dx/=length;dz/=length;
  }
  ball.vx=dx*spring.speed;ball.vz=dz*spring.speed;
}
