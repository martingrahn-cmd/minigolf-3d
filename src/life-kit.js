import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { modelInstance } from './models.js';

// Shared pieces for the living scenery round the courses (the clockwork town,
// the moon carnival): paths to walk, instanced crowds, puffs of smoke and
// steam, and ways to keep many small models cheap to draw.

// A closed rounded rectangle on the floor, walked by distance along it.
export function loopPath(x1,x2,z1,z2,r){
  const pts=[],arc=(cx,cz,a0)=>{for(let i=0;i<=8;i++){const a=a0+i/8*Math.PI/2;pts.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r])}};
  arc(x2-r,z2-r,0);arc(x1+r,z2-r,Math.PI/2);arc(x1+r,z1+r,Math.PI);arc(x2-r,z1+r,Math.PI*1.5);
  const lengths=[0];
  for(let i=1;i<=pts.length;i++){const a=pts[i-1],b=pts[i%pts.length];lengths.push(lengths[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]))}
  const length=lengths[pts.length];
  return {length,at(s){
    s=((s%length)+length)%length;let i=0;while(i<pts.length-1&&lengths[i+1]<s)i++;
    const a=pts[i],b=pts[(i+1)%pts.length],k=(s-lengths[i])/Math.max(1e-6,lengths[i+1]-lengths[i]);
    const dx=b[0]-a[0],dz=b[1]-a[1],d=Math.hypot(dx,dz)||1;
    return {x:a[0]+dx*k,z:a[1]+dz*k,dx:dx/d,dz:dz/d};
  }};
}

// Merge an animated model's fixed parts into one mesh per material, leaving the
// named moving parts alone: far fewer draw calls for the many small townsfolk.
export function compact(root,keep=[]){
  if(!root)return root;
  root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),batches=new Map();
  const visit=o=>{if(o!==root&&keep.includes(o.name))return;if(o.isMesh){if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(o)}o.children.forEach(visit)};
  visit(root);
  for(const [material,meshes] of batches){
    if(meshes.length<2)continue;
    const parts=meshes.map(o=>(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));
    const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!merged)continue;
    const mesh=new THREE.Mesh(merged,material);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);meshes.forEach(o=>o.removeFromParent());
  }
  return root;
}

// Recolour named materials with copies shared by every model of the same colour,
// so the baked town still merges into one mesh per material.
const tinted=new Map();
export function tintShared(object,colors){
  object.traverse(o=>{
    if(!o.isMesh||colors[o.material.name]===undefined)return;
    const key=`${o.material.uuid}:${colors[o.material.name]}`;
    if(!tinted.has(key)){const copy=o.material.clone();copy.color.set(colors[o.material.name]);tinted.set(key,copy)}
    o.material=tinted.get(key);
  });
}

// Many copies of one small animated model drawn as instances: one draw call per
// material for the whole crowd instead of one per part per figure. Tinted
// materials take their colour per instance. A part named `key` (and what hangs
// under it) can be turned separately about its own z axis.
export function createCrowd(scene,name,count,tints={}){
  const template=modelInstance(name);if(!template)return null;
  compact(template,['key']);template.updateMatrixWorld(true);
  let key=null;template.traverse(o=>{if(o.name==='key')key=o});
  const keyRel=key?key.matrixWorld.clone():new THREE.Matrix4(),keyInverse=keyRel.clone().invert(),parts=[];
  template.traverse(o=>{
    if(!o.isMesh)return;
    let inKey=false;for(let n=o;n;n=n.parent)if(n===key)inKey=true;
    const tint=tints[o.material.name],material=tint?o.material.clone():o.material;if(tint)material.color.set(0xffffff);
    const mesh=new THREE.InstancedMesh(o.geometry,material,count);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
    if(tint)for(let i=0;i<count;i++)mesh.setColorAt(i,new THREE.Color(tint[i%tint.length]));
    scene.add(mesh);parts.push({mesh,inKey,rel:inKey?keyInverse.clone().multiply(o.matrixWorld):o.matrixWorld.clone()});
  });
  const m=new THREE.Matrix4(),k=new THREE.Matrix4(),spin=new THREE.Matrix4();
  return {
    set(i,object,keyAngle=0){
      object.updateMatrix();spin.makeRotationZ(keyAngle);k.copy(object.matrix).multiply(keyRel).multiply(spin);
      for(const p of parts)p.mesh.setMatrixAt(i,m.multiplyMatrices(p.inKey?k:object.matrix,p.rel));
    },
    commit(){for(const p of parts)p.mesh.instanceMatrix.needsUpdate=true},
  };
}

// Soft billboard puffs (smoke, steam, spray) in one draw call; works for the
// perspective camera and the orthographic overview alike.
export function createPuffs(scene,{count,color,size,opacity,life,gravity=0,grow=1.8,texture,additive=false}){
  const position=new Float32Array(count*3),age=new Float32Array(count).fill(1),velocity=new Float32Array(count*3);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(position,3));geometry.setAttribute('age',new THREE.BufferAttribute(age,1));
  const material=new THREE.ShaderMaterial({
    uniforms:{map:{value:texture},color:{value:new THREE.Color(color)},size:{value:size},opacity:{value:opacity},grow:{value:grow},viewH:{value:800}},
    vertexShader:`attribute float age;uniform float size,grow,viewH;varying float vAge;
      void main(){vAge=age;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;
        float persp=projectionMatrix[2][3]==-1.?-mv.z:1.;gl_PointSize=age>=1.?0.:size*(.45+age*grow)*projectionMatrix[1][1]*viewH*.5/persp;}`,
    fragmentShader:`uniform sampler2D map;uniform vec3 color;uniform float opacity;varying float vAge;
      void main(){vec4 t=texture2D(map,gl_PointCoord);float a=t.a*opacity*smoothstep(0.,.12,vAge)*(1.-vAge);if(a<.01)discard;gl_FragColor=vec4(color*t.rgb,a);}`,
    transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,
  });
  const points=new THREE.Points(geometry,material);points.frustumCulled=false;points.renderOrder=2;scene.add(points);
  let next=0;
  return {
    emit(x,y,z,vx=0,vy=0,vz=0){const i=next;next=(next+1)%count;position.set([x,y,z],i*3);velocity.set([vx,vy,vz],i*3);age[i]=0},
    update(dt){
      material.uniforms.viewH.value=window.innerHeight*Math.min(window.devicePixelRatio||1,2);
      for(let i=0;i<count;i++){
        if(age[i]>=1)continue;age[i]=Math.min(1,age[i]+dt/life);
        velocity[i*3+1]-=gravity*dt;for(let k=0;k<3;k++)position[i*3+k]+=velocity[i*3+k]*dt;
      }
      geometry.attributes.position.needsUpdate=true;geometry.attributes.age.needsUpdate=true;
    },
  };
}

export function softTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');
  const g=ctx.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,64,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function canvasTexture(w,h,draw,repeat=[1,1]){
  const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);return t;
}

// Models from different Blender files carry their own copies of the same
// brass, stone and paint; fold identical materials together before baking.
export function foldMaterials(group){
  const canonical=new Map();
  group.traverse(o=>{
    if(!o.isMesh)return;const m=o.material;
    const key=[m.type,m.name.replace(/\d+$/,''),m.color?.getHex(),m.emissive?.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.flatShading,m.vertexColors,m.transparent,m.opacity,m.side,m.map?.uuid].join('|');
    if(!canonical.has(key))canonical.set(key,m);o.material=canonical.get(key);
  });
}

// Merge every mesh under a group into one mesh per material, then stop
// updating its matrices: for scenery that never moves.
export function bakeStatic(group){
  foldMaterials(group);compact(group);
  group.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false});
  return group;
}
