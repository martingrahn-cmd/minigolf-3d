import * as THREE from 'three';

// Life for Molnskogen: a flock overhead, a bird that hops about on the felt and
// flies off when the ball comes close, drifting leaves and petals that settle and
// fade, grass that sways along the fences and soft shafts of sunlight. Purely
// decorative: nothing here touches the ball.
const leafColors=[0x8fc23c,0xc6d84a,0xf2a4c4,0xf6c6da,0xe8b04a];

function bounds(level){
  const xs=level.tiles.flatMap(t=>[t.x1,t.x2]),zs=level.tiles.flatMap(t=>[t.z1,t.z2]);
  return {minX:Math.min(...xs),maxX:Math.max(...xs),minZ:Math.min(...zs),maxZ:Math.max(...zs)};
}
const onTiles=(level,x,z,pad=0)=>level.tiles.some(t=>x>=t.x1-pad&&x<=t.x2+pad&&z>=t.z1-pad&&z<=t.z2+pad);
function nearOpenEdge(level,x,z){
  return (level.openEdges||[]).some(e=>e.x===undefined
    ?Math.abs(z-e.z)<.6&&x>=e.x1-.3&&x<=e.x2+.3
    :Math.abs(x-e.x)<.6&&z>=e.z1-.3&&z<=e.z2+.3);
}

function birdMesh(color){
  const bird=new THREE.Group(),body=new THREE.MeshStandardMaterial({color,roughness:.8,flatShading:true});
  const belly=new THREE.MeshStandardMaterial({color:0xfbe7c6,roughness:.8,flatShading:true});
  const torso=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,0),body);torso.scale.set(1.5,.85,.85);bird.add(torso);
  const chest=new THREE.Mesh(new THREE.IcosahedronGeometry(.11,0),belly);chest.position.set(.08,-.04,0);bird.add(chest);
  const head=new THREE.Mesh(new THREE.IcosahedronGeometry(.1,0),body);head.position.set(.2,.08,0);bird.add(head);
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.03,.09,4),new THREE.MeshStandardMaterial({color:0xf0a43a}));beak.rotation.z=-Math.PI/2;beak.position.set(.31,.07,0);bird.add(beak);
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.07,.18,3),body);tail.rotation.z=Math.PI/2;tail.position.set(-.27,.02,0);bird.add(tail);
  const wingShape=new THREE.Shape();wingShape.moveTo(0,0);wingShape.lineTo(-.1,.34);wingShape.lineTo(-.22,.3);wingShape.lineTo(-.18,0);wingShape.closePath();
  const wingGeometry=new THREE.ShapeGeometry(wingShape);wingGeometry.rotateX(-Math.PI/2);
  const wings=[1,-1].map(side=>{
    const pivot=new THREE.Group();pivot.position.set(.04,.05,0);bird.add(pivot);
    const wing=new THREE.Mesh(wingGeometry,new THREE.MeshStandardMaterial({color,roughness:.8,side:THREE.DoubleSide,flatShading:true}));
    wing.scale.z=side;pivot.add(wing);return pivot;
  });
  bird.traverse(o=>{if(o.isMesh)o.castShadow=true});
  return {bird,wings};
}

function leafTexture(){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  g.fillStyle='#fff';g.beginPath();g.moveTo(32,2);g.bezierCurveTo(60,20,52,50,32,62);g.bezierCurveTo(12,50,4,20,32,2);g.fill();
  g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=2;g.beginPath();g.moveTo(32,6);g.lineTo(32,60);g.stroke();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
function shaftTexture(){
  const c=document.createElement('canvas');c.width=64;c.height=256;const g=c.getContext('2d');
  const v=g.createLinearGradient(0,0,0,256);v.addColorStop(0,'rgba(255,246,214,0)');v.addColorStop(.25,'rgba(255,246,214,.75)');v.addColorStop(1,'rgba(255,246,214,0)');
  g.fillStyle=v;g.fillRect(0,0,64,256);
  const h=g.createLinearGradient(0,0,64,0);h.addColorStop(0,'rgba(0,0,0,1)');h.addColorStop(.5,'rgba(0,0,0,0)');h.addColorStop(1,'rgba(0,0,0,1)');
  g.globalCompositeOperation='destination-out';g.fillStyle=h;g.fillRect(0,0,64,256);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

export function createForestLife(scene,level,{seed=91}={}){
  if(!level?.tiles)return {update(){}};
  let s=seed;const random=()=>{s=s*16807%2147483647;return(s-1)/2147483646};
  const b=bounds(level),cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2,rx=(b.maxX-b.minX)/2+4,rz=(b.maxZ-b.minZ)/2+4;
  const wind={value:0};

  // A flock that circles high over the course.
  const flock=[];
  for(let i=0;i<7;i++){
    const {bird,wings}=birdMesh([0x5b7fb8,0x8a5a3c,0x6a8f3a][i%3]);scene.add(bird);
    flock.push({bird,wings,phase:i*.9+random(),radius:.75+random()*.3,height:7+random()*3,speed:.12+random()*.04,flap:9+random()*4});
  }

  // A bird hopping on the felt; it takes off when the ball comes near.
  const hoppers=[birdMesh(0xc0603a),birdMesh(0x4f78b0)];hoppers.forEach(h=>scene.add(h.bird));
  const spots=[];
  for(let i=0;i<60&&spots.length<8;i++){
    const x=b.minX+random()*(b.maxX-b.minX),z=b.minZ+random()*(b.maxZ-b.minZ);
    if(onTiles(level,x,z,-1)&&Math.hypot(x-level.cup.x,z-level.cup.z)>3&&Math.hypot(x-level.start.x,z-level.start.z)>4)spots.push(new THREE.Vector3(x,0,z));
  }
  const ground=level.heightProfile?x=>{let y=0;for(let i=0;i<level.heightProfile.length-1;i++){const a=level.heightProfile[i],c=level.heightProfile[i+1];if(x>=a.x&&x<=c.x)y=a.y+(c.y-a.y)*(x-a.x)/(c.x-a.x)}return y}:()=>0;
  const hops=hoppers.map((hopper,i)=>{
    const spot=spots[i*3%Math.max(1,spots.length)]??new THREE.Vector3(cx,0,cz);
    hopper.bird.position.set(spot.x,ground(spot.x),spot.z);
    return {hopper,spot,target:null,state:'ground',timer:2+i*3,flight:0,from:new THREE.Vector3(),to:new THREE.Vector3(),hopTimer:i*.4};
  });

  // Falling leaves and petals that settle on the felt and fade.
  const LEAVES=220,leafGeometry=new THREE.PlaneGeometry(.32,.32);
  const leafMaterial=new THREE.MeshStandardMaterial({map:leafTexture(),alphaTest:.4,side:THREE.DoubleSide,roughness:.8,transparent:true});
  const leaves=new THREE.InstancedMesh(leafGeometry,leafMaterial,LEAVES);leaves.castShadow=false;leaves.frustumCulled=false;scene.add(leaves);
  const leafState=[],dummy=new THREE.Object3D(),color=new THREE.Color();
  const spawn=(l,initial=false)=>{
    l.x=cx+(random()*2-1)*rx;l.z=cz+(random()*2-1)*rz;l.y=initial?random()*12:9+random()*5;
    l.vy=-.35-random()*.35;l.spin=random()*6;l.spinRate=1+random()*2.5;l.sway=random()*6;l.settled=0;l.scale=.7+random()*.7;
  };
  for(let i=0;i<LEAVES;i++){const l={};spawn(l,true);leafState.push(l);leaves.setColorAt(i,color.setHex(leafColors[i%leafColors.length]))}

  // Grass tufts along the guarded edges of every tile, swaying in the wind.
  const tuftPositions=[];
  for(const t of level.tiles){
    const edges=[[t.x1,t.z1,t.x2,t.z1],[t.x1,t.z2,t.x2,t.z2],[t.x1,t.z1,t.x1,t.z2],[t.x2,t.z1,t.x2,t.z2]];
    for(const [ax,az,bx,bz] of edges){
      const len=Math.hypot(bx-ax,bz-az),nx=az===bz?0:(ax===t.x1?-1:1),nz=az===bz?(az===t.z1?-1:1):0;
      for(let d=.2;d<len;d+=.32){
        const x=ax+(bx-ax)*d/len+nx*(.45+random()*.35),z=az+(bz-az)*d/len+nz*(.45+random()*.35);
        if(onTiles(level,x,z,.2)||nearOpenEdge(level,x-nx*.6,z-nz*.6))continue;
        tuftPositions.push([x,z]);
      }
    }
  }
  const blade=new THREE.BufferGeometry();
  blade.setAttribute('position',new THREE.Float32BufferAttribute([-.05,0,0,.05,0,0,.01,.42,0, 0,0,-.05,0,0,.05,0,.36,.01, -.04,0,-.03,.04,0,.03,-.02,.3,.02],3));
  blade.computeVertexNormals();
  const grassMaterial=new THREE.MeshStandardMaterial({color:0xffffff,side:THREE.DoubleSide,roughness:.9});
  grassMaterial.onBeforeCompile=shader=>{
    shader.uniforms.windTime=wind;
    shader.vertexShader='uniform float windTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 rootWorld=instanceMatrix*vec4(0.,0.,0.,1.);
      float sway=sin(windTime*1.7+rootWorld.x*.45+rootWorld.z*.3)*.12+sin(windTime*3.1+rootWorld.x)*.04;
      transformed.x+=sway*position.y*2.;transformed.z+=sway*.5*position.y*2.;`);
  };
  const tufts=new THREE.InstancedMesh(blade,grassMaterial,Math.max(1,tuftPositions.length));
  tuftPositions.forEach(([x,z],i)=>{
    dummy.position.set(x,ground(x)+.02,z);dummy.rotation.set(0,random()*6.28,0);dummy.scale.setScalar(.8+random()*.9);dummy.updateMatrix();
    tufts.setMatrixAt(i,dummy.matrix);tufts.setColorAt(i,color.setHSL(.21+random()*.05,.55,.3+random()*.15));
  });
  tufts.receiveShadow=true;scene.add(tufts);
  // Wild flowers among the grass: a thin stem and a bright head, swaying alike.
  const flowerSpots=tuftPositions.filter((_,i)=>i%3===0);
  const stem=new THREE.CylinderGeometry(.012,.016,.5,4);stem.translate(0,.25,0);
  const head=new THREE.IcosahedronGeometry(.075,0);head.translate(0,.52,0);
  const stems=new THREE.InstancedMesh(stem,grassMaterial,Math.max(1,flowerSpots.length));
  const headMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.6,emissive:0x221018});headMaterial.onBeforeCompile=grassMaterial.onBeforeCompile;
  const heads=new THREE.InstancedMesh(head,headMaterial,Math.max(1,flowerSpots.length));
  const petals=[0xff9fc8,0xffe066,0xffffff,0xc9a0ff,0xff8a5c];
  flowerSpots.forEach(([x,z],i)=>{
    dummy.position.set(x+.12,ground(x)+.02,z+.08);dummy.rotation.set(0,random()*6.28,0);dummy.scale.setScalar(.8+random()*.6);dummy.updateMatrix();
    stems.setMatrixAt(i,dummy.matrix);heads.setMatrixAt(i,dummy.matrix);
    stems.setColorAt(i,color.setHex(0x5f9a32));heads.setColorAt(i,color.setHex(petals[i%petals.length]));
  });
  scene.add(stems,heads);

  // Soft shafts of sunlight slanting down over the course.
  const shaftMaterial=new THREE.MeshBasicMaterial({map:shaftTexture(),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,opacity:.3,fog:false});
  const shafts=[];
  for(let i=0;i<7;i++){
    const shaft=new THREE.Mesh(new THREE.PlaneGeometry(3.4+random()*2.4,18),shaftMaterial.clone());
    shaft.position.set(cx+(random()*2-1)*rx*.8,6,cz+(random()*2-1)*rz*.7);shaft.rotation.set(0,random()*Math.PI,.5);
    shaft.renderOrder=5;scene.add(shaft);shafts.push({shaft,phase:random()*6});
  }

  const ballPosition=new THREE.Vector3();
  return {
    update(time,dt=1/60,ball){
      wind.value=time;
      for(const f of flock){
        const a=time*f.speed+f.phase;
        const x=cx+Math.cos(a)*rx*f.radius,z=cz+Math.sin(a*1.3)*rz*f.radius,y=f.height+Math.sin(a*2.1)*1.2;
        const dx=-Math.sin(a)*rx*f.radius,dz=Math.cos(a*1.3)*1.3*rz*f.radius;
        f.bird.position.set(x,y,z);f.bird.rotation.set(0,Math.atan2(-dz,dx),Math.sin(a*2.1)*.2);
        const gliding=Math.sin(time*.4+f.phase)>.55,flap=gliding?.15:Math.sin(time*f.flap+f.phase)*.9;
        f.wings[0].rotation.x=flap;f.wings[1].rotation.x=-flap;
      }
      // The hopping bird: pecks, hops between spots, flees from the ball.
      if(ball)ballPosition.copy(ball);
      for(const hop of hops){
      const {hopper}=hop,bird=hopper.bird;
      if(hop.state==='ground'){
        hop.timer-=dt;hop.hopTimer-=dt;
        const peck=Math.max(0,Math.sin(time*9))**8;bird.rotation.z=-peck*.6;
        if(hop.hopTimer<=0){hop.hopTimer=.6+random()*1.4;bird.rotation.y+=(random()-.5)*1.6;}
        const near=ball&&Math.hypot(ballPosition.x-bird.position.x,ballPosition.z-bird.position.z)<3.2;
        if(near||hop.timer<=0){
          hop.state='flying';hop.flight=0;hop.from.copy(bird.position);
          hop.target=spots.length?spots[Math.floor(random()*spots.length)]:hop.spot;
          if(near&&ball&&Math.hypot(ballPosition.x-hop.target.x,ballPosition.z-hop.target.z)<5)hop.target=spots.find(p=>Math.hypot(ballPosition.x-p.x,ballPosition.z-p.z)>6)??hop.target;
          hop.to.set(hop.target.x,ground(hop.target.x),hop.target.z);
          bird.rotation.y=Math.atan2(-(hop.to.z-hop.from.z),hop.to.x-hop.from.x);bird.rotation.z=0;
        }
        hopper.wings[0].rotation.x=-.1;hopper.wings[1].rotation.x=.1;
      }else{
        hop.flight+=dt/2.4;const t=Math.min(1,hop.flight);
        bird.position.lerpVectors(hop.from,hop.to,t);bird.position.y+=Math.sin(t*Math.PI)*4;
        const flap=Math.sin(time*16)*.9;hopper.wings[0].rotation.x=flap;hopper.wings[1].rotation.x=-flap;
        if(t>=1){hop.state='ground';hop.timer=6+random()*8;}
      }
      }
      // Leaves drift, spin, settle on the felt and fade away.
      for(let i=0;i<LEAVES;i++){
        const l=leafState[i];
        if(l.settled>0){
          l.settled-=dt;if(l.settled<=0)spawn(l);
          const fade=Math.min(1,Math.max(0,l.settled/2));
          dummy.position.set(l.x,l.y,l.z);dummy.rotation.set(-Math.PI/2,0,l.spin);dummy.scale.setScalar(l.scale*fade);
        }else{
          l.y+=l.vy*dt;l.x+=Math.sin(time*.9+l.sway)*.5*dt+.18*dt;l.z+=Math.cos(time*.7+l.sway)*.35*dt;l.spin+=l.spinRate*dt;
          const floor=onTiles(level,l.x,l.z)?ground(l.x)+.06:-6;
          if(l.y<=floor){if(floor>-6){l.y=floor;l.settled=5+random()*5}else spawn(l)}
          dummy.position.set(l.x,l.y,l.z);dummy.rotation.set(Math.sin(l.spin)*1.2,l.spin,Math.cos(l.spin*.7)*.8);dummy.scale.setScalar(l.scale);
        }
        dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);
      }
      leaves.instanceMatrix.needsUpdate=true;
      for(const {shaft,phase} of shafts)shaft.material.opacity=.22+Math.sin(time*.35+phase)*.1;
    },
  };
}
