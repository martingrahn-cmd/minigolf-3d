import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayout, LEVELS } from '../src/layout.js';
import { gatePose, advanceGate, collideGate } from '../src/gates.js';
import {shouldSink, collideWalls, collideBumper, shotSpeed } from '../src/mechanics.js';
const layout=createLayout(LEVELS.find(l=>l.id===12)),gate=layout.LEVEL.gates[0],dt=1/120;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`);

test('gate light and collision follow the visible opening, including reverse shots',()=>{
  assert.equal(gatePose(1,gate).signal,'red');
  assert.equal(gatePose(4,gate).signal,'green');
  assert.equal(gatePose(6,gate).signal,'amber');
  for(const side of [-1,1]){
    const ball={x:gate.x+side*.35,z:0,vx:-side*20,vz:0};
    assert.equal(collideGate(ball,gate,1),true);
    assert.ok(ball.vx*side>0);near(Math.abs(ball.x-gate.x),gate.thickness/2+.31);
    const open={x:gate.x+side*.35,z:0,vx:-side*20,vz:0};
    assert.equal(collideGate(open,gate,4),false);near(open.vx,-side*20);
  }
});
test('gate sensor allows a parked ball through and resumes when clear',()=>{
  const ball={x:gate.x,z:0,vx:0,vz:0};
  let clock=5.9;
  for(let i=0;i<600;i++)clock=advanceGate(clock,dt,ball,gate);
  near(clock,5.9);assert.ok(gatePose(clock,gate).passable);
  assert.ok(advanceGate(clock,dt,{...ball,x:gate.x+2},gate)>clock);
  // A ball waiting against an already lowered gate must not freeze it closed.
  assert.ok(advanceGate(6.7,dt,ball,gate)>6.7);
});
test('closed port catches maximum-speed shots without tunnelling and side lanes stay open',()=>{
  for(const z of [0,.9,-.9]){
    const ball={x:gate.x-1,z,vx:shotSpeed(1),vz:0};
    for(let i=0;i<30;i++){ball.x+=ball.vx*dt;collideGate(ball,gate,1);assert.ok(ball.x<gate.x)}
    assert.ok(ball.vx<0);
  }
  for(const z of [-2.95,2.95])for(let x=-6;x<=1;x+=.04){
    const ball={x,z,vx:5,vz:0};collideGate(ball,gate,1);collideWalls(ball,layout.BOUNDARIES,layout.POST_COLLIDERS);
    near(ball.x,x);near(ball.z,z);assert.ok(layout.onCourse(ball.x,ball.z));
  }
});
function putt(ball,power,aim,clock){
  ball.vx=Math.cos(aim)*shotSpeed(power);ball.vz=Math.sin(aim)*shotSpeed(power);
  let settle=0,won=false;
  for(let i=0;i<1800;i++){
    clock=advanceGate(clock,dt,ball,gate);
    ball.vx*=Math.exp(-1.35*dt);ball.vz*=Math.exp(-1.35*dt);
    ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;
    collideWalls(ball,layout.BOUNDARIES,layout.POST_COLLIDERS);collideGate(ball,gate,clock);
    for(const bumper of layout.LEVEL.bumpers)collideBumper(ball,bumper);
    assert.ok(layout.onCourse(ball.x,ball.z),`Escaped at ${ball.x},${ball.z}`);
    if(shouldSink(ball,layout.CUP)){won=true;break}
    settle=Math.hypot(ball.vx,ball.vz)<.23?settle+dt:0;
    if(settle>.45)break;
  }
  return {clock,won};
}
test('hole 12 can be completed via the timed gate with a controlled finishing putt',()=>{
  const ball={...layout.START,vx:0,vz:0};
  let shot=putt(ball,.98,0,3.1);
  assert.ok(ball.x>4,'Timed opening shot should reach the green');
  const distance=Math.hypot(layout.CUP.x-ball.x,layout.CUP.z-ball.z);
  let low=0,high=1;
  for(let i=0;i<30;i++){const p=(low+high)/2;if(shotSpeed(p)/1.35<distance)low=p;else high=p}
  shot=putt(ball,(low+high)/2,Math.atan2(layout.CUP.z-ball.z,layout.CUP.x-ball.x),shot.clock);
  assert.ok(shot.won,`Putt stopped at ${ball.x},${ball.z}`);
});
