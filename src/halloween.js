import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { modelInstance } from './models.js';
import { bakeStatic, softTexture, canvasTexture } from './life-kit.js';
import { gatePose } from './gates.js';

// Spökhamnen, the Halloween harbour: a night under a huge orange moon. The
// course stands on wooden piles in black water. Round it are a graveyard
// island with crooked trees, a ghost ship with glowing sails, a lighthouse,
// jack-o'-lanterns that flicker, ghosts drifting in the fog, bats, and now and
// then a witch crossing the moon. Nothing out there touches the ball.
export const HALLOWEEN_THEME={key:'halloween',name:'Spökhamnen',range:'HALLOWEEN',sky:0x140a29,horizon:0x4b2a5c,rail:0xf1e3c4,base:0x22192e,accent:0xff8a2a};
const C={bone:0xf1e3c4,orange:0xff8a2a,amber:0xffc24a,purple:0x6b3fa0,violet:0x3b2550,iron:0x2b2734,plank:0x4a3428,plankDark:0x2e2019,
  stone:0x5f5b70,stoneDark:0x3d3a4c,slime:0x86e34c,ghostGreen:0x9dffc2,moon:0xffcf86,water:0x0a1420,bark:0x231a26};
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
const glow=(color,intensity=1.5)=>material(color,{emissive:color,emissiveIntensity:intensity,roughness:.5});
function randomSource(seed){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646}}
function add(parent,geometry,mat,x=0,y=0,z=0){
  const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function beam(parent,a,b,r,mat,sides=7,r2=r){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
  const o=add(parent,new THREE.CylinderGeometry(r2,r,start.distanceTo(end),sides),mat);
  o.position.copy(start).add(end).multiplyScalar(.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return o;
}
function glowSprite(parent,texture,color,x,y,z,size,opacity=.8){
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color,transparent:true,depthWrite:false,opacity,blending:THREE.AdditiveBlending}));
  s.position.set(x,y,z);s.scale.setScalar(size);parent.add(s);return s;
}
// A model from the library, or nothing (the scene still works without it).
function placed(parent,name,x,y,z,scale=1,rotation=0){
  const m=modelInstance(name);if(!m)return null;
  m.position.set(x,y,z);m.scale.setScalar(scale);m.rotation.y=rotation;parent.add(m);return m;
}

// --- The sky. ---
function moonTexture(){
  return canvasTexture(256,256,(ctx,w)=>{
    const g=ctx.createRadialGradient(w*.45,w*.42,w*.05,w/2,w/2,w/2);g.addColorStop(0,'#ffe3a8');g.addColorStop(.75,'#ffc067');g.addColorStop(1,'#f08a3a');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(w/2,w/2,w/2-2,0,Math.PI*2);ctx.fill();
    const random=randomSource(7);ctx.fillStyle='rgba(176,92,40,.22)';
    for(let i=0;i<14;i++){const r=6+random()*22,a=random()*Math.PI*2,d=random()*(w/2-r-10);ctx.beginPath();ctx.arc(w/2+Math.cos(a)*d,w/2+Math.sin(a)*d,r,0,Math.PI*2);ctx.fill()}
  });
}
function witchTexture(){
  return canvasTexture(256,128,(ctx)=>{
    ctx.fillStyle='#120a1c';ctx.strokeStyle='#120a1c';ctx.lineCap='round';
    // The broom, its bristles, the witch on it: cloak, hat and a cat at the back.
    ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(30,84);ctx.lineTo(220,64);ctx.stroke();
    ctx.beginPath();ctx.moveTo(30,84);ctx.lineTo(4,72);ctx.lineTo(0,96);ctx.lineTo(6,106);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(96,80);ctx.quadraticCurveTo(120,30,140,40);ctx.lineTo(160,74);ctx.quadraticCurveTo(130,96,96,80);ctx.fill();
    ctx.beginPath();ctx.arc(146,38,11,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(128,34);ctx.lineTo(166,28);ctx.lineTo(162,2);ctx.closePath();ctx.fill();
    ctx.beginPath();ctx.moveTo(150,40);ctx.lineTo(178,30);ctx.lineWidth=3;ctx.stroke();
    ctx.beginPath();ctx.arc(70,70,9,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(64,63);ctx.lineTo(66,52);ctx.lineTo(71,61);ctx.lineTo(76,52);ctx.lineTo(77,64);ctx.fill();
    ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(62,76);ctx.quadraticCurveTo(48,64,54,52);ctx.stroke();
  },[1,1]);
}
function webTexture(){
  return canvasTexture(256,256,(ctx,w)=>{
    ctx.strokeStyle='rgba(235,232,255,.85)';ctx.lineWidth=2;const cx=w/2,cy=w/2;
    for(let i=0;i<10;i++){const a=i/10*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*w*.5,cy+Math.sin(a)*w*.5);ctx.stroke()}
    for(let r=14;r<w*.5;r+=16){ctx.beginPath();for(let i=0;i<=10;i++){const a=i/10*Math.PI*2,rr=r*(i%2?.92:1);const x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke()}
  },[1,1]);
}
function sailTexture(){
  return canvasTexture(128,128,(ctx,w,h)=>{
    ctx.fillStyle='rgba(170,255,200,.55)';ctx.fillRect(0,0,w,h);
    ctx.globalCompositeOperation='destination-out';const random=randomSource(31);
    // Ragged holes and a torn bottom edge.
    for(let i=0;i<9;i++){ctx.beginPath();ctx.ellipse(random()*w,random()*h*.85,4+random()*12,3+random()*9,random()*3,0,Math.PI*2);ctx.fill()}
    ctx.beginPath();ctx.moveTo(0,h);for(let x=0;x<=w;x+=8)ctx.lineTo(x,h-6-random()*22);ctx.lineTo(w,h);ctx.fill();
  },[1,1]);
}

// --- Set pieces round the course. ---
function deadTree(parent,x,y,z,scale,seed,mat){
  const random=randomSource(seed),tree=new THREE.Group();tree.position.set(x,y,z);tree.scale.setScalar(scale);parent.add(tree);
  const grow=(from,dir,length,r,depth)=>{
    const to=from.clone().addScaledVector(dir,length);beam(tree,from.toArray(),to.toArray(),r,mat,6,r*.65);
    if(depth===0)return;
    const n=depth>1?2+Math.floor(random()*2):2;
    for(let i=0;i<n;i++){
      const d=dir.clone().add(new THREE.Vector3(random()*1.6-.8,random()*.5-.1,random()*1.6-.8)).normalize();
      grow(to,d,length*(.55+random()*.2),r*.62,depth-1);
    }
  };
  grow(new THREE.Vector3(0,0,0),new THREE.Vector3(random()*.2-.1,1,random()*.2-.1).normalize(),1.8,.22,3);
  return tree;
}
function lighthouse(parent,x,z,animated){
  const tower=new THREE.Group();tower.position.set(x,-6.2,z);parent.add(tower);
  const white=material(0xe9e1d6),red=material(0x9c3a42),dark=material(C.iron);
  add(tower,new THREE.CylinderGeometry(4.6,5.4,3,9),material(C.stoneDark,{flatShading:true}),0,1.2,0);
  for(let i=0;i<5;i++)add(tower,new THREE.CylinderGeometry(1.75-i*.17,1.9-i*.17,2.4,16),i%2?red:white,0,3.9+i*2.4,0);
  add(tower,new THREE.CylinderGeometry(1.25,1.25,.3,16),dark,0,15.9,0);
  const lamp=add(tower,new THREE.CylinderGeometry(.85,.85,1.4,12),glow(C.amber,2.2),0,16.8,0);lamp.castShadow=false;
  add(tower,new THREE.ConeGeometry(1.25,1.3,12),red,0,18.1,0);
  // A slowly turning beam through the fog.
  const beamGroup=new THREE.Group();beamGroup.position.set(0,16.8,0);tower.add(beamGroup);
  const cone=new THREE.Mesh(new THREE.ConeGeometry(3.2,34,20,1,true),new THREE.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:.07,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
  cone.rotation.z=Math.PI/2;cone.position.x=17;beamGroup.add(cone);
  animated.push(t=>{beamGroup.rotation.y=t*.35});
}
function ghostShip(parent,x,z,heading,animated){
  const ship=new THREE.Group();ship.position.set(x,-6.1,z);ship.rotation.y=heading;parent.add(ship);
  const hullMat=material(0x2a2230,{flatShading:true}),trim=material(0x4a3a3a,{flatShading:true});
  // The hull: a lofted shape from a half outline, pointed at the bow.
  const shape=new THREE.Shape();shape.moveTo(-6,0);shape.lineTo(5,0);shape.quadraticCurveTo(8.5,.4,9,2.6);shape.lineTo(-6.8,2.9);shape.quadraticCurveTo(-7.1,1,-6,0);
  const hull=add(ship,new THREE.ExtrudeGeometry(shape,{depth:3.4,bevelEnabled:true,bevelThickness:.4,bevelSize:.3,bevelSegments:1}),hullMat,0,-.6,-1.7);
  hull.scale.set(1,1,1);
  add(ship,new THREE.BoxGeometry(4,1.8,3.4),trim,-4.6,3.1,0);
  const sailMat=new THREE.MeshBasicMaterial({map:sailTexture(),transparent:true,depthWrite:false,side:THREE.DoubleSide});
  for(const [mx,h] of [[-2,11],[3,9.5]]){
    beam(ship,[mx,2,0],[mx,2+h,0],.18,trim);
    for(const [y,w] of [[h*.55,4.6],[h*.85,3.6]]){
      beam(ship,[mx,2+y+1.4,-w/2-.3],[mx,2+y+1.4,w/2+.3],.08,trim);
      const sail=add(ship,new THREE.PlaneGeometry(w,2.6,6,2),sailMat,mx+.25,2+y,0);sail.rotation.y=Math.PI/2;sail.castShadow=false;
      const p=sail.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)/w*Math.PI+.5)*.45);
    }
  }
  beam(ship,[8.6,2.8,0],[12.5,4.6,0],.1,trim);
  const lanterns=[[-6.4,4.4,1.2],[-6.4,4.4,-1.2],[8.2,3.4,0]].map(p=>add(ship,new THREE.SphereGeometry(.28,10,8),glow(C.ghostGreen,2),...p));
  animated.push(t=>{ship.position.y=-6.1+Math.sin(t*.6)*.25;ship.rotation.z=Math.sin(t*.45)*.04;ship.rotation.x=Math.sin(t*.37)*.03;lanterns.forEach((l,i)=>l.material.emissiveIntensity=1.5+Math.sin(t*3+i*2)*.6)});
  return ship;
}
function graveyardIsland(parent,x,z,radius,seed,animated,pumpkins){
  const random=randomSource(seed),island=new THREE.Group();island.position.set(x,-4.4,z);parent.add(island);
  const rock=add(island,new THREE.DodecahedronGeometry(radius,1),material(C.stoneDark,{flatShading:true}),0,-radius*.55,0);rock.scale.y=.55;
  add(island,new THREE.CylinderGeometry(radius*.92,radius,.5,14),material(0x2c3a2b,{flatShading:true}),0,.05,0);
  for(let i=0;i<5;i++){
    const a=random()*Math.PI*2,d=radius*(.25+random()*.55);
    placed(island,`halloween/gravestone-${i%3}`,Math.cos(a)*d,.3,Math.sin(a)*d,1+random()*.3,random()*.8-.4+Math.PI*.15);
  }
  deadTree(island,random()*2-1,.3,random()*2-1,1.2+random()*.4,seed*3,material(C.bark,{flatShading:true}));
  for(let i=0;i<2;i++){const a=random()*Math.PI*2;const p=placed(island,`halloween/jack-o-lantern-${i}`,Math.cos(a)*radius*.7,.3,Math.sin(a)*radius*.7,1.1,a+Math.PI/2);if(p)pumpkins.push(p)}
  // A crooked iron fence along the shore.
  const iron=material(C.iron);
  for(let i=0;i<14;i++){const a=i/14*Math.PI*1.3+seed,px=Math.cos(a)*radius*.9,pz=Math.sin(a)*radius*.9;const bar=beam(island,[px,.3,pz],[px+(random()-.5)*.15,1.4+random()*.3,pz],.04,iron,5);bar.castShadow=false}
  return island;
}

// The flickering of every jack-o'-lantern: each one gets its own glow material.
function flicker(pumpkins,animated){
  const mats=pumpkins.map((p,i)=>{let m=null;p.traverse(o=>{if(o.isMesh&&o.material.name==='Glow'){o.material=o.material.clone();m=o.material}});return [m,i]}).filter(([m])=>m);
  animated.push(t=>{for(const [m,i] of mats)m.emissiveIntensity=4+Math.sin(t*11+i*3.1)*.9+Math.sin(t*23+i)*.6})
}

export function createHalloweenEnvironment(scene,level){
  const animated=[],texture=softTexture(),pumpkins=[];
  scene.background=new THREE.Color(HALLOWEEN_THEME.sky);
  scene.fog=new THREE.Fog(0x2a1a3c,48,140);
  const sky=add(scene,new THREE.SphereGeometry(170,32,20),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color(0x0b0619)},bottom:{value:new THREE.Color(HALLOWEEN_THEME.horizon)},glowDir:{value:new THREE.Vector3(100,26,-34).normalize()}},
    vertexShader:'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 top;uniform vec3 bottom;uniform vec3 glowDir;varying vec3 vPosition;
      void main(){vec3 d=normalize(vPosition);float h=d.y;vec3 c=mix(bottom,top,smoothstep(-.15,.6,h));
      c+=vec3(1.,.45,.12)*pow(max(0.,dot(d,glowDir)),24.)*.35;gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }`,
  }));
  sky.castShadow=sky.receiveShadow=false;sky.frustumCulled=false;
  // Stars, fewer near the moon.
  const random=randomSource(91),stars=[];
  for(let i=0;i<260;i++){const a=random()*Math.PI*2,r=100+random()*30,y=16+random()*80;stars.push(Math.cos(a)*r,y,Math.sin(a)*r)}
  const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(stars,3));
  scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xe8ddff,size:.26,transparent:true,opacity:.75})));
  // The moon: big, orange and low, with a halo, and a witch who crosses it now and then.
  // Ahead of the tee (the holes run towards +x), so it rises over the course in the overview.
  const moonPos=new THREE.Vector3(100,26,-34);
  const moon=new THREE.Mesh(new THREE.CircleGeometry(11,48),new THREE.MeshBasicMaterial({map:moonTexture(),transparent:true,fog:false}));
  moon.position.copy(moonPos);moon.lookAt(0,0,0);scene.add(moon);
  glowSprite(scene,texture,0xff9a40,moonPos.x+1,moonPos.y,moonPos.z,62,.45);
  const witch=new THREE.Sprite(new THREE.SpriteMaterial({map:witchTexture(),transparent:true,fog:false,depthWrite:false}));
  witch.scale.set(9,4.5,1);scene.add(witch);
  animated.push(t=>{
    const k=(t%26)/26,x=-30+k*90;witch.visible=k<.75;
    witch.position.set(moonPos.x-3,moonPos.y-4+Math.sin(k*Math.PI*3)*2+k*8,moonPos.z+x-30);
  });

  // Moonlight from behind, a cold fill and the orange of the lanterns.
  scene.add(new THREE.HemisphereLight(0x9b8fe0,0x2a1d33,1.7));
  const moonlight=new THREE.DirectionalLight(0xd9ccff,2.1);moonlight.position.set(-14,26,18);moonlight.castShadow=true;
  moonlight.shadow.mapSize.set(2048,2048);Object.assign(moonlight.shadow.camera,{left:-36,right:36,top:36,bottom:-36});
  moonlight.shadow.normalBias=.025;moonlight.shadow.bias=-.0001;scene.add(moonlight);
  const rim=new THREE.DirectionalLight(0xff9a50,.75);rim.position.set(20,8,-30);scene.add(rim);

  // Black water with a moonlit path.
  const water=add(scene,new THREE.PlaneGeometry(320,320),new THREE.ShaderMaterial({
    uniforms:{time:{value:0},base:{value:new THREE.Color(C.water)},glint:{value:new THREE.Color(0xffb46a)}},
    vertexShader:'varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',
    fragmentShader:`uniform float time;uniform vec3 base;uniform vec3 glint;varying vec3 world;
      void main(){vec2 p=world.xz;float wave=sin(p.y*1.7-time*.4+sin(p.x*.23+time*.1)*1.4);
      float lines=smoothstep(.97,.999,wave)*pow(.5+.5*sin(p.x*.41+sin(p.y*.6)),3.);
      float path=exp(-pow((p.y+p.x*.34-0.)/7.,2.))*smoothstep(0.,60.,p.x);
      vec3 color=base+glint*lines*(.05+.5*path)+glint*path*.04;gl_FragColor=vec4(color,1.);
      #include <colorspace_fragment>
      }`,
  }),0,-6.4,0);water.rotation.x=-Math.PI/2;water.castShadow=water.receiveShadow=false;
  // The moon's reflection on the water, seen from above in the overview.
  const reflection=new THREE.Mesh(new THREE.CircleGeometry(1,32),new THREE.MeshBasicMaterial({map:texture,color:0xffa050,transparent:true,opacity:.5,depthWrite:false,blending:THREE.AdditiveBlending}));
  reflection.rotation.x=-Math.PI/2;reflection.scale.set(14,7,1);reflection.position.set(38,-6.35,-13);scene.add(reflection);
  animated.push(t=>{reflection.material.opacity=.42+Math.sin(t*.8)*.06});

  // Where the course is, so the set pieces stay clear of it.
  const xs=level.tiles.flatMap(t=>[t.x1,t.x2]),zs=level.tiles.flatMap(t=>[t.z1,t.z2]);
  const box={x1:Math.min(...xs),x2:Math.max(...xs),z1:Math.min(...zs),z2:Math.max(...zs)};
  const statics=new THREE.Group();scene.add(statics);
  graveyardIsland(statics,box.x1-11,box.z1-8,5.5,3,animated,pumpkins);
  graveyardIsland(statics,box.x2+12,box.z2+9,4.6,11,animated,pumpkins);
  graveyardIsland(statics,(box.x1+box.x2)/2-4,box.z2+15,4,23,animated,pumpkins);
  lighthouse(scene,box.x2+20,box.z1-22,animated);
  ghostShip(scene,box.x1+6,box.z1-34,.25,animated);
  // Crooked lamp posts with orange lanterns along the outer shore.
  const iron=material(C.iron),lanternGlow=glow(C.amber,2.4);
  const posts=[[box.x1-3,box.z2+3],[box.x2+3,box.z1-3],[(box.x1+box.x2)/2,box.z1-5],[box.x2+4,(box.z1+box.z2)/2+4],[box.x1-4,(box.z1+box.z2)/2-5]];
  for(const [i,[x,z]] of posts.entries()){
    add(statics,new THREE.CylinderGeometry(.6,.8,4.6,8),material(C.plankDark),x,-4.1,z);
    beam(statics,[x,-1.8,z],[x+.25,2.6,z],.07,iron,6);beam(statics,[x+.25,2.6,z],[x+.9,2.8,z],.05,iron,5);
    add(statics,new THREE.BoxGeometry(.32,.42,.32),lanternGlow,x+.9,2.45,z).castShadow=false;
    const halo=glowSprite(scene,texture,0xff9a40,x+.9,2.45,z,2.6,.7);animated.push(t=>{halo.material.opacity=.55+Math.sin(t*9+i*2)*.1+Math.sin(t*17+i)*.06});
  }
  // Ghosts drifting in the fog round the edge, and bats.
  const ghosts=[];
  for(let i=0;i<4;i++){
    const g=placed(scene,'halloween/ghost',0,0,0,1.15);if(!g)break;
    g.traverse(o=>{if(o.isMesh&&o.material.name==='Ghost'){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.72;o.material.depthWrite=false;o.castShadow=false}});
    const parts={};g.traverse(o=>{if(o.name)parts[o.name]=o});
    const a0=i/4*Math.PI*2+.4,cx=(box.x1+box.x2)/2,cz=(box.z1+box.z2)/2,rx=(box.x2-box.x1)/2+7+i,rz=(box.z2-box.z1)/2+7;
    ghosts.push(t=>{
      const a=a0+t*.07*(i%2?1:-1);g.position.set(cx+Math.cos(a)*rx,-1.2+Math.sin(t*1.1+i)*.5,cz+Math.sin(a)*rz);
      g.rotation.y=Math.atan2(cx-g.position.x,cz-g.position.z)+Math.sin(t*.7+i)*.4;
      if(parts['arm-l'])parts['arm-l'].rotation.z=-.2+Math.sin(t*2.3+i)*.35;if(parts['arm-r'])parts['arm-r'].rotation.z=.2-Math.sin(t*2.1+i)*.35;
    });
  }
  animated.push(...ghosts);
  for(let i=0;i<9;i++){
    const b=placed(scene,'halloween/bat',0,0,0,1);if(!b)break;b.traverse(o=>{o.castShadow=false});
    const parts={};b.traverse(o=>{if(o.name)parts[o.name]=o});
    const cx=(box.x1+box.x2)/2+(i%3-1)*8,cz=box.z1-6+(i%2)*4,r=6+i%4*2,speed=.5+i*.07,phase=i*1.7;
    const v=new THREE.Vector3();
    animated.push(t=>{
      const a=phase+t*speed;b.position.set(cx+Math.cos(a)*r,8+Math.sin(t*1.3+i)*1.5+i%3,cz+Math.sin(a*1.3)*r*.6);
      v.set(-Math.sin(a)*r,0,Math.cos(a*1.3)*r*.78);b.rotation.y=Math.atan2(v.x,v.z);
      const flap=Math.sin(t*16+phase)*.9;if(parts['wing-l'])parts['wing-l'].rotation.z=flap;if(parts['wing-r'])parts['wing-r'].rotation.z=-flap;
    });
  }
  // Low fog banks drifting over the water.
  const fogSprites=[];
  for(let i=0;i<16;i++){
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:0x8a7aa8,transparent:true,depthWrite:false,opacity:.16}));
    const a=i/16*Math.PI*2,cx=(box.x1+box.x2)/2,cz=(box.z1+box.z2)/2;s.scale.set(16,5,1);scene.add(s);
    fogSprites.push([s,a,cx,cz,(box.x2-box.x1)/2+4+(i%3)*3,(box.z2-box.z1)/2+4+(i%2)*3]);
  }
  animated.push(t=>{for(const [s,a,cx,cz,rx,rz] of fogSprites){const k=a+t*.02;s.position.set(cx+Math.cos(k)*rx,-4.6+Math.sin(t*.3+a)*.4,cz+Math.sin(k)*rz)}});
  flicker(pumpkins,animated);
  bakeStatic(statics);
  return {theme:HALLOWEEN_THEME,pumpkins,update(time){water.material.uniforms.time.value=time;for(const f of animated)f(time)}};
}

// --- The course: felt on wooden piles, candy-corn rails and lantern posts. ---
function feltTexture(){
  return canvasTexture(128,128,(ctx,w,h)=>{
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);const random=randomSource(5);
    for(let i=0;i<1400;i++){const v=200+random()*55;ctx.fillStyle=`rgba(${v},${v},${v},.5)`;ctx.fillRect(random()*w,random()*h,1,1+random()*2)}
  },[1,1]);
}
// Each prototype tile keeps its own hue (the routes stay readable), darkened for the night.
export function nightFelt(color,check=0){
  const hsl={};new THREE.Color(color).getHSL(hsl);
  return new THREE.Color().setHSL(hsl.h,Math.min(.5,Math.max(.3,hsl.s*.7)),.15+check*.022);
}
export function createHalloweenCourse(scene,cells,boundaries,heightAt,level){
  const flat=level.bridge?()=>0:heightAt,positions=[],colors=[],uvs=[];
  const isSlime=(x,z)=>(level.surfaces||[]).some(s=>s.kind==='ice'&&x>=s.x1&&x<=s.x2&&z>=s.z1&&z<=s.z2);
  for(const cell of cells){
    if(cell.dynamic)continue;
    const cuts=(lo,hi)=>[lo,...Array.from({length:Math.max(0,Math.ceil(hi/1.3)-Math.floor(lo/1.3)-1)},(_,i)=>(Math.floor(lo/1.3)+i+1)*1.3),hi];
    const xs=cuts(cell.x1,cell.x2),zs=cuts(cell.z1,cell.z2);
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
      const x1=xs[i],x2=xs[i+1],z1=zs[j],z2=zs[j+1],check=(Math.floor((x1+x2)/2/1.3)+Math.floor((z1+z2)/2/1.3))%2;
      const color=isSlime((x1+x2)/2,(z1+z2)/2)?new THREE.Color(check?0x6fd23c:0x7ddf48):nightFelt(cell.color,check);
      for(const [x,z] of [[x1,z1],[x1,z2],[x2,z1],[x1,z2],[x2,z2],[x2,z1]]){positions.push(x,flat(x,z)+.04,z);colors.push(color.r,color.g,color.b);uvs.push(x/1.6,z/1.6)}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
  const floor=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,map:feltTexture(),roughness:.92}));floor.receiveShadow=true;floor.name='spook-felt';scene.add(floor);

  // Plank skirts show each lane's thickness; piles carry it down into the water.
  const skirt=[];
  for(const e of boundaries){
    if(e.dynamic)continue;
    const ay=flat(e.ax,e.az),by=flat(e.bx,e.bz);
    for(const [x,y,z] of [[e.ax,ay+.035,e.az],[e.ax,ay-.9,e.az],[e.bx,by+.035,e.bz],[e.ax,ay-.9,e.az],[e.bx,by-.9,e.bz],[e.bx,by+.035,e.bz]])skirt.push(x,y,z);
  }
  const skirtGeometry=new THREE.BufferGeometry();skirtGeometry.setAttribute('position',new THREE.Float32BufferAttribute(skirt,3));skirtGeometry.computeVertexNormals();
  add(scene,skirtGeometry,material(C.plank,{side:THREE.DoubleSide,flatShading:true}));
  const piles=[];
  for(const t of level.tiles){
    if(t.dynamic)continue;
    for(const x of [t.x1+.5,t.x2-.5])for(const z of [t.z1+.5,t.z2-.5]){
      const top=flat(x,z)-.85;piles.push(new THREE.CylinderGeometry(.24,.28,top+6.6,7).translate(x,(top-6.6)/2,z));
    }
  }
  if(piles.length)add(scene,mergeGeometries(piles),material(C.plankDark,{flatShading:true}));

  // Candy-corn rails: orange and bone, with iron posts and little lantern bulbs.
  const orange=[],bone=[],postGeometries=[],bulbs=[];
  for(const e of boundaries.filter(edge=>!edge.open&&!edge.dynamic)){
    const ay=flat(e.ax,e.az)+.2,by=flat(e.bx,e.bz)+.2,length=Math.hypot(e.bx-e.ax,e.bz-e.az),n=Math.max(1,Math.round(length/.55));
    for(let k=0;k<n;k++){
      const t0=k/n,t1=(k+1)/n,a=new THREE.Vector3(e.ax+(e.bx-e.ax)*t0,ay+(by-ay)*t0,e.az+(e.bz-e.az)*t0),b=new THREE.Vector3(e.ax+(e.bx-e.ax)*t1,ay+(by-ay)*t1,e.az+(e.bz-e.az)*t1);
      const g=new THREE.CylinderGeometry(.1,.1,a.distanceTo(b),8);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize()));
      g.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);(k%2?orange:bone).push(g);
    }
    for(const [x,z] of [[e.ax,e.az],[e.bx,e.bz]]){
      const key=`${x},${z}`;if(bulbs.includes(key))continue;bulbs.push(key);
      postGeometries.push(new THREE.CylinderGeometry(.07,.09,.55,7).translate(x,flat(x,z)+.2,z));
    }
  }
  if(orange.length)add(scene,mergeGeometries(orange),material(C.orange,{roughness:.45}));
  if(bone.length)add(scene,mergeGeometries(bone),material(C.bone,{roughness:.45}));
  if(postGeometries.length){
    add(scene,mergeGeometries(postGeometries),material(C.iron));
    add(scene,mergeGeometries(bulbs.map(key=>{const [x,z]=key.split(',').map(Number);return new THREE.SphereGeometry(.1,8,6).translate(x,flat(x,z)+.53,z)})),glow(C.amber,1.6)).castShadow=false;
  }
  // Open edges are painted with orange and violet chevrons: the water starts here.
  const chevron=[[],[]],floorAt=(x,z)=>cells.some(c=>x>=c.x1&&x<=c.x2&&z>=c.z1&&z<=c.z2);
  for(const edge of level.openEdges||[]){
    const vertical=edge.x!==undefined,lo=vertical?edge.z1:edge.x1,hi=vertical?edge.z2:edge.x2,count=Math.ceil((hi-lo)/.35);
    for(let k=0;k<count;k++){
      // Paint on whichever side has floor.
      const t=lo+(k+.5)*(hi-lo)/count,side=vertical?(floorAt(edge.x-.2,t)?-1:1):(floorAt(t,edge.z-.2)?-1:1);
      const x=vertical?edge.x+side*.1:t,z=vertical?t:edge.z+side*.1;
      chevron[k%2].push(new THREE.BoxGeometry(vertical?.16:.22,.02,vertical?.22:.16).translate(x,flat(x,z)+.055,z));
    }
  }
  chevron.forEach((gs,k)=>{if(gs.length)add(scene,mergeGeometries(gs),k?material(C.purple):glow(C.orange,.6)).castShadow=false});
  // Spider webs in a few corners of the course.
  const web=new THREE.MeshBasicMaterial({map:webTexture(),transparent:true,depthWrite:false,side:THREE.DoubleSide,opacity:.8});
  const corners=boundaries.filter(e=>!e.open&&!e.dynamic).map(e=>[e.ax,e.az]);
  for(let i=0;i<corners.length&&i<24;i+=6){
    const [x,z]=corners[i],w=add(scene,new THREE.PlaneGeometry(.9,.9),web,x,flat(x,z)+.45,z);w.rotation.y=i;w.castShadow=false;
  }
  return floor;
}

// Course decor for the prototype holes: jack-o'-lanterns on the start shelf and
// by the flag, a gravestone or two, all behind the rails.
export function dressHalloweenCourse(scene,level,heightAt,environment){
  const flat=level.bridge?()=>0:heightAt,pumpkins=[];
  const spots=[[level.start.x-1.2,level.start.z-3.4,0],[level.start.x-1.2,level.start.z+3.4,1],[level.shelf.x,level.shelf.z,0]];
  for(const [x,z,v] of spots){const p=placed(scene,`halloween/jack-o-lantern-${v}`,x,flat(x,z)+.04,z,.75,Math.atan2(level.cup.x-x,level.cup.z-z)*0+Math.PI);if(p)pumpkins.push(p)}
  placed(scene,'halloween/gravestone-0',level.shelf.x+1.2,flat(level.shelf.x,level.shelf.z)+.04,level.shelf.z,.8,Math.PI);
  if(environment?.pumpkins)environment.pumpkins.push(...pumpkins);
  const mats=[];for(const p of pumpkins)p.traverse(o=>{if(o.isMesh&&o.material.name==='Glow'){o.material=o.material.clone();mats.push(o.material)}});
  return {update(t){mats.forEach((m,i)=>m.emissiveIntensity=4+Math.sin(t*12+i*2.3)*.9+Math.sin(t*21+i)*.5)}};
}

// --- Mechanisms in Halloween dress. ---
// The flipper bumpers are jack-o'-lanterns that squash when the ball hits.
export function createPumpkinBumpers(scene,bumpers=[]){
  return bumpers.map((b,i)=>{
    const group=new THREE.Group();group.position.set(b.x,.04,b.z);scene.add(group);
    add(group,new THREE.CylinderGeometry(b.r+.14,b.r+.18,.1,28),material(C.iron),0,.05,0);
    const p=placed(group,`halloween/jack-o-lantern-${i%2}`,0,.08,0,b.r/.42,i*1.3+Math.PI);
    if(!p)add(group,new THREE.SphereGeometry(b.r,20,14),material(C.orange),0,b.r*.8,0);
    let glowMat=null;p?.traverse(o=>{if(o.isMesh&&o.material.name==='Glow'){o.material=o.material.clone();glowMat=o.material}});
    return {pulse:0,update(dt){this.pulse=Math.max(0,this.pulse-dt*3);group.scale.set(1+this.pulse*.16,1-this.pulse*.22,1+this.pulse*.16);if(glowMat)glowMat.emissiveIntensity=4+this.pulse*10}};
  });
}

// The lift gate as a crypt portcullis between stone pillars, with three
// witch-fire lanterns on each side: red, amber and green, as before.
export function createCryptGates(scene,gates=[]){
  return gates.map(gate=>{
    const frame=new THREE.Group();frame.position.set(gate.x,.04,gate.z);scene.add(frame);
    const stone=material(C.stone,{flatShading:true}),dark=material(C.stoneDark,{flatShading:true}),iron=material(C.iron,{metalness:.5,roughness:.5});
    for(const side of [-1,1]){
      add(frame,new THREE.BoxGeometry(.7,3.3,.7),stone,0,1.65,side*gate.postOffset);
      add(frame,new THREE.BoxGeometry(.85,.3,.85),dark,0,3.4,side*gate.postOffset);
      const skull=placed(frame,'halloween/jack-o-lantern-1',0,3.55,side*gate.postOffset,.55,-Math.PI/2);
      if(skull)skull.rotation.y=-Math.PI/2;
    }
    add(frame,new THREE.BoxGeometry(.6,.45,gate.postOffset*2+.7),stone,0,3.05,0);
    // The portcullis: iron bars with spikes at the bottom.
    const panel=new THREE.Group();frame.add(panel);
    const bars=[],spikes=[];
    for(let i=0;i<9;i++){const z=-gate.halfWidth+.1+i*(gate.halfWidth*2-.2)/8;bars.push(new THREE.CylinderGeometry(.045,.045,1.25,6).translate(0,.72,z));spikes.push(new THREE.ConeGeometry(.07,.2,6).rotateX(Math.PI).translate(0,.04,z))}
    for(const y of [.4,1.05])bars.push(new THREE.BoxGeometry(.08,.08,gate.halfWidth*2).translate(0,y,0));
    add(panel,mergeGeometries([...bars,...spikes]),iron);
    const colors=[0xff4a5a,0xffb23a,0x6dff7a],lamps=colors.map(color=>glow(color,1.5));
    for(const side of [-1,1])for(const face of [-1,1])lamps.forEach((mat,i)=>{
      const flame=add(frame,new THREE.SphereGeometry(.13,10,8),mat,face*.4,2.35-i*.42,side*gate.postOffset);flame.scale.y=1.4;flame.castShadow=false;
    });
    // Glowing guide marks show the clear lane under the gate.
    const trim=glow(C.ghostGreen,.8);
    for(const x of [-2.1,-1.45]){
      const shape=new THREE.Shape();shape.moveTo(.23,0);shape.lineTo(-.14,.24);shape.lineTo(-.14,-.24);shape.closePath();
      const arrow=new THREE.Mesh(new THREE.ShapeGeometry(shape),trim);arrow.rotation.x=-Math.PI/2;arrow.position.set(x,.045,0);frame.add(arrow);
    }
    return {update(time){
      const pose=gatePose(time,gate);panel.position.y=pose.height;
      const active={red:0,amber:1,green:2}[pose.signal];
      lamps.forEach((mat,i)=>{mat.color.setHex(i===active?colors[i]:0x2a2233);mat.emissive.setHex(i===active?colors[i]:0x000000);mat.emissiveIntensity=i===active?1.8+Math.sin(time*14)*.3:0});
    }};
  });
}

// The spinner as a scarecrow: a straw-stuffed cross on a post, pumpkin head on top.
// The arms follow the spinner's collision bars exactly (reach and radius).
export function createScarecrow(group,spinner){
  const wood=material(0x6a4a30,{flatShading:true}),cloth=material(0x7a3b4e,{flatShading:true}),straw=material(0xd8b452,{flatShading:true});
  add(group,new THREE.CylinderGeometry(.16,.2,2.2,8),wood,0,1.1,0);
  for(let axis=0;axis<spinner.axes;axis++){
    const arm=new THREE.Group();arm.rotation.y=axis*Math.PI/2;group.add(arm);
    const length=(spinner.reach-spinner.radius)*2;
    beam(arm,[-length/2,.42,0],[length/2,.42,0],.09,wood,6);
    // Ragged sleeves cover the collision capsule: what you see is what you hit.
    for(const s of [-1,1]){
      add(arm,new THREE.CylinderGeometry(spinner.radius,spinner.radius*1.1,length/2-.4,8).rotateZ(Math.PI/2),cloth,s*(length/4+.2),.42,0);
      for(let k=0;k<3;k++){const tuft=add(arm,new THREE.ConeGeometry(.12,.38,5),straw,s*(length/2-.05),.42+(k-1)*.12,(k-1)*.1);tuft.rotation.z=s*Math.PI/2}
    }
  }
  placed(group,'halloween/jack-o-lantern-1',0,2.1,0,.7,Math.PI);
  add(group,new THREE.ConeGeometry(.42,.6,10),material(0x2b1d3a),0,2.85,0);
}

// The spring pads as witch circles: a glowing ring of runes with green chevrons.
function runeTexture(){
  return canvasTexture(256,256,(ctx,w)=>{
    const c=w/2;ctx.strokeStyle='#c9ffd8';ctx.fillStyle='#c9ffd8';ctx.lineWidth=7;
    ctx.beginPath();ctx.arc(c,c,c-8,0,Math.PI*2);ctx.stroke();ctx.lineWidth=3;ctx.beginPath();ctx.arc(c,c,c-34,0,Math.PI*2);ctx.stroke();
    ctx.font='bold 22px serif';ctx.textAlign='center';ctx.textBaseline='middle';
    const runes='ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃ';
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ctx.save();ctx.translate(c+Math.cos(a)*(c-21),c+Math.sin(a)*(c-21));ctx.rotate(a+Math.PI/2);ctx.fillText(runes[i],0,0);ctx.restore()}
    ctx.beginPath();ctx.arc(c,c,c*.38,0,Math.PI*2);ctx.lineWidth=5;ctx.stroke();
  },[1,1]);
}
export function createWitchCircles(scene,springs){
  const texture=runeTexture();
  return springs.map(spring=>{
    const disc=add(scene,new THREE.CylinderGeometry(.92,.92,.06,32),material(0x2b1d3a),spring.x,.08,spring.z);
    const runes=new THREE.Mesh(new THREE.CircleGeometry(.95,40),new THREE.MeshBasicMaterial({map:texture,transparent:true,color:0x9dffc2,depthWrite:false}));
    runes.rotation.x=-Math.PI/2;runes.position.set(spring.x,.12,spring.z);scene.add(runes);
    const core=add(scene,new THREE.CylinderGeometry(.34,.34,.05,24),glow(0x6dff7a,1.6),spring.x,.12,spring.z);core.castShadow=false;
    const chevron=glow(C.ghostGreen,.9);
    for(const distance of [1.3,1.9,2.5]){
      const points=[[distance+.2,0],[distance-.15,-.24],[distance-.15,.24]].flatMap(([along,across])=>[spring.x+along*spring.dx-across*spring.dz,.09,spring.z+along*spring.dz+across*spring.dx]);
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geometry.setIndex([0,1,2]);
      scene.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:C.ghostGreen,side:THREE.DoubleSide})));
    }
    // The course's spring pulse scales this, as it did the old pad.
    disc.userData.runes=runes;return core;
  });
}

// The decorative arches as graveyard gates: stone pillars where the arch posts
// collide, an iron arch over the lane and a hanging lantern.
export function createGraveGates(scene,arches=[],heightAt=()=>0){
  const stone=material(C.stone,{flatShading:true}),iron=material(C.iron,{metalness:.5,roughness:.5}),lamp=glow(C.amber,2);
  for(const a of arches){
    const g=new THREE.Group();g.position.set(a.x,heightAt(a.x,a.z)+.04,a.z);scene.add(g);
    // Low, so the view from the tee goes over it.
    for(const s of [-1,1]){add(g,new THREE.BoxGeometry(.5,1.5,.5),stone,0,.75,s*1.8);add(g,new THREE.SphereGeometry(.26,10,8),stone,0,1.65,s*1.8)}
    const arc=new THREE.Mesh(new THREE.TorusGeometry(1.8,.06,6,24,Math.PI),iron);arc.position.y=1.5;arc.rotation.y=Math.PI/2;arc.scale.y=.45;g.add(arc);
    beam(g,[0,2.31,0],[0,2.05,0],.02,iron,4);add(g,new THREE.SphereGeometry(.13,10,8),lamp,0,1.95,0).castShadow=false;
  }
}

// Slime instead of frost on the slippery chute: bright, glossy and dripping.
export const SLIME_STYLE={sheet:{color:0x7fe24a,roughness:.12,metalness:.05,emissive:0x2f8a1a,emissiveIntensity:.45},streak:0xd9ffb8,warning:0xff8a2a,drip:true};
