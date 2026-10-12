import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,collideWalls,shouldSink} from '../src/mechanics.js';
import {entersFunnel,startFunnelRide,createFunnelTrack} from '../src/funnel.js';

export const layout=createLayout(LEVELS.find(l=>l.id===2));
const l=layout,track=createFunnelTrack(l.LEVEL.funnel);
export function shot(from,p,target,puttVelocity){
  const a=Math.atan2(target.z-from.z,target.x-from.x),v=puttVelocity??shotSpeed(p);
  const b={x:from.x,z:from.z,vx:Math.cos(a)*v,vz:Math.sin(a)*v};
  let settle=0,deliveries=0,bankHits=0;
  for(let i=0;i<1800;i++){
    const dt=1/120,previous={x:b.x,z:b.z};
    b.vx-=l.heightSlope(b.x,b.z)*6.9*dt;b.vz-=l.heightSlopeZ(b.x,b.z)*6.9*dt;
    const friction=Math.exp(-l.frictionAt(b.x,b.z)*dt);b.vx*=friction;b.vz*=friction;b.x+=b.vx*dt;b.z+=b.vz*dt;
    if(entersFunnel(previous,b,l.LEVEL.funnel)){
      const ride=startFunnelRide(b,l.LEVEL.funnel);deliveries++;
      b.x=track.exit.x;b.z=track.exit.z;b.vx=ride.exitSpeed*track.direction.x;b.vz=ride.exitSpeed*track.direction.z;settle=0;continue;
    }
    const vBefore={x:b.vx,z:b.vz};collideWalls(b,l.WALLS,l.POST_COLLIDERS);
    if(vBefore.x>0&&b.vz<-1&&b.x>13&&Math.abs(vBefore.z)<.1)bankHits++;
    if(!l.onCourse(b.x,b.z))return{...b,fell:true,deliveries,bankHits};
    if(shouldSink(b,l.CUP))return{...b,won:true,deliveries,bankHits};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)return{...b,deliveries,bankHits}}else settle=0;
  }
  return{...b,deliveries,bankHits,timedOut:true};
}
