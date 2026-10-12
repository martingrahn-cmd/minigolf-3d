// One surface model drives the visible board, gravity and launch position.
export function onBridge(x,z,bridge){
  return !!bridge&&x>=bridge.x1&&x<=bridge.x2&&Math.abs(z-bridge.z)<=bridge.halfWidth;
}
export function bridgeHeight(x,bridge,angle=bridge.maxAngle){
  return bridge.pivotY+(x-(bridge.x1+bridge.x2)/2)*Math.tan(angle);
}
export function stepBridge(angle,ball,bridge,dt){
  if(!bridge)return 0;
  // A stopped ball holds the board still so aiming never becomes a moving target.
  if(onBridge(ball.x,ball.z,bridge)&&ball.phase!=='moving')return angle;
  const center=(bridge.x1+bridge.x2)/2;
  const target=onBridge(ball.x,ball.z,bridge)&&ball.x>center ? -bridge.maxAngle:bridge.maxAngle;
  return angle+(target-angle)*(1-Math.exp(-3.8*dt));
}
export function leavesBridge(previous,ball,bridge){
  return onBridge(previous.x,previous.z,bridge)&&ball.x>bridge.x2&&ball.vx>0;
}
export function bridgeFlight(ball,bridge,angle){
  const startY=bridgeHeight(bridge.x2,bridge,angle);
  const vy=5.8; // The spring-loaded tip gives every jump the same readable arc.
  return {x:ball.x,z:ball.z,y:startY,vx:ball.vx, vz:ball.vz,vy,
    duration:(vy+Math.sqrt(vy*vy+2*12*Math.max(0,startY)))/12};
}
export function flightPosition(flight,time){
  const t=Math.min(time,flight.duration);
  return {x:flight.x+flight.vx*t,z:flight.z+flight.vz*t,y:flight.y+flight.vy*t-6*t*t};
}
