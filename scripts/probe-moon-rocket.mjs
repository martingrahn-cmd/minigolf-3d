import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,shotError,shouldSink,collideWalls} from '../src/mechanics.js';
import {loadsCannon,cometLanding,landingVelocity} from '../src/comet-cannon.js';
import {inLowGravity,stepFloat} from '../src/low-gravity.js';

// Mirrors main.js physics() for the finale: the rocket's loading funnel, its
// range-gauge launch, and rolling and floating on the weightless moon base.
const dt=1/120;
export function simulator(source){
const l=createLayout(source),rocket=l.LEVEL.cometCannon,zones=l.LEVEL.lowGravity;
function roll(b){
  let settle=0,age=0,floats=0;
  for(let i=0;i<40/dt;i++){
    if(b.float!==undefined){
      const result=stepFloat(b,dt,l.onCourse);
      if(result==='lost')return{...b,fell:true,floats};
      if(result==='land'){delete b.float;settle=0}
      continue;
    }
    age+=dt;
    b.vx-=l.heightSlope(b.x,b.z)*6.9*dt;
    const friction=Math.exp(-(l.onCourse(b.x,b.z)?l.frictionAt(b.x,b.z):1.7)*dt);
    b.vx*=friction;b.vz*=friction;
    const previous={x:b.x,z:b.z};b.x+=b.vx*dt;b.z+=b.vz*dt;
    collideWalls(b,l.WALLS,l.POST_COLLIDERS);
    if(!l.onCourse(b.x,b.z)){
      if(inLowGravity(previous.x,previous.z,zones)){b.float=0;floats++;continue}
      return{...b,fell:true,floats};
    }
    if(loadsCannon(b,rocket))return{...b,loaded:true,floats};
    if(shouldSink(b,l.CUP))return{...b,won:true,floats};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)break}else settle=0;
    if(age>20)break;
  }
  return{...b,floats};
}
return {layout:l,rocket,
  shot(from,power,target,{needle=0,puttingSpeed}={}){
    const angle=Math.atan2(target.z-from.z,target.x-from.x)+(puttingSpeed?0:shotError(needle,power)),speed=puttingSpeed??shotSpeed(power);
    return roll({x:from.x,z:from.z,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed});
  },
  launch(range){
    const at=cometLanding(rocket,rocket.heading,range);
    if(!l.onCourse(at.x,at.z))return{...at,fell:true,missed:true};
    return roll({...at,...landingVelocity(rocket,rocket.heading)});
  },
};
}
export const {layout,rocket,shot,launch}=simulator(LEVELS.find(l=>l.scenery==='moonrocket'));
