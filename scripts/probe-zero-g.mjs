import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,shotError,shouldSink,collideWalls} from '../src/mechanics.js';
import {inLowGravity,stepFloat,floatDrop} from '../src/low-gravity.js';

// Mirrors main.js physics() for a low-gravity hole: slopes, glide, walls and floating.
const dt=1/120;
export function simulator(source){
const l=createLayout(source),zones=l.LEVEL.lowGravity;
return {layout:l,shot(from,power,target,needle=0,puttingSpeed){
  const angle=Math.atan2(target.z-from.z,target.x-from.x)+(puttingSpeed?0:shotError(needle,power)),speed=puttingSpeed??shotSpeed(power);
  const b={x:from.x,z:from.z,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed};
  let settle=0,age=0,floats=0,maxFloat=0;
  for(let i=0;i<30/dt;i++){
    if(b.float!==undefined){
      const result=stepFloat(b,dt,l.onCourse);maxFloat=Math.max(maxFloat,floatDrop(b.float));
      if(result==='lost')return{...b,fell:true,floats,maxFloat};
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
      return{...b,fell:true,floats,maxFloat};
    }
    if(shouldSink(b,l.CUP))return{...b,won:true,floats,maxFloat};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)break}else settle=0;
    if(age>20)break;
  }
  return{...b,floats,maxFloat};
}};
}
export const {layout,shot}=simulator(LEVELS.find(l=>l.scenery==='zerog'));
