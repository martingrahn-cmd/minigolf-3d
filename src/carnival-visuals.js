import * as THREE from 'three';

const mat=(color,emissive=0)=>new THREE.MeshStandardMaterial({color,roughness:.4,metalness:.18,emissive,emissiveIntensity:.7});
function mesh(group,geometry,material,x=0,y=0,z=0){
  const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);object.castShadow=true;object.receiveShadow=true;group.add(object);return object;
}
function star(radius){
  const shape=new THREE.Shape();
  for(let i=0;i<10;i++){
    const a=i*Math.PI/5,r=i%2?radius*.43:radius,x=Math.cos(a)*r,y=Math.sin(a)*r;
    if(i===0)shape.moveTo(x,y);else shape.lineTo(x,y);
  }
  shape.closePath();return new THREE.ShapeGeometry(shape);
}
function pinModel(white,pink,forest=false){
  const root=new THREE.Group();
  const profile=[[.21,0],[.28,.08],[.32,.28],[.33,.43],[.27,.62],[.17,.81],[.115,.99],[.14,1.1],[.21,1.21],[.22,1.32],[.14,1.45],[0,1.49]];
  mesh(root,new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),24),white);
  for(const y of [.89,1.02])mesh(root,new THREE.CylinderGeometry(y<1?.14:.123,y<1?.16:.123,.065,24),pink,0,y,0);
  if(forest){
    const ivory=new THREE.MeshStandardMaterial({color:0xf5deb0,roughness:.9}),ink=new THREE.MeshStandardMaterial({color:0x3c3827,roughness:1});
    // Tiny carved faces look back towards the tee. Their silhouette still fits
    // the pin collider; the two neck bands tell them apart from scenery owls.
    for(const side of [-1,1]){
      const eye=mesh(root,new THREE.SphereGeometry(.095,10,8),ivory,-.186,1.3,side*.087);eye.scale.x=.3;
      const pupil=mesh(root,new THREE.SphereGeometry(.041,8,6),ink,-.214,1.3,side*.087);pupil.scale.x=.4;
      const wing=mesh(root,new THREE.SphereGeometry(.16,8,6),pink,-.07,.43,side*.255);wing.scale.set(.65,1.7,.35);wing.rotation.x=side*.22;
    }
    const beak=mesh(root,new THREE.ConeGeometry(.046,.13,4),pink,-.23,1.22,0);beak.rotation.z=Math.PI/2;
    for(const y of [.23,.38,.53]){
      const feather=mesh(root,new THREE.ConeGeometry(.04,.065,3),ivory,-.315,y,0);feather.rotation.z=Math.PI;
    }
  }
  return root;
}

export function createCarnival(scene,level){
  if(!level.trampoline)return null;
  const drum=level.trampoline,hoop=level.hoop,lane=level.bowlingLane;
  const forest=level.theme==='forest';
  const wood=color=>new THREE.MeshStandardMaterial({color,roughness:.9,flatShading:true});
  const navy=forest?wood(0x65412b):mat(0x263759),pink=forest?wood(0x86733a):mat(0xff80b9,0x922951),gold=forest?wood(0xd3a550):mat(0xffcf75),cyan=forest?new THREE.MeshStandardMaterial({color:0x8eefd0,emissive:0x2c947d,emissiveIntensity:.5,roughness:.35}):mat(0x8ffff0,0x289d98),white=forest?wood(0xd2a971):mat(0xf8f2e9);
  const group=new THREE.Group();group.position.set(drum.x,0,drum.z);scene.add(group);
  mesh(group,new THREE.CylinderGeometry(1.68,1.42,.5,48),navy,0,-.25,0);
  const lip=mesh(group,new THREE.TorusGeometry(1.53,.1,10,64),pink,0,.015,0);lip.rotation.x=Math.PI/2;
  const skin=new THREE.Group();group.add(skin);
  mesh(skin,new THREE.CylinderGeometry(drum.radius,drum.radius,.035,48),forest?wood(0xebd6a6):cyan,0,.065,0);
  const emblem=mesh(skin,star(.78),forest?pink:white,0,.09,0);emblem.rotation.x=-Math.PI/2;
  if(forest){
    // Bark staves, binding cord and end grain turn the spring into a forest drum.
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12;
      const stave=mesh(group,new THREE.BoxGeometry(.13,.53,.08),i%3?white:navy,Math.cos(a)*1.57,-.23,Math.sin(a)*1.57);stave.rotation.y=-a;
    }
    for(const y of [-.1,-.35]){const cord=mesh(group,new THREE.TorusGeometry(1.61,.025,6,56),gold,0,y,0);cord.rotation.x=Math.PI/2}
    const line=mesh(skin,new THREE.TorusGeometry(1.09,.018,5,56),pink,0,.086,0);line.rotation.x=Math.PI/2;
  }
  for(let i=0;i<20;i++){
    const angle=i*Math.PI/10,points=[];
    for(let j=0;j<=24;j++){
      const t=j/24,r=drum.radius+t*.22;
      points.push(new THREE.Vector3(Math.cos(angle)*r+Math.sin(angle)*Math.sin(t*Math.PI*8)*.035,.03+Math.cos(t*Math.PI*8)*.035,Math.sin(angle)*r-Math.cos(angle)*Math.sin(t*Math.PI*8)*.035));
    }
    mesh(group,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.016,5,false),gold);
    mesh(group,new THREE.SphereGeometry(.055,8,6),white,Math.cos(angle)*1.55,.08,Math.sin(angle)*1.55);
  }
  // Inlaid arrows and a glowing target keep the take-off readable from the tee.
  for(let i=0;i<4;i++){
    const shape=new THREE.Shape();shape.moveTo(.3,0);shape.lineTo(-.2,.32);shape.lineTo(-.05,0);shape.lineTo(-.2,-.32);shape.closePath();
    const arrow=mesh(scene,new THREE.ShapeGeometry(shape),gold,drum.x-2-i*.85,.07,0);arrow.rotation.x=-Math.PI/2;
  }

  const ringGroup=new THREE.Group();ringGroup.position.set(hoop.x,hoop.y,hoop.z);scene.add(ringGroup);
  for(const [x,radius,tube,material] of [[0,hoop.radius,.12,gold],[.18,hoop.radius+.18,.055,pink]]){
    const ring=mesh(ringGroup,new THREE.TorusGeometry(radius,tube,12,72),material,x,0,0);ring.rotation.y=Math.PI/2;
  }
  const bulbs=[];
  for(let i=0;i<16;i++){
    const a=i*Math.PI/8;
    bulbs.push(mesh(ringGroup,new THREE.SphereGeometry(.075,8,6),cyan,-.08,Math.cos(a)*(hoop.radius+.19),Math.sin(a)*(hoop.radius+.19)));
  }
  if(forest){
    const leaf=new THREE.MeshStandardMaterial({color:0x6e9f37,roughness:.9,flatShading:true});
    const points=[];
    for(let i=0;i<=96;i++){
      const a=i/96*Math.PI*2,r=hoop.radius+.09+Math.cos(a*7)*.12;
      points.push(new THREE.Vector3(Math.sin(a*7)*.13,Math.cos(a)*r,Math.sin(a)*r));
    }
    mesh(ringGroup,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),144,.09,6,false),pink);
    for(const a of [-.8,.8,2.15,4.15])for(let i=0;i<3;i++){
      const angle=a+i*.13,r=hoop.radius+.43+i*.06;
      const sprig=mesh(ringGroup,new THREE.IcosahedronGeometry(.29,0),leaf,0,Math.cos(angle)*r,Math.sin(angle)*r);sprig.scale.set(.32,1.6,.7);sprig.rotation.x=-angle-.55;
    }
    const crown=mesh(ringGroup,new THREE.OctahedronGeometry(.48,0),cyan,0,hoop.radius+.76,0);crown.scale.set(.6,1.5,.6);
    for(const side of [-1,1]){
      const vine=new THREE.CatmullRomCurve3([
        new THREE.Vector3(0,-hoop.radius*.7,side*hoop.radius*.72),new THREE.Vector3(.08,-hoop.radius-.45,side*1.4),
        new THREE.Vector3(-.08,-hoop.radius-1.3,side*1.05),new THREE.Vector3(.12,-hoop.radius-1.7,side*1.3),
      ]);
      mesh(ringGroup,new THREE.TubeGeometry(vine,28,.035,5,false),pink);
      for(const t of [.3,.6]){
        const p=vine.getPoint(t),sprig=mesh(ringGroup,new THREE.IcosahedronGeometry(.17,0),leaf,p.x,p.y,p.z);sprig.scale.set(.4,1.3,1);sprig.rotation.x=side*.6;
      }
    }
  }
  // The crystal holds the forest ring aloft. The harbour version uses supports.
  for(const side of forest?[]:[-1,1]){
    mesh(scene,new THREE.CylinderGeometry(.13,.22,6,forest?7:12),navy,hoop.x,-.3,side*(hoop.radius+.6));
    const foot=mesh(scene,forest?new THREE.IcosahedronGeometry(.7,0):new THREE.CylinderGeometry(.54,.68,.3,12),pink,hoop.x,-3.2,side*(hoop.radius+.6));
    if(forest)foot.scale.set(1,.7,1);
    const a=new THREE.Vector3(hoop.x,1.4,side*(hoop.radius+.6)),b=new THREE.Vector3(hoop.x,hoop.y,side*hoop.radius);
    const strut=mesh(scene,new THREE.CylinderGeometry(.07,.07,a.distanceTo(b),10),gold);
    strut.position.copy(a).add(b).multiplyScalar(.5);strut.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
  }

  // Bowling lane markings are paint; only standing pins collide with the ball.
  const laneLength=lane.x2-lane.x1,laneCenter=(lane.x1+lane.x2)/2;
  const lanePaint=mat(0xb58d68);
  for(let i=0;i<7;i++)mesh(scene,new THREE.BoxGeometry(laneLength-.14,.007,.022),lanePaint,laneCenter,.047,-1.5+i*.5);
  for(const side of [-1,1]){
    mesh(scene,new THREE.BoxGeometry(laneLength-.14,.018,.08),navy,laneCenter,.055,side*1.72);
    for(let i=0;i<13;i++)mesh(scene,new THREE.BoxGeometry(.22,.02,.1),i%2?pink:cyan,lane.x1+.15+i*(laneLength-.3)/12,.075,side*1.72);
  }
  // Painted hazard stripes follow the actual unguarded edges, including the end.
  for(const edge of level.openEdges||[]){
    const vertical=edge.x!==undefined,length=vertical?edge.z2-edge.z1:edge.x2-edge.x1;
    const count=Math.ceil(length/.3);
    for(let i=0;i<count;i++){
      const t=(i+.5)/count,x=vertical?edge.x:edge.x1+t*length,z=vertical?edge.z1+t*length:edge.z;
      mesh(scene,new THREE.BoxGeometry(vertical?.16:length/count*.82,.025,vertical?length/count*.82:.16),i%2?navy:gold,x,.073,z);
    }
  }
  // End arrow signals the turn to the flag; beyond this edge is open water.
  const turn=mesh(scene,new THREE.BoxGeometry(.1,.025,.75),gold,18.9,.075,0);
  const turnTip=mesh(scene,new THREE.ConeGeometry(.17,.3,3),gold,18.9,.08,-.47);turnTip.rotation.x=-Math.PI/2;
  for(const z of [-1.6,-.8,0,.8,1.6]){
    const shape=new THREE.Shape();shape.moveTo(.22,0);shape.lineTo(-.15,.13);shape.lineTo(-.15,-.13);shape.closePath();
    const arrow=mesh(scene,new THREE.ShapeGeometry(shape),navy,14.4-Math.abs(z)*.3,.075,z);arrow.rotation.x=-Math.PI/2;
  }
  const pins=level.pins.map(pin=>{
    const pivot=new THREE.Group();pivot.position.set(pin.x,.04,pin.z);scene.add(pivot);
    pivot.add(pinModel(white,pink,forest));
    return pivot;
  });
  for(const [x,z] of [[19,-7],[21.3,3.5]]){
    mesh(scene,new THREE.CylinderGeometry(.85,1,.28,20),navy,x,-.1,z);
    const trophy=pinModel(white,pink,forest);trophy.position.set(x,.04,z);trophy.scale.setScalar(1.7);scene.add(trophy);
    const ring=mesh(scene,new THREE.TorusGeometry(.85,.055,8,40),cyan,x,.08,z);ring.rotation.x=Math.PI/2;
  }
  let bounce=0,flash=0;
  const rising=pins.map(()=>0),riseDuration=.38;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    bounce(){bounce=1},celebrate(){flash=1},
    restorePins(indices){if(!reducedMotion)for(const i of indices)rising[i]=riseDuration},
    reset(){rising.fill(0);bounce=0;flash=0},
    update(dt,time,states){
      bounce=Math.max(0,bounce-dt*2.5);flash=Math.max(0,flash-dt*.8);
      skin.position.y=-Math.sin(bounce*Math.PI*3)*bounce*.12;
      lip.scale.setScalar(1+bounce*.05);
      bulbs.forEach((bulb,i)=>bulb.scale.setScalar(1+flash*1.5+.16*Math.sin(time*5-i*.5)));
      pins.forEach((pin,i)=>{
        const state=states[i];
        const t=state.down?Math.min(1,state.age/.32):0;
        pin.quaternion.setFromAxisAngle(new THREE.Vector3(state.dz,0,-state.dx),t*Math.PI*.48);
        pin.position.set(level.pins[i].x+state.dx*t*.34,.04+Math.sin(t*Math.PI)*.28,level.pins[i].z+state.dz*t*.34);
        pin.scale.setScalar(state.down?Math.max(0,1-Math.max(0,state.age-.8)*2):1);
        pin.visible=!state.down||state.age<1.3;
        rising[i]=state.down?0:Math.max(0,rising[i]-dt);
        if(rising[i]>0){
          const t=1-rising[i]/riseDuration,q=t-1;
          pin.scale.setScalar(Math.max(.01,1+2.2*q*q*q+1.2*q*q));
          pin.position.y+=Math.sin(t*Math.PI)*.13;
        }
      });
    },
  };
}
