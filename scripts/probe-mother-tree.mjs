import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,shotError,shouldSink,collideWalls} from '../src/mechanics.js';
import {createLoopTrack,enterLoop,stepLoop} from '../src/loop.js';
import {trampolineFlight} from '../src/carnival.js';
import {flightPosition} from '../src/bridge.js';
import {crossTreeEye} from '../src/mother-tree.js';

// Mirrors the order of checks in main.js physics() for the Mother Tree hole.
const dt=1/120;
export function simulator(source){
const l=createLayout(source),level=l.LEVEL,track=createLoopTrack(level.loop);
return {layout:l,shot(from,power,target,needle=0,puttingSpeed){
  const angle=Math.atan2(target.z-from.z,target.x-from.x)+(puttingSpeed?0:shotError(needle,power)),speed=puttingSpeed??shotSpeed(power);
  const b={x:from.x,z:from.z,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed};
  const info={loop:false,looped:false,rolledBack:false,drum:false,eye:false,launchSpeed:0,landing:null};
  let ride=null,settle=0,age=0;
  const done=extra=>({...b,...info,...extra});
  for(let i=0;i<40/dt;i++){
    if(ride){
      const pose=stepLoop(ride,track,dt);b.x=pose.x;b.z=pose.z;
      if(pose.finished||pose.returned){
        const rolledBack=pose.returned===(ride.entryDirection>0);
        info.looped ||= !rolledBack;info.rolledBack ||= rolledBack;
        b.x+=pose.returned?-.03:.03;b.vx=ride.speed;b.vz=ride.sideSpeed;ride=null;settle=0;age=0;
      }
      continue;
    }
    age+=dt;
    const friction=Math.exp(-(l.onCourse(b.x,b.z)?l.frictionAt(b.x,b.z):1.7)*dt);
    b.vx*=friction;b.vz*=friction;
    const previous={x:b.x,z:b.z};b.x+=b.vx*dt;b.z+=b.vz*dt;
    ride=enterLoop(previous,b,track);
    if(ride){info.loop=true;continue}
    const flight=trampolineFlight(b,level.trampoline);
    if(flight){
      info.drum=true;info.launchSpeed=Math.hypot(flight.vx,flight.vz);
      for(let t=dt;t<=flight.duration+1e-9;t+=dt){
        const hit=crossTreeEye(flightPosition(flight,t-dt),flightPosition(flight,t),level.treeEye);
        if(hit==='bark')return done({fell:true,bark:true});
        if(hit==='eye')info.eye=true;
      }
      const p=flightPosition(flight,flight.duration);b.x=p.x;b.z=p.z;info.landing={x:p.x,z:p.z};
      if(!l.onCourse(b.x,b.z))return done({fell:true});
      b.vx=flight.vx*.38;b.vz=flight.vz*.38;settle=0;age=0;continue;
    }
    collideWalls(b,l.WALLS,l.POST_COLLIDERS);
    if(!l.onCourse(b.x,b.z))return done({fell:true});
    if(shouldSink(b,l.CUP))return done({won:true});
    settle=Math.hypot(b.vx,b.vz)<.23?settle+dt:0;
    if(settle>.45||age>14)return done({});
  }
  return done({timedOut:true});
}};
}
export const {layout,shot}=simulator(LEVELS.find(l=>l.scenery==='mothertree'));
const l=layout,level=l.LEVEL;

if(process.argv[1]?.endsWith('probe-mother-tree.mjs')){
  const S=l.START,mouth={x:-10,z:0},drum={x:level.trampoline.x,z:level.trampoline.z};
  console.log('Tee through the loop:');
  for(let p=.3;p<=1.001;p+=.05){
    const r=shot(S,p,mouth);
    console.log(p.toFixed(2),{looped:r.looped,back:r.rolledBack,drum:r.drum,launch:r.launchSpeed.toFixed(1),eye:r.eye,bark:!!r.bark,fell:!!r.fell,x:r.x.toFixed(1),z:r.z.toFixed(1)});
  }
}
