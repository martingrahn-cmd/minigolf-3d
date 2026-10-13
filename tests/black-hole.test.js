import test from 'node:test';
import assert from 'node:assert/strict';
import {layout,shot} from '../scripts/probe-black-hole.mjs';
import {blackHolePull,crossesHorizon} from '../src/black-hole.js';
import {puttSpeed} from '../src/putting.js';

const hole=layout.LEVEL.blackHole,S=layout.START,C=layout.CUP;
const putt=b=>shot(b,0,C,0,puttSpeed(Math.hypot(C.x-b.x,C.z-b.z),layout.frictionAt(b.x,b.z)));
const past=off=>({x:hole.x,z:hole.z-off});

test('the pull is zero at the rim, grows inward, and the horizon swallows the ball',()=>{
  const at=r=>{const b={x:hole.x-r,z:hole.z,vx:0,vz:0};blackHolePull(b,hole,1);return b.vx};
  assert.equal(at(hole.radius+.1),0);
  assert.ok(at(hole.radius-.05)<.05,'Barely any pull just inside the dashed rim');
  assert.ok(at(1)>at(2)&&at(2)>at(2.8)&&at(2.8)>0,'Stronger closer in');
  assert.equal(blackHolePull({x:hole.x+hole.horizon*.9,z:hole.z,vx:0,vz:0},hole,1/120),'swallowed');
  assert.ok(crossesHorizon({x:hole.x-1,z:hole.z},{x:hole.x+1,z:hole.z},hole),'A fast ball cannot skip the horizon in one step');
  assert.ok(!crossesHorizon({x:hole.x-1,z:hole.z+1},{x:hole.x+1,z:hole.z+1},hole));
  assert.ok(Math.hypot(C.x-hole.x,C.z-hole.z)>hole.radius+1,'The cup sits clear of the pull');
});

test('aiming straight at the cup gets swallowed; the slingshot bends a fast ball round to the cup',()=>{
  for(const p of [.5,.6,.7,.8,.9,1])assert.ok(shot(S,p,C).swallowed,`${p}: straight through the middle is eaten`);
  for(const p of [.5,.6])assert.ok(shot(S,p,past(1.5)).swallowed,`${p}: too slow past the hole is pulled in`);
  for(const [off,p] of [[1,.8],[1.5,.8],[1.5,.85],[-1.5,.8],[1,.9]]){
    const b=shot(S,p,past(off));
    assert.ok(!b.fell&&(b.won||Math.hypot(C.x-b.x,C.z-b.z)<2.8),`${off} m past at ${p}: slung round to the cup`);
    assert.ok(b.won||putt(b).won,'Then one putt for birdie');
    assert.ok(b.closest<2,'It really goes round the hole, not past it');
  }
});

test('the long way round is safe and still gives par, and an ace stays rare',()=>{
  for(const [off,p] of [[4.5,.6],[4,.7],[5,.7],[-4.5,.6],[-5,.7]]){
    const b=shot(S,p,past(off));
    assert.ok(!b.fell&&b.x>-1,`${off} m wide at ${p}: round the edge without being pulled in`);
    assert.ok(putt(b).won,'and a putt clear of the pull');
  }
  let aces=0,tries=0;
  for(let p=.6;p<=1.0001;p+=.025)for(let off=-3;off<=3;off+=.25){tries++;if(shot(S,p,past(off)).won)aces++}
  assert.ok(aces>0&&aces/tries<.06,`${aces}/${tries} slingshots hole out`);
});

test('the planets in the far corners send a ball that flies past back into play',()=>{
  let bounced=0;
  for(const off of [-3,-2.5,2.5,3])for(const p of [.9,.95,1]){const b=shot(S,p,past(off));if(b.bounces)bounced++;assert.ok(!b.fell||b.swallowed)}
  assert.ok(bounced>0,'Overhit slingshots reach the planets');
});
