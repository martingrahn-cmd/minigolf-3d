import * as THREE from 'three';
import { modelInstance } from './models.js';

// The village of Molnskogen: a ring of small floating islands round the course,
// each lived in. Cottages with smoking chimneys and warm windows, gardens,
// picket fences, washing lines, a well or a windmill, lanterns and rope bridges
// between the islands, and a hot-air balloon drifting by. Islands keep clear of
// the course and of the camera's side of the tee, and sit a little lower than
// the felt so they frame the course instead of hiding it.
export function createForestVillage(scene,level,kit,animated){
  if(!level?.tiles||!modelInstance('forest/cottage'))return {update(){}};
  const {island,tree,material,add,beam,glowTexture,randomSource}=kit;
  const random=randomSource(level.id*131+7);
  const xs=level.tiles.flatMap(t=>[t.x1,t.x2]),zs=level.tiles.flatMap(t=>[t.z1,t.z2]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,rx=(maxX-minX)/2,rz=(maxZ-minZ)/2;
  const teeAngle=Math.atan2(level.start.z-cz,level.start.x-cx);
  const near=(x,z,pad)=>level.tiles.some(t=>x>t.x1-pad&&x<t.x2+pad&&z>t.z1-pad&&z<t.z2+pad);

  // Choose island sites on a ring outside the course, away from the tee side.
  const sites=[];
  for(let k=0;k<20&&sites.length<8;k++){
    const a=teeAngle+.8+k*(Math.PI*2-1.6)/19+(random()-.5)*.12;
    const d=1.05+random()*.2,x=cx+Math.cos(a)*(rx*d+7.5),z=cz+Math.sin(a)*(rz*d+7.5);
    if(near(x,z,7))continue;
    if(sites.some(s=>Math.hypot(s.x-x,s.z-z)<13))continue;
    sites.push({x,z,y:-1.6-random()*2.4,r:5.2+random()*1.6,face:Math.atan2(cx-x,cz-z)});
  }

  const timber=material(0x76503a),picket=material(0xf6ead2),rope=material(0xc6ab74),hedge=material(0x4f8a2c);
  const smokeTexture=glowTexture(),smoke=[],chimneys=[],sails=[],washing=[],lights=[];
  const kinds=['home','farm','pond','home','market','apiary','home','farm'];
  const place=(g,name,x,z,rot=0,scale=1)=>{const o=modelInstance(name);if(!o)return null;o.position.set(x,0,z);o.rotation.y=rot;o.scale.setScalar(scale);g.add(o);return o};
  const walkers=[],swimmers=[],bees=[],falls=[];
  sites.forEach((s,i)=>{
    // The island itself, from the same generator as the course islands.
    const outline=[];for(let j=0;j<12;j++){const a=j/12*Math.PI*2,r=s.r*(.85+random()*.3);outline.push([s.x+Math.cos(a)*r,s.z+Math.sin(a)*r])}
    island(scene,outline,4.2,40+i*9,s.y);
    const g=new THREE.Group();g.position.set(s.x,s.y,s.z);g.rotation.y=s.face;scene.add(g);
    const kind=kinds[i%kinds.length];
    if(kind==='home')home(g,i);
    if(kind==='farm')farm(g,i,s);
    if(kind==='pond')pond(g,i,s);
    if(kind==='market')market(g,i);
    if(kind==='apiary')apiary(g,i,s);
  });
  function home(g,i){
    // A cottage facing the course, its windows glowing.
    const cottage=modelInstance('forest/cottage');cottage.position.set(0,0,-.6);g.add(cottage);
    cottage.traverse(o=>{if(o.isMesh&&o.material.name==='Window'){o.material=o.material.clone();lights.push({mat:o.material,phase:random()*6})}});
    g.updateMatrixWorld(true);chimneys.push(new THREE.Vector3(.75,4.15,-.8).applyMatrix4(g.matrixWorld));
    // A well or a windmill on alternate islands.
    if(i%2===0){const well=modelInstance('forest/well');if(well){well.position.set(2.6,0,1.2);g.add(well)}}
    else{
      const mill=modelInstance('forest/windmill');
      if(mill){mill.position.set(-2.6,0,-1.4);mill.scale.setScalar(.8);mill.rotation.y=.4;g.add(mill);mill.traverse(o=>{if(o.name==='sails')sails.push({object:o,speed:.5+random()*.4})})}
    }
    // Garden beds with flowers and a little hedge.
    const blooms=[0xff8fb8,0xffe066,0xffffff,0xc9a0ff,0xff9f5a];
    for(let row=0;row<2;row++){
      const bed=add(g,new THREE.BoxGeometry(2.2,.25,.7),material(0x6b4a33),-1.6+row*0,.12,2.0+row*.9);bed.position.x=1.0;
      for(let k=0;k<7;k++){
        const flower=add(g,new THREE.IcosahedronGeometry(.11,0),material(blooms[(k+row+i)%blooms.length]),.1+k*.3,.36,2.0+row*.9+(random()-.5)*.2);
        add(g,new THREE.CylinderGeometry(.015,.015,.2,4),hedge,flower.position.x,.24,flower.position.z);
      }
    }
    const shrub=add(g,new THREE.IcosahedronGeometry(.6,1),hedge,-1.9,.4,1.5);shrub.scale.set(1.3,.75,1);
    // A picket fence along the front edge.
    for(let k=0;k<9;k++){
      const x=-2.4+k*.6;
      add(g,new THREE.BoxGeometry(.09,.7,.05),picket,x,.35,3.3);
      const tip=add(g,new THREE.ConeGeometry(.07,.12,4),picket,x,.76,3.3);tip.rotation.y=Math.PI/4;
    }
    beam(g,[-2.5,.5,3.32],[2.4,.5,3.32],.03,picket);beam(g,[-2.5,.25,3.32],[2.4,.25,3.32],.03,picket);
    // A tree with a washing line strung from it to the cottage.
    const t=tree(g,-2.8,0,1.8,.55,80+i*13,animated);
    const lineA=new THREE.Vector3(-2.6,1.9,1.6),lineB=new THREE.Vector3(-1.1,1.9,.4);
    beam(g,lineA.toArray(),lineB.toArray(),.012,rope);
    for(let k=0;k<3;k++){
      const p=lineA.clone().lerp(lineB,(k+1)/4);
      const cloth=new THREE.Mesh(new THREE.PlaneGeometry(.38,.5),new THREE.MeshStandardMaterial({color:[0xff8fb8,0x8fd3ff,0xffe066][k],side:THREE.DoubleSide,roughness:.8}));
      cloth.geometry.translate(0,-.25,0);cloth.position.copy(p);cloth.rotation.y=Math.atan2(lineB.x-lineA.x,lineB.z-lineA.z)+Math.PI/2;g.add(cloth);
      washing.push({object:cloth,phase:random()*6});
    }
    // A lantern by the path with a warm glow.
    beam(g,[1.9,0,3.0],[1.9,1.5,3.0],.05,timber);
    const lamp=add(g,new THREE.CylinderGeometry(.13,.16,.3,6),material(0xffdda0,{emissive:0xffc566,emissiveIntensity:1}),1.9,1.62,3.0);
    lights.push({mat:lamp.material,phase:random()*6,base:1});
    // Chimney smoke: soft puffs that rise, swell and fade.
    for(let k=0;k<7;k++){
      const puff=new THREE.Sprite(new THREE.SpriteMaterial({map:smokeTexture,color:0xffffff,transparent:true,depthWrite:false,opacity:0}));
      scene.add(puff);smoke.push({puff,chimney:chimneys.length-1,age:k/7*5});
    }
  }
  // Bunting: little triangular flags on a sagging line between two points.
  function bunting(g,a,b,sag=.5){
    const colors=[0xff8fb8,0xffe066,0x8fd3ff,0xc9a0ff,0xff9f5a],from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),count=Math.max(4,Math.round(from.distanceTo(to)/.35));
    const points=[];for(let k=0;k<=12;k++){const t=k/12,p=from.clone().lerp(to,t);p.y-=Math.sin(t*Math.PI)*sag;points.push(p)}
    const curve=new THREE.CatmullRomCurve3(points);add(g,new THREE.TubeGeometry(curve,16,.012,4,false),rope);
    for(let k=1;k<count;k++){
      const p=curve.getPoint(k/count),flag=new THREE.Shape();flag.moveTo(-.11,0);flag.lineTo(.11,0);flag.lineTo(0,-.24);flag.closePath();
      const mesh=add(g,new THREE.ShapeGeometry(flag),material(colors[k%colors.length],{side:THREE.DoubleSide}),p.x,p.y,p.z);
      mesh.rotation.y=Math.atan2(to.x-from.x,to.z-from.z)+Math.PI/2;
    }
  }
  // Animals wander between random points on their island, pausing to graze or peck.
  function walker(g,name,count,radius,speed,kind,scale=1){
    for(let k=0;k<count;k++){
      const o=place(g,name,(random()-.5)*radius,(random()-.5)*radius,random()*6,scale);if(!o)continue;
      walkers.push({o,radius,speed,kind,target:new THREE.Vector3(),wait:random()*3,phase:random()*6});
    }
  }
  function farm(g,i,s){
    place(g,'forest/haybale',-2.2,-1.6,.4);place(g,'forest/haybale',-1.1,-2.3,1.2);
    place(g,'forest/woodpile',2.2,-2.0,-.3);
    for(let r=0;r<3;r++)for(let c=0;c<4;c++)place(g,(r+c)%2?'forest/cabbage':'forest/pumpkin',.4+c*.65,.9+r*.6,random()*6,.8+random()*.4);
    // A low wattle fence round the pen.
    for(let k=0;k<12;k++){const a=k/12*Math.PI*2;add(g,new THREE.CylinderGeometry(.05,.05,.6,5),timber,-1.6+Math.cos(a)*1.6,.3,1.2+Math.sin(a)*1.3)}
    walker(g,'forest/sheep',3,3.2,.35,'sheep');walker(g,'forest/chicken',4,3.6,.6,'chicken');
    const t=tree(g,2.6,0,1.6,.5,120+i*7,animated);
    place(g,'forest/signpost',-.2,3.2,.3);
  }
  function pond(g,i,s){
    const water=new THREE.MeshStandardMaterial({color:0x6fc3d0,roughness:.08,metalness:.1,emissive:0x16404a,emissiveIntensity:.3});
    const surface=new THREE.Mesh(new THREE.CircleGeometry(1.9,32),water);surface.rotation.x=-Math.PI/2;surface.position.set(.4,.04,.3);g.add(surface);
    for(let k=0;k<16;k++){const a=k/16*Math.PI*2;const stone=add(g,new THREE.DodecahedronGeometry(.22+random()*.1,0),material(0xb9a58c),.4+Math.cos(a)*2.0,.08,.3+Math.sin(a)*2.0);stone.scale.y=.6}
    for(let k=0;k<10;k++){const a=random()*Math.PI*2;add(g,new THREE.CylinderGeometry(.02,.02,.7+random()*.4,4),hedge,.4+Math.cos(a)*1.75,.38,.3+Math.sin(a)*1.75)}
    for(let k=0;k<3;k++){const d=place(g,'forest/duck',.4,.3,0,1.3);if(d)swimmers.push({o:d,cx:.4,cz:.3,r:.7+k*.35,speed:(k%2?1:-1)*(.25+random()*.2),phase:random()*6})}
    place(g,'forest/bench',-1.5,-2.2,.3);place(g,'forest/bench',2.4,-1.6,-.5);
    const t=tree(g,-2.6,0,1.2,.5,140+i*5,animated);
    // A little waterfall spills off the island's far edge into the clouds.
    falls.push(waterfall(g,s));
  }
  function market(g,i){
    place(g,'forest/stall',-1.3,-.6,.25);place(g,'forest/stall',1.6,-.9,-.35);
    place(g,'forest/bench',0,2.2,Math.PI);place(g,'forest/signpost',2.6,2.0,-.6);
    bunting(g,[-2.4,2.6,-1.4],[2.6,2.6,-1.6],.4);bunting(g,[-2.4,2.6,-1.4],[-1.8,2.4,2.4],.35);
    for(const [x,z] of [[-2.6,1.6],[2.8,.6]]){beam(g,[x,0,z],[x,1.5,z],.05,timber);const lamp=add(g,new THREE.CylinderGeometry(.13,.16,.3,6),material(0xffdda0,{emissive:0xffc566,emissiveIntensity:1}),x,1.62,z);lights.push({mat:lamp.material,phase:random()*6,base:1})}
    walker(g,'forest/chicken',2,3,.5,'chicken');
  }
  function apiary(g,i,s){
    for(let k=0;k<4;k++){const h=place(g,'forest/beehive',-1.8+k*1.1,-1.2+(k%2)*.5,random()*6);if(h)bees.push({x:-1.8+k*1.1,z:-1.2+(k%2)*.5,g})}
    const blooms=[0xff8fb8,0xffe066,0xffffff,0xc9a0ff,0xff9f5a];
    for(let k=0;k<70;k++){const x=(random()-.5)*6,z=.6+random()*2.6;const f=add(g,new THREE.IcosahedronGeometry(.09,0),material(blooms[k%blooms.length]),x,.3,z);add(g,new THREE.CylinderGeometry(.012,.012,.28,4),hedge,x,.14,z)}
    place(g,'forest/bench',2.4,-2.2,-.4);
    const t=tree(g,2.8,0,.2,.55,160+i*3,animated);
  }
  function waterfall(g,s){
    const c=document.createElement('canvas');c.width=32;c.height=128;const x=c.getContext('2d');
    for(let k=0;k<40;k++){x.fillStyle=`rgba(255,255,255,${.25+Math.random()*.5})`;x.fillRect(Math.random()*32,Math.random()*128,2+Math.random()*3,8+Math.random()*30)}
    const texture=new THREE.CanvasTexture(c);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1,2);
    const mat=new THREE.MeshBasicMaterial({color:0x9fe3ef,map:texture,transparent:true,opacity:.85,side:THREE.DoubleSide,depthWrite:false});
    const sheet=new THREE.Mesh(new THREE.PlaneGeometry(1.1,7),mat);sheet.position.set(.4,-3.4,-s.r+.2);g.add(sheet);
    const lip=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.6),mat);lip.rotation.x=-Math.PI/2;lip.position.set(.4,.05,-s.r+1.0);g.add(lip);
    return {texture};
  }
  // Rope bridges between neighbouring islands.
  for(let i=0;i<sites.length-1;i++){
    const a=sites[i],b=sites[i+1],dist=Math.hypot(b.x-a.x,b.z-a.z);
    if(dist>24)continue;
    const steps=Math.floor(dist/.45),ux=(b.x-a.x)/dist,uz=(b.z-a.z)/dist;
    for(let k=1;k<steps;k++){
      const t=k/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t,y=a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*1.2;
      const plank=add(scene,new THREE.BoxGeometry(.35,.06,1.1),timber,x,y,z);plank.rotation.y=Math.atan2(ux,uz)+Math.PI/2;
    }
    for(const side of [-1,1]){
      const points=[];for(let k=0;k<=12;k++){const t=k/12;points.push(new THREE.Vector3(a.x+(b.x-a.x)*t-uz*side*.55,a.y+(b.y-a.y)*t-Math.sin(t*Math.PI)*1.2+.7,a.z+(b.z-a.z)*t+ux*side*.55))}
      add(scene,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.025,4,false),rope);
    }
  }
  // A patchwork hot-air balloon drifting slowly round the sky.
  const balloon=modelInstance('forest/balloon');
  if(balloon){balloon.scale.setScalar(1.2);scene.add(balloon)}
  const orbit={rx:rx+26,rz:rz+22};

  return {update(time,dt=1/60){
    for(const s of smoke){
      s.age+=dt;if(s.age>5)s.age-=5;
      const c=chimneys[s.chimney],t=s.age/5;
      s.puff.position.set(c.x+t*1.2+Math.sin(time*.8+s.chimney)*.2*t,c.y+t*3.2,c.z+t*.4);
      s.puff.scale.setScalar(.35+t*1.4);s.puff.material.opacity=Math.min(1,t*6)*(1-t)*.55;
    }
    for(const s of sails)s.object.rotation.z=time*s.speed;
    for(const w of walkers){
      const o=w.o;
      if(w.wait>0){
        w.wait-=dt;
        const peck=w.kind==='chicken'?Math.max(0,Math.sin(time*7+w.phase))**6*.5:Math.max(0,Math.sin(time*1.5+w.phase))*.12;
        o.rotation.z=-peck;
        if(w.wait<=0){w.target.set((random()-.5)*w.radius,0,(random()-.5)*w.radius)}
      }else{
        const dx=w.target.x-o.position.x,dz=w.target.z-o.position.z,d=Math.hypot(dx,dz);
        if(d<.08){w.wait=1.5+random()*4}else{
          const step=Math.min(d,w.speed*dt);o.position.x+=dx/d*step;o.position.z+=dz/d*step;
          o.rotation.y=Math.atan2(-dz,dx);o.rotation.z=0;o.position.y=Math.abs(Math.sin(time*(w.kind==='chicken'?14:8)+w.phase))*.05;
        }
      }
    }
    for(const s of swimmers){const a=time*s.speed+s.phase;s.o.position.set(s.cx+Math.cos(a)*s.r,.04+Math.sin(time*2+s.phase)*.01,s.cz+Math.sin(a)*s.r);s.o.rotation.y=-a+(s.speed>0?-Math.PI/2:Math.PI/2)}
    for(const f of falls)f.texture.offset.y=time*1.6;
    bees.forEach((b,k)=>{
      if(!b.points){
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(8*3),3));
        b.points=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xffd23a,size:.09}));b.g.add(b.points);
      }
      const pos=b.points.geometry.attributes.position;
      for(let j=0;j<8;j++){const a=time*(2+j*.3)+j*.8+k;pos.setXYZ(j,b.x+Math.cos(a)*(.4+j*.06),1.0+Math.sin(time*3+j)*.25,b.z+Math.sin(a*1.3)*(.4+j*.06))}
      pos.needsUpdate=true;
    });
    for(const w of washing)w.object.rotation.x=Math.sin(time*2.2+w.phase)*.25+.1;
    for(const l of lights)l.mat.emissiveIntensity=(l.base??2.2)*(.85+Math.sin(time*7+l.phase)*.05+Math.sin(time*2.3+l.phase)*.07);
    if(balloon){
      const a=time*.015+1.2;
      balloon.position.set(cx+Math.cos(a)*orbit.rx,15+Math.sin(time*.3)*.8,cz+Math.sin(a)*orbit.rz);
      balloon.rotation.y=Math.sin(time*.1)*.3;
    }
  }};
}
