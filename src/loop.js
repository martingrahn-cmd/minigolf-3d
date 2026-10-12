// Shared surface frame for the root ribbon, ball and energy-based traversal.
// The sideways pitch keeps the entrance and exit from intersecting in 3D.
import { BALL_RADIUS } from './mechanics.js';
const TAU=Math.PI*2,BALL_OFFSET=BALL_RADIUS+.04;
const normalize=v=>{const d=Math.hypot(v.x,v.y,v.z);return{x:v.x/d,y:v.y/d,z:v.z/d}};
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
export function loopFrame(u,c){
  const angle=TAU*u,s=Math.sin(angle),co=Math.cos(angle),ease=u*u*(3-2*u),de=6*u*(1-u);
  const tangent=normalize({x:TAU*c.radius*co+c.advance*de,y:TAU*c.radius*s,z:c.shift*de});
  const n={x:-s,y:co,z:0},dot=n.x*tangent.x+n.y*tangent.y;
  const normal=normalize({x:n.x-dot*tangent.x,y:n.y-dot*tangent.y,z:-dot*tangent.z});
  return{x:c.x+c.radius*s+c.advance*ease,y:c.y+c.radius*(1-co),z:c.z+c.shift*ease,tangent,normal,side:cross(tangent,normal)};
}
export function loopBallPoint(u,across,c){
  const f=loopFrame(u,c);
  return{x:f.x+f.normal.x*BALL_OFFSET+f.side.x*across,y:f.y+f.normal.y*BALL_OFFSET+f.side.y*across,z:f.z+f.normal.z*BALL_OFFSET+f.side.z*across};
}
export function createLoopTrack(c){
  if(!c)return null;
  const points=[];let length=0,previous;
  for(let i=0;i<=400;i++){
    const u=i/400,p=loopBallPoint(u,0,c);
    if(previous)length+=Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z);
    points.push({...p,u,distance:length});previous=p;
  }
  function sample(distance,across=0){
    const d=Math.max(0,Math.min(length,distance));let lo=0,hi=points.length-1;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(points[mid].distance<d)lo=mid;else hi=mid}
    const a=points[lo],b=points[hi],span=b.distance-a.distance,t=(d-a.distance)/span,u=a.u+(b.u-a.u)*t;
    return{...loopBallPoint(u,across,c),u,dx:(b.x-a.x)/span,dy:(b.y-a.y)/span,dz:(b.z-a.z)/span};
  }
  return{config:c,length,sample};
}
export function enterLoop(previous,ball,track){
  if(!track)return null;
  const c=track.config,endX=c.x+c.advance,endZ=c.z+c.shift;
  const forward=previous.x<c.x&&ball.x>=c.x&&ball.vx>0;
  const reverse=previous.x>endX&&ball.x<=endX&&ball.vx<0;
  if(!forward&&!reverse)return null;
  const x=forward?c.x:endX,t=(x-previous.x)/(ball.x-previous.x),z=previous.z+(ball.z-previous.z)*t;
  const across=z-(forward?c.z:endZ);
  if(Math.abs(across)>c.halfWidth-BALL_RADIUS)return null;
  return{distance:forward?0:track.length,speed:ball.vx,across,sideSpeed:ball.vz,entryDirection:forward?1:-1,maxU:forward?0:1,turned:false};
}
export function stepLoop(ride,track,dt){
  const c=track.config,p=track.sample(ride.distance),before=ride.speed;
  ride.speed+=(-c.gravity*p.dy-c.drag*ride.speed)*dt;
  // Break the unstable balance at the exact crown toward the way it came.
  if(Math.abs(ride.speed)<.015&&p.u>.48&&p.u<.52)ride.speed=-.025*ride.entryDirection;
  ride.turned ||= before*ride.entryDirection>0&&ride.speed*ride.entryDirection<=0;
  ride.distance+=ride.speed*dt;
  ride.sideSpeed*=Math.exp(-.7*dt);ride.across+=ride.sideSpeed*dt;
  const limit=c.halfWidth-BALL_RADIUS;
  if(Math.abs(ride.across)>limit){ride.across=Math.sign(ride.across)*limit;ride.sideSpeed*=-.45;ride.speed*=.98}
  const pose=track.sample(ride.distance,ride.across);ride.maxU=Math.max(ride.maxU,pose.u);
  return{...pose,speed:ride.speed,finished:ride.distance>=track.length,returned:ride.distance<=0&&ride.speed<0};
}
