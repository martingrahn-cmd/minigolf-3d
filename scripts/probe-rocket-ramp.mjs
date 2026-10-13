import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,shotError,shouldSink,collideWalls,springImpulse,padTriggers} from '../src/mechanics.js';

// Mirrors main.js physics() for holes with rocket pads and a height profile.
const dt=1/120;
export function simulator(source){
const l=createLayout(source),pads=l.SPRINGS;
return {layout:l,shot(from,power,target,needle=0,puttingSpeed){
  const angle=Math.atan2(target.z-from.z,target.x-from.x)+(puttingSpeed?0:shotError(needle,power)),speed=puttingSpeed??shotSpeed(power);
  const b={x:from.x,z:from.z,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed};
  const cooldown=pads.map(()=>0),used=[];let settle=0,age=0;
  for(let i=0;i<20/dt;i++){
    age+=dt;
    b.vx-=l.heightSlope(b.x,b.z)*6.9*dt;
    const friction=Math.exp(-(l.onCourse(b.x,b.z)?l.frictionAt(b.x,b.z):1.7)*dt);
    b.vx*=friction;b.vz*=friction;b.x+=b.vx*dt;b.z+=b.vz*dt;
    collideWalls(b,l.WALLS,l.POST_COLLIDERS);
    if(!l.onCourse(b.x,b.z))return{...b,fell:true,used};
    pads.forEach((pad,k)=>{
      if(cooldown[k]>0||!padTriggers(b,pad))return;
      cooldown[k]=2;springImpulse(b,pad);used.push(k);settle=0;age=0;
    });
    if(shouldSink(b,l.CUP))return{...b,won:true,used};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)break}else settle=0;
    if(age>14)break;
    cooldown.forEach((t,k)=>cooldown[k]=Math.max(0,t-dt));
  }
  return{...b,used};
}};
}
export const {layout,shot}=simulator(LEVELS.find(l=>l.scenery==='rocketramp'));

if(process.argv[1]?.endsWith('probe-rocket-ramp.mjs')){
  const S=layout.START,A=layout.SPRINGS[0];
  for(let p=.3;p<=1.001;p+=.1){
    const r=shot(S,p,A);
    console.log(p.toFixed(1),`(${r.x.toFixed(2)},${r.z.toFixed(2)}) pads ${r.used.join(',')}${r.won?' WON':''}${r.fell?' FELL':''}`);
  }
}
