import {createLayout,LEVELS} from '../src/layout.js';
import {shotSpeed,shotError,shouldSink,collideWalls,collideSpinner} from '../src/mechanics.js';
import {supportedByTrapdoors} from '../src/trapdoors.js';
export const layout=createLayout(LEVELS.find(l=>l.id===18)),dt=1/120;
export function shot(position,power,target,time=0,needle=0){
  const a=Math.atan2(target.z-position.z,target.x-position.x)+shotError(needle,power),v=shotSpeed(power);
  const b={x:position.x,z:position.z,vx:Math.cos(a)*v,vz:Math.sin(a)*v};let settled=0,hits=0;
  for(let i=0;i<14/dt;i++){
    time+=dt;
    if(!supportedByTrapdoors(b.x,b.z,time,layout.LEVEL.trapdoors))return{...b,fell:true,time,hits,trap:true};
    const f=Math.exp(-layout.frictionAt(b.x,b.z)*dt);b.vx*=f;b.vz*=f;b.x+=b.vx*dt;b.z+=b.vz*dt;
    collideWalls(b,layout.WALLS,layout.POST_COLLIDERS);
    if(!layout.onCourse(b.x,b.z)||!supportedByTrapdoors(b.x,b.z,time,layout.LEVEL.trapdoors))return{...b,fell:true,time,hits};
    if(collideSpinner(b,time*layout.SPINNER.speed,layout.SPINNER))hits++;
    if(shouldSink(b,layout.CUP))return{...b,won:true,time,hits};
    settled=Math.hypot(b.vx,b.vz)<.23?settled+dt:0;
    if(settled>.45)break;
  }
  return{...b,time,hits};
}
if(process.argv[1]?.endsWith('probe-crown.mjs')){
  for(const p of [.7,.8,.85,.9,.95,1]){
    const results=Array.from({length:68},(_,i)=>shot(layout.START,p,{x:0,z:0},i*.1));
    const good=results.filter(r=>!r.fell&&r.x>-4.2);
    console.log({power:p,good:good.length,first:good[0]});
  }
}
