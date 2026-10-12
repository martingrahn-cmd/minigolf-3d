import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,collideWalls,shouldSink} from '../src/mechanics.js';
import {inClockWell,supportedByClockHand,carryOnClockHand} from '../src/clock-hand.js';
export const layout=createLayout(LEVELS.find(l=>l.id===6));
const l=layout,c=l.LEVEL.clockHand;
export function shot(from,power,target,startTime=0,puttingSpeed){
  const aim=Math.atan2(target.z-from.z,target.x-from.x),speed=puttingSpeed??shotSpeed(power);
  const b={x:from.x,z:from.z,vx:Math.cos(aim)*speed,vz:Math.sin(aim)*speed,aim};
  let time=startTime,settle=0,carried=0;
  for(let i=0;i<1680;i++){
    const dt=1/120;
    if(carryOnClockHand(b,time,time+dt,c))carried++;
    time+=dt;
    if(!supportedByClockHand(b.x,b.z,time,c))return{...b,time,fell:true,carried};
    const drag=Math.exp(-l.frictionAt(b.x,b.z)*dt);b.vx*=drag;b.vz*=drag;b.x+=b.vx*dt;b.z+=b.vz*dt;
    collideWalls(b,l.WALLS,l.POST_COLLIDERS);
    if(!l.onCourse(b.x,b.z)||!supportedByClockHand(b.x,b.z,time,c))return{...b,time,fell:true,carried};
    if(shouldSink(b,l.CUP))return{...b,time,won:true,carried};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)break}else settle=0;
  }
  return{...b,time,carried,onHand:inClockWell(b.x,b.z,c)};
}
