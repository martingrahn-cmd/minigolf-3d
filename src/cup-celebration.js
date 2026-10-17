import * as THREE from 'three';
import { modelInstance } from './models.js';

// The moment the putt drops. The game slows to slow motion and the camera
// comes down to the cup. The ball curls round the lip, tips over the edge
// and drops into a real hole with a little bounce. Then the world's cup
// critter pops up with the ball in its mouth, gulps it down, chews, waves
// and ducks back into the hole before the scorecard shows. Molnskogen has a
// mole in a miner's helmet, Urverkets stad a cuckoo on a spring and
// Månkarnevalen an alien.

export const HOLE_RADIUS=.55,HOLE_DEPTH=1.05;
// The opening sits just above the felt (+0.04) and its flush edge ring (+0.047).
const LIP=.05;
// Timeline, in game seconds from the capture (the first part plays in slow motion).
export const SINK={rim:.35,drop:.6,settle:.8,rise:1.15,gulp:1.6,swallowed:1.8,duck:2.9,done:3.3};
export const SLOW_MOTION=.38;

const ease=t=>t*t*(3-2*t);
const clamp01=t=>Math.max(0,Math.min(1,t));

// Where the ball is during the sink, relative to the cup centre and the felt.
// It curls round the lip in the direction it was rolling, tips over the edge,
// drops and bounces on the bottom. `entry` is its offset and velocity at capture.
export function sinkPose(t,entry){
  const d0=Math.max(.05,Math.hypot(entry.x,entry.z)),a0=Math.atan2(entry.z,entry.x);
  // Curl the way the ball was travelling round the cup.
  const turn=Math.sign(entry.x*entry.vz-entry.z*entry.vx)||1;
  let r,a,y;
  if(t<SINK.rim){const k=ease(t/SINK.rim);r=d0+(.2-d0)*k;a=a0+turn*1.1*k;y=-.12*k*k}
  else if(t<SINK.drop){const k=(t-SINK.rim)/(SINK.drop-SINK.rim);r=.2-.1*k;a=a0+turn*(1.1+.4*k);y=-.12-.48*k*k}
  else{const k=clamp01((t-SINK.drop)/(SINK.settle-SINK.drop));r=.1;a=a0+turn*1.5;y=-.6+Math.sin(k*Math.PI)*.07*(1-k*.5)}
  return {x:Math.cos(a)*r,z:Math.sin(a)*r,y,done:t>=SINK.settle};
}

// A real hole in the felt, cut with the stencil buffer in two passes after
// everything else that is opaque has drawn. First the opening marks the pixels
// where it can be seen (nothing in front of it); then, on just those pixels, the
// depth is pushed back to "far", so the liner and the ball inside can draw
// through the felt. Draw order: the scene (0), the cut (1, 1.5), the liner (2),
// the ball and the critter (3). The renderer needs a stencil buffer.
export function createCupHole(scene,x,y,z,theme){
  const disc=new THREE.CircleGeometry(HOLE_RADIUS,48);
  const mark=new THREE.Mesh(disc,new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,
    stencilWrite:true,stencilRef:1,stencilFunc:THREE.AlwaysStencilFunc,stencilZPass:THREE.ReplaceStencilOp}));
  const clear=new THREE.Mesh(disc,new THREE.ShaderMaterial({
    vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'void main(){gl_FragDepth=1.;gl_FragColor=vec4(0.);}',colorWrite:false,depthFunc:THREE.AlwaysDepth,
    stencilWrite:true,stencilRef:1,stencilFunc:THREE.EqualStencilFunc,stencilZPass:THREE.KeepStencilOp,
  }));
  for(const [mesh,order] of [[mark,1],[clear,1.5]]){mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y+LIP,z);mesh.renderOrder=order;mesh.castShadow=false;scene.add(mesh)}
  // A pale cup liner at the top, then earth (or brass, or violet) going dark.
  const [band,top,bottom]=theme==='forest'?[0xf1ead8,0x8a6244,0x2a1a10]:theme==='moon'?[0xe8e0ff,0x6a56b0,0x1a1238]:[0xf0ca7e,0x9a7448,0x2a2018];
  const wall=new THREE.CylinderGeometry(HOLE_RADIUS,HOLE_RADIUS,HOLE_DEPTH,32,10,true),colors=[],p=wall.attributes.position;
  const a=new THREE.Color(top),b=new THREE.Color(bottom),c0=new THREE.Color(band);
  for(let i=0;i<p.count;i++){const k=(p.getY(i)+HOLE_DEPTH/2)/HOLE_DEPTH,c=k>.86?c0.clone().multiplyScalar(.8+.2*(k-.86)/.14):b.clone().lerp(a,Math.pow(k/.86,1.6));colors.push(c.r,c.g,c.b)}
  wall.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  // Unlit, so the walls read clearly as a shaft going down whatever the lighting.
  const liner=new THREE.Mesh(wall,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide}));
  liner.position.set(x,y+LIP-HOLE_DEPTH/2,z);liner.renderOrder=2;liner.receiveShadow=true;scene.add(liner);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(HOLE_RADIUS,32),new THREE.MeshBasicMaterial({color:new THREE.Color(bottom).multiplyScalar(.7)}));
  floor.rotation.x=-Math.PI/2;floor.position.set(x,y+LIP-HOLE_DEPTH+.01,z);floor.renderOrder=2;scene.add(floor);
  return {mark,clear,liner,floor};
}

function springGeometry(){
  const pts=[];for(let i=0;i<=120;i++){const a=i/120*Math.PI*14;pts.push(new THREE.Vector3(Math.cos(a)*.16,i/120,Math.sin(a)*.16))}
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),240,.025,6,false);
}

// The critter for this world, hidden in the hole until it is called.
export function createCupCritter(scene,theme,cup){
  const name=theme==='forest'?'forest/mole':theme==='clockwork'?'clockwork/cuckoo-bird':theme==='moon'?'moon/alien':null;
  const model=name&&modelInstance(name);if(!model)return null;
  const root=new THREE.Group();root.position.set(cup.x,cup.y,cup.z);root.visible=false;scene.add(root);
  const body=new THREE.Group();root.add(body);body.add(model);
  if(theme==='moon')model.scale.setScalar(.95);
  const parts={};model.traverse(o=>{if(o.name)parts[o.name]=o;if(o.isMesh){o.renderOrder=3;o.castShadow=true}});
  let spring=null;
  if(theme==='clockwork'){
    spring=new THREE.Mesh(springGeometry(),new THREE.MeshStandardMaterial({color:0xf0ca7e,metalness:.7,roughness:.3}));
    spring.renderOrder=3;root.add(spring);
  }
  const mouth=new THREE.Vector3(...(theme==='forest'?[0,.56,.38]:theme==='clockwork'?[0,.5,.5]:[0,.5,.55]));
  const out=new THREE.Vector3();
  return {
    // `t` is game time since the capture; returns where the ball sits (in its mouth) and how big it is.
    update(t,camera){
      const active=t>=SINK.settle&&t<SINK.done;root.visible=active;if(!active)return null;
      root.rotation.y=Math.atan2(camera.position.x-cup.x,camera.position.z-cup.z);
      // Up out of the hole with a little overshoot, and back down at the end.
      const up=t<SINK.rise?(()=>{const k=clamp01((t-SINK.settle)/(SINK.rise-SINK.settle));return 1+2.7*Math.pow(k-1,3)+1.7*Math.pow(k-1,2)})():t<SINK.duck?1:1-ease(clamp01((t-SINK.duck)/(SINK.done-SINK.duck)));
      const lift=theme==='clockwork'?.7:0;
      // It starts below the cup's floor so nothing shows until it comes up.
      body.position.y=-2.3+(2.3+lift)*up;
      if(spring){spring.visible=body.position.y>.05;spring.scale.set(1,Math.max(.02,body.position.y+.05),1);spring.position.y=-.05}
      // Gulp: squash and stretch; then chew.
      let sy=1,sxz=1;
      if(t>SINK.gulp&&t<SINK.swallowed){const k=(t-SINK.gulp)/(SINK.swallowed-SINK.gulp);sy=1-.18*Math.sin(k*Math.PI);sxz=1+.14*Math.sin(k*Math.PI)}
      if(t>=SINK.swallowed&&t<SINK.duck){const k=t-SINK.swallowed;sy=1+Math.sin(k*18)*.05*Math.max(0,1-k/1.1);sxz=1-Math.sin(k*18)*.03*Math.max(0,1-k/1.1)}
      body.scale.set(sxz,sy,sxz);
      // A wave of a paw, a flap of wings, a wobble.
      const happy=t>SINK.swallowed&&t<SINK.duck?Math.sin((t-SINK.swallowed)*10):0;
      if(parts['paw-r'])parts['paw-r'].rotation.z=.4+happy*.5+(t>SINK.swallowed?.8:0);
      if(parts['paw-l'])parts['paw-l'].rotation.z=t<SINK.gulp?-.6:-.2;
      if(parts['wing-l'])parts['wing-l'].rotation.z=-.3-Math.abs(Math.sin(t*16))*.7;
      if(parts['wing-r'])parts['wing-r'].rotation.z=.3+Math.abs(Math.sin(t*16))*.7;
      if(parts.beak)parts.beak.rotation.x=t<SINK.gulp?.45:t<SINK.swallowed?-.1:Math.max(0,Math.sin(t*14))*.4;
      if(theme==='moon')body.rotation.z=happy*.15;
      // The ball rides in the mouth, then disappears down it.
      root.updateMatrixWorld(true);out.copy(mouth).applyMatrix4(body.matrixWorld);
      const scale=t<SINK.gulp?.75:t<SINK.swallowed?.75*(1-clamp01((t-SINK.gulp)/(SINK.swallowed-SINK.gulp))):0;
      return {ball:out,scale};
    },
    hide(){root.visible=false},
  };
}

// --- On the lip. When the ball stops right at the edge of the cup, a friend
// comes to help it in: in Molnskogen the mole digs up beside it, helmet lamp
// lit, and taps it; in Urverkets stad a cat strolls over and, being a cat,
// pushes it over the edge with a paw; on the moon an alien hops in and boops it.
export const LIP_RESCUE=.85;
// Arrive, look at the camera, the push, watch, leave.
export const RESCUE={arrive:1.3,look:1.9,tap:3.05,leave:3.9,gone:5.1};
// A paw swing: wind up, strike forward, settle. 0 at rest, negative lifted, positive pushed through.
function swing(t,at,amp){
  const s=(t-(at-.42))/.6;if(s<0||s>1.5)return 0;
  if(s<.7)return -amp*1.1*Math.sin(s/.7*Math.PI/2);
  if(s<1)return -amp*1.1+amp*1.7*Math.sin((s-.7)/.3*Math.PI/2);
  return amp*.6*(1-(s-1)/.5);
}
const pawAt=t=>swing(t,RESCUE.tap,1);
export const onTheLip=(ball,cup)=>Math.hypot(ball.x-cup.x,ball.z-cup.z)<LIP_RESCUE;

const smoother=t=>{t=clamp01(t);return t*t*t*(t*(t*6-15)+10)};
// Exponential smoothing towards a target; for angles, the short way round.
const damp=(current,target,rate,dt)=>target+(current-target)*Math.exp(-rate*dt);
const dampAngle=(current,target,rate,dt)=>{const d=Math.atan2(Math.sin(target-current),Math.cos(target-current));return current+d*(1-Math.exp(-rate*dt))};
// The cat's front-leg angle for one paw strike landing at `at` (negative swings
// the paw forward and up): raise it slowly up high, hover, swipe down and
// forward onto the ball, hold, and draw it back.
export const PAW_RAISED=-2.05,PAW_STRIKE=-1.45;
export function catPaw(t,at){
  const u=t-at;
  if(u<=-.6||u>=.55)return 0;
  if(u<=-.22)return PAW_RAISED*smoother((u+.6)/.38);
  if(u<=-.09)return PAW_RAISED+Math.sin((u+.22)/.13*Math.PI)*.05;
  if(u<=0){const k=(u+.09)/.09;return PAW_RAISED+(PAW_STRIKE-PAW_RAISED)*k*k}
  if(u<=.14)return PAW_STRIKE;
  return PAW_STRIKE*(1-smoother((u-.14)/.41));
}

export function createLipRescuer(scene,theme,heightAt){
  const name=theme==='forest'?'forest/mole':theme==='clockwork'?'clockwork/house-cat':theme==='moon'?'moon/alien':null;
  const model=name&&modelInstance(name);if(!model)return null;
  const root=new THREE.Group();root.rotation.order='YXZ';root.visible=false;scene.add(root);root.add(model);
  if(theme==='clockwork')model.scale.setScalar(.85);
  const parts={};model.traverse(o=>{if(o.name)parts[o.name]=o;if(o.isMesh)o.castShadow=true});
  let mound=null;
  if(theme==='forest'){
    mound=new THREE.Mesh(new THREE.SphereGeometry(.55,14,8,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:0x6b4a33,roughness:1,flatShading:true}));
    mound.scale.set(1,.45,1);mound.visible=false;scene.add(mound);
  }
  const lamp=parts.lamp?.material;if(lamp){parts.lamp.material=lamp.clone()}
  // How far behind the ball the helper stands to reach it.
  const reach=theme==='clockwork'?1.05:theme==='moon'?.78:.74;
  const face=new THREE.Vector3(),stand=new THREE.Vector3(),from=new THREE.Vector3(),side=new THREE.Vector3();
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()),pos=new THREE.Vector3(),tangent=new THREE.Vector3();
  // The cat's smoothed pose, carried from frame to frame.
  const cat={last:-1,heading:0,head:0,tilt:0,pitch:0,gait:0,phase:0,crouch:0,tail:0};
  function animateCat(t,y,towardCup,towardCamera){
    const dt=t<cat.last||cat.last<0?0:Math.min(.1,t-cat.last);
    // A gentle arc in from the side, and the same arc back out.
    const mid=from.clone().lerp(stand,.5).addScaledVector(face,-.9);
    curve.v0.copy(from);curve.v1.copy(mid);curve.v2.copy(stand);
    const leaving=t>RESCUE.leave,s=t<RESCUE.arrive?smoother(t/RESCUE.arrive):leaving?1-smoother((t-RESCUE.leave)/(RESCUE.gone-RESCUE.leave-.2)):1;
    curve.getPoint(s,pos);curve.getTangent(Math.min(.999,Math.max(.001,s)),tangent);
    const moved=cat.last<0?0:pos.distanceTo(root.position.clone().setY(pos.y)),speed=dt>0?moved/dt:0;
    if(cat.last<0){cat.heading=Math.atan2(tangent.x,tangent.z);cat.last=t}
    root.position.set(pos.x,y,pos.z);
    // Face along the path while walking, at the ball otherwise; turns are smoothed.
    const walkingOut=leaving&&s<.995,walkingIn=t<RESCUE.arrive*.98;
    const target=walkingIn?Math.atan2(tangent.x,tangent.z):walkingOut?Math.atan2(-tangent.x,-tangent.z):towardCup;
    cat.heading=dampAngle(cat.heading,target,walkingIn||walkingOut?7:4.5,dt);
    // Gait follows the distance walked, so the paws do not slide; it fades in and out.
    cat.gait=damp(cat.gait,Math.min(1,speed/2.2),8,dt);cat.phase+=moved/.62*Math.PI;
    const g=cat.gait;
    for(const [n,ph] of [['leg-fl',0],['leg-br',0],['leg-fr',Math.PI],['leg-bl',Math.PI]])if(parts[n])parts[n].rotation.x=Math.sin(cat.phase+ph)*.5*g;
    // Looking: at the camera on arrival with a curious tilt, then at the ball.
    // And a sideways glance at the camera just as it pushes, the way cats do.
    const lookAtCamera=(t>RESCUE.arrive-.1&&t<RESCUE.look+.15)||(t>RESCUE.tap-.25&&t<RESCUE.tap+.7);
    const yaw=lookAtCamera?THREE.MathUtils.clamp(Math.atan2(Math.sin(towardCamera-cat.heading),Math.cos(towardCamera-cat.heading)),-1.1,1.1):0;
    cat.head=damp(cat.head,yaw,6,dt);cat.tilt=damp(cat.tilt,lookAtCamera?.28:0,4,dt);
    // A small nod towards the ball; the head stays well clear of it.
    const aiming=t>RESCUE.look+.15&&t<RESCUE.tap+.1;
    cat.pitch=damp(cat.pitch,aiming?.08:t>RESCUE.tap+.1&&t<RESCUE.leave?.15:0,6,dt);
    if(parts.head)parts.head.rotation.set(cat.pitch,cat.head,cat.tilt);
    // Crouch and wiggle before the real push.
    cat.crouch=damp(cat.crouch,t>RESCUE.tap-1&&t<RESCUE.tap+.05?1:0,5,dt);
    model.position.y=Math.abs(Math.sin(cat.phase))*.035*g-cat.crouch*.06;
    model.rotation.z=Math.sin(t*13)*.035*Math.max(0,cat.crouch-.5)*2+Math.sin(cat.phase)*.03*g;
    // One careful paw strike. The leg stretches a little as it reaches out level,
    // so the paw touches the ball while the nose stays well clear of it.
    if(parts['leg-fr']&&g<.5){const a=catPaw(t,RESCUE.tap);parts['leg-fr'].rotation.x=a;parts['leg-fr'].scale.y=1+.38*clamp01((-a-.3)/(-PAW_STRIKE-.3))}
    else if(parts['leg-fr'])parts['leg-fr'].scale.y=1;
    // The tail stands up while walking and swishes slowly while watching.
    cat.tail=damp(cat.tail,g>.3?-.5:0,4,dt);
    if(parts.tail)parts.tail.rotation.set(cat.tail,0,Math.sin(t*2.1)*(.25+.15*(1-g)));
    root.rotation.set(cat.crouch*.06,cat.heading,0);
    cat.last=t;
  }
  return {
    // `t` is time since the ball settled; `ball` where it stopped; `dir` the unit direction to the cup.
    update(t,ball,dir,camera){
      if(t>=RESCUE.gone){root.visible=false;if(mound)mound.visible=false;cat.last=-1;return}
      root.visible=true;
      const y=heightAt(ball.x,ball.z);
      stand.set(ball.x-dir.x*reach,y,ball.z-dir.z*reach);
      // Arrive from the side away from the camera so the walk-in is seen.
      side.set(-dir.z,0,dir.x);if(side.dot(new THREE.Vector3(camera.position.x-ball.x,0,camera.position.z-ball.z))>0)side.negate();
      from.copy(stand).addScaledVector(side,3.6);face.set(dir.x,0,dir.z);
      const towardCup=Math.atan2(dir.x,dir.z),towardCamera=Math.atan2(camera.position.x-stand.x,camera.position.z-stand.z);
      let heading=towardCup,walking=0;
      if(theme==='clockwork'){animateCat(t,y,towardCup,towardCamera);return {walking:cat.gait>.3}}
      if(theme==='forest'){
        // Dig up, look about with the lamp on, tap, wave, dig back down.
        const rise=t<.4?0:t<1?ease((t-.4)/.6):t<RESCUE.leave?1:1-ease(Math.min(1,(t-RESCUE.leave)/.5));
        root.position.set(stand.x,y-1.25+1.25*rise,stand.z);
        mound.visible=true;mound.position.set(stand.x,y,stand.z);mound.scale.set(1,.45*Math.min(1,t/.5)*(t>RESCUE.gone-.6?Math.max(0,(RESCUE.gone-t)/.6):1),1);
        heading=t>1&&t<RESCUE.look?towardCamera:towardCup;
        if(parts.lamp)parts.lamp.material.emissiveIntensity=t>1&&t<RESCUE.look?2+Math.sin(t*20)*2:3;
        if(parts['paw-r'])parts['paw-r'].rotation.x=-pawAt(t);
        if(parts['paw-l'])parts['paw-l'].rotation.z=t>RESCUE.tap+.2&&t<RESCUE.leave?-.6-Math.sin(t*12)*.5:0;
      }else{
        // Walk (or hop) in, sit and look at the camera, swat, watch, wander off.
        const k=t<RESCUE.arrive?ease(t/RESCUE.arrive):t<RESCUE.leave?1:1-ease(Math.min(1,(t-RESCUE.leave)/(RESCUE.gone-RESCUE.leave)));
        root.position.lerpVectors(from,stand,k);root.position.y=y;
        walking=t<RESCUE.arrive||t>RESCUE.leave?1:0;
        heading=t<RESCUE.arrive?Math.atan2(stand.x-from.x,stand.z-from.z):t>RESCUE.leave?Math.atan2(from.x-stand.x,from.z-stand.z):towardCup;
        if(theme==='moon'&&walking)root.position.y+=Math.abs(Math.sin(t*9))*.35;
        root.rotation.x=theme==='moon'&&!walking?Math.max(0,pawAt(t))*.35:0;
      }
      root.rotation.y=heading;
      return {walking};
    },
    hide(){root.visible=false;if(mound)mound.visible=false;cat.last=-1},
  };
}
