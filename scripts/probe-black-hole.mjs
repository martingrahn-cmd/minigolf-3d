import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,shotError,shouldSink,collideWalls,collideBumper} from '../src/mechanics.js';
import {blackHolePull,crossesHorizon} from '../src/black-hole.js';

// Mirrors main.js physics() for the black-hole hole: friction, pull, walls and planets.
const dt=1/120;
export function simulator(source){
const l=createLayout(source),hole=l.LEVEL.blackHole,bumpers=l.LEVEL.bumpers||[];
return {layout:l,shot(from,power,target,needle=0,puttingSpeed){
  const angle=Math.atan2(target.z-from.z,target.x-from.x)+(puttingSpeed?0:shotError(needle,power)),speed=puttingSpeed??shotSpeed(power);
  const b={x:from.x,z:from.z,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed};
  let settle=0,age=0,bounces=0,closest=Infinity;
  for(let i=0;i<30/dt;i++){
    age+=dt;
    const friction=Math.exp(-(l.onCourse(b.x,b.z)?l.frictionAt(b.x,b.z):1.7)*dt);
    b.vx*=friction;b.vz*=friction;
    if(blackHolePull(b,hole,dt)==='swallowed')return{...b,swallowed:true,fell:true,bounces,closest};
    const previous={x:b.x,z:b.z};b.x+=b.vx*dt;b.z+=b.vz*dt;
    if(crossesHorizon(previous,b,hole))return{...b,swallowed:true,fell:true,bounces,closest};
    closest=Math.min(closest,Math.hypot(b.x-hole.x,b.z-hole.z));
    collideWalls(b,l.WALLS,l.POST_COLLIDERS);
    if(!l.onCourse(b.x,b.z))return{...b,fell:true,bounces,closest};
    bumpers.forEach(bumper=>{if(collideBumper(b,bumper)){bounces++;settle=0}});
    if(shouldSink(b,l.CUP))return{...b,won:true,bounces,closest};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)break}else settle=0;
    if(age>14)break;
  }
  return{...b,bounces,closest};
}};
}
export const {layout,shot}=simulator(LEVELS.find(l=>l.scenery==='blackhole'));
