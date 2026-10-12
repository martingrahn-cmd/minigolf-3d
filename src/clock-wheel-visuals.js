import * as THREE from 'three';
import {clockKit as k,createGear} from './clockwork.js';
import {wheelAngle,wheelSignal} from './clock-wheel.js';
const {add,box,rod,ring,group,bake,brass,gold,copper,iron,ivory,teal,wood,woodLight}=k;

export function createClockWheelVisuals(scene,c){
  if(!c)return null;
  const fixed=group(scene,c.x,0,c.z),mount=group(scene,c.x,c.hubY,c.z);
  mount.rotation.y=-Math.PI/2;
  const rotor=group(mount),shape=new THREE.Shape(),holes=[];
  for(let i=0;i<192;i++){
    const a=i*Math.PI*2/192,r=c.radius*(i%4===1||i%4===2?1:.965);
    if(!i)shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);else shape.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }shape.closePath();
  for(let i=0;i<c.windows;i++){
    const a=i*Math.PI*2/c.windows,x=Math.cos(a)*c.orbit,y=Math.sin(a)*c.orbit;
    const hole=new THREE.Path();hole.absarc(x,y,c.holeRadius,0,Math.PI*2,true);shape.holes.push(hole);
    holes.push({x,y});
    for(const z of [-c.depth/2-.025,c.depth/2+.025]){
      ring(rotor,c.holeRadius+.065,.05,x,y,z,gold);
      for(let b=0;b<8;b++){const a=b*Math.PI/4;add(rotor,new THREE.SphereGeometry(.042,8,6),copper,x+Math.cos(a)*(c.holeRadius+.15),y+Math.sin(a)*(c.holeRadius+.15),z)}
    }
  }
  const plate=add(rotor,new THREE.ExtrudeGeometry(shape,{depth:c.depth,bevelEnabled:false,curveSegments:48,steps:1}),brass,0,0,-c.depth/2);
  plate.name='sekundvalvet-perforated-wheel';
  for(const side of [-1,1]){
    const front=side*(c.depth/2+.045);
    ring(rotor,c.radius*.953,.04,0,0,front,copper);
    const center=add(rotor,new THREE.CylinderGeometry(1.15,1.15,.08,64),teal,0,0,front);center.rotation.x=Math.PI/2;
    ring(rotor,1.14,.055,0,0,front+side*.05,gold);
    for(let i=0;i<60;i++){
      const a=i*Math.PI/30,p=group(rotor,Math.cos(a)*3.69,Math.sin(a)*3.69,front);
      p.rotation.z=a;box(p,i%5===0?.2:.10,.022,.025,0,0,0,ivory);
    }
    // Three engraved plaques identify the windows without flat label sprites.
    for(let i=0;i<3;i++){
      const a=(i+.5)*Math.PI*2/3,p=group(rotor,Math.cos(a)*2.42,Math.sin(a)*2.42,front);
      p.rotation.z=a-Math.PI/2;box(p,.7,.62,.05,0,0,0,teal);
      for(let n=0;n<=i;n++){const x=(n-i/2)*.16;box(p,.055,.33,.04,x,0,side*.05,ivory);for(const y of [-.17,.17])box(p,.12,.035,.04,x,y,side*.05,ivory)}
    }
    const hand=box(rotor,.08,.8,.06,0,.37,front+side*.08,gold);hand.rotation.z=-.5;
    ring(rotor,.23,.06,0,0,front+side*.11,copper);
  }
  // Bearings attach to the sides; the rolling lane stays unobstructed.
  for(const side of [-1,1]){
    box(fixed,1.5,.4,1.4,0,-1.05,side*4.15,iron);
    box(fixed,.65,4.25,.6,0,1,side*4.15,wood);
    for(const y of [-.65,1.5,2.75])box(fixed,.76,.14,.72,0,y,side*4.15,brass);
    rod(fixed,[.95,c.hubY,0],[.95,c.hubY,side*4.15],.13,iron);
    rod(fixed,[.95,c.hubY,side*4.15],[0,c.hubY,side*4.15],.13,iron);
  }
  rod(fixed,[-.5,c.hubY,0],[1.1,c.hubY,0],.21,copper);
  const drive=createGear(scene,.86,12,.30);drive.position.set(c.x,c.hubY,c.z+4.53);drive.rotation.y=-Math.PI/2;
  // Inset light arrows show the opening at ball height, never a fake doorway.
  const signal=new THREE.MeshStandardMaterial({color:0x80e9bb,emissive:0x80e9bb,emissiveIntensity:.6,roughness:.5});
  for(const x of [-2.25,-1.7,-1.15]){
    rod(fixed,[x,.065,-.3],[x+.32,.065,0],.035,signal);
    rod(fixed,[x+.32,.065,0],[x,.065,.3],.035,signal);
  }
  for(const side of [-1,1]){
    const p=group(fixed,-.75,0,side*1.7);
    box(p,.28,1.15,.28,0,.56,0,iron);
    add(p,new THREE.SphereGeometry(.17,16,10),signal,0,1.2,0);
    ring(p,.21,.045,0,1.2,0,brass).rotation.y=Math.PI/2;
  }
  bake(fixed);bake(rotor);
  return {rotor,plate,holes,mount,update(time){
    rotor.rotation.z=wheelAngle(time,c);drive.rotation.z=-time*c.speed*48/12;
    const color={green:0x87efb4,amber:0xffbd55,red:0xd36848}[wheelSignal(time,c)];signal.color.setHex(color);signal.emissive.setHex(color);
  }};
}

export function createClockBumpers(scene,configs=[]){
  return configs.map((c,i)=>{
    const root=group(scene,c.x,0,c.z),base=group(root),bell=group(root);
    add(base,new THREE.CylinderGeometry(c.r,c.r,.16,48),iron,0,.10,0);
    // The rubber strike ring matches the physical bumper radius exactly.
    ring(base,c.r-.055,.055,0,.26,0,copper).rotation.x=Math.PI/2;
    const profile=[new THREE.Vector2(0,.85),new THREE.Vector2(.12,.85),new THREE.Vector2(c.r*.52,.64),new THREE.Vector2(c.r*.63,.40),new THREE.Vector2(c.r*.89,.25),new THREE.Vector2(c.r*.89,.20)];
    add(bell,new THREE.LatheGeometry(profile.reverse(),48),i?gold:brass);
    ring(bell,c.r*.86,.035,0,.24,0,ivory).rotation.x=Math.PI/2;
    add(bell,new THREE.SphereGeometry(.1,12,8),copper,0,.92,0);
    const light=new THREE.MeshStandardMaterial({color:0x99d5bf,emissive:0x82e9bb,emissiveIntensity:.15});
    ring(base,c.r+.17,.022,0,.055,0,light).rotation.x=Math.PI/2;
    bake(base);bake(bell);
    return{pulse:0,update(dt){this.pulse=Math.max(0,this.pulse-dt*3);bell.position.y=this.pulse*.15;bell.rotation.z=Math.sin(this.pulse*24)*this.pulse*.10;light.emissiveIntensity=.15+this.pulse*2}};
  });
}
