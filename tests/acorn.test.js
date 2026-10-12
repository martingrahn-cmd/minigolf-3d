import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createLayout,LEVELS} from '../src/layout.js';
import {shouldSink,shotSpeed,collideWalls,BALL_RADIUS} from '../src/mechanics.js';
import {pendulumPose,collidePendulum} from '../src/pendulum.js';
import {createAcornPendulum} from '../src/acorn.js';

const layout=createLayout(LEVELS.find(l=>l.id===16)),p=layout.LEVEL.pendulum,dt=1/120;
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function shot(position,power,target,time=0){
  const angle=Math.atan2(target.z-position.z,target.x-position.x),speed=shotSpeed(power);
  const ball={x:position.x,z:position.z,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed};
  let settled=0,hits=0,bank=false;
  for(let i=0;i<14/dt;i++){
    time+=dt;
    const friction=Math.exp(-layout.frictionAt(ball.x,ball.z)*dt);
    ball.vx*=friction;ball.vz*=friction;ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;
    if(collidePendulum(ball,p,time))hits++;
    if(collideWalls(ball,layout.WALLS,layout.POST_COLLIDERS)&&ball.x>3&&ball.z>-4)bank=true;
    if(!layout.onCourse(ball.x,ball.z))return {...ball,fell:true,hits,bank};
    if(shouldSink(ball,layout.CUP))return {...ball,won:true,hits,bank};
    settled=Math.hypot(ball.vx,ball.vz)<.23?settled+dt:0;
    if(settled>.45)break;
  }
  return {...ball,hits,bank};
}

test('the rendered acorn and its moving collision volume share a pose throughout the swing',()=>{
  const scene=new THREE.Scene(),visual=createAcornPendulum(scene,p),position=new THREE.Vector3();
  for(let t=0;t<2*p.period;t+=.19){
    visual.update(t);scene.updateMatrixWorld(true);
    scene.getObjectByName('pendulum-acorn').getWorldPosition(position);
    const pose=pendulumPose(t,p);
    near(position.x,pose.x);near(position.y,pose.y);near(position.z,pose.z);
  }
});

test('the low swing pushes parked balls, clears the centre when aside and never collides above ball height',()=>{
  const ball={x:p.x,z:.8,vx:0,vz:0};
  assert.ok(collidePendulum(ball,p,0));assert.ok(ball.vz>2&&ball.vz<=26.5);
  const centre={x:p.x,z:0,vx:10,vz:0},before={...centre};
  assert.equal(collidePendulum(centre,p,p.period/4),false);assert.deepEqual(centre,before);
  const raised={...p,pivotY:p.pivotY+3};
  assert.ok(pendulumPose(0,raised).y-p.radius>BALL_RADIUS*2+.04);
  assert.equal(collidePendulum(centre,raised,0),false);assert.deepEqual(centre,before);
  for(let t=0;t<p.period;t+=.05){
    const pose=pendulumPose(t,p),fast={x:pose.x,z:pose.z,vx:26.5,vz:-20};
    if(collidePendulum(fast,p,t))assert.ok(Math.hypot(fast.vx,fast.vz)<=26.5+1e-8);
  }
});

test('the same opening shot rewards timing, while a bad crossing can fall through a visible unguarded edge',()=>{
  const good=shot(layout.START,.9,{x:10,z:0},0);
  assert.ok(!good.fell&&good.hits===0&&good.x>3);
  const bad=shot(layout.START,.9,{x:10,z:0},2);
  assert.ok(bad.fell&&bad.hits>0,JSON.stringify(bad));
  assert.ok(bad.x>=-8.2&&bad.x<=-3.2&&Math.abs(bad.z)>1.2);
  const staged=shot(layout.START,.55,{x:10,z:0},2);
  assert.ok(!staged.fell&&staged.x<-7.2,'A player can lay up in front of the pendulum');
  for(const e of layout.BOUNDARIES.filter(e=>e.open)){
    assert.ok(e.ax>=-8.2&&e.bx<=-3.2&&Math.abs(e.az)===1.2&&e.az===e.bz);
  }
});

test('timing remains necessary at full power and the former wide side bypass is closed',()=>{
  const samples=80;
  for(const power of [.8,.9,1])for(const degrees of [-4,0,4]){
    let clear=0,hits=0,falls=0;
    const target={x:10,z:Math.tan(degrees*Math.PI/180)*(10-layout.START.x)};
    for(let i=0;i<samples;i++){
      const ball=shot(layout.START,power,target,p.period*i/samples);
      clear+=!ball.fell&&ball.x>-3.2;hits+=ball.hits>0;falls+=!!ball.fell;
    }
    assert.ok(clear>=samples*.25&&clear<=samples*.65,`${power}/${degrees}: ${clear} successful phases`);
    assert.ok(hits>=samples*.4&&falls>=samples*.2,'A mistimed hard shot must carry a real cost');
  }
  for(const degrees of [-12,-8,8,12]){
    const target={x:10,z:Math.tan(degrees*Math.PI/180)*(10-layout.START.x)};
    for(let i=0;i<16;i++){
      const ball=shot(layout.START,1,target,p.period*i/16);
      assert.ok(ball.fell||ball.x<-3.2,'A wide shot cannot skirt the pendulum along the old outside rail');
    }
  }
});

test('the diagonal bank catches maximum speed without tunnelling and sends the ball toward the bridge',()=>{
  for(const power of [.7,.8,.9,1]){
    const ball=shot({x:-.5,z:0},power,{x:10,z:0});
    assert.ok(!ball.fell&&ball.bank&&ball.z<-3.8&&ball.x>5&&ball.x<10,JSON.stringify(ball));
  }
});

test('a controlled four-shot route completes par, and a stronger bank can save a stroke',()=>{
  let ball=shot(layout.START,.8,{x:10,z:0});
  ball=shot(ball,.8,{x:10,z:0});assert.ok(ball.bank&&!ball.fell);
  ball=shot(ball,.45,{x:ball.x,z:-13.8});assert.ok(!ball.fell&&ball.z<-13);
  ball=shot(ball,.4,layout.CUP);assert.ok(ball.won,JSON.stringify(ball));
  ball=shot(layout.START,.9,{x:10,z:0});
  ball=shot(ball,.95,{x:10,z:0});assert.ok(ball.bank&&!ball.fell&&ball.z<-11);
  ball=shot(ball,.5,layout.CUP);assert.ok(ball.won,JSON.stringify(ball));
});

test('the bridge joins the elbow and green without internal collision seams',()=>{
  for(const x of [5.5,7.5,9.4])for(let z=-4;z>-13;z-=.05){
    const ball={x,z,vx:0,vz:-1},before={...ball};
    assert.ok(layout.onCourse(x,z));collideWalls(ball,layout.WALLS,layout.POST_COLLIDERS);
    near(ball.x,before.x);near(ball.z,before.z);
  }
});
