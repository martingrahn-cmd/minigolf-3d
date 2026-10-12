import * as THREE from 'three';
import {clockKit as K,createGear} from './clockwork.js';
import {liftPose} from './lift.js';

const linkGeometry=new THREE.TorusGeometry(.072,.018,5,10);
function hangingChain(parent){
  const chain=new THREE.InstancedMesh(linkGeometry,K.iron,72);
  chain.castShadow=true;chain.frustumCulled=false;parent.add(chain);return chain;
}
const chainDummy=new THREE.Object3D();
function updateChain(chain,x,bottom,top,z){
  for(let i=0;i<chain.count;i++){
    const y=bottom+i*.14;chainDummy.position.set(x,y,z);chainDummy.rotation.set(0,i%2?Math.PI/2:0,0);
    chainDummy.scale.setScalar(y<top?1:0);chainDummy.updateMatrix();chain.setMatrixAt(i,chainDummy.matrix);
  }
  chain.instanceMatrix.needsUpdate=true;
}

export function createLiftVisuals(scene,c){
  if(!c)return null;
  const statics=K.group(scene),moving=K.group(scene),cx=(c.x1+c.x2)/2,w=c.halfWidth*2,roof=c.top+3.3;
  statics.name='counterweight-lift-tower';
  const cage=K.group(moving,cx,c.bottom,c.z);cage.name='lift-cage';
  K.box(cage,c.x2-c.x1,.32,w,0,-.16,0,K.wood);
  const deck=K.add(cage,new THREE.PlaneGeometry(c.x2-c.x1,w),new THREE.MeshStandardMaterial({color:0xb89860,metalness:.5,roughness:.48}),0,.04,0);deck.rotation.x=-Math.PI/2;deck.name='lift-playing-surface';
  for(const z of [-c.halfWidth,c.halfWidth]){
    for(const y of [.22,.75])K.rod(cage,[-2,y,z],[2,y,z],.075,K.brass);
    for(let x=-1.85;x<=1.9;x+=.6){K.rod(cage,[x,.05,z],[x,.8,z],.04,K.iron);K.bolt(cage,x,.08,z)}
    K.box(cage,4,.1,.13,0,.04,z,K.gold);
  }
  // Circular loading target and inlaid forward chevrons.
  K.ring(cage,1.14,.035,0,.065,0,K.ivory).rotation.x=Math.PI/2;
  K.ring(cage,.97,.018,0,.065,0,K.copper).rotation.x=Math.PI/2;
  for(const x of [-.45,.15]){
    K.rod(cage,[x-.2,.07,-.25],[x+.15,.07,0],.025,K.iron);
    K.rod(cage,[x+.15,.07,0],[x-.2,.07,.25],.025,K.iron);
  }
  const doors=[];
  const pusher=K.group(cage,-1.8,0,0);
  K.rod(pusher,[0,.31,-1.48],[0,.31,1.48],.10,K.copper);
  for(const z of [-1.3,1.3])K.box(pusher,.25,.22,.3,-.15,.2,z,K.iron);
  for(const x of [-2,2]){
    const gate=K.group(cage,x,0,0);gate.name=x<0?'lift-entry-door':'lift-exit-door';
    for(const y of [.24,.55,.86])K.rod(gate,[0,y,-c.halfWidth],[0,y,c.halfWidth],.055,K.gold);
    for(let z=-c.halfWidth;z<=c.halfWidth;z+=.4)K.rod(gate,[0,.18,z],[0,.92,z],.026,K.iron);
    doors.push(gate);
  }
  const wheels=[],cables=[];
  for(const z of [-1,1]){
    const sz=c.z+z*(c.halfWidth+.48);
    for(const x of [c.x1-.3,c.x2+.3]){
      K.box(statics,.4,roof+6.4,.46,x,(roof-6.4)/2,sz,K.wood);
      K.rod(statics,[x,-.5,sz],[x,roof+.2,sz],.085,K.brass);
      for(let y=-.3;y<roof;y+=.42)K.box(statics,.21,.12,.13,x+.23,y,sz,K.copper);
      for(const y of [c.bottom-.55,c.top-.55,roof-.2])K.box(statics,.55,.16,.6,x,y,sz,K.brass);
    }
    K.box(statics,5.4,.34,.8,cx,roof,sz,K.woodLight);
    const wheel=createGear(moving,.85,24,.24);wheel.position.set(cx,roof+.27,sz);wheels.push(wheel);
    const cable=hangingChain(moving);cables.push({cable,z:sz});
    K.rod(statics,[c.x1-.3,roof-.15,sz],[c.x2+.3,roof-1.35,sz],.07,K.copper);
  }
  // An open head frame leaves the ball visible from the elevated camera.
  for(const x of [c.x1-.3,c.x2+.3])K.box(statics,.32,.28,w+1.5,x,roof+.65,c.z,K.woodLight);
  for(const z of [-1,1])K.add(statics,new THREE.ConeGeometry(.23,.6,8),K.gold,c.x1-.3,roof+1.05,c.z+z*(c.halfWidth+.5));
  // A huge winding key gives this workshop its own silhouette.
  const key=K.group(statics,cx,roof+.2,c.z-c.halfWidth-.5);
  K.rod(key,[0,0,0],[0,1.6,0],.13,K.brass);
  for(const x of [-.6,.6]){const loop=K.ring(key,.64,.14,x,1.5,0,K.gold);loop.scale.y=.72}
  const weights=[],weightCables=[];
  for(const side of [-1,1]){
    const x=cx+side*.95,z=c.z+c.halfWidth+1.6,weight=K.group(moving,x,c.top+1,z);weight.name=`lift-weight-${side}`;
    K.box(weight,.9,1.6,.8,0,-.8,0,K.copper);
    for(const y of [0,-.35,-1.35,-1.6])K.box(weight,1.04,.13,.94,0,y,0,K.brass);
    for(const y of [-.55,-.8,-1.05])K.box(weight,.38,.045,.025,0,y,.413,K.gold);
    K.ring(weight,.2,.06,0,.22,0,K.iron);K.bake(weight);weights.push(weight);
    K.rod(statics,[x,-1,z-.5],[x,roof+.4,z-.5],.065,K.iron);
    K.rod(statics,[x,-1,z+.5],[x,roof+.4,z+.5],.065,K.iron);
    K.rod(statics,[x,roof+.4,z],[cx,roof+.4,c.z+c.halfWidth+.48],.05,K.iron);
    const cable=hangingChain(moving);weightCables.push({cable,x,z});
  }
  // Lighted floor indicator: lower and upper station, connected by a travel scale.
  const lamps=[];
  K.box(statics,1.5,2.1,.2,c.x1-.65,2.3,c.z+2.8,K.iron);
  for(const [y,rise] of [[1.78,0],[2.86,1]]){
    const material=new THREE.MeshStandardMaterial({color:0x94e7b7,emissive:0x71d9ad,emissiveIntensity:.6});lamps.push(material);
    K.add(statics,new THREE.CircleGeometry(.20,24),material,c.x1-.65,y,c.z+2.92);
    K.ring(statics,.24,.03,c.x1-.65,y,c.z+2.94,K.gold);
    for(let i=0;i<=rise;i++)K.box(statics,.045,.25,.035,c.x1-.73+i*.15,y,c.z+2.95,K.ivory);
  }
  const pointer=K.add(moving,new THREE.SphereGeometry(.08,12,8),K.glow,c.x1-.15,1.78,c.z+2.95);
  K.rod(statics,[c.x1-.15,1.78,c.z+2.93],[c.x1-.15,2.86,c.z+2.93],.025,K.brass);
  // Cross-braces and a wooden service gantry support the high landing.
  for(const z of [-2.4,2.4]){
    K.rod(statics,[c.x2+2,-5.5,z],[c.x2+2,c.top-1,z],.17,K.iron);
    K.rod(statics,[c.x2+2,c.top-3,z],[c.x2+5,c.top-.8,z],.14,K.woodLight);
  }
  // Black/brass lip flags mark the genuine open drop at the bottom of the run.
  for(let z=-2.7;z<3;z+=.44)K.box(statics,.3,.03,.22,21.83,.66,z,z%1>.5?K.iron:K.gold);
  K.lantern(statics,c.x1-1,0,-4.5);K.lantern(statics,c.x2+.7,c.top,-3.6);
  // Keep the deck as a separate raycast surface; only bake the static tower.
  K.bake(statics);
  return {cage,deck,weights,update(state){
    const p=liftPose(state,c);cage.position.y=p.y;
    pusher.position.x=-1.8+p.exit*Math.max(0,(state.entry?.x??cx)-cx-.4+1.8);
    pusher.position.y=-.65*(1-p.exit);
    doors[0].position.y=p.entry*1.8;doors[1].position.y=p.exit*1.8;
    wheels.forEach((wheel,i)=>wheel.rotation.z=p.rise*(i?1:-1)*5.4/.85);
    weights.forEach(weight=>weight.position.y=p.weightY);
    for(const {cable,z} of cables)updateChain(cable,cx,p.y+.8,roof+.27,z);
    for(const {cable,x,z} of weightCables)updateChain(cable,x,p.weightY+.25,roof+.4,z);
    pointer.position.y=1.78+p.rise*1.08;
    lamps.forEach((m,i)=>{const active=i?state.mode==='top':state.mode==='bottom';m.emissiveIntensity=active?1.2:.05;m.color.setHex(active?0xa4f1bd:0x45514c)});
  }};
}
