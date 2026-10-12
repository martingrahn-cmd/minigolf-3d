import * as THREE from 'three';
import { forestKit, createForestSurface } from './forest.js';
import { LEVELS } from './levels.js';
import { pendulumPose } from './pendulum.js';

const {material,add,beam,tube,island,tree,fern,mushroom,crystal,fenceRuns,batchForestMeshes}=forestKit;
const level=LEVELS.find(l=>l.scenery==='acorn');
const bark=material(0x69452e),wood=material(0xa87843),cut=material(0xe5bb78),rope=material(0xd8bd88),moss=material(0x50772a);
const gold=material(0xb97933,{roughness:.65,flatShading:false});
const capMat=material(0x62432e),scaleMat=material(0x926342);

function acorn(parent,r=1){
  const nut=new THREE.Group();parent.add(nut);nut.scale.setScalar(r);
  // A rounded, carved seed with a pointed tip, fluted shell and overlapping cap.
  const profile=[[0,-1.04],[.27,-.99],[.66,-.77],[.91,-.43],[1,-.03],[.96,.38],[.82,.68],[0,.76]];
  add(nut,new THREE.LatheGeometry(profile.map(([x,y])=>new THREE.Vector2(x,y)),32),gold);
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8;
    tube(nut,[[.26,-.975],[.66,-.76],[.92,-.42],[1.005,0],[.945,.38]].map(([r,y])=>[Math.cos(a)*r,y,Math.sin(a)*r]),.013,wood);
  }
  const cap=add(nut,new THREE.SphereGeometry(1.06,20,10,0,Math.PI*2,0,Math.PI/2),capMat,0,.34,0);cap.scale.y=.61;
  const rim=add(nut,new THREE.TorusGeometry(1.04,.085,6,32),bark,0,.37,0);rim.rotation.x=Math.PI/2;
  for(let row=0;row<4;row++){
    const y=.4+row*.145,rr=Math.sqrt(1-((y-.34)/.65)**2)*1.07,count=24-row*4;
    for(let i=0;i<count;i++){
      const a=(i+row*.5)*Math.PI*2/count;
      const scale=add(nut,new THREE.IcosahedronGeometry(.16,0),row%2?scaleMat:wood,Math.cos(a)*rr,y,Math.sin(a)*rr);
      scale.scale.set(.8,.65,.32);scale.rotation.y=Math.PI/2-a;scale.rotation.z=.25;
    }
  }
  tube(nut,[[0,.91,0],[.06,1.15,0],[.23,1.29,.05]],.095,bark);
  return nut;
}

function lantern(scene,x,z){
  beam(scene,[x,0,z],[x,1.6,z],.07,bark,.04);
  tube(scene,[[x,1.5,z],[x+.18,1.83,z],[x+.54,1.65,z],[x+.54,1.48,z]],.035,wood);
  const light=material(0xffd57b,{emissive:0xffbc51,emissiveIntensity:.8});
  const seed=acorn(scene,.2);seed.position.set(x+.54,1.14,z);
  // A luminous window inset into each seed lantern.
  add(scene,new THREE.SphereGeometry(.125,10,8),light,x+.54,1.16,z+.13);
}

function stumpHouse(scene,x,z){
  const house=new THREE.Group();house.position.set(x,0,z);scene.add(house);
  add(house,new THREE.CylinderGeometry(.94,1.25,2.4,9),bark,0,1.2,0);
  add(house,new THREE.CylinderGeometry(.96,.96,.15,9),cut,0,2.43,0);
  const roof=add(house,new THREE.ConeGeometry(1.5,1.25,9),moss,0,2.96,0);roof.rotation.y=.17;
  for(let i=0;i<9;i++){
    const a=i*Math.PI*2/9;
    beam(house,[Math.cos(a)*1.02,0,Math.sin(a)*1.02],[Math.cos(a)*.88,2.35,Math.sin(a)*.88],.09,wood,.06);
    beam(house,[Math.cos(a)*1.55,-.07,Math.sin(a)*1.55],[Math.cos(a)*.9,.8,Math.sin(a)*.9],.12,bark,.19);
  }
  const door=add(house,new THREE.CircleGeometry(.47,16),material(0x432c23),0,.65,1.08);door.scale.y=1.3;
  const frame=add(house,new THREE.TorusGeometry(.5,.075,5,20),cut,0,.65,1.09);frame.scale.y=1.3;
  add(house,new THREE.SphereGeometry(.07,8,6),cut,.22,.59,1.11);
  const windowMat=material(0xffdf8c,{emissive:0xf3a03b,emissiveIntensity:.45});
  const win=add(house,new THREE.CircleGeometry(.29,12),windowMat,0,1.82,.96);
  beam(house,[-.29,1.82,.99],[.29,1.82,.99],.025,bark);
  beam(house,[0,1.53,.99],[0,2.11,.99],.025,bark);
  add(house,new THREE.TorusGeometry(.3,.055,5,16),wood,win.position.x,win.position.y,.99);
  for(let i=0;i<3;i++)add(house,new THREE.BoxGeometry(1.1+i*.14,.14,.3),wood,0,.11-i*.04,1.16+i*.27);
  // Camera-facing scenery uses the forest's normal occlusion fade.
  house.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.userData.forestStatic=false;o.userData.forestOccluder=true}});
}

export function createAcornScenery(scene,animated){
  const p=level.pendulum;
  // Two root piers stand on their own rock outcrops, with visible air between
  // them and the unguarded striking zone on the fairway.
  for(const side of [-1,1]){
    const z=side*5.2;
    island(scene,[[p.x-1.3,z-1],[p.x+.8,z-1.15],[p.x+1.35,z],[p.x+.7,z+1.12],[p.x-1,z+.95]],4.6,44+side);
    tube(scene,[[p.x,0,z],[p.x-.3,2.1,z],[p.x-.05,4.2,z*.92],[p.x,5.95,z*.55]],.26,bark);
    tube(scene,[[p.x+.62,0,z+.3],[p.x+.17,1.25,z],[p.x-.2,3.8,z*.93]],.14,wood);
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;
      tube(scene,[[p.x+Math.cos(a),0,z+Math.sin(a)*.7],[p.x+Math.cos(a)*.35,.22,z+Math.sin(a)*.3],[p.x,.8,z]],.14,bark);
    }
    fern(scene,p.x-.6,.05,z-.4,.9,41+side);
    mushroom(scene,p.x+.6,0,z+.3,.7,0xda9557);
  }
  tube(scene,[[p.x,5.95,-2.9],[p.x,6.12,-1.4],[p.x,5.98,0],[p.x,6.13,1.5],[p.x,5.95,2.9]],.25,bark);
  for(const z of [-1.9,1.9]){
    tube(scene,[[p.x,6,z],[p.x+.55,6.65,z*.87],[p.x+.95,6.8,z*.7]],.09,wood);
    const leaf=add(scene,new THREE.IcosahedronGeometry(.95,0),moss,p.x+.8,6.8,z*.8);leaf.scale.set(1,.24,.65);
  }
  for(let i=0;i<5;i++){
    const coil=add(scene,new THREE.TorusGeometry(.31,.045,5,16),rope,p.x-.16+i*.08,6,0);coil.rotation.y=Math.PI/2;
  }
  beam(scene,[p.x,5.96,0],[p.x,p.pivotY,0],.09,rope);

  for(const [x,z,s,seed] of [[-18,-5.7,1.08,43],[-12,-5.4,.82,96],[-20.4,3,.7,32],[1.6,5.7,.5,56],[11.6,1,1.02,85],[11.5,-15.5,1.4,28],[1,-18.3,1.07,78],[-2.1,-12.7,.76,114]])tree(scene,x,0,z,s,seed,animated);
  stumpHouse(scene,-15.8,-5.8);stumpHouse(scene,7.3,-18.6);
  for(const [x,z] of [[-19,-4.8],[-12,4.6],[2,5.5],[11,-12],[.2,-17.8]]){
    lantern(scene,x,z);
    for(let i=0;i<5;i++){
      const dx=Math.sin(i*2.4)*.7,dz=Math.cos(i*2.4)*.55;
      if(i%2)fern(scene,x+dx,0,z+dz,.75,80+i);
      else mushroom(scene,x+dx,0,z+dz,.38+i*.1,0xc97d4b);
    }
  }
  // Seed stores fill the inaccessible triangular garden behind the bank log.
  for(const [x,z,s] of [[8.8,2.7,.58],[7.1,3.5,.45],[9.2,.5,.37]]){
    const nut=acorn(scene,s);nut.position.set(x,s*.85,z);nut.rotation.set(.25,0,.7);
    fern(scene,x-.3,0,z+.5,.7,Math.round(x*9));
  }
  crystal(scene,11.3,-2.1,-14,.8,material(0x78dfc8,{emissive:0x287b65,emissiveIntensity:.5}));
}

export function createAcornPendulum(scene,p){
  if(!p)return null;
  const swing=new THREE.Group();swing.position.set(p.x,p.pivotY,p.z);scene.add(swing);
  beam(swing,[0,0,0],[0,-p.length+p.radius*1.05,0],.055,rope);
  // A second strand and knots give the rope a visible twist at playing distance.
  const twist=Array.from({length:65},(_,i)=>{const y=-i/64*(p.length-p.radius);return [Math.cos(i*.85)*.049,y,Math.sin(i*.85)*.049]});
  tube(swing,twist,.021,wood);
  const nut=acorn(swing,p.radius);nut.name='pendulum-acorn';nut.position.y=-p.length;
  swing.traverse(o=>{if(o.isMesh)o.userData.forestStatic=false});
  return {update(time){swing.rotation.x=-pendulumPose(time,p).angle}};
}

export function createAcornCourse(scene,cells,boundaries,heightAt){
  const floor=createForestSurface(scene,cells,heightAt);
  // The narrow neck ends at the same open edges as the playable surface.
  // No decorative lawn disguises the drop or suggests a way around the nut.
  island(scene,[[-20.4,-4],[-21,-5.2],[-19,-7.4],[-14,-7.2],[-10.2,-5.8],[-10,-3.3],[-8.2,-3.3],[-8.2,-1.2],[-3.2,-1.2],[-3.2,-3.3],[1,-3.3],[1,-4.6],[10.8,-4.6],[12,0],[11.6,4.9],[8,6.3],[2,6.4],[.3,4.8],[.3,3.3],[-3.2,3.3],[-3.2,1.2],[-8.2,1.2],[-8.2,3.3],[-10,3.3],[-10.5,4.6],[-15,4.9],[-19,6.1],[-20.8,3]],6.5,161);
  island(scene,[[-1.3,-10],[-2.9,-12],[-2.4,-16.4],[-.7,-18.9],[5.3,-20.1],[10.8,-19],[13,-16.2],[12,-12],[10.2,-10]],6.2,168);
  // The wooden neck is a real bridge between two islands, not a painted patch.
  for(const x of [5.2,9.8]){
    tube(scene,[[x,-.3,-4.6],[x,-1.4,-7.5],[x,-.3,-10.2]],.11,bark);
    beam(scene,[x,-.18,-4.6],[x,-.18,-10.2],.13,wood);
  }
  for(let z=-4.8;z>-10;z-=.6)add(scene,new THREE.BoxGeometry(5,.13,.08),cut,7.5,-.04,z);
  for(const e of boundaries){
    if(!e.open)beam(scene,[e.ax,.16,e.az],[e.bx,.16,e.bz],.1,wood);
  }
  const posts=new Set();
  for(const e of fenceRuns(boundaries)){
    const count=Math.ceil(Math.hypot(e.bx-e.ax,e.bz-e.az)/1.8);
    for(let i=0;i<count;i++){
      const a=i/count,b=(i+1)/count;
      const x=e.ax+(e.bx-e.ax)*a,z=e.az+(e.bz-e.az)*a,xx=e.ax+(e.bx-e.ax)*b,zz=e.az+(e.bz-e.az)*b;
      tube(scene,[[x,.67,z],[(x+xx)/2,.57,(z+zz)/2],[xx,.67,zz]],.03,rope);
    }
    for(let i=0;i<=count;i++){
      const x=e.ax+(e.bx-e.ax)*i/count,z=e.az+(e.bz-e.az)*i/count,key=`${x.toFixed(3)},${z.toFixed(3)}`;
      if(posts.has(key))continue;posts.add(key);
      beam(scene,[x,-.12,z],[x,.79,z],.07,bark,.06);
      add(scene,new THREE.ConeGeometry(.11,.12,4),cut,x,.84,z);
    }
  }
  const warning=material(0xf5cf74);
  for(const e of level.openEdges)for(let x=e.x1+.1;x<e.x2;x+=.38){
    const mark=add(scene,new THREE.BoxGeometry(.22,.016,.13),warning,x,.064,e.z-Math.sign(e.z)*.09);mark.rotation.y=.3;
  }
  for(const e of level.banks){
    const a=[e.ax,.25,e.az],b=[e.bx,.25,e.bz];
    beam(scene,a,b,e.radius,bark,e.radius,14);
    const dir=new THREE.Vector3(e.bx-e.ax,0,e.bz-e.az).normalize();
    // Long grain and patches of moss, kept above the actual striking face.
    for(const offset of [-.07,.08])beam(scene,[a[0],.47,a[2]+offset],[b[0],.47,b[2]+offset],.033,wood);
    for(const end of [a,b]){
      const disk=add(scene,new THREE.CircleGeometry(e.radius*.91,20),cut,...end);
      disk.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);
      disk.material.side=THREE.DoubleSide;disk.position.addScaledVector(dir,end===a?-.004:.004);
    }
    for(let i=1;i<8;i++){
      const t=i/9,clump=add(scene,new THREE.IcosahedronGeometry(.16,0),moss,e.ax+(e.bx-e.ax)*t,.48,e.az+(e.bz-e.az)*t);clump.scale.set(1.6,.3,1);
    }
  }
  // Painted chevrons teach the bank shot without another HUD panel.
  for(const [x,z,angle] of [[4.5,-.25,0],[6.5,-2,-Math.PI/2],[7.5,-6.7,-Math.PI/2]]){
    const shape=new THREE.Shape();shape.moveTo(.38,0);shape.lineTo(-.2,-.25);shape.lineTo(-.05,0);shape.lineTo(-.2,.25);shape.closePath();
    const arrow=add(scene,new THREE.ShapeGeometry(shape),warning,x,.066,z);arrow.rotation.set(-Math.PI/2,0,-angle);
  }
  batchForestMeshes(scene);
  return floor;
}
