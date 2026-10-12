import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LEVELS} from '../src/levels.js';
import {createFunnelTrack} from '../src/funnel.js';
import {createTubeCameraRail,tubeCameraPose,tubeCameraBlend} from '../src/tube-camera.js';

test('the chasing camera follows the inside of the tube without cutting bends or overtaking the ball',()=>{
  const track=createFunnelTrack(LEVELS.find(l=>l.id===2).funnel),rail=createTubeCameraRail(track);
  let previous=tubeCameraPose(rail,0);
  for(let i=1;i<=600;i++){
    const p=i/600,pose=tubeCameraPose(rail,p),distance=p*rail.length-pose.lag;
    assert.ok(pose.position.distanceTo(previous.position)<.12);
    assert.ok(pose.up.dot(previous.up)>.995,'No abrupt roll flip through the vertical shaft');
    assert.ok(Math.abs(pose.up.length()-1)<1e-8);
    if(distance>=0)assert.ok(pose.position.distanceTo(track.curve.getPointAt(distance/rail.length))<1e-8);
    assert.ok(pose.lag>=1.4&&pose.lag<=2.8);
    previous=pose;
  }
  assert.ok(previous.up.dot(new THREE.Vector3(0,1,0))>.98,'Exit returns upright');
  assert.equal(tubeCameraBlend(0),0);assert.equal(tubeCameraBlend(1),1);
});
