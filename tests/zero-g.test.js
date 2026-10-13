import test from 'node:test';
import assert from 'node:assert/strict';
import {layout,shot} from '../scripts/probe-zero-g.mjs';
import {inLowGravity,stepFloat,floatDrop,FLOAT_LAND_DEPTH,FLOAT_LOST_DEPTH} from '../src/low-gravity.js';
import {puttSpeed} from '../src/putting.js';

const level=layout.LEVEL,S=layout.START,C=layout.CUP,stage={x:14,z:.9};
const putt=b=>shot(b,0,C,0,puttSpeed(Math.hypot(C.x-b.x,C.z-b.z),layout.frictionAt(b.x,b.z)));
const pit=x=>x>-3&&x<2;

test('a floating ball keeps its speed, lands only while still near floor height, and is otherwise lost',()=>{
  const course=(x,z)=>!pit(x)||Math.abs(z)>3;
  const fast={x:-2.95,z:0,vx:9,vz:0,float:0};let result=null;
  while(!result)result=stepFloat(fast,1/120,course);
  assert.equal(result,'land');assert.equal(fast.vx,9,'No friction or braking in the air');
  assert.ok(floatDrop(fast.float)<FLOAT_LAND_DEPTH);
  const slow={x:-2.95,z:0,vx:2,vz:0,float:0};result=null;
  while(!result)result=stepFloat(slow,1/120,course);
  assert.equal(result,'lost','Too slow: it sinks before the far side');
  const late={x:-2.95,z:0,vx:4.5,vz:0,float:0};result=null;
  while(!result)result=stepFloat(late,1/120,course);
  assert.equal(result,'lost','Reaching the far side too low hits the pit wall');
  assert.ok(FLOAT_LOST_DEPTH>FLOAT_LAND_DEPTH);
  assert.ok(inLowGravity(0,0,level.lowGravity)&&!inLowGravity(-12,0,level.lowGravity)&&!inLowGravity(12,0,level.lowGravity),'Only the tent is weightless');
});

test('the pit in the ring is open on all sides and the tent floor is slippery',()=>{
  for(const [x,z] of [[-.5,0],[-2.9,2.9],[1.9,-2.9]])assert.ok(!layout.onCourse(x,z));
  const openPitWalls=layout.BOUNDARIES.filter(e=>e.open&&Math.max(e.ax,e.bx)<=2.001&&Math.min(e.ax,e.bx)>=-3.001&&Math.max(Math.abs(e.az),Math.abs(e.bz))<=3.001);
  assert.ok(openPitWalls.length>=4,'No rails around the pit');
  assert.ok(layout.frictionAt(-6,0)<layout.frictionAt(-20,5)/2,'The tent felt glides');
});

test('the tee is a placement shot, and from the door the float has a window on both sides',()=>{
  const tee=shot(S,.8,{x:-10,z:5});
  assert.ok(!tee.fell&&tee.x<-9&&Math.abs(tee.z)<3,'The corner bank brings the ball round to the tent door');
  const results=[];
  for(let p=.5;p<=1.0001;p+=.05)results.push([+p.toFixed(2),shot(tee,p,stage)]);
  for(const [p,r] of results){
    if(p<=.55)assert.ok(r.fell&&r.x<9,`${p}: sinks in the pit`);
    if(p>=.6&&p<=.75)assert.ok(!r.fell&&r.floats===1&&r.x>11.5&&layout.heightAt(r.x,r.z)>1.1,`${p}: floats across and up onto the stage`);
    if(p>=.85)assert.ok(r.fell&&r.x>17.9,`${p}: flies off the far edge of the stage`);
  }
});

test('the float gives birdie, the ring route gives par, and a direct eagle stays rare',()=>{
  const tee=shot(S,.8,{x:-10,z:5});
  for(const p of [.6,.65,.7,.75]){
    const b=shot(tee,p,stage);
    assert.ok(putt(b).won,`${p}: float, then one putt for birdie`);
  }
  let b=shot(tee,.6,{x:0,z:-6});assert.ok(!b.fell&&b.floats===0&&b.x>8,'The ring glides round the pit without floating');
  b=shot(b,.45,stage);assert.ok(!b.fell&&layout.heightAt(b.x,b.z)>1.1);
  assert.ok(putt(b).won,'Four strokes on the ring route');
  let eagles=0,tries=0;
  for(let p=.6;p<=1.0001;p+=.025)for(let d=-3;d<=3;d+=.5){
    const a=Math.atan2(C.z-tee.z,C.x-tee.x)+d*Math.PI/180;tries++;
    if(shot(tee,p,{x:tee.x+Math.cos(a)*30,z:tee.z+Math.sin(a)*30}).won)eagles++;
  }
  assert.ok(eagles>0&&eagles/tries<.12,`${eagles}/${tries} perfectly aimed floats hole out`);
});
