import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {layout as l,shot} from '../scripts/probe-clock-hand.mjs';
import {clockHandPose,onClockHand,supportedByClockHand,carryOnClockHand} from '../src/clock-hand.js';
import {createClockHandVisuals} from '../src/clock-hand-visuals.js';
import {puttingContext,puttSpeed} from '../src/putting.js';
const c=l.LEVEL.clockHand,period=2*(c.hold+c.turn);
const putt=b=>{const ctx=puttingContext(b,l);assert.ok(ctx);return shot(b,0,l.CUP,b.time,puttSpeed(Math.round(ctx.distance*10)/10,ctx.friction))};

test('the rotating playing surface, warning lights and support share one transform',()=>{
  const scene=new THREE.Scene(),v=createClockHandVisuals(scene,c,l.CUP),ray=new THREE.Raycaster();
  for(let t=0;t<period;t+=.11){
    v.update(t);scene.updateMatrixWorld(true);
    for(const x of [-5,0,5])for(const z of [-.9,.9]){
      const point=v.deck.localToWorld(new THREE.Vector3(x,z,0));
      assert.ok(Math.abs(point.y-.055)<1e-8);
      assert.ok(onClockHand(point.x,point.z,t,c));
      ray.set(new THREE.Vector3(point.x,1,point.z),new THREE.Vector3(0,-1,0));
      assert.equal(ray.intersectObject(v.deck).length,1);
    }
    const outside=v.hand.localToWorld(new THREE.Vector3(0,0,c.halfWidth+.05));
    assert.equal(supportedByClockHand(outside.x,outside.z,t,c),false);
    const pose=clockHandPose(t,c);
    if(pose.signal==='green'||pose.signal==='amber'){
      assert.ok(!pose.moving);assert.ok(onClockHand(5,0,t,c));
    }
  }
  v.update(0);scene.updateMatrixWorld(true);
  ray.set(new THREE.Vector3(3,1,3),new THREE.Vector3(0,-1,0));
  assert.ok(ray.intersectObjects(scene.children,true).every(hit=>hit.point.y<-.6),'No scenery fills the playable gap');
  assert.equal(clockHandPose(c.hold-.2,c).signal,'amber');
  assert.equal(clockHandPose(c.hold+c.turn+.2,c).signal,'red');
});

test('parked and rolling balls ride a full rotation without drift or free acceleration',()=>{
  for(const speed of [0,3]){
    const b={x:4,z:.4,vx:speed,vz:0,aim:.2},radius=Math.hypot(b.x,b.z);
    const duration=2*period,dt=1/120;
    for(let t=0;t<duration;t+=dt){
      assert.ok(carryOnClockHand(b,t,t+dt,c));
      assert.ok(supportedByClockHand(b.x,b.z,t+dt,c));
      assert.ok(l.onCourse(b.x,b.z));
      assert.ok(Math.abs(Math.hypot(b.x,b.z)-radius)<1e-8);
      assert.ok(Math.abs(Math.hypot(b.vx,b.vz)-speed)<1e-8);
    }
    assert.ok(Math.abs(b.x-4)<.001&&Math.abs(b.z-.4)<.001);
  }
  const fixed={x:-9,z:0,vx:0,vz:0,aim:0};
  assert.equal(carryOnClockHand(fixed,0,4,c),false);
  assert.deepEqual(fixed,{x:-9,z:0,vx:0,vz:0,aim:0});
  assert.ok(supportedByClockHand(-9,0,4,c),'The waiting area remains solid throughout the cycle');
});

test('the final shortcut has real timing and directional risk, including a maximum tee shot',()=>{
  const setup=shot(l.START,.55,{x:0,z:0});
  const results=Array.from({length:82},(_,i)=>shot(setup,.85,{x:15,z:0},i/10));
  const safe=results.filter(b=>!b.fell&&b.x>6.5);
  assert.ok(safe.length>=12&&safe.length<=30,`${safe.length} successful launch phases`);
  assert.ok(shot(setup,.85,{x:15,z:0},3).fell);
  assert.ok(shot(l.START,1,{x:15,z:0},1).fell);
  for(const z of [-6,6])assert.ok(shot(setup,1,{x:15,z},0).fell,'An off-line shot cannot use invisible turf');
  assert.ok(shot(l.START,1,{x:15,z:0},0).x>6.5,'An excellent direct shot can save the setup');
});

test('a controlled shortcut gives par four and a precise approach can give birdie',()=>{
  for(const p of [.53,.55,.57])for(const q of [.85,.9,.95]){
    const a=shot(l.START,p,{x:0,z:0}),b=shot(a,q,{x:15,z:0},0);
    assert.ok(!b.fell&&b.z<-4,'The bank turns a well struck crossing toward the green');
    const approach=shot(b,.4,l.CUP,b.time);
    assert.ok(!approach.fell&&!approach.won);assert.ok(putt(approach).won);
  }
  const a=shot(l.START,.55,{x:0,z:0}),b=shot(a,.85,{x:15,z:0},0);
  assert.ok(shot(b,.54,l.CUP,b.time).won);
});

test('the protected service route is playable but costs extra placement strokes',()=>{
  const a=shot(l.START,.42,{x:-13.8,z:2.7}),b=shot(a,.45,{x:-14.3,z:10.2}),d=shot(b,.9,{x:13.3,z:10.2});
  for(const p of [.7,.75,.8,.85]){
    const e=shot(d,p,{x:12.8,z:-8}),f=shot(e,.45,l.CUP);
    assert.ok([a,b,d,e,f].every(s=>!s.fell&&!s.carried),'Service shots stay off the moving hand');
    assert.ok(putt(f).won,'A protected six-shot route must finish');
    assert.ok(!shot(d,1,l.CUP).won,'The final corner cannot be skipped by aiming straight at the cup');
  }
  const e=shot(d,.75,{x:12.8,z:-8});assert.ok(shot(e,.55,l.CUP).won,'A precise final shot can make five');
});

test('near putting remains available on the final green and never crosses a moving hand',()=>{
  assert.ok(puttingContext({x:18,z:-7.5},l));
  assert.equal(puttingContext({x:-2,z:0},{...l,CUP:{x:2,z:0}}),null);
  assert.deepEqual(l.LEVEL.id,6);assert.equal(l.LEVEL.worldFinale,true);
});
