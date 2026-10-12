import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {layout as l,shot} from '../scripts/probe-lift.mjs';
import {createLiftState,onLift,liftPose,tryBoardLift,stepLift,liftBarriers,restoreLift} from '../src/lift.js';
import {createLiftVisuals} from '../src/lift-visuals.js';
import {collideWalls} from '../src/mechanics.js';
import {puttingContext,puttSpeed} from '../src/putting.js';
const c=l.LEVEL.lift;

test('the ball, cage, opposite counterweights and doors share a continuous lift ride',()=>{
  const scene=new THREE.Scene(),v=createLiftVisuals(scene,c),s=createLiftState(),ball={x:-7.1,z:.5,vx:0,vz:0};
  for(let i=0;i<35;i++)tryBoardLift(ball,s,c,1/120);
  assert.equal(s.mode,'riding');let lastY=c.bottom,arrivals=0;
  for(let t=0;t<6;t+=1/120){
    if(stepLift(ball,s,c,1/120))arrivals++;
    const p=liftPose(s,c);v.update(s);scene.updateMatrixWorld(true);
    assert.equal(v.cage.position.y,p.y);
    assert.equal(l.heightAt(ball.x,ball.z,undefined,p.y),p.y);
    assert.ok(p.y-lastY>=0&&p.y-lastY<.02);lastY=p.y;
    assert.ok(Math.abs(v.weights[0].position.y+p.y-(c.top+1+c.bottom))<1e-8);
    assert.equal(ball.x,-7.1);assert.equal(ball.z,.5,'Boarding position is preserved during the ride');
    if(p.y<c.top)assert.equal(p.exit,0,'Do not open onto an unequal landing height');
  }
  assert.equal(arrivals,1);assert.equal(s.mode,'top');assert.equal(ball.vx,c.exitSpeed);
  assert.equal(l.heightAt(c.x1,0),c.bottom);assert.equal(l.heightAt(c.x2,0),c.top);
});

test('boarding needs a stopped ball inside the cage; doors block fast attempts at the height seam',()=>{
  for(const b of [{x:-10,z:0,vx:0,vz:0},{x:-7,z:1.7,vx:0,vz:0},{x:-7,z:0,vx:4,vz:0}]){
    const s=createLiftState();for(let i=0;i<100;i++)tryBoardLift(b,s,c,1/120);assert.equal(s.mode,'bottom');
  }
  for(const mode of ['bottom','top']){
    const s={...createLiftState(),mode},b={x:mode==='top'?c.x1+.1:c.x2-.1,z:0,vx:mode==='top'?-26.5:26.5,vz:0};
    assert.ok(collideWalls(b,liftBarriers(s,c),[]));assert.ok(mode==='top'?b.vx>0:b.vx<0);
    assert.equal(liftPose(s,c).entry,mode==='top'?0:1);
  }
  for(const power of [.55,.6,.65,.7,.8]){
    const s=createLiftState(),b=shot(l.START,power,{x:-7,z:0},s);
    assert.equal(b.rides,1);assert.equal(s.mode,'top');assert.ok(b.x>c.x2&&b.x<3&&!b.fell&&!b.timedOut);
  }
  assert.equal(shot(l.START,1,{x:-7,z:0}).rides,0);
});

test('a controlled descent stops before the drop, while a straight maximum shot falls',()=>{
  const s=createLiftState(),a=shot(l.START,.65,{x:-7,z:0},s);
  for(const power of [.55,.6,.7,.8,.9]){const b=shot(a,power,{x:22,z:0},s);assert.ok(!b.fell&&b.x>13&&b.x<22)}
  assert.equal(shot(a,1,{x:22,z:0},s).fell,true);
  assert.equal(l.heightAt(3,0),c.top);assert.ok(Math.abs(l.heightAt(13,0)-.6)<1e-8);
  for(const x of [4,7,11]){const eps=1e-5;assert.ok(Math.abs((l.heightAt(x+eps,0)-l.heightAt(x-eps,0))/(2*eps)-l.heightSlope(x,0))<1e-8)}
  assert.equal(puttingContext(a,l),null);
});

test('Lodverket has a forgiving four-shot route and a precise three-shot bank route',()=>{
  const s=createLiftState(),a=shot(l.START,.65,{x:-7,z:0},s),b=shot(a,.6,{x:22,z:0},s);
  for(const power of [.55,.6,.65,.7]){
    const approach=shot(b,power,{x:15,z:-10},s),putt=puttingContext(approach,l);
    assert.ok(putt&&!approach.fell&&!approach.won);
    assert.ok(shot(approach,0,l.CUP,s,puttSpeed(Math.round(putt.distance*10)/10,putt.friction)).won);
  }
  const placed=shot(a,.72,{x:22,z:0},s);
  assert.ok(shot(placed,.93,{x:7.82,z:-12.85},s).won);
});

test('a fall restores the correct lift landing and a new round starts at the lower floor',()=>{
  const s=createLiftState();s.mode='top';restoreLift(s);assert.equal(s.mode,'bottom');
  s.savedTop=true;s.mode='riding';s.time=2;restoreLift(s);
  assert.equal(s.mode,'top');assert.equal(liftPose(s,c).y,c.top);assert.equal(liftPose(s,c).entry,0);
  assert.equal(onLift(-7,0,c),true);assert.equal(onLift(-7,3,c),false);
  const fresh=createLiftState();assert.equal(liftPose(fresh,c).y,c.bottom);
});
