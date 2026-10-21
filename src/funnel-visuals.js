import * as THREE from 'three';
import { clockKit as K,createGear } from './clockwork.js';
import { funnelSurface,createFunnelTrack } from './funnel.js';
import { t } from './i18n.js';

function plaque(parent,text,sub,x,y,z,width=3.8){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;
  const c=canvas.getContext('2d');c.fillStyle='#203e40';c.fillRect(0,0,768,256);
  c.strokeStyle='#d9b679';c.lineWidth=10;c.strokeRect(12,12,744,232);
  c.textAlign='center';c.fillStyle='#ffe3a8';c.font='bold 64px Georgia';c.fillText(text,384,113);
  c.font='22px sans-serif';c.fillText(sub,384,177);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const sign=K.add(parent,new THREE.PlaneGeometry(width,width/3),new THREE.MeshStandardMaterial({map:texture,roughness:.7}),x,y,z);
  K.box(parent,width+.12,width/3+.12,.12,x,y,z-.07,K.brass);
  return sign;
}

function gauge(parent,x,y,z){
  const root=K.group(parent,x,y,z);
  K.add(root,new THREE.CircleGeometry(.58,48),K.ivory,0,0,.02);
  K.ring(root,.6,.075,0,0,0,K.brass);K.ring(root,.45,.016,0,0,.04,K.copper);
  for(let i=0;i<13;i++){
    const a=-2.2+i/12*4.4;
    K.rod(root,[Math.sin(a)*.41,Math.cos(a)*.41,.06],[Math.sin(a)*.51,Math.cos(a)*.51,.06],.018,K.iron);
  }
  const needle=K.group(root,0,0,.1);K.rod(needle,[0,-.08,0],[0,.4,0],.025,K.copper);
  K.add(root,new THREE.SphereGeometry(.07,10,8),K.gold,0,0,.13);
  return needle;
}

export function createFunnelVisuals(scene,level){
  const f=level.funnel;if(!f)return null;
  const track=createFunnelTrack(f),statics=K.group(scene),animated=K.group(scene),h=f.y+.04;
  statics.name='pneumatic-post-station';
  // The square mounting plate seals the deck around a circular opening.
  const plate=new THREE.Shape();plate.moveTo(-f.plate,-f.plate);plate.lineTo(f.plate,-f.plate);plate.lineTo(f.plate,f.plate);plate.lineTo(-f.plate,f.plate);plate.closePath();
  const hole=new THREE.Path();hole.absarc(0,0,f.radius,0,Math.PI*2,true);plate.holes.push(hole);
  const mounting=K.add(statics,new THREE.ExtrudeGeometry(plate,{depth:.11,bevelEnabled:false,curveSegments:64}),K.copper,f.x,h,f.z);mounting.rotation.x=Math.PI/2;
  mounting.name='funnel-open-mount';
  for(const x of [-1,1])for(const z of [-1,1])K.bolt(statics,f.x+x*(f.plate-.17),h+.05,f.z+z*(f.plate-.17));
  const vertices=[],indices=[],uv=[],segments=96,rings=24;
  for(let row=0;row<=rings;row++){
    const r=f.throat+(f.radius-f.throat)*row/rings;
    for(let i=0;i<=segments;i++){
      const a=i/segments*Math.PI*2,x=f.x+Math.cos(a)*r,z=f.z+Math.sin(a)*r;
      vertices.push(x,(funnelSurface(x,z,f)?.height??f.y)+.04,z);uv.push(i/segments,row/rings);
      if(row<rings&&i<segments){const n=row*(segments+1)+i;indices.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1)}
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const bowl=K.add(scene,geometry,new THREE.MeshStandardMaterial({color:0xc89a53,metalness:.58,roughness:.32,side:THREE.DoubleSide}));bowl.name='funnel-rolling-surface';
  K.ring(statics,f.radius,.047,f.x,h+.01,f.z,K.gold).rotation.x=Math.PI/2;
  K.ring(statics,f.throat,.035,f.x,h-f.depth,f.z,K.gold).rotation.x=Math.PI/2;
  for(let i=0;i<12;i++){
    const points=[];
    for(let j=0;j<=24;j++){
      const t=j/24,r=f.throat+.04+(f.radius-f.throat-.10)*t,a=i*Math.PI/6+(1-t)*.30;
      const x=f.x+Math.cos(a)*r,z=f.z+Math.sin(a)*r;
      points.push(new THREE.Vector3(x,funnelSurface(x,z,f).height+.043,z));
    }
    const seam=K.add(statics,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.01,4,false),K.copper);seam.castShadow=false;
  }
  // Glass and the moving ball use the identical arc-length sampled centerline.
  const glass=new THREE.MeshPhysicalMaterial({color:0x9be3d5,metalness:.05,roughness:.16,transparent:true,opacity:.19,side:THREE.DoubleSide,depthWrite:false});
  const tube=K.add(scene,new THREE.TubeGeometry(track.curve,220,.53,16,false),glass);tube.castShadow=false;tube.name='pneumatic-glass-tube';tube.renderOrder=2;
  const count=Math.ceil(track.curve.getLength()/1.8),zAxis=new THREE.Vector3(0,0,1);
  for(let i=0;i<=count;i++){
    const t=i/count,p=track.curve.getPointAt(t),tangent=track.curve.getTangentAt(t);
    const collar=K.ring(statics,.55,i===0||i===count?.09:.046,p.x,p.y,p.z,K.brass);
    collar.quaternion.setFromUnitVectors(zAxis,tangent);
    // Two service bolts on every flange, set just outside the viewing window.
    if(i%2===0){const side=new THREE.Vector3().crossVectors(tangent,new THREE.Vector3(0,1,0)).normalize();
      if(side.length()<.1)side.set(1,0,0);
      for(const s of [-1,1])K.add(statics,new THREE.SphereGeometry(.07,6,4),K.gold,p.x+side.x*.60*s,p.y,p.z+side.z*.60*s);
    }
  }
  const frames=track.curve.computeFrenetFrames(220,false);
  for(const side of [-1,1]){
    const points=[];for(let i=0;i<=220;i++)points.push(track.curve.getPointAt(i/220).addScaledVector(frames.normals[i],side*.53));
    K.add(statics,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),220,.022,6,false),K.copper);
  }
  // Brass-lit couplings punctuate the long climb.
  for(const t of [.10,.27,.46,.65,.87]){
    const p=track.curve.getPointAt(t),marker=K.ring(statics,.54,.023,p.x,p.y,p.z,K.glow);
    marker.quaternion.setFromUnitVectors(zAxis,track.curve.getTangentAt(t));marker.castShadow=false;
  }
  const deliveryPulse=K.ring(animated,.56,.035,0,0,0,new THREE.MeshBasicMaterial({color:0xb8ffde,transparent:true,opacity:.85}));
  deliveryPulse.castShadow=false;deliveryPulse.visible=false;
  // A riveted air reservoir, flywheel, piston and pressure gauge explain the lift.
  const px=-6.1,pz=-7.5;
  K.add(statics,new THREE.CylinderGeometry(.87,.87,5.1,32),K.teal,px,.1,pz);
  for(const y of [-2.5,-2.15,2.3,2.65])K.add(statics,new THREE.CylinderGeometry(.95,.95,.13,32),K.brass,px,y,pz);
  for(const y of [-2.2,2.4])for(let i=0;i<12;i++){const a=i*Math.PI/6;K.add(statics,new THREE.SphereGeometry(.06,6,4),K.gold,px+Math.cos(a)*.9,y,pz+Math.sin(a)*.9)}
  K.add(statics,new THREE.SphereGeometry(.86,24,12),K.teal,px,2.4,pz).scale.y=.35;
  K.box(statics,3,.24,2.5,px,-2.7,pz,K.iron);
  for(const x of [-1,1])K.rod(statics,[px+x,-6.9,pz],[px+x,-2.8,pz],.11,K.iron);
  const flywheel=createGear(animated,1.1,24,.21);flywheel.position.set(px,.1,pz+1.05);
  const piston=K.group(animated,px+1.3,1.7,pz+1.05);K.rod(piston,[0,0,0],[0,-1.5,0],.075,K.gold);
  K.add(piston,new THREE.CylinderGeometry(.2,.2,.75,16),K.copper,0,.22,0);
  K.box(statics,.7,1.1,.65,px+1.3,2.0,pz+1.05,K.teal);
  const needle=gauge(statics,px,1.9,pz+.9);
  const feed=new THREE.CatmullRomCurve3([new THREE.Vector3(px,2.7,pz),new THREE.Vector3(px,3.25,pz),new THREE.Vector3(-4,3.25,-6.1),new THREE.Vector3(-4,2.9,-5.5)]);
  K.add(statics,new THREE.TubeGeometry(feed,40,.12,10,false),K.copper);
  plaque(statics,t('RÖRPOST'),t('URVERKETS STAD · TRYCKLUFT'),-10,2.1,-3.85,4.2);
  for(const x of [-12,-8])K.rod(statics,[x,.15,-3.9],[x,2.9,-3.9],.06,K.iron);
  // Receiving tray and the mail sorting cabinet stand beside, never in, the lane.
  const cabinet=K.group(statics,1.6,3.2,-4.25);
  K.box(cabinet,3.4,2.1,1.25,0,1.05,0,K.wood);
  for(let x=0;x<4;x++)for(let y=0;y<3;y++){
    K.box(cabinet,.71,.55,.055,-1.2+x*.8,.43+y*.63,.65,K.teal);
    K.box(cabinet,.20,.07,.08,-1.2+x*.8,.4+y*.63,.72,K.brass);
    K.box(cabinet,.23,.09,.02,-1.2+x*.8,.59+y*.63,.69,K.ivory);
  }
  K.lantern(statics,3.8,3.2,-4.2);
  // Envelopes and corded parcels give this station a different identity from hole 1.
  for(let i=0;i<3;i++){
    const parcel=K.group(statics,-18+i*.9,.2+i*.08,4.85);parcel.rotation.y=i*.22;
    K.box(parcel,.74,.52,.8,0,0,0,K.woodLight);K.box(parcel,.05,.54,.82,0,0,0,K.ivory);K.box(parcel,.76,.54,.045,0,0,0,K.ivory);
    K.box(parcel,.27,.014,.20,.16,.27,.15,K.ivory);
  }
  // Keep the gauge needle separate from the baked architecture.
  needle.removeFromParent();scene.add(needle);needle.position.set(px,1.9,pz+1.0);
  K.bake(statics);
  return {track,bowl,update(time,active,progress){
    flywheel.rotation.z=-time*(active?1.8:.45);
    piston.position.y=1.7+Math.sin(time*(active?7.2:1.8))*.28;
    needle.rotation.z=active?-.8+Math.sin(time*4)*.08:.6+Math.sin(time)*.03;
    glass.opacity=active?.23:.17;
    deliveryPulse.visible=active;
    if(active){deliveryPulse.position.copy(track.curve.getPointAt(progress));deliveryPulse.quaternion.setFromUnitVectors(zAxis,track.curve.getTangentAt(progress))}
  }};
}
