import * as THREE from 'three';
import { modelInstance } from './models.js';

// The moment the putt drops. The game slows to slow motion and the camera
// comes down to the cup. The ball curls round the lip, tips over the edge
// and drops into a real hole with a little bounce. Then the world's cup
// critter pops up with the ball in its mouth, gulps it down, chews, waves
// and ducks back into the hole before the scorecard shows. Molnskogen has a
// mole in a miner's helmet, Urverkets stad a cuckoo on a spring and
// Månkarnevalen an alien.

export const HOLE_RADIUS=.42,HOLE_DEPTH=.95;
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

// A real hole in the felt. A disc at the lip resets the depth buffer to "far"
// where the felt is seen, so the liner and the ball inside draw through it.
// Draw order: felt and everything else, then the hole (1), then the liner (2),
// then the ball and the critter (3).
export function createCupHole(scene,x,y,z,theme){
  const punch=new THREE.Mesh(new THREE.CircleGeometry(HOLE_RADIUS,40),new THREE.ShaderMaterial({
    vertexShader:'void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'void main(){gl_FragDepth=1.;gl_FragColor=vec4(0.);}',colorWrite:false,
  }));
  punch.rotation.x=-Math.PI/2;punch.position.set(x,y+.095,z);punch.renderOrder=1;scene.add(punch);
  // A pale cup liner at the top, then earth (or brass, or violet) going dark.
  const [band,top,bottom]=theme==='forest'?[0xf1ead8,0x8a6244,0x2a1a10]:theme==='moon'?[0xe8e0ff,0x6a56b0,0x1a1238]:[0xf0ca7e,0x9a7448,0x2a2018];
  const wall=new THREE.CylinderGeometry(HOLE_RADIUS,HOLE_RADIUS,HOLE_DEPTH,32,10,true),colors=[],p=wall.attributes.position;
  const a=new THREE.Color(top),b=new THREE.Color(bottom),c0=new THREE.Color(band);
  for(let i=0;i<p.count;i++){const k=(p.getY(i)+HOLE_DEPTH/2)/HOLE_DEPTH,c=k>.8?c0:b.clone().lerp(a,Math.pow(k/.8,1.5));colors.push(c.r,c.g,c.b)}
  wall.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const liner=new THREE.Mesh(wall,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.BackSide,roughness:.85,emissive:0x2a2018,emissiveIntensity:.6}));
  liner.position.set(x,y+.095-HOLE_DEPTH/2,z);liner.renderOrder=2;liner.receiveShadow=true;scene.add(liner);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(HOLE_RADIUS,32),new THREE.MeshStandardMaterial({color:bottom,roughness:1}));
  floor.rotation.x=-Math.PI/2;floor.position.set(x,y+.095-HOLE_DEPTH+.01,z);floor.renderOrder=2;scene.add(floor);
  return {punch,liner,floor};
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
      body.position.y=-1.35+(1.35+lift)*up;
      if(spring){spring.scale.set(1,Math.max(.02,body.position.y+.05),1);spring.position.y=-.05}
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
export const RESCUE={arrive:1.3,look:1.9,tap:2.2,leave:3.2,gone:4.4};
export const onTheLip=(ball,cup)=>Math.hypot(ball.x-cup.x,ball.z-cup.z)<LIP_RESCUE;

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
  const reach=theme==='clockwork'?1.05:theme==='moon'?.75:.72;
  const face=new THREE.Vector3(),stand=new THREE.Vector3(),from=new THREE.Vector3(),side=new THREE.Vector3();
  return {
    // `t` is time since the ball settled; `ball` where it stopped; `dir` the unit direction to the cup.
    update(t,ball,dir,camera){
      if(t>=RESCUE.gone){root.visible=false;if(mound)mound.visible=false;return}
      root.visible=true;
      const y=heightAt(ball.x,ball.z);
      stand.set(ball.x-dir.x*reach,y,ball.z-dir.z*reach);
      // Arrive from the side away from the camera so the walk-in is seen.
      side.set(-dir.z,0,dir.x);if(side.dot(new THREE.Vector3(camera.position.x-ball.x,0,camera.position.z-ball.z))>0)side.negate();
      from.copy(stand).addScaledVector(side,3.6);
      const towardCup=Math.atan2(dir.x,dir.z),towardCamera=Math.atan2(camera.position.x-stand.x,camera.position.z-stand.z);
      let heading=towardCup,walking=0;
      if(theme==='forest'){
        // Dig up, look about with the lamp on, tap, wave, dig back down.
        const rise=t<.4?0:t<1?ease((t-.4)/.6):t<RESCUE.leave?1:1-ease(Math.min(1,(t-RESCUE.leave)/.5));
        root.position.set(stand.x,y-1.25+1.25*rise,stand.z);
        mound.visible=true;mound.position.set(stand.x,y,stand.z);mound.scale.set(1,.45*Math.min(1,t/.5)*(t>RESCUE.gone-.6?Math.max(0,(RESCUE.gone-t)/.6):1),1);
        heading=t>1&&t<RESCUE.look?towardCamera:towardCup;
        if(parts.lamp)parts.lamp.material.emissiveIntensity=t>1&&t<RESCUE.look?2+Math.sin(t*20)*2:3;
        if(parts['paw-r'])parts['paw-r'].rotation.x=t>RESCUE.look&&t<RESCUE.tap+.2?-Math.sin(Math.min(1,(t-RESCUE.look)/(RESCUE.tap+.2-RESCUE.look))*Math.PI)*1.2:0;
        if(parts['paw-l'])parts['paw-l'].rotation.z=t>RESCUE.tap+.2&&t<RESCUE.leave?-.6-Math.sin(t*12)*.5:0;
      }else{
        // Walk (or hop) in, sit and look at the camera, swat, watch, wander off.
        const k=t<RESCUE.arrive?ease(t/RESCUE.arrive):t<RESCUE.leave?1:1-ease(Math.min(1,(t-RESCUE.leave)/(RESCUE.gone-RESCUE.leave)));
        root.position.lerpVectors(from,stand,k);root.position.y=y;
        walking=t<RESCUE.arrive||t>RESCUE.leave?1:0;
        heading=t<RESCUE.arrive?Math.atan2(stand.x-from.x,stand.z-from.z):t>RESCUE.leave?Math.atan2(from.x-stand.x,from.z-stand.z):towardCup;
        if(theme==='moon'&&walking)root.position.y+=Math.abs(Math.sin(t*9))*.35;
        if(theme==='clockwork'){
          for(const [n,ph] of [['leg-fl',0],['leg-br',0],['leg-fr',Math.PI],['leg-bl',Math.PI]])if(parts[n])parts[n].rotation.x=walking?Math.sin(t*11+ph)*.45:0;
          if(parts.head)parts.head.rotation.y=t>RESCUE.arrive&&t<RESCUE.look?THREE.MathUtils.clamp(towardCamera-towardCup,-1.2,1.2):0;
          if(parts.tail)parts.tail.rotation.z=Math.sin(t*3)*.35;
          // The swat: lift the paw, hold a beat, push.
          if(parts['leg-fr']&&!walking&&t>RESCUE.look-.1&&t<RESCUE.tap+.35){const s=(t-RESCUE.look+.1)/(RESCUE.tap+.35-RESCUE.look+.1);parts['leg-fr'].rotation.x=s<.6?-1.1*Math.sin(s/.6*Math.PI/2):-1.1+1.6*Math.sin((s-.6)/.4*Math.PI/2)}
        }
        if(theme==='moon'&&!walking&&t>RESCUE.look&&t<RESCUE.tap+.25)root.rotation.x=Math.sin((t-RESCUE.look)/(RESCUE.tap+.25-RESCUE.look)*Math.PI)*.35;else root.rotation.x=0;
      }
      root.rotation.y=heading;
      return {walking};
    },
    hide(){root.visible=false;if(mound)mound.visible=false},
  };
}
