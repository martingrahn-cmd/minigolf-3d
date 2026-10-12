import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {layout as l,shot} from '../scripts/probe-bell-bridge.mjs';
import {createBellBridgeState,stepBellBridge,bellBridgePose,collideBellBridge,restoreBellBridge,strikeBell} from '../src/bell-bridge.js';
import {createBellBridgeVisuals} from '../src/bell-bridge-visuals.js';
import {puttingContext,puttSpeed} from '../src/putting.js';

test('the bridge deck, counterweights and safety barriers share one opening state',()=>{
  const scene=new THREE.Scene(),config=l.LEVEL.bellBridge,visual=createBellBridgeVisuals(scene,config),s=createBellBridgeState();s.open=true;
  for(let t=0;t<2;t+=.025){
    stepBellBridge(s,.025,config);visual.update(s,t);scene.updateMatrixWorld(true);
    const pose=bellBridgePose(s,config),end=new THREE.Vector3(config.x2-config.x1,0,0).applyMatrix4(visual.deck.matrixWorld);
    assert.ok(Math.abs(end.y-(.04+Math.sin(pose.angle)*7))<1e-8);
    assert.ok(Math.abs(end.x-7*Math.cos(pose.angle))<1e-8);
    assert.equal(scene.getObjectByName('klangbron-barrier-0').position.y,pose.ready?-.65:0);
    const b={x:-.2,z:0,vx:26.5,vz:0};assert.equal(collideBellBridge(b,s,config),!pose.ready);
  }
  assert.equal(s.progress,1);
  assert.ok(Math.abs(scene.getObjectByName('klangbron-button').position.y+.4)<1e-8);
});

test('a straight maximum shot cannot pass the closed bridge; the bell is a real choice',()=>{
  const b=shot(l.START,1,{x:15,z:0});
  assert.equal(b.rings,0);assert.ok(b.blocked>0&&b.x<0&&!b.fell);
  const s=createBellBridgeState(),bell=shot(l.START,.5,l.LEVEL.bellBridge.switch,s);
  assert.equal(bell.rings,1);assert.equal(s.open,true);
  assert.equal(s.progress,1);
  const ball={x:-8.5,z:-2.1,vx:5,vz:0};
  assert.equal(strikeBell(ball,s,l.LEVEL.bellBridge),false);
  assert.equal(ball.vx,5,'The pressed button must stay flush and let subsequent shots roll over it');
});

test('the shortcut can earn birdie, has a comfortable par route, and has real fall risk',()=>{
  const s=createBellBridgeState(),b=shot(l.START,.5,l.LEVEL.bellBridge.switch,s);
  const c=shot(b,.9,l.CUP,s),putt=puttingContext(c,l);
  assert.ok(putt&&!c.fell&&!c.won);
  assert.ok(shot(c,0,l.CUP,s,puttSpeed(Math.round(putt.distance*10)/10,putt.friction)).won);
  assert.ok(shot(b,1,l.CUP,s).won);
  const a=Math.atan2(l.CUP.z-b.z,l.CUP.x-b.x)+10*Math.PI/180;
  assert.equal(shot(b,.9,{x:b.x+30*Math.cos(a),z:b.z+30*Math.sin(a)},s).fell,true);
  assert.ok(l.BOUNDARIES.filter(e=>e.open).every(e=>e.ax>=0&&e.bx<=7),'Only the short bridge has unguarded sides');
});

test('the protected route takes four controlled strokes without ever hitting the bell',()=>{
  const s=createBellBridgeState();
  const a=shot(l.START,.68,{x:-9.5,z:8.5},s),b=shot(a,.88,{x:22,z:8.5},s),c=shot(b,.7,{x:22,z:-3.5},s);
  assert.ok([a,b,c].every(p=>!p.fell&&p.rings===0));assert.equal(s.open,false);
  for(const power of [.55,.575,.60,.625])assert.ok(shot(c,power,l.CUP,s).won);
  assert.ok(l.onCourse(22,4)&&!l.onCourse(14,5),'The guarded route must go around the back of the green');
});

test('ordinary opening and transport shots cannot leave an easy direct third stroke on the bypass',()=>{
  for(const first of [.62,.66,.68,.72,.76])for(const second of [.75,.8,.85,.9,.95,1]){
    const s=createBellBridgeState(),a=shot(l.START,first,{x:-9.5,z:8.5},s);
    const b=shot(a,second,{x:22,z:8.5},s);
    assert.ok(!a.fell&&!b.fell&&!s.open);
    assert.equal(puttingContext(b,l),null);
    for(const third of [.3,.4,.5,.6,.7,.8,.9,1]){
      const c=shot(b,third,l.CUP,s);
      assert.ok(!c.won&&!c.fell,'The visible bend blocks the direct third shot without causing a fall');
    }
  }
});

test('a failed shot restores the bell state from before that shot, while prior progress persists',()=>{
  const s=createBellBridgeState();s.open=true;s.progress=.7;restoreBellBridge(s);
  assert.deepEqual(s,createBellBridgeState());
  s.savedOpen=true;s.open=true;s.progress=.7;s.ring=1;restoreBellBridge(s);
  assert.equal(s.open,true);assert.equal(s.progress,1);assert.equal(s.ring,0);
});
