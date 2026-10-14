import test from 'node:test';
import assert from 'node:assert/strict';
import {layout,cannon,shot,fire,fireAt} from '../scripts/probe-comet.mjs';
import {barrelAngle,cometPose,cometLanding,feedPose} from '../src/comet-cannon.js';
import {puttSpeed} from '../src/putting.js';

const S=layout.START,C=layout.CUP,deg=Math.PI/180;
const putt=(b,to=C)=>shot(b,0,to,0,puttSpeed(Math.hypot(to.x-b.x,to.z-b.z),layout.frictionAt(b.x,b.z)));
const onGreen=b=>!b.fell&&Math.abs(b.z)<1.7&&b.x>6.9&&b.x<12.7;

test('the barrel sweeps between its limits, lingering at the ends, and the comet flies a fixed range',()=>{
  const angles=Array.from({length:301},(_,i)=>barrelAngle(cannon,i*cannon.period/300));
  assert.ok(Math.abs(Math.max(...angles)-cannon.sweep)<1e-3&&Math.abs(Math.min(...angles)+cannon.sweep)<1e-3);
  const step=t=>Math.abs(barrelAngle(cannon,t+.05)-barrelAngle(cannon,t));
  assert.ok(step(0)>4*step(cannon.period/4-.025),'Fast across the middle, slow at the ends');
  for(const a of [-.5,0,.3]){const p=cometLanding(cannon,a);assert.ok(Math.abs(Math.hypot(p.x-cannon.x,p.z-cannon.z)-cannon.range)<1e-9)}
  const mid=cometPose(cannon,0,cannon.flight/2),end=cometPose(cannon,0,cannon.flight);
  assert.ok(Math.abs(mid.y-cannon.apex)<1e-9&&end.done&&end.y===0);
});

test('any firm tee shot rolls into the cannon; a soft one can try again',()=>{
  for(const p of [.5,.6,.8,1])assert.ok(shot(S,p,{x:cannon.x,z:0}).loaded,`${p}: loads the cannon`);
  const soft=shot(S,.3,{x:cannon.x,z:0});assert.ok(!soft.loaded&&!soft.fell);
  assert.ok(shot(soft,.4,{x:cannon.x,z:0}).loaded);
  for(const z of [-1.3,1.3])assert.ok(shot(S,.7,{x:cannon.x,z}).loaded,`aimed at ${z}: the guide rails steer it into the funnel`);
  const start=feedPose(cannon,0),end=feedPose(cannon,cannon.feedTime);
  assert.ok(Math.hypot(start.x-cannon.hopper.x,start.z-cannon.hopper.z)<1e-9&&Math.hypot(end.x-cannon.x,end.z-cannon.z)<1e-9&&end.done,'The feed tube runs from the funnel into the cannon');
  assert.ok(feedPose(cannon,cannon.feedTime/2).y>1,'up through the glass tube');
});

test('the middle of the sweep lands on the green, the ends on the side shelves, between them is space',()=>{
  for(const a of [-5,0,5]){const b=fire(a*deg);assert.ok(b.won||onGreen(b),`${a}°: green`);assert.ok(b.won||putt(b).won,'one putt for birdie')}
  for(const a of [-40,-30,-24,24,30,40]){const b=fire(a*deg);assert.ok(!b.fell&&Math.abs(b.z)>4.9,`${a}°: side shelf`)}
  for(const a of [-18,-12,12,18])assert.ok(fire(a*deg).missed,`${a}°: into space`);
});

test('timing decides: the side shelves are easy, the green is a short window and an ace is rare',()=>{
  const tally={ace:0,green:0,side:0,miss:0};let n=0;
  for(let t=0;t<cannon.period;t+=.005){n++;const b=fire(fireAt(t));tally[b.missed?'miss':b.won?'ace':onGreen(b)?'green':'side']++}
  assert.ok(tally.side/n>.5,'Most of the time the barrel points at a side shelf');
  assert.ok((tally.green+tally.ace)/n>.08&&(tally.green+tally.ace)/n<.16,'The green is a short window');
  assert.ok(tally.ace>0&&tally.ace/n<.04,`${tally.ace}/${n} instants hole out`);
  assert.ok(tally.miss/n>.15&&tally.miss/n<.35);
});

test('from a side shelf two putts round the corner make par',()=>{
  for(const a of [32,-32,38]){
    const side=fire(a*deg),z=Math.sign(side.z);
    assert.ok(!putt(side).won,`${a}°: no straight putt across the gap`);
    const corner=putt(side,{x:11.5,z:z*3});assert.ok(!corner.fell&&corner.x>10.4,'to the corner above the bridge');
    assert.ok(putt(corner).won,'then down the bridge into the cup');
  }
});
