import * as THREE from 'three';
import {clockKit as k,createGear} from './clockwork.js';
import {clockHandPose} from './clock-hand.js';
import {modelInstance} from './models.js';

const {add,box,rod,ring,group,bake,brass,gold,copper,iron,ivory,teal,wood,woodLight}=k;
const flatRing=(g,r,t,x,y,z,m)=>{const mesh=ring(g,r,t,x,y,z,m);mesh.rotation.x=-Math.PI/2;return mesh};

function roman(g,text,x,y,z,scale=1){
  const root=group(g,x,y,z);root.scale.setScalar(scale);
  [...text].forEach((letter,i)=>{
    const x=(i-(text.length-1)/2)*.3;
    if(letter==='I'){
      rod(root,[x,0,-.25],[x,0,.25],.029,ivory);
      for(const z of [-.25,.25])rod(root,[x-.085,0,z],[x+.085,0,z],.022,ivory);
    }else if(letter==='V'){
      rod(root,[x-.12,0,-.25],[x,0,.25],.027,ivory);rod(root,[x,0,.25],[x+.12,0,-.25],.027,ivory);
    }else{
      rod(root,[x-.12,0,-.25],[x+.12,0,.25],.027,ivory);rod(root,[x+.12,0,-.25],[x-.12,0,.25],.027,ivory);
    }
  });
  return root;
}

export function createClockHandVisuals(scene,c,cup){
  if(!c)return null;
  const fixed=group(scene,c.x,0,c.z),moving=group(scene,c.x,0,c.z);
  fixed.name='tolvslaget-open-pocket-watch';
  const outer=c.radius+1.45;
  // The case and its open clockwork sit BELOW the rolling surface. The broad
  // circular rim is scenery; only the visibly raised hand carries the ball.
  // The Blender case (milled edge, crown and bow) is built for this well radius.
  const watch=c.radius===6.5?modelInstance('clockwork/pocket-watch'):null;
  let caseRing=watch;
  if(watch)fixed.add(watch);
  else{
    const caseShape=new THREE.Shape();caseShape.absarc(0,0,outer,0,Math.PI*2,false);
    const cutout=new THREE.Path();cutout.absarc(0,0,c.radius+.18,0,Math.PI*2,true);caseShape.holes.push(cutout);
    caseRing=add(fixed,new THREE.ExtrudeGeometry(caseShape,{depth:.65,bevelEnabled:true,bevelSize:.055,bevelThickness:.055,bevelSegments:2,curveSegments:96}),brass,0,-1.36,0);caseRing.rotation.x=-Math.PI/2;
    flatRing(fixed,outer,.13,0,-.72,0,gold);flatRing(fixed,c.radius+.18,.09,0,-.72,0,copper);
    flatRing(fixed,outer+.03,.15,0,-1.4,0,iron);
  }
  const faceMaterial=new THREE.MeshStandardMaterial({color:0x204644,roughness:.7,metalness:.3,side:THREE.DoubleSide});
  const bezel=add(fixed,new THREE.RingGeometry(c.radius+.22,outer-.18,128),faceMaterial,0,-.665,0);bezel.rotation.x=-Math.PI/2;
  const numerals=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];
  for(let i=0;i<60;i++){
    const a=i*Math.PI/30,r=outer-.28,mark=group(fixed,Math.sin(a)*r,-.62,-Math.cos(a)*r);mark.rotation.y=-a;
    box(mark,i%5===0?.06:.027,.018,i%5===0?.3:.12,0,0,0,gold);
    if(i%5===0){const r=c.radius+.78;roman(fixed,numerals[i/5],Math.sin(a)*r,-.60,-Math.cos(a)*r,.82)}
  }
  // Skeleton watch: actual teeth, axles and connecting drive shafts in the void.
  const gears=[];
  for(const [x,z,r,teeth,speed] of [[-3.4,-2.5,2.35,36,.16],[.6,-3.6,1.65,24,-.24],[3.5,-1.3,2.05,32,.18],[1.5,2.2,2.45,36,-.16],[-3.5,2.4,1.9,28,.2057]]){
    const mount=group(moving,x,-2.4,z);mount.rotation.x=-Math.PI/2;
    const gear=createGear(mount,r,teeth,.3);gears.push({gear,speed});
    rod(fixed,[x,-5.9,z],[x,-1.9,z],.12,iron);
    add(fixed,new THREE.CylinderGeometry(.32,.32,.12,24),copper,x,-1.95,z);
  }
  for(const z of [-3.8,3.8])rod(fixed,[-5,-4.7,z],[5,-4.7,z],.18,woodLight);
  flatRing(fixed,5.65,.17,0,-4.1,0,iron);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,x=Math.cos(a)*(outer-.4),z=Math.sin(a)*(outer-.4);
    rod(fixed,[x,-1.1,z],[x*.7,-5.9,z*.7],.12,iron);
    add(fixed,new THREE.CylinderGeometry(.07,.07,.09,6),copper,x,-.59,z);
  }
  // A winding crown and bow give the mechanism its unmistakable pocket-watch shape.
  if(!watch){
    const winding=group(fixed,0,-1,-outer-1.0);
    const knob=add(winding,new THREE.CylinderGeometry(.58,.58,1.5,24),gold);knob.rotation.x=Math.PI/2;
    for(let i=0;i<16;i++){
      const a=i*Math.PI/8;rod(winding,[Math.cos(a)*.59,Math.sin(a)*.59,-.55],[Math.cos(a)*.59,Math.sin(a)*.59,.55],.032,copper);
    }
    flatRing(fixed,1.32,.17,0,-1,-outer-2.2,brass);
  }
  // The complete playable deck rotates as one piece; its rectangle exactly
  // matches onClockHand. Inlaid arrows stay flush, without invisible blockers.
  const hand=group(moving);hand.name='clock-hand-deck';
  box(hand,c.radius*2,.3,c.halfWidth*2,0,-.11,0,wood);
  const deck=add(hand,new THREE.PlaneGeometry(c.radius*2,c.halfWidth*2),new THREE.MeshStandardMaterial({color:0x438e80,roughness:.88}),0,.055,0);deck.rotation.x=-Math.PI/2;deck.name='clock-hand-playing-surface';
  for(const z of [-c.halfWidth,c.halfWidth]){
    box(hand,c.radius*2,.055,.085,0,.06,z,brass);
    for(let x=-c.radius+.35;x<c.radius;x+=.55)box(hand,.16,.014,.13,x,.095,z,gold);
    rod(hand,[-c.radius,-.26,z],[0,-1,z],.085,copper);
    rod(hand,[0,-1,z],[c.radius,-.26,z],.085,copper);
  }
  for(const direction of [-1,1]){
    const arrow=new THREE.Shape();arrow.moveTo(direction*5.9,0);arrow.lineTo(direction*4.8,-.63);arrow.lineTo(direction*5.05,0);arrow.lineTo(direction*4.8,.63);arrow.closePath();
    const inlay=add(hand,new THREE.ShapeGeometry(arrow),new THREE.MeshStandardMaterial({color:0xeaca88,side:THREE.DoubleSide,roughness:.5}),0,.071,0);inlay.rotation.x=-Math.PI/2;
    for(let x=1.05;x<4.5;x+=.65)box(hand,.28,.012,.04,x*direction,.073,0,ivory);
  }
  flatRing(hand,.74,.022,0,.074,0,gold);flatRing(hand,.6,.015,0,.074,0,copper);
  roman(hand,'VI',0,.086,0,.85);
  add(fixed,new THREE.CylinderGeometry(.34,.5,4.8,32),iron,0,-2.7,0);
  const hub=createGear(moving,.8,18,.25);hub.rotation.x=-Math.PI/2;hub.position.y=-.45;
  // Approach lights communicate the same hold/warning/turn state as the deck.
  const signal=new THREE.MeshStandardMaterial({color:0x8be4b6,emissive:0x8be4b6,emissiveIntensity:.8});
  for(const side of [-1,1]){
    for(const z of [-1.65,1.65]){
      const x=side*(c.radius+.8);box(fixed,.25,.8,.25,x,.38,z,iron);
      add(fixed,new THREE.SphereGeometry(.16,16,10),signal,x,.86,z);
      flatRing(fixed,.2,.025,x,.8,z,gold);
    }
    for(let i=0;i<3;i++)box(fixed,.16,.012,.65,side*(c.radius+.5+i*.4),.066,0,signal);
  }
  // Paired bells mark the world's final green; all their bases stay off the felt.
  const bells=[],finaleGlow=new THREE.MeshStandardMaterial({color:0xffdf93,emissive:0xffc760,emissiveIntensity:.2});
  if(cup){
    const finish=group(fixed,cup.x-c.x,0,cup.z-c.z-4.6);
    for(const side of [-1,1]){
      box(finish,.46,5,.5,side*2.6,1.7,0,wood);box(finish,.65,.18,.68,side*2.6,4.2,0,brass);
      const bell=group(moving,cup.x-c.x+side*1.2,3.6,cup.z-c.z-4.6),profile=[new THREE.Vector2(.04,0),new THREE.Vector2(.3,-.05),new THREE.Vector2(.43,-.4),new THREE.Vector2(.72,-1),new THREE.Vector2(.74,-1.15)];
      add(bell,new THREE.LatheGeometry(profile,48),gold);flatRing(bell,.74,.055,0,-1.15,0,copper);
      add(bell,new THREE.SphereGeometry(.16,12,8),iron,0,-1.09,0);rod(finish,[side*1.2,3.6,0],[side*1.2,4.35,0],.055,iron);bells.push(bell);
      k.lantern(finish,side*3.1,0,.1);
    }
    box(finish,5.9,.32,.65,0,4.4,0,woodLight);rod(finish,[-2.6,4.7,0],[0,5.7,0],.09,gold);rod(finish,[0,5.7,0],[2.6,4.7,0],.09,gold);
    const medal=group(finish,0,4.95,.15);medal.rotation.x=Math.PI/2;
    add(medal,new THREE.CylinderGeometry(.58,.58,.12,48),teal);flatRing(medal,.59,.055,0,.09,0,finaleGlow);roman(medal,'VI',0,.10,0,1.2);
    box(finish,7,.25,1.2,0,-.35,0,wood);
  }
  bake(fixed);bake(hand);
  return {hand,deck,caseRing,signal,update(time,won=false,animationTime=time){
    const p=clockHandPose(time,c);hand.rotation.y=p.angle;hub.rotation.z=-p.angle*2;
    for(const {gear,speed} of gears)gear.rotation.z=time*speed;
    const color={green:0x8be4b6,amber:0xffbd55,red:0xdb7855}[p.signal];signal.color.setHex(color);signal.emissive.setHex(color);
    finaleGlow.emissiveIntensity=won?1.1+Math.sin(animationTime*4)*.3:.2;
    bells.forEach((bell,i)=>bell.rotation.z=won?Math.sin(animationTime*7+i*Math.PI)*.2:0);
  }};
}
