import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Månkarnevalen: an abandoned fun fair drifting between asteroids. Mid-level
// procedural stand-ins, listed in BLENDER_ASSETS.md for later Blender models.
export const MOON_THEME={key:'moon',name:'Månkarnevalen',range:'HÅL 13–18',sky:0x1b1340,horizon:0x6e4c9e,rail:0xf4e8d2,base:0x3a2d5c,accent:0x63e3d3};
const C={ivory:0xf4e8d2,red:0xd5485b,violet:0x6c4bb0,deep:0x2c2250,teal:0x3fbfb2,gold:0xf2c25c,rock:0x6f6690,rockDark:0x4b4369,felt:0x2f9e98,feltLight:0x3aaea6};
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.78,flatShading:true,...extra});
const glowMaterial=(color,intensity=1.2)=>material(color,{emissive:color,emissiveIntensity:intensity,roughness:.4});
function randomSource(seed){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646}}
function add(parent,geometry,mat,x=0,y=0,z=0){
  const object=new THREE.Mesh(geometry,mat);object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
function beam(parent,a,b,r,mat,sides=8){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
  const object=add(parent,new THREE.CylinderGeometry(r,r,start.distanceTo(end),sides),mat);
  object.position.copy(start).add(end).multiplyScalar(.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return object;
}
function glowTexture(rgb='255,236,190'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,`rgba(${rgb},.95)`);g.addColorStop(.25,`rgba(${rgb},.35)`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
// Alternating coloured wedges for tents and rocket fins, without textures.
function striped(geometry,colors,segments){
  const g=geometry.index?geometry.toNonIndexed():geometry,p=g.attributes.position,col=[];
  for(let i=0;i<p.count;i+=3){
    const cx=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,cz=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
    const k=Math.floor(((Math.atan2(cz,cx)+Math.PI)/(Math.PI*2))*segments)%colors.length,c=new THREE.Color(colors[k]);
    for(let j=0;j<3;j++)col.push(c.r,c.g,c.b);
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeVertexNormals();return g;
}

export function asteroid(parent,x,y,z,r,seed=1,mat=material(C.rock)){
  const random=randomSource(seed),geometry=new THREE.IcosahedronGeometry(r,1),p=geometry.attributes.position;
  const bumps=Array.from({length:4},()=>[random()*6,random()*6,random()*6]);
  for(let i=0;i<p.count;i++){
    const v=new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i));
    // Shared positions get identical offsets, so the faceted rock stays closed.
    const n=bumps.reduce((s,[a,b,c])=>s+Math.sin(v.x*1.7/r*2+a)*Math.cos(v.y*1.9/r*2+b)*Math.sin(v.z*1.3/r*2+c),0);
    v.multiplyScalar(1+n*.09);p.setXYZ(i,v.x,v.y,v.z);
  }
  geometry.computeVertexNormals();
  const rock=add(parent,geometry,mat,x,y,z);rock.rotation.set(random()*3,random()*3,random()*3);return rock;
}

export function rocket(parent,x,y,z,size=1,tilt=0){
  const group=new THREE.Group();group.name='moon-rocket';group.position.set(x,y,z);group.scale.setScalar(size);group.rotation.z=tilt;parent.add(group);
  const profile=[[0,0],[.55,.05],[.78,.6],[.86,1.8],[.8,3],[.62,3.8],[.34,4.4],[0,4.75]].map(([r,h])=>new THREE.Vector2(r,h));
  add(group,new THREE.LatheGeometry(profile,24),material(C.ivory,{flatShading:false,roughness:.5}));
  const nose=add(group,new THREE.ConeGeometry(.42,.9,24),material(C.red,{flatShading:false}),0,4.6,0);nose.scale.y=.9;
  add(group,new THREE.TorusGeometry(.8,.06,8,32),material(C.red),0,1.8,0).rotation.x=Math.PI/2;
  for(let i=0;i<3;i++){
    const fin=new THREE.Shape();fin.moveTo(0,0);fin.lineTo(.75,-.35);fin.lineTo(.7,.4);fin.lineTo(0,1.3);fin.closePath();
    const mesh=add(group,new THREE.ExtrudeGeometry(fin,{depth:.08,bevelEnabled:false}),material(C.red));
    mesh.position.set(0,.2,0);mesh.rotation.y=i*Math.PI*2/3;mesh.translateX(.62);mesh.translateZ(-.04);
  }
  const port=add(group,new THREE.TorusGeometry(.26,.06,8,24),material(C.gold,{metalness:.4}),0,2.9,.8);port.rotation.y=0;
  add(group,new THREE.CircleGeometry(.22,20),glowMaterial(0x9ff3ff,.9),0,2.9,.83);
  return group;
}

function tent(parent,x,y,z,r,h){
  const group=new THREE.Group();group.name='circus-tent';group.position.set(x,y,z);parent.add(group);
  const colors=[C.red,C.ivory],vertex=material(0xffffff,{vertexColors:true});
  add(group,striped(new THREE.CylinderGeometry(r,r*1.04,h*.45,16,1,true),colors,16),vertex,0,h*.225,0).material.side=THREE.DoubleSide;
  add(group,striped(new THREE.ConeGeometry(r*1.12,h*.55,16),colors,16),vertex,0,h*.45+h*.275,0);
  beam(group,[0,h,0],[0,h+1.1,0],.05,material(C.gold));
  const flag=new THREE.Shape();flag.moveTo(0,0);flag.lineTo(.8,-.18);flag.lineTo(0,-.42);flag.closePath();
  add(group,new THREE.ShapeGeometry(flag),material(C.teal,{side:THREE.DoubleSide}),0,h+1.1,0);
  const door=add(group,new THREE.PlaneGeometry(r*.5,h*.4),material(C.deep,{side:THREE.DoubleSide}),0,h*.2,r*1.02);door.position.z=r*1.0;
  return group;
}

// The fair's big wheel turns slowly behind the course; gondolas stay level.
function ferrisWheel(parent,x,y,z,r){
  const root=new THREE.Group();root.name='ferris-wheel';root.position.set(x,y,z);parent.add(root);
  const steel=material(C.ivory,{metalness:.3}),red=material(C.red);
  for(const side of [-1,1]){beam(root,[side*r*.55,0,-.9],[0,r+.4,-.9],.16,steel);beam(root,[side*r*.55,0,.9],[0,r+.4,.9],.16,steel)}
  const wheel=new THREE.Group();wheel.position.y=r+.4;root.add(wheel);
  for(const zz of [-.7,.7]){const rim=add(wheel,new THREE.TorusGeometry(r,.11,8,64),red,0,0,zz)}
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2;beam(wheel,[0,0,0],[Math.cos(a)*r,Math.sin(a)*r,0],.05,steel)}
  const bulbs=[],gondolas=[],bulb=glowMaterial(C.gold,1.4);
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2;bulbs.push(add(wheel,new THREE.SphereGeometry(.1,6,5),bulb,Math.cos(a)*r,Math.sin(a)*r,.8))}
  for(let i=0;i<8;i++){
    const a=i/8*Math.PI*2,g=new THREE.Group();g.position.set(Math.cos(a)*r,Math.sin(a)*r,0);wheel.add(g);
    add(g,new THREE.CylinderGeometry(.55,.45,.7,10),i%2?red:material(C.teal),0,-.65,0);
    add(g,new THREE.ConeGeometry(.6,.35,10),steel,0,-.12,0);gondolas.push(g);
  }
  return {wheel,gondolas};
}

export function lantern(parent,x,y,z,h=2.2){
  beam(parent,[x,y,z],[x,y+h,z],.06,material(C.deep));
  add(parent,new THREE.SphereGeometry(.24,12,8),glowMaterial(C.teal,1.6),x,y+h+.2,z);
  add(parent,new THREE.ConeGeometry(.3,.22,8),material(C.ivory),x,y+h+.5,z);
}

function stringLights(parent,a,b,sag,count){
  const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2-sag,(a[2]+b[2])/2];
  const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a),new THREE.Vector3(...mid),new THREE.Vector3(...b));
  add(parent,new THREE.TubeGeometry(curve,24,.02,4,false),material(C.deep));
  const gold=glowMaterial(C.gold,1.5),teal=glowMaterial(C.teal,1.5);
  for(let i=1;i<count;i++){const p=curve.getPoint(i/count);add(parent,new THREE.SphereGeometry(.09,6,5),i%2?gold:teal,p.x,p.y-.1,p.z)}
}

export function createMoonEnvironment(scene,level,dress){
  const animated=[],random=randomSource(611);
  scene.background=new THREE.Color(MOON_THEME.sky);scene.fog=new THREE.Fog(0x3b2a6b,70,170);
  const sky=add(scene,new THREE.SphereGeometry(175,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color(0x120c30)},bottom:{value:new THREE.Color(MOON_THEME.horizon)}},
    vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 top;uniform vec3 bottom;varying vec3 vPosition;void main(){float h=normalize(vPosition).y;gl_FragColor=vec4(mix(bottom,top,smoothstep(-.35,.6,h)),1.);
    #include <colorspace_fragment>
    }`}));sky.castShadow=sky.receiveShadow=false;sky.frustumCulled=false;
  const stars=[];
  for(let i=0;i<900;i++){
    const u=random()*2-1,a=random()*Math.PI*2,s=Math.sqrt(1-u*u),r=150;
    stars.push(Math.cos(a)*s*r,u*r*.9+10,Math.sin(a)*s*r);
  }
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
  const starMaterial=new THREE.PointsMaterial({color:0xfff6e6,size:.55,map:glowTexture(),transparent:true,depthWrite:false,opacity:.9});
  scene.add(new THREE.Points(starGeometry,starMaterial));
  // A ringed planet and a pale moon give the sky its landmarks.
  const planet=new THREE.Group();planet.position.set(70,34,-120);planet.rotation.z=.35;scene.add(planet);
  const bands=document.createElement('canvas');bands.width=8;bands.height=128;const bctx=bands.getContext('2d');
  ['#e8b48e','#c9789a','#f3d2a8','#a65f8f','#e7c1a3','#8d5a95'].forEach((c,i)=>{bctx.fillStyle=c;bctx.fillRect(0,i*22,8,22)});
  const bandTexture=new THREE.CanvasTexture(bands);bandTexture.colorSpace=THREE.SRGBColorSpace;
  add(planet,new THREE.SphereGeometry(16,32,20),new THREE.MeshStandardMaterial({map:bandTexture,roughness:1,emissive:0x40203a,emissiveIntensity:.5})).castShadow=false;
  const ring=add(planet,new THREE.RingGeometry(21,31,64),new THREE.MeshBasicMaterial({color:0xf3d7b0,transparent:true,opacity:.45,side:THREE.DoubleSide}));ring.rotation.x=Math.PI/2.4;ring.castShadow=false;
  add(scene,new THREE.SphereGeometry(5,24,16),new THREE.MeshBasicMaterial({color:0xe9e3ff}),-90,48,-95).castShadow=false;
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture('220,210,255'),transparent:true,depthWrite:false,opacity:.6}));halo.position.set(-90,48,-95);halo.scale.setScalar(28);scene.add(halo);

  scene.add(new THREE.HemisphereLight(0xd8cbff,0x2a2050,1.25));
  const key=new THREE.DirectionalLight(0xfff0dc,2.4);key.position.set(-18,30,16);key.castShadow=true;key.shadow.mapSize.set(2048,2048);
  Object.assign(key.shadow.camera,{left:-36,right:36,top:30,bottom:-30,near:.5,far:100});key.shadow.normalBias=.03;key.shadow.bias=-.0002;scene.add(key);
  const rim=new THREE.DirectionalLight(0x6ff0e0,.9);rim.position.set(20,8,-24);scene.add(rim);

  // Keep the backdrop outside the course footprint, whatever the hole's shape.
  const xs=level.tiles.flatMap(t=>[t.x1,t.x2]),zs=level.tiles.flatMap(t=>[t.z1,t.z2]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),cx=(minX+maxX)/2;
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2+random()*.3,d=48+random()*30;
    const rock=asteroid(scene,cx+Math.cos(a)*d,-14+random()*26,(minZ+maxZ)/2+Math.sin(a)*d,1.5+random()*4,i+3,material(i%3?C.rock:C.rockDark));
    rock.castShadow=false;animated.push({object:rock,type:'spin',speed:.02+random()*.05});
  }
  const fair=new THREE.Group();fair.name='moon-fair-backdrop';scene.add(fair);
  asteroid(fair,cx+6,-12.5,minZ-24,5,41).scale.set(1.3,.45,.8);
  const wheel=ferrisWheel(fair,cx+6,-10,minZ-24,7.5);animated.push({type:'wheel',...wheel});
  asteroid(fair,minX-14,-9,minZ-10,4.5,52).scale.set(1.3,.6,1.1);
  rocket(fair,minX-14,-6.2,minZ-10,2.1,-.28);
  asteroid(fair,maxX+10,-8,maxZ+4,6,63).scale.set(1.4,.55,1.2);
  tent(fair,maxX+10,-4.6,maxZ+4,3.4,5.5);
  asteroid(fair,minX-6,-8,maxZ+9,5,74).scale.set(1.3,.55,1.1);
  tent(fair,minX-6,-4.8,maxZ+9,2.6,4.4);
  stringLights(fair,[minX-6,-.2,maxZ+9],[maxX+10,.6,maxZ+4],2.5,22);
  stringLights(fair,[minX-14,2,minZ-10],[cx+6,3,minZ-24],3,24);
  dress?.(scene,animated,level);
  const reducedMotion=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {theme:MOON_THEME,update(time){
    if(reducedMotion)return;
    starMaterial.opacity=.8+Math.sin(time*.7)*.1;
    for(const entry of animated){
      if(entry.type==='spin')entry.object.rotation.y+=entry.speed*.016;
      if(entry.type==='wheel'){entry.wheel.rotation.z=time*.08;for(const g of entry.gondolas)g.rotation.z=-entry.wheel.rotation.z}
      if(entry.type==='glow')entry.object.material.emissiveIntensity=1.2+Math.sin(time*2+entry.phase)*.5;
    }
  }};
}

function feltTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),random=randomSource(9);
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,128,128);
  for(let i=0;i<1400;i++){ctx.fillStyle=`rgba(${random()<.5?'20,60,70':'255,255,255'},${.03+random()*.06})`;ctx.fillRect(random()*128,random()*128,1,1+random()*2)}
  // A few tiny star sparkles woven into the carnival felt.
  for(let i=0;i<6;i++){const x=random()*128,y=random()*128;ctx.fillStyle='rgba(255,246,214,.35)';ctx.fillRect(x-2,y,5,1);ctx.fillRect(x,y-2,1,5)}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;return texture;
}

export function createMoonCourse(scene,cells,boundaries,heightAt,level){
  const positions=[],colors=[],uvs=[];
  for(const cell of cells){
    const rail=cell.surface==='rail';
    const cuts=(lo,hi)=>[lo,...Array.from({length:Math.max(0,Math.ceil(hi/1.3)-Math.floor(lo/1.3)-1)},(_,i)=>(Math.floor(lo/1.3)+i+1)*1.3),hi];
    const xs=cuts(cell.x1,cell.x2),zs=cuts(cell.z1,cell.z2),mid=(cell.z1+cell.z2)/2;
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
      const x1=xs[i],x2=xs[i+1],z1=zs[j],z2=zs[j+1],check=(Math.floor((x1+x2)/2/1.3)+Math.floor((z1+z2)/2/1.3))%2;
      // The launch rail is ivory with a turquoise centre stripe; felt elsewhere.
      const color=new THREE.Color(rail?(Math.abs((z1+z2)/2-mid)<.7?C.teal:C.ivory):check?C.felt:C.feltLight);
      for(const [x,z] of [[x1,z1],[x1,z2],[x2,z1],[x1,z2],[x2,z2],[x2,z1]]){
        positions.push(x,heightAt(x,z)+.04,z);colors.push(color.r,color.g,color.b);uvs.push(x/1.6,z/1.6);
      }
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
  const floor=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,map:feltTexture(),roughness:.92}));floor.receiveShadow=true;floor.name='moon-felt';scene.add(floor);

  // Deep violet skirts show the thickness of each floating lane.
  const skirt=[];
  for(const e of boundaries){
    const ay=heightAt(e.ax,e.az),by=heightAt(e.bx,e.bz);
    for(const [x,y,z] of [[e.ax,ay+.035,e.az],[e.ax,ay-.85,e.az],[e.bx,by+.035,e.bz],[e.ax,ay-.85,e.az],[e.bx,by-.85,e.bz],[e.bx,by+.035,e.bz]])skirt.push(x,y,z);
  }
  const skirtGeometry=new THREE.BufferGeometry();skirtGeometry.setAttribute('position',new THREE.Float32BufferAttribute(skirt,3));skirtGeometry.computeVertexNormals();
  add(scene,skirtGeometry,material(C.deep,{side:THREE.DoubleSide}));
  // An asteroid crust under every lane: the course is built on floating rock.
  for(const [i,t] of level.tiles.entries()){
    const x=(t.x1+t.x2)/2,z=(t.z1+t.z2)/2,w=t.x2-t.x1,d=t.z2-t.z1,y=Math.min(heightAt(t.x1,z),heightAt(t.x2,z));
    const rock=asteroid(scene,x,y-2.2,z,1,90+i,material(i%2?C.rock:C.rockDark));rock.rotation.set(0,0,0);rock.scale.set(w*.55,1.6,d*.62);
  }

  // Candy-striped rails along every guarded edge, posts with fair bulbs at the joints.
  const red=[],ivory=[],postGeometries=[],bulbs=[];
  for(const e of boundaries){
    if(e.open)continue;
    const ay=heightAt(e.ax,e.az)+.2,by=heightAt(e.bx,e.bz)+.2,length=Math.hypot(e.bx-e.ax,e.bz-e.az),n=Math.max(1,Math.round(length/.5));
    for(let k=0;k<n;k++){
      const t0=k/n,t1=(k+1)/n,a=new THREE.Vector3(e.ax+(e.bx-e.ax)*t0,ay+(by-ay)*t0,e.az+(e.bz-e.az)*t0),b=new THREE.Vector3(e.ax+(e.bx-e.ax)*t1,ay+(by-ay)*t1,e.az+(e.bz-e.az)*t1);
      const g=new THREE.CylinderGeometry(.1,.1,a.distanceTo(b),8);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize()));
      g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);(k%2?red:ivory).push(g);
    }
    for(const [x,z] of [[e.ax,e.az],[e.bx,e.bz]]){
      const key=`${x},${z}`;if(bulbs.includes(key))continue;bulbs.push(key);
      postGeometries.push(new THREE.CylinderGeometry(.08,.1,.55,8).translate(x,heightAt(x,z)+.2,z));
    }
  }
  if(red.length)add(scene,mergeGeometries(red),material(C.red,{flatShading:false,roughness:.45}));
  if(ivory.length)add(scene,mergeGeometries(ivory),material(C.ivory,{flatShading:false,roughness:.45}));
  if(postGeometries.length){
    add(scene,mergeGeometries(postGeometries),material(C.deep));
    const bulbGeometries=bulbs.map(key=>{const [x,z]=key.split(',').map(Number);return new THREE.SphereGeometry(.11,8,6).translate(x,heightAt(x,z)+.53,z)});
    add(scene,mergeGeometries(bulbGeometries),glowMaterial(C.gold,1.3)).castShadow=false;
  }
  // Open edges are painted with violet and gold chevrons: this is where space begins.
  for(const edge of level.openEdges||[]){
    const vertical=edge.x!==undefined,lo=vertical?edge.z1:edge.x1,hi=vertical?edge.z2:edge.x2,count=Math.ceil((hi-lo)/.35);
    for(let k=0;k<count;k++){
      const t=lo+(k+.5)*(hi-lo)/count,x=vertical?edge.x-Math.sign(edge.x)*.09:t,z=vertical?t:edge.z;
      add(scene,new THREE.BoxGeometry(vertical?.16:.22,.02,vertical?.22:.16),material(k%2?C.violet:C.gold),x,heightAt(x,z)+.055,z);
    }
  }
  if(level.scenery==='rocketramp')rocketRampScenery(scene,heightAt);
  return floor;
}

// Hole 13: a launch gantry beside the ramp and a countdown sign at the tee.
function rocketRampScenery(scene,heightAt){
  const steel=material(C.ivory,{metalness:.3}),red=material(C.red);
  const top=heightAt(4,-13.2);
  for(const [x,z] of [[2.6,-12.9],[4.4,-12.9],[2.6,-14.3],[4.4,-14.3]])beam(scene,[x,top-1.2,z],[x,top+7,z],.07,steel);
  for(let y=0;y<8;y+=1.4){
    beam(scene,[2.6,top+y,-12.9],[4.4,top+y+1.4,-12.9],.04,red);beam(scene,[4.4,top+y,-14.3],[2.6,top+y+1.4,-14.3],.04,red);
  }
  const beacon=add(scene,new THREE.SphereGeometry(.22,10,8),glowMaterial(C.red,2),3.5,top+7.3,-13.6);beacon.name='gantry-beacon';
  asteroid(scene,3.5,top-2.4,-13.6,1.7,121).scale.set(1.6,.9,1.3);
  asteroid(scene,16.6,1.4,-12.6,1.8,131).scale.set(1.5,.8,1.4);
  rocket(scene,16.6,2.2,-12.6,.9,.05);
  for(const [i,z] of [-1.2,0,1.2].entries())add(scene,new THREE.SphereGeometry(.2,10,8),glowMaterial(i===2?0x6fe3a0:C.gold,1.2),-21.6,.9,z);
  add(scene,new THREE.BoxGeometry(.25,.6,3.2),material(C.deep),-21.6,.9,0);
  lantern(scene,-21.2,0,-3);lantern(scene,-21.2,0,3);lantern(scene,-5.3,0,-12.8);lantern(scene,14.6,heightAt(14,-14),-14.6);
}

// Rocket pads: a glowing launch disc, chevrons along the true launch direction
// and painted exhaust flames that flare when the pad fires.
export function createRocketPads(scene,springs,heightAt){
  const pads=springs.map(pad=>{
    const dx=pad.target?pad.target.x-pad.x:pad.dx,dz=pad.target?pad.target.z-pad.z:pad.dz,len=Math.hypot(dx,dz),ux=dx/len,uz=dz/len;
    const group=new THREE.Group();group.name='rocket-pad';group.position.set(pad.x,heightAt(pad.x,pad.z),pad.z);group.rotation.y=-Math.atan2(uz,ux);scene.add(group);
    // Flush with the felt: the ball rolls straight over the disc.
    add(group,new THREE.CylinderGeometry(1,1,.02,32),material(C.ivory),0,.045,0).castShadow=false;
    const glow=add(group,new THREE.CylinderGeometry(.8,.8,.012,32),glowMaterial(C.teal,.9),0,.058,0);glow.castShadow=false;
    for(let i=0;i<3;i++){
      const shape=new THREE.Shape();shape.moveTo(.22,0);shape.lineTo(-.12,.22);shape.lineTo(-.02,0);shape.lineTo(-.12,-.22);shape.closePath();
      const chevron=add(group,new THREE.ShapeGeometry(shape),material(C.ivory,{side:THREE.DoubleSide}),-.35+i*.32,.066,0);chevron.rotation.x=-Math.PI/2;
      const lane=add(group,new THREE.ShapeGeometry(shape),material(C.gold,{side:THREE.DoubleSide}),1.3+i*.45,.05,0);lane.rotation.x=-Math.PI/2;
    }
    // Painted exhaust flames behind the pad flare up when it fires.
    const flames=[];
    for(const side of [-1,1]){
      const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(-.45,.2,-.95,0);shape.quadraticCurveTo(-.45,-.2,0,0);
      const flame=add(group,new THREE.ShapeGeometry(shape),glowMaterial(0xff9d3c,.3),-1.05,.05,side*.4);
      flame.rotation.x=-Math.PI/2;flame.material.side=THREE.DoubleSide;flame.castShadow=false;flames.push(flame);
    }
    return {group,glow,flames,fire:0};
  });
  return {
    glows:pads.map(p=>p.glow),
    fire(i){if(pads[i])pads[i].fire=1},
    update(dt){for(const p of pads){
      p.fire=Math.max(0,p.fire-dt*1.6);
      for(const flame of p.flames){flame.scale.set(1+p.fire*.9,1+p.fire*.6,1);flame.material.emissiveIntensity=.3+p.fire*3}
      p.glow.material.emissiveIntensity=.9+p.fire*2.5;
    }},
  };
}
