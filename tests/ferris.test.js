import test from 'node:test';
import assert from 'node:assert/strict';
import {layout,wheel,shot} from '../scripts/probe-ferris.mjs';
import {wheelTurn,docked,pivotAt,ridePose,gondolaAngle} from '../src/ferris.js';
import {puttSpeed} from '../src/putting.js';

const S=layout.START,C=layout.CUP,dock={x:wheel.dockX,z:wheel.z};
const putt=b=>shot(b,0,C,{puttingSpeed:puttSpeed(Math.hypot(C.x-b.x,C.z-b.z),layout.frictionAt(b.x,b.z))});

test('the wheel turns a quarter, then stops with a gondola at the dock and one at the green',()=>{
  assert.ok(Math.abs(wheelTurn(wheel,wheel.period)-wheel.step)<1e-9);
  assert.equal(wheelTurn(wheel,wheel.move+.1),wheelTurn(wheel,wheel.period-.01),'Still while docked');
  assert.ok(!docked(wheel,wheel.move/2)&&docked(wheel,wheel.move+.1)&&!docked(wheel,wheel.period-.05));
  const t=wheel.move+.5,angles=[0,1,2,3].map(k=>gondolaAngle(wheel,k,t));
  const at=a=>{const p=pivotAt(wheel,a);return {x:+p.x.toFixed(6),y:+(p.y-wheel.hang).toFixed(6)}};
  assert.ok(angles.some(a=>{const p=at(a);return Math.abs(p.x-wheel.dockX)<1e-6&&Math.abs(p.y)<1e-6}),'A gondola floor level with the lower deck at the dock');
  assert.ok(angles.some(a=>{const p=at(a);return Math.abs(p.x+wheel.dockX)<1e-6&&Math.abs(p.y-layout.heightAt(5,0))<1e-6}),'and one level with the green');
});

test('a ride lasts half a turn and ends at the green',()=>{
  const start=wheel.move+.2,turn0=wheelTurn(wheel,start);
  const first=ridePose(wheel,turn0,start);assert.ok(Math.abs(first.x-wheel.dockX)<1e-9&&Math.abs(first.y)<1e-9);
  assert.ok(ridePose(wheel,turn0,start+wheel.period).y>3,'Over the top');
  const end=ridePose(wheel,turn0,start+2*wheel.period);assert.ok(end.done&&Math.abs(end.x+wheel.dockX)<1e-9);
  assert.ok(layout.onCourse(wheel.exitX,wheel.z)&&layout.heightAt(wheel.exitX,wheel.z)>2.4);
});

test('timing the roll: in while the gate is green rides, otherwise the ball bounces back without penalty',()=>{
  let rides=0,bounces=0,n=0;
  for(let t=0;t<wheel.period;t+=.1){n++;const b=shot(S,.7,dock,{time:t});assert.ok(!b.fell,'No fall at the dock');if(b.rode)rides++;else if(b.bounced)bounces++}
  assert.ok(rides/n>.3&&rides/n<.7,`${rides}/${n} start times ride`);
  assert.ok(bounces>0);
  for(const p of [.4,.5])assert.ok(!shot(S,p,dock,{time:0}).rode,`${p}: too soft to reach the dock`);
  const ride=[...Array(30).keys()].map(i=>shot(S,.7,dock,{time:i*.1})).find(b=>b.rode);
  assert.ok(Math.abs(ride.x-C.x)<5&&putt(ride).won,'A putt from where the gondola tips the ball out: birdie');
});

test('the ramp round the side is the long way: par, with an open edge to the gap',()=>{
  const corner=shot(S,.7,{x:-6,z:4.5});assert.ok(!corner.fell&&corner.z>6&&corner.x<-4,'Into the ramp corner');
  for(const p of [.7,.8,.9,1]){const b=shot(corner,p,{x:corner.x+10,z:7.25});assert.ok(!b.fell&&b.x>4&&putt(b).won,`${p}: up the ramp, then a putt`)}
  assert.ok(!shot(corner,.6,{x:corner.x+10,z:7.25}).fell,'Too soft rolls back down');
  const off=shot(corner,.9,{x:corner.x+10,z:5.5});assert.ok(off.fell,'Drifting toward the gap falls off the open edge');
});
