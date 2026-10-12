// A wheel in the Y/Z plane. Geometry, signals and collision use these apertures.
const TAU=Math.PI*2;
const BALL_Y=.35, BALL_R=.31;
export const wheelAngle=(time,c)=>c.phase+time*c.speed;
export function wheelApertures(time,c){
  const a=wheelAngle(time,c);
  return Array.from({length:c.windows},(_,i)=>{
    const angle=a+i*TAU/c.windows;
    return {y:c.hubY+Math.sin(angle)*c.orbit,z:c.z+Math.cos(angle)*c.orbit};
  });
}
export function wheelClearance(z,time,c,y=BALL_Y){
  return Math.max(...wheelApertures(time,c).map(p=>c.holeRadius-Math.hypot(y-p.y,z-p.z)));
}
export function wheelSignal(time,c){
  const gap=wheelClearance(c.z,time,c);
  return gap>BALL_R+.15?'green':gap>BALL_R-.18?'amber':'red';
}
export function collideClockWheel(ball,previous,time,c){
  if(!c||Math.abs(ball.z-c.z)>c.laneHalfWidth+BALL_R)return false;
  const half=c.depth/2+BALL_R;
  if(Math.max(ball.x,previous.x)<=c.x-half||Math.min(ball.x,previous.x)>=c.x+half)return false;
  // Sweep to the entrance face as well as testing the current position. Fast
  // shots cannot tunnel through a closed wheel or graze an opening invisibly.
  const side=previous.x<c.x?-1:previous.x>c.x?1:ball.vx>0?-1:1;
  const face=c.x+side*half,dx=ball.x-previous.x;
  const t=dx?Math.max(0,Math.min(1,(face-previous.x)/dx)):1;
  const z=previous.z+(ball.z-previous.z)*t;
  if(Math.min(wheelClearance(z,time,c),wheelClearance(ball.z,time,c))>=BALL_R)return false;
  ball.x=face;
  if(ball.vx*side<0)ball.vx=-ball.vx*.58;
  // A closing lip also clears a resting ball, without trapping it in the face.
  if(Math.abs(ball.vx)<.8)ball.vx=side*.8;
  return true;
}
