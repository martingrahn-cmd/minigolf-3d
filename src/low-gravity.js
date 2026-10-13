// Inside a low-gravity zone a ball that rolls off an open edge does not drop at
// once: it keeps its speed and sinks slowly. If it reaches floor again before it
// has sunk too far, it lands and rolls on; otherwise it is lost to space.
export const FLOAT_GRAVITY=2.2;
export const FLOAT_LAND_DEPTH=.4;
export const FLOAT_LOST_DEPTH=1.6;

export function inLowGravity(x,z,zones=[]){
  return zones.some(zone=>x>=zone.x1&&x<=zone.x2&&z>=zone.z1&&z<=zone.z2);
}

export const floatDrop=time=>.5*FLOAT_GRAVITY*time*time;

// Advances an airborne ball; returns 'land', 'lost' or null while still floating.
export function stepFloat(ball,dt,onCourse){
  ball.float+=dt;ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;
  const drop=floatDrop(ball.float);
  // Reaching floor too low means striking the pit's far wall: lost as well.
  if(onCourse(ball.x,ball.z))return drop<FLOAT_LAND_DEPTH?'land':'lost';
  if(drop>=FLOAT_LOST_DEPTH)return 'lost';
  return null;
}
