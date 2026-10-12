import {collideCircle,collideWalls} from './mechanics.js';

export function createBellBridgeState(){
  return {open:false,progress:0,savedOpen:false,ring:0};
}
export function stepBellBridge(state,dt,config){
  if(!config)return;
  state.progress=Math.max(0,Math.min(1,state.progress+(state.open?1:-1)*dt/config.duration));
  state.ring=Math.max(0,state.ring-dt);
}
export function bellBridgePose(state,config){
  const p=state.progress,ease=p*p*(3-2*p);
  return {angle:config.angle*(1-ease),ready:p>=1,barHeight:p>=1?-.6:.38,weightY:-2.4+ease*2.2};
}
export function strikeBell(ball,state,config){
  if(!config||state.open)return false;
  const s=config.switch,dx=ball.x-s.x,dz=ball.z-s.z,d=Math.hypot(dx,dz);
  const incoming=d?(ball.vx*dx+ball.vz*dz)/d:0;
  const hit=collideCircle(ball,s.x,s.z,s.r);
  if(hit&&incoming<-.15&&!state.open){state.open=true;state.ring=2;return true}
  return false;
}
export function collideBellBridge(ball,state,config){
  if(!config||bellBridgePose(state,config).ready)return false;
  return collideWalls(ball,[
    {ax:config.x1,az:config.z-config.halfWidth,bx:config.x1,bz:config.z+config.halfWidth,nx:-1,nz:0,radius:.10},
    {ax:config.x2,az:config.z-config.halfWidth,bx:config.x2,bz:config.z+config.halfWidth,nx:1,nz:0,radius:.10},
  ],[]);
}
export function onBellBridge(x,z,config){
  return !!config&&x>config.x1&&x<config.x2&&Math.abs(z-config.z)<=config.halfWidth;
}
export function restoreBellBridge(state){
  state.open=state.savedOpen;state.progress=state.open?1:0;state.ring=0;
}
