import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { profileHeight } from './terrain.js';
import { modelInstance, tintMaterials } from './models.js';
import { createMoonFair } from './moon-fair.js';
import { t } from './i18n.js';

// Månkarnevalen: an abandoned fun fair drifting between asteroids. Mid-level
// procedural stand-ins, listed in BLENDER_ASSETS.md for later Blender models.
export const MOON_THEME={key:'moon',name:t('Månkarnevalen'),range:t('HÅL {from}–{to}',{from:'13',to:'18'}),sky:0x1b1340,horizon:0x6e4c9e,rail:0xf4e8d2,base:0x3a2d5c,accent:0x63e3d3};
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
  // The Blender rock sits inside a wrapper so callers can still set its scale
  // and rotation as if it were the old mesh of radius r.
  const model=modelInstance(`moon/asteroid-${Math.abs(Math.round(seed))%3}`);
  if(model){
    const random=randomSource(seed),wrapper=new THREE.Group();wrapper.position.set(x,y,z);parent.add(wrapper);
    model.scale.setScalar(r);if(mat.color.getHex()!==new THREE.Color(C.rock).getHex())tintMaterials(model,{'*':mat.color.getHex()});
    wrapper.add(model);wrapper.rotation.set(random()*3,random()*3,random()*3);return wrapper;
  }
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
  const model=modelInstance('moon/rocket');
  if(model){group.add(model);return group}
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
  const model=modelInstance('moon/tent');
  if(model){model.scale.set(r,h,r);group.add(model);return group}
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
  const model=modelInstance('moon/lantern');
  if(model){model.position.set(x,y,z);model.scale.set(1,h/2.2,1);parent.add(model);return}
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
  // The living fair round the course; the older static backdrop stands in when
  // the models could not be loaded.
  const livingFair=createMoonFair(scene,level,{asteroid,tent,ferrisWheel,lantern,material,glowMaterial});
  if(!livingFair){
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
  }
  (dress??{zerog:zeroGTent}[level.scenery])?.(scene,animated,level);
  const reducedMotion=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {theme:MOON_THEME,update(time){
    livingFair?.update(time);
    if(reducedMotion)return;
    starMaterial.opacity=.8+Math.sin(time*.7)*.1;
    for(const entry of animated){
      if(entry.type==='spin')entry.object.rotation.y+=entry.speed*.016;
      if(entry.type==='wheel'){entry.wheel.rotation.z=time*.08;for(const g of entry.gondolas)g.rotation.z=-entry.wheel.rotation.z}
      if(entry.type==='glow')entry.object.material.emissiveIntensity=1.2+Math.sin(time*2+entry.phase)*.5;
      if(entry.type==='bob')entry.object.position.y=entry.baseY+Math.sin(time*.6+entry.phase)*.35;
      if(entry.type==='hover'){entry.object.rotation.y=time*.25;entry.object.position.y=entry.baseY+Math.sin(time*.5)*.2}
      if(entry.type==='confetti'){entry.object.rotation.y=time*.03;entry.object.position.y=Math.sin(time*.3)*.4}
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
    const rail=cell.surface==='rail',ring=cell.surface==='ring';
    const cuts=(lo,hi)=>[lo,...Array.from({length:Math.max(0,Math.ceil(hi/1.3)-Math.floor(lo/1.3)-1)},(_,i)=>(Math.floor(lo/1.3)+i+1)*1.3),hi];
    const xs=cuts(cell.x1,cell.x2),zs=cuts(cell.z1,cell.z2),mid=(cell.z1+cell.z2)/2;
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
      const x1=xs[i],x2=xs[i+1],z1=zs[j],z2=zs[j+1],check=(Math.floor((x1+x2)/2/1.3)+Math.floor((z1+z2)/2/1.3))%2;
      // The launch rail is ivory with a turquoise centre stripe; felt elsewhere.
      // Violet felt marks the weightless ring; the rule is visible before the first shot.
      const color=new THREE.Color(rail?(Math.abs((z1+z2)/2-mid)<.7?C.teal:C.ivory):ring?(check?0x5a3f9c:0x4d3590):check?C.felt:C.feltLight);
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
    if(t.surface==='ring')continue;
    const x=(t.x1+t.x2)/2,z=(t.z1+t.z2)/2,w=t.x2-t.x1,d=t.z2-t.z1,y=Math.min(heightAt(t.x1,z),heightAt(t.x2,z));
    const rock=asteroid(scene,x,y-2.2,z,1,90+i,material(i%2?C.rock:C.rockDark));rock.rotation.set(0,0,0);rock.scale.set(w*.55,1.6,d*.62);
  }

  // Candy-striped rails along every guarded edge, posts with fair bulbs at the joints.
  const red=[],ivory=[],postGeometries=[],bulbs=[];
  for(const e of [...boundaries.filter(edge=>!edge.open),...(level.banks||[])]){
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
    // Paint on whichever side has floor: outer drops and holes in the floor alike.
    const floorAt=(x,z)=>cells.some(c=>x>=c.x1&&x<=c.x2&&z>=c.z1&&z<=c.z2);
    for(let k=0;k<count;k++){
      const t=lo+(k+.5)*(hi-lo)/count,side=vertical?(floorAt(edge.x-.2,t)?-1:1):(floorAt(t,edge.z-.2)?-1:1);
      const x=vertical?edge.x+side*.1:t,z=vertical?t:edge.z+side*.1;
      add(scene,new THREE.BoxGeometry(vertical?.16:.22,.02,vertical?.22:.16),material(k%2?C.violet:C.gold),x,heightAt(x,z)+.055,z);
    }
  }
  if(level.scenery==='rocketramp')rocketRampScenery(scene,heightAt);
  if(level.scenery==='zerog')zeroGStage(scene,heightAt,level);
  if(level.scenery==='blackhole')blackHoleScenery(scene,level);
  if(level.scenery==='comet')cometScenery(scene,level);
  if(level.scenery==='ferris')ferrisScenery(scene,heightAt);
  if(level.scenery==='moonrocket')moonRocketScenery(scene,level);
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

// Hole 14: the open-topped big top. Walls follow the chamfered ring, with gaps
// for the entrance and the stage; balloons and confetti drift in weak gravity.
const TENT=[[-9,-3],[-9,-5],[-5,-9],[5,-9],[9,-5],[9,-3.5],null,[9,3.5],[9,5],[5,9],[-5,9],[-9,5],[-9,3]];
function fabricWall(parent,a,b,height){
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),n=Math.max(2,Math.round(length/.7)),positions=[],colors=[];
  const len=Math.hypot(a[0],a[1])||1,out=[0,0];
  // Sit just outside the rail line, leaning out a touch like canvas on guy ropes.
  const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,ml=Math.hypot(mx,mz)||1;out[0]=mx/ml*.15;out[1]=mz/ml*.15;
  for(let k=0;k<n;k++){
    const t0=k/n,t1=(k+1)/n,c=new THREE.Color(k%2?C.red:C.ivory);
    const p0=[a[0]+dx*t0+out[0],a[1]+dz*t0+out[1]],p1=[a[0]+dx*t1+out[0],a[1]+dz*t1+out[1]];
    const quad=[[p0[0],0,p0[1]],[p1[0],0,p1[1]],[p0[0]+out[0]*2,height,p0[1]+out[1]*2],[p1[0],0,p1[1]],[p1[0]+out[0]*2,height,p1[1]+out[1]*2],[p0[0]+out[0]*2,height,p0[1]+out[1]*2]];
    for(const v of quad){positions.push(...v);colors.push(c.r,c.g,c.b)}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeVertexNormals();
  add(parent,g,material(0xffffff,{vertexColors:true,side:THREE.DoubleSide,flatShading:false}));
  for(let k=0;k<n;k++){
    const t=(k+.5)/n,flag=add(parent,new THREE.ConeGeometry(.16,.34,3),material(k%2?C.gold:C.teal),a[0]+dx*t+out[0]*3,height+.05,a[1]+dz*t+out[1]*3);flag.rotation.x=Math.PI;
  }
}
function zeroGTent(scene,animated){
  const tent=new THREE.Group();tent.name='zero-g-tent';scene.add(tent);
  for(let i=0;i<TENT.length-1;i++)if(TENT[i]&&TENT[i+1])fabricWall(tent,TENT[i],TENT[i+1],2.4);
  const tops=[];
  for(const [x,z] of [[-9,-5],[-5,-9],[5,-9],[9,-5],[9,5],[5,9],[-5,9]]){
    const l=Math.hypot(x,z),px=x+x/l*.45,pz=z+z/l*.45;
    beam(tent,[px,0,pz],[px,9,pz],.09,material(C.ivory,{metalness:.3}));
    add(tent,new THREE.SphereGeometry(.18,10,8),material(C.gold,{metalness:.5}),px,9.15,pz);tops.push([px,9.15,pz]);
  }
  // The weightless field: a slowly turning ring high above the pit, above the
  // chase camera's height so it frames the overview without blocking play.
  const hover=new THREE.Group();hover.name='gravity-ring';hover.position.set(-.5,14,0);tent.add(hover);
  const ring=add(hover,new THREE.TorusGeometry(2.6,.16,10,48),glowMaterial(C.teal,1.4));ring.rotation.x=Math.PI/2;
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2;add(hover,new THREE.SphereGeometry(.22,10,8),glowMaterial(i%2?C.gold:0xff8fc8,1.2),Math.cos(a)*2.6,0,Math.sin(a)*2.6)}
  animated.push({object:hover,type:'hover',baseY:14});
  for(const top of tops)stringLights(tent,top,[-.5+(top[0]+.5)*.25,14,top[2]*.25],.6,8);
  // Balloons drift high along the walls, above the camera and the line of play.
  const colors=[0xff7a9c,0xffd166,0x6fe6d6,0xb18cff,0xff9f5a,0x9ff3ff,0xff7a9c];
  [[-7.6,-3.8],[-3,-8.2],[3.6,-8.2],[7.8,-6.4],[7.9,6.3],[3,8.3],[-3.8,8.2]].forEach(([x,z],i)=>{
    const balloon=new THREE.Group();balloon.position.set(x,11+(i%3)*.8,z);tent.add(balloon);
    const body=add(balloon,new THREE.SphereGeometry(.42,14,10),material(colors[i],{flatShading:false,roughness:.35}));body.scale.y=1.2;
    add(balloon,new THREE.ConeGeometry(.08,.12,8),material(colors[i]),0,-.53,0);
    beam(balloon,[0,-.58,0],[.05,2.4-balloon.position.y,.05],.01,material(C.ivory));
    animated.push({object:balloon,type:'bob',baseY:balloon.position.y,phase:i*1.3});
  });
  const random=randomSource(77),positions=[],tints=[];
  for(let i=0;i<220;i++){
    positions.push(-8+random()*16,.6+random()*12,-8+random()*16);
    const c=new THREE.Color([C.gold,C.teal,0xff8fc8,C.ivory][i%4]);tints.push(c.r,c.g,c.b);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(tints,3));
  const confetti=new THREE.Points(g,new THREE.PointsMaterial({size:.14,vertexColors:true,transparent:true,opacity:.85,depthWrite:false}));tent.add(confetti);
  animated.push({object:confetti,type:'confetti'});
}

// Floor art, the entrance sign, the pit's glow and the raised stage of hole 14.
function signTexture(text){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#2c2250';ctx.beginPath();ctx.roundRect(4,4,504,120,24);ctx.fill();ctx.strokeStyle='#f2c25c';ctx.lineWidth=8;ctx.stroke();
  ctx.fillStyle='#fbf3e6';ctx.font='800 64px Fredoka, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,68);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function zeroGStage(scene,heightAt,level){
  // A painted circus ring around the pit, inside the chamfered walls.
  for(const [inner,outer,color] of [[6.25,6.85,C.red],[6.85,7.1,C.ivory]]){
    const ring=add(scene,new THREE.RingGeometry(inner,outer,72),material(color,{side:THREE.DoubleSide,flatShading:false}),0,.052,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;
  }
  // The weightless base is a ring of rock: through the pit you look straight into space.
  // Rotating the extrusion by +90° about x maps shape y to world z and depth downwards.
  const shape=new THREE.Shape(TENT.filter(Boolean).map(([x,z])=>new THREE.Vector2(x,z)));
  const hole=new THREE.Path([[-3,-3],[2,-3],[2,3],[-3,3]].map(([x,z])=>new THREE.Vector2(x,z)));shape.holes.push(hole);
  const base=add(scene,new THREE.ExtrudeGeometry(shape,{depth:1.6,bevelEnabled:false}),material(C.rock),0,-.05,0);base.rotation.x=Math.PI/2;
  for(const [x,z,r] of [[-6.5,-5,3.2],[5,-5.5,3.4],[-5.5,5.5,3],[5.5,5,3.3]])asteroid(scene,x,-3,z,r,200+x*3,material(C.rockDark)).scale.y=.6;
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const gctx=glowCanvas.getContext('2d');
  const gradient=gctx.createRadialGradient(64,64,4,64,64,64);gradient.addColorStop(0,'rgba(140,240,255,.9)');gradient.addColorStop(.4,'rgba(150,110,255,.35)');gradient.addColorStop(1,'rgba(40,20,90,0)');
  gctx.fillStyle=gradient;gctx.fillRect(0,0,128,128);const glowTex=new THREE.CanvasTexture(glowCanvas);glowTex.colorSpace=THREE.SRGBColorSpace;
  const portal=add(scene,new THREE.PlaneGeometry(7,7),new THREE.MeshBasicMaterial({map:glowTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}),-.5,-2.6,0);portal.rotation.x=-Math.PI/2;portal.castShadow=false;portal.name='pit-portal';
  // Entrance arch with its sign: the rule is named before the ball goes in.
  for(const z of [-3.15,3.15])beam(scene,[-9.05,0,z],[-9.05,3.5,z],.09,material(C.ivory,{metalness:.3}));
  beam(scene,[-9.05,3.5,-3.15],[-9.05,3.5,3.15],.09,material(C.gold,{metalness:.4}));
  const sign=add(scene,new THREE.PlaneGeometry(4.2,1.05),new THREE.MeshBasicMaterial({map:signTexture(t('TYNGDLÖST')),transparent:true,side:THREE.DoubleSide}),-9.1,4.15,0);sign.rotation.y=-Math.PI/2;sign.castShadow=false;
  // The artists' stage: velvet wings, spotlights and footlights along the ramp.
  const stageY=heightAt(14,0),velvet=material(0x8e1f3a,{flatShading:false,roughness:.9}),gold=material(C.gold,{metalness:.4});
  for(const side of [-1,1]){
    const z=side*4.05;
    for(let x=11.4;x<=17.6;x+=.42)beam(scene,[x,stageY-.4,z+Math.sin(x*7)*.08],[x,stageY+3,z+Math.sin(x*7)*.08],.17,velvet,10);
    beam(scene,[11.2,stageY+3.1,z],[17.8,stageY+3.1,z],.16,gold);
    const lamp=new THREE.Group();lamp.position.set(10.6,stageY,side*4.4);scene.add(lamp);
    beam(lamp,[0,-.4,0],[0,3.6,0],.07,material(C.deep));
    const head=add(lamp,new THREE.CylinderGeometry(.22,.3,.5,12),material(C.deep),0,3.7,0);head.rotation.z=-1.1;head.rotation.x=side*.5;
    // A soft light cone from the lamp head down onto the cup.
    const head3=new THREE.Vector3(10.6,stageY+3.7,side*4.4),target=new THREE.Vector3(level.cup.x,stageY,level.cup.z),dir=head3.clone().sub(target);
    const beamCone=add(scene,new THREE.ConeGeometry(1.3,dir.length(),20,1,true),new THREE.MeshBasicMaterial({color:0xfff2c8,transparent:true,opacity:.09,depthWrite:false,side:THREE.DoubleSide}));
    beamCone.position.copy(head3).add(target).multiplyScalar(.5);beamCone.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize());beamCone.castShadow=false;beamCone.receiveShadow=false;
  }
  for(let x=9.4;x<=11.4;x+=.5)for(const z of [-3.62,3.62])add(scene,new THREE.SphereGeometry(.09,8,6),glowMaterial(C.gold,1.6),x,heightAt(x,z)+.12,z).castShadow=false;
  // Backstage clutter fills the corners cut off by the chamfered walls.
  for(const [x,z] of [[-8,-8],[8,-8],[8,8],[-8,8]]){
    for(const [dx,dz,r,h,col] of [[0,0,.55,.7,C.red],[.7,.45,.4,.55,C.teal],[-.3,.75,.35,.9,C.ivory]]){
      const drum=add(scene,new THREE.CylinderGeometry(r,r,h,16),material(col,{flatShading:false}),x+Math.sign(x)*dx*.5,h/2+.04,z+Math.sign(z)*dz*.5);
      add(scene,new THREE.TorusGeometry(r,.04,6,20),material(C.gold),drum.position.x,h+.04,drum.position.z).rotation.x=Math.PI/2;
    }
  }
  lantern(scene,-14,0,7.6);lantern(scene,-24.6,0,2.6);
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

// Hole 15: the black hole is painted on the felt. A violet swirl fills the pull
// zone (its rim is the dashed ring), the black disc is the horizon, and a hot
// accretion ring turns around it. Nothing stands up from the floor.
function swirlTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  const g=ctx.createRadialGradient(128,128,0,128,128,128);
  g.addColorStop(0,'rgba(10,4,30,1)');g.addColorStop(.35,'rgba(48,20,110,.85)');g.addColorStop(.8,'rgba(90,55,170,.35)');g.addColorStop(1,'rgba(90,55,170,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,256,256);
  // Spiral arms show which way the pull drags the ball.
  ctx.lineWidth=5;ctx.lineCap='round';
  for(let arm=0;arm<4;arm++){
    ctx.strokeStyle='rgba(200,170,255,.38)';ctx.beginPath();
    for(let t=0;t<=1;t+=.02){const r=20+t*104,a=arm*Math.PI/2+t*3.4;const x=128+Math.cos(a)*r,y=128+Math.sin(a)*r;t?ctx.lineTo(x,y):ctx.moveTo(x,y)}
    ctx.stroke();
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function createBlackHole(scene,hole){
  if(!hole)return null;
  const group=new THREE.Group();group.name='black-hole';group.position.set(hole.x,0,hole.z);scene.add(group);
  const flat=(geometry,mat,y)=>{const m=add(group,geometry,mat,0,y,0);m.rotation.x=-Math.PI/2;m.castShadow=false;return m};
  const swirl=flat(new THREE.CircleGeometry(hole.radius,64),new THREE.MeshBasicMaterial({map:swirlTexture(),transparent:true,depthWrite:false}),.05);
  for(let i=0;i<24;i++){
    const a=i/24*Math.PI*2,dash=flat(new THREE.PlaneGeometry(.42,.07),glowMaterial(0xb69cff,.9),.056);
    dash.position.set(Math.cos(a)*hole.radius,.056,Math.sin(a)*hole.radius);dash.rotation.z=-a+Math.PI/2;
  }
  flat(new THREE.CircleGeometry(hole.horizon,40),new THREE.MeshBasicMaterial({color:0x020008}),.062);
  const disc=new THREE.Group();disc.position.y=.08;group.add(disc);
  const ring=add(disc,new THREE.TorusGeometry(hole.horizon+.12,.09,10,48),glowMaterial(0xffa04a,2.2));ring.rotation.x=Math.PI/2;ring.castShadow=false;
  const hot=add(disc,new THREE.TorusGeometry(hole.horizon+.32,.04,8,48),glowMaterial(0xff6fa8,1.6));hot.rotation.x=Math.PI/2;hot.castShadow=false;
  const sparks=[];
  for(let i=0;i<14;i++){
    const spark=add(disc,new THREE.SphereGeometry(.05+(i%3)*.02,6,5),glowMaterial(i%2?0xffd27a:0xc8b6ff,2),0,.02,0);spark.castShadow=false;
    sparks.push({spark,r:hole.horizon+.25+(i%5)*.35,phase:i*.9,speed:2.6/(1+(i%5)*.5)});
  }
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture('190,140,255'),transparent:true,depthWrite:false,opacity:.5}));
  glow.position.y=.25;glow.scale.setScalar(hole.horizon*5);group.add(glow);
  let flash=0;
  return {
    swallow(){flash=1},
    update(dt,time){
      flash=Math.max(0,flash-dt*1.4);
      swirl.rotation.z=time*.35;
      for(const {spark,r,phase,speed} of sparks){const a=phase+time*speed;spark.position.set(Math.cos(a)*r,.02,-Math.sin(a)*r)}
      ring.material.emissiveIntensity=2.2+Math.sin(time*3)*.4+flash*4;
      glow.material.opacity=.5+flash*.5;glow.scale.setScalar(hole.horizon*(5+flash*4));
    },
  };
}

// Planet bumpers: a banded planet with a tilted ring on a short pedestal. The
// planet's radius is the bumper's collision radius.
export function createPlanetBumpers(scene,bumpers=[]){
  const palettes=[[0xff9f5a,0xffd27a,0xd5485b],[0x6fe6d6,0x3fbfb2,0x9ff3ff],[0xb18cff,0xff8fc8,0x6c4bb0]];
  return bumpers.map((b,i)=>{
    const group=new THREE.Group();group.name='planet-bumper';group.position.set(b.x,0,b.z);scene.add(group);
    add(group,new THREE.CylinderGeometry(b.r*.55,b.r*.75,.18,20),material(C.deep),0,.13,0);
    const planet=new THREE.Group();planet.position.y=b.r*.92;group.add(planet);
    const colors=palettes[i%palettes.length],body=new THREE.SphereGeometry(b.r,24,16),p=body.attributes.position,tint=[];
    for(let k=0;k<p.count;k++){const c=new THREE.Color(colors[Math.floor((p.getY(k)/b.r+1)*3)%3]);tint.push(c.r,c.g,c.b)}
    body.setAttribute('color',new THREE.Float32BufferAttribute(tint,3));
    add(planet,body,material(0xffffff,{vertexColors:true,flatShading:false,roughness:.5,emissive:colors[0],emissiveIntensity:.12}));
    const ring=add(planet,new THREE.TorusGeometry(b.r*1.45,.06,8,40),glowMaterial(C.gold,.8));ring.rotation.x=Math.PI/2-.4;ring.castShadow=false;
    return {pulse:0,update(dt){
      this.pulse=Math.max(0,this.pulse-dt*3);
      planet.scale.setScalar(1+this.pulse*.18);ring.material.emissiveIntensity=.8+this.pulse*3;planet.rotation.y+=dt*.4;
    }};
  });
}

// The arena: an observatory dome behind the cup and lanterns at the tee.
function blackHoleScenery(scene,level){
  const cup=level.cup;
  // asteroid() turns rocks at random; keep this one level so it stays below the dome.
  const base=asteroid(scene,cup.x+6.5,-4,0,3.2,301,material(C.rockDark));base.rotation.set(0,0,0);base.scale.set(1,.7,1.6);
  const dome=add(scene,new THREE.SphereGeometry(2.2,24,12,0,Math.PI*2,0,Math.PI/2),material(C.ivory,{flatShading:false}),cup.x+6.5,-.6,0);dome.name='observatory';
  const scope=beam(scene,[cup.x+6.5,.6,0],[cup.x+5,2.6,0],.28,material(C.deep,{metalness:.4}),12);scope.name='telescope';
  const sign=add(scene,new THREE.PlaneGeometry(4.2,1.05),new THREE.MeshBasicMaterial({map:signTexture(t('SVARTA HÅLET')),transparent:true,side:THREE.DoubleSide}),cup.x+6.4,2.6,0);
  sign.rotation.y=-Math.PI/2;sign.castShadow=false;
  lantern(scene,-12.6,0,-2.9);lantern(scene,-12.6,0,2.9);lantern(scene,-8.6,0,-8.6);lantern(scene,-8.6,0,8.6);
}

// The loading funnel in the lane and the glass feed tube up into the breech,
// shared by the comet cannon and the moon rocket.
function loadingFunnel(scene,cannon){
  if(!cannon.hopper)return null;
  const funnel=new THREE.Group();funnel.name='comet-funnel';funnel.position.set(cannon.hopper.x,0,cannon.hopper.z);scene.add(funnel);
  const collar=add(funnel,new THREE.CylinderGeometry(.95,1.05,.08,32,1,true),material(C.ivory,{metalness:.3,side:THREE.DoubleSide}),0,.08,0);collar.castShadow=false;
  const mouth=add(funnel,new THREE.CircleGeometry(.62,32),new THREE.MeshBasicMaterial({color:0x07030f}),0,.055,0);mouth.rotation.x=-Math.PI/2;mouth.castShadow=false;
  const glow=add(funnel,new THREE.TorusGeometry(.72,.06,8,32),glowMaterial(C.gold,1.2));glow.rotation.x=Math.PI/2;glow.position.y=.1;glow.castShadow=false;
  const path=new THREE.CatmullRomCurve3(cannon.feed.map(([x,y,z])=>new THREE.Vector3(x,y,z)),false,'centripetal');
  const glass=add(scene,new THREE.TubeGeometry(path,40,.21,14,false),new THREE.MeshStandardMaterial({color:0xbfefff,transparent:true,opacity:.28,roughness:.1,metalness:.1,depthWrite:false,side:THREE.DoubleSide}));
  glass.castShadow=false;glass.name='feed-tube';
  for(const t of [.25,.55,.85]){const q=path.getPoint(t),ring=add(scene,new THREE.TorusGeometry(.24,.04,6,20),material(C.gold,{metalness:.5}),q.x,q.y,q.z);ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),path.getTangent(t))}
  let suck=0;
  return {suck(){suck=1},update(dt,loaded){suck=Math.max(0,suck-dt*1.2);glow.material.emissiveIntensity=(loaded?.6:1.2+Math.sin(performance.now()/300)*.4)+suck*4}};
}

// Hole 16: the comet cannon on its turntable. A string of lights along the
// landing arc shows the windows: teal over a shelf, red over open space. A
// reticle rides the arc with the barrel while the cannon is loaded.
export function createCometCannon(scene,cannon,onCourse){
  if(!cannon)return null;
  const root=new THREE.Group();root.name='comet-cannon';root.position.set(cannon.x,0,cannon.z);scene.add(root);
  add(root,new THREE.CylinderGeometry(1.25,1.4,.3,28),material(C.deep),0,.15,0);
  add(root,new THREE.TorusGeometry(1.25,.07,8,40),glowMaterial(C.gold,1.1),0,.31,0).rotation.x=Math.PI/2;
  const turret=new THREE.Group();turret.position.y=.3;root.add(turret);
  for(const side of [-1,1])add(turret,new THREE.BoxGeometry(.9,.9,.18),material(C.ivory,{metalness:.3}),0,.45,side*.55);
  const barrel=new THREE.Group();barrel.position.set(0,.85,0);barrel.rotation.z=.42;turret.add(barrel);
  const tube=add(barrel,striped(new THREE.CylinderGeometry(.42,.5,2.6,16,1,true),[C.red,C.ivory],8),material(0xffffff,{vertexColors:true,side:THREE.DoubleSide}),0,0,0);
  tube.rotation.z=-Math.PI/2;tube.position.x=.7;
  for(const x of [-.4,.7,1.85])add(barrel,new THREE.TorusGeometry(.48,.07,8,24),material(C.gold,{metalness:.5}),x,0,0).rotation.y=Math.PI/2;
  const mouth=add(barrel,new THREE.CircleGeometry(.4,20),glowMaterial(0xffa04a,.6),1.99,0,0);mouth.rotation.y=Math.PI/2;mouth.castShadow=false;
  const fins=[];for(let i=0;i<3;i++){const fin=add(barrel,new THREE.BoxGeometry(.6,.05,.5),material(C.red),-.55,0,0);fin.rotation.x=i*Math.PI*2/3;fin.translateZ(.55);fins.push(fin)}
  // Lights along the landing arc, coloured by what lies beneath.
  const arc=[];
  for(let a=-cannon.sweep;a<=cannon.sweep+1e-6;a+=cannon.sweep/18){
    const x=cannon.x+Math.cos(a)*cannon.range,z=cannon.z+Math.sin(a)*cannon.range,safe=onCourse(x,z);
    arc.push(add(scene,new THREE.SphereGeometry(.1,8,6),glowMaterial(safe?C.teal:0xff5d6c,1.4),x,safe?.12:-.15,z));
  }
  const reticle=new THREE.Group();reticle.name='comet-reticle';scene.add(reticle);
  const ring=add(reticle,new THREE.TorusGeometry(.75,.07,8,32),glowMaterial(C.teal,1.8));ring.rotation.x=Math.PI/2;ring.castShadow=false;
  const dot=add(reticle,new THREE.CircleGeometry(.18,16),glowMaterial(C.teal,1.8),0,.02,0);dot.rotation.x=-Math.PI/2;dot.castShadow=false;
  const funnel=loadingFunnel(scene,cannon);
  let recoil=0;
  return {
    fire(){recoil=1},
    suck(){funnel?.suck()},
    update(dt,angle,loaded,safe){
      recoil=Math.max(0,recoil-dt*2.5);funnel?.update(dt,loaded);
      turret.rotation.y=-angle;barrel.position.x=-recoil*.35;
      mouth.material.emissiveIntensity=(loaded?1.6:.6)+recoil*5;
      const x=cannon.x+Math.cos(angle)*cannon.range,z=cannon.z+Math.sin(angle)*cannon.range;
      reticle.visible=loaded;reticle.position.set(x,safe?.1:-.1,z);
      const color=new THREE.Color(safe?C.teal:0xff5d6c);
      for(const m of [ring.material,dot.material]){m.color.copy(color);m.emissive.copy(color)}
    },
  };
}

// A comet streaks across the sky above hole 16; lanterns at the tee.
function cometScenery(scene,level){
  const comet=new THREE.Group();comet.name='sky-comet';comet.position.set(30,26,-60);comet.rotation.z=-.35;scene.add(comet);
  add(comet,new THREE.IcosahedronGeometry(1.6,1),glowMaterial(0xfff2c8,1.6)).castShadow=false;
  const tail=add(comet,new THREE.ConeGeometry(1.5,16,16,1,true),new THREE.MeshBasicMaterial({color:0xffc27a,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide}),8.6,0,0);
  tail.rotation.z=Math.PI/2;tail.castShadow=false;
  for(const [x,z] of [[-15.6,-1.9],[-15.6,1.9],[-4.4,-2.2],[-4.4,2.2]])lantern(scene,x,0,z);
  rocket(scene,13.6,0,8.2,.6,.05);
}

// Hole 17: the playable Ferris wheel. Its gondolas hang level from pivots on the
// rim, exactly where `ferris.js` carries the ball. A gate with a lamp at the dock
// shows when a gondola stands ready (green) or the wheel is turning (red).
export function createGondolaWheel(scene,wheel){
  if(!wheel)return null;
  const root=new THREE.Group();root.name='ferris-ferry';root.position.set(wheel.x,0,wheel.z);scene.add(root);
  const steel=material(C.ivory,{metalness:.3}),red=material(C.red),hub=new THREE.Vector3(0,wheel.hubY,0);
  for(const side of [-1,1])for(const dx of [-2.6,2.6])beam(root,[dx,-3.2,side*1.9],[0,wheel.hubY,side*1.55],.14,steel);
  asteroid(root,0,-4.4,0,2.6,505,material(C.rockDark)).rotation.set(0,0,0);
  beam(root,[0,wheel.hubY,-1.7],[0,wheel.hubY,1.7],.2,material(C.gold,{metalness:.5}));
  const spin=new THREE.Group();spin.position.copy(hub);root.add(spin);
  for(const z of [-1.4,1.4])add(spin,new THREE.TorusGeometry(wheel.radius,.11,8,64),red,0,0,z);
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2;for(const z of [-1.4,1.4])beam(spin,[0,0,z],[Math.cos(a)*wheel.radius,Math.sin(a)*wheel.radius,z],.04,steel)}
  const bulb=glowMaterial(C.gold,1.4);
  for(let i=0;i<32;i++){const a=i/32*Math.PI*2;for(const z of [-1.52,1.52])add(spin,new THREE.SphereGeometry(.08,6,5),bulb,Math.cos(a)*wheel.radius,Math.sin(a)*wheel.radius,z).castShadow=false}
  const gondolas=[];
  for(let k=0;k<wheel.gondolas;k++){
    const g=new THREE.Group();root.add(g);
    const colour=material(k%2?C.teal:C.red);
    add(g,new THREE.BoxGeometry(1.3,.1,2.2),material(C.ivory),0,-wheel.hang+.0,0);
    for(const z of [-1.1,1.1])add(g,new THREE.BoxGeometry(1.3,.42,.08),colour,0,-wheel.hang+.2,z);
    add(g,new THREE.BoxGeometry(.08,.42,2.2),colour,.65,-wheel.hang+.2,0);
    beam(g,[0,0,-1.1],[0,-wheel.hang,-1.1],.04,steel);beam(g,[0,0,1.1],[0,-wheel.hang,1.1],.04,steel);
    beam(g,[0,0,-1.45],[0,0,1.45],.05,steel);
    gondolas.push(g);
  }
  // The dock gate: a striped bar across the slot and a signal lamp.
  const gate=new THREE.Group();gate.position.set(wheel.dockX-.25-wheel.x,0,-wheel.slot-.35);root.add(gate);
  beam(gate,[0,0,0],[0,1.6,0],.07,material(C.deep));
  const lamp=add(gate,new THREE.SphereGeometry(.2,12,8),glowMaterial(0xff5d6c,1.8),0,1.8,0);lamp.castShadow=false;
  const bar=new THREE.Group();bar.position.y=.45;gate.add(bar);
  add(bar,striped(new THREE.CylinderGeometry(.06,.06,2*wheel.slot+.5,8,1,true),[C.red,C.ivory],4),material(0xffffff,{vertexColors:true,side:THREE.DoubleSide}),0,0,(2*wheel.slot+.5)/2).rotation.x=Math.PI/2;
  const green=new THREE.Color(0x6fe3a0),stop=new THREE.Color(0xff5d6c);
  return {update(turn,open){
    spin.rotation.z=-turn;
    gondolas.forEach((g,k)=>{const a=wheel.dockAngle+k*wheel.step-turn;g.position.set(Math.cos(a)*wheel.radius,wheel.hubY+Math.sin(a)*wheel.radius,0)});
    const c=open?green:stop;lamp.material.color.copy(c);lamp.material.emissive.copy(c);
    bar.rotation.x+=((open?-1.35:0)-bar.rotation.x)*.2;
  }};
}

// Hole 17 dressing: lanterns at the tee and string lights along the ramp.
function ferrisScenery(scene,heightAt){
  for(const [x,z] of [[-16.5,-2.9],[-16.5,2.9],[-4.6,-2.9]])lantern(scene,x,0,z);
  stringLights(scene,[-4,2.2,8.9],[4,heightAt(4,8.9)+2.2,8.9],.6,14);
  rocket(scene,13.6,2.5,-3.9,.55,.05);
}

// Hole 18, the finale: the broken moon rocket is the cannon. It stands on its
// launch pad beside a gantry whose thrust gauge climbs while the rocket is
// loaded; lights along the flight line show where a landing is safe.
export function createMoonRocket(scene,cannon,onCourse){
  const root=new THREE.Group();root.name='moon-rocket-cannon';root.position.set(cannon.x,0,cannon.z);scene.add(root);
  add(root,new THREE.CylinderGeometry(2.2,2.5,.5,32),material(C.deep),0,-.2,0);
  add(root,new THREE.TorusGeometry(2.2,.08,8,48),glowMaterial(C.gold,1.1),0,.06,0).rotation.x=Math.PI/2;
  asteroid(root,0,-3.2,0,3.4,808,material(C.rockDark)).rotation.set(0,0,0);
  const body=rocket(root,0,0,0,2.55,0);
  // Battle scars: a riveted patch, a dented fin collar and dangling cables.
  add(body,new THREE.BoxGeometry(.5,.7,.06),material(0x9a8f86,{metalness:.4}),.42,2.2,.66).rotation.y=.6;
  for(const [a,len] of [[.4,1.6],[1.3,1.1],[2.2,1.9]]){const x=Math.cos(a)*.85,z=Math.sin(a)*.85;beam(body,[x,3.4,z],[x*1.15,3.4-len,z*1.15],.025,material(C.deep))}
  // The gantry and its thrust gauge.
  const gantry=new THREE.Group();gantry.position.set(-1,0,-3.4);root.add(gantry);
  const steel=material(C.ivory,{metalness:.3}),red=material(C.red),tower=modelInstance('moon/gantry');
  if(tower){tower.rotation.y=Math.PI;gantry.add(tower)}
  else{
    for(const [x,z] of [[-.7,-.7],[.7,-.7],[-.7,.7],[.7,.7]])beam(gantry,[x,0,z],[x,10,z],.08,steel);
    for(let y=0;y<10;y+=1.6){beam(gantry,[-.7,y,.7],[.7,y+1.6,.7],.04,red);beam(gantry,[.7,y,-.7],[-.7,y+1.6,-.7],.04,red)}
    beam(gantry,[0,8.5,.7],[1,8.5,2.2],.07,steel);
  }
  add(gantry,new THREE.BoxGeometry(.5,6.4,.12),material(C.deep),0,4.2,.86);
  const fill=add(gantry,new THREE.BoxGeometry(.36,6,.08),glowMaterial(C.teal,1.6),0,1.2,.94);fill.geometry.translate(0,3,0);fill.castShadow=false;
  // Lights along the flight line and the landing reticle.
  const span=cannon.rangeMax-cannon.rangeMin;
  for(let r=cannon.rangeMin;r<=cannon.rangeMax+1e-6;r+=span/40){
    const x=cannon.x+r,z=cannon.z,safe=onCourse(x,z);
    add(scene,new THREE.SphereGeometry(.1,8,6),glowMaterial(safe?C.teal:0xff5d6c,1.4),x,safe?.12:-.15,z+2.4).castShadow=false;
  }
  const reticle=new THREE.Group();reticle.name='rocket-reticle';scene.add(reticle);
  const ring=add(reticle,new THREE.TorusGeometry(.8,.08,8,32),glowMaterial(C.teal,1.8));ring.rotation.x=Math.PI/2;ring.castShadow=false;
  // Exhaust that flares when the rocket fires.
  const flame=add(root,new THREE.ConeGeometry(1.1,3.2,18,1,true),new THREE.MeshBasicMaterial({color:0xffa04a,transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),0,-.4,0);
  flame.rotation.x=Math.PI;flame.castShadow=false;
  const funnel=loadingFunnel(scene,cannon);
  let blast=0;
  return {
    fire(){blast=1},suck(){funnel?.suck()},
    update(dt,angle,loaded,safe,range){
      blast=Math.max(0,blast-dt*1.3);funnel?.update(dt,loaded);
      flame.material.opacity=blast*.85;flame.scale.set(1+blast*.4,1+blast*1.4,1+blast*.4);
      body.position.x=blast?Math.sin(performance.now()/22)*.06*blast:0;
      const k=(range-cannon.rangeMin)/span;fill.scale.y=loaded?Math.max(.02,k):.02;
      const color=new THREE.Color(safe?C.teal:0xff5d6c);
      for(const m of [fill.material,ring.material]){m.color.copy(color);m.emissive.copy(color)}
      reticle.visible=loaded;reticle.position.set(cannon.x+range,safe?.1:-.1,cannon.z);
    },
  };
}

// The moon base: a glowing crater, a summit flag and fireworks mortars.
function moonRocketScenery(scene,level){
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;const g=glowCanvas.getContext('2d');
  const gradient=g.createRadialGradient(64,64,4,64,64,64);gradient.addColorStop(0,'rgba(255,190,120,.9)');gradient.addColorStop(.45,'rgba(200,110,255,.35)');gradient.addColorStop(1,'rgba(40,20,90,0)');
  g.fillStyle=gradient;g.fillRect(0,0,128,128);const tex=new THREE.CanvasTexture(glowCanvas);tex.colorSpace=THREE.SRGBColorSpace;
  const crater=add(scene,new THREE.PlaneGeometry(7,8),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}),14,-2.4,0);
  crater.rotation.x=-Math.PI/2;crater.castShadow=false;crater.name='crater-glow';
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;asteroid(scene,14+Math.cos(a)*2.6,-1.6,Math.sin(a)*3.4,.7,700+i,material(C.rockDark)).castShadow=false}
  const cup=level.cup;
  beam(scene,[21.6,0,-6.4],[21.6,5.5,-6.4],.07,material(C.ivory,{metalness:.4}));
  const banner=add(scene,new THREE.PlaneGeometry(3.2,.9),new THREE.MeshBasicMaterial({map:signTexture(t('MÅNRAKETEN')),transparent:true,side:THREE.DoubleSide}),21.7,4.9,-4.8);
  banner.rotation.y=-Math.PI/2;banner.castShadow=false;
  for(const z of [-7.2,7.2])for(const x of [17,20]){add(scene,new THREE.CylinderGeometry(.22,.28,.7,10),material(C.red),x,.35,z);add(scene,new THREE.TorusGeometry(.22,.04,6,14),material(C.gold),x,.72,z).rotation.x=Math.PI/2}
  for(const [x,z] of [[-21.5,-2.6],[-21.5,2.6],[-12,-2.6],[-12,2.6],[2,-6.6],[2,6.6]])lantern(scene,x,0,z);
  stringLights(scene,[2,2.6,-6.6],[21.6,4.4,-6.4],1.4,26);
}
