import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,collideWalls,shouldSink} from '../src/mechanics.js';
import {advanceGate,collideGate} from '../src/gates.js';
export const layout=createLayout(LEVELS.find(l=>l.id===1));
const l=layout;
export function shot(from,p,target,time=0){const a=Math.atan2(target.z-from.z,target.x-from.x),b={x:from.x,z:from.z,vx:Math.cos(a)*shotSpeed(p),vz:Math.sin(a)*shotSpeed(p)};let hits=0,settle=0;
for(let i=0;i<1800;i++){const dt=1/120;time=advanceGate(time,dt,b,l.LEVEL.gates[0]);b.vx*=Math.exp(-l.frictionAt(b.x,b.z)*dt);b.vz*=Math.exp(-l.frictionAt(b.x,b.z)*dt);b.x+=b.vx*dt;b.z+=b.vz*dt;collideWalls(b,l.WALLS,l.POST_COLLIDERS);if(collideGate(b,l.LEVEL.gates[0],time))hits++;if(!l.onCourse(b.x,b.z))return{...b,fell:true,time,hits};if(shouldSink(b,l.CUP))return{...b,won:true,time,hits};if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)break}else settle=0}return {...b,time,hits};}
