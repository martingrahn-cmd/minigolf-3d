import test from 'node:test';
import assert from 'node:assert/strict';
import {createLayout,LEVELS} from '../src/layout.js';
import {shouldSink,shotSpeed,collideWalls} from '../src/mechanics.js';
const layout=createLayout(LEVELS.find(level=>level.id===13)),dt=1/120;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`);
function shot(position,power,target){
  const angle=Math.atan2(target.z-position.z,target.x-position.x),speed=shotSpeed(power);
  const ball={...position,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed};
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
test('high tee, ramp and low green join continuously with matching gravity',()=>{
  near(layout.heightAt(layout.START.x,layout.START.z),3);near(layout.heightAt(layout.CUP.x,layout.CUP.z),0);
  for(const z of [0,7]){
    near(layout.heightAt(-11,z),3);near(layout.heightAt(1,z),0);
    for(const x of [-10,-5,0])near((layout.heightAt(x+.001,z)-layout.heightAt(x-.001,z))/.002,layout.heightSlope(x,z));
  }
  assert.ok(layout.CELLS.every(cell=>!([-11,1].some(x=>cell.x1<x&&cell.x2>x))),'Mesh cells must split at changes of slope');
});
test('ice has lower friction while only its marked ledges allow a fall',()=>{
  assert.ok(layout.frictionAt(-5,0)<layout.frictionAt(-5,7)/3);
  near(layout.frictionAt(2,0),1.35);
  for(const edge of layout.BOUNDARIES.filter(e=>e.open)){
    assert.ok(edge.ax>=-8&&edge.bx<=-1);assert.ok(Math.abs(edge.az)===1.4&&edge.az===edge.bz);
  }
  const slip=shot({x:-5,z:0},.25,{x:-5,z:4});assert.ok(slip.fell,'A sideways shot over the unguarded ice edge must fall');
  const bank=shot({x:-5,z:7},.6,{x:-5,z:10});assert.ok(!bank.fell,'The safe road must retain side shots');
});
test('ice shortcut is playable in three strokes, with no maximum-power requirement',()=>{
  let ball=shot(layout.START,.7,{x:8,z:0});assert.ok(!ball.fell&&ball.x>5&&ball.x<6);
  ball=shot(ball,.34,{x:7,z:-4.8});assert.ok(!ball.fell&&ball.z<-4);
  ball=shot(ball,.51,layout.CUP);assert.ok(ball.won,`Final putt missed: ${JSON.stringify(ball)}`);
  const softer=shot(layout.START,.4,{x:8,z:0});assert.ok(!softer.fell&&softer.x>3,'Gravity should carry a controlled shot down the ice');
});
test('the wider alternative route is connected and bounded all the way to the green',()=>{
  const points=[layout.START,{x:-12.5,z:7},{x:2.5,z:7},{x:7,z:-3.5},layout.CUP];
  for(let i=1;i<points.length;i++)for(let j=0;j<=100;j++){
    const t=j/100,a=points[i-1],b=points[i],ball={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,vx:1,vz:1};
    assert.ok(layout.onCourse(ball.x,ball.z));
    const previous={...ball};collideWalls(ball,layout.BOUNDARIES,layout.POST_COLLIDERS);
    near(ball.x,previous.x);near(ball.z,previous.z);
  }
});
