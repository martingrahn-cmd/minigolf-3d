import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,createLayout} from '../src/layout.js';
import {puttingContext,puttSpeed} from '../src/putting.js';
import {shouldSink,shotError} from '../src/mechanics.js';

test('near putting accepts the final green, but never reaches through a wall, gap or gate',()=>{
  const crown=createLayout(LEVELS.find(l=>l.id===18));
  assert.ok(puttingContext({x:15.6,z:-15},crown),'The reported near-cup position must get the distance control');
  assert.equal(puttingContext(crown.START,crown),null);
  const small={id:101,start:{x:0,z:0},cup:{x:3,z:0},hasRamp:false,springs:[],arches:[],tiles:[{x1:-1,x2:1,z1:-2,z2:2},{x1:2,x2:5,z1:-2,z2:2}]};
  assert.equal(puttingContext(small.start,createLayout(small)),null,'A nearby cup across a gap is not a putt');
  small.tiles=[{x1:-1,x2:5,z1:-2,z2:2}];small.gates=[{x:1.5,z:0,thickness:.3,postOffset:1.8}];
  assert.equal(puttingContext(small.start,createLayout(small)),null);
  delete small.gates;small.banks=[{ax:1.5,az:-2,bx:1.5,bz:2,nx:-1,nz:0}];
  assert.equal(puttingContext(small.start,createLayout(small)),null);
});

// Match the live game's 120 Hz friction, settling threshold and shot timeout.
function playPutt(distance,length,degrees=0,friction=1.35){
  const speed=puttSpeed(length,friction),angle=degrees*Math.PI/180;
  const b={x:0,z:0,vx:Math.cos(angle)*speed,vz:Math.sin(angle)*speed};
  let settle=0;
  for(let i=0;i<1680;i++){
    b.vx*=Math.exp(-friction/120);b.vz*=Math.exp(-friction/120);b.x+=b.vx/120;b.z+=b.vz/120;
    if(shouldSink(b,{x:distance,z:0}))return {...b,sunk:true};
    if(Math.hypot(b.vx,b.vz)<.23){settle+=1/120;if(settle>.45)break}else settle=0;
  }
  return {...b,sunk:false};
}

test('short putts remain forgiving without a timing or precision requirement',()=>{
  for(const distance of [.5,.75,1])for(const extra of [-.15,0,.3])for(const degrees of [-10,0,10]){
    assert.ok(playPutt(distance,distance+extra,degrees).sunk,`${distance} m, length error ${extra}, aim error ${degrees}°`);
  }
  assert.ok(Math.abs(shotError(1,1)-Math.PI/12)<1e-8);
});

test('well-judged longer putts sink on different flat surfaces',()=>{
  for(const distance of [1.5,3,5,5.5])for(const extra of [-.1,0,.3])for(const degrees of [-2,0,2])for(const friction of [.8,1.35,1.8]){
    assert.ok(playPutt(distance,distance+extra,degrees,friction).sunk,`${distance} m, length error ${extra}, aim error ${degrees}°, friction ${friction}`);
  }
});

test('longer putts require enough length and do not rescue wide or overhit shots',()=>{
  for(const distance of [3,5]){
    assert.equal(playPutt(distance,1).sunk,false,'The starting slider value must not solve a long putt');
    assert.equal(playPutt(distance,distance-.6).sunk,false,'A putt left short must stay short');
  }
  for(const [distance,degrees] of [[3,8],[5,5]])for(const sign of [-1,1]){
    assert.equal(playPutt(distance,distance,degrees*sign).sunk,false,'A slow ball passing 40 cm wide must miss');
  }
  const overhit=playPutt(2.5,6);
  assert.equal(overhit.sunk,false,'Excess speed must carry the ball over the cup');
  assert.ok(overhit.x>5,'The cup must not brake an overhit ball');
});
