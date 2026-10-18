import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {layout,shot} from '../scripts/probe-mother-tree.mjs';
import {crossTreeEye,eyeMouths,eyeClearance} from '../src/mother-tree.js';
import {trampolineFlight} from '../src/carnival.js';
import {flightPosition} from '../src/bridge.js';
import {puttSpeed} from '../src/putting.js';
import {BALL_RADIUS} from '../src/mechanics.js';

const level=layout.LEVEL,eye=level.treeEye,S=layout.START,C=layout.CUP,mouth={x:level.loop.x,z:level.loop.z};
const putt=b=>shot(b,0,C,0,puttSpeed(Math.hypot(C.x-b.x,C.z-b.z),layout.frictionAt(b.x,b.z)));
const flight=(speed,degrees)=>{
  const a=degrees*Math.PI/180;
  return trampolineFlight({x:level.trampoline.x-.8,z:level.trampoline.z,vx:Math.cos(a)*speed,vz:Math.sin(a)*speed},level.trampoline);
};
function fly(f){
  let passed=false;
  for(let t=1/120;t<=f.duration+1e-9;t+=1/120){
    const hit=crossTreeEye(flightPosition(f,t-1/120),flightPosition(f,t),eye);
    if(hit==='bark')return {bark:true};
    passed ||= hit==='eye';
  }
  const p=flightPosition(f,f.duration);
  return {passed,landed:layout.onCourse(p.x,p.z),x:p.x,z:p.z};
}

test('the carved tunnel and the physics opening are the same hole',async()=>{
  const {createMotherTreeScenery}=await import('../src/mother-tree-visuals.js');
  const scene=new THREE.Scene();createMotherTreeScenery(scene,[]);scene.updateMatrixWorld(true);
  const trunk=scene.getObjectByName('mother-tree-trunk');
  const ray=(dy,dz)=>new THREE.Raycaster(new THREE.Vector3(eye.x-12,eye.y+dy,eye.z+dz),new THREE.Vector3(1,0,0),0,24).intersectObject(trunk,true);
  const clear=eyeClearance(eye)+BALL_RADIUS;
  for(const a of [0,1,2,3,4,5])assert.equal(ray(Math.cos(a)*clear*.98,Math.sin(a)*clear*.98).length,0,'A ball inside the opening never touches wood');
  for(const dz of [eye.radius+.6,-eye.radius-.6])assert.ok(ray(0,dz).length>0,'Beside the eye is solid trunk');
  for(const dy of [eye.radius+.6,-eye.radius-.6])assert.ok(ray(dy,0).length>0,'Above and below the eye is solid trunk');
  const [front,back]=eyeMouths(eye);
  assert.ok(front>eye.x-3.4&&back<eye.x+3.4,'Both mouth planes lie inside the trunk');
});

test('only flights through the eye cross the tree, from any launch angle',()=>{
  for(const speed of [9,12,15,18,21])for(let degrees=-35;degrees<=35;degrees+=2.5){
    const result=fly(flight(speed,degrees));
    if(result.landed)assert.ok(result.passed,`${speed} m/s at ${degrees}° reached the island without the eye`);
  }
  assert.ok(fly(flight(14,0)).passed);
  assert.ok(fly(flight(14,18)).bark,'A wide flight hits the trunk or its vine curtain');
  assert.ok(fly(flight(2,0)).bark,'A weak jump drops into the tunnel wall');
});

test('one tee shot can chain loop, drum and eye: a narrow power window, max power flies past',()=>{
  const results=[];
  for(let p=.5;p<=1.0001;p+=.025)results.push([+p.toFixed(3),shot(S,p,mouth)]);
  const success=results.filter(([,r])=>r.looped&&r.eye&&!r.fell);
  assert.ok(success.length>=3&&success.length<=6,`${success.length} successful powers`);
  for(const [p,r] of success){assert.ok(p>=.75&&p<=.9,`window at ${p}`);assert.ok(layout.onCourse(r.x,r.z)&&r.x>15)}
  assert.ok(results.filter(([p])=>p<=.7).every(([,r])=>r.rolledBack&&!r.fell),'Too little speed rolls back out of the loop');
  assert.ok(results.find(([p])=>p===1)[1].fell,'Max power overshoots the crown island');
  assert.ok(shot({x:-5,z:-3.2},.2,{x:5,z:-3.2}).bark,'A soft drum shot from the runway hits the tree');
});

test('the set piece gives birdie, the guarded Barkstigen is a safe bogey without the drum',()=>{
  let b=shot(S,.825,mouth);assert.ok(b.eye&&!b.fell);
  b=shot(b,.4,C);assert.ok(b.won||putt(b).won,'Chain, approach and putt: three strokes');
  b=shot(S,1,{x:-12,z:5.3});assert.ok(!b.fell&&!b.loop&&b.z>3.8);
  b=shot(b,.8,{x:17.5,z:5.3});assert.ok(!b.fell&&b.x>16);
  b=shot(b,.45,{x:17.5,z:-3});assert.ok(!b.fell&&b.z<1.5,'Up into the island from the path');
  b=shot(b,.4,C);assert.ok(!b.fell&&!b.drum);
  assert.ok(putt(b).won,'Five strokes on the safe route');
});
