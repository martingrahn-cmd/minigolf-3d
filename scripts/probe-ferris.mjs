import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,shotError,shouldSink,collideWalls} from '../src/mechanics.js';
import {docked,crossesDock,wheelTurn,ridePose} from '../src/ferris.js';

// Mirrors main.js physics() for the Ferris wheel hole: slopes, friction, walls,
// the dock gate and the ride. `time` is the wheel clock when the shot is played.
const dt=1/120;
export function simulator(source){
const l=createLayout(source),wheel=l.LEVEL.ferris;
return {layout:l,wheel,shot(from,power,target,{time=0,needle=0,puttingSpeed}={}){
  const angle=Math.atan2(target.z-from.z,target.x-from.x)+(puttingSpeed?0:shotError(needle,power)),speed=puttingSpeed??shotSpeed(power);
  const b={x:from.x,z:from.z,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed};
  let settle=0,age=0,bounced=0,rode=false;
  for(let i=0;i<40/dt;i++){
    time+=dt;age+=dt;
    b.vx-=l.heightSlope(b.x,b.z)*6.9*dt;
    const friction=Math.exp(-(l.onCourse(b.x,b.z)?l.frictionAt(b.x,b.z):1.7)*dt);
    b.vx*=friction;b.vz*=friction;
    const previous={x:b.x,z:b.z};b.x+=b.vx*dt;b.z+=b.vz*dt;
    if(crossesDock(previous,b,wheel)){
      if(docked(wheel,time)){
        const turn0=wheelTurn(wheel,time);
        while(!ridePose(wheel,turn0,time).done)time+=dt;
        Object.assign(b,{x:wheel.exitX,z:wheel.z,vx:wheel.exitPush,vz:0});rode=true;settle=0;age=0;continue;
      }
      b.x=previous.x;b.vx=-b.vx*.5;bounced++;
    }
    collideWalls(b,l.WALLS,l.POST_COLLIDERS);
    if(!l.onCourse(b.x,b.z))return{...b,fell:true,rode,bounced,time};
    if(shouldSink(b,l.CUP))return{...b,won:true,rode,bounced,time};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)break}else settle=0;
    if(age>14)break;
  }
  return{...b,rode,bounced,time};
}};
}
export const {layout,wheel,shot}=simulator(LEVELS.find(l=>l.scenery==='ferris'));
