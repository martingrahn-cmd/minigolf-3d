import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { gatePose } from './gates.js';
import { modelInstance } from './models.js';
import { createClockTown, wallpaper } from './clock-town.js';
import { t } from './i18n.js';

export const CLOCK_THEME={key:'clockwork',name:t('Urverkets stad'),range:t('HÅL {from}–{to}',{from:'01',to:'06'}),sky:0x1e333c,horizon:0xc6a279,rail:0xc49a58,base:0x392a29,accent:0xe8bd70};
const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.65,...extra});
const brass=mat(0xc99a4c,{metalness:.67,roughness:.32}),gold=mat(0xf0ca7e,{metalness:.55,roughness:.3}),copper=mat(0x986342,{metalness:.5});
const iron=mat(0x263d40,{metalness:.55,roughness:.5}),ivory=mat(0xffe8bc),teal=mat(0x356966),dark=mat(0x242c2d),wood=mat(0x51352e),woodLight=mat(0x86533c);
const glow=mat(0xffd78b,{emissive:0xffba58,emissiveIntensity:1.4,roughness:.3});
function add(g,geo,m,x=0,y=0,z=0){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;g.add(o);return o}
function box(g,w,h,d,x,y,z,m){return add(g,new THREE.BoxGeometry(w,h,d),m,x,y,z)}
function rod(g,a,b,r,m){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),o=add(g,new THREE.CylinderGeometry(r,r,p.distanceTo(q),12),m);o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return o}
// Segments follow the ring's size: a chain link needs a tenth of what the great window does.
const ringGeometries=new Map();
function ring(g,r,t,x,y,z,m){
  const key=`${r}:${t}`;
  if(!ringGeometries.has(key))ringGeometries.set(key,new THREE.TorusGeometry(r,t,t<.06?5:8,Math.round(THREE.MathUtils.clamp(r*28,10,64))));
  return add(g,ringGeometries.get(key),m,x,y,z);
}
function group(g,x=0,y=0,z=0){const o=new THREE.Group();o.position.set(x,y,z);g.add(o);return o}
function bolt(g,x,y,z){const b=add(g,new THREE.CylinderGeometry(.06,.06,.04,6),gold,x,y,z);return b}
function bake(g){
  g.updateMatrixWorld(true);const batches=new Map(),inverse=new THREE.Matrix4().copy(g.matrixWorld).invert();
  g.traverse(o=>{if(o.isMesh){const key=`${o.material.uuid}:${o.castShadow}:${o.receiveShadow}`;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o)}});
  for(const objects of batches.values()){
    if(objects.length<2)continue;
    const geometries=objects.map(o=>{const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();return geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld))});
    const merged=mergeGeometries(geometries);if(!merged)continue;
    const mesh=new THREE.Mesh(merged,objects[0].material);mesh.castShadow=objects[0].castShadow;mesh.receiveShadow=objects[0].receiveShadow;g.add(mesh);
    objects.forEach(o=>o.removeFromParent());geometries.forEach(o=>o.dispose());
  }
}

// True toothed outline with an open hub: the gears cast recognisable silhouettes.
export function createGear(parent,r,teeth,depth=.22,m=brass){
  // Blender gears are normalised to radius 1 and depth 1, one file per tooth count.
  const model=m===brass&&modelInstance(`clockwork/gear-${teeth}`);
  if(model){const root=group(parent);model.scale.set(r,r,depth);root.add(model);return root}
  const root=group(parent),shape=new THREE.Shape();
  for(let i=0;i<teeth*4;i++){
    const a=(i+.15)*Math.PI*2/(teeth*4),radius=r*(i%4===1||i%4===2?1:.87),x=Math.cos(a)*radius,y=Math.sin(a)*radius;
    if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
  }shape.closePath();
  const hole=new THREE.Path();hole.absarc(0,0,r*.55,0,Math.PI*2,true);shape.holes.push(hole);
  add(root,new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1}),m,0,0,-depth/2);
  ring(root,r*.56,.055,0,0,0,gold);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(root,[0,0,0],[Math.cos(a)*r*.64,Math.sin(a)*r*.64,0],r*.065,m)}
  const axle=add(root,new THREE.CylinderGeometry(r*.15,r*.15,depth+.12,16),copper);axle.rotation.x=Math.PI/2;
  const cap=add(root,new THREE.CylinderGeometry(r*.075,r*.075,depth+.15,6),gold);cap.rotation.x=Math.PI/2;
  bake(root);return root;
}
function dialTexture(textOnly=false){
  const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');
  ctx.translate(512,512);
  if(!textOnly){ctx.fillStyle='#f2dcae';ctx.beginPath();ctx.arc(0,0,495,0,Math.PI*2);ctx.fill()}
  ctx.strokeStyle=textOnly?'#e9c68a':'#987346';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,460,0,Math.PI*2);ctx.stroke();
  ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,350,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<60;i++){ctx.save();ctx.rotate(i*Math.PI/30);ctx.fillStyle=textOnly?'#e9c68a':'#5c4532';ctx.fillRect(-2,-448,i%5?3:7,i%5?11:25);ctx.restore()}
  const roman=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
  ctx.font='bold 65px Georgia';ctx.fillStyle=textOnly?'#efd299':'#3d4943';ctx.textAlign='center';ctx.textBaseline='middle';
  roman.forEach((n,i)=>{const a=i*Math.PI/6;ctx.fillText(n,Math.sin(a)*397,-Math.cos(a)*397)});
  if(!textOnly){ctx.font='24px Georgia';ctx.fillStyle='#937344';ctx.fillText(t('URVERKETS STAD'),0,-155);ctx.font='italic 30px Georgia';ctx.fillText(t('Sedan tick blev tack'),0,172)}
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
function clockFace(g,r,x,y,z){
  const root=group(g,x,y,z);
  const face=add(root,new THREE.CircleGeometry(r,96),new THREE.MeshStandardMaterial({map:dialTexture(),roughness:.8}),0,0,.07);face.castShadow=false;
  ring(root,r,.10,0,0,0,brass);ring(root,r*.95,.035,0,0,.09,gold);
  const hour=group(root,0,0,.13),minute=group(root,0,0,.18);
  for(const [h,length,w] of [[hour,r*.52,.13],[minute,r*.77,.085]]){
    box(h,w,length,.055,0,length/2-.09,0,iron);const point=add(h,new THREE.ConeGeometry(w*1.1,.24,4),iron,0,length,0);
    ring(h,w*.8,.026,0,length*.55,.04,gold);
  }
  add(root,new THREE.SphereGeometry(.12,12,8),gold,0,0,.25);
  return {hour,minute};
}
function lantern(g,x,y,z){
  const model=modelInstance('clockwork/lantern');
  if(model){model.position.set(x,y,z);g.add(model);return}
  const root=group(g,x,y,z);rod(root,[0,0,0],[0,1.5,0],.07,iron);
  add(root,new THREE.CylinderGeometry(.18,.22,.55,8),glow,0,1.7,0);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;rod(root,[Math.cos(a)*.2,1.43,Math.sin(a)*.2],[Math.cos(a)*.16,1.98,Math.sin(a)*.16],.025,iron)}
  add(root,new THREE.ConeGeometry(.32,.26,8),brass,0,2.13,0);ring(root,.22,.04,0,1.42,0,brass).rotation.x=Math.PI/2;
}
function chain(g,x,top,bottom,z){
  // Alternating links remain in front of the supports and are visibly connected.
  for(let y=bottom;y<top;y+=.18){const link=ring(g,.095,.022,x,y,z,iron);link.scale.y=1.28;link.rotation.y=Math.round(y/.18)%2*Math.PI/2}
}

export function createClockGates(scene,gates=[]){
  return gates.map(gate=>{
    const frame=group(scene,gate.x,.04,gate.z),statics=group(frame),panel=group(frame);panel.name='clock-gate-panel';
    const movingGears=[],weights=[],lights=[];
    for(const side of [-1,1]){
      const z=side*gate.postOffset;
      add(statics,new THREE.CylinderGeometry(gate.postRadius,gate.postRadius,4,16),iron,0,2,z);
      for(const y of [.15,.45,3.75])add(statics,new THREE.CylinderGeometry(.29,.29,.13,16),brass,0,y,z);
      box(statics,.5,4,.23,.25,2,z+side*.3,wood);
      const rack=group(statics,.18,1.7,z);for(let y=-1.6;y<2;y+=.17)box(rack,.13,.065,.23,0,y,0,gold);
      const gear=createGear(frame,.64,16,.2);gear.position.set(0,3.7,z);gear.rotation.y=Math.PI/2;movingGears.push({gear,side});
      const weight=group(frame,.15,0,z+side*.64);weight.name=`clock-counterweight-${side}`;weights.push(weight);
      add(weight,new THREE.CylinderGeometry(.25,.25,.95,12),copper,0,0,0);
      for(const y of [-.48,-.3,.3,.48])add(weight,new THREE.CylinderGeometry(.28,.28,.06,12),brass,0,y,0);
      ring(weight,.14,.04,0,.59,0,gold);
      chain(statics,.15,3.7,-1.35,z+side*.64);
      const signal=mat(0x80e0b4,{emissive:0x5aca9b,emissiveIntensity:.8});lights.push(signal);
      const disk=add(statics,new THREE.CylinderGeometry(.17,.17,.1,24),signal,-.29,2.55,z);disk.rotation.z=Math.PI/2;
      const rim=ring(statics,.21,.04,-.34,2.55,z,brass);rim.rotation.y=Math.PI/2;
      bake(weight);
    }
    box(statics,.75,.3,5.8,0,4.04,0,wood);box(statics,.8,.10,5.9,0,4.23,0,gold);
    box(panel,gate.thickness,.15,gate.halfWidth*2,0,.075,0,brass);
    box(panel,gate.thickness,.14,gate.halfWidth*2,0,1.05,0,brass);
    for(let i=0;i<13;i++)box(panel,gate.thickness*.7,.94,.065,0,.55,-gate.halfWidth+.08+i*(gate.halfWidth*2-.16)/12,gold);
    const medallion=add(panel,new THREE.CylinderGeometry(.36,.36,.1,24),teal,-.18,.59,0);medallion.rotation.z=Math.PI/2;
    const hoop=ring(panel,.33,.045,-.24,.59,0,gold);hoop.rotation.y=Math.PI/2;
    bake(statics);bake(panel);
    return {update(time){const pose=gatePose(time,gate);panel.position.y=pose.height;weights.forEach(w=>w.position.y=2.15-pose.height);
      movingGears.forEach(({gear,side})=>gear.rotation.x=side*pose.height/.6);
      for(const light of lights){const c=pose.signal==='green'?0x70e6b1:pose.signal==='amber'?0xf3b653:0xca6954;light.color.setHex(c);light.emissive.setHex(c)}
    }};
  });
}

function surfaceTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,256,256);
  // Dense, restrained weave keeps the velvet readable close to the ball.
  ctx.strokeStyle='#d0dfd9';ctx.lineWidth=.4;
  for(let i=0;i<256;i+=3){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,256);ctx.stroke();ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(256,i);ctx.stroke()}
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;return texture;
}
export function createClockCourse(scene,cells,boundaries,level,heightAt=()=>0){
  const statics=group(scene),vertices=[],colors=[],uvs=[];
  for(const cell of cells){
    if(['bell-bridge','lift','clock-hand'].includes(cell.surface))continue;
    const funnel=level.funnel,cx=(cell.x1+cell.x2)/2,cz=(cell.z1+cell.z2)/2;
    // A real opening: neither the felt nor the structural deck crosses the bowl.
    if(funnel&&Math.abs(cx-funnel.x)<funnel.plate&&Math.abs(cz-funnel.z)<funnel.plate)continue;
    const cuts=(a,b)=>[a,...Array.from({length:Math.max(0,Math.ceil(b/1.25)-Math.floor(a/1.25)-1)},(_,i)=>(Math.floor(a/1.25)+i+1)*1.25),b];
    const xs=cuts(cell.x1,cell.x2),zs=cuts(cell.z1,cell.z2);
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
      const x1=xs[i],x2=xs[i+1],z1=zs[j],z2=zs[j+1],check=(Math.floor((x1+x2)/2/1.25)+Math.floor((z1+z2)/2/1.25))%2;
      const color=new THREE.Color(cell.color).multiplyScalar(check?1.045:.97);
      for(const [x,z] of [[x1,z1],[x1,z2],[x2,z1],[x1,z2],[x2,z2],[x2,z1]]){vertices.push(x,heightAt(x,z)+.04,z);colors.push(color.r,color.g,color.b);uvs.push(x*.55,z*.55)}
    }
    const body=new THREE.BoxGeometry(cell.x2-cell.x1,.75,cell.z2-cell.z1),pos=body.attributes.position;
    body.translate(cx,-.4,cz);
    for(let i=0;i<pos.count;i++)pos.setY(i,pos.getY(i)+heightAt(pos.getX(i),pos.getZ(i)));
    body.computeVertexNormals();add(statics,body,wood);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
  const floor=add(scene,geometry,mat(0xffffff,{vertexColors:true,map:surfaceTexture(),roughness:.92}));floor.castShadow=false;floor.name='clockwork-fairway';
  const corners=new Set();
  for(const e of boundaries){
    if(e.open)continue;
    if(level.lift&&e.ax>=level.lift.x1&&e.bx<=level.lift.x2&&e.az===e.bz)continue;
    const ay=heightAt(e.ax,e.az),by=heightAt(e.bx,e.bz);
    const a=[e.ax,ay+.21,e.az],b=[e.bx,by+.21,e.bz];rod(statics,a,b,.1,brass);
    rod(statics,[e.ax,ay-.45,e.az],[e.bx,by-.45,e.bz],.035,gold);
    const length=Math.hypot(e.bx-e.ax,e.bz-e.az),count=Math.ceil(length/1.8);
    for(let i=0;i<=count;i++){
      const x=e.ax+(e.bx-e.ax)*i/count,z=e.az+(e.bz-e.az)*i/count,key=`${x},${z}`;if(corners.has(key))continue;corners.add(key);
      bolt(statics,x,heightAt(x,z)+.12,z);
    }
  }
  // End-grain supports, mortise plates and rivets make the lane part of the clock.
  for(const [x,z] of level.clockCourse?.pillars||[[-16,0],[-9,0],[-1,0],[6,0],[11,-6]]){
    const h=heightAt(x,z),top=h-.95;
    box(statics,.9,top+6.4,1.1,x,(top-6.4)/2,z,wood);box(statics,2.1,.35,2.1,x,top,z,iron);
    for(const side of [-1,1])rod(statics,[x,h-3.3,z],[x+side*2.1,h-.85,z],.14,woodLight);
    for(const y of [h-1.4,-3.9])box(statics,1.03,.16,1.23,x,y,z,brass);
  }
  const matDial=new THREE.MeshStandardMaterial({map:dialTexture(true),transparent:true,depthWrite:false,roughness:.85});
  const d=level.clockCourse?.dial||{x:11,z:-6.1,size:7.3};
  const dial=add(scene,new THREE.PlaneGeometry(d.size,d.size),matDial,d.x,heightAt(d.x,d.z)+.07,d.z);dial.rotation.x=-Math.PI/2;dial.castShadow=false;
  // Inlaid compass ticks introduce the forward line without intrusive UI arrows.
  for(let x=level.start.x;x<(level.funnel?level.funnel.x-level.funnel.plate:-6);x+=1.15){const tick=box(statics,.32,.008,.035,x,heightAt(x,0)+.056,0,gold);tick.castShadow=false}
  for(const [x,z] of level.clockCourse?.lamps||[[-17,-3.65],[-8.5,-3.65],[2,3.7],[9.8,3.7],[15.8,-9.9]])lantern(statics,x,heightAt(x,z),z);
  for(const e of level.banks||[]){
    const y=heightAt(e.ax,e.az);
    rod(statics,[e.ax,y+.21,e.az],[e.bx,y+.21,e.bz],.1,brass);
    for(let t=0;t<=1;t+=.2){const x=THREE.MathUtils.lerp(e.ax,e.bx,t),z=THREE.MathUtils.lerp(e.az,e.bz,t);bolt(statics,x,y+.31,z)}
  }
  bake(statics);return floor;
}

// Shared construction vocabulary for the city's mechanical landmarks.
export const clockKit={add,box,rod,ring,group,bolt,bake,lantern,brass,gold,copper,iron,ivory,teal,dark,wood,woodLight,glow};

function cuckooHouse(scene,x,z,scale,animated,hero=false){
  const root=group(scene,x,-1,z);root.scale.setScalar(scale);const fixed=group(root);
  // The Blender shell replaces the carcass, roof and frames; the moving parts stay in code.
  const shellModel=modelInstance('clockwork/cuckoo-house');
  if(shellModel)fixed.add(shellModel);
  else{
  box(fixed,5.4,9.8,2.5,0,3.9,0,wood);box(fixed,4.8,8.9,.13,0,4,1.3,woodLight);
  for(const side of [-1,1]){
    box(fixed,.28,9.4,.2,side*2.35,4,1.47,brass);
    for(const y of [0,2.7,6.3,8.2])box(fixed,.43,.15,.23,side*2.35,y,1.5,gold);
    const roof=box(fixed,4.3,.35,4.2,side*1.62,9.5,0,teal);roof.rotation.z=-side*.6;
    rod(fixed,[0,10.7,2.1],[side*3.45,8.38,2.1],.16,brass);
    // Layered roof ribs and scalloped eaves, all outside the playing space.
    for(let i=0;i<6;i++)rod(fixed,[side*(.25+i*.51),10.5-i*.34,-2.15],[side*(.25+i*.51),10.5-i*.34,2.15],.06,copper);
  }
  }
  const face=clockFace(root,2.0,0,4.2,1.48);animated.push({kind:'hands',...face});
  if(!shellModel)box(fixed,1.35,1.6,.16,0,7.63,1.43,dark);
  const bird=group(root,0,7.28,1.0);
  const body=add(bird,new THREE.SphereGeometry(.32,16,10),teal,0,.22,0);body.scale.set(.8,1,.9);
  add(bird,new THREE.SphereGeometry(.23,14,10),ivory,0,.54,.10);
  for(const s of [-1,1]){add(bird,new THREE.SphereGeometry(.045,10,8),dark,s*.12,.6,.28);const wing=add(bird,new THREE.SphereGeometry(.2,10,8),copper,s*.25,.25,0);wing.scale.set(.3,1,.9)}
  const beak=add(bird,new THREE.ConeGeometry(.10,.28,5),gold,0,.48,.39);beak.rotation.x=Math.PI/2;
  const doorLeft=group(root,-.67,7.6,1.55),doorRight=group(root,.67,7.6,1.55);
  box(doorLeft,.65,1.5,.09,.33,0,0,teal);box(doorRight,.65,1.5,.09,-.33,0,0,teal);
  animated.push({kind:'bird',bird,doorLeft,doorRight,hero});
  const pendulum=group(root,0,1.65,1.6);rod(pendulum,[0,0,0],[0,-2.55,0],.045,brass);
  const bob=add(pendulum,new THREE.CylinderGeometry(.56,.56,.18,40),gold,0,-2.5,0);bob.rotation.x=Math.PI/2;
  ring(pendulum,.44,.03,0,-2.5,.13,copper);animated.push({kind:'pendulum',object:pendulum});
  if(!shellModel)box(fixed,1.8,3.1,.12,0,.0,1.38,dark);
  for(const s of [-1,1]){chain(fixed,s*1.6,1.7,-3,1.5);const weight=add(fixed,new THREE.CylinderGeometry(.29,.19,1.2,10),copper,s*1.6,-2.2,1.5);for(let y=-2.7;y<-1.5;y+=.17)ring(fixed,.26,.04,s*1.6,y,1.5,gold).rotation.x=Math.PI/2}
  // Hands, doors and pendulum remain independent of the architectural batch,
  // but each moving part is merged into one mesh per material.
  bake(fixed);bake(face.hour);bake(face.minute);bake(bird);bake(pendulum);
  return root;
}

export function createClockEnvironment(scene,level){
  const animated=[],statics=group(scene);scene.background=new THREE.Color(0x32494c);scene.fog=new THREE.Fog(0x32494c,48,105);
  scene.add(new THREE.HemisphereLight(0xe6f0e1,0x6a4330,1.6));
  const sun=new THREE.DirectionalLight(0xffdc9e,3.1);sun.position.set(-12,25,-4);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
  Object.assign(sun.shadow.camera,{left:-32,right:32,top:28,bottom:-28,near:.5,far:85});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun);
  const blue=new THREE.DirectionalLight(0x8ac4d1,1.2);blue.position.set(8,14,20);scene.add(blue);
  const wall=mat(0x354949),plaster=mat(0x68817c),floorMat=mat(0x342b2b);
  // A great clock cabinet, open toward the camera. Its ribs enclose the whole city.
  box(statics,105,1,90,0,-7.6,0,floorMat);box(statics,94,30,1,0,7,-32,mat(0xffffff,{map:wallpaper(15.7,5),roughness:.85}));
  for(let x=-42;x<45;x+=7){box(statics,.8,31,1.5,x,7,-31.2,wood);box(statics,6.1,.15,.15,x+3.5,-3,-30.6,copper)}
  for(const y of [-5,1,13,21])box(statics,94,.45,1.5,0,y,-30.7,woodLight);
  box(statics,1,39,92,45,11,0,mat(0xffffff,{map:wallpaper(15,6.5),roughness:.85}));
  for(let z=-35;z<43;z+=7)box(statics,1.5,39,.65,44.3,11,z,wood);
  for(const y of [-5,6,17,28])box(statics,1.5,.45,90,44.3,y,0,woodLight);
  // Glowing cathedral-like clock window, with radial spokes and a brass frame.
  const windowGlow=new THREE.MeshBasicMaterial({color:0xb9d4c4});
  const aperture=add(statics,new THREE.CircleGeometry(10,80),windowGlow,3,9,-31.3);aperture.castShadow=false;
  ring(statics,10,.35,3,9,-30.8,brass);ring(statics,8.8,.08,3,9,-30.6,gold);
  for(let i=0;i<16;i++){const a=i*Math.PI/8;rod(statics,[3,9,-30.5],[3+Math.sin(a)*9.9,9+Math.cos(a)*9.9,-30.5],.11,wood)}
  const eastWindow=group(statics,44,13,9);eastWindow.rotation.y=-Math.PI/2;
  add(eastWindow,new THREE.CircleGeometry(7,64),new THREE.MeshBasicMaterial({color:0x91b9b7})).castShadow=false;
  ring(eastWindow,7,.28,0,0,.1,brass);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;rod(eastWindow,[0,0,.2],[Math.sin(a)*7,Math.cos(a)*7,.2],.09,wood)}
  // Massive toothed wheels sit in the cabinet rather than masquerading as islands.
  // What already stands in the room, so the town below keeps clear of it.
  const obstacles=[];
  for(const [x,y,z,r,teeth,speed] of [[-19,4,-17,5.6,44,.06],[-9.1,4,-17,4.3,34,-.06*44/34],[21,3,-20,6.2,48,-.045],[31,3,-20,4.1,32,.045*48/32],[-27,.5,9,4.2,32,.055]]){
    const gear=createGear(scene,r,teeth,.65);gear.position.set(x,y,z);animated.push({kind:'gear',object:gear,speed});
    rod(statics,[x,y,z-4],[x,y,z+1],.3,iron);obstacles.push({x,z:z-1.5,rx:r,rz:2.6,bottom:y-r});
  }
  // Move the complete landmark back on hole 5, including its roof overhang.
  const heroHouseZ=level?.clockScenery?.heroZ??(level?.id===5?-22:-17),heroHouseX=level?.clockScenery?.heroX??9;
  cuckooHouse(scene,heroHouseX,heroHouseZ,1.35,animated,true).rotation.y=-.35;
  for(const [x,z,s] of [[-25,-25,.65],[-11,-26,.5],[29,-29,.9],[36,-12,.58]])cuckooHouse(scene,x,z,s,animated);
  const easternHouse=cuckooHouse(scene,34,9,.95,animated);easternHouse.rotation.y=-Math.PI/2;
  // Balconies, connecting catwalks, pipes and hanging shop signs give it a lived-in scale.
  for(const [x,z,s] of [[-25,-25,.65],[-11,-26,.5],[heroHouseX,heroHouseZ,1.35],[29,-29,.9],[36,-12,.58],[34,9,.95]])obstacles.push({x,z,rx:4.2*s+.5,rz:4.2*s+.5,bottom:-1-3.8*s});
  obstacles.push({x:-4,z:-23,rx:30,rz:1.3,bottom:-3.6});
  for(const [x,z,s] of [[-25,-25,.65],[-11,-26,.5],[heroHouseX,heroHouseZ,1.35],[29,-29,.9],[36,-12,.58]]){
    box(statics,7*s,.32,5*s,x,-2,z+1);box(statics,7*s,.08,5*s,x,-1.8,z+1,brass);
    for(const side of [-1,1]){rod(statics,[x+side*3*s,-1.8,z+3*s],[x+side*3*s,0,z+3*s],.06,iron);lantern(statics,x+side*3*s,-1.8,z+3*s)}
  }
  for(let i=0;i<14;i++){const x=-31+i*4;box(statics,3.9,.18,2,x,-3.4,-23,woodLight);for(const z of [-24,-22])rod(statics,[x-2,-2.7,z],[x+2,-2.7,z],.055,brass)}
  for(const [x,z] of [[-21,5],[level?.clockScenery?.pipeX??(level?.id===3?25.2:level?.id===4?25:20),5],[-21,-12]]){
    rod(statics,[x,-7,z],[x,3,z],.22,copper);obstacles.push({x,z,rx:1,rz:1,bottom:-7.2});ring(statics,.3,.07,x,2.1,z,brass).rotation.x=Math.PI/2;
    const elbow=add(statics,new THREE.TorusGeometry(.65,.22,10,24,Math.PI/2),copper,x+.65,3,z);elbow.rotation.z=Math.PI/2;
  }
  // A tiny watchmaker's desk and stacked spring barrels beside the opening tee.
  const deskX=level?.clockScenery?.deskX??(level?.id===3?-18.5:-15),deskZ=level?.clockScenery?.deskZ??(level?.id===3?7.2:5.3);
  box(statics,4,.28,2.1,deskX,-.15,deskZ,woodLight);
  for(const x of [deskX-1.6,deskX+1.6])for(const z of [deskZ-.8,deskZ+.8])box(statics,.25,3,.25,x,-1.8,z,iron);
  for(let i=0;i<3;i++){
    const gear=createGear(statics,.55+i*.12,12+i*4,.1);gear.position.set(deskX-1+i*1.15,.04,deskZ-.1);gear.rotation.x=-Math.PI/2;
  }
  lantern(statics,deskX+2,0,deskZ+.1);obstacles.push({x:deskX,z:deskZ,rx:2.4,rz:1.4,bottom:-7.2},{x:-18,z:9,rx:3.6,rz:.6,bottom:-7.2});
  // Cabinet-floor parquet and inlaid copper rails replace a featureless void.
  const parquet=[mat(0x42382e),mat(0x4a3b30),mat(0x3b3530)];
  for(let x=-40;x<44;x+=4)for(let z=-30;z<36;z+=3){
    const ix=Math.round((x+40)/4),iz=Math.round((z+30)/3);
    box(statics,3.96,.025,2.97,x,-7.075,z,parquet[(ix+iz*2)%3]);
  }
  for(const z of [-10,10])rod(statics,[-40,-7.02,z],[42,-7.02,z],.035,copper);
  // A wound mainspring and open gear train sit below the outside of the tee.
  const spring=group(scene,-18,-3.8,9),spiral=[];
  for(let i=0;i<=250;i++){const a=i/250*Math.PI*7,r=.35+i/250*2.8;spiral.push(new THREE.Vector3(Math.cos(a)*r,Math.sin(a)*r,0))}
  add(spring,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral),250,.09,8,false),brass);
  ring(spring,3.35,.15,0,0,0,iron);const springHub=createGear(spring,.6,12,.25);animated.push({kind:'gear',object:spring,speed:.025});
  bake(statics);statics.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false});
  const points=[];let seed=197;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};
  for(let i=0;i<130;i++)points.push(-30+random()*60,-4+random()*22,-28+random()*48);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
  const dust=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xffd999,size:.045,transparent:true,opacity:.5,depthWrite:false}));scene.add(dust);
  const town=createClockTown(scene,level,{...clockKit,mat},obstacles);
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {theme:CLOCK_THEME,update(time,gateTime=time){
    town.update(time);
    if(reducedMotion)return;
    dust.position.y=Math.sin(time*.1)*.2;
    for(const entry of animated){
      if(entry.kind==='gear')entry.object.rotation.z=time*entry.speed;
      if(entry.kind==='hands'){entry.hour.rotation.z=-time*.014-.7;entry.minute.rotation.z=-time*.168-2.3}
      if(entry.kind==='pendulum')entry.object.rotation.z=Math.sin(time*1.8)*.28;
      if(entry.kind==='bird'){
        const t=(entry.hero?gateTime:time)%8.6,open=t>1.5&&t<7.3?Math.min(1,(t-1.5)*3,(7.3-t)*3):0;
        entry.bird.position.z=1.0+open;entry.doorLeft.rotation.y=-open*1.9;entry.doorRight.rotation.y=open*1.9;
      }
    }
  }};
}
