import * as THREE from 'three';
import { modelInstance } from './models.js';
import { loopPath, compact, tintShared, createCrowd, createPuffs, softTexture, canvasTexture, foldMaterials } from './life-kit.js';
export { loopPath };

// Urverkets stad as a room. The course stands on stilts in a watchmaker's
// workshop, and a miniature clockwork town has been built on the floor around
// it: rows of townhouses with smoking chimneys and warm windows, a clock tower,
// a square with a fountain and a carousel, a wind-up toy train circling the
// course, wind-up townsfolk out walking and pigeons. The room itself is lived
// in too: wallpaper and wainscoting, a window with curtains and sunbeams,
// shelves, pictures, pendant lamps, a rug, a sleeping cat, a pile of books with
// a steaming cup of tea, a houseplant and a clockwork mouse along the skirting.
// Nothing here touches the ball; it all stands on the floor, well below the felt.
const FLOOR=-7.06;

// Teal wallpaper with pale stripes and little brass gears.
export function wallpaper(repeatX,repeatY){
  return canvasTexture(128,128,(ctx,w,h)=>{
    ctx.fillStyle='#35504c';ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#3e5c57';ctx.fillRect(0,0,22,h);ctx.fillRect(64,0,22,h);
    ctx.strokeStyle='#c9a35e';ctx.lineWidth=1.2;
    for(const [x,y] of [[43,32],[107,96]]){
      ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*7,y+Math.sin(a)*7);ctx.lineTo(x+Math.cos(a)*10,y+Math.sin(a)*10);ctx.stroke()}
    }
    ctx.fillStyle='#b8925a';for(const [x,y] of [[43,96],[107,32]]){ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill()}
  },[repeatX,repeatY]);
}

export function createClockTown(scene,level,kit,obstacles){
  if(!level?.tiles||!modelInstance('clockwork/townhouse-0'))return {update(){}};
  const {mat:newMat,add,box,rod,ring,group,bake,brass,gold,iron,wood,woodLight}=kit;
  // Plain materials are shared by colour so the baked statics merge well.
  const mats=new Map(),mat=(color,o={})=>{if(o.map)return newMat(color,o);const key=color+JSON.stringify(o);if(!mats.has(key))mats.set(key,newMat(color,o));return mats.get(key)};
  let seed=level.id*977+13;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};
  const xs=level.tiles.flatMap(t=>[t.x1,t.x2]),zs=level.tiles.flatMap(t=>[t.z1,t.z2]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  const near=(x,z,pad)=>level.tiles.some(t=>x>t.x1-pad&&x<t.x2+pad&&z>t.z1-pad&&z<t.z2+pad);
  const placed=[];
  // Free if nothing on the floor or hanging lower than `top` overlaps the footprint.
  const free=(x,z,r,top)=>Math.abs(x)<41&&z>-29.5&&z<34&&!near(x,z,r+1)
    &&!obstacles.some(o=>Math.abs(o.x-x)<o.rx+r&&Math.abs(o.z-z)<o.rz+r&&o.bottom<top+.3)
    &&!placed.some(p=>Math.hypot(p.x-x,p.z-z)<p.r+r);
  const claim=(x,z,r)=>placed.push({x,z,r});
  const statics=group(scene),soft=softTexture(),reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const place=(parent,name,x,z,rot=0,scale=1,y=FLOOR)=>{const o=modelInstance(name);if(!o)return null;o.position.set(x,y,z);o.rotation.y=rot;o.scale.setScalar(scale);parent.add(o);return o};
  const smoke=createPuffs(scene,{count:420,color:0xe8e2d8,size:1.1,opacity:.42,life:5.5,texture:soft});
  const steam=createPuffs(scene,{count:60,color:0xffffff,size:.7,opacity:.35,life:3,texture:soft});
  const spray=createPuffs(scene,{count:160,color:0xcfeefa,size:.22,opacity:.75,life:.9,gravity:7,grow:.4,texture:soft});
  const chimneys=[],walkers=[],pigeons=[],spinners=[],keys=[];

  // --- The room: wallpaper on the new left wall, wainscoting, skirting, a window. ---
  const paper=mat(0xffffff,{map:wallpaper(15,6.5),roughness:.85});
  box(statics,1,39,92,-45,11,0,paper);
  const panel=mat(0x4a3229,{roughness:.7}),skirting=mat(0x2e211c,{roughness:.6});
  box(statics,90,5.5,.4,0,-4.3,-30.3,panel);box(statics,.4,5.5,90,-44.3,-4.3,0,panel);box(statics,.4,5.5,90,44.1,-4.3,0,panel);
  box(statics,90,.35,.7,0,-1.4,-30.05,woodLight);
  box(statics,.7,.35,90,-44.05,-1.4,0,woodLight);box(statics,.7,.35,90,43.85,-1.4,0,woodLight);
  box(statics,90,.9,.6,0,-6.6,-30.0,skirting);box(statics,.6,.9,90,-44,-6.6,0,skirting);box(statics,.6,.9,90,43.8,-6.6,0,skirting);
  for(let x=-40;x<44;x+=6)box(statics,4.6,3.6,.2,x+2,-4.3,-30.05,mat(0x553a2f,{roughness:.7}));
  // A tall window in the left wall: glowing panes, glazing bars, curtains and sunbeams.
  const sky=new THREE.MeshBasicMaterial({color:0xfbe6b8});
  const pane=add(statics,new THREE.PlaneGeometry(13,15),sky,-44.4,9,-6);pane.rotation.y=Math.PI/2;pane.castShadow=false;
  for(const z of [-12.5,-6,.5])box(statics,.5,15.6,.5,-44.2,9,z,woodLight);
  for(const y of [1.5,9,16.5])box(statics,.5,.5,13.6,-44.2,y,-6,woodLight);
  box(statics,1.6,.5,15,-43.6,1.2,-6,woodLight);
  const velvet=mat(0x8a2f36,{roughness:.9});
  for(const side of [-1,1])for(let k=0;k<5;k++){
    const fold=add(statics,new THREE.CylinderGeometry(.55,.55,19,10),velvet,-43.4,7.8,-6+side*(7.4+k*.8));fold.scale.x=.7;
  }
  rod(statics,[-43.2,17.6,-16],[-43.2,17.6,4],.2,brass);
  const beamTexture=canvasTexture(4,64,(ctx,w,h)=>{const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'rgba(255,236,190,.0)');g.addColorStop(.15,'rgba(255,236,190,.55)');g.addColorStop(1,'rgba(255,236,190,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)});
  const beams=[];
  for(let k=0;k<4;k++){
    const m=new THREE.MeshBasicMaterial({map:beamTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.28,side:THREE.DoubleSide});
    const b=new THREE.Mesh(new THREE.PlaneGeometry(3.2,34),m);b.position.set(-30,2,-11+k*3.4);b.rotation.set(0,Math.PI/2,-.95);scene.add(b);beams.push({m,phase:k*1.7});
  }
  // A plank door in the right wall.
  box(statics,.6,13,7,44,-.6,-18,mat(0x6a4433,{roughness:.7}));
  for(const z of [-20.4,-18,-15.6])box(statics,.7,12.6,.2,43.7,-.6,z,wood);
  box(statics,.9,.6,8,43.9,6.1,-18,woodLight);add(statics,new THREE.SphereGeometry(.35,10,8),brass,43.3,-1,-15.4);
  // Shelves on the back wall with jars, spools and books.
  for(const [x1,x2,y] of [[-40,-16,13],[14,40,15]]){
    box(statics,x2-x1,.4,2.6,(x1+x2)/2,y,-30,woodLight);
    for(const x of [x1+1,x2-1])box(statics,.4,1.8,2.2,x,y-1,-30.4,wood);
    let x=x1+2;
    while(x<x2-2){
      const kind=Math.floor(random()*3),w=1.4+random()*1.2;
      if(kind===0){const jar=add(statics,new THREE.CylinderGeometry(.7,.7,2.2,14),mat([0x9fc7b8,0xc7b89f,0xb8a0c0][Math.floor(random()*3)],{roughness:.2,transparent:true,opacity:.75}),x,y+1.3,-30);add(statics,new THREE.CylinderGeometry(.75,.75,.3,14),brass,x,y+2.5,-30)}
      if(kind===1){add(statics,new THREE.CylinderGeometry(.6,.6,1.6,14),mat([0xc9483c,0x3f6f9a,0xe0b84a][Math.floor(random()*3)]),x,y+1,-30);for(const d of [-.85,.85])add(statics,new THREE.CylinderGeometry(.85,.85,.15,14),woodLight,x,y+1+d,-30)}
      if(kind===2)for(let k=0;k<4;k++)box(statics,.35,2.4+random()*.6,1.9,x-.6+k*.4,y+1.4,-30,mat([0xb0473c,0x356966,0x6b4a8a,0xc49a58][k]));
      x+=w+.8;
    }
  }
  // Framed pictures on the left wall: a painted sky over hills.
  const painting=(w,h,hue)=>canvasTexture(128,96,(ctx)=>{
    const g=ctx.createLinearGradient(0,0,0,96);g.addColorStop(0,hue);g.addColorStop(1,'#f6e2b8');ctx.fillStyle=g;ctx.fillRect(0,0,128,96);
    ctx.fillStyle='#6f8f5a';ctx.beginPath();ctx.moveTo(0,70);ctx.quadraticCurveTo(40,46,80,66);ctx.quadraticCurveTo(110,54,128,62);ctx.lineTo(128,96);ctx.lineTo(0,96);ctx.fill();
    ctx.fillStyle='#4f6f45';ctx.beginPath();ctx.moveTo(0,84);ctx.quadraticCurveTo(60,64,128,86);ctx.lineTo(128,96);ctx.lineTo(0,96);ctx.fill();
  });
  for(const [z,y,w,h,hue] of [[12,8,8,6,'#8fb8d8'],[24,10,5,7,'#d89f8f']]){
    box(statics,.4,h+.8,w+.8,-44.2,y,z,gold);
    const p=add(statics,new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:painting(w,h,hue),roughness:.9}),-43.95,y,z);p.rotation.y=Math.PI/2;p.castShadow=false;
  }

  // --- The rug under the town. ---
  const rugX=(maxX-minX)/2+12,rugZ=(maxZ-minZ)/2+11;
  const rugTexture=canvasTexture(512,512,(ctx)=>{
    ctx.translate(256,256);
    for(const [r,c] of [[256,'#2f4442'],[246,'#a88a5a'],[240,'#2f4442'],[214,'#5a3a32'],[150,'#4e3530'],[146,'#a88a5a'],[140,'#4e3530'],[70,'#2f4442'],[64,'#a88a5a'],[58,'#2f4442']]){ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill()}
    ctx.fillStyle='#8a6e4a';for(let i=0;i<48;i++){const a=i*Math.PI/24;ctx.beginPath();ctx.arc(Math.cos(a)*228,Math.sin(a)*228,3,0,Math.PI*2);ctx.fill()}
    for(let i=0;i<16;i++){const a=i*Math.PI/8;ctx.save();ctx.rotate(a);ctx.fillStyle='#6a4a3a';ctx.beginPath();ctx.moveTo(160,0);ctx.lineTo(182,-10);ctx.lineTo(204,0);ctx.lineTo(182,10);ctx.fill();ctx.restore()}
    ctx.strokeStyle='#7a5e40';ctx.lineWidth=2;for(let i=0;i<24;i++){const a=i*Math.PI/12;ctx.beginPath();ctx.moveTo(Math.cos(a)*75,Math.sin(a)*75);ctx.lineTo(Math.cos(a)*138,Math.sin(a)*138);ctx.stroke()}
  });
  rugTexture.wrapS=rugTexture.wrapT=THREE.ClampToEdgeWrapping;
  const rug=add(scene,new THREE.CircleGeometry(1,64),new THREE.MeshStandardMaterial({map:rugTexture,roughness:1}),cx,FLOOR+.03,cz);
  rug.rotation.x=-Math.PI/2;rug.scale.set(rugX,rugZ,1);rug.castShadow=false;

  // --- The toy railway round the course. ---
  const track=loopPath(minX-7,maxX+7,minZ-7,maxZ+7,5),railPoints=[[],[]];
  for(let s=0;s<track.length;s+=.5){
    const p=track.at(s);
    for(const [k,o] of [[0,-.5],[1,.5]])railPoints[k].push(new THREE.Vector3(p.x+p.dz*o,FLOOR+.2,p.z-p.dx*o));
    if(Math.round(s*2)%2===0){const sleeper=box(statics,1.5,.12,.32,p.x,FLOOR+.08,p.z,wood);sleeper.rotation.y=Math.atan2(p.dx,p.dz)+Math.PI/2}
  }
  for(const pts of railPoints)add(statics,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts,true),pts.length,.07,5,true),iron);
  const train=[];
  for(const [name,gap] of [['clockwork/locomotive',0],['clockwork/wagon-0',2.9],['clockwork/wagon-0',5.3],['clockwork/wagon-1',7.7]]){
    const o=compact(place(scene,name,0,0),['key']);if(!o)continue;train.push({object:o,gap});
    o.traverse(n=>{if(n.name==='key')keys.push({object:n,axis:'y',speed:2})});
  }

  // --- Giant household things first, so the houses fill in round them: the cat, books and tea, a houseplant. ---
  const catSite=[[maxX+10,maxZ+16],[minX-10,maxZ+16],[cx+17,maxZ+20]].find(([x,z])=>free(x,z,4,-3))||[maxX+10,maxZ+16];
  const cat=place(scene,'clockwork/cat',catSite[0],catSite[1],-.5,1.5);claim(catSite[0],catSite[1],5.6);
  let catBody=null,catTail=null;cat?.traverse(n=>{if(n.name==='body')catBody=n;if(n.name==='tail')catTail=n});compact(catBody);compact(catTail);
  const cushion=add(statics,new THREE.CylinderGeometry(5.2,5.5,.6,32),mat(0x8a3f55,{roughness:.95}),catSite[0],FLOOR+.25,catSite[1]);
  if(cat)cat.position.y=FLOOR+.6;
  const zTexture=canvasTexture(64,64,(ctx)=>{ctx.fillStyle='#fff6e0';ctx.font='bold 52px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('z',32,34)});
  const zees=[0,1,2].map(i=>{const s=new THREE.Sprite(new THREE.SpriteMaterial({map:zTexture,transparent:true,depthWrite:false}));scene.add(s);return {sprite:s,phase:i/3}});
  const bookSite=[[minX-9,maxZ+14],[minX-12,maxZ+8],[cx-17,maxZ+19]].find(([x,z])=>free(x,z,2.6,-4));
  let teaAt=null;
  if(bookSite){
    place(statics,'clockwork/books',bookSite[0],bookSite[1],.3);claim(bookSite[0],bookSite[1],2.8);
    place(statics,'clockwork/teacup',bookSite[0]+.2,bookSite[1]-.1,1.2,1,FLOOR+1.52);
    teaAt=new THREE.Vector3(bookSite[0]+.2,FLOOR+1.52+1.4,bookSite[1]-.1);
  }
  const plantSite=[[38,-26],[-38,-26],[38,26]].find(([x,z])=>free(x,z,2,0));
  if(plantSite){place(statics,'clockwork/houseplant',...plantSite,random()*6);claim(...plantSite,2)}
  // --- Townhouses round the course, a clock tower and the square in front. ---
  const square={x:cx,z:maxZ+12.5};
  const fountain=place(statics,'clockwork/fountain',square.x-5,square.z);claim(square.x-5,square.z,2.2);
  const carousel=place(scene,'clockwork/carousel',square.x+5.5,square.z);claim(square.x+5.5,square.z,2.8);
  carousel?.traverse(n=>{if(n.name.startsWith('horse-'))compact(n)});carousel?.traverse(n=>{if(n.name==='spin')compact(n,['horse-0','horse-1','horse-2','horse-3'])});compact(carousel,['spin']);carousel?.traverse(n=>{if(n.name==='spin')spinners.push({object:n,speed:.45});if(n.name.startsWith('horse-'))spinners.push({object:n,bob:true,phase:+n.name.slice(6)*1.6})});
  for(const s of [-1,1])place(statics,'clockwork/townsfolk',square.x+s*1.2,square.z-3.4,s*-.6);
  // Lanterns round the square.
  for(const [dx,dz] of [[-9,-2.5],[9,-2.5],[-9,3.5],[9,3.5],[0,4]])kit.lantern(statics,square.x+dx,FLOOR,square.z+dz);
  const towerSites=[[minX-12,minZ-4],[maxX+12,minZ-4],[minX-12,cz],[maxX+12,cz],[cx-14,maxZ+16]];
  const towerAt=towerSites.find(([x,z])=>free(x,z,2.6,9.5));
  let towerHands=null;
  if(towerAt){
    const [x,z]=towerAt,face=Math.atan2(cx-x,cz-z);
    place(statics,'clockwork/clock-tower',x,z,face);claim(x,z,2.8);
    const hands=group(scene,x,FLOOR,z);hands.rotation.y=face;
    const hub=group(hands,0,9.6,1.7),hour=group(hub),minute=group(hub);
    box(hour,.12,.55,.06,0,.25,0,iron);box(minute,.08,.85,.06,0,.4,.04,iron);
    towerHands={hour,minute};
  }
  // Two rows of houses: one along the pavement, a second behind it.
  const windowMats=[];
  for(const [margin,start] of [[11.5,0],[16.3,2]]){
  const houses=loopPath(minX-margin,maxX+margin,minZ-margin,maxZ+margin,margin-4.5);
  for(let s=start;s<houses.length;s+=4.1+random()*.6){
    const p=houses.at(s),outX=p.dz,outZ=-p.dx;
    // The front row faces the camera; the others face the course.
    const front=p.z>maxZ+margin-3.5&&Math.abs(p.x-cx)<maxX-cx+4;
    if(front&&Math.abs(p.x-square.x)<(margin>12?15:12))continue;
    const face=front?0:Math.atan2(-outX,-outZ);
    const variants=[0,1,2].sort(()=>random()-.5),tops=[.84,-.56,1.54];
    // The inner row is a little smaller so its roofs stay below the felt.
    const scale=margin<12?.85:1,v=variants.find(k=>free(p.x,p.z,2.1,FLOOR+(tops[k]-FLOOR)*scale));if(v===undefined)continue;
    const house=place(statics,`clockwork/townhouse-${v}`,p.x,p.z,face,scale);claim(p.x,p.z,2.1);
    const palette=[[0xe9d3ad,0x3f6f6a],[0xd8b7a0,0x8a3f35],[0xc8d4c0,0x4a5a7a],[0xf0dcb8,0x6b4a3a],[0xb8c8c8,0x3f6f6a],[0xe6c39a,0x355a4f]][Math.floor(random()*6)];
    tintShared(house,{Wall:palette[0],Roof:palette[1]});
    const k=Math.floor(random()*3);
    house.traverse(o=>{if(o.isMesh&&o.material.name==='Window'){windowMats[k]??=o.material.clone();o.material=windowMats[k]}});
    const chimney=[[.9,7.6,-.6],[-1,6.5,.6],[-.6,8.6,-.5]][v];
    house.updateMatrixWorld(true);chimneys.push({at:new THREE.Vector3(...chimney).applyMatrix4(house.matrixWorld),phase:random()*4,rate:.9+random()*.6});
  }
  }
  const flicker=windowMats.map((m,i)=>({m,phase:i*2.1}));

  // --- Wind-up townsfolk strolling the pavement between the railway and the houses. ---
  const walk=loopPath(minX-9.2,maxX+9.2,minZ-9.2,maxZ+9.2,6);
  const coats=[0x356966,0xc9483c,0x6b4a8a,0xe0b84a,0x3f6f9a,0x8a5a3a,0x5f8a5a],hats=[0x2a2a2a,0x6b2f2f,0x2f3f5a,0xc49a58];
  const people=createCrowd(scene,'clockwork/townsfolk',16,{Coat:coats,Hat:[0,3,6,9,12,15,18].map(i=>hats[i%hats.length])});
  if(people)for(let k=0;k<16;k++){
    const o=new THREE.Object3D();o.scale.setScalar(.85+random()*.3);
    walkers.push({i:k,object:o,s:k/16*walk.length+random()*3,speed:(k%2?1:-1)*(.7+random()*.5),phase:random()*10});
  }
  // Pigeons pecking round the fountain.
  const flock=createCrowd(scene,'clockwork/pigeon',9);
  if(flock)for(let k=0;k<9;k++){
    const a=random()*Math.PI*2,r=2.6+random()*2.5,o=new THREE.Object3D();
    o.position.set(square.x-5+Math.cos(a)*r,FLOOR,square.z+Math.sin(a)*r);o.rotation.y=random()*6;
    pigeons.push({i:k,object:o,phase:random()*20,hop:null});
  }

  // Pose everyone once, so a still scene (reduced motion) has them in place too.
  for(const w of walkers){const p=walk.at(w.s),dir=Math.sign(w.speed);w.object.position.set(p.x+p.dz*.6*dir,FLOOR,p.z-p.dx*.6*dir);w.object.rotation.y=Math.atan2(p.dx*dir,p.dz*dir);people.set(w.i,w.object)}
  for(const b of pigeons)flock.set(b.i,b.object);
  people?.commit();flock?.commit();

  // Pendant lamps over the town, a mouse along the skirting board.
  const lamps=[];
  for(const [x,z] of [[cx-14,minZ-10],[cx+14,minZ-10]]){
    const lamp=place(scene,'clockwork/pendant',x,z,0,1,13);
    if(lamp){lamp.traverse(o=>{o.castShadow=false});lamps.push(lamp)}
  }
  const mouse=compact(place(scene,'clockwork/mouse',0,-29.3),['key']);let mouseKey=null;mouse?.traverse(n=>{if(n.name==='key')mouseKey=n});

  // --- The airship circling behind the course. ---
  const zeppelin=compact(place(scene,'clockwork/zeppelin',cx,cz,0,1,13),['prop']);let prop=null;
  zeppelin?.traverse(n=>{n.castShadow=false;if(n.name==='prop')prop=n});

  foldMaterials(statics);
  bake(statics);
  // Nothing in the baked town moves: skip its matrix updates every frame.
  statics.traverse(o=>{o.updateMatrix();o.matrixAutoUpdate=false});
  const v=new THREE.Vector3();
  let last=null;
  return {update(time){
    if(reducedMotion)return;
    const dt=last===null?1/60:Math.min(.1,Math.max(0,time-last));last=time;
    // Train.
    for(const car of train){
      const p=track.at(time*3.2-car.gap);car.object.position.set(p.x,FLOOR+.25,p.z);car.object.rotation.y=Math.atan2(-p.dz,p.dx);
      if(car.gap===0&&Math.random()<dt*9){v.set(.95,2.05,0).applyMatrix4(car.object.matrixWorld);smoke.emit(v.x,v.y,v.z,(Math.random()-.5)*.3,1.3,(Math.random()-.5)*.3)}
    }
    for(const k of keys)k.object.rotation[k.axis]=time*k.speed;
    // Chimneys and tea.
    for(const c of chimneys)if(Math.random()<dt*c.rate)smoke.emit(c.at.x+(Math.random()-.5)*.2,c.at.y,c.at.z,.25+Math.random()*.15,.7+Math.random()*.3,.05);
    if(teaAt&&Math.random()<dt*6)steam.emit(teaAt.x+(Math.random()-.5)*.8,teaAt.y,teaAt.z+(Math.random()-.5)*.8,(Math.random()-.5)*.1,.55,(Math.random()-.5)*.1);
    if(fountain)for(let k=0;k<3;k++){const a=Math.random()*Math.PI*2;spray.emit(square.x-5,FLOOR+2.55,square.z,Math.cos(a)*.9,2.6+Math.random()*.5,Math.sin(a)*.9)}
    smoke.update(dt);steam.update(dt);spray.update(dt);
    for(const f of flicker)f.m.emissiveIntensity=2.2+Math.sin(time*2.3+f.phase)*.25+Math.sin(time*7.1+f.phase*3)*.12;
    // Carousel.
    for(const s of spinners){if(s.bob)s.object.position.y=1.55+Math.sin(time*2.4+s.phase)*.22;else s.object.rotation.y=time*s.speed}
    // Walkers stroll, pause to look about, and waddle as they go.
    for(const w of walkers){
      const cycle=(time+w.phase)%14,moving=cycle<10;
      if(moving)w.s+=w.speed*dt;
      const p=walk.at(w.s),dir=Math.sign(w.speed);
      w.object.position.set(p.x+p.dz*.6*dir,FLOOR+(moving?Math.abs(Math.sin(time*7+w.phase))*.08:0),p.z-p.dx*.6*dir);
      w.object.rotation.y=moving?Math.atan2(p.dx*dir,p.dz*dir):Math.atan2(p.dx*dir,p.dz*dir)+Math.sin((cycle-10)*1.2)*1.1;
      w.object.rotation.z=moving?Math.sin(time*7+w.phase)*.07:0;
      people.set(w.i,w.object,time*(moving?3:.6));
    }
    people?.commit();
    // Pigeons peck, and now and then hop to a new spot.
    for(const b of pigeons){
      if(!b.hop&&Math.random()<dt*.12){const a=Math.random()*Math.PI*2,r=2.6+Math.random()*2.5;b.hop={from:b.object.position.clone(),to:new THREE.Vector3(square.x-5+Math.cos(a)*r,FLOOR,square.z+Math.sin(a)*r),t:0}}
      if(b.hop){
        b.hop.t+=dt/.7;const t=Math.min(1,b.hop.t);
        b.object.position.lerpVectors(b.hop.from,b.hop.to,t);b.object.position.y=FLOOR+Math.sin(t*Math.PI)*1.1;
        b.object.rotation.y=Math.atan2(b.hop.to.x-b.hop.from.x,b.hop.to.z-b.hop.from.z);if(t>=1)b.hop=null;
      }else b.object.rotation.x=Math.max(0,Math.sin(time*5+b.phase))*.5;
      flock.set(b.i,b.object);
    }
    flock?.commit();
    // The cat breathes, flicks its tail and snores little z's.
    if(catBody)catBody.scale.set(1,1+Math.sin(time*1.3)*.025,1+Math.sin(time*1.3)*.04);
    if(catTail)catTail.rotation.y=Math.sin(time*.8)*.08+Math.max(0,Math.sin(time*.37))**8*.25;
    if(cat)for(const z of zees){
      const t=(time*.22+z.phase)%1;v.set(1.3,1.8,-1.2).applyMatrix4(cat.matrixWorld);
      z.sprite.position.set(v.x+t*1.6+Math.sin(t*6)*.4,v.y+t*4,v.z);z.sprite.scale.setScalar(.7+t*1.2);z.sprite.material.opacity=Math.sin(t*Math.PI)*.9;
    }
    // The clockwork mouse scurries along the skirting board, stopping to sniff.
    if(mouse){
      const t=(time*.045)%2,leg=t<1?t:2-t,eased=leg<.1?0:leg>.9?1:(leg-.1)/.8;
      mouse.position.x=-36+eased*72;mouse.rotation.y=t<1?Math.PI/2:-Math.PI/2;
      mouse.position.y=FLOOR+(eased>0&&eased<1?Math.abs(Math.sin(time*18))*.05:0);
      if(mouseKey)mouseKey.rotation.z=time*(eased>0&&eased<1?6:.5);
    }
    if(towerHands){towerHands.minute.rotation.z=-time*.105;towerHands.hour.rotation.z=-time*.105/12-1}
    if(zeppelin){
      const a=time*.035;zeppelin.position.set(cx+Math.cos(a)*24,15+Math.sin(time*.4)*.4,cz-16+Math.sin(a)*7);
      zeppelin.rotation.y=Math.atan2(-Math.cos(a)*7,-Math.sin(a)*24);zeppelin.rotation.z=Math.sin(time*.5)*.03;
      if(prop)prop.rotation.x=time*9;
    }
    for(const l of lamps)l.rotation.z=Math.sin(time*.6+l.position.x)*.012;
    for(const b of beams)b.m.opacity=.22+Math.sin(time*.3+b.phase)*.06;
  }};
}
