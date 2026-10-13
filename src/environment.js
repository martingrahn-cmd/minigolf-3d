import * as THREE from 'three';
import { LEVELS } from './levels.js';
import { createCrownScenery } from './crown.js';
import { FOREST_THEME, createForestEnvironment } from './forest.js';
import { createRavineScenery } from './ravine.js';
import { createAcornScenery } from './acorn.js';
import { createLoopScenery } from './loop-visuals.js';
import { CLOCK_THEME, createClockEnvironment } from './clockwork.js';

export const THEMES={
  sunset:{key:'sunset',name:'Solskensöarna',range:'PROTOTYP',sky:0x6eabc7,horizon:0xffce9e,water:0x248eaa,rail:0xffefcb,base:0x326773,accent:0xffc367},
  neon:{key:'neon',name:'Neonhamnen',range:'PROTOTYP',sky:0x151b48,horizon:0x716391,water:0x143d63,rail:0x89e7df,base:0x273452,accent:0x8af6e8},
  forest:FOREST_THEME,
  clockwork:CLOCK_THEME,
};
export const themeFor=id=>THEMES[LEVELS.find(level=>level.id===id)?.theme]||(id<=9?THEMES.sunset:THEMES.neon);
const standard=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.75,...extra});
function mesh(scene,geometry,material,x,y,z){
  const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);scene.add(object);return object;
}
function beam(scene,a,b,r,material){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
  const object=mesh(scene,new THREE.CylinderGeometry(r,r,start.distanceTo(end),8),material,0,0,0);
  object.position.copy(start).add(end).multiplyScalar(.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return object;
}
export function createEnvironment(scene,level){
  if(themeFor(level.id).key==='clockwork')return createClockEnvironment(scene,level);
  if(themeFor(level.id).key==='forest')return createForestEnvironment(scene,level.scenery==='crown'?createCrownScenery:level.scenery==='loop'?createLoopScenery:level.scenery==='acorn'?createAcornScenery:level.scenery==='ravine'?createRavineScenery:undefined);
  const night=level.id>=10,theme=themeFor(level.id),animated=[];
  let seed=137;
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
  scene.background=new THREE.Color(theme.sky);
  scene.fog=new THREE.Fog(theme.horizon,65,145);
  const sky=mesh(scene,new THREE.SphereGeometry(170,32,20),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color(theme.sky)},bottom:{value:new THREE.Color(theme.horizon)}},
    vertexShader:'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 top;uniform vec3 bottom;varying vec3 vPosition;
      void main(){float h=normalize(vPosition).y;gl_FragColor=vec4(mix(bottom,top,smoothstep(-.2,.75,h)),1.);
      #include <colorspace_fragment>
      }`,
  }),0,0,0);
  sky.frustumCulled=false;
  scene.add(new THREE.HemisphereLight(night?0xa8c9ff:0xfff4dc,night?0x66558c:0x719391,night?2.1:1.75));
  const sun=new THREE.DirectionalLight(night?0xc5d8ff:0xffdb9d,night?2.0:2.5);
  sun.position.set(-16,25,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-36,right:36,top:36,bottom:-36});
  sun.shadow.normalBias=.025;sun.shadow.bias=-.0001;scene.add(sun);
  const fill=new THREE.DirectionalLight(night?0xb386ec:0x94dbed,.8);fill.position.set(16,10,-20);scene.add(fill);

  const water=mesh(scene,new THREE.PlaneGeometry(300,300),new THREE.ShaderMaterial({
    uniforms:{time:{value:0},base:{value:new THREE.Color(theme.water)},glint:{value:new THREE.Color(night?0x69a5c9:0xb8e5d0)}},
    vertexShader:'varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}',
    fragmentShader:`uniform float time;uniform vec3 base;uniform vec3 glint;varying vec3 world;
      void main(){vec2 p=world.xz;float wave=sin(p.y*2.1-time*.45+sin(p.x*.21+time*.12)*1.3);
      float lines=smoothstep(.985,.999,wave)*pow(.5+.5*sin(p.x*.43+sin(p.y*.7)),3.);float reflection=exp(-pow((p.x-17.+sin(p.y*.25)*3.)/12.,2.));
      vec3 color=mix(base,glint,lines*(.055+.17*reflection));gl_FragColor=vec4(color,1.);
      #include <colorspace_fragment>
      }`,
  }),0,-6.4,0);water.rotation.x=-Math.PI/2;

  // Celestial disk and soft halo; geometry stays outside the playing space.
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const ctx=glowCanvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,4,64,64,64);
  gradient.addColorStop(0,night?'rgba(171,199,255,.8)':'rgba(255,217,153,.9)');gradient.addColorStop(.3,'rgba(255,219,165,.22)');gradient.addColorStop(1,'rgba(255,220,160,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const glowTexture=new THREE.CanvasTexture(glowCanvas);glowTexture.colorSpace=THREE.SRGBColorSpace;
  const disk=mesh(scene,new THREE.SphereGeometry(night?3.5:5.4,32,24),new THREE.MeshBasicMaterial({color:night?0xe7f3ff:0xffe0a4}),30,night?30:14,-65);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false}));halo.position.copy(disk.position);halo.scale.setScalar(night?22:40);scene.add(halo);
  if(night){
    const positions=[];
    for(let i=0;i<230;i++){
      const a=random()*Math.PI*2,r=95+random()*25,y=18+random()*78;
      positions.push(Math.cos(a)*r,y,Math.sin(a)*r);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    scene.add(new THREE.Points(geometry,new THREE.PointsMaterial({color:0xcce2ff,size:.23,transparent:true,opacity:.8,sizeAttenuation:true})));
  }

  const rockMat=standard(night?0x373c67:0x719a99),topMat=standard(night?0x505081:0x8eaf86);
  const trunk=standard(night?0x394865:0xa77b59),leaf=standard(0x479d84),lightMat=standard(theme.accent,{emissive:theme.accent,emissiveIntensity:night?1.8:.35});
  const islandSites=[[-29,-13,4.5],[-24,17,3.4],[2,-25,5.5],[28,-20,4.3],[31,13,4],[-4,23,3.3],[40,-2,3.7]];
  for(const [x,z,r] of islandSites){
    const rock=mesh(scene,new THREE.DodecahedronGeometry(r,0),rockMat,x,-5.2,z);rock.scale.set(1,.62,1);
    mesh(scene,new THREE.CylinderGeometry(r*.8,r*.9,.35,9),topMat,x,-3.4,z);
    if(night){
      for(let i=0;i<3;i++){
        const h=2+random()*5,crystal=mesh(scene,new THREE.CylinderGeometry(0,.5+random()*.4,h,5),standard(i===1?0xb687df:0x66d1d8,{emissive:i===1?0x803da8:0x207eaa,emissiveIntensity:.7}),x+(i-1)*1.5,-3.2+h/2,z+(random()-.5)*2);
        crystal.rotation.z=(random()-.5)*.3;
      }
      const ring=mesh(scene,new THREE.TorusGeometry(r*.7,.035,6,48),lightMat,x,-3.1,z);ring.rotation.x=Math.PI/2;
    }else{
      const palm=new THREE.Group();palm.position.set(x,-3.2,z);scene.add(palm);
      beam(palm,[0,0,0],[.4,4.2,0],.18,trunk);
      for(let i=0;i<7;i++){
        const a=i*Math.PI*2/7;
        const shape=new THREE.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(.7,1.4,0,3.2);shape.quadraticCurveTo(-.7,1.4,0,0);
        const frond=mesh(palm,new THREE.ShapeGeometry(shape),leaf, .4,4.2,0);
        frond.material.side=THREE.DoubleSide;frond.rotation.set(-1.3,a,0,'YXZ');
      }
    }
  }

  // Low harbour lamps outline the world, always clear of playable turf.
  const lampPositions=[[-20,-6],[-20,10],[-9,-14],[1,11],[10,-15],[24,-7],[23,10]];
  for(const [i,[x,z]] of lampPositions.entries()){
    mesh(scene,new THREE.CylinderGeometry(.5,.7,.25,8),trunk,x,-1.3,z);
    beam(scene,[x,-1.2,z],[x,1.8,z],.065,trunk);
    mesh(scene,new THREE.BoxGeometry(.38,.6,.38),lightMat,x,1.9,z);
    mesh(scene,new THREE.ConeGeometry(.4,.3,4),trunk,x,2.34,z);
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false,opacity:night?.8:.35}));sprite.position.set(x,1.9,z);sprite.scale.setScalar(2.2);scene.add(sprite);
    animated.push({object:sprite,offset:i});
  }
  // Suspended bunting follows the empty outer shore rather than crossing a fairway.
  const cord=standard(night?0x7d8aab:0xf5d7a4);
  for(const [a,b] of [[[-20,2.3,10],[1,2.3,11]],[[1,2.3,11],[23,2.3,10]]]){
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(...a),new THREE.Vector3((a[0]+b[0])/2,.6,(a[2]+b[2])/2),new THREE.Vector3(...b)]);
    mesh(scene,new THREE.TubeGeometry(curve,32,.023,5,false),cord,0,0,0);
    for(let i=1;i<13;i++){
      const point=curve.getPoint(i/13);
      const bulb=mesh(scene,night?new THREE.SphereGeometry(.09,8,6):new THREE.ConeGeometry(.22,.42,3),night?lightMat:standard(i%2?0xf28c69:0xffd271),point.x,point.y-.15,point.z);
      if(!night)bulb.rotation.z=Math.PI;
    }
  }
  return {theme,update(time){water.material.uniforms.time.value=time;animated.forEach(({object,offset})=>{object.material.opacity=(night?.7:.3)+Math.sin(time*1.1+offset)*.08})}};
}
