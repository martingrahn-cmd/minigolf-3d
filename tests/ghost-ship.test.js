import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayout, LEVELS } from '../src/layout.js';
import { ROUND } from '../src/round.js';
import { onBridge, stepBridge, leavesBridge, bridgeFlight, flightPosition } from '../src/bridge.js';
import { trapdoorAt, trapdoorPose } from '../src/trapdoors.js';
import { collideWalls, shotSpeed } from '../src/mechanics.js';

const level=LEVELS.find(l=>l.name==='Spökskeppet'),layout=createLayout(level),bridge=level.bridge,dt=1/120;
const onDeck=p=>p.x>=5&&p.x<=13&&Math.abs(p.z)<=4.5;

// The tee shot up the gangplank, with the same rolling model as the seesaw tests.
function launch(power){
  const ball={...layout.START,vx:shotSpeed(power),vz:0,phase:'moving'};
  let angle=bridge.maxAngle;
  for(let i=0;i<14/dt;i++){
    angle=stepBridge(angle,ball,bridge,dt);
    const friction=Math.exp(-(onBridge(ball.x,ball.z,bridge)?.38:layout.frictionAt(ball.x,ball.z))*dt);
    ball.vx=(ball.vx-layout.heightSlope(ball.x,ball.z,angle)*6.9*dt)*friction;
    const previous={...ball};ball.x+=ball.vx*dt;
    if(leavesBridge(previous,ball,bridge)){const flight=bridgeFlight(ball,bridge,angle);return flightPosition(flight,flight.duration)}
    collideWalls(ball,layout.BOUNDARIES,layout.POST_COLLIDERS);
    if(Math.abs(ball.vx)<.05)return null;
  }
  return null;
}

test('Spökskeppet is Spökhamnen\'s finale and combines the gangplank with rotten planks',()=>{
  const slot=ROUND.find(s=>s.level===level);
  assert.equal(slot.hole,24);assert.ok(slot.finale&&level.worldFinale);
  assert.ok(level.bridge,'Spökplankan\'s gangplank');assert.equal(level.trapdoors.length,3,'Three rotten planks');
});

test('a firm launch up the gangplank lands on the main deck; too soft never flies, full power runs on to the planks',()=>{
  assert.equal(launch(.6),null,'A soft shot rolls back down the plank');
  const short=launch(.75);assert.ok(short&&!layout.onCourse(short.x,short.z),'Just too soft drops into the water before the bow');
  for(const p of [.82,.86,.9,.94].map(launch))assert.ok(p&&onDeck(p)&&layout.onCourse(p.x,p.z),`lands on deck: ${JSON.stringify(p)}`);
  // Full power lands at the far end of the deck and rolls straight on towards the rotten planks.
  const full=launch(1);assert.ok(full&&full.x>12&&full.x<13,`full power: ${full?.x}`);
});

test('the rotten planks cover the whole corridor and fall open in a wave, with a window to cross',()=>{
  for(let x=13.05;x<22;x+=.25)assert.ok(trapdoorAt(x,0,level.trapdoors),`plank under x=${x}`);
  assert.ok(!trapdoorAt(12.9,0,level.trapdoors)&&!trapdoorAt(22.05,0,level.trapdoors));
  const door=level.trapdoors[0],period=door.closed+door.opened+2*door.travel;
  let open=0,allHold=0,best=0,run=0;
  for(let t=0;t<period;t+=.01){
    const poses=level.trapdoors.map(d=>trapdoorPose(t,d));
    if(!poses[0].supported)open++;
    if(poses.every(p=>p.supported)){allHold++;run+=.01;best=Math.max(best,run)}else run=0;
  }
  assert.ok(open*.01>1.5,'Each plank is open for a good while');
  assert.ok(best>=1,`All three hold together for ${best.toFixed(2)} s at a time`);
  // The wave: each plank starts to give way 0.7 s after the one before.
  const opens=d=>{for(let t=.01;t<period*2;t+=.01)if(trapdoorPose(t-.01,d).supported&&!trapdoorPose(t,d).supported)return t;return null};
  const [a,b,c]=level.trapdoors.map(opens);
  assert.ok(Math.abs(b-a-.7)<.03&&Math.abs(c-b-.7)<.03,`${a} ${b} ${c}`);
});

test('rails line the corridor, and the long way round never crosses a rotten plank',()=>{
  const corridorEdges=layout.BOUNDARIES.filter(e=>Math.abs(Math.abs(e.az)-1.2)<1e-6&&Math.abs(e.az-e.bz)<1e-6&&Math.min(e.ax,e.bx)>=13&&Math.max(e.ax,e.bx)<=22);
  assert.ok(corridorEdges.length>=2&&corridorEdges.every(e=>!e.open),'The corridor has rails on both sides');
  for(const [x,z] of [[-12,6.4],[0,6.4],[11,6],[11,-1],[11,-6],[17,-6],[24,-6],[26,-3],[level.cup.x,level.cup.z]]){
    assert.ok(layout.onCourse(x,z),`(${x},${z}) is on the course`);
    assert.ok(!trapdoorAt(x,z,level.trapdoors),`(${x},${z}) is solid deck`);
  }
});
