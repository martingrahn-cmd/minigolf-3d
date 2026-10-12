import * as THREE from 'three';
import {clockKit as K,createGear} from './clockwork.js';
import {bellBridgePose} from './bell-bridge.js';

function bell(parent,r=1){
  const root=K.group(parent);
  const profile=[[.08,1.4],[.3,1.36],[.4,1.12],[.43,.78],[.55,.4],[.78,.13],[.96,.04],[1,.12],[.90,.23],[.65,.45],[.54,.84],[.47,1.23],[.28,1.49],[.08,1.5]].map(([x,y])=>new THREE.Vector2(x*r,y*r));
  K.add(root,new THREE.LatheGeometry(profile,48),K.brass);
  for(const y of [.12,.3,1.3])K.ring(root,(y<.2?.96:y<1?.75:.37)*r,.035*r,0,y*r,0,K.gold).rotation.x=Math.PI/2;
  K.rod(root,[0,.85*r,0],[0,-.03*r,0],.045*r,K.iron);
  K.add(root,new THREE.SphereGeometry(.13*r,16,10),K.copper,0,-.04*r,0);
  K.ring(root,.15*r,.05*r,0,1.63*r,0,K.iron);
  K.bake(root);return root;
}

export function createBellBridgeVisuals(scene,config){
  if(!config)return null;
  const statics=K.group(scene),moving=K.group(scene),length=config.x2-config.x1,w=config.halfWidth*2;
  const deck=K.group(moving,config.x1,.04,config.z);deck.name='klangbron-deck';
  const felt=new THREE.MeshStandardMaterial({color:0x3b8c7f,roughness:.9});
  // Planks have a solid underside; there is no hidden flat floor below the raised bridge.
  K.box(deck,length,.32,w,length/2,-.18,0,K.wood);
  K.box(deck,length,.025,w-.10,length/2,-.0125,0,felt);
  for(let x=.25;x<length;x+=.48){
    for(const side of [-1,1]){K.box(deck,.36,.07,.20,x,0,side*(w/2-.1),K.brass);K.bolt(deck,x,.045,side*(w/2-.1))}
    K.box(deck,.04,.012,w-.42,x,.007,0,K.woodLight);
  }
  for(const s of [-1,1]){
    K.box(deck,length,.18,.14,length/2,-.3,s*(w/2-.08),K.iron);
    K.rod(deck,[.2,-.4,s],[length-.2,-.4,s],.065,K.copper);
  }
  K.bake(deck);
  const gears=[],weights=[],ropes=[],bars=[],signals=[];
  const axle=K.add(statics,new THREE.CylinderGeometry(.18,.18,w+1.5,16),K.iron,config.x1,.06,config.z);axle.rotation.x=Math.PI/2;
  for(const side of [-1,1]){
    const z=config.z+side*(config.halfWidth+.45);
    K.box(statics,.45,5,.5,config.x1-.32,2.0,z,K.wood);
    for(const y of [.2,1.2,3.8,4.5])K.box(statics,.53,.14,.58,config.x1-.32,y,z,K.brass);
    const gear=createGear(moving,.8,20,.2);gear.position.set(config.x1,1.2,z);gears.push(gear);
    const weight=K.group(moving,config.x1-.9,-2.4,z);
    K.add(weight,new THREE.CylinderGeometry(.32,.32,1.5,12),K.copper);
    for(const y of [-.75,-.45,.45,.75])K.add(weight,new THREE.CylinderGeometry(.36,.36,.09,12),K.brass,0,y,0);
    K.bake(weight);weights.push(weight);
    const rope=K.rod(moving,[0,0,0],[0,1,0],.032,K.iron);ropes.push({rope,z});
    // A second cable connects the post pulley to the weight.
    K.rod(statics,[config.x1-.9,4.4,z],[config.x1-.9,-1.6,z],.03,K.iron);
    K.ring(statics,.3,.07,config.x1-.4,4.4,z,K.brass);
    const m=new THREE.MeshStandardMaterial({color:0xeb9c57,emissive:0xc98335,emissiveIntensity:.65});signals.push(m);
    K.add(statics,new THREE.SphereGeometry(.16,16,12),m,config.x1-.55,1.8,z);
    K.add(statics,new THREE.SphereGeometry(.12,12,8),m,config.x2+.3,.5,config.z+side*(config.halfWidth+.15));
  }
  K.box(statics,1,.24,w+1.6,config.x1-.4,4.6,config.z,K.woodLight);
  for(const x of [config.x1,config.x2]){
    const barrier=K.group(moving,x,0,config.z);barrier.name=`klangbron-barrier-${x}`;
    K.rod(barrier,[0,.28,-config.halfWidth],[0,.28,config.halfWidth],.1,K.brass);
    for(const s of [-1,1])K.rod(statics,[x,-.7,config.z+s*(config.halfWidth+.08)],[x,.35,config.z+s*(config.halfWidth+.08)],.085,K.iron);
    bars.push(barrier);
  }
  const s=config.switch;
  const button=K.group(moving,s.x,0,s.z);button.name='klangbron-button';
  K.add(button,new THREE.CylinderGeometry(s.r,s.r,.32,48),K.copper,0,.16,0);
  K.add(button,new THREE.CylinderGeometry(s.r-.08,s.r-.08,.07,48),K.gold,0,.36,0);
  K.ring(button,s.r-.12,.035,0,.41,0,K.ivory).rotation.x=Math.PI/2;
  // Raised bell emblem makes the target readable from the tee.
  K.box(button,.28,.025,.32,0,.408,0,K.iron);K.box(button,.45,.025,.07,0,.408,.18,K.iron);
  K.add(button,new THREE.SphereGeometry(.055,12,8),K.iron,0,.427,.26);
  K.bake(button);
  const glowMat=new THREE.MeshBasicMaterial({color:0xffcd78,transparent:true,opacity:.6,depthWrite:false});
  const pulse=K.ring(moving,.95,.035,s.x,.07,s.z,glowMat);pulse.rotation.x=Math.PI/2;
  const supportZ=-4.6;
  K.box(statics,.45,6.4,.5,s.x,1.7,supportZ,K.wood);
  K.rod(statics,[s.x,4.75,supportZ],[s.x,4.75,s.z],.13,K.brass);
  K.rod(statics,[s.x,3.6,supportZ],[s.x,4.7,s.z-.1],.09,K.copper);
  const swinging=K.group(moving,s.x,4.65,s.z);
  const hero=bell(swinging,1.05);hero.position.y=-1.75;
  const linkage=new THREE.CatmullRomCurve3([new THREE.Vector3(s.x,.15,s.z-1),new THREE.Vector3(s.x,.15,-3.6),new THREE.Vector3(-4,.15,-3.6),new THREE.Vector3(-1,.15,-2.7),new THREE.Vector3(0,.15,-2.0)]);
  K.add(statics,new THREE.TubeGeometry(linkage,40,.045,8,false),K.copper);
  const courier=K.add(moving,new THREE.SphereGeometry(.10,12,8),K.glow);courier.visible=false;
  // A little carillon workshop replaces the post equipment on this hole.
  const workshop=K.group(statics,-9,0,-7.8);
  K.box(workshop,5,.35,2.8,0,-.3,0,K.woodLight);
  for(const x of [-2.3,2.3])K.box(workshop,.22,5,.25,x,2.0,0,K.iron);
  K.box(workshop,5,.16,.27,0,4.5,0,K.brass);
  for(let i=0;i<5;i++){
    const x=-1.75+i*.87,len=2.2+i*.35;
    K.add(workshop,new THREE.CylinderGeometry(.22,.22,len,16),i%2?K.copper:K.brass,x,4.3-len/2,0);
    K.ring(workshop,.26,.045,x,4.2,0,K.gold).rotation.x=Math.PI/2;
    K.rod(workshop,[x,4.45,0],[x,4.0,0],.035,K.iron);
  }
  K.lantern(statics,-11.8,0,-7.1);
  const spare=bell(statics,.7);spare.position.set(-6.3,-.03,-7.4);
  // Two enormous gearing drums are seen through the real gap below the bridge.
  const underGears=[];
  for(const [x,r,speed] of [[1.9,2.1,.12],[5.55,1.65,-.15]]){
    const gear=createGear(moving,r,Math.round(r*12),.35);gear.position.set(x,-2.8,.2);gear.rotation.x=-Math.PI/2;
    underGears.push({gear,speed});K.rod(statics,[x,-6.9,.2],[x,-2.6,.2],.23,K.iron);
  }
  K.bake(statics);
  return {deck,update(state,time){
    const pose=bellBridgePose(state,config);deck.rotation.z=pose.angle;
    gears.forEach((g,i)=>g.rotation.z=(i?1:-1)*pose.angle*2.8);
    weights.forEach(w=>w.position.y=pose.weightY);
    for(const {rope,z} of ropes){
      const a=new THREE.Vector3(config.x1-.4,4.4,z),b=new THREE.Vector3(config.x1+Math.cos(pose.angle)*(length-.2),.04+Math.sin(pose.angle)*(length-.2),config.z+Math.sign(z-config.z)*(config.halfWidth-.1));
      rope.position.copy(a).add(b).multiplyScalar(.5);rope.scale.y=a.distanceTo(b);rope.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
    }
    bars.forEach(b=>b.position.y=pose.ready?-.65:0);
    for(const m of signals){m.color.setHex(pose.ready?0x80e2ae:0xe7a254);m.emissive.copy(m.color)}
    swinging.rotation.x=Math.sin(time*11)*state.ring*.13;
    button.position.y=-.40*Math.min(1,state.progress*4);
    pulse.scale.setScalar(1+(state.ring>0?Math.sin(time*9)*.13:Math.sin(time*2)*.025));
    glowMat.color.setHex(state.open?0x91ffcb:0xffcd78);
    courier.visible=state.open&&state.progress<1;
    if(courier.visible)courier.position.copy(linkage.getPointAt(state.progress));
    underGears.forEach(({gear,speed})=>gear.rotation.z=time*speed);
  }};
}
