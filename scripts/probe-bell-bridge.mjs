import {LEVELS,createLayout} from '../src/layout.js';
import {shotSpeed,collideWalls,shouldSink} from '../src/mechanics.js';
import {createBellBridgeState,stepBellBridge,strikeBell,collideBellBridge} from '../src/bell-bridge.js';
export const layout=createLayout(LEVELS.find(l=>l.id===3));
const l=layout;
export function shot(from,p,target,bridge=createBellBridgeState(),puttVelocity){
  const a=Math.atan2(target.z-from.z,target.x-from.x),speed=puttVelocity??shotSpeed(p),b={x:from.x,z:from.z,vx:Math.cos(a)*speed,vz:Math.sin(a)*speed};
  bridge.savedOpen=bridge.open;let settle=0,rings=0,blocked=0;
  for(let i=0;i<1800;i++){
    const dt=1/120;stepBellBridge(bridge,dt,l.LEVEL.bellBridge);
    const drag=Math.exp(-l.frictionAt(b.x,b.z)*dt);b.vx*=drag;b.vz*=drag;b.x+=b.vx*dt;b.z+=b.vz*dt;
    collideWalls(b,l.WALLS,l.POST_COLLIDERS);
    if(strikeBell(b,bridge,l.LEVEL.bellBridge))rings++;
    if(collideBellBridge(b,bridge,l.LEVEL.bellBridge))blocked++;
    if(!l.onCourse(b.x,b.z))return{...b,fell:true,rings,blocked};
    if(shouldSink(b,l.CUP))return{...b,won:true,rings,blocked};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=dt;if(settle>.45)break}else settle=0;
  }
  return{...b,rings,blocked};
}
