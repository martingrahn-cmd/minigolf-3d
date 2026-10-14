// The comet cannon: a ball that rolls into its funnel is loaded, the barrel sweeps
// from side to side, and the player fires. The shot always flies the same range,
// so the only skill is timing the sweep. The barrel lingers at the ends of its
// swing (the side shelves) and moves fastest across the middle (the green).
export function barrelAngle(cannon,time){
  return cannon.heading+cannon.sweep*Math.sin(time*Math.PI*2/cannon.period);
}

// The ball is caught by the loading funnel in front of the cannon, then blown up
// a glass feed tube into the breech.
export function loadsCannon(ball,cannon){
  const hopper=cannon?.hopper??cannon;
  return !!cannon&&Math.hypot(ball.x-hopper.x,ball.z-hopper.z)<cannon.catch;
}

// Position along the feed tube (points are [x, y, z]) at time t, and whether it is done.
export function feedPose(cannon,time){
  const points=cannon.feed,t=Math.min(1,time/cannon.feedTime),eased=t*t*(3-2*t);
  const lengths=points.slice(1).map((p,i)=>Math.hypot(p[0]-points[i][0],p[1]-points[i][1],p[2]-points[i][2]));
  let along=eased*lengths.reduce((a,b)=>a+b,0),i=0;
  while(i<lengths.length-1&&along>lengths[i]){along-=lengths[i];i++}
  const k=lengths[i]?Math.min(1,along/lengths[i]):1,a=points[i],b=points[i+1];
  return {x:a[0]+(b[0]-a[0])*k,y:a[1]+(b[1]-a[1])*k,z:a[2]+(b[2]-a[2])*k,done:t>=1};
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
