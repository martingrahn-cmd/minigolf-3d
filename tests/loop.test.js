import test from 'node:test';
import assert from 'node:assert/strict';
import {createLayout,LEVELS} from '../src/layout.js';
import {shotSpeed,shotError,shouldSink,collideWalls,BALL_RADIUS} from '../src/mechanics.js';
import {createLoopTrack,loopFrame,loopBallPoint,enterLoop,stepLoop} from '../src/loop.js';

const layout=createLayout(LEVELS.find(l=>l.id===17)),c=layout.LEVEL.loop,track=createLoopTrack(c),dt=1/120;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function shot(position,power,target,needle=0){
  const angle=Math.atan2(target.z-position.z,target.x-position.x)+shotError(needle,power),speed=shotSpeed(power);
  const ball={x:position.x,z:position.z,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed};
  let ride=null,settled=0,age=0,completed=false,returned=false,maxU=0;
  const result=extra=>({...ball,completed,returned,maxU,...extra});
  for(let i=0;i<30/dt;i++){
    if(ride){
      const pose=stepLoop(ride,track,dt);ball.x=pose.x;ball.z=pose.z;maxU=Math.max(maxU,pose.u);
      if(pose.finished||pose.returned){
        completed ||= pose.finished;returned ||= pose.returned;
        ball.x+=pose.returned?-.03:.03;ball.vx=ride.speed;ball.vz=ride.sideSpeed;
        ride=null;settled=0;age=0;
      }
      continue;
    }
    age+=dt;ball.vx-=layout.heightSlope(ball.x,ball.z)*6.9*dt;
    const friction=Math.exp(-(layout.onCourse(ball.x,ball.z)?layout.frictionAt(ball.x,ball.z):1.7)*dt);
    ball.vx*=friction;ball.vz*=friction;
    const previous={...ball};ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;
    ride=enterLoop(previous,ball,track);if(ride)continue;
    collideWalls(ball,layout.WALLS,layout.POST_COLLIDERS);
    if(!layout.onCourse(ball.x,ball.z))return result({fell:true});
    if(shouldSink(ball,layout.CUP))return result({won:true});
    settled=Math.hypot(ball.vx,ball.vz)<.23?settled+dt:0;
    if(settled>.45||age>14)return result({});
  }
  assert.fail('A shot must finish; the ball cannot get stuck in the loop');
}

test('the root surface and ball share a continuous full loop with separate, level mouths',()=>{
  for(const u of [0,.1,.25,.5,.75,.9,1]){
    const f=loopFrame(u,c),b=loopBallPoint(u,0,c);
    near(Math.hypot(b.x-f.x,b.y-f.y,b.z-f.z),BALL_RADIUS+.04);
    near(f.tangent.x*f.normal.x+f.tangent.y*f.normal.y+f.tangent.z*f.normal.z,0);
  }
  const start=track.sample(0),end=track.sample(track.length),crown=loopBallPoint(.5,0,c);
  near(start.x,c.x);near(start.z,c.z);near(end.x,c.x+c.advance);near(end.z,c.z+c.shift);
  near(start.y,c.y+BALL_RADIUS+.04);near(end.y,start.y);
  near(crown.y,c.y+2*c.radius-BALL_RADIUS-.04);
  assert.ok(!layout.onCourse((start.x+end.x)/2,(start.z+end.z)/2),'The loop really bridges a gap');
});

test('a loop can only be entered through a visible mouth, in either direction',()=>{
  assert.ok(enterLoop({x:c.x-.1,z:c.z},{x:c.x+.1,z:c.z,vx:8,vz:0},track));
  assert.equal(enterLoop({x:c.x-.1,z:2},{x:c.x+.1,z:2,vx:8,vz:0},track),null);
  assert.equal(enterLoop({x:c.x+.1,z:0},{x:c.x-.1,z:0,vx:-8,vz:0},track),null);
  const x=c.x+c.advance,z=c.z+c.shift;
  const reverse=enterLoop({x:x+.1,z},{x:x-.1,z,vx:-12,vz:0},track);
  assert.ok(reverse);
  let pose;for(let i=0;i<15/dt;i++){pose=stepLoop(reverse,track,dt);if(pose.finished||pose.returned)break}
  assert.ok(pose.returned&&pose.x===c.x,'A reverse shot can return through the entrance');
  const weak=enterLoop({x:x+.1,z},{x:x-.1,z,vx:-4,vz:0},track);
  for(let i=0;i<15/dt;i++){pose=stepLoop(weak,track,dt);if(pose.finished||pose.returned)break}
  assert.ok(pose.finished&&weak.turned&&weak.speed>0,'A weak reverse shot rolls back to the exit');
});

test('insufficient speed climbs and rolls back, while a controlled strong shot completes the loop',()=>{
  for(const power of [.55,.65,.7,.75]){
    const ball=shot(layout.START,power,{x:0,z:0});
    assert.ok(ball.returned&&!ball.completed&&!ball.fell&&ball.x<c.x,JSON.stringify(ball));
    assert.ok(ball.maxU>.08&&ball.maxU<.5);
  }
  const ball=shot(layout.START,.8,{x:0,z:0});
  assert.ok(ball.completed&&!ball.fell&&ball.x>c.x+c.advance&&ball.x<1.4,JSON.stringify(ball));
});

test('the descent rewards controlled opening power and maximum power runs over the marked end',()=>{
  const placed=shot(layout.START,.9,{x:0,z:0});
  assert.ok(placed.completed&&!placed.fell&&placed.x>11&&placed.x<12.5,JSON.stringify(placed));
  const max=shot(layout.START,1,{x:0,z:0});
  assert.ok(max.completed&&max.fell&&max.x>13&&max.z>-4.5&&max.z<-1.9,JSON.stringify(max));
  const missed=shot(layout.START,.9,{x:0,z:0},.5);
  assert.ok(!missed.completed,'A substantial precision miss must spoil a straight loop shot');
});

test('two direction changes prevent a straight finish, with a playable birdie route',()=>{
  let ball=shot(layout.START,.9,{x:0,z:0});
  ball=shot(ball,.5,{x:ball.x,z:-12});assert.ok(!ball.fell&&ball.z<-10);
  ball=shot(ball,.5,layout.CUP);assert.ok(ball.won,JSON.stringify(ball));
});

test('a cautious loop shot and gentle descent leave a four-stroke par route',()=>{
  let ball=shot(layout.START,.8,{x:0,z:0});
  assert.ok(ball.completed&&ball.x<1.4);
  ball=shot(ball,.15,{x:15,z:ball.z});assert.ok(!ball.fell&&ball.x>11&&ball.x<12.5);
  ball=shot(ball,.5,{x:ball.x,z:-12});assert.ok(!ball.fell&&ball.z<-10);
  ball=shot(ball,.5,layout.CUP);assert.ok(ball.won,JSON.stringify(ball));
});
