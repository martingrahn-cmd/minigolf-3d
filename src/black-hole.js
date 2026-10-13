// A black hole on the felt pulls a rolling ball toward its centre. The pull falls
// off with the square of the distance and is cut to zero at the rim, so a ball
// passing at the right distance is bent round the hole like a slingshot; one that
// reaches the horizon is swallowed.
export function blackHolePull(ball,hole,dt){
  if(!hole)return null;
  const dx=hole.x-ball.x,dz=hole.z-ball.z,r=Math.hypot(dx,dz);
  if(r<=hole.horizon)return 'swallowed';
  if(r>=hole.radius)return null;
  const pull=hole.strength*(1/(r*r)-1/(hole.radius*hole.radius));
  ball.vx+=dx/r*pull*dt;ball.vz+=dz/r*pull*dt;
  return 'pulled';
}

// Swept test: a fast ball must not skip over the horizon between two steps.
export function crossesHorizon(previous,ball,hole){
  if(!hole)return false;
  const dx=ball.x-previous.x,dz=ball.z-previous.z,den=dx*dx+dz*dz;
  const t=den?Math.max(0,Math.min(1,((hole.x-previous.x)*dx+(hole.z-previous.z)*dz)/den)):0;
  return Math.hypot(previous.x+dx*t-hole.x,previous.z+dz*t-hole.z)<=hole.horizon;
}
