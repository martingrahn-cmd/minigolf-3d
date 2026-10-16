import * as THREE from 'three';
import { createEnvironment, themeFor } from './environment.js';
import { createBridge, createBumpers, createGates, createIceFeatures } from './obstacles.js';
import { createForestCourse } from './forest.js';
import { createRavineCourse } from './ravine.js';
import { createAcornCourse, createAcornPendulum } from './acorn.js';
import { createCrownCourse, createTrapdoors, createThornSpinner } from './crown.js';
import { createLoopCourse } from './loop-visuals.js';
import { createCarnival } from './carnival-visuals.js';
import { createClockCourse, createClockGates } from './clockwork.js';
import { createCupHole, createCupCritter, createLipRescuer } from './cup-celebration.js';
import { createFunnelVisuals } from './funnel-visuals.js';
import { createBellBridgeVisuals } from './bell-bridge-visuals.js';
import { createLiftVisuals } from './lift-visuals.js';
import {createClockWheelVisuals,createClockBumpers} from './clock-wheel-visuals.js';
import {createClockHandVisuals} from './clock-hand-visuals.js';
import {createMotherTreeCourse,createMotherTree} from './mother-tree-visuals.js';
import {createMoonCourse,createRocketPads,createPlanetBumpers,createBlackHole,createCometCannon,createGondolaWheel,createMoonRocket} from './moon.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { preloadModels, modelInstance, tintMaterials, COMMON_MODELS, CLOCK_MODELS, FOREST_MODELS, MOON_MODELS } from './models.js';

import { LEVEL, CUP, CANNON, LANDING, PIPE_IN, PIPE_OUT, PIPE_DIRECTION, PIPE_ENTRY, PIPE_GUIDES, pipeWorld, SPRINGS, SPINNER, TILES, CELLS, BOUNDARIES, heightAt, heightSlope, onCourse } from './layout.js';
export * from './layout.js';

const mat = (color, roughness = .75, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const theme=themeFor(LEVEL.id);
const cream = mat(theme.rail);
if(theme.key==='neon'){cream.emissive.set(theme.rail);cream.emissiveIntensity=.25}
const deep = mat(theme.base);
const dark = mat(0x18344b);
const water = mat(0x5bb8d3, .28, .12);

function box(scene, w, h, d, x, y, z, material, shadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function cylinder(scene, r1, r2, h, x, y, z, material, sides = 18) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, sides), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function torus(scene, radius, tube, x, y, z, material) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 9, 48), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

function makeLabel(scene, text, x, z, color = '#203e52') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const forest=['forest','clockwork'].includes(theme.key);
  ctx.fillStyle = forest?'#795438':'#fff9e7';
  ctx.beginPath();ctx.roundRect(5, 5, 502, 118, forest?8:28);ctx.fill();
  ctx.strokeStyle = forest?'#d4b683':'#e4d5b4';ctx.lineWidth = 6;ctx.stroke();
  ctx.fillStyle = forest?'#fff0c6':color;ctx.font = '800 48px Fredoka, sans-serif';ctx.textAlign = 'center';ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  const texture = new THREE.CanvasTexture(canvas);texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.5, .88), new THREE.MeshBasicMaterial({ map:texture, transparent:true, side:THREE.DoubleSide }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, (LEVEL.heightProfile?heightAt(x,z):0)+.11, z);
  if(LEVEL.heightProfile)mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.atan(heightSlope(x,z))));
  scene.add(mesh);
}

export async function createCourse(scene) {
  await preloadModels([...COMMON_MODELS,...({moon:MOON_MODELS,forest:FOREST_MODELS,clockwork:CLOCK_MODELS}[theme.key]??[])]);
  const environment=createEnvironment(scene,LEVEL);
  const bridge=createBridge(scene,LEVEL.bridge);
  const bumpers=LEVEL.clockWheel?createClockBumpers(scene,LEVEL.bumpers):theme.key==='moon'?createPlanetBumpers(scene,LEVEL.bumpers):createBumpers(scene,LEVEL.bumpers);
  const blackHole=createBlackHole(scene,LEVEL.blackHole);
  const cometCannon=LEVEL.scenery==='moonrocket'?createMoonRocket(scene,LEVEL.cometCannon,onCourse):createCometCannon(scene,LEVEL.cometCannon,onCourse);
  const ferris=createGondolaWheel(scene,LEVEL.ferris);
  const gates=theme.key==='clockwork'?createClockGates(scene,LEVEL.gates):createGates(scene,LEVEL.gates);
  const carnival=createCarnival(scene,LEVEL);
  const pendulum=createAcornPendulum(scene,LEVEL.pendulum);
  const trapdoors=createTrapdoors(scene,LEVEL.trapdoors);
  createIceFeatures(scene,LEVEL,heightAt,heightSlope);

  // One contiguous playing surface, with the same boundary used by ball physics.
  let floor;
  if(theme.key==='clockwork'){
    floor=createClockCourse(scene,CELLS,BOUNDARIES,LEVEL,heightAt);
  }else if(theme.key==='moon'){
    floor=createMoonCourse(scene,CELLS,BOUNDARIES,heightAt,LEVEL);
  }else if(theme.key==='forest'){
    floor=(LEVEL.scenery==='mothertree'?createMotherTreeCourse:LEVEL.scenery==='crown'?createCrownCourse:LEVEL.scenery==='loop'?createLoopCourse:LEVEL.scenery==='acorn'?createAcornCourse:LEVEL.scenery==='ravine'?createRavineCourse:createForestCourse)(scene,CELLS,BOUNDARIES,heightAt);
  }else{
  const vertices=[],colors=[],indices=[],sideVertices=[],sideIndices=[];
  for(const cell of CELLS){
    if(cell.dynamic)continue;
    const offset=vertices.length/3,color=new THREE.Color(cell.color);
    for(const [x,z] of [[cell.x1,cell.z1],[cell.x1,cell.z2],[cell.x2,cell.z1],[cell.x2,cell.z2]]){
      vertices.push(x,(LEVEL.bridge?0:heightAt(x,z))+.04,z);colors.push(color.r,color.g,color.b);
    }
    indices.push(offset,offset+1,offset+2,offset+1,offset+3,offset+2);
  }
  const floorGeometry=new THREE.BufferGeometry();
  floorGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  floorGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  floorGeometry.setIndex(indices);floorGeometry.computeVertexNormals();
  floor=new THREE.Mesh(floorGeometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85}));
  floor.receiveShadow=true;scene.add(floor);
  if(LEVEL.heightProfile){
    const underside=new THREE.Mesh(floorGeometry.clone().translate(0,-1.09,0),new THREE.MeshStandardMaterial({color:theme.base,side:THREE.BackSide}));
    underside.castShadow=true;scene.add(underside);
  }else for(const t of TILES.filter(tile=>!tile.dynamic))box(scene,t.x2-t.x1,.9,t.z2-t.z1,(t.x1+t.x2)/2,-.6,(t.z1+t.z2)/2,deep);
  for(const edge of BOUNDARIES){
    if(edge.dynamic)continue;
    const {ax,az,bx,bz}=edge;
    const ay=LEVEL.bridge?0:heightAt(ax,az),by=LEVEL.bridge?0:heightAt(bx,bz),n=sideVertices.length/3;
    sideVertices.push(ax,(LEVEL.heightProfile?ay:0)-1.05,az,bx,(LEVEL.heightProfile?by:0)-1.05,bz,ax,ay+.035,az,bx,by+.035,bz);
    sideIndices.push(n,n+1,n+2,n+1,n+3,n+2);
    if(edge.open)continue;
    const a=new THREE.Vector3(ax,ay+.21,az),b=new THREE.Vector3(bx,by+.21,bz);
    const rail=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,a.distanceTo(b),8),cream);
    rail.position.copy(a).add(b).multiplyScalar(.5);
    rail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
    rail.castShadow=true;rail.receiveShadow=true;scene.add(rail);
  }
  const sides=new THREE.BufferGeometry();sides.setAttribute('position',new THREE.Float32BufferAttribute(sideVertices,3));sides.setIndex(sideIndices);sides.computeVertexNormals();
  const sideMesh=new THREE.Mesh(sides,new THREE.MeshStandardMaterial({color:theme.base,side:THREE.DoubleSide}));sideMesh.castShadow=true;sideMesh.receiveShadow=true;scene.add(sideMesh);
  }
  const funnel=createFunnelVisuals(scene,LEVEL);
  const bellBridge=createBellBridgeVisuals(scene,LEVEL.bellBridge);
  const lift=createLiftVisuals(scene,LEVEL.lift);
  const clockWheel=createClockWheelVisuals(scene,LEVEL.clockWheel);
  const clockHand=createClockHandVisuals(scene,LEVEL.clockHand,CUP);
  const motherTree=createMotherTree(scene,LEVEL);
  for(let i=0;LEVEL.hasRamp!==false&&i<4;i++){
    const x=-9.5+i*.28;
    const line=box(scene,.095,.012,4.35,x,heightAt(x,0)+.055,0,cream,false);
    line.rotation.z=Math.atan(.62);
  }
  for(const [text,x,z] of LEVEL.labels)makeLabel(scene,text,x,z,'#236b69');

  if(LEVEL.cannon){
  // The jump is a small floating pool below the course edge.
  box(scene,3.6,.15,5.9,8.45,-2.05,-1.05,water,false);
  for(let i=0;i<3;i++){
    const ring=torus(scene,.55+i*.42,.045,8.5,-1.95,-1.2,new THREE.MeshBasicMaterial({color:0xd5f8f5,transparent:true,opacity:.62-i*.15}));
    ring.userData.waterRing=i;
  }
  box(scene,3.1,.12,5.4,8.45,-2.17,-1.05,dark,false);

  }

  // Floating structural details make the hole read as one toy-sized set.
  for(const [x,z,s] of theme.key==='forest'?[]:LEVEL.supports){
    cylinder(scene,1.25*s,1.05*s,2.3+(LEVEL.heightProfile?heightAt(x,z):0),x,-2.2+(LEVEL.heightProfile?heightAt(x,z)/2:0),z,mat(0x568e9d));
    cylinder(scene,1.6*s,1.25*s,.25,x,-3.4,z,mat(0x2f6477));
  }
  // Cup and its visible rim are authored separately for reliable collision detection.
  const cupHeight=heightAt(CUP.x,CUP.z);
  cylinder(scene,.49,.49,.03,CUP.x,cupHeight+.05,CUP.z,dark,40);
  cylinder(scene,.35,.35,.015,CUP.x,cupHeight+.073,CUP.z,mat(0x071b2a),40);
  torus(scene,.83,.025,CUP.x,cupHeight+.04,CUP.z,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.6}));
  // The flagpole now goes into the actual cup. The Blender pin replaces the
  // procedural pole, rim and pennant when it has loaded.
  const flagColor=theme.key==='forest'?0xffc35c:0xed6655,pin=modelInstance('common/flag');
  // The flag stands in a group so the sink celebration can lift it out of the cup.
  const flagstick=new THREE.Group();flagstick.position.set(CUP.x,cupHeight,CUP.z);scene.add(flagstick);
  if(pin){
    tintMaterials(pin,{Flag:flagColor});pin.rotation.y=-.35;flagstick.add(pin);
  }else{
  torus(scene,.47,.055,CUP.x,cupHeight+.085,CUP.z,cream);
  cylinder(flagstick,.032,.032,2.7,0,1.38,0,cream,12);
  const pennant=new THREE.Shape();pennant.moveTo(0,0);pennant.lineTo(1.05,-.18);pennant.lineTo(0,-.57);pennant.closePath();
  const flag=new THREE.Mesh(new THREE.ShapeGeometry(pennant),new THREE.MeshStandardMaterial({color:flagColor,side:THREE.DoubleSide,roughness:.65}));
  flag.position.set(0,2.62,0);flag.rotation.y=-.35;flag.castShadow=true;flagstick.add(flag);
  }
  createCupHole(scene,CUP.x,cupHeight,CUP.z,theme.key);
  const cupCritter=createCupCritter(scene,theme.key,{x:CUP.x,y:cupHeight,z:CUP.z});
  const lipRescuer=createLipRescuer(scene,theme.key,heightAt);

  const spinner = SPINNER?new THREE.Group():null;
  if(spinner){spinner.position.set(SPINNER.x,.04,SPINNER.z);scene.add(spinner)}

  const rocketPads=theme.key==='moon'?createRocketPads(scene,SPRINGS,heightAt):null;
  const springGlows=rocketPads?rocketPads.glows:SPRINGS.map(spring=>{
    const glow=cylinder(scene,.88,.88,.08,spring.x,.1,spring.z,mat(0xffd36f));
    torus(scene,.95,.07,spring.x,.16,spring.z,cream);
    // Painted chevrons make the outgoing boost direction visible before a shot.
    for(const distance of [1.3,1.9,2.5]){
      const points=[[distance+.20,0],[distance-.15,-.24],[distance-.15,.24]].flatMap(([along,across])=>[
        spring.x+along*spring.dx-across*spring.dz,.09,spring.z+along*spring.dz+across*spring.dx,
      ]);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex([0,1,2]);
      scene.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xffe295,side:THREE.DoubleSide})));
    }
    return glow;
  });

  // Add authored KayKit pieces as interactive landmarks and playful set dressing.
  const loader=new GLTFLoader();
  const cache=new Map();
  async function model(name,folder,x,y,z,scale=1,rotation=0,group=scene){
    const url=`${import.meta.env?.BASE_URL??"/"}assets/kaykit/${folder}/${name}.gltf`;
    if(!cache.has(url))cache.set(url,loader.loadAsync(url));
    try{
      const gltf=await cache.get(url);
      const obj=gltf.scene.clone(true);obj.position.set(x,y,z);obj.scale.setScalar(scale);obj.rotation.y=rotation;
      obj.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});group.add(obj);return obj;
    }catch(e){console.warn('Kunde inte läsa modell',url,e);return null}
  }
  if(SPINNER?.custom==='thorn')createThornSpinner(spinner,SPINNER);
  else if(SPINNER){
    const swiper=await model(SPINNER.model,SPINNER.folder,0,0,0,1,0,spinner);
    if(swiper)swiper.scale.set(SPINNER.scale,.45,SPINNER.scale);
  }

  let pipePath=null;
  if(LEVEL.hasPipe){
  // A visible funnel raises the ball to the centre of the opening.
  const rampCorners=[pipeWorld(-PIPE_ENTRY.length,-PIPE_ENTRY.startHalfWidth),pipeWorld(-PIPE_ENTRY.length,PIPE_ENTRY.startHalfWidth),pipeWorld(0,-PIPE_ENTRY.endHalfWidth),pipeWorld(0,PIPE_ENTRY.endHalfWidth)];
  const rampVertices=[];
  rampCorners.forEach((p,i)=>rampVertices.push(p.x,.045+(i<2?0:PIPE_ENTRY.rise),p.z));
  const inletRamp=new THREE.BufferGeometry();
  inletRamp.setAttribute('position',new THREE.Float32BufferAttribute(rampVertices,3));
  inletRamp.setIndex([0,1,2,1,3,2]);inletRamp.computeVertexNormals();
  const scoop=new THREE.Mesh(inletRamp,new THREE.MeshStandardMaterial({color:0x80c4d4,roughness:.7,side:THREE.DoubleSide}));
  scoop.receiveShadow=true;scene.add(scoop);
  for(const {a,b} of PIPE_GUIDES){
    const start=new THREE.Vector3(a.x,.12,a.z),end=new THREE.Vector3(b.x,.12+PIPE_ENTRY.rise,b.z);
    const rail=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,start.distanceTo(end),12),mat(0x479fba));
    rail.position.copy(start).add(end).multiplyScalar(.5);
    rail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());
    rail.castShadow=true;scene.add(rail);
  }
  for(const along of [-1.25,-.78,-.32]){
    const points=[[along+.13,0],[along-.12,-.18],[along-.12,.18]].flatMap(([u,v])=>{
      const p=pipeWorld(u,v);return [p.x,.062+heightAt(p.x,p.z),p.z];
    });
    const arrowGeometry=new THREE.BufferGeometry();arrowGeometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
    arrowGeometry.setIndex([0,1,2]);arrowGeometry.computeVertexNormals();
    scene.add(new THREE.Mesh(arrowGeometry,new THREE.MeshBasicMaterial({color:0xffefb9,side:THREE.DoubleSide})));
  }

  // KayKit mouths follow the same direction as the ramp and ball transport.
  const sleeveEnd=pipeWorld(.56);
  const middlePoints=[
    [sleeveEnd.x,PIPE_ENTRY.centerY,sleeveEnd.z],[-1.05,.70,-4.46],[-.4,1.8,-4.9],
    [.7,2.35,-4.8],[1.55,1.95,-4.55],[2.3,.65,-4.1],[PIPE_OUT.x-.56,.65,PIPE_OUT.z],
  ].map(p=>new THREE.Vector3(...p));
  const tubeCurve=new THREE.CatmullRomCurve3(middlePoints);
  const tubeMat=mat(0x148ab6,.3,.08);
  const shell=new THREE.Mesh(new THREE.TubeGeometry(tubeCurve,96,.78,24,false),tubeMat);
  shell.castShadow=true;shell.receiveShadow=true;scene.add(shell);
  const inside=new THREE.Mesh(new THREE.TubeGeometry(tubeCurve,96,.621,24,false),new THREE.MeshStandardMaterial({color:0x145578,roughness:.7,side:THREE.BackSide}));scene.add(inside);
  for(const t of [0,.25,.66,1]){
    const band=new THREE.Mesh(new THREE.TorusGeometry(.785,.045,8,32),mat(0x92d4df,.35,.15));
    band.position.copy(tubeCurve.getPointAt(t));
    band.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),tubeCurve.getTangentAt(t));
    band.castShadow=true;scene.add(band);
  }
  pipePath=new THREE.CurvePath();
  pipePath.add(new THREE.LineCurve3(new THREE.Vector3(PIPE_IN.x,PIPE_ENTRY.centerY,PIPE_IN.z),middlePoints[0]));
  pipePath.add(tubeCurve);
  pipePath.add(new THREE.LineCurve3(middlePoints.at(-1),new THREE.Vector3(PIPE_OUT.x,.65,PIPE_OUT.z)));
  const mouths=await Promise.all([
    model('pipe_straight_A_blue','blue',PIPE_IN.x,PIPE_ENTRY.centerY,PIPE_IN.z),
    model('pipe_straight_A_blue','blue',PIPE_OUT.x-.56,.65,PIPE_OUT.z),
  ]);
  const mouthDirections=[new THREE.Vector3(PIPE_DIRECTION.x,0,PIPE_DIRECTION.z),new THREE.Vector3(1,0,0)];
  mouths.forEach((mouth,i)=>{
    if(mouth){mouth.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),mouthDirections[i]);mouth.scale.set(.78,.28,.78)}
  });
  [[PIPE_IN,PIPE_ENTRY.centerY],[PIPE_OUT,.65]].forEach(([position,y],i)=>{
    const lip=new THREE.Mesh(new THREE.TorusGeometry(.702,.082,10,40),mat(0x69c9e1,.27,.1));
    lip.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),mouthDirections[i]);
    lip.position.set(position.x,y,position.z);scene.add(lip);
  });
  }
  const startOffset=LEVEL.id>=12?LEVEL.start.x+16.8:0;
  const decorHeight=(x,z)=>LEVEL.heightProfile?heightAt(x,z):0;
  // Set dressing lives behind the edge rail instead of obstructing playable turf.
  if(!['forest','clockwork','moon'].includes(theme.key))for(const [x,z,w] of [[(LEVEL.heightProfile?-17.2:-16)+startOffset,4.8,LEVEL.heightProfile?3:5.8],[-18+startOffset,-4.8,1.5],[LEVEL.shelf.x,LEVEL.shelf.z,1.7]]){
    box(scene,w,.45,1.35,x,-.20+decorHeight(x,z),z,deep);
    box(scene,w,.05,1.35,x,.05+decorHeight(x,z),z,cream);
  }
  await Promise.all([
    ...(CANNON?[model('cannon_base_red','red',CANNON.x,.05,CANNON.z,.68,Math.atan2(LANDING.x-CANNON.x,LANDING.z-CANNON.z))]:[]),
    ...(rocketPads?[]:SPRINGS.map(spring=>model('spring_pad_yellow','yellow',spring.x,.08,spring.z,.68))),
    ...LEVEL.arches.map(arch=>model('arch_wide_yellow','yellow',arch.x,.04,arch.z,.72,Math.PI/2)),
    ...(['forest','clockwork','moon'].includes(theme.key)?[]:[model('star_yellow','yellow',(LEVEL.heightProfile?-16:-14.2)+startOffset,.1+decorHeight(-14.2+startOffset,4.75),4.75,.60),
    model('star_yellow','yellow',LEVEL.shelf.x,.1+decorHeight(LEVEL.shelf.x,LEVEL.shelf.z),LEVEL.shelf.z,.65),
    model('chest_red','red',-17+startOffset,.08+decorHeight(-17+startOffset,4.8),4.8,.48,Math.PI/4),
    model('diamond_blue','blue',-18.1+startOffset,.4+decorHeight(-18.1+startOffset,-4.8),-4.8,.5)]),
  ]);
  return { flagstick, cupCritter, lipRescuer, cupHeight, spinner, springGlows, pipePath, bridge, bumpers, gates, carnival, pendulum, trapdoors, environment, funnel, bellBridge, lift, clockWheel, clockHand, motherTree, rocketPads, blackHole, cometCannon, ferris, aimSurface:floor };
}
