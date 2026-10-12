import test from 'node:test';
import assert from 'node:assert/strict';
import {layout as l,shot} from '../scripts/probe-funnel.mjs';
import {funnelSurface,entersFunnel,createFunnelTrack,startFunnelRide,sampleFunnelRide} from '../src/funnel.js';
import {puttingContext,puttSpeed} from '../src/putting.js';

const f=l.LEVEL.funnel;

test('the funnel joins the tee flush and gravity points down the actual bowl in both axes',()=>{
  for(let a=0;a<Math.PI*2;a+=.3){
    const edge={x:f.x+Math.cos(a)*f.radius,z:f.z+Math.sin(a)*f.radius};
    assert.ok(Math.abs(l.heightAt(edge.x,edge.z)-f.y)<1e-8);
    for(const r of [.65,1,1.6,2]){
      const x=f.x+Math.cos(a)*r,z=f.z+Math.sin(a)*r,eps=1e-5;
      const sx=(l.heightAt(x+eps,z)-l.heightAt(x-eps,z))/(2*eps);
      const sz=(l.heightAt(x,z+eps)-l.heightAt(x,z-eps))/(2*eps);
      assert.ok(Math.abs(sx-l.heightSlope(x,z))<1e-7);
      assert.ok(Math.abs(sz-l.heightSlopeZ(x,z))<1e-7);
      assert.ok((x-f.x)*sx+(z-f.z)*sz>0,'Gravity must lead inward');
    }
  }
  assert.equal(l.heightAt(f.x,f.z),-f.depth);
  assert.equal(funnelSurface(-18,0,f),null);
});

test('only the throat captures; fast swept crossings cannot tunnel past it',()=>{
  assert.equal(entersFunnel({x:f.x-1,z:0},{x:f.x+1,z:0},f),true);
  assert.equal(entersFunnel({x:f.x-1,z:.9},{x:f.x+1,z:.9},f),false);
  assert.equal(entersFunnel({x:-4,z:-5},{x:0,z:0},f),false,'No capture by touching the outside of the glass tube');
  assert.equal(entersFunnel({x:0,z:0},{x:1,z:0}),false);
});

test('delivery stays continuous, follows the glass centerline, and exits onto the upper deck',()=>{
  const track=createFunnelTrack(f),ride=startFunnelRide({x:f.x-.45,z:.04,vx:9,vz:.3},f);
  let last=sampleFunnelRide(ride,track).position;
  assert.equal(last.distanceTo(ride.entry),0);
  for(let time=1/120;time<6;time+=1/120){
    ride.time=time;const sample=sampleFunnelRide(ride,track);
    assert.ok(sample.position.distanceTo(last)<.08,'No teleport at inlet, bends or outlet');
    if(time>=.32)assert.ok(sample.position.distanceTo(track.curve.getPointAt(sample.progress))<1e-9);
    last=sample.position;
  }
  assert.ok(l.onCourse(last.x,last.z));
  assert.ok(Math.abs(last.y-l.heightAt(last.x,last.z)-.35)<1e-8);
  assert.ok(track.direction.x>.99);
  assert.ok(!l.onCourse(-5,0),'The two decks must have an actual gap');
});

test('moderate off-centre shots are caught; excess power can overshoot the bowl',()=>{
  for(const degrees of [-12,-6,0,6,12]){
    const a=degrees*Math.PI/180,b=shot(l.START,.45,{x:l.START.x+10*Math.cos(a),z:10*Math.sin(a)});
    assert.equal(b.deliveries,1);assert.ok(!b.fell&&!b.timedOut);
    assert.ok(b.x>0&&b.x<5&&Math.abs(b.z)<.1,'All deliveries stop on the staging deck');
  }
  assert.equal(shot(l.START,.2,f).deliveries,0,'A weak shot must not be sucked in from afar');
  const a=5*Math.PI/180;
  assert.equal(shot(l.START,1,{x:l.START.x+10*Math.cos(a),z:10*Math.sin(a)}).deliveries,0,'A hard glancing shot can pass across the funnel');
  for(const speed of [0,10,1000]){
    const ride=startFunnelRide({x:f.x,z:f.z,vx:speed,vz:0},f);
    assert.ok(ride.exitSpeed>=3.5&&ride.exitSpeed<=6.2);
  }
});

test('Rörposten has a three-shot par route with easy putting and a precise bank-shot birdie',()=>{
  const tee=shot(l.START,.45,f),approach=shot(tee,.8,{x:18,z:0});
  assert.ok(!approach.won&&!approach.fell&&approach.bankHits===1);
  const putt=puttingContext(approach,l);assert.ok(putt);
  assert.ok(shot(approach,0,l.CUP,puttSpeed(Math.round(putt.distance*10)/10,putt.friction)).won);
  assert.ok(shot(tee,1,{x:18,z:0}).won);
  assert.equal(puttingContext(tee,l),null,'The upper terrace is not a flat short putt');
});
