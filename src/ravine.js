import * as THREE from 'three';
import { forestKit, createForestSurface } from './forest.js';
import { profileHeight } from './terrain.js';
import { LEVELS } from './levels.js';

const {material,randomSource,add,beam,tube,island,tree,fern,mushroom,crystal,fenceRuns,batchForestMeshes}=forestKit;
const level=LEVELS.find(l=>l.scenery==='ravine');
const ground=x=>profileHeight(x,level.heightProfile);
const bark=material(0x72523e),wood=material(0xb88b54),cut=material(0xe7c995),stone=material(0x8b9d85);

// These are garden banks, outside the ball's colliders. Their inner face reveals
// how far the flume descends; there is no decorative floor over the lower route.
function bank(scene,side){
  const xs=[-12.2,-11,-9,-7,-5,-3,-1.1];
  const tops=side<0?[3.8,4.1,4.5,4.3,3.7,1.5,-1.78]:[3.8,3.7,2.5,1.35,.5,-.8,-1.78];
  const rows=xs.map((x,i)=>{
    const h=ground(x),top=tops[i],outside=5.6+Math.sin(i*2)*.6;
    return [[x,h-.25,side*1.3],[x,top-.32,side*(1.85+(i===6?1.7:0))],
      [x,top,side*3.2],[x,top-.18,side*outside],[x,h-3.2,side*(outside-.6)],[x,h-4,side*2.4]];
  });
  const positions=[],colors=[];
  for(let i=0;i<rows.length-1;i++)for(let j=0;j<6;j++){
    const next=(j+1)%6;
    for(const tri of [[rows[i][j],rows[i+1][j],rows[i][next]],[rows[i][next],rows[i+1][j],rows[i+1][next]]]){
      const color=new THREE.Color(j===1||j===2?0x628536:[0xa7835e,0,0,0x986c50,0x705144,0x886147][j]);
      color.multiplyScalar(.87+((i*3+j*7)%5)*.065);
      tri.forEach(p=>{positions.push(...p);colors.push(color.r,color.g,color.b)});
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const cliff=add(scene,geo,material(0xffffff,{vertexColors:true,side:THREE.DoubleSide,transparent:true}));
  cliff.userData.forestStatic=false;cliff.userData.forestOccluder=true;
  for(let i=1;i<6;i++){
    const x=xs[i],y=tops[i];
    for(const z of [side*2.5,side*4.8]){
      const rock=add(scene,new THREE.DodecahedronGeometry(.45+(i%3)*.16,0),stone,x,y-.05,z);rock.scale.set(1.2,.6,.85);rock.rotation.set(i*.4,i*.8,0);
      fern(scene,x+.5,y,side*3.9,.65+i%2*.3,91+i);
    }
    for(let j=0;j<3;j++)mushroom(scene,x+j*.23,y-.04,side*(4.1+j*.24),.38+j*.19,side>0?0xd79b57:0xbd785b);
  }
}

function lantern(scene,x,y,z){
  beam(scene,[x,y,z],[x,y+1.65,z],.055,bark,.04);
  beam(scene,[x,y+1.65,z],[x+.38,y+1.65,z],.04,bark);
  const glow=material(0xffdd8d,{emissive:0xffb947,emissiveIntensity:.8});
  add(scene,new THREE.CylinderGeometry(.13,.18,.3,6),glow,x+.34,y+1.25,z);
  add(scene,new THREE.ConeGeometry(.24,.15,6),bark,x+.34,y+1.47,z);
  add(scene,new THREE.CylinderGeometry(.19,.19,.055,6),bark,x+.34,y+1.08,z);
  beam(scene,[x+.34,y+1.65,z],[x+.34,y+1.48,z],.014,wood);
}

function rootBridge(scene){
  const bridge=new THREE.Group();scene.add(bridge);
  const deckY=z=>2.1-z*3.2/7.2+.45*Math.cos(z*Math.PI/7.2);
  for(const x of [-5.65,-4.35]){
    tube(bridge,[-3.6,-2.3,0,2.3,3.6].map(z=>[x,deckY(z)-.16,z]),.23,bark);
    tube(bridge,[[-3.6,-.3],[-1.7,-.45],[0,-.55],[1.7,-.4],[3.6,-.2]].map(([z,offset])=>[x+Math.sin(z)*.2,deckY(z)+offset,z]),.11,wood);
  }
  for(let i=0;i<19;i++){
    const z=-3.6+i*.4,y=deckY(z);
    const plank=add(bridge,new THREE.BoxGeometry(1.8,.13,.34),i%3?wood:cut,-5,y,z);plank.rotation.z=Math.sin(i*1.7)*.03;
  }
  for(const x of [-5.83,-4.17]){
    tube(bridge,[-3.6,-1.8,0,1.8,3.6].map(z=>[x,deckY(z)+.82,z]),.035,material(0xc6b082));
    for(const z of [-3.6,-1.8,0,1.8,3.6]){
      const y=deckY(z);
      beam(bridge,[x,y,z],[x,y+.82,z],.06,bark);
    }
  }
  // The bridge can fade when looking through it at the ball in the flume.
  bridge.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.userData.forestStatic=false;o.userData.forestOccluder=true}});
}

function mill(scene,animated){
  // A timber millrace carries the spring from the upper garden to the wheel.
  add(scene,new THREE.BoxGeometry(5.7,.15,.72),bark,-11,3.75,5.25);
  add(scene,new THREE.BoxGeometry(5.55,.015,.52),material(0x6eac9e,{roughness:.3}),-11,3.84,5.25);
  for(const z of [4.88,5.62])add(scene,new THREE.BoxGeometry(5.8,.3,.13),wood,-11,3.92,z);
  for(const x of [-12.3,-10.2,-8.5]){
    beam(scene,[x,ground(x)-.6,5.25],[x,3.7,5.25],.13,bark);
    beam(scene,[x,2.7,5.25],[x+.6,3.7,5.25],.08,wood);
  }
  const wheel=new THREE.Group();wheel.position.set(-8.1,1.65,6.35);scene.add(wheel);
  const iron=material(0x526e63,{metalness:.25,roughness:.62});
  for(const z of [-.25,.25]){
    add(wheel,new THREE.TorusGeometry(1.32,.095,6,24),bark,0,0,z);
    add(wheel,new THREE.TorusGeometry(.29,.10,6,16),iron,0,0,z);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;beam(wheel,[0,0,z],[Math.cos(a)*1.3,Math.sin(a)*1.3,z],.065,wood)}
  }
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,paddle=add(wheel,new THREE.BoxGeometry(.25,.43,.83),i%2?wood:cut,Math.cos(a)*1.32,Math.sin(a)*1.32,0);paddle.rotation.z=a;
  }
  wheel.traverse(o=>{if(o.isMesh)o.userData.forestStatic=false});animated.push({object:wheel,type:'wheel',phase:0});
  beam(scene,[-8.1,1.65,5.4],[-8.1,1.65,7],.15,iron);
  // A separate spring feeds the wheel, then spills over the outside of the island.
  const vertices=[-8.7,3.9,5.3,-8.15,3.9,5.3,-8.7,3.3,6.5,-8.15,3.3,6.5,-8.7,-5.7,6.7,-8.15,-5.7,6.7];
  const waterGeo=new THREE.BufferGeometry();waterGeo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  waterGeo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,.12,1,.12,0,1,1,1],2));waterGeo.setIndex([0,2,1,1,2,3,2,4,3,3,4,5]);waterGeo.computeVertexNormals();
  const water=add(scene,waterGeo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec2 vUv;uniform float time;void main(){float bands=pow(.5+.5*sin(vUv.y*95.-time*6.+sin(vUv.x*20.)*2.),8.);float edges=smoothstep(0.,.16,vUv.x)*smoothstep(1.,.84,vUv.x);gl_FragColor=vec4(mix(vec3(.24,.65,.57),vec3(.88,1.,.89),bands),edges*.72);}`,
  }));water.castShadow=false;water.receiveShadow=false;water.userData.forestStatic=false;animated.push({object:water,type:'water',phase:0});
}

export function createRavineScenery(scene,animated){
  bank(scene,-1);bank(scene,1);rootBridge(scene);mill(scene,animated);
  for(const [x,y,z,s,seed] of [[-18.5,3.82,-4.4,.91,28],[-13.6,3.82,-5,1.17,42],[-9,4.5,-4.3,.84,61],[-5,3.7,-4.3,.85,73],[1.5,-1.78,-4.3,.79,31],[21,-.98,-4.6,1.23,95],[24.6,-.98,.2,.92,19]])tree(scene,x,y,z,s,seed,animated);
  const random=randomSource(159);
  for(const [x,y,z] of [[-18,3.8,4.3],[-14,3.8,-4.3],[1.5,-1.8,-4.3],[22,-1,-4.3],[24,-1,2]]){
    for(let i=0;i<7;i++){
      const dx=(random()-.5)*2.1,dz=(random()-.5)*.7;
      if(i%2)fern(scene,x+dx,y,z+dz,.6+random()*.5,50+i);
      else mushroom(scene,x+dx,y,z+dz,.6+random()*.7,0xd48850);
    }
    const rock=add(scene,new THREE.IcosahedronGeometry(.8,1),stone,x+.3,y-.08,z);rock.scale.set(1.2,.5,.75);
  }
  // Small inhabited islands accompany the safe walkway, but never cover its gaps.
  for(const [x,z,r] of [[3,10.5,1.6],[9,10.7,1.5],[15.6,10,1.3]]){
    const outline=Array.from({length:9},(_,i)=>[x+Math.cos(i/9*Math.PI*2)*r,z+Math.sin(i/9*Math.PI*2)*r]);
    island(scene,outline,3.5,Math.round(x*11),ground(x)-.05);
    mushroom(scene,x,ground(x),z,1.8,0xc57a53);mushroom(scene,x+.8,ground(x),z-.4,.8,0xe7ae66);fern(scene,x-.6,ground(x),z-.5,.8,33);
  }
  const gems=material(0x79cdb2,{emissive:0x44bfa1,emissiveIntensity:.55,roughness:.32});
  for(const side of [-1,1])for(let i=0;i<3;i++)crystal(scene,-2.6+i*.36,-.8+i*.12,side*(1.9+i*.27),.38+i*.17,gems);
  for(const [x,z] of [[-13.4,3.9],[.7,-4],[12.8,8.8],[22.5,-4.3]])lantern(scene,x,ground(x),z);
}

function deckBase(scene,cell,heightAt){
  const {x1,x2,z1,z2}=cell,points=[[x1,z1],[x2,z1],[x2,z2],[x1,z2]],vertices=[];
  for(let i=0;i<4;i++){
    const a=points[i],b=points[(i+1)%4];
    for(const [p,offset] of [[a,0],[a,-.26],[b,0],[b,0],[a,-.26],[b,-.26]])vertices.push(p[0],heightAt(...p)+offset,p[1]);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();add(scene,g,bark);
}

export function createRavineCourse(scene,cells,boundaries,heightAt){
  const floor=createForestSurface(scene,cells,heightAt);
  island(scene,[[-20,-3.6],[-21.4,-4.2],[-19.3,-5.7],[-14,-6],[-12,-4.5],[-12,3.6],[-15,5.3],[-19.8,4.9],[-21,2.4]],6.6,52,3.815);
  island(scene,[[-1,-3.6],[0,-4.8],[3.3,-4.7],[4,-3.6],[4,3.6],[3,4.1],[0,3.6],[-1,2.2]],4.6,22,-1.785);
  // The flat green island starts beyond the sloping apron, so its cap never
  // slices through the approach ramp. Garden props stand on this same level.
  island(scene,[[15,-3.6],[16,-5],[22,-5.9],[25,-4.4],[26,-1],[25,2.7],[23,4.3],[17,4.2],[15,3.6]],5.6,82,-.985);
  // A height-following skirt supports the sloping apron and wooden walkways.
  for(const cell of cells)deckBase(scene,cell,heightAt);
  const posts=new Set();
  // Do not merge across changes of slope: the visible rail and physics must meet.
  for(const e of boundaries){
    if(e.open)continue;
    const {ax,az,bx,bz}=e;
    beam(scene,[ax,heightAt(ax,az)+.16,az],[bx,heightAt(bx,bz)+.16,bz],.105,ax>=-12&&bx<=-1?stone:wood);
  }
  for(const e of fenceRuns(boundaries)){
    const flume=e.ax>=-12&&e.bx<=-1&&Math.abs(e.az)<=1.2;
    if(flume)continue;
    const length=Math.hypot(e.bx-e.ax,e.bz-e.az),count=Math.ceil(length/1.8);
    for(let i=0;i<count;i++){
      const a=i/count,b=(i+1)/count;
      const x=e.ax+(e.bx-e.ax)*a,z=e.az+(e.bz-e.az)*a,xx=e.ax+(e.bx-e.ax)*b,zz=e.az+(e.bz-e.az)*b;
      beam(scene,[x,heightAt(x,z)+.65,z],[xx,heightAt(xx,zz)+.65,zz],.035,cut);
    }
    for(let i=0;i<=count;i++){
      const x=e.ax+(e.bx-e.ax)*i/count,z=e.az+(e.bz-e.az)*i/count,key=`${x.toFixed(3)},${z.toFixed(3)}`;
      if(posts.has(key))continue;posts.add(key);
      beam(scene,[x,heightAt(x,z)-.14,z],[x,heightAt(x,z)+.79,z],.075,bark,.065);
      add(scene,new THREE.ConeGeometry(.105,.10,4),cut,x,heightAt(x,z)+.84,z);
    }
  }
  // The offset board has no guide rails: its visible open edges are the actual
  // falling edges. Under-deck cables are structural, never an invisible guard.
  const shortcut=level.shortcut;
  for(const side of [-1,1]){
    const z=shortcut.z+side*(shortcut.halfWidth-.17);
    tube(scene,[[shortcut.x1-.2,ground(shortcut.x1)-.28,z],[(shortcut.x1+shortcut.x2)/2,ground(8)-1.5,z],[shortcut.x2+.2,ground(shortcut.x2)-.28,z]],.07,bark);
  }
  const warning=material(0xf3c65c);
  for(const e of level.openEdges){
    const a=e.x===undefined?[e.x1,e.z]:[e.x,e.z1],b=e.x===undefined?[e.x2,e.z]:[e.x,e.z2];
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    const count=Math.ceil(length/.65);
    for(let i=0;i<=count;i++){
      const x=a[0]+(b[0]-a[0])*i/count,z=a[1]+(b[1]-a[1])*i/count;
      const horizontal=e.x===undefined,inset=horizontal?(e.z<shortcut.z?.08:-.08):-.08;
      const mark=add(scene,new THREE.BoxGeometry(horizontal?.26:.14,.018,horizontal?.14:.26),warning,x+(horizontal?0:inset),ground(x)+.065,z+(horizontal?inset:0));
      mark.rotation.y=.32;
    }
  }
  // Inlaid arrows on the flume show the slope without adding HUD clutter.
  for(const x of [-11,-8.7,-6.4,-3.4]){
    const shape=new THREE.Shape();shape.moveTo(.34,0);shape.lineTo(-.24,-.28);shape.lineTo(-.05,0);shape.lineTo(-.24,.28);shape.closePath();
    const arrow=add(scene,new THREE.ShapeGeometry(shape),material(0xf4deb3,{side:THREE.DoubleSide}),x,ground(x)+.062,0);arrow.rotation.x=-Math.PI/2;
    const slope=(ground(x+.001)-ground(x-.001))/.002;arrow.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.atan(slope)));
  }
  for(const z of [5.4,8.4]){
    tube(scene,[[1.2,-2.3,z],[7,-3.8,z],[13.7,-2.3,z]],.075,bark);
    for(const x of [2,5,8,11,14])beam(scene,[x,ground(x)-.2,z],[x,ground(x)-1.25,z],.06,cut);
  }
  batchForestMeshes(scene);
  return floor;
}
