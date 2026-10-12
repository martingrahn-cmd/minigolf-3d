import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {layout as l,shot} from '../scripts/probe-clock-wheel.mjs';
import {wheelApertures,wheelClearance,wheelSignal,collideClockWheel} from '../src/clock-wheel.js';
import {createClockWheelVisuals} from '../src/clock-wheel-visuals.js';
import {puttingContext,puttSpeed} from '../src/putting.js';
const c=l.LEVEL.clockWheel,period=2*Math.PI/(c.windows*c.speed);

test('the visible holes, rotating wheel and clearance share the same transform throughout a cycle',()=>{
  const scene=new THREE.Scene(),v=createClockWheelVisuals(scene,c),ray=new THREE.Raycaster();
  for(let t=0;t<period;t+=.13){
    v.update(t);scene.updateMatrixWorld(true);
    const holes=wheelApertures(t,c);
    v.holes.forEach((p,i)=>{
      const world=v.rotor.localToWorld(new THREE.Vector3(p.x,p.y,0));
      assert.ok(world.distanceTo(new THREE.Vector3(c.x,holes[i].y,holes[i].z))<1e-8);
      ray.set(new THREE.Vector3(c.x-3,world.y,world.z),new THREE.Vector3(1,0,0));
      assert.equal(ray.intersectObject(v.plate).length,0,'Each aperture is a real hole in the plate');
    });
    if(wheelSignal(t,c)==='green')assert.ok(wheelClearance(0,t,c)>.46);
    if(wheelClearance(0,t,c)>.32){
      for(let i=0;i<16;i++){
        const a=i*Math.PI/8;ray.set(new THREE.Vector3(c.x-3,.35+Math.sin(a)*.31,Math.cos(a)*.31),new THREE.Vector3(1,0,0));
        assert.equal(ray.intersectObject(v.plate).length,0,'The entire ball fits through the visible opening');
      }
    }
  }
});

test('a closed wheel blocks maximum-speed and swept shots in both directions without repeated rebounds',()=>{
  const closed=period/2;
  assert.ok(wheelClearance(0,closed,c)<0);
  for(const sign of [-1,1]){
    const previous={x:c.x-sign,z:0},b={x:c.x+sign,z:0,vx:sign*26.5,vz:0};
    assert.equal(collideClockWheel(b,previous,closed,c),true);
    assert.ok(b.vx*sign<0);assert.ok((b.x-c.x)*sign<0);
    const next={...b,x:b.x+b.vx/120};
    assert.equal(collideClockWheel(next,b,closed,c),false,'One collision must let the ball travel away');
  }
  const resting={x:c.x-.1,z:0,vx:0,vz:0};
  assert.equal(collideClockWheel(resting,{...resting},closed,c),true);
  assert.ok(resting.x<c.x-.5&&resting.vx<0,'A closing lip clears a resting ball');
  const edge={x:c.x-.1,z:1.0,vx:20,vz:0};
  assert.equal(collideClockWheel(edge,{x:c.x-1,z:1},0,c),true,'A misaligned shot cannot pass beside the opening');
});

test('the fifth hole rewards timing, while misses rebound onto protected turf',()=>{
  const results=Array.from({length:132},(_,i)=>shot(l.START,1,{x:0,z:0},i*period/132));
  const passes=results.filter(b=>b.hits===0&&b.x>0);
  assert.ok(passes.length>=24&&passes.length<=42,'A direct opening has a meaningful but learnable timing window');
  assert.ok(results.every(b=>!b.fell&&!b.timedOut&&b.hits<4));
  assert.ok(results.some(b=>b.hits&&b.x<-5));
  assert.ok(l.BOUNDARIES.every(e=>!e.open));
  const a=shot(l.START,.6,{x:0,z:0});
  assert.ok(a.x<-5&&a.hits===0,'The setup shot stops safely before the wheel');
});

test('a setup, timed bank, approach and near putt make par four; a direct tee shot can save one',()=>{
  const setup=shot(l.START,.6,{x:0,z:0}),through=shot(setup,.9,{x:10,z:0},0);
  assert.equal(through.hits,0);assert.ok(through.z<-6);
  for(const power of [.3,.35,.4,.45]){
    const approach=shot(through,power,l.CUP),ctx=puttingContext(approach,l);
    assert.ok(ctx&&!approach.fell);
    assert.ok(shot(approach,0,l.CUP,0,puttSpeed(Math.round(ctx.distance*10)/10,ctx.friction)).won);
  }
  // A few percent of power variation must not turn the final corner into a snag.
  for(const p of [.58,.6,.62])for(const q of [.88,.9,.92])for(const r of [.35,.4,.45]){
    const a=shot(l.START,p,{x:0,z:0}),b=shot(a,q,{x:10,z:0},0),d=shot(b,r,l.CUP),ctx=puttingContext(d,l);
    assert.ok(ctx&&!d.fell);assert.ok(shot(d,0,l.CUP,0,puttSpeed(Math.round(ctx.distance*10)/10,ctx.friction)).won);
  }
  const direct=shot(l.START,1,{x:0,z:0},5);
  assert.equal(direct.hits,0);
  for(const power of [.9,.95]){
    const approach=shot(direct,power,{x:10.5,z:-7.5}),ctx=puttingContext(approach,l);
    assert.ok(ctx&&!approach.fell);
    assert.ok(shot(approach,0,l.CUP,0,puttSpeed(Math.round(ctx.distance*10)/10,ctx.friction)).won);
  }
});

test('the bell bumpers give real kicks and putting assistance never crosses the wheel',()=>{
  const b=shot({x:1,z:-2.3},.2,{x:4,z:-2.3});
  assert.ok(b.bells>0&&b.x<4);
  const fakeCup={...l,CUP:{x:c.x+2,z:0}};
  assert.equal(puttingContext({x:c.x-2,z:0},fakeCup),null);
  assert.ok(puttingContext({x:16,z:-10.2},l));
});
