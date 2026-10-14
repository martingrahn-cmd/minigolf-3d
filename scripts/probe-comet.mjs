import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,shotError,shouldSink,collideWalls} from '../src/mechanics.js';
import {barrelAngle,loadsCannon,cometLanding,landingVelocity} from '../src/comet-cannon.js';

// Mirrors main.js physics() for the comet cannon hole. A rolling shot either stops,
// falls, sinks or loads the cannon; fire(angle) then lands the comet and rolls on.
const dt=1/120;
export function simulator(source){
const l=createLayout(source),cannon=l.LEVEL.cometCannon;
function roll(b){
  let settle=0,age=0;
  for(let i=0;i<30/dt;i++){
    age+=dt;
    const friction=Math.exp(-(l.onCourse(b.x,b.z)?l.frictionAt(b.x,b.z):1.7)*dt);
    b.vx*=friction;b.vz*=friction;b.x+=b.vx*dt;b.z+=b.vz*dt;
    collideWalls(b,l.WALLS,l.POST_COLLIDERS);
    if(!l.onCourse(b.x,b.z))return{...b,fell:true};
    if(loadsCannon(b,cannon))return{...b,loaded:true};
    if(shouldSink(b,l.CUP))return{...b,won:true};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)break}else settle=0;
    if(age>14)break;
  }
  return b;
}
return {layout:l,cannon,
  shot(from,power,target,needle=0,puttingSpeed){
    const angle=Math.atan2(target.z-from.z,target.x-from.x)+(puttingSpeed?0:shotError(needle,power)),speed=puttingSpeed??shotSpeed(power);
    return roll({x:from.x,z:from.z,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed});
  },
  fire(angle){
    const at=cometLanding(cannon,angle);
    if(!l.onCourse(at.x,at.z))return{...at,fell:true,missed:true};
    return roll({...at,...landingVelocity(cannon,angle)});
  },
  fireAt:time=>barrelAngle(cannon,time),
};
}
export const {layout,cannon,shot,fire,fireAt}=simulator(LEVELS.find(l=>l.scenery==='comet'));
