import * as THREE from 'three';
import { forestKit, createForestSurface } from './forest.js';
import { loopFrame } from './loop.js';
import { LEVELS } from './levels.js';
import { profileHeight } from './terrain.js';

const {material,add,beam,tube,island,tree,fern,mushroom,crystal,fenceRuns,batchForestMeshes}=forestKit;
const level=LEVELS.find(l=>l.scenery==='loop'),ground=x=>x>=8?-2.4:profileHeight(x,level.heightProfile);
const bark=material(0x63432e),wood=material(0xb07c47),cut=material(0xe6bd80),rope=material(0xcdb885),moss=material(0x537d2d);
const amber=material(0xffd882,{emissive:0xb06a20,emissiveIntensity:.15});
const at=(f,side,normal=0)=>[f.x+f.side.x*side+f.normal.x*normal,f.y+f.side.y*side+f.normal.y*normal,f.z+f.side.z*side+f.normal.z*normal];

export function createRootLoop(scene,c){
  const positions=[],colors=[],underside=[];
  const ribbon=new THREE.Group();ribbon.name='root-loop';scene.add(ribbon);
  for(let i=0;i<192;i++){
    const a=loopFrame(i/192,c),b=loopFrame((i+1)/192,c),col=new THREE.Color(i%8<4?0x89b448:0x78a33a);
    const corners=[at(a,-c.halfWidth,.04),at(a,c.halfWidth,.04),at(b,-c.halfWidth,.04),at(b,c.halfWidth,.04)];
    for(const n of [0,2,1,1,2,3]){positions.push(...corners[n]);colors.push(col.r,col.g,col.b)}
    const back=[at(a,-c.halfWidth,-.17),at(a,c.halfWidth,-.17),at(b,-c.halfWidth,-.17),at(b,c.halfWidth,-.17)];
    for(const n of [0,1,2,1,3,2])underside.push(...back[n]);
    for(const side of [-1,1]){
      const wall=[at(a,side*c.halfWidth,.04),at(b,side*c.halfWidth,.04),at(a,side*c.halfWidth,-.17),at(b,side*c.halfWidth,-.17)];
      for(const n of [0,2,1,1,2,3])underside.push(...wall[n]);
    }
  }
  const surface=new THREE.BufferGeometry();surface.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));surface.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));surface.computeVertexNormals();
  add(ribbon,surface,material(0xffffff,{vertexColors:true,side:THREE.DoubleSide}));
  const back=new THREE.BufferGeometry();back.setAttribute('position',new THREE.Float32BufferAttribute(underside,3));back.computeVertexNormals();add(ribbon,back,material(0x63432e,{side:THREE.DoubleSide}));
  for(const side of [-1,1]){
    const path=Array.from({length:193},(_,i)=>at(loopFrame(i/192,c),side*(c.halfWidth+.1),.12));
    // More segments than decorative vines: the rails must describe the loop exactly.
    const curve=new THREE.CatmullRomCurve3(path.map(p=>new THREE.Vector3(...p)));
    add(ribbon,new THREE.TubeGeometry(curve,256,.1,7,false),wood);
    const vine=path.map((p,i)=>[p[0],p[1]-.12+Math.sin(i*.28)*.06,p[2]+side*.14]);
    add(ribbon,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(vine.map(p=>new THREE.Vector3(...p))),256,.045,5,false),moss);
  }
  for(let i=0;i<=64;i++){
    const f=loopFrame(i/64,c);
    beam(ribbon,at(f,-c.halfWidth-.2,-.2),at(f,c.halfWidth+.2,-.2),.06,i%3?wood:cut,.06,5);
    if(i%8===0)for(const side of [-1,1]){
      const pos=at(f,side*(c.halfWidth+.14),.14);
      add(ribbon,new THREE.SphereGeometry(.105,8,6),amber,...pos);
    }
  }
  // Golden inlays follow the actual travel direction on the track's inner face.
  for(const u of [.03,.12,.42,.71,.9]){
    const f=loopFrame(u,c),shape=new THREE.Shape();shape.moveTo(.23,0);shape.lineTo(-.15,-.2);shape.lineTo(-.05,0);shape.lineTo(-.15,.2);shape.closePath();
    const arrow=add(ribbon,new THREE.ShapeGeometry(shape),cut,...at(f,0,.054));
    const matrix=new THREE.Matrix4().makeBasis(new THREE.Vector3(f.tangent.x,f.tangent.y,f.tangent.z),new THREE.Vector3(f.side.x,f.side.y,f.side.z),new THREE.Vector3(-f.normal.x,-f.normal.y,-f.normal.z));
    arrow.quaternion.setFromRotationMatrix(matrix);arrow.material.side=THREE.DoubleSide;
  }
  return ribbon;
}

function bloom(scene,x,y,z,size,animated,seed){
  const flower=new THREE.Group();flower.position.set(x,y,z);flower.scale.setScalar(size);scene.add(flower);
  tube(flower,[[0,0,0],[.15,1.2,0],[-.12,2.3,0],[.4,3.2,-.1]],.09,moss);
  for(const [side,h] of [[-1,.9],[1,1.6]]){
    const leaf=add(flower,new THREE.SphereGeometry(.53,7,4),moss,side*.35,h,0);leaf.scale.set(1,.18,.5);leaf.rotation.z=side*.3;
  }
  const head=new THREE.Group();head.position.set(.4,3.2,-.1);head.rotation.x=.55;flower.add(head);
  const rose=material(seed%2?0xc56b99:0xe79b6d),pale=material(0xf5c6a4),heart=material(0xffd783,{emissive:0xd59225,emissiveIntensity:.3});
  for(let i=0;i<6;i++){
    const a=i*Math.PI/3,petal=add(head,new THREE.SphereGeometry(.7,9,6),i%2?rose:pale,Math.cos(a)*.55,0,Math.sin(a)*.55);
    petal.scale.set(.53,.22,1);petal.rotation.y=Math.PI/2-a;petal.rotation.z=.2;
  }
  add(head,new THREE.SphereGeometry(.3,12,8),heart,0,.14,0);
  flower.traverse(o=>{if(o.isMesh){o.userData.forestStatic=false;o.userData.forestOccluder=true;o.material.transparent=true}});
  animated.push({object:head,type:'canopy',phase:seed});
}

export function createLoopScenery(scene,animated){
  const c=level.loop;
  // Living buttresses carry the ribbon from garden roots, never across the mouth.
  for(const [anchor,u,side] of [[[-12,0,4.6],.68,1],[[-4.2,0,-7],.35,-1]]){
    const f=loopFrame(u,c),end=at(f,side*(c.halfWidth+.12),-.25);
    tube(scene,[anchor,[anchor[0]+.3,2.2,anchor[2]],[end[0]-.5,end[1]-.5,end[2]],end],.21,bark);
    for(let i=0;i<4;i++){
      const a=i*1.6;
      tube(scene,[[anchor[0]+Math.cos(a)*.9,anchor[1],anchor[2]+Math.sin(a)*.6],[anchor[0],.35,anchor[2]],[anchor[0],1.1,anchor[2]]],.12,wood);
    }
    fern(scene,anchor[0]-.5,0,anchor[2]+.3,.9,55+u*10);
  }
  for(const [x,z,s,seed] of [[-20,-5.5,1.05,73],[-15,-5.2,.75,84],[-20.7,3,.65,26],[-14,5.3,.55,69],[-3,-7,.85,88],[.4,1,.58,52],[8.3,-1.3,.72,102],[21.9,-11.6,1.22,96],[9,-14,1,40]])tree(scene,x,ground(x),z,s,seed,animated);
  for(const [x,z,s] of [[-18,-4.8,.8],[-12,4.3,.6],[-4.3,-6.5,.85],[.5,0,.8],[9,-13.7,1.1],[15.8,-8.6,.85],[19.2,-14.7,1.45]])bloom(scene,x,ground(x),z,s,animated,Math.abs(x)*3);
  for(const [x,z] of [[-19,-4.9],[-13,4.4],[-3,-6.7],[.4,.2],[9.2,-13.7],[15.7,-6.9]])for(let i=0;i<5;i++){
    const dx=Math.sin(i*2.1)*.7,dz=Math.cos(i*2.1)*.4;
    mushroom(scene,x+dx,ground(x),z+dz,.3+i*.11,i%2?0xd8985c:0xc77879);
    if(i%2)fern(scene,x-dx,ground(x),z-dz,.6,60+i);
  }
  // An ancient split stump cradles the green from below, with amber sap crystals.
  for(const [x,z] of [[8.5,-9.7],[22,-10.8]]){
    tube(scene,[[16,-7,-10],[x,-4.3,z],[x,-1.8,z]],.45,bark);
    const gem=material(0xeec879,{emissive:0xc98a32,emissiveIntensity:.45});
    crystal(scene,x,-3.8,z,.7,gem);
  }
}

export function createLoopCourse(scene,cells,boundaries,heightAt){
  const floor=createForestSurface(scene,cells,heightAt);
  island(scene,[[-21,-3.8],[-21.8,-5.2],[-18.5,-6.7],[-13.5,-6.3],[-10.2,-4.6],[-9.8,-3.8],[-9.8,3.8],[-10.8,6],[-15,5.6],[-19.5,6],[-21.5,2.5]],6.4,177);
  island(scene,[[-5.8,-5.8],[-5.5,-7.6],[-2.2,-8],[1.6,-6.4],[1.4,-.6],[.8,1.2],[-3,1.3],[-5.8,-.6]],5.1,181);
  island(scene,[[7.8,-5.8],[9.6,-5.8],[9.6,-8.8],[8.3,-14],[11,-15.8],[19.8,-16],[23,-13.4],[23,-9.4],[21,-8.5],[13,-8.5],[13,-.6],[11.2,.6],[7.8,-.6]],6.1,183,-2.385);
  createRootLoop(scene,level.loop);
  // Plank sides and cables reveal the drop between the upper and lower gardens.
  for(const cell of cells.filter(c=>c.surface==='wood')){
    const vertices=[],points=[[cell.x1,cell.z1],[cell.x2,cell.z1],[cell.x2,cell.z2],[cell.x1,cell.z2]];
    for(let i=0;i<4;i++){
      const a=points[i],b=points[(i+1)%4];
      for(const [p,d] of [[a,0],[a,-.22],[b,0],[b,0],[a,-.22],[b,-.22]])vertices.push(p[0],heightAt(...p)+d,p[1]);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();add(scene,geometry,bark);
  }
  for(const z of [-4.35,-2.05])tube(scene,[[1.4,-.25,z],[5.2,-2.9,z],[9,-2.65,z]],.095,bark);
  for(const e of boundaries){if(!e.open)beam(scene,[e.ax,heightAt(e.ax,e.az)+.16,e.az],[e.bx,heightAt(e.bx,e.bz)+.16,e.bz],.1,wood)}
  const posts=new Set();
  for(const e of fenceRuns(boundaries)){
    const count=Math.ceil(Math.hypot(e.bx-e.ax,e.bz-e.az)/1.7);
    for(let i=0;i<count;i++){
      const a=i/count,b=(i+1)/count,x=e.ax+(e.bx-e.ax)*a,z=e.az+(e.bz-e.az)*a,xx=e.ax+(e.bx-e.ax)*b,zz=e.az+(e.bz-e.az)*b;
      beam(scene,[x,heightAt(x,z)+.67,z],[xx,heightAt(xx,zz)+.67,zz],.03,rope);
    }
    for(let i=0;i<=count;i++){
      const x=e.ax+(e.bx-e.ax)*i/count,z=e.az+(e.bz-e.az)*i/count,key=`${x},${z}`;
      if(posts.has(key))continue;posts.add(key);
      beam(scene,[x,heightAt(x,z)-.12,z],[x,heightAt(x,z)+.8,z],.075,bark,.06);
      add(scene,new THREE.ConeGeometry(.1,.13,4),cut,x,heightAt(x,z)+.86,z);
    }
  }
  // Only the genuinely dangerous ledges get warning paint. Loop mouths stay clear.
  for(const e of level.openEdges.filter(e=>e.x!==-9.8&&e.x!==-5.8)){
    const horizontal=e.x===undefined,a=horizontal?e.x1:e.z1,b=horizontal?e.x2:e.z2;
    for(let t=a+.1;t<b;t+=.4){
      const x=horizontal?t:e.x-.07,z=horizontal?e.z+(e.z<-3.2?.07:-.07):t;
      add(scene,new THREE.BoxGeometry(horizontal?.24:.13,.016,horizontal?.13:.24),amber,x,heightAt(x,z)+.061,z);
    }
  }
  batchForestMeshes(scene);return floor;
}
