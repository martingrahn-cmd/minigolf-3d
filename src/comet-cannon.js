// The comet cannon: a ball that rolls into its mouth is loaded, the barrel sweeps
// from side to side, and the player fires. The shot always flies the same range,
// so the only skill is timing the sweep. The barrel lingers at the ends of its
// swing (the side shelves) and moves fastest across the middle (the green).
export function barrelAngle(cannon,time){
  return cannon.heading+cannon.sweep*Math.sin(time*Math.PI*2/cannon.period);
}

export function loadsCannon(ball,cannon){
  return !!cannon&&Math.hypot(ball.x-cannon.x,ball.z-cannon.z)<cannon.catch;
}

export function cometLanding(cannon,angle){
  return {x:cannon.x+Math.cos(angle)*cannon.range,z:cannon.z+Math.sin(angle)*cannon.range};
}

// Position along the flight, with a parabolic height for drawing.
export function cometPose(cannon,angle,time){
  const t=Math.min(1,time/cannon.flight),to=cometLanding(cannon,angle);
  return {x:cannon.x+(to.x-cannon.x)*t,z:cannon.z+(to.z-cannon.z)*t,y:4*cannon.apex*t*(1-t),done:t>=1};
}

// The ball keeps a little of its speed along the barrel when it lands.
export function landingVelocity(cannon,angle){
  return {vx:Math.cos(angle)*cannon.carry,vz:Math.sin(angle)*cannon.carry};
}
