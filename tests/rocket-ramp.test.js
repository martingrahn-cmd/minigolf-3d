import test from 'node:test';
import assert from 'node:assert/strict';
import {layout,shot} from '../scripts/probe-rocket-ramp.mjs';
import {padTriggers,springImpulse} from '../src/mechanics.js';
import {puttSpeed} from '../src/putting.js';

const [padA,padB]=layout.SPRINGS,S=layout.START,C=layout.CUP;
const putt=b=>shot(b,0,C,0,puttSpeed(Math.hypot(C.x-b.x,C.z-b.z),layout.frictionAt(b.x,b.z)));

test('a booster adds to the speed the ball brings and never fires against its arrow',()=>{
  const slow={x:padB.x,z:padB.z+.5,vx:0,vz:-2},fast={x:padB.x,z:padB.z+.5,vx:0,vz:-6};
  assert.ok(padTriggers(slow,padB));springImpulse(slow,padB);springImpulse(fast,padB);
  assert.ok(Math.abs(slow.vx-(2+padB.boost))<1e-9&&slow.vz===0);
  assert.ok(Math.abs(fast.vx-(6+padB.boost))<1e-9,'More speed in, more speed out');
  assert.equal(padTriggers({x:padB.x+.4,z:padB.z,vx:-3,vz:0},padB),false,'A ball rolling back down the ramp passes over the pad');
  const plain={x:0,z:0,dx:1,dz:0,speed:9};
  assert.ok(padTriggers({x:.2,z:0,vx:-5,vz:0},plain),'Prototype pads keep their old behaviour');
  const ball={x:0,z:0,vx:-5,vz:0};springImpulse(ball,plain);assert.equal(ball.vx,9);
  const aimed={x:padA.x-.8,z:padA.z,vx:4,vz:0};springImpulse(aimed,padA);
  const want=Math.atan2(padB.z-aimed.z,padB.x-aimed.x);
  assert.ok(Math.abs(Math.atan2(aimed.vz,aimed.vx)-want)<1e-9,'The first pad sends the ball at the second pad');
});

test('the tee shot has a readable power window up the launch ramp',()=>{
  const results=[];
  for(let p=.5;p<=1.0001;p+=.05)results.push([+p.toFixed(2),shot(S,p,padA)]);
  for(const [p,r] of results){
    if(p>=.6&&p<=.75)assert.ok(!r.fell&&r.x<0&&r.used.length===2,`${p}: rolls back down the ramp, no penalty`);
    if(p>=.8&&p<=.95)assert.ok(!r.fell&&r.x>6&&layout.heightAt(r.x,r.z)>2,`${p}: reaches the launch platform`);
  }
  assert.ok(results.find(([p])=>p===1)[1].fell,'Full power flies off the open edge into space');
  assert.deepEqual(results.find(([p])=>p===.5)[1].used,[0],'A soft shot gets only the first pad');
});

test('the chain gives birdie, a rolled-back chain still gives par, and a missed pad can be retried',()=>{
  for(const p of [.8,.85,.9,.95]){
    const b=shot(S,p,padA);
    assert.ok(Math.hypot(C.x-b.x,C.z-b.z)<=5.5&&putt(b).won,`${p}: one putt for birdie`);
  }
  let b=shot(S,.7,padA);assert.ok(!b.fell&&b.x<0);
  b=shot(b,.65,{x:10,z:b.z});assert.ok(!b.fell&&b.x>6);
  assert.ok(putt(b).won,'Three strokes after rolling back');
  const miss=shot(S,.6,{x:padA.x,z:padA.z+1.2});assert.deepEqual(miss.used,[],'A wide tee shot misses the pad');
  assert.ok(shot(miss,.5,padA).used.includes(0),'The pad works from any approach that is not against its arrow');
});
