import test from 'node:test';
import assert from 'node:assert/strict';
import { heightAt, heightSlope, onCourse, BOUNDARIES, SPINNER } from '../src/layout.js';
import { collideWalls, collideSpinner, powerAt, precisionAt, shotError, shotSpeed, springImpulse, shouldSink, perfectZone, cupCaptureRadius } from '../src/mechanics.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`);

test('internal joins stay open and ball radius stays inside perimeter',()=>{
  for(const x of [-10,-3,4,10,11,16]){
    const b={x,z:x===4||x===10||x===11?4:0,vx:5,vz:0};
    collideWalls(b);near(b.x,x);near(b.vx,5);
  }
  const b={x:-18.85,z:0,vx:-5,vz:0};
  assert.equal(collideWalls(b),true);near(b.x,-18.59);assert.ok(b.vx>0);
});
test('safe path rail protects the pool, cannon opening remains open',()=>{
  const b={x:8,z:2.2,vx:0,vz:-4};collideWalls(b);
  near(b.z,2.46);assert.ok(b.vz>0);
  const launch={x:7.1,z:-4.1,vx:8,vz:0};collideWalls(launch);near(launch.x,7.1);
  assert.ok(BOUNDARIES.some(e=>e.open));
});
test('ramp slopes match geometry, both ends meet the flat course',()=>{
  near(heightAt(-10,0),0);near(heightAt(-5.2,0),0);
  near(heightAt(-8.5,0),.93);near(heightAt(-6.7,0),.93);
  for(const x of [-9,-7,-6])near((heightAt(x+.001,0)-heightAt(x-.001,0))/.002,heightSlope(x,0));
});
test('narrow green zone rewards timing, high-power misses deviate more',()=>{
  for(const needle of [-.1,-.05,0,.05,.1])near(shotError(needle),0);
  near(shotError(1),Math.PI/12);near(shotError(-1),-Math.PI/12);
  assert.ok(shotSpeed(.03)<1.3);near(shotSpeed(1),26.5);
  assert.ok(shotError(.11)>0);assert.ok(shotError(1,.2)<shotError(1,1));
  near(shotSpeed(-1),.7);near(shotSpeed(2),26.5);
  near(powerAt(.9),.5);near(powerAt(1.8),1);near(powerAt(3.6),0);
  near(precisionAt(.6),0);near(precisionAt(1.2),1);near(precisionAt(2.4),-1);
});
test('misses just outside green are visible while short putts keep a smaller angular penalty',()=>{
  near(shotError(.2,1)*180/Math.PI,15/9);
  assert.ok(shotError(.5,1)*180/Math.PI>6);
  assert.ok(shotError(1,.2)*180/Math.PI<6.5);
  for(const p of [0,.2,.6,1])for(const n of [.1,.2,.5,1])near(shotError(-n,p),-shotError(n,p));
});
test('the cup gives slow putts a little rim tolerance without rescuing fast or wide shots',()=>{
  const cup={x:0,z:0};
  assert.ok(shouldSink({x:.1,z:.1,vx:2,vz:0},cup));
  assert.ok(shouldSink({x:.36,z:0,vx:.4,vz:0},cup));
  assert.equal(shouldSink({x:.4,z:0,vx:.4,vz:0},cup),false);
  assert.equal(shouldSink({x:.4,z:0,vx:3,vz:0},cup),false);
  assert.equal(shouldSink({x:.49,z:0,vx:.4,vz:0},cup),false);
  assert.equal(shouldSink({x:0,z:0,vx:4,vz:0},cup),false);
  near(cupCaptureRadius(1),.38);near(cupCaptureRadius(3),.32);
});
test('soft putts widen the perfect zone and soften misses without changing hard shots',()=>{
  near(perfectZone(.2),.28);near(perfectZone(.5),.10);near(perfectZone(1),.10);
  near(shotError(.26,.2),0);assert.ok(shotError(.29,.2)>0);
  assert.ok(shotError(1,.2)*180/Math.PI<2);
  near(shotError(1,1)*180/Math.PI,15);
  for(const power of [.01,.1,.2])for(const needle of [-1,-.6,0,.6,1]){
    const speed=shotSpeed(power),angle=shotError(needle,power),distance=speed/1.35*.55;
    const ball={x:0,z:0,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed},cup={x:distance,z:0};
    let sank=false;
    for(let i=0;i<1000;i++){
      ball.vx*=Math.exp(-1.35/120);ball.vz*=Math.exp(-1.35/120);ball.x+=ball.vx/120;ball.z+=ball.vz/120;
      if(shouldSink(ball,cup)){sank=true;break}
    }
    assert.ok(sank,`A softly aimed ${distance.toFixed(2)} metre putt should be forgiving`);
  }
});
test('spinner collision follows the rendered Three.js rotation',()=>{
  const angle=Math.PI/6,c=Math.cos(angle),s=Math.sin(angle);
  const lx=1.5,lz=.3;
  const b={x:SPINNER.x+lx*c+lz*s,z:SPINNER.z-lx*s+lz*c,vx:0,vz:-4};
  assert.equal(collideSpinner(b,angle),true);
  const dx=b.x-SPINNER.x,dz=b.z-SPINNER.z;
  near(dx*s+dz*c,.735);
  const far={x:SPINNER.x+3,z:SPINNER.z+3,vx:0,vz:0};
  assert.equal(collideSpinner(far,angle),false);
});
test('maximum first shot clears the ramp and remains on the course',()=>{
  const b={x:-16.8,z:0,vx:shotSpeed(1),vz:0};
  const dt=1/120;
  for(let i=0;i<720;i++){
    b.vx-=heightSlope(b.x,b.z)*6.9*dt;b.vx*=Math.exp(-1.35*dt);
    b.x+=b.vx*dt;collideWalls(b);
    assert.ok(onCourse(b.x,b.z));
  }
  assert.ok(b.x>-3,`First shot stops at ${b.x}`);
});

test('pipe can be entered from the ramp landing, but never through its side',async()=>{
  const {pipeWorld,PIPE_IN,heightSlopeZ}=await import('../src/layout.js');
  const {entersPipe,collidePipe}=await import('../src/mechanics.js');
  assert.equal(entersPipe(pipeWorld(-.05),{...pipeWorld(.05),vx:1,vz:-1}),true);
  assert.equal(entersPipe(pipeWorld(.1,.9),pipeWorld(.1,.1)),false);
  assert.equal(entersPipe(pipeWorld(.1),pipeWorld(-.1)),false);
  for(const x of [-3.3,-3,-2.7]){
    const aim=Math.atan2(PIPE_IN.z,PIPE_IN.x-x),speed=shotSpeed(.38);
    const b={x,z:0,vx:Math.cos(aim)*speed,vz:Math.sin(aim)*speed};
    let entered=false;
    for(let i=0;i<840;i++){
      const previous={...b},dt=1/120;
      b.vx=(b.vx-heightSlope(b.x,b.z)*6.9*dt)*Math.exp(-1.35*dt);
      b.vz=(b.vz-heightSlopeZ(b.x,b.z)*6.9*dt)*Math.exp(-1.35*dt);
      b.x+=b.vx*dt;b.z+=b.vz*dt;
      collideWalls(b);collideSpinner(b,i/120*SPINNER.speed);
      if(entersPipe(previous,b)){entered=true;break}
      collidePipe(b);
      assert.ok(onCourse(b.x,b.z));
    }
    assert.ok(entered,`Pipe unreachable from landing x=${x}: ended ${b.x},${b.z}`);
  }
});

test('hole 10 connects both boosts and keeps the ball on its own course',async()=>{
  const {createLayout,LEVELS}=await import('../src/layout.js');
  const layout=createLayout(LEVELS[1]);
  const b={...layout.START,vx:shotSpeed(.96),vz:0};
  const triggered=new Set(),cooldowns=[0,0];
  for(let i=0;i<1800;i++){
    const dt=1/120;
    b.vx=(b.vx-layout.heightSlope(b.x,b.z)*6.9*dt)*Math.exp(-1.35*dt);
    b.vz=(b.vz-layout.heightSlopeZ(b.x,b.z)*6.9*dt)*Math.exp(-1.35*dt);
    b.x+=b.vx*dt;b.z+=b.vz*dt;
    collideWalls(b,layout.BOUNDARIES,layout.POST_COLLIDERS);
    collideSpinner(b,i/120*layout.SPINNER.speed,layout.SPINNER);
    layout.SPRINGS.forEach((pad,j)=>{
      cooldowns[j]=Math.max(0,cooldowns[j]-dt);
      if(cooldowns[j]===0&&Math.hypot(b.x-pad.x,b.z-pad.z)<.84){
        springImpulse(b,pad);cooldowns[j]=2;triggered.add(j);
      }
    });
    assert.ok(layout.onCourse(b.x,b.z),`Ball outside hole 10 at ${b.x},${b.z}`);
  }
  assert.deepEqual([...triggered],[0,1]);
  assert.ok(b.x>5,`Boosts did not reach final stretch: ${b.x},${b.z}`);
  assert.equal(layout.BOUNDARIES.some(edge=>edge.open),false);
  assert.notEqual(LEVELS[0].recordKey,LEVELS[1].recordKey);
});
