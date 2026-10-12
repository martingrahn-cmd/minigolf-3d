import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {layout,shot} from '../scripts/probe-crown.mjs';
import {trapdoorPose,trapdoorAt,supportedByTrapdoors} from '../src/trapdoors.js';
import {createTrapdoors,createThornSpinner} from '../src/crown.js';
import {collideSpinner} from '../src/mechanics.js';
const doors=layout.LEVEL.trapdoors,dt=1/120;

test('trapdoor hinges, support and warning lamps share the exact cycle',()=>{
 const scene=new THREE.Scene(),visual=createTrapdoors(scene,doors),tip=new THREE.Vector3();
 for(let t=0;t<14;t+=.073){
  visual.update(t);scene.updateMatrixWorld(true);
  for(const [i,d] of doors.entries()){
   const pose=trapdoorPose(t,d),x=(d.x1+d.x2)/2;
   assert.equal(supportedByTrapdoors(x,d.z,t,doors),pose.supported);
   if(pose.signal==='green'||pose.signal==='amber')assert.ok(pose.supported);
   for(const side of [-1,1]){
    const mesh=scene.getObjectByName(`root-flap-${i}-${side}`);
    tip.set(0,0,-side*d.halfWidth).applyMatrix4(mesh.matrixWorld);
    assert.ok(Math.abs(tip.y-(.04-d.halfWidth*Math.sin(pose.angle)))<1e-7,'Panels must fold down into the gap');
   }
  }
 }
 assert.equal(trapdoorAt(-16,0,doors),undefined);
 assert.equal(supportedByTrapdoors(-16,0,4,doors),true);
 assert.equal(supportedByTrapdoors(-13,0,4,doors),false,'A stopped ball loses support when the door opens');
});

test('a strong straight opening still needs timing, and no wide line bypasses the root doors',()=>{
 for(const power of [.7,.8,.9,1]){
  const results=Array.from({length:68},(_,i)=>shot(layout.START,power,{x:0,z:0},i*.1));
  const safe=results.filter(b=>!b.fell&&b.x>-4.2).length;
  assert.ok(safe>=20&&safe<=32,`${power}: ${safe} safe phases`);
  assert.ok(results.some(b=>b.fell));
 }
 for(const degrees of [-10,-6,6,10])for(let t=0;t<6.8;t+=.2){
  const b=shot(layout.START,1,{x:0,z:Math.tan(degrees*Math.PI/180)*21.5},t);
  assert.ok(b.fell||b.x<-4.2,'Shots outside the bridge cannot use invisible ground');
 }
});

test('the thorn passage has a learnable timing window and a mistimed shot risks a side fall',()=>{
 const from={x:1.88,z:-9.7};
 for(const power of [.8,.9,1]){
  const results=Array.from({length:96},(_,i)=>shot(from,power,{x:20,z:from.z},i*.08));
  const safe=results.filter(b=>!b.fell&&b.x>14).length;
  assert.ok(safe>=12&&safe<=30,`${power}: ${safe} safe phases`);
  assert.ok(results.filter(b=>b.fell&&b.hits>0).length>25);
 }
 const parked={x:layout.SPINNER.x+.9,z:layout.SPINNER.z-.1,vx:0,vz:0};
 assert.ok(collideSpinner(parked,0,layout.SPINNER));
 assert.ok(Math.hypot(parked.vx,parked.vz)>0,'The live wheel also hits stationary balls');
 const group=new THREE.Group();createThornSpinner(group,layout.SPINNER);
 assert.equal(group.children.filter(o=>o.name.startsWith('thorn-arm-')).length,2,'Only the two physical arms are rendered');
});

test('a well placed opening can earn birdie, and a placement stroke gives a five-stroke route',()=>{
 let b=shot(layout.START,.8,{x:0,z:0},1.5);assert.ok(!b.fell);
 b=shot(b,.65,{x:b.x,z:-12},b.time);assert.ok(!b.fell);
 b=shot(b,.9,{x:20,z:b.z},b.time+1.6);assert.ok(!b.fell&&b.hits===0&&b.x>14);
 b=shot(b,.4,layout.CUP,b.time);assert.ok(b.won,JSON.stringify(b));
 b=shot(layout.START,.73,{x:0,z:0},1.5);
 b=shot(b,.07,{x:4,z:0},b.time);
 b=shot(b,.65,{x:b.x,z:-12},b.time);
 b=shot(b,.9,{x:20,z:b.z},b.time);assert.ok(!b.fell&&b.hits===0&&b.x>14);
 b=shot(b,.4,layout.CUP,b.time);assert.ok(b.won,JSON.stringify(b));
});
