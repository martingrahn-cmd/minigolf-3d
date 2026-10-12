import * as THREE from 'three';
import {forestKit,createForestSurface} from './forest.js';
import {LEVELS} from './levels.js';
import {trapdoorPose} from './trapdoors.js';

const {material,add,beam,tube,island,tree,fern,mushroom,crystal,fenceRuns,batchForestMeshes}=forestKit;
const level=LEVELS.find(l=>l.scenery==='crown');
const bark=material(0x58372e),wood=material(0xa17348),cut=material(0xdfb97c),rope=material(0xd6b77c);
const leaf=material(0x5c783b),rose=material(0xb87579),thorn=material(0xe1c6a0),gold=material(0xd7aa4c,{metalness:.25,roughness:.65});
const markMoving=group=>group.traverse(o=>{if(o.isMesh)o.userData.forestStatic=false});

function crown(parent,x,y,z,r){
  const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);
  const ring=add(group,new THREE.TorusGeometry(r,.12*r,7,40),gold);ring.rotation.x=Math.PI/2;
  for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7,px=Math.cos(a)*r,pz=Math.sin(a)*r;
    const point=add(group,new THREE.ConeGeometry(.2*r,.8*r,4),gold,px,.32*r,pz);point.rotation.y=-a;
    add(group,new THREE.IcosahedronGeometry(.105*r,1),material(0xc95c75,{emissive:0x7f2846,emissiveIntensity:.35}),px,.76*r,pz);
  }
  return group;
}

// Root petals split down the middle. Their hinges are outside the playable lane.
export function createTrapdoors(scene,doors){
  if(!doors?.length)return null;
  const panels=[];
  doors.forEach((d,index)=>{
    const x=(d.x1+d.x2)/2,length=d.x2-d.x1,flaps=[];
    for(const side of [-1,1]){
      const flap=new THREE.Group();flap.name=`root-flap-${index}-${side}`;

      add(flap,new THREE.BoxGeometry(length-.025,.16,d.halfWidth),index%2?rose:wood,0,-.08,-side*d.halfWidth/2);
      // Carved veins and segmented grain make each half read as a giant leaf.
      beam(flap,[-length/2+.12,.015,-side*d.halfWidth/2],[length/2-.12,.015,-side*d.halfWidth/2],.045,cut);
      for(let i=0;i<6;i++){
        const px=-length/2+.25+i*(length-.5)/5;
        beam(flap,[px,.015,-side*d.halfWidth/2],[px+.18,.016,-side*.08],.022,bark);
        beam(flap,[px,.015,-side*d.halfWidth/2],[px-.18,.016,-side*(d.halfWidth-.08)],.022,bark);
      }
      // Golden outer edges warn that the bridge has no side rails.
      for(let px=-length/2+.17;px<length/2;px+=.43)add(flap,new THREE.BoxGeometry(.22,.02,.12),gold,px,.025,-side*.08);
      batchForestMeshes(flap);markMoving(flap);
      flap.position.set(x,.04,d.z+side*d.halfWidth);scene.add(flap);
      flaps.push({group:flap,side});
      beam(scene,[d.x1,-.14,d.z+side*(d.halfWidth+.15)],[d.x2,-.14,d.z+side*(d.halfWidth+.15)],.1,bark);
      for(const end of [d.x1+.2,d.x2-.2]){
        const hinge=add(scene,new THREE.TorusGeometry(.14,.035,5,12),gold,end,-.12,d.z+side*d.halfWidth);hinge.rotation.y=Math.PI/2;
      }
    }
    const lightMat=material(0x9bd889,{emissive:0x5fbf71,emissiveIntensity:.7});
    const lanterns=[];
    for(const side of [-1,1]){
      const z=d.z+side*1.63;
      beam(scene,[x,-.3,z],[x,.85,z],.06,bark);
      const lamp=add(scene,new THREE.OctahedronGeometry(.2,0),lightMat,x,1.04,z);lamp.userData.forestStatic=false;lanterns.push(lamp);
      add(scene,new THREE.ConeGeometry(.29,.25,6),cut,x,1.3,z);
    }
    // Three repeaters at the tee show the same real states as the bridge lights.
    const repeater=add(scene,new THREE.OctahedronGeometry(.19,0),lightMat,-15.9,.95,1.95+index*.55);repeater.userData.forestStatic=false;
    panels.push({door:d,flaps,lightMat});
  });
  return{update(time){for(const {door,flaps,lightMat} of panels){
    const pose=trapdoorPose(time,door);
    for(const {group,side} of flaps)group.rotation.x=-side*pose.angle;
    const color=pose.signal==='green'?0x89e8a0:pose.signal==='amber'?0xffbf48:0xe65c65;
    lightMat.color.setHex(color);lightMat.emissive.setHex(color);lightMat.emissiveIntensity=pose.signal==='amber'?1:.55;
  }}};
}

export function createThornSpinner(group,spinner){
  const hub=add(group,new THREE.SphereGeometry(.36,14,8),rose,0,.28,0);hub.scale.y=.85;
  for(let i=0;i<spinner.axes*2;i++){
    const arm=new THREE.Group();arm.name=`thorn-arm-${i}`;arm.rotation.y=i*Math.PI/spinner.axes;group.add(arm);
    beam(arm,[.15,.23,0],[spinner.reach-spinner.radius,.23,0],spinner.radius,bark,spinner.radius,9);
    add(arm,new THREE.SphereGeometry(spinner.radius,10,8),bark,spinner.reach-spinner.radius,.23,0);
    tube(arm,[[.22,.42,0],[.7,.43,.04],[1.18,.39,-.025],[1.6,.4,0]],.035,leaf);
    for(const x of [.55,1.05,1.5]){
      const spine=add(arm,new THREE.ConeGeometry(.14,.42,5),thorn,x,.53,0);spine.rotation.z=-.4;
      const bud=add(arm,new THREE.SphereGeometry(.17,8,5),rose,x,.29,.1);bud.scale.set(.6,.65,.55);
    }
  }
  crown(group,0,.6,0,.3);markMoving(group);
}

function sentinel(scene,x,z,size){
  const root=new THREE.Group();root.position.set(x,0,z);root.scale.setScalar(size);scene.add(root);
  const body=add(root,new THREE.SphereGeometry(1,12,10),bark,0,1.5,0);body.scale.set(1,1.65,.77);
  for(const side of [-1,1]){
    const wing=add(root,new THREE.SphereGeometry(.8,9,6),wood,side*.8,1.2,.05);wing.scale.set(.3,1.3,.7);wing.rotation.z=-side*.17;
    add(root,new THREE.ConeGeometry(.32,.85,5),bark,side*.65,3,.02);
    for(let row=0;row<3;row++)for(let j=0;j<3-row;j++){
      const scale=add(root,new THREE.IcosahedronGeometry(.22,0),row%2?cut:wood,side*(.23+j*.2),.7+row*.25,.63);scale.scale.set(.9,1.2,.25);
    }
    const eye=add(root,new THREE.TorusGeometry(.36,.105,7,22),cut,side*.43,2.2,.71);
    add(root,new THREE.SphereGeometry(.245,12,8),material(0x9ec974,{emissive:0x507437,emissiveIntensity:.4}),side*.43,2.2,.74);
    add(root,new THREE.SphereGeometry(.105,10,6),bark,side*.43,2.18,.95);
    beam(root,[side*.35,0,.3],[side*.35,.3,.13],.14,wood);
    for(let toe=-1;toe<=1;toe++)beam(root,[side*.35,.1,.16],[side*.35+toe*.14,.06,.6],.065,thorn);
  }
  const beak=add(root,new THREE.ConeGeometry(.21,.5,4),gold,0,1.84,.88);beak.rotation.x=Math.PI;
  crown(root,0,3.02,0,.64);
  root.traverse(o=>{if(o.isMesh){o.userData.forestStatic=false;o.userData.forestOccluder=true;o.material=o.material.clone();o.material.transparent=true}});
}

export function createCrownScenery(scene,animated){
  for(const [x,z,s,seed] of [[-23,-5.8,1.05,47],[-17,-5.6,.7,61],[-24.4,3,.65,95],[-3,-5.8,1.05,38],[5.8,-3.8,.5,99],[24.8,-9.2,1.3,19]])tree(scene,x,0,z,s,seed,animated);
  sentinel(scene,-1.8,-4.8,1.45);sentinel(scene,22.3,-18.1,1.08);
  // The final island carries a royal, grown arch behind the cup, outside the green.
  tube(scene,[[15.2,0,-18.1],[15.6,3,-18.2],[18.5,5.1,-18.0],[21.4,3,-18.1],[22.2,0,-18.2]],.28,bark);
  tube(scene,[[15.5,0,-17.9],[16,3.1,-17.85],[18.4,4.85,-17.8],[21.2,2.9,-17.95],[22.3,0,-17.9]],.10,leaf);
  const royalCrown=crown(scene,18.5,5.25,-18.0,1.65);royalCrown.name='royal-crown';
  const band=add(royalCrown,new THREE.CylinderGeometry(1.65,1.55,.32,48,1,true),gold,0,.06,0);
  band.material=gold.clone();band.material.side=THREE.DoubleSide;
  for(const a of [0,Math.PI/2]){
    const arch=add(royalCrown,new THREE.TorusGeometry(1.58,.065,8,40,Math.PI),gold);
    arch.rotation.y=a;
  }
  crystal(royalCrown,0,1.72,0,.3,material(0xef8aaf,{emissive:0xc8436f,emissiveIntensity:.5}));
  for(const [x,z] of [[-23,-4.9],[-17,4.8],[-3.8,4.8],[4.8,-6],[14.5,-18.0],[22.6,-5.7]]){
    for(let i=0;i<5;i++){
      const dx=Math.sin(i*2.4)*.7,dz=Math.cos(i*2.4)*.55;
      fern(scene,x+dx,0,z+dz,.65,30+i);
      if(i%2)mushroom(scene,x-dx,0,z-dz,.35+i*.09,0xbb6b73);
    }
  }
  // Twisted brambles under the trap bridge frame the empty space without a floor.
  for(const side of [-1,1]){
    tube(scene,[[-15,-.55,side*2],[-12,-2.5,side*2.5],[-8,-3,side*2.5],[-4.2,-.55,side*2]],.17,bark);
    for(let i=0;i<8;i++){
      const x=-14+i*1.2,y=-1.1-Math.sin((x+15)/10.8*Math.PI)*1.5;
      const spike=add(scene,new THREE.ConeGeometry(.15,.65,5),thorn,x,y,side*2.4);spike.rotation.x=side*.5;
    }
  }
  for(const [x,z] of [[-16.5,4.2],[4.3,-6.5],[18.5,-18.1]])crystal(scene,x,-2,z,.8,material(0xdfb86d,{emissive:0x987531,emissiveIntensity:.5}));
}

export function createCrownCourse(scene,cells,boundaries,heightAt){
  const floor=createForestSurface(scene,cells.filter(c=>!(c.x1>=-15&&c.x2<=-4.2&&c.z1>=-1.2&&c.z2<=1.2)),heightAt);
  island(scene,[[-24,-4],[-25,-5.4],[-22,-7],[-17,-6.8],[-15,-4],[-15,4],[-17,5.5],[-22,5.1],[-24.5,3.8]],7,204);
  island(scene,[[-4.2,-4],[-4.7,-6.1],[-2,-7.2],[0,-7.2],[0,-12.15],[4,-12.15],[4,-8.85],[4.8,-6.8],[5.6,-4],[4,4],[1,5.2],[-3,5.1],[-4.2,4]],7.2,208);
  island(scene,[[14,-17.2],[14.4,-19],[18,-20],[23,-19.7],[25,-17.5],[25,-9],[24,-5.4],[20,-5.1],[14,-6.5]],7.8,215);
  // The thorn bridge's narrow deck is suspended between islands with open sides.
  // Keep the structural top BELOW the authored floor at y=.04. Coplanar faces
  // previously fought in both the colour and ambient-occlusion passes.
  const deck=add(scene,new THREE.BoxGeometry(10,.24,3.3),bark,9,-.14,-10.5);deck.name='thorn-bridge-support';
  for(const z of [-12.05,-8.95])tube(scene,[[4,-.2,z],[8,-1.6,z],[11,-1.5,z],[14,-.2,z]],.09,rope);
  for(const e of boundaries)if(!e.open)beam(scene,[e.ax,.16,e.az],[e.bx,.16,e.bz],.1,wood);
  const posts=new Set();
  for(const e of fenceRuns(boundaries)){
    const count=Math.ceil(Math.hypot(e.bx-e.ax,e.bz-e.az)/1.7);
    beam(scene,[e.ax,.65,e.az],[e.bx,.65,e.bz],.025,rope);
    for(let i=0;i<=count;i++){
      const x=e.ax+(e.bx-e.ax)*i/count,z=e.az+(e.bz-e.az)*i/count,key=`${x.toFixed(3)},${z.toFixed(3)}`;
      if(posts.has(key))continue;posts.add(key);
      beam(scene,[x,-.1,z],[x,.8,z],.07,bark,.055);add(scene,new THREE.ConeGeometry(.11,.13,4),cut,x,.86,z);
    }
  }
  for(const e of level.openEdges.filter(e=>e.x1>0))for(let x=e.x1+.15;x<e.x2;x+=.4)add(scene,new THREE.BoxGeometry(.22,.02,.12),gold,x,.065,e.z+(e.z<-10.5?.08:-.08));
  // A three-lamp sign has no text floating over the fairway.
  add(scene,new THREE.BoxGeometry(.2,.2,1.85),wood,-15.9,.67,2.5);
  for(const z of [1.7,3.3])beam(scene,[-15.9,0,z],[-15.9,1.4,z],.065,bark);
  crown(scene,-15.9,1.6,2.5,.35);
  batchForestMeshes(scene);return floor;
}
