import test from 'node:test';
import assert from 'node:assert/strict';
import {layout,rocket,shot,launch} from '../scripts/probe-moon-rocket.mjs';
import {cometRange,cometPose,barrelAngle} from '../src/comet-cannon.js';
import {puttSpeed} from '../src/putting.js';

const S=layout.START,C=layout.CUP,level=layout.LEVEL;
const putt=b=>shot(b,0,C,{puttingSpeed:puttSpeed(Math.hypot(C.x-b.x,C.z-b.z),layout.frictionAt(b.x,b.z))});
const onBase=b=>!b.fell&&b.x>=2&&b.x<12;
const onTop=b=>!b.fell&&b.x>=16;

test('the rocket is the world finale and combines the cannon with low gravity',()=>{
  assert.equal(level.worldFinale,true);
  assert.ok(level.cometCannon&&level.lowGravity.length,'Two ideas from earlier holes');
  assert.equal(barrelAngle(rocket,1.3),rocket.heading,'The rocket does not sweep; its thrust does');
  assert.ok(Math.abs(cometRange(rocket,0)-rocket.rangeMin)<1e-9&&cometRange(rocket,rocket.period*.999)>rocket.rangeMax-.05,'The gauge climbs and starts over');
  assert.ok(Math.abs(cometPose(rocket,0,0,20).y-rocket.launchY)<1e-9&&cometPose(rocket,0,rocket.flight,20).y===0,'Launched from the nose, down to the floor');
});

test('any firm tee shot rolls into the rocket',()=>{
  for(const p of [.4,.6,1])assert.ok(shot(S,p,{x:-11,z:0}).loaded);
  for(const z of [-1.2,1.2])assert.ok(shot(S,.7,{x:-11,z}).loaded,'The guide rails steer it to the funnel');
});

test('the thrust gauge: too little and too much are space, the base is wide, the top is the prize',()=>{
  const at=r=>launch(r);
  assert.ok(at(8.5).missed&&at(31).missed,'Short of the base and past the top');
  for(const r of [11,14,17])assert.ok(onBase(at(r)),`${r} m: the moon base`);
  assert.ok(at(22).missed,'The crater between them');
  for(const r of [24.5,26,28])assert.ok(onTop(at(r))&&(at(r).won||putt(at(r)).won),`${r} m: the top, then a putt for eagle`);
  const tally={miss:0,base:0,top:0};let n=0;
  for(let t=0;t<rocket.period;t+=.01){n++;const b=at(cometRange(rocket,t));tally[b.fell?'miss':onTop(b)?'top':'base']++}
  assert.ok(tally.base>tally.top&&tally.top/n>.12&&tally.top/n<.3,JSON.stringify(tally));
});

test('from the weightless base a float over the crater gives birdie; too hard bounces back into it',()=>{
  const base=launch(15);assert.ok(onBase(base));
  for(const p of [.45,.5,.55,.6]){const b=shot(base,p,{x:C.x,z:0});assert.ok(onTop(b)&&b.floats===1&&putt(b).won,`${p}: floats over, then a putt`)}
  assert.ok(shot(base,.4,{x:C.x,z:0}).fell,'Too soft sinks in the crater');
  for(const p of [.75,.9])assert.ok(shot(base,p,{x:C.x,z:0}).fell,`${p}: off the back rail and down into the crater`);
});

test('the long way round the crater glides without floating',()=>{
  const base=launch(15),b=shot(base,.4,{x:13,z:4.6});
  assert.ok(onTop(b)&&b.floats===0&&putt(b).won);
});
