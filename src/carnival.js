import { BALL_RADIUS } from './mechanics.js';

// The drum adds spring energy without guaranteeing a safe landing speed.
export function trampolineFlight(ball,drum){
  if(!drum||ball.vx<=.25)return null;
  const radius=drum.radius-.12;
  if(Math.hypot(ball.x-drum.x,ball.z-drum.z)>radius)return null;
  const incoming=Math.hypot(ball.vx,ball.vz);
  const speed=Math.min(drum.maxSpeed,drum.boost+incoming*drum.speedGain);
  return {x:ball.x,z:ball.z,y:0,vx:ball.vx/incoming*speed,vz:ball.vz/incoming*speed,vy:drum.vy,duration:drum.vy/6};
}

export function throughHoop(previous,position,hoop){
  if(!hoop||previous.x>=hoop.x||position.x<hoop.x)return false;
  const t=(hoop.x-previous.x)/(position.x-previous.x);
  const y=previous.y+(position.y-previous.y)*t+BALL_RADIUS+.04;
  const z=previous.z+(position.z-previous.z)*t;
  return Math.hypot(y-hoop.y,z-hoop.z)<hoop.radius-BALL_RADIUS-.1;
}

export function createPinStates(pins=[]){
  return pins.map(()=>({down:false,age:0,dx:1,dz:0}));
}

// Keep a separate copy of the rack at stroke time. A failed stroke rolls back
// its entire chain reaction, while earlier successful knockdowns remain earned.
export function createPinRack(pins=[]){
  const states=createPinStates(pins);
  let beforeShot=states.map(pin=>({...pin}));
  return {
    states,
    beginShot(){beforeShot=states.map(pin=>({...pin}))},
    restoreShot(){
      const raised=[];
      beforeShot.forEach((pin,i)=>{
        if(states[i].down&&!pin.down)raised.push(i);
        states[i]={...pin};
      });
      return raised;
    },
    reset(){
      states.splice(0,states.length,...createPinStates(pins));
      beforeShot=states.map(pin=>({...pin}));
    },
  };
}

export function knockPin(ball,pin,state,height=0){
  if(state.down||height>1.49)return false;
  const pinRadius=height>.7?pin.r*.65:pin.r;
  const dx=ball.x-pin.x,dz=ball.z-pin.z,d=Math.hypot(dx,dz),limit=pinRadius+BALL_RADIUS;
  if(d>=limit)return false;
  const speed=Math.hypot(ball.vx,ball.vz);
  const nx=d>1e-7?dx/d:-ball.vx/(speed||1),nz=d>1e-7?dz/d:-ball.vz/(speed||1);
  const incoming=ball.vx*nx+ball.vz*nz;
  if(incoming>=0)return false;
  state.down=true;state.age=0;state.dx=ball.vx/(speed||1);state.dz=ball.vz/(speed||1);
  // Light toy pins steal a little speed but do not reflect the ball backwards.
  ball.vx*=.86;ball.vz*=.86;
  return true;
}

export function advancePins(states,dt,pins=[]){
  for(const state of states)if(state.down)state.age+=dt;
  const knocked=[];
  states.forEach((state,i)=>{
    if(!state.down||state.age<.13||state.propagated||!pins[i])return;
    state.propagated=true;
    states.forEach((other,j)=>{
      if(other.down)return;
      const dx=pins[j].x-pins[i].x,dz=pins[j].z-pins[i].z;
      const along=dx*state.dx+dz*state.dz,across=dx*state.dz-dz*state.dx;
      // A falling 1.5 m toy pin can topple neighbours in its direction of travel.
      if(along>.15&&along<1.65&&Math.abs(across)<.78){
        other.down=true;other.age=0;
        other.dx=state.dx;other.dz=state.dz;
        knocked.push(j);
      }
    });
  });
  return knocked;
}
