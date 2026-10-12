import * as THREE from 'three';
import { gatePose } from './gates.js';
const material=(color,emissive=0)=>new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.2,emissive,emissiveIntensity:.7});
function box(group,w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;group.add(m);return m}
export function createBridge(scene,bridge){
  if(!bridge)return null;
  const group=new THREE.Group(),center=(bridge.x1+bridge.x2)/2,length=bridge.x2-bridge.x1;
  group.position.set(center,bridge.pivotY+.04,bridge.z);scene.add(group);
  const wood=material(0xd3a574),woodAlt=material(0xdeb887),metal=material(0x333e61),cyan=material(0x7cffe8,0x31cdb7),pink=material(0xf79bcf,0xab397d);
  for(let i=0;i<24;i++)box(group,length/24-.025,.22,bridge.halfWidth*2,-length/2+(i+.5)*length/24,-.11,0,i%2?wood:woodAlt);
  for(const side of [-1,1]){
    box(group,length,.32,.18,0,-.32,side*(bridge.halfWidth-.18),metal);
    box(group,length,.16,.2,0,.17,side*bridge.halfWidth,cyan);
    box(group,1.1,.045,.15,length/2-.6,.04,side*.65,pink);
  }
  // A visible spring at the launch edge explains the upward kick.
  box(group,.5,.05,2.8,length/2-.3,.025,0,pink);
  const arrow=new THREE.Shape();arrow.moveTo(.38,0);arrow.lineTo(-.25,.3);arrow.lineTo(-.1,0);arrow.lineTo(-.25,-.3);arrow.closePath();
  for(const x of [-4,-2,0,2,4]){const m=new THREE.Mesh(new THREE.ShapeGeometry(arrow),cyan);m.rotation.x=-Math.PI/2;m.position.set(x,.02,0);group.add(m)}
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(.33,.33,4,16),metal);axle.rotation.x=Math.PI/2;axle.position.set(center,bridge.pivotY-.45,bridge.z);scene.add(axle);
  for(const side of [-1,1]){
    const pivot=new THREE.Mesh(new THREE.ConeGeometry(.9,2.5,3),metal);pivot.position.set(center,-.63,bridge.z+side*1.35);pivot.rotation.y=Math.PI/2;scene.add(pivot);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.12,16),pink);cap.rotation.x=Math.PI/2;cap.position.set(center,bridge.pivotY-.45,bridge.z+side*2.05);scene.add(cap);
  }
  return {update(angle){group.rotation.z=angle;group.scale.x=1/Math.cos(angle)}};
}
export function createBumpers(scene,bumpers=[]){
  return bumpers.map(b=>{
    const group=new THREE.Group();group.position.set(b.x,.04,b.z);scene.add(group);
    const pink=material(0xf7a1d6,0x87325f),steel=material(0x2d3a62),white=material(0xdbfff7,0x51bfb9);
    for(const [radius,h,y,mat] of [[b.r+.16,.12,.06,steel],[b.r,.45,.33,pink],[b.r*.75,.12,.61,white],[b.r*.42,.06,.70,steel]]){
      const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,h,32),mat);m.position.y=y;m.castShadow=true;group.add(m);
    }
    return {pulse:0,update(dt){this.pulse=Math.max(0,this.pulse-dt*3);group.scale.set(1+this.pulse*.14,1-this.pulse*.2,1+this.pulse*.14)}};
  });
}

export function createGates(scene,gates=[]){
  return gates.map(gate=>{
    const frame=new THREE.Group();frame.position.set(gate.x,.04,gate.z);scene.add(frame);
    const steel=material(0x33425f),trim=material(0x92f3e2,0x318c82),gold=material(0xf4c17c),blue=material(0x5aa3bc);
    for(const side of [-1,1]){
      const post=new THREE.Mesh(new THREE.CylinderGeometry(gate.postRadius,gate.postRadius,3.15,16),steel);
      post.position.set(0,1.575,side*gate.postOffset);post.castShadow=true;frame.add(post);
      box(frame,.15,2.7,.05,-.28,1.5,side*gate.postOffset,trim);
    }
    box(frame,.6,.25,gate.postOffset*2+.65,0,3.13,0,steel);
    box(frame,.04,.09,gate.postOffset*2+.55,-.32,3.12,0,trim);
    const panel=new THREE.Group();frame.add(panel);
    box(panel,gate.thickness,.13,gate.halfWidth*2,0,.065,0,gold);
    box(panel,gate.thickness,.14,gate.halfWidth*2,0,1.07,0,blue);
    for(let i=0;i<9;i++)box(panel,gate.thickness*.7,.95,.13,0,.57,-gate.halfWidth+.1+i*(gate.halfWidth*2-.2)/8,i%2?blue:gold);
    const colors=[0xf17888,0xffcc77,0x7affb1];
    const lamps=colors.map(color=>material(color,color));
    for(const side of [-1,1])for(const face of [-1,1]){
      box(frame,.12,1.5,.52,face*.31,1.7,side*gate.postOffset,steel);
      lamps.forEach((mat,i)=>{
        const light=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.06,20),mat);
        light.rotation.z=Math.PI/2;light.position.set(face*.40,2.14-i*.43,side*gate.postOffset);frame.add(light);
      });
    }
    // Short glowing guide marks show the clear central lane.
    for(const x of [-2.1,-1.45]){
      const shape=new THREE.Shape();shape.moveTo(.23,0);shape.lineTo(-.14,.24);shape.lineTo(-.14,-.24);shape.closePath();
      const arrow=new THREE.Mesh(new THREE.ShapeGeometry(shape),trim);arrow.rotation.x=-Math.PI/2;arrow.position.set(x,.045,0);frame.add(arrow);
    }
    return {update(time){
      const pose=gatePose(time,gate);panel.position.y=pose.height;
      const active={red:0,amber:1,green:2}[pose.signal];
      lamps.forEach((mat,i)=>{mat.color.setHex(i===active?colors[i]:0x28364c);mat.emissiveIntensity=i===active?1.5:.02});
    }};
  });
}

export function createIceFeatures(scene,level,heightAt,heightSlope){
  const ice=(level.surfaces||[]).filter(surface=>surface.kind==='ice');
  if(!ice.length)return;
  const frost=new THREE.MeshStandardMaterial({color:0xc5f6ff,roughness:.16,metalness:.25,emissive:0x3c8299,emissiveIntensity:.35});
  const white=new THREE.MeshBasicMaterial({color:0xe7ffff,transparent:true,opacity:.65,depthWrite:false});
  const warning=new THREE.MeshBasicMaterial({color:0xffca8b});
  for(const strip of ice){
    const width=strip.z2-strip.z1,center=(strip.z1+strip.z2)/2;
    const vertices=[strip.x1,heightAt(strip.x1,center)+.048,strip.z1,strip.x1,heightAt(strip.x1,center)+.048,strip.z2,strip.x2,heightAt(strip.x2,center)+.048,strip.z1,strip.x2,heightAt(strip.x2,center)+.048,strip.z2];
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex([0,1,2,1,3,2]);geometry.computeVertexNormals();
    const sheet=new THREE.Mesh(geometry,frost);sheet.receiveShadow=true;scene.add(sheet);
    for(let i=0;i<24;i++){
      const x=strip.x1+.3+i*(strip.x2-strip.x1-.6)/24,z=center+Math.sin(i*2.4)*width*.32;
      const streak=box(scene,.5+(i%3)*.2,.008,.025,x,heightAt(x,z)+.058,z,white);streak.rotation.z=Math.atan(heightSlope(x,z));streak.castShadow=false;
    }
    for(const side of [-1,1])for(let i=0;i<17;i++){
      const x=strip.x1+.3+i*(strip.x2-strip.x1-.6)/16,z=center+side*(width/2-.035),h=.25+(i%4)*.16;
      const icicle=new THREE.Mesh(new THREE.ConeGeometry(.10,h,5),frost);icicle.rotation.z=Math.PI;icicle.position.set(x,heightAt(x,z)-h/2,z);scene.add(icicle);
    }
    for(const x of [strip.x1+.6,strip.x2-.6]){
      const shape=new THREE.Shape();shape.moveTo(.25,0);shape.lineTo(-.18,.26);shape.lineTo(-.18,-.26);shape.closePath();
      const arrow=new THREE.Mesh(new THREE.ShapeGeometry(shape),white);arrow.rotation.x=-Math.PI/2;
      arrow.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.atan(heightSlope(x,center))));
      arrow.position.set(x,heightAt(x,center)+.065,center);scene.add(arrow);
    }
  }
  // Amber end marks identify the missing rail; there is no invisible collision here.
  for(const edge of level.openEdges||[])for(const x of [edge.x1,edge.x2]){
    box(scene,.16,.025,.25,x,heightAt(x,edge.z)+.075,edge.z,warning);
  }
  // Snowflake medallion on the tee, outside the line of play.
  const x=level.start.x+1.1,z=2.4;
  const ring=new THREE.Mesh(new THREE.RingGeometry(.64,.69,40),white);ring.rotation.x=-Math.PI/2;ring.position.set(x,heightAt(x,z)+.055,z);scene.add(ring);
  for(let i=0;i<3;i++){
    const spoke=box(scene,1,.014,.035,x,heightAt(x,z)+.06,z,white);spoke.rotation.y=i*Math.PI/3;
  }
}
