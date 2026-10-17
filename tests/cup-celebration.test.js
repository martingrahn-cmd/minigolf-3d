import test from 'node:test';
import assert from 'node:assert/strict';
import { sinkPose, SINK, HOLE_RADIUS, onTheLip, LIP_RESCUE } from '../src/cup-celebration.js';
import { BALL_RADIUS, CUP_SOFT_RADIUS } from '../src/mechanics.js';

test('the sinking ball curls round the lip, drops and settles on the bottom', () => {
  const entry={x:-.35,z:.1,vx:2,vz:-.3};
  const start=sinkPose(0,entry);
  assert.ok(Math.abs(start.x-entry.x)<1e-9&&Math.abs(start.z-entry.z)<1e-9&&start.y===0,'starts where it was caught');
  let lastY=0;
  for(let t=0;t<=SINK.drop;t+=.01){const p=sinkPose(t,entry);assert.ok(p.y<=lastY+1e-9,'keeps going down until the bottom');lastY=p.y}
  const end=sinkPose(SINK.settle,entry);
  assert.ok(end.done);
  assert.ok(Math.hypot(end.x,end.z)+BALL_RADIUS<HOLE_RADIUS+.02,'ends inside the hole');
  assert.ok(end.y<-.5,'at the bottom');
});

test('the curl follows the way the ball was rolling', () => {
  const left=sinkPose(SINK.rim,{x:-.3,z:0,vx:1,vz:1}),right=sinkPose(SINK.rim,{x:-.3,z:0,vx:1,vz:-1});
  assert.ok(Math.sign(left.z)!==Math.sign(right.z));
});

test('only a ball resting right at the edge counts as on the lip', () => {
  const cup={x:0,z:0};
  assert.ok(onTheLip({x:CUP_SOFT_RADIUS+.1,z:0},cup));
  assert.ok(onTheLip({x:0,z:LIP_RESCUE-.01},cup));
  assert.ok(!onTheLip({x:LIP_RESCUE+.05,z:0},cup));
  assert.ok(LIP_RESCUE<HOLE_RADIUS+BALL_RADIUS+.15,'just past touching the rim');
});

test("the cat's paw lifts slowly, strikes on the beat and draws back smoothly", async () => {
  const { catPaw } = await import('../src/cup-celebration.js');
  assert.deepEqual(catPaw(0,1),{lift:0,reach:0},'at rest long before');
  assert.equal(catPaw(1,1).reach,1,'fully out at the moment of contact');
  assert.ok(catPaw(.85,1).lift>.9,'held high just before the strike');
  assert.deepEqual(catPaw(2,1),{lift:0,reach:0},'back at rest after');
  let last=catPaw(0,1);
  for(let t=0;t<=2;t+=.005){const p=catPaw(t,1);assert.ok(Math.abs(p.lift-last.lift)<.12&&Math.abs(p.reach-last.reach)<.12,`no jumps at ${t.toFixed(3)}`);last=p}
});
