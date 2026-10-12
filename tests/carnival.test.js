import test from 'node:test';
import assert from 'node:assert/strict';
import { createLayout, LEVELS } from '../src/layout.js';
import {shouldSink, shotSpeed, collideWalls } from '../src/mechanics.js';
import { flightPosition } from '../src/bridge.js';
import { trampolineFlight, throughHoop, createPinStates, createPinRack, knockPin, advancePins } from '../src/carnival.js';
const layout=createLayout(LEVELS.find(level=>level.id===14)),level=layout.LEVEL,dt=1/120;

function shot(position,power,target,pins=createPinStates(level.pins)){
  const angle=Math.atan2(target.z-position.z,target.x-position.x);
  const ball={x:position.x,z:position.z,vx:shotSpeed(power)*Math.cos(angle),vz:shotSpeed(power)*Math.sin(angle)};
  let settled=0,jump=null,ring=false;
  for(let i=0;i<14/dt;i++){
    advancePins(pins,dt,level.pins);
    const friction=Math.exp(-layout.frictionAt(ball.x,ball.z)*dt);
    ball.vx*=friction;ball.vz*=friction;ball.x+=ball.vx*dt;ball.z+=ball.vz*dt;
    const flight=trampolineFlight(ball,level.trampoline);
    if(flight){
      for(let time=dt;time<=flight.duration+dt;time+=dt){
        const previous=flightPosition(flight,time-dt),p=flightPosition(flight,time);
        ring=throughHoop(previous,p,level.hoop)||ring;
        level.pins.forEach((pin,i)=>knockPin({x:p.x,z:p.z,vx:flight.vx,vz:flight.vz},pin,pins[i],p.y));
        advancePins(pins,dt,level.pins);
      }
      jump=flightPosition(flight,flight.duration);ball.x=jump.x;ball.z=jump.z;
      if(!layout.onCourse(ball.x,ball.z))return {...ball,fell:true};
      ball.vx=flight.vx*.38;ball.vz=flight.vz*.38;
    }
    collideWalls(ball,layout.BOUNDARIES,layout.POST_COLLIDERS);
    if(!layout.onCourse(ball.x,ball.z))return {...ball,fell:true};
    level.pins.forEach((pin,i)=>knockPin(ball,pin,pins[i]));
    if(shouldSink(ball,level.cup))return {...ball,won:true,pins};
    settled=Math.hypot(ball.vx,ball.vz)<.23?settled+dt:0;
    if(settled>.45)break;
  }
  return {...ball,jump,ring,pins};
}

test('the drum preserves aim without rescuing slow or excessive approaches',()=>{
  const contact={x:-6.5,z:0,vx:1,vz:0};
  const soft=trampolineFlight(contact,level.trampoline),hard=trampolineFlight({...contact,vx:26},level.trampoline);
  const a=flightPosition(soft,soft.duration),b=flightPosition(hard,hard.duration);
  assert.ok(!layout.onCourse(a.x,a.z)&&!layout.onCourse(b.x,b.z));
  assert.ok(b.x>a.x+4);assert.ok(hard.vx<=level.trampoline.maxSpeed);
  const controlled=trampolineFlight({...contact,vx:4},level.trampoline);
  const landing=flightPosition(controlled,controlled.duration);
  assert.ok(layout.onCourse(landing.x,landing.z));
  const angled=trampolineFlight({...contact,vx:8,vz:1},level.trampoline);
  assert.ok(Math.abs(angled.vz/angled.vx-1/8)<1e-9);
  assert.equal(trampolineFlight({...contact,vx:-4},level.trampoline),null);
  assert.equal(trampolineFlight({...contact,z:2},level.trampoline),null);
});

test('the neon ring rewards a real forward crossing inside its opening',()=>{
  const h=level.hoop;
  assert.equal(throughHoop({x:h.x-.1,y:h.y-.35,z:0},{x:h.x+.1,y:h.y-.35,z:0},h),true);
  assert.equal(throughHoop({x:h.x-.1,y:0,z:0},{x:h.x+.1,y:0,z:0},h),false);
  assert.equal(throughHoop({x:h.x-.1,y:h.y,z:3},{x:h.x+.1,y:h.y,z:3},h),false);
  assert.equal(throughHoop({x:h.x+.1,y:h.y,z:0},{x:h.x-.1,y:h.y,z:0},h),false);
});

test('pins chain forwards and remain down until explicitly restored',()=>{
  const pins=createPinStates(level.pins),pin=level.pins[0];
  const ball={x:pin.x-.5,z:pin.z,vx:5,vz:0};
  assert.equal(knockPin(ball,pin,pins[0],2),false,'Flying above a pin must not topple it');
  assert.equal(knockPin({...ball,vx:-5},pin,pins[0]),false);
  assert.equal(knockPin(ball,pin,pins[0]),true);assert.ok(ball.vx>0&&ball.vx<5);
  assert.equal(knockPin(ball,pin,pins[0]),false);
  for(let i=0;i<120;i++)advancePins(pins,dt,level.pins);
  assert.ok(pins.every(pin=>pin.down),'Front pin should start a six-pin chain reaction');
  assert.ok(createPinStates(level.pins).every(pin=>!pin.down));
  const rear=createPinStates(level.pins);rear[4].down=true;
  for(let i=0;i<120;i++)advancePins(rear,dt,level.pins);
  assert.equal(rear.filter(pin=>pin.down).length,1,'A rear pin cannot topple a distant or upstream pin');
});

test('a failed opening jump restores its whole pin chain, including on repeated attempts',()=>{
  const rack=createPinRack(level.pins);
  for(let attempt=0;attempt<2;attempt++){
    rack.beginShot();
    const result=shot(level.start,.81,{x:20,z:0},rack.states);
    assert.ok(result.fell,'The hard shot should roll off the open end');
    assert.ok(rack.states.every(pin=>pin.down),'The miss should knock down the whole rack first');
    assert.deepEqual(rack.restoreShot(),[0,1,2,3,4,5]);
    for(let i=0;i<180;i++)advancePins(rack.states,dt,level.pins);
    assert.deepEqual(rack.states,createPinStates(level.pins),'No failed-shot chain reaction may survive the reset');
  }
});

test('a fall preserves earlier knockdowns and a new round clears the saved rack',()=>{
  const rack=createPinRack(level.pins),rear=level.pins[4];
  rack.beginShot();
  assert.ok(knockPin({x:rear.x-.45,z:rear.z,vx:5,vz:0},rear,rack.states[4]));
  for(let i=0;i<180;i++)advancePins(rack.states,dt,level.pins);
  assert.deepEqual(rack.states.map(pin=>pin.down),[false,false,false,false,true,false]);
  const earned=rack.states.map(pin=>({...pin}));
  rack.beginShot();
  assert.ok(shot(level.start,.81,{x:20,z:0},rack.states).fell);
  assert.ok(rack.states.every(pin=>pin.down));
  assert.deepEqual(rack.restoreShot(),[0,1,2,3,5]);
  assert.deepEqual(rack.states,earned,'Only the failed stroke is undone');
  rack.reset();rack.restoreShot();
  assert.deepEqual(rack.states,createPinStates(level.pins),'A restart must discard the previous round checkpoint');
});

test('a controlled opening shot clears the ring and rack, then a putt can finish',()=>{
  const first=shot(level.start,.77,{x:20,z:0});
  assert.ok(first.jump&&first.ring&&!first.fell&&!first.won);
  assert.ok(first.pins.every(pin=>pin.down));
  const putt=shot(first,.4,level.cup,first.pins);
  assert.ok(putt.won,`Putt stopped at ${putt.x}, ${putt.z}`);
  const soft=shot(level.start,.6,{x:20,z:0});assert.ok(!soft.jump&&!soft.fell&&soft.x<-6.6);
});

test('short, long and off-axis jumps fall; the open end also punishes excess roll',()=>{
  for(const power of [.7,.81,.9,1]){
    const result=shot(level.start,power,{x:20,z:0});
    assert.ok(result.fell,`${power*100}% power must not get a guaranteed safe landing`);
  }
  for(const degrees of [-4,4]){
    const result=shot(level.start,.76,{x:20,z:Math.tan(degrees*Math.PI/180)*(20-level.start.x)});
    assert.ok(result.fell,'A sideways miss must reach water beside the narrow landing');
  }
  const openEnd=layout.BOUNDARIES.filter(e=>e.ax===19.5&&e.bx===19.5&&e.az>=-1.5&&e.bz<=1);
  assert.ok(openEnd.length&&openEnd.every(e=>e.open),'The marked end must have no invisible safety rail');
  assert.ok(!shot(level.start,.77,{x:20,z:0}).fell,'A controlled jump must remain repeatably playable');
});

test('the bypass is connected and its rails retain even hard bank shots',()=>{
  const points=[level.start,{x:-11,z:0},{x:-11,z:6.9},{x:18.3,z:6.9},{x:18.3,z:-3.1},level.cup];
  for(let i=1;i<points.length;i++)for(let j=0;j<=100;j++){
    const a=points[i-1],b=points[i],t=j/100,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
    assert.ok(layout.onCourse(x,z));
    const ball={x,z,vx:1,vz:1};collideWalls(ball,layout.BOUNDARIES,layout.POST_COLLIDERS);
    assert.ok(Math.hypot(ball.x-x,ball.z-z)<1e-7,'No internal rail may block the bypass');
  }
  for(const z of [3,10])assert.ok(!shot({x:0,z:6.9},1,{x:3,z}).fell);
});
