import test from 'node:test';
import assert from 'node:assert/strict';
import {createLayout,LEVELS} from '../src/layout.js';
import {shouldSink,shotSpeed,collideWalls,BALL_RADIUS} from '../src/mechanics.js';

const layout=createLayout(LEVELS.find(l=>l.id===15)),dt=1/120;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function shot(position,power,target){
  const angle=Math.atan2(target.z-position.z,target.x-position.x),speed=shotSpeed(power);
  const ball={x:position.x,z:position.z,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed};
  let settled=0;
  for(let i=0;i<14/dt;i++){
    const friction=Math.exp(-layout.frictionAt(ball.x,ball.z)*dt);
    ball.vx=(ball.vx-layout.heightSlope(ball.x,ball.z)*6.9*dt)*friction;
    ball.vz=(ball.vz-layout.heightSlopeZ(ball.x,ball.z)*6.9*dt)*friction;
    ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;
    collideWalls(ball,layout.BOUNDARIES,layout.POST_COLLIDERS);
    if(!layout.onCourse(ball.x,ball.z))return {...ball,fell:true};
    if(shouldSink(ball,layout.CUP))return {...ball,won:true};
    settled=Math.hypot(ball.vx,ball.vz)<.23?settled+dt:0;
    if(settled>.45)break;
  }
  return ball;
}

test('ravine descends 5.6 metres with continuous geometry and matching gravity',()=>{
  near(layout.heightAt(layout.START.x,0)-layout.heightAt(1,0),5.6);
  near(layout.heightAt(layout.CUP.x,layout.CUP.z),-1);
  for(const p of layout.LEVEL.heightProfile){
    assert.ok(Math.abs(layout.heightAt(p.x-.00001,0)-layout.heightAt(p.x+.00001,0))<.00002);
    assert.ok(layout.CELLS.every(c=>!(c.x1<p.x&&c.x2>p.x)),'Geometry splits at every change of slope');
  }
  for(const x of [-11,-8,-3,1,13,19])near((layout.heightAt(x+.0001,0)-layout.heightAt(x-.0001,0))/.0002,layout.heightSlope(x,0));
});

test('the flume carries moderate shots under the root bridge into a flat staging area',()=>{
  for(const power of [.4,.5,.6]){
    const ball=shot(layout.START,power,{x:20,z:0});
    assert.ok(!ball.fell&&ball.x>1&&ball.x<3,JSON.stringify(ball));
    near(layout.heightSlope(ball.x,ball.z),0);
  }
  for(const side of [-1,1]){
    const ball=shot({x:-7,z:0},1,{x:-7,z:side*3});
    assert.ok(!ball.fell,'The flume has physical sides even for a maximum-power bank shot');
  }
});

test('straight hard shots no longer bypass the choice of route',()=>{
  for(const power of [.8,.9,1]){
    const ball=shot(layout.START,power,{x:20,z:0});
    assert.ok(ball.fell&&ball.x>=4&&ball.x<4.3,'Excess pace must roll over the marked edge of the clearing');
  }
  const clearing=shot(layout.START,.5,{x:20,z:0});
  assert.ok(shot(clearing,.92,{x:20,z:0}).fell,'The old straight second shot must not reach the green either');
});

test('the offset shortcut rewards positioning and punishes inaccurate crossings',()=>{
  let ball=shot(layout.START,.5,{x:20,z:0});
  ball=shot(ball,.15,{x:ball.x,z:-2});assert.ok(Math.abs(ball.z+2)<.1);
  const placed={...ball};
  for(const side of [-1,1]){
    const target={x:20,z:placed.z+side*Math.tan(6*Math.PI/180)*(20-placed.x)};
    assert.ok(shot(placed,.92,target).fell,'Six degrees of error should roll off, rather than be corrected by guide rails');
  }
  ball=shot(ball,.92,{x:20,z:ball.z});assert.ok(!ball.fell&&ball.x>17&&ball.x<19);
  ball=shot(ball,.2,layout.CUP);assert.ok(ball.won,JSON.stringify(ball));
  assert.ok(2*layout.LEVEL.shortcut.halfWidth>2*BALL_RADIUS,'A ball fits on the board');
  for(const edge of layout.BOUNDARIES.filter(e=>e.open)){
    if(edge.ax===edge.bx){assert.equal(edge.ax,4);assert.ok(edge.az>=-1.3&&edge.bz<=2.3)}
    else assert.ok(edge.ax>=4&&edge.bx<=12&&[-2.7,-1.3].includes(edge.az)&&edge.az===edge.bz);
  }
  const boardSides=layout.BOUNDARIES.filter(e=>e.ax<e.bx&&e.ax>=4&&e.bx<=12&&[-2.7,-1.3].includes(e.az));
  assert.ok(boardSides.length>0&&boardSides.every(e=>e.open),'No invisible rails may rescue a shot along the board');
});

test('the guarded path has a flat turning deck and can complete the hole in five shots',()=>{
  let ball=shot(layout.START,.5,{x:20,z:0});
  ball=shot(ball,.5,{x:ball.x,z:7});assert.ok(!ball.fell&&ball.z>6&&ball.z<7.5);
  ball=shot(ball,.95,{x:17,z:ball.z});assert.ok(!ball.fell&&ball.x>15.5&&ball.x<17.5);
  near(layout.heightSlope(ball.x,ball.z),0);
  ball=shot(ball,.5,{x:ball.x,z:0});assert.ok(!ball.fell&&Math.abs(ball.z)<1);
  ball=shot(ball,.3,layout.CUP);assert.ok(ball.won,JSON.stringify(ball));
});

test('both approaches join without invisible internal walls or disconnected corners',()=>{
  const paths=[
    [layout.START,{x:2,z:0},{x:2,z:-2},{x:17,z:-2},layout.CUP],
    [{x:2,z:0},{x:2,z:6.9},{x:16.5,z:6.9},{x:16.5,z:0},layout.CUP],
  ];
  for(const points of paths)for(let i=1;i<points.length;i++)for(let j=0;j<=120;j++){
    const t=j/120,a=points[i-1],b=points[i],ball={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,vx:1,vz:1};
    assert.ok(layout.onCourse(ball.x,ball.z));const before={...ball};collideWalls(ball,layout.BOUNDARIES,layout.POST_COLLIDERS);near(ball.x,before.x);near(ball.z,before.z);
  }
});
