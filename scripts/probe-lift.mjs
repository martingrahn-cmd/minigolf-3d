import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,collideWalls,shouldSink} from '../src/mechanics.js';
import {createLiftState,tryBoardLift,stepLift,liftBarriers} from '../src/lift.js';
export const layout=createLayout(LEVELS.find(l=>l.id===4));
const l=layout;
export function shot(from,p,target,lift=createLiftState(),puttVelocity){
  const a=Math.atan2(target.z-from.z,target.x-from.x),speed=puttVelocity??shotSpeed(p),b={x:from.x,z:from.z,vx:Math.cos(a)*speed,vz:Math.sin(a)*speed};
  lift.savedTop=lift.mode==='top';let settle=0,rides=0,age=0;
  for(let i=0;i<3600;i++){
    const dt=1/120;
    if(tryBoardLift(b,lift,l.LEVEL.lift,dt)){rides++;continue}
    if(lift.mode==='riding'){stepLift(b,lift,l.LEVEL.lift,dt);settle=0;age=0;continue}
    age+=dt;b.vx-=l.heightSlope(b.x,b.z)*6.9*dt;
    const friction=Math.exp(-l.frictionAt(b.x,b.z)*dt);b.vx*=friction;b.vz*=friction;b.x+=b.vx*dt;b.z+=b.vz*dt;
    collideWalls(b,l.WALLS,l.POST_COLLIDERS);collideWalls(b,liftBarriers(lift,l.LEVEL.lift),[]);
    if(!l.onCourse(b.x,b.z))return{...b,fell:true,rides};
    if(shouldSink(b,l.CUP))return{...b,won:true,rides};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)return{...b,rides}}else settle=0;
    if(age>14)return{...b,rides,timedOut:true};
  }
  return{...b,rides,timedOut:true};
}
