import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {layout,shot} from '../scripts/probe-clockwork.mjs';
import {gatePose} from '../src/gates.js';
import {createClockGates} from '../src/clockwork.js';
import {puttingContext} from '../src/putting.js';

test('the brass gate and its counterweights move opposite ways on the physical gate cycle',()=>{
  const scene=new THREE.Scene(),[visual]=createClockGates(scene,layout.LEVEL.gates),gate=layout.LEVEL.gates[0];
  for(let t=0;t<9;t+=.1){
    visual.update(t);
    const height=gatePose(t,gate).height;
    assert.ok(Math.abs(scene.getObjectByName('clock-gate-panel').position.y-height)<1e-8);
    for(const side of [-1,1])assert.ok(Math.abs(scene.getObjectByName(`clock-counterweight-${side}`).position.y-(2.15-height))<1e-8);
  }
});

test('Gökporten has a forgiving three-shot route and a precise two-shot opportunity',()=>{
  const b=shot(layout.START,.9,{x:8,z:0},2.5);
  assert.ok(!b.fell&&b.hits===0&&b.x>4);
  const approach=shot(b,.4,layout.CUP,b.time);
  assert.ok(!approach.won&&!approach.fell&&puttingContext(approach,layout),'The approach must enable easy putting');
  assert.ok(shot(b,.55,layout.CUP,b.time).won);
});

test('the first hole has protected edges, a broad open cycle and real closed-gate collisions',()=>{
  const results=Array.from({length:86},(_,i)=>shot(layout.START,.9,{x:8,z:0},i/10));
  assert.ok(results.filter(b=>b.hits===0&&b.x>1.5).length>45,'More than half of launch phases are safe for an introductory hole');
  assert.ok(results.some(b=>b.hits>0&&b.x<-4.2));
  assert.ok(results.every(b=>!b.fell));
  assert.ok(layout.BOUNDARIES.every(e=>!e.open));
});
