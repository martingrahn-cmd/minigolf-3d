import { BALL_RADIUS, collideWalls } from './mechanics.js';
import {inClockWell} from './clock-hand.js';

export const PUTT_RANGE=5.5;
// The putting meter runs from a tap to this many metres of roll.
export const PUTT_MAX=6;
export const puttLengthAt=power=>.25+Math.max(0,Math.min(1,power))*(PUTT_MAX-.25);
export const puttSpeed=(distance,friction)=>Math.max(.35,distance*friction+.1);

// Offer a distance control only on an unobstructed, flat patch of green.
// A cup across a wall, gap or moving obstacle must never activate near putting.
export function puttingContext(ball,layout){
  const {CUP,LEVEL}=layout,dx=CUP.x-ball.x,dz=CUP.z-ball.z,distance=Math.hypot(dx,dz);
  if(distance>PUTT_RANGE)return null;
  const height=layout.heightAt(ball.x,ball.z),friction=layout.frictionAt(ball.x,ball.z);
  for(let i=0,n=Math.max(1,Math.ceil(distance/.15));i<=n;i++){
    const x=ball.x+dx*i/n,z=ball.z+dz*i/n;
    if(inClockWell(x,z,LEVEL.clockHand))return null;
    if(!layout.onCourse(x,z)||Math.abs(layout.heightAt(x,z)-height)>.03||Math.abs(layout.frictionAt(x,z)-friction)>.05)return null;
    const probe={x,z,vx:0,vz:0};collideWalls(probe,layout.WALLS,layout.POST_COLLIDERS);
    if(Math.hypot(probe.x-x,probe.z-z)>.005)return null;
    if(LEVEL.clockWheel&&Math.abs(x-LEVEL.clockWheel.x)<LEVEL.clockWheel.depth/2+BALL_RADIUS)return null;
    if(LEVEL.spinner&&Math.hypot(x-LEVEL.spinner.x,z-LEVEL.spinner.z)<LEVEL.spinner.reach+BALL_RADIUS)return null;
    if((LEVEL.gates||[]).some(g=>Math.abs(x-g.x)<g.thickness+BALL_RADIUS&&Math.abs(z-g.z)<g.postOffset+BALL_RADIUS))return null;
    if((LEVEL.trapdoors||[]).some(d=>x>=d.x1&&x<=d.x2&&Math.abs(z-d.z)<=d.halfWidth))return null;
    if((LEVEL.bumpers||[]).some(b=>Math.hypot(x-b.x,z-b.z)<b.r+BALL_RADIUS))return null;
  }
  return {distance,friction};
}
