import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,collideWalls,collideBumper,shouldSink} from '../src/mechanics.js';
import {collideClockWheel} from '../src/clock-wheel.js';
export const layout=createLayout(LEVELS.find(l=>l.id===5));
const l=layout;
export function shot(from,p,target,startTime=0,puttingSpeed){
  const a=Math.atan2(target.z-from.z,target.x-from.x),v=puttingSpeed??shotSpeed(p),b={x:from.x,z:from.z,vx:Math.cos(a)*v,vz:Math.sin(a)*v};
  let time=startTime,settle=0,hits=0,bells=0;
  for(let i=0;i<1680;i++){
    const dt=1/120;time+=dt;
    const friction=Math.exp(-l.frictionAt(b.x,b.z)*dt);b.vx*=friction;b.vz*=friction;
    const previous={x:b.x,z:b.z};b.x+=b.vx*dt;b.z+=b.vz*dt;
    if(collideClockWheel(b,previous,time,l.LEVEL.clockWheel))hits++;
    collideWalls(b,l.WALLS,l.POST_COLLIDERS);
    if(!l.onCourse(b.x,b.z))return{...b,time,fell:true,hits,bells};
    for(const bumper of l.LEVEL.bumpers)if(collideBumper(b,bumper))bells++;
    if(shouldSink(b,l.CUP))return{...b,time,won:true,hits,bells};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)return{...b,time,hits,bells}}else settle=0;
  }
  return{...b,time,hits,bells,timedOut:true};
}
