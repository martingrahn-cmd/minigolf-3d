import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayout, LEVELS } from '../src/layout.js';
import { onBridge, bridgeHeight, stepBridge, leavesBridge, bridgeFlight, flightPosition } from '../src/bridge.js';
import { collideWalls, collideBumper, shotSpeed } from '../src/mechanics.js';
const layout=createLayout(LEVELS.find(l=>l.id===11)),bridge=layout.LEVEL.bridge,dt=1/120;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`);

test('seesaw shares its slope with the playing surface and holds for aiming',()=>{
  near(bridgeHeight(bridge.x1,bridge),0);
  near(bridgeHeight(bridge.x2,bridge,-bridge.maxAngle),0);
  const ball={x:-2,z:0,phase:'moving'};
  let angle=bridge.maxAngle;
  for(let i=0;i<120;i++)angle=stepBridge(angle,ball,bridge,dt);
  assert.ok(angle<-.1);
  near(layout.heightAt(-2,0,angle),bridgeHeight(-2,bridge,angle));
  near((layout.heightAt(-2+.001,0,angle)-layout.heightAt(-2-.001,0,angle))/.002,layout.heightSlope(-2,0,angle));
  near(stepBridge(angle,{...ball,phase:'idle'},bridge,dt),angle);
  near(layout.heightAt(-8,6.4),0);
});

function playBridge(power){
  const ball={...layout.START,vx:shotSpeed(power),vz:0,phase:'moving'};
  let angle=bridge.maxAngle;
  for(let i=0;i<14/dt;i++){
    angle=stepBridge(angle,ball,bridge,dt);
    const friction=Math.exp(-(onBridge(ball.x,ball.z,bridge)?.38:1.35)*dt);
    ball.vx=(ball.vx-layout.heightSlope(ball.x,ball.z,angle)*6.9*dt)*friction;
    const previous={...ball};ball.x+=ball.vx*dt;
    if(leavesBridge(previous,ball,bridge)){
      const flight=bridgeFlight(ball,bridge,angle);
      return {ball,flight,landing:flightPosition(flight,flight.duration)};
    }
    collideWalls(ball,layout.BOUNDARIES,layout.POST_COLLIDERS);
    assert.ok(layout.onCourse(ball.x,ball.z));
  }
  return {ball};
}
test('a powerful opening shot clears the gap; launch range comes from actual speed',()=>{
  const shot=playBridge(.98);
  assert.ok(shot.flight,'Opening shot must reach the spring tip');
  assert.ok(shot.landing.x>=5&&shot.landing.x<=19.5,`Landing outside green: ${shot.landing.x}`);
  assert.ok(layout.onCourse(shot.landing.x,shot.landing.z));near(shot.landing.y,0);
  const weak=bridgeFlight({x:2.01,z:0,vx:1,vz:0},bridge,-bridge.maxAngle);
  const landing=flightPosition(weak,weak.duration);
  assert.equal(layout.onCourse(landing.x,landing.z),false);
  assert.equal(leavesBridge({x:1.9,z:0},{x:2.1,z:0,vx:-2},bridge),false);
});
test('bypass is connected and protected; top-speed bank shots stay inside',()=>{
  for(const [a,b] of [[[-18,0],[-12,0]],[[-12,0],[-12,6.4]],[[-12,6.4],[12,6.4]],[[12,6.4],[12,0]],[[12,0],[17.5,0]]]){
    for(let i=0;i<=100;i++){
      const t=i/100,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
      assert.ok(layout.onCourse(x,z));
      const ball={x,z,vx:1,vz:1};collideWalls(ball,layout.BOUNDARIES,layout.POST_COLLIDERS);
      near(ball.x,x);near(ball.z,z);
    }
  }
  for(let i=0;i<36;i++){
    const a=i*Math.PI/18,ball={x:12,z:0,vx:Math.cos(a)*shotSpeed(1),vz:Math.sin(a)*shotSpeed(1)};
    for(let j=0;j<120;j++){
      ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;
      collideWalls(ball,layout.BOUNDARIES,layout.POST_COLLIDERS);
      assert.ok(layout.onCourse(ball.x,ball.z),`Escaped at ${ball.x},${ball.z}`);
    }
  }
});
test('flipper bumpers add bounded outward speed only on incoming contact',()=>{
  const bumper=layout.LEVEL.bumpers[0];
  const ball={x:bumper.x-.8,z:bumper.z,vx:4,vz:0};
  assert.equal(collideBumper(ball,bumper),true);assert.ok(ball.vx<=-8&&ball.vx>=-16);
  const outgoing={x:bumper.x-.8,z:bumper.z,vx:-12,vz:0};
  assert.equal(collideBumper(outgoing,bumper),false);near(outgoing.vx,-12);
});
