import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const FOREST_THEME={key:'forest',name:'Molnskogen',range:'HÅL 07–12',sky:0xef79b9,horizon:0xffacd7,rail:0xa76b37,base:0x986344,accent:0x96ca50};
const palette={bark:0x76503a,wood:0xb17c43,cut:0xeac082,moss:0x557d2c,leaf:0x69a72c,leafLight:0x92c83b,rock:0xb99973};
const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.95,flatShading:true,...extra});
function randomSource(seed){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646}}
function add(parent,geometry,mat,x=0,y=0,z=0){
  const object=new THREE.Mesh(geometry,mat);object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;object.userData.forestStatic=true;parent.add(object);return object;
}
function beam(parent,a,b,r,mat,endRadius=r,sides=7){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
  const object=add(parent,new THREE.CylinderGeometry(endRadius,r,start.distanceTo(end),sides),mat);
  object.position.copy(start).add(end).multiplyScalar(.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return object;
}
function tube(parent,points,r,mat){
  return add(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),24,r,5,false),mat);
}

// Authored outlines include small gardens beyond the fence, never extra fairway.
const teeOutline=[[-20,-4.1],[-20.8,-5.5],[-18.6,-7.5],[-14,-8],[-10,-7.4],[-6.4,-6.2],[-3,-4.1],[-3,4.1],[-5,4.65],[-8,4.4],[-10,4.65],[-13,4.25],[-16,4.7],[-19,4.5],[-20.4,3.3]];
const greenOutline=[[9.5,-1.85],[15.2,-1.85],[15.2,-5.6],[18,-7.1],[23,-7.4],[25.5,-5.5],[25.4,-2.7],[23.5,-1.5],[19.5,-1.5],[19.5,1.85],[9.5,1.85]];

function contourSamples(points){
  const samples=[];
  points.forEach((a,i)=>{
    const b=points[(i+1)%points.length],count=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/1.65);
    for(let j=0;j<count;j++)samples.push([a[0]+(b[0]-a[0])*j/count,a[1]+(b[1]-a[1])*j/count]);
  });return samples;
}
function island(parent,outline,depth=5.8,seed=23,topY=.015){
  const random=randomSource(seed),points=contourSamples(outline);
  const center=outline.reduce((p,a)=>[p[0]+a[0]/outline.length,p[1]+a[1]/outline.length],[0,0]);
  const layers=[[0,1],[-.32,1.012],[-1.1,1.04],[-2.5,.94],[-4.1,.73],[-depth,.29]];
  const rings=layers.map(([y,scale],layer)=>points.map(([x,z],i)=>{
    const rough=layer>1?Math.sin(i*2.7+seed)*.33:0;
    return [center[0]+(x-center[0])*scale+rough,topY+y+(layer>1?(random()-.5)*.65:0),center[1]+(z-center[1])*scale+rough*.7];
  }));
  const vertices=[],colors=[],strata=[0x4b6130,0xb98551,0xae774c,0x8b5d43,0x67473c];
  for(let layer=0;layer<rings.length-1;layer++)for(let i=0;i<points.length;i++){
    const j=(i+1)%points.length;
    for(const tri of [[rings[layer][i],rings[layer+1][i],rings[layer][j]],[rings[layer][j],rings[layer+1][i],rings[layer+1][j]]]){
      const color=new THREE.Color(strata[layer]).multiplyScalar(.85+random()*.28);
      for(const vertex of tri){vertices.push(...vertex);colors.push(color.r,color.g,color.b)}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  add(parent,geometry,material(0xffffff,{vertexColors:true,side:THREE.DoubleSide}));
  const shape=new THREE.Shape(outline.map(([x,z])=>new THREE.Vector2(x,-z)));
  const cap=add(parent,new THREE.ShapeGeometry(shape),material(0x6b9f34),0,topY,0);cap.rotation.x=-Math.PI/2;
}

function tree(parent,x,y,z,scale,seed,animated){
  const random=randomSource(seed),root=new THREE.Group();root.position.set(x,y,z);root.scale.setScalar(scale);root.rotation.y=random()*Math.PI*2;parent.add(root);
  const bark=material(palette.bark),litBark=material(0xa07349),darkLeaf=material(0x426d2a),leaf=material(palette.leaf),lightLeaf=material(palette.leafLight);
  const lean=.4+random()*.8;
  const trunk=[[0,0,0],[.18,1.9,.08],[lean*.6,4,-.08],[lean,6.6,.1]];
  trunk.slice(1).forEach((p,i)=>beam(root,trunk[i],p,.33-i*.075,i===1?litBark:bark,.25-i*.065));
  for(let i=0;i<5;i++){
    const a=i*Math.PI*2/5;
    beam(root,[Math.cos(a)*.85,.025,Math.sin(a)*.7],[.07,.7,0],.11,bark,.25);
  }
  const crowns=[[lean,6.7,.1,2.5],[lean-1.6,4.7,.1,1.5],[lean+1.8,5.2,.4,1.65]];
  for(const [cx,cy,cz,r] of crowns){
    if(cy<6){beam(root,[lean*.5,2.7,0],[cx*.75,cy-.9,cz],.15,litBark,.1);beam(root,[cx*.75,cy-.9,cz],[cx,cy,cz],.1,bark,.065)}
    const canopy=new THREE.Group();canopy.position.set(cx,cy,cz);root.add(canopy);
    const bottom=add(canopy,new THREE.IcosahedronGeometry(r,0),darkLeaf,0,-.15,0);bottom.scale.set(1,.26,.8);
    const middle=add(canopy,new THREE.IcosahedronGeometry(r,1),leaf,0,.12,0);middle.scale.set(1,.31,.77);middle.rotation.y=random()*2;
    const top=add(canopy,new THREE.IcosahedronGeometry(r*.78,0),lightLeaf,-.12,.43,-.05);top.scale.set(1,.21,.83);
    for(const crown of [bottom,middle,top])crown.userData.forestStatic=false;
    animated.push({object:canopy,phase:random()*6,type:'canopy'});
  }
  if(parent.isScene)root.traverse(object=>{
    if(!object.isMesh)return;
    object.userData.forestStatic=false;object.userData.forestOccluder=true;object.material.transparent=true;
  });
  return root;
}

function fern(parent,x,y,z,scale,seed){
  const random=randomSource(seed),group=new THREE.Group();group.position.set(x,y,z);group.scale.setScalar(scale);group.rotation.y=random()*6;parent.add(group);
  const geometry=new THREE.BufferGeometry(),vertices=[];
  for(let i=0;i<7;i++){
    const a=i*Math.PI*2/7,length=.6+random()*.6,dx=Math.cos(a),dz=Math.sin(a);
    for(let j=1;j<5;j++){
      const t=j/5,px=dx*t*length,pz=dz*t*length,py=Math.sin(t*Math.PI*.8)*.65,width=(1-t)*.32;
      vertices.push(px,py,pz,px-dz*width-dx*.12,py-.1,pz+dx*width-dz*.12,px+dx*.18,py+.05,pz+dz*.18);
      vertices.push(px,py,pz,px+dx*.18,py+.05,pz+dz*.18,px+dz*width-dx*.12,py-.1,pz-dx*width-dz*.12);
    }
  }
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.computeVertexNormals();add(group,geometry,material(0x609630,{side:THREE.DoubleSide}));
}
function mushroom(parent,x,y,z,size,color=0xdd8256){
  const group=new THREE.Group();group.position.set(x,y,z);group.scale.setScalar(size);parent.add(group);
  add(group,new THREE.CylinderGeometry(.1,.15,.6,7),material(0xf1d8aa),0,.3,0);
  const cap=add(group,new THREE.SphereGeometry(.46,9,5,0,Math.PI*2,0,Math.PI/2),material(color),0,.58,0);cap.scale.y=.58;
  add(group,new THREE.CylinderGeometry(.45,.3,.04,9),material(0xf6dca6),0,.58,0);
  for(let i=0;i<5;i++){const a=i*2.4,r=.15+(i%2)*.1;const dot=add(group,new THREE.SphereGeometry(.055,5,4),material(0xffebc6),Math.cos(a)*r,.79-r*.27,Math.sin(a)*r);dot.scale.y=.25}
}
function crystal(parent,x,y,z,size,material){
  const shape=add(parent,new THREE.OctahedronGeometry(1,0),material,x,y,z);shape.scale.set(size*.35,size,size*.3);shape.rotation.z=.14;return shape;
}
function glowTexture(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(201,255,207,.9)');g.addColorStop(.2,'rgba(98,238,198,.35)');g.addColorStop(1,'rgba(87,210,194,0)');ctx.fillStyle=g;ctx.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(canvas);
}

function fenceRuns(boundaries){
  // Layout cells partition the floor for physics. Join collinear fragments for
  // evenly spaced fence posts, without ever joining across an open edge.
  const rows=new Map();
  for(const e of boundaries){
    if(e.open)continue;
    const vertical=e.ax===e.bx,key=vertical?`x:${e.ax}`:`z:${e.az}`;
    if(!rows.has(key))rows.set(key,[]);
    rows.get(key).push({lo:vertical?e.az:e.ax,hi:vertical?e.bz:e.bx,e,vertical});
  }
  const runs=[];
  for(const row of rows.values()){
    row.sort((a,b)=>a.lo-b.lo);let current;
    for(const segment of row){
      if(current&&Math.abs(current.hi-segment.lo)<.0001)current.hi=segment.hi;
      else {current={...segment};runs.push(current)}
    }
  }
  return runs.map(({lo,hi,e,vertical})=>vertical?{...e,az:lo,bz:hi}:{...e,ax:lo,bx:hi});
}

function undergrowth(scene,animated){
  const random=randomSource(236),positions=[];
  // No tufts on the putting surface or along an unguarded landing edge.
  for(let i=0;i<650;i++){
    const x=-19.5+random()*15.6,z=-4.3-random()*1.1;
    positions.push([x,z]);
  }
  for(let i=0;i<120;i++)positions.push([16.2+random()*7.2,-5.85-random()*.45]);
  for(let i=0;i<90;i++)positions.push([-19+random()*5.4,4.22+random()*.16]);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([-.06,0,0,.06,0,0,.035,.31,0,0,.46,.035,.035,.31,0,-.06,0,0,0,0,-.06,0,0,.06,.035,.27,.015,.035,.27,.015,0,0,-.06,.035,.41,0],3));
  geometry.computeVertexNormals();
  const grass=material(0xffffff,{side:THREE.DoubleSide});
  const tufts=new THREE.InstancedMesh(geometry,grass,positions.length),dummy=new THREE.Object3D();
  for(let i=0;i<positions.length;i++){
    dummy.position.set(positions[i][0],.04,positions[i][1]);dummy.rotation.y=random()*6.28;dummy.scale.setScalar(.5+random()*.7);dummy.updateMatrix();
    tufts.setMatrixAt(i,dummy.matrix);tufts.setColorAt(i,new THREE.Color().setHSL(.205+random()*.045,.55,.27+random()*.15));
  }
  tufts.receiveShadow=true;scene.add(tufts);
  const wingShape=new THREE.Shape();wingShape.moveTo(0,0);wingShape.bezierCurveTo(-.13,.24,-.31,.11,-.18,-.03);wingShape.bezierCurveTo(-.24,-.2,-.05,-.18,0,0);
  const wingGeometry=new THREE.ShapeGeometry(wingShape),wingMat=material(0xf9ca73,{side:THREE.DoubleSide});
  for(const [i,[x,z]] of [[-16,-4.7],[-8,-5],[22,-5.8]].entries()){
    const butterfly=new THREE.Group();butterfly.position.set(x,1.25,z);scene.add(butterfly);
    const left=add(butterfly,wingGeometry,wingMat),right=add(butterfly,wingGeometry,wingMat);right.scale.x=-1;
    left.userData.forestStatic=right.userData.forestStatic=false;
    animated.push({object:butterfly,phase:i*2,type:'butterfly',left,right,baseX:x,baseZ:z});
  }
}

function forestProps(scene,animated){
  undergrowth(scene,animated);
  const treeSites=[[-18.6,-5.7,.84,31],[-12.6,-6.3,1.3,7],[-6.5,-5.35,.77,11],[24,-4.8,.97,42]];
  for(const [x,z,s,seed] of treeSites)tree(scene,x,.04,z,s,seed,animated);
  const random=randomSource(89),stones=material(palette.rock);
  for(const [x,z] of [[-19,-5],[-16.6,-6.5],[-8.5,-5.5],[-4.4,-4.85],[24.5,-3.1],[22.8,-6.3],[16.8,-5.95]]){
    const boulder=add(scene,new THREE.DodecahedronGeometry(.45+random()*.4,0),stones,x,.29,z);boulder.scale.set(1,.72,.9);boulder.rotation.y=random()*3;
    fern(scene,x+.45,.04,z-.45,.7+random()*.4,Math.floor(random()*1000)+1);
    mushroom(scene,x-.4,.04,z-.2,.5+random()*.45);
  }
  for(let i=0;i<30;i++){
    const x=-19+random()*14.5,z=-4.45-random()*1.0;
    if(i%3===0)fern(scene,x,.045,z,.45+random()*.5,i+19);
    else mushroom(scene,x,.04,z,.25+random()*.4,i%2?0xcfa45b:0xc87559);
  }
  // Roots curl down the cliffs, not onto the playable surface.
  const rootMat=material(palette.bark);
  for(const [x,z,dir] of [[-18,4.5,1],[-11,4.5,1],[-5,4.65,1],[22.8,-6,-1]]){
    tube(scene,[[x,-.12,z],[x+.25,-1.3,z+dir*.45],[x-.5,-2.9,z+dir*.22],[x+.35,-4.3,z-dir*.5]],.095,rootMat);
    tube(scene,[[x+.3,-1.1,z+dir*.4],[x+1,-1.8,z+dir*.25],[x+1.1,-2.6,z]],.045,rootMat);
  }
  // A small crystal grotto is the forest's landmark, tucked into the tee cliff.
  const cave=new THREE.Group();cave.position.set(-16.7,-2.25,4.92);scene.add(cave);
  const dark=add(cave,new THREE.CircleGeometry(1,9),material(0x283e36),0,0,.03);dark.scale.set(1.5,1,1);
  const rim=add(cave,new THREE.TorusGeometry(1.08,.23,4,9),material(0x845940));rim.scale.set(1.43,1,1);
  const gemMat=material(0x67e9bf,{roughness:.2,emissive:0x40ddaf,emissiveIntensity:1.6});
  crystal(cave,-.18,-.08,.35,.87,gemMat);crystal(cave,.54,-.42,.21,.45,gemMat);crystal(cave,-.72,-.5,.25,.31,gemMat);
  const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),transparent:true,depthWrite:false,opacity:.5}));glow.position.set(0,0,.5);glow.scale.set(4.5,3.3,1);cave.add(glow);
  const light=new THREE.PointLight(0x64f0bc,5,7,2);light.position.set(-16.7,-1.7,5.5);scene.add(light);
  animated.push({object:glow,phase:1,type:'glow'});
  // Carved owl on a stump, watching the first shot from behind the fence.
  const owl=new THREE.Group();owl.position.set(-18.5,.02,-4.9);owl.rotation.y=-.7;scene.add(owl);
  add(owl,new THREE.CylinderGeometry(.32,.42,.62,9),material(palette.bark),0,.31,0);
  const body=add(owl,new THREE.IcosahedronGeometry(.4,1),material(0xc49557),0,.98,0);body.scale.set(.9,1.18,.8);
  const face=material(0xf6dfac),eye=material(0x263b29);
  for(const side of [-1,1]){
    const disk=add(owl,new THREE.SphereGeometry(.17,10,8),face,side*.14,1.1,.25);disk.scale.z=.3;
    const pupil=add(owl,new THREE.SphereGeometry(.065,8,6),eye,side*.14,1.1,.304);pupil.scale.z=.45;
    const ear=add(owl,new THREE.ConeGeometry(.1,.25,4),material(palette.bark),side*.23,1.39,0);ear.rotation.z=side*-.35;
  }
  const beak=add(owl,new THREE.ConeGeometry(.08,.18,4),material(0xdca345),0,.98,.32);beak.rotation.x=Math.PI/2;

  // A ranger's lantern and hanging seed pods give the grove a lived-in scale.
  const cord=material(0xc6ab74),lanternWood=material(0x745537),lanternLight=material(0xffdda0,{emissive:0xffc566,emissiveIntensity:.8});
  for(const [x,z,h] of [[-15.7,-4.75,1.4],[22.4,-5.8,1.25]]){
    beam(scene,[x,0,z],[x,2.35,z],.065,lanternWood,.05);
    beam(scene,[x,2.35,z],[x+.65,2.35,z],.05,lanternWood);
    beam(scene,[x+.6,2.35,z],[x+.6,h+.48,z],.016,cord);
    add(scene,new THREE.CylinderGeometry(.17,.22,.45,6),lanternLight,x+.6,h+.21,z);
    add(scene,new THREE.ConeGeometry(.29,.18,6),lanternWood,x+.6,h+.5,z);
    add(scene,new THREE.CylinderGeometry(.23,.2,.09,6),lanternWood,x+.6,h-.04,z);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;beam(scene,[x+.6+Math.cos(a)*.2,h,z+Math.sin(a)*.2],[x+.6+Math.cos(a)*.16,h+.43,z+Math.sin(a)*.16],.018,lanternWood)}
  }
}

export function createForestEnvironment(scene,dress=forestProps){
  const animated=[],random=randomSource(814);
  scene.background=new THREE.Color(FOREST_THEME.horizon);scene.fog=new THREE.Fog(0xf2bad7,50,130);
  scene.add(new THREE.HemisphereLight(0xfff4ef,0x617054,1.2));
  const sun=new THREE.DirectionalLight(0xfff0d7,2.3);sun.position.set(-20,30,-12);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
  Object.assign(sun.shadow.camera,{left:-38,right:38,top:30,bottom:-30,near:.5,far:90});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun);
  const fill=new THREE.DirectionalLight(0xefb1ce,.6);fill.position.set(10,10,24);scene.add(fill);
  const sky=add(scene,new THREE.SphereGeometry(170,32,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,
    uniforms:{top:{value:new THREE.Color(FOREST_THEME.sky)},bottom:{value:new THREE.Color(FOREST_THEME.horizon)}},
    vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`uniform vec3 top;uniform vec3 bottom;varying vec3 vPosition;void main(){float h=normalize(vPosition).y;gl_FragColor=vec4(mix(bottom,top,smoothstep(-.3,.65,h)),1.);
    #include <colorspace_fragment>
    }`,
  }));sky.castShadow=false;sky.frustumCulled=false;sky.userData.forestStatic=false;
  const cloudMat=new THREE.MeshLambertMaterial({color:0xfff9f5,emissive:0xc5a7b8,emissiveIntensity:.28});
  for(let i=0;i<14;i++){
    const a=i*Math.PI*2/14,r=57+random()*32,y=-12+random()*4;
    const parts=[];
    for(let j=0;j<5;j++)parts.push(new THREE.SphereGeometry(2.3+random()*2.4,20,12).scale(1.3,.7+random()*.3,1).translate((j-2)*2.4,Math.sin(j)*.7,random()*2));
    const cloud=add(scene,mergeGeometries(parts),cloudMat,Math.cos(a)*r,y,Math.sin(a)*r);parts.forEach(p=>p.dispose());cloud.rotation.y=a;cloud.castShadow=false;cloud.receiveShadow=false;cloud.userData.forestStatic=false;
    animated.push({object:cloud,phase:i,type:'cloud',baseX:cloud.position.x});
  }
  for(const [x,z,r,seed] of [[-30,-17,5.4,31],[0,-25,7,63],[35,-20,6.2,72],[-30,18,4.3,29],[33,20,5.6,19],[4,29,4.2,52]]){
    const outline=Array.from({length:11},(_,i)=>{const a=i*Math.PI*2/11,s=r*(.88+random()*.24);return[x+Math.cos(a)*s,z+Math.sin(a)*s]});
    const islandGroup=new THREE.Group();islandGroup.position.y=-2.5;scene.add(islandGroup);island(islandGroup,outline,r*.9,seed);
    for(let i=0;i<3;i++)tree(islandGroup,x+(i-1)*2.8,.04,z+(i%2)*2,.7+random()*.5,seed+i*3,animated);
  }
  dress(scene,animated);
  const dustPositions=[];
  for(let i=0;i<90;i++)dustPositions.push(-23+random()*48,.7+random()*8,-9+random()*19);
  const dustGeometry=new THREE.BufferGeometry();dustGeometry.setAttribute('position',new THREE.Float32BufferAttribute(dustPositions,3));
  const pollen=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xffe9a8,map:glowTexture(),size:.09,transparent:true,opacity:.65,depthWrite:false}));scene.add(pollen);
  const crowns=[];scene.traverse(o=>{if(o.userData.forestOccluder)crowns.push(o)});
  const canopyMaterials=[...new Set(crowns.map(c=>c.material))],sightRay=new THREE.Raycaster(),sightDirection=new THREE.Vector3();
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {theme:FOREST_THEME,
    updateView(camera,ball,dt,overview){
      const hidden=new Set();
      if(!overview){
        scene.updateMatrixWorld();
        sightDirection.copy(ball).sub(camera.position);
        sightRay.set(camera.position,sightDirection.clone().normalize());sightRay.far=sightDirection.length()-.6;
        for(const hit of sightRay.intersectObjects(crowns,false))hidden.add(hit.object.material);
      }
      for(const mat of canopyMaterials){
        mat.opacity+=( (hidden.has(mat)?.15:1)-mat.opacity)*(1-Math.exp(-dt*10));
        mat.depthWrite=mat.opacity>.98;
      }
    },
    update(time){
    if(reducedMotion)return;
    pollen.position.y=Math.sin(time*.2)*.3;pollen.rotation.y=Math.sin(time*.08)*.008;
    for(const entry of animated){
      const {object,phase,type}=entry;
      if(type==='water')object.material.uniforms.time.value=time;
      if(type==='wheel')object.rotation.z=phase+time*.24;
      if(type==='canopy')object.rotation.z=Math.sin(time*.6+phase)*.022;
      if(type==='cloud')object.position.x=entry.baseX+Math.sin(time*.025+phase)*1.3;
      if(type==='glow')object.material.opacity=.43+Math.sin(time*1.2)*.07;
      if(type==='butterfly'){
        object.position.set(entry.baseX+Math.sin(time*.7+phase)*.65,1.3+Math.sin(time*1.4+phase)*.3,entry.baseZ+Math.cos(time*.6+phase)*.3);
        object.rotation.y=Math.sin(time*.7+phase)*.8;entry.left.rotation.y=Math.sin(time*15+phase)*.7;entry.right.rotation.y=-entry.left.rotation.y;
      }
    }
  }};
}

function groundTexture(wood){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),random=randomSource(wood?73:17);
  ctx.fillStyle=wood?'#ead1a3':'#ffffff';ctx.fillRect(0,0,256,256);
  if(wood){
    ctx.fillStyle='#a07852';ctx.fillRect(0,0,5,256);ctx.fillStyle='#f1d8a7';ctx.fillRect(6,0,3,256);
    for(let i=0;i<85;i++){
      const x=8+random()*242,y=random()*256;ctx.strokeStyle=`rgba(110,75,35,${.04+random()*.13})`;
      ctx.lineWidth=.5+random();ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x-4,y+12,x+3,y+25,x+1,y+55);ctx.stroke();
    }
    for(const y of [14,242]){ctx.fillStyle='#795e44';ctx.beginPath();ctx.arc(16,y,2,0,Math.PI*2);ctx.fill()}
  }else{
    for(let i=0;i<900;i++){
      const x=random()*256,y=random()*256;ctx.strokeStyle=i%2?'rgba(53,100,17,.12)':'rgba(234,255,199,.28)';ctx.lineWidth=.6;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+random()*3-1.5,y-2-random()*5);ctx.stroke();
    }
  }
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;return texture;
}

export function createForestSurface(scene,cells,heightAt){
  const positions=[],colors=[],uvs=[],groups=[];
  const grassMat=material(0xffffff,{vertexColors:true,map:groundTexture(false)}),woodMat=material(0xcaa574,{vertexColors:true,map:groundTexture(true)});
  const stoneMat=material(0xffffff,{vertexColors:true,map:groundTexture(false),roughness:.62});
  for(const cell of [...cells].sort((a,b)=>Number(b.surface==='grass')-Number(a.surface==='grass'))){
    const grass=cell.surface==='grass',stone=cell.surface==='stone',start=positions.length/3;
    const cuts=(lo,hi)=>[lo,...Array.from({length:Math.max(0,Math.ceil(hi/1.3)-Math.floor(lo/1.3)-1)},(_,i)=>(Math.floor(lo/1.3)+i+1)*1.3),hi];
    const xs=cuts(cell.x1,cell.x2),zs=cuts(cell.z1,cell.z2);
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
      const x1=xs[i],x2=xs[i+1],z1=zs[j],z2=zs[j+1];
      const check=(Math.floor((x1+x2)/2/1.3)+Math.floor((z1+z2)/2/1.3))%2;
      const color=new THREE.Color(grass?(check?0x6aab28:0x7ab632):stone?cell.color:0xffffff);
      if(stone)color.multiplyScalar(check?1:.95);
      for(const [x,z] of [[x1,z1],[x1,z2],[x2,z1],[x1,z2],[x2,z2],[x2,z1]]){
        positions.push(x,heightAt(x,z)+.04,z);colors.push(color.r,color.g,color.b);uvs.push(x/(grass?2:.62),z/(grass?2:3.6));
      }
    }
    const count=positions.length/3-start,materialIndex=grass?0:stone?2:1;
    if(groups.at(-1)?.materialIndex===materialIndex)groups.at(-1).count+=count;
    else groups.push({start,count,materialIndex});
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));groups.forEach(g=>geometry.addGroup(g.start,g.count,g.materialIndex));geometry.computeVertexNormals();
  const floor=add(scene,geometry,[grassMat,woodMat,stoneMat]);floor.castShadow=false;floor.userData.forestStatic=false;
  return floor;
}

export function createForestCourse(scene,cells,boundaries,heightAt){
  const floor=createForestSurface(scene,cells,heightAt);
  island(scene,teeOutline,6.8,37);island(scene,greenOutline,5.5,63);
  const wood=material(palette.wood),bark=material(palette.bark),cut=material(palette.cut),rope=material(0xcbad75);
  for(const cell of cells.filter(c=>c.surface!=='grass')){
    const plank=add(scene,new THREE.BoxGeometry(cell.x2-cell.x1,.25,cell.z2-cell.z1),bark,(cell.x1+cell.x2)/2,-.12,(cell.z1+cell.z2)/2);
    plank.receiveShadow=true;
  }
  // Every wooden curb follows the same boundary as the ball collider. Open edges
  // get no curb or fence; the risk markings remain on the unobstructed deck.
  const posts=new Set();
  for(const e of fenceRuns(boundaries)){
    if(e.open)continue;
    const length=Math.hypot(e.bx-e.ax,e.bz-e.az),center=[(e.ax+e.bx)/2,.2,(e.az+e.bz)/2];
    const curb=add(scene,new THREE.BoxGeometry(length+.02,.32,.18),wood,...center);curb.rotation.y=-Math.atan2(e.bz-e.az,e.bx-e.ax);
    // Low boards on the landing keep the airborne route visually clear.
    const landing=e.ax>=9.5&&e.ax<=19.5&&e.az>=-1.86&&e.bz<=1.86;
    if(landing||(e.ax===-3&&e.bx===-3))continue;
    beam(scene,[e.ax,.69,e.az],[e.bx,.69,e.bz],.055,wood);
    const count=Math.ceil(length/2.2);
    for(let i=0;i<=count;i++){
      const x=e.ax+(e.bx-e.ax)*i/count,z=e.az+(e.bz-e.az)*i/count,key=`${x.toFixed(3)},${z.toFixed(3)}`;
      if(posts.has(key))continue;posts.add(key);
      const post=add(scene,new THREE.BoxGeometry(.17,.95,.17),wood,x,.42,z);post.rotation.z=Math.sin(x*3+z)*.025;
      add(scene,new THREE.BoxGeometry(.21,.07,.21),cut,x,.9,z);
    }
  }
  for(const z of [5.2,8.6]){
    const cable=tube(scene,[[-9,-.5,z],[1,-1.65,z],[10,-1.6,z],[17,-.5,z]],.08,rope);
    for(let i=1;i<12;i++){
      const p=cable.geometry.parameters.path.getPoint(i/12);beam(scene,[p.x,-.1,z],[p.x,p.y,z],.035,rope);
    }
  }
  for(const x of [-11,-6,0,6,12,18])beam(scene,[x,-.31,5.15],[x,-.31,8.65],.13,bark);
  batchForestMeshes(scene);
  return floor;
}

function batchForestMeshes(scene){
  // Hundreds of small timber and plant details share a few draw calls. Animated
  // crowns, butterflies, clouds and every gameplay object remain independent.
  scene.updateMatrixWorld(true);
  const batches=new Map();
  scene.traverse(object=>{
    if(!object.isMesh||!object.userData.forestStatic)return;
    const m=object.material;
    const key=[m.type,m.color.getHex(),m.emissive.getHex(),m.emissiveIntensity,m.roughness,m.metalness,m.side,m.flatShading,m.vertexColors,object.castShadow,object.receiveShadow].join(':');
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(object);
  });
  for(const objects of batches.values()){
    if(objects.length<2)continue;
    const geometries=objects.map(object=>{
      const source=object.geometry;
      const geometry=source.index?source.toNonIndexed():source.clone();
      geometry.applyMatrix4(object.matrixWorld);
      if(!object.material.map)geometry.deleteAttribute('uv');
      return geometry;
    });
    const geometry=mergeGeometries(geometries);
    if(!geometry){geometries.forEach(g=>g.dispose());continue}
    const combined=new THREE.Mesh(geometry,objects[0].material);
    combined.castShadow=objects[0].castShadow;combined.receiveShadow=objects[0].receiveShadow;scene.add(combined);
    for(const object of objects)object.removeFromParent();
    for(const original of new Set(objects.map(object=>object.geometry)))original.dispose();
    geometries.forEach(g=>g.dispose());
  }
}

export const forestKit={material,randomSource,add,beam,tube,island,tree,fern,mushroom,crystal,glowTexture,fenceRuns,batchForestMeshes};
