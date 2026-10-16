import * as THREE from 'three';
import { forestKit, createForestSurface } from './forest.js';
import { createRootLoop } from './loop-visuals.js';
import { LEVELS } from './levels.js';
import { eyeMouths } from './mother-tree.js';
import { modelInstance } from './models.js';

// Molnskogens final. Mid-level procedural stand-ins: every named group here is
// listed in BLENDER_ASSETS.md and is meant to be replaced by a Blender model
// with the same footprint, so the gameplay numbers stay where they are.
const {material,randomSource,add,beam,tube,island,tree,fern,mushroom,crystal,glowTexture,fenceRuns,batchForestMeshes}=forestKit;
const level=LEVELS.find(l=>l.scenery==='mothertree');
const eye=level.treeEye,drum=level.trampoline;
const bark=material(0x5e3d2b),litBark=material(0x8a5d3c),wood=material(0xa87745),cut=material(0xe3bb7c),rope=material(0xd6b77c);
const moss=material(0x557d2c),leaf=material(0x6aa22f),blossom=material(0xf2a4c4),blossomDeep=material(0xd8739d);
const amber=material(0xffd27a,{emissive:0xd98a28,emissiveIntensity:.9});
const moving=group=>group.traverse(o=>{if(o.isMesh)o.userData.forestStatic=false});
const occluder=group=>group.traverse(o=>{if(o.isMesh){o.userData.forestStatic=false;o.userData.forestOccluder=true;o.material=o.material.clone();o.material.transparent=true}});

// Trunk radius by height. The eye tunnel is cut where this surface meets it.
const PROFILE=[[-16,6.4],[-9,4.6],[-4,3.7],[0,3.3],[3,3.05],[6,2.9],[10,2.65],[14,2.35],[17,2.05],[19.5,1.7]];
function trunkRadius(y){
  if(y<=PROFILE[0][0])return PROFILE[0][1];
  for(let i=1;i<PROFILE.length;i++){
    const [y0,r0]=PROFILE[i-1],[y1,r1]=PROFILE[i];
    if(y<=y1)return r0+(r1-r0)*(y-y0)/(y1-y0);
  }
  return PROFILE.at(-1)[1];
}
// Where the round tunnel meets the trunk: front (-1) or back (+1) mouth.
function mouthPoint(phi,side,inset=0,radius=eye.radius){
  const y=eye.y+Math.cos(phi)*radius,dz=Math.sin(phi)*radius;
  const r=trunkRadius(y)-inset;
  return new THREE.Vector3(eye.x+side*Math.sqrt(Math.max(.01,r*r-dz*dz)),y,eye.z+dz);
}

function createTrunk(scene){
  const group=new THREE.Group();group.name='mother-tree-trunk';scene.add(group);
  const ys=[];
  for(let y=-16;y<=19.5+1e-6;y+=y>-1.5&&y<7.5?.2:1)ys.push(+y.toFixed(2));
  const segments=96,positions=[],colors=[],index=[],opening=[];
  const random=randomSource(911),dark=new THREE.Color(0x4f3324),light=new THREE.Color(0x7a5136);
  for(const y of ys){
    for(let i=0;i<=segments;i++){
      const theta=i/segments*Math.PI*2;
      // Long vertical bark ridges; the tunnel cut uses the smooth radius.
      const ridge=1+.045*Math.sin(theta*11+y*.18)+.02*Math.sin(theta*29);
      const r=trunkRadius(y)*ridge,dz=Math.sin(theta)*r;
      // Bark faces touching the opening are left out; the rim covers the cut.
      opening.push(Math.hypot(y-eye.y,dz)<eye.radius+.04);
      positions.push(eye.x+Math.cos(theta)*r,y,eye.z+dz);
      const c=dark.clone().lerp(light,.5+.5*Math.sin(theta*11+y*.18)+(random()-.5)*.3);colors.push(c.r,c.g,c.b);
    }
  }
  const row=segments+1;
  for(let j=0;j<ys.length-1;j++)for(let i=0;i<segments;i++){
    const a=j*row+i,b=a+1,c=a+row,d=c+1;
    if(!opening[a]&&!opening[b]&&!opening[c]&&!opening[d])index.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(index);geometry.computeVertexNormals();
  add(group,geometry,material(0xffffff,{vertexColors:true,side:THREE.DoubleSide}));

  // Heartwood lining between the two mouths, lit by amber sap.
  const lining=[],liningIndex=[],steps=64,depth=6;
  for(let i=0;i<=steps;i++){
    const phi=i/steps*Math.PI*2,front=mouthPoint(phi,-1),back=mouthPoint(phi,1);
    for(let k=0;k<=depth;k++){const p=front.clone().lerp(back,k/depth);lining.push(p.x,p.y,p.z)}
  }
  for(let i=0;i<steps;i++)for(let k=0;k<depth;k++){
    const a=i*(depth+1)+k,b=a+1,c=a+depth+1,d=c+1;liningIndex.push(a,b,c,b,d,c);
  }
  const tunnel=new THREE.BufferGeometry();tunnel.setAttribute('position',new THREE.Float32BufferAttribute(lining,3));tunnel.setIndex(liningIndex);tunnel.computeVertexNormals();
  add(group,tunnel,material(0xd9a466,{side:THREE.DoubleSide,emissive:0x8a4b16,emissiveIntensity:.25}));
  for(const side of [-1,1]){
    // The rim sits just outside the opening so it never narrows the tunnel.
    const lip=new THREE.CatmullRomCurve3(Array.from({length:48},(_,i)=>mouthPoint(i/48*Math.PI*2,side,-.1,eye.radius+.3)),true);
    add(group,new THREE.TubeGeometry(lip,96,.3,7,true),side<0?litBark:bark);
  }
  occluder(group);
  return group;
}

// A carved brow and lashes make the tunnel read as the tree's eye from the tee.
function createEyeDetail(scene){
  const group=new THREE.Group();group.name='mother-tree-eye';scene.add(group);
  const brow=new THREE.CatmullRomCurve3([-2.1,-1.5,-.7,0,.7,1.5,2.1].map(t=>{
    const y=eye.y+eye.radius+.55+Math.cos(t/2.1*Math.PI/2)*.55,dz=t*1.25;
    return new THREE.Vector3(eye.x-Math.sqrt(trunkRadius(y)**2-dz*dz)-.15,y,eye.z+dz);
  }));
  add(group,new THREE.TubeGeometry(brow,40,.32,7,false),litBark);
  const gems=[];
  const gem=material(0x9ff0c8,{emissive:0x3fd6a2,emissiveIntensity:.9,roughness:.25});
  for(let i=0;i<14;i++){
    const phi=i/14*Math.PI*2,p=mouthPoint(phi,-1,-.2,eye.radius+.62),c=crystal(group,p.x-.1,p.y,p.z,.32,gem);
    c.rotation.set(0,0,phi);gems.push(c);
  }
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color:0xffe0a0,transparent:true,depthWrite:false,opacity:.55}));
  glow.position.set(eye.x,eye.y,eye.z);glow.scale.set(5.5,5.5,1);group.add(glow);
  const light=new THREE.PointLight(0xffc77a,9,11,2);light.position.set(eye.x,eye.y,eye.z);group.add(light);
  moving(group);
  return {group,gem,glow,light};
}

function createCanopy(scene,animated){
  const group=new THREE.Group();group.name='mother-tree-canopy';scene.add(group);
  const random=randomSource(377);
  const top=[eye.x,19,eye.z];
  for(let i=0;i<7;i++){
    const a=i/7*Math.PI*2+.3,reach=8+random()*3.5,rise=3+random()*2.5,start=13.5+random()*4;
    const tip=[eye.x+Math.cos(a)*reach,start+rise,eye.z+Math.sin(a)*reach];
    const mid=[eye.x+Math.cos(a)*reach*.5,start+rise*.7,eye.z+Math.sin(a)*reach*.5];
    tube(group,[[eye.x+Math.cos(a)*1.4,start,eye.z+Math.sin(a)*1.4],mid,tip],.55,bark);
    for(let k=0;k<3;k++){
      const crown=new THREE.Group();crown.position.set(tip[0]+(random()-.5)*3,tip[1]+random()*1.4,tip[2]+(random()-.5)*3);group.add(crown);
      const r=2.6+random()*1.8,model=modelInstance(`forest/blossom-crown-${k%2?'leaf':'bloom'}`);
      if(model){model.scale.setScalar(r);model.rotation.y=random()*6;crown.add(model)}
      else{
        const base=add(crown,new THREE.IcosahedronGeometry(r,1),k%2?leaf:blossom);base.scale.set(1,.42,1);
        const cap=add(crown,new THREE.IcosahedronGeometry(r*.72,0),k%2?blossom:blossomDeep,0,r*.32,0);cap.scale.set(1,.4,1);
      }
      animated.push({object:crown,phase:i+k,type:'canopy'});
    }
  }
  tube(group,[[top[0],15,top[2]],[top[0]+.3,20,top[2]-.2],[top[0]-.2,23.5,top[2]+.3]],1.2,bark);
  const crownTop=new THREE.Group();crownTop.position.set(top[0],24,top[2]);group.add(crownTop);
  const headModel=modelInstance('forest/blossom-crown-bloom');
  if(headModel){headModel.scale.set(5.2,6.2,5.2);crownTop.add(headModel)}
  else{const head=add(crownTop,new THREE.IcosahedronGeometry(5.2,1),blossom);head.scale.set(1,.5,1)}
  animated.push({object:crownTop,phase:2,type:'canopy'});
  occluder(group);
  return group;
}

// Two low limbs carry vine curtains that block both sides of the eye, matching
// the physics: only the tunnel itself lets a flight through the tree.
function createVineCurtains(scene){
  const group=new THREE.Group();group.name='mother-tree-vines';scene.add(group);
  const random=randomSource(52),front=eyeMouths(eye)[0];
  for(const side of [-1,1]){
    const outer=eye.z+side*eye.blockHalfWidth;
    tube(group,[[eye.x,7.5,eye.z+side*2.2],[front-.4,7.6,eye.z+side*4],[front-.9,6.8,outer+side*.4]],.32,bark);
    for(let i=0;i<9;i++){
      const z=eye.z+side*(2.9+i*.34),x=front-.5-random()*.5,len=5.5+random()*3;
      const points=[[x,7.3,z],[x-.12,7.3-len*.4,z+side*.08],[x+.1,7.3-len*.75,z],[x,7.3-len,z+side*.05]];
      tube(group,points,.06,moss);
      for(let k=1;k<5;k++){
        const leafy=add(group,new THREE.IcosahedronGeometry(.22,0),k%2?leaf:blossom,x,7.3-len*k/5,z+side*.1);leafy.scale.set(.5,1,.9);
      }
    }
  }
  occluder(group);
}

function createRoots(scene){
  const random=randomSource(23);
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2+.2,r=trunkRadius(-3);
    const start=[eye.x+Math.cos(a)*r*.9,-2.5,eye.z+Math.sin(a)*r*.9];
    const out=7+random()*4;
    tube(scene,[start,[eye.x+Math.cos(a)*(r+2),-4,eye.z+Math.sin(a)*(r+2)],[eye.x+Math.cos(a)*out,-8-random()*3,eye.z+Math.sin(a)*out]],.9-random()*.25,bark);
  }
  // The root that grows all the way to the tee island and forms the loop.
  tube(scene,[[eye.x-2.6,-2.4,eye.z+.3],[0,-2.2,-2.6],[-5,-1.4,-2.4],[-8,-.9,-1.6],[-9.6,-.6,-.6]],.55,bark);
}

function cloudSea(scene,animated){
  const mat=new THREE.MeshLambertMaterial({color:0xfff7fb,emissive:0xd6a9c2,emissiveIntensity:.3});
  const random=randomSource(64);
  for(let i=0;i<16;i++){
    const x=-6+random()*30,z=-14+random()*24,y=-7.5-random()*2.5;
    const puff=add(scene,new THREE.SphereGeometry(2.4+random()*2.2,14,9),mat,x,y,z);
    puff.scale.set(1.6,.45,1.2);puff.castShadow=false;puff.userData.forestStatic=false;
    animated.push({object:puff,phase:i,type:'cloud',baseX:x});
  }
}

function owl(scene,x,z,turn,size=1){
  const root=new THREE.Group();root.name='owl-guardian';root.position.set(x,0,z);root.rotation.y=turn;root.scale.setScalar(size);scene.add(root);
  const model=modelInstance('forest/owl');
  if(model){root.add(model);occluder(root);return}
  add(root,new THREE.CylinderGeometry(.55,.7,.8,9),bark,0,.4,0);
  const body=add(root,new THREE.IcosahedronGeometry(.7,1),wood,0,1.55,0);body.scale.set(.9,1.25,.8);
  const face=material(0xf2d9a6),pupil=material(0x2f4630,{emissive:0x1d4a2a,emissiveIntensity:.3});
  for(const side of [-1,1]){
    const disk=add(root,new THREE.SphereGeometry(.27,12,8),face,side*.24,1.78,.45);disk.scale.z=.35;
    add(root,new THREE.SphereGeometry(.11,10,6),pupil,side*.24,1.78,.55);
    const ear=add(root,new THREE.ConeGeometry(.16,.42,4),bark,side*.38,2.35,0);ear.rotation.z=side*-.35;
    const wing=add(root,new THREE.SphereGeometry(.5,9,6),litBark,side*.58,1.45,0);wing.scale.set(.32,1.2,.7);
  }
  const beak=add(root,new THREE.ConeGeometry(.12,.3,4),material(0xd6a14a),0,1.58,.6);beak.rotation.x=Math.PI/2;
  occluder(root);
}

function lantern(scene,x,z,h=1.5){
  beam(scene,[x,0,z],[x,h+.9,z],.07,bark,.05);
  beam(scene,[x,h+.9,z],[x+.55,h+.9,z],.05,bark);
  beam(scene,[x+.5,h+.9,z],[x+.5,h+.55,z],.015,rope);
  add(scene,new THREE.OctahedronGeometry(.24,0),amber,x+.5,h+.28,z);
}

function bloomHead(scene,x,z,seed){
  const flower=new THREE.Group();flower.position.set(x,0,z);scene.add(flower);
  tube(flower,[[0,0,0],[.12,.9,0],[-.08,1.7,0],[.2,2.3,0]],.07,moss);
  const head=new THREE.Group();head.position.set(.2,2.3,0);head.rotation.x=.4;flower.add(head);
  const petalA=material(seed%2?0xf3a1c6:0xf6c08f),petalB=material(0xfbe0c9);
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,petal=add(head,new THREE.SphereGeometry(.55,9,6),i%2?petalA:petalB,Math.cos(a)*.42,0,Math.sin(a)*.42);
    petal.scale.set(.5,.2,1);petal.rotation.y=Math.PI/2-a;petal.rotation.z=.25;
  }
  const heart=add(head,new THREE.SphereGeometry(.24,10,8),material(0xffd783,{emissive:0xe09a2c,emissiveIntensity:.4}),0,.1,0);
  moving(flower);
  return {head,heart};
}

export function createMotherTreeScenery(scene,animated){
  createTrunk(scene);createCanopy(scene,animated);createVineCurtains(scene);createRoots(scene);cloudSea(scene,animated);
  for(const [x,z,s,seed] of [[-21.5,-5.4,.95,11],[-15,-5.6,.7,34],[-21.4,4.2,.6,57],[25.5,-11.8,1.05,71],[23.5,2.7,.75,15]])tree(scene,x,0,z,s,seed,animated);
  owl(scene,15.2,2.6,-.4,1.1);owl(scene,19.9,2.6,.4,1.1);
  for(const [x,z] of [[-14,6.98],[-4,6.98],[6,6.98],[14,6.98],[-20.5,-4.4],[25.2,-11]])lantern(scene,x,z);
  for(const [x,z] of [[-20.5,-4.6],[-12,-4.6],[-21,4.4],[26.5,-9.5],[25.4,2.2],[16.5,-11.6]])for(let i=0;i<5;i++){
    const dx=Math.sin(i*2.3)*.7,dz=Math.cos(i*2.3)*.4;
    if(i%2)fern(scene,x+dx,0,z+dz,.7,40+i);else mushroom(scene,x+dx,0,z+dz,.3+i*.08,i%4?0xd8985c:0xc77879);
  }
  for(const [x,z] of [[-16.5,5.2],[24.5,3.9],[16.5,-13.5]])crystal(scene,x,-1.8,z,.9,material(0xeec879,{emissive:0xc98a32,emissiveIntensity:.45}));
}

export function createMotherTreeCourse(scene,cells,boundaries,heightAt){
  const floor=createForestSurface(scene,cells,heightAt);
  island(scene,[[-22,-3.8],[-23,-5.4],[-20,-7],[-14,-6.8],[-10.4,-5],[-10,-3.8],[-10,3.8],[-12,4.4],[-16,4.6],[-20,5],[-22.6,3.4]],6.8,301);
  island(scene,[[15,-10.5],[15.5,-12.4],[19,-13.4],[24,-13],[26.8,-11],[26.6,-5.2],[26,-1.2],[26.6,1.5],[24,3.6],[14.4,3.6],[14.4,1.5],[15,1.5]],7.4,307);
  createRootLoop(scene,level.loop);
  // The runway to the drum is a root bridge with open space beneath it.
  for(const cell of cells.filter(c=>c.surface==='wood')){
    const deck=add(scene,new THREE.BoxGeometry(cell.x2-cell.x1,.24,cell.z2-cell.z1),bark,(cell.x1+cell.x2)/2,-.14,(cell.z1+cell.z2)/2);deck.receiveShadow=true;
  }
  for(const z of [-4.15,-2.25])tube(scene,[[-6,-.25,z],[-3,-1.3,z],[.2,-.25,z]],.1,rope);
  for(const z of [3.9,6.7]){
    tube(scene,[[-16,-.4,z],[-6,-1.7,z],[6,-2,z],[19,-.4,z]],.1,rope);
  }
  for(let x=-14;x<19;x+=5)beam(scene,[x,-.3,3.85],[x,-.3,6.75],.14,bark);
  for(const e of boundaries)if(!e.open)beam(scene,[e.ax,.16,e.az],[e.bx,.16,e.bz],.1,wood);
  const posts=new Set();
  for(const e of fenceRuns(boundaries)){
    const count=Math.ceil(Math.hypot(e.bx-e.ax,e.bz-e.az)/1.8);
    beam(scene,[e.ax,.66,e.az],[e.bx,.66,e.bz],.028,rope);
    for(let i=0;i<=count;i++){
      const x=e.ax+(e.bx-e.ax)*i/count,z=e.az+(e.bz-e.az)*i/count,key=`${x.toFixed(3)},${z.toFixed(3)}`;
      if(posts.has(key))continue;posts.add(key);
      beam(scene,[x,-.12,z],[x,.8,z],.07,bark,.055);add(scene,new THREE.ConeGeometry(.11,.13,4),cut,x,.86,z);
    }
  }
  // Warning paint on the real drops only. The loop mouths stay clear.
  const warning=material(0xf5cf74);
  for(const e of level.openEdges.filter(e=>e.x!==level.loop.x&&e.x!==level.loop.x+level.loop.advance)){
    const vertical=e.x!==undefined,a=vertical?e.z1:e.x1,b=vertical?e.z2:e.x2;
    for(let t=a+.15;t<b;t+=.4){
      const inward=vertical?(e.x>10&&e.x<20?.1:-.1):0;
      add(scene,new THREE.BoxGeometry(vertical?.13:.24,.016,vertical?.24:.13),warning,vertical?e.x+inward:t,.064,vertical?t:e.z);
    }
  }
  batchForestMeshes(scene);
  return floor;
}

// Live parts: the drum skin, the eye's glow and the finale bloom around the cup.
export function createMotherTree(scene,lvl=level){
  if(lvl.scenery!=='mothertree')return null;
  const group=new THREE.Group();group.name='mother-tree-drum';group.position.set(drum.x,0,drum.z);scene.add(group);
  add(group,new THREE.CylinderGeometry(drum.radius+.02,drum.radius-.08,.5,40),bark,0,-.25,0);
  for(let i=0;i<20;i++){
    const a=i*Math.PI/10,stave=add(group,new THREE.BoxGeometry(.11,.53,.06),i%3?cut:wood,Math.cos(a)*(drum.radius-.01),-.23,Math.sin(a)*(drum.radius-.01));stave.rotation.y=-a;
  }
  for(const y of [-.1,-.35]){const cord=add(group,new THREE.TorusGeometry(drum.radius+.01,.03,6,48),material(0xd3a550),0,y,0);cord.rotation.x=Math.PI/2}
  const skin=add(group,new THREE.CylinderGeometry(drum.radius,drum.radius,.04,40),material(0xebd6a6),0,.065,0);
  const ring=add(group,new THREE.TorusGeometry(drum.radius*.7,.03,5,40),blossomDeep,0,.09,0);ring.rotation.x=Math.PI/2;
  moving(group);
  // Painted arrows on the runway point from the loop exit to the drum.
  for(let i=0;i<3;i++){
    const shape=new THREE.Shape();shape.moveTo(.3,0);shape.lineTo(-.2,.3);shape.lineTo(-.05,0);shape.lineTo(-.2,-.3);shape.closePath();
    const arrow=add(scene,new THREE.ShapeGeometry(shape),cut,drum.x-1.9-i*.8,.07,drum.z);arrow.rotation.x=-Math.PI/2;
  }
  const detail=createEyeDetail(scene);
  const blooms=[[18,-11.5],[21.5,-11.8],[25,-11.4],[26.45,-8.2]].map(([x,z],i)=>bloomHead(scene,x,z,i));
  const reducedMotion=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let bounce=0,flash=0,bloom=0,blooming=false;
  return {
    bounce(){bounce=1},celebrate(){flash=1},bloom(){blooming=true},
    reset(){bounce=0;flash=0;bloom=0;blooming=false},
    update(dt,time){
      bounce=Math.max(0,bounce-dt*2.5);flash=Math.max(0,flash-dt*.7);
      bloom=blooming?Math.min(1,bloom+dt*.8):Math.max(0,bloom-dt*2);
      skin.position.y=.065-Math.sin(bounce*Math.PI*3)*bounce*.12;
      const pulse=reducedMotion?0:Math.sin(time*1.4)*.1;
      detail.gem.emissiveIntensity=.9+flash*2.2+bloom*1.2+pulse;
      detail.glow.material.opacity=.5+flash*.4+bloom*.3+pulse*.3;
      detail.light.intensity=9+flash*16+bloom*10;
      for(const {head,heart} of blooms){
        head.scale.setScalar(.45+.55*bloom);
        heart.material.emissiveIntensity=.4+bloom*1.4;
        if(!reducedMotion)head.rotation.y=time*.3*bloom;
      }
    },
  };
}
