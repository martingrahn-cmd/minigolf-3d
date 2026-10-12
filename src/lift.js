// One state drives the platform, doors, counterweights and carried ball.
const smooth=t=>{const p=Math.max(0,Math.min(1,t));return p*p*(3-2*p)};
export const onLift=(x,z,c)=>!!c&&x>c.x1&&x<c.x2&&Math.abs(z-c.z)<c.halfWidth;
export const createLiftState=()=>({mode:'bottom',time:0,settle:0,entry:null,savedTop:false});
export function liftPose(state,c){
  const rise=state.mode==='top'?1:state.mode==='riding'?smooth((state.time-c.closeTime)/c.travelTime):0;
  const exit=state.mode==='top'?1:state.mode==='riding'?smooth((state.time-c.closeTime-c.travelTime)/c.openTime):0;
  const entry=state.mode==='bottom'?1:state.mode==='riding'?1-smooth(state.time/c.closeTime):0;
  return {y:c.bottom+(c.top-c.bottom)*rise,rise,entry,exit,weightY:c.top+1-(c.top-c.bottom)*rise};
}
export function tryBoardLift(ball,state,c,dt){
  if(!c||state.mode!=='bottom')return false;
  const room=ball.x>c.x1+.5&&ball.x<c.x2-.5&&Math.abs(ball.z-c.z)<c.halfWidth-.5;
  state.settle=room&&Math.hypot(ball.vx,ball.vz)<.65?state.settle+dt:0;
  if(state.settle<.28)return false;
  state.mode='riding';state.time=0;state.entry={x:ball.x,z:ball.z};ball.vx=0;ball.vz=0;return true;
}
export function stepLift(ball,state,c,dt){
  if(!c||state.mode!=='riding')return false;
  state.time+=dt;
  ball.x=state.entry.x;ball.z=state.entry.z;
  if(state.time>=c.closeTime+c.travelTime+c.openTime){state.mode='top';ball.vx=c.exitSpeed;ball.vz=0;return true}
  return false;
}
export function liftBarriers(state,c){
  if(!c)return [];
  const edges=[];
  // The upper lip stays shut until the cage is level; the lower door then stays shut.
  if(state.mode!=='bottom')edges.push({ax:c.x1,az:c.z-c.halfWidth,bx:c.x1,bz:c.z+c.halfWidth,nx:1,nz:0,radius:.10});
  if(state.mode!=='top')edges.push({ax:c.x2,az:c.z-c.halfWidth,bx:c.x2,bz:c.z+c.halfWidth,nx:-1,nz:0,radius:.10});
  return edges;
}
export function restoreLift(state){
  state.mode=state.savedTop?'top':'bottom';state.time=0;state.settle=0;state.entry=null;
}
