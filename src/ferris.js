// The Ferris wheel ferry. Like a real fair wheel it turns a quarter, then stops so
// a gondola stands at the boarding dock. A ball that rolls into the dock while the
// wheel stands still boards; while it turns, the dock gate is shut and the ball
// bounces back. Half a turn later the gondola stops at the green and tips it out.
// Angles are in the wheel's x–y plane; the wheel turns clockwise (angles fall).

const ease=t=>t*t*(3-2*t);

// Total rotation so far: quarter steps of `move` seconds, each followed by a stop.
export function wheelTurn(wheel,time){
  const steps=Math.floor(time/wheel.period),inStep=time-steps*wheel.period;
  return wheel.step*(steps+ease(Math.min(1,inStep/wheel.move)));
}

// The wheel stands still with a gondola at the dock, long enough to board.
export function docked(wheel,time){
  const inStep=time%wheel.period;
  return inStep>=wheel.move&&inStep<=wheel.period-wheel.boardMargin;
}

export function pivotAt(wheel,angle){
  return {x:wheel.x+Math.cos(angle)*wheel.radius,y:wheel.hubY+Math.sin(angle)*wheel.radius};
}
export const gondolaAngle=(wheel,k,time)=>wheel.dockAngle+k*wheel.step-wheelTurn(wheel,time);

// Did the ball roll across the dock edge through the boarding slot?
export function crossesDock(previous,ball,wheel){
  if(!wheel)return false;
  return previous.x<wheel.dockX&&ball.x>=wheel.dockX&&Math.abs(ball.z-wheel.z)<wheel.slot;
}

// Where a riding ball is, `time` seconds on, having boarded at turn `boardTurn`.
export function ridePose(wheel,boardTurn,time){
  const turned=Math.min(Math.PI,wheelTurn(wheel,time)-boardTurn),pivot=pivotAt(wheel,wheel.dockAngle-turned);
  return {x:pivot.x,y:pivot.y-wheel.hang,z:wheel.z,done:turned>=Math.PI-1e-9};
}
