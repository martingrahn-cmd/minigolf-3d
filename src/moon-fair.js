import * as THREE from 'three';
import { modelInstance } from './models.js';
import { compact, tintShared, createCrowd, createPuffs, softTexture, canvasTexture, bakeStatic } from './life-kit.js';

// Månkarnevalen as a living fair. A ring of floating plazas round each moon hole,
// each with its own attraction: a drop tower, a big wheel, a chair swing ride,
// the big top, snack kiosks, game booths with a high striker, a rocket ride and
// a little roller coaster. One-eyed alien visitors hop about the plazas, strings
// of chasing lights hang between the islands, balloons drift up into the dark,
// fireworks burst far behind the course, searchlights sweep the sky, a UFO
// cruises past and now and then a shooting star crosses the stars.
// Tall rides stand behind the course and low ones in front, so the overview
// camera always sees the felt. Nothing here touches the ball.

// Height of a drop-tower seat through its cycle: a slow haul up, a pause at
// the top, a fast drop and a little bounce at the bottom.
export function dropHeight(t,low=1,high=10){
  const c=((t%11)+11)%11;
  if(c<6)return low+(high-low)*(c/6)*(c/6)*(3-2*c/6);
  if(c<7.5)return high;
  if(c<8.4){const k=(c-7.5)/.9;return high-(high-low)*k*k}
  const k=(c-8.4)/2.6;return low+Math.abs(Math.sin(k*Math.PI*3))*(1-k)*.9;
}

// How fast a ride turns, from 0 to 1: it runs, slows to a stop, waits, starts.
export function rideSpeed(t,run=12,stop=5,ease=3){
  const c=((t%(run+stop))+(run+stop))%(run+stop);
  if(c<ease)return c/ease;
  if(c<run-ease)return 1;
  if(c<run)return (run-c)/ease;
  return 0;
}

export function createMoonFair(scene,level,kit){
  if(!level?.tiles||!modelInstance('moon/alien'))return null;
  const {asteroid,tent,ferrisWheel,lantern,material,glowMaterial}=kit;
  let seed=level.id*733+5;const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646};
  const xs=level.tiles.flatMap(t=>[t.x1,t.x2]),zs=level.tiles.flatMap(t=>[t.z1,t.z2]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,rx=(maxX-minX)/2,rz=(maxZ-minZ)/2;
  const near=(x,z,pad)=>level.tiles.some(t=>x>t.x1-pad&&x<t.x2+pad&&z>t.z1-pad&&z<t.z2+pad);
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const statics=new THREE.Group();statics.name='moon-fair';scene.add(statics);
  const place=(parent,name,x,y,z,rot=0,scale=1)=>{const o=modelInstance(name);if(!o)return null;o.position.set(x,y,z);o.rotation.y=rot;o.scale.setScalar(scale);parent.add(o);return o};
  const add=(parent,geometry,mat,x=0,y=0,z=0)=>{const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o};

  // --- Island sites on a ring outside the course. ---
  const sites=[];
  for(let k=0;k<11&&sites.length<8;k++){
    const a=-Math.PI/2+k/11*Math.PI*2+(random()-.5)*.2;
    const x=cx+Math.cos(a)*(rx+15.5),z=cz+Math.sin(a)*(rz+15.5);
    if(near(x,z,9)||sites.some(s=>Math.hypot(s.x-x,s.z-z)<14))continue;
    sites.push({x,z,y:-3+random()*1.4,r:5.6+random()*.8,face:Math.atan2(cx-x,cz-z)});
  }
  // Tall rides behind the course, low ones in front of it.
  const back=sites.filter(s=>s.z<cz).sort((a,b)=>a.x-b.x),front=sites.filter(s=>s.z>=cz).sort((a,b)=>a.x-b.x);
  // Hole 17 has its own big wheel, so its fair gets a second swing ride instead.
  const tall=level.scenery==='ferris'?['swing','drop','bigtop','swing','drop']:['swing','drop','ferris','bigtop','drop'];
  tall.forEach((kind,i)=>{if(back[i])back[i].kind=kind});
  ['kiosks','games','rocket','coaster','kiosks'].forEach((kind,i)=>{if(front[i])front[i].kind=kind});

  // --- The plazas: a rocky underside, a patterned deck, a gold rim of chasing bulbs. ---
  const deckTexture=canvasTexture(256,256,(ctx,w,h)=>{
    ctx.fillStyle='#3b2d6e';ctx.fillRect(0,0,w,h);
    ctx.translate(w/2,h/2);
    for(let i=0;i<16;i++){ctx.fillStyle=i%2?'#4a3a86':'#33275f';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,128,i*Math.PI/8,(i+1)*Math.PI/8);ctx.fill()}
    ctx.strokeStyle='#f2c25c';ctx.lineWidth=3;for(const r of [40,96,122]){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke()}
    ctx.fillStyle='#f2c25c';for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.save();ctx.translate(Math.cos(a)*68,Math.sin(a)*68);ctx.rotate(a);ctx.beginPath();for(let k=0;k<10;k++){const r=k%2?4:10,b=k*Math.PI/5;ctx.lineTo(Math.cos(b)*r,Math.sin(b)*r)}ctx.fill();ctx.restore()}
  });
  deckTexture.wrapS=deckTexture.wrapT=THREE.ClampToEdgeWrapping;
  const deckTop=new THREE.MeshStandardMaterial({map:deckTexture,roughness:.7}),deckSide=material(0x2c2250),rimGold=material(0xf2c25c,{metalness:.5,roughness:.35});
  const bulbA=glowMaterial(0xffd27a,1.6),bulbB=glowMaterial(0xff8fc8,1.6);bulbB.name='bulb-b';
  const bulbGeometry=new THREE.SphereGeometry(.11,6,5);
  for(const s of sites){
    const rock=asteroid(statics,s.x,s.y-s.r*.8,s.z,s.r*.78,Math.round(s.x*7+s.z*3));rock.scale.set(1.2,.6,1.2);
    add(statics,new THREE.CylinderGeometry(s.r,s.r*.9,.5,32),deckSide,s.x,s.y,s.z);
    const top=add(statics,new THREE.CircleGeometry(s.r*.97,48),deckTop,s.x,s.y+.26,s.z);top.rotation.x=-Math.PI/2;
    const rim=add(statics,new THREE.TorusGeometry(s.r,.09,6,64),rimGold,s.x,s.y+.27,s.z);rim.rotation.x=Math.PI/2;
    const n=Math.round(s.r*5);
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2;add(statics,bulbGeometry,i%2?bulbB:bulbA,s.x+Math.cos(a)*s.r,s.y+.38,s.z+Math.sin(a)*s.r).castShadow=false}
    for(const side of [-1,1]){const a=s.face+Math.PI/2+side*.9;lantern(statics,s.x+Math.sin(a)*(s.r-.7),s.y+.25,s.z+Math.cos(a)*(s.r-.7),2.2)}
  }

  // --- Strings of chasing lights between neighbouring islands. ---
  const ring=[...sites].sort((a,b)=>Math.atan2(a.z-cz,a.x-cx)-Math.atan2(b.z-cz,b.x-cx));
  const cord=material(0x2c2250);
  ring.forEach((a,i)=>{
    const b=ring[(i+1)%ring.length];if(a===b||Math.hypot(a.x-b.x,a.z-b.z)>32)return;
    const from=new THREE.Vector3(a.x,a.y+3.2,a.z),to=new THREE.Vector3(b.x,b.y+3.2,b.z),mid=from.clone().lerp(to,.5);mid.y-=2.4;
    for(const p of [from,to])add(statics,new THREE.CylinderGeometry(.06,.08,3,6),cord,p.x,p.y-1.6,p.z);
    const curve=new THREE.QuadraticBezierCurve3(from,mid,to);
    add(statics,new THREE.TubeGeometry(curve,20,.025,4,false),cord).castShadow=false;
    const count=Math.round(from.distanceTo(to)/1.1);
    for(let k=1;k<count;k++){const p=curve.getPoint(k/count);add(statics,bulbGeometry,k%2?bulbB:bulbA,p.x,p.y-.12,p.z).castShadow=false}
  });

  // --- The attractions. ---
  const rides=[],stripes=[0xd5485b,0x3fbfb2,0x6c4bb0,0xf2c25c];
  const groupAt=(s,parent=scene)=>{const g=new THREE.Group();g.position.set(s.x,s.y+.25,s.z);g.rotation.y=s.face;parent.add(g);return g};
  for(const [i,s] of sites.entries()){
    if(s.kind==='drop'){
      const tower=place(groupAt(s),'moon/drop-tower',0,0,0);let seat=null;tower?.traverse(n=>{if(n.name==='seat')seat=n});
      compact(tower,['seat']);compact(seat);rides.push({kind:'drop',seat,phase:random()*11});s.ringR=s.r-1.2;
    }
    if(s.kind==='swing'){
      const ride=place(groupAt(s),'moon/swing-ride',0,0,0);let spin=null;const arms=[];
      ride?.traverse(n=>{if(n.name==='spin')spin=n;if(n.name.startsWith('arm-'))arms.push(n)});
      arms.forEach(a=>compact(a));compact(spin,arms.map(a=>a.name));compact(ride,['spin']);
      rides.push({kind:'swing',spin,arms,angle:0,phase:random()*17});s.ringR=s.r-.8;
    }
    if(s.kind==='ferris'){
      const g=groupAt(s);const wheel=ferrisWheel(g,0,0,-.5,4.6);
      // Merge the wheel's many beams and bulbs: the frame, the turning wheel and each gondola.
      wheel.wheel.name='wheel';wheel.gondolas.forEach((o,k)=>{o.name=`gondola-${k}`;compact(o)});compact(wheel.wheel,wheel.gondolas.map(o=>o.name));compact(g,['wheel']);
      rides.push({kind:'ferris',...wheel});s.ringR=s.r-1;
    }
    if(s.kind==='bigtop'){tent(groupAt(s,statics),0,0,0,3.3,5.4);s.ringR=s.r-1}
    if(s.kind==='kiosks'){
      const g=groupAt(s,statics);
      for(const [k,dx] of [[0,-2.4],[1,2.4]]){const o=place(g,'moon/kiosk',dx,0,-.6,k?-.25:.25);if(o)tintShared(o,{Stripe:stripes[(i+k)%stripes.length]})}
      s.ringR=s.r-1.1;s.balloons=true;
    }
    if(s.kind==='games'){
      const g=groupAt(s,statics);
      for(const [k,dx] of [[0,-2.3],[1,2.3]]){const o=place(g,'moon/booth',dx,0,-.9,k?-.3:.3);if(o)tintShared(o,{Stripe:stripes[(i+k+1)%stripes.length]})}
      // A high striker: hit the pad and the puck shoots up the pole to the bell.
      const pole=new THREE.Group();pole.position.set(s.x,s.y+.25,s.z);pole.rotation.y=s.face;scene.add(pole);
      const ivory=material(0xf4e8d2),red=material(0xd5485b);
      add(statics,new THREE.BoxGeometry(.3,4.4,.18),ivory,0,0,0).position.copy(new THREE.Vector3(0,2.2,-2.2).applyAxisAngle(new THREE.Vector3(0,1,0),s.face).add(pole.position));
      for(let k=0;k<6;k++)add(statics,new THREE.BoxGeometry(.34,.06,.2),k%2?red:rimGold).position.copy(new THREE.Vector3(0,.8+k*.6,-2.12).applyAxisAngle(new THREE.Vector3(0,1,0),s.face).add(pole.position));
      add(statics,new THREE.SphereGeometry(.28,12,8),rimGold).position.copy(new THREE.Vector3(0,4.6,-2.2).applyAxisAngle(new THREE.Vector3(0,1,0),s.face).add(pole.position));
      const puck=add(pole,new THREE.BoxGeometry(.24,.14,.14),glowMaterial(0xff8fc8,1.4),0,.4,-2.05);
      rides.push({kind:'striker',puck,phase:random()*5});s.ringR=s.r-1;
    }
    if(s.kind==='rocket'){
      const ride=place(groupAt(s),'moon/rocket-ride',0,0,0);let spin=null;const arms=[];
      ride?.traverse(n=>{if(n.name==='spin')spin=n;if(n.name.startsWith('arm-'))arms.push(n)});
      arms.forEach(a=>compact(a));compact(spin,arms.map(a=>a.name));compact(ride,['spin']);
      rides.push({kind:'rocket',spin,arms,angle:0,phase:random()*17});s.ringR=s.r-.9;
    }
    if(s.kind==='coaster'){
      // A little looping track with hills, and three cars chasing round it.
      const g=groupAt(s),steel=material(0xd8d2e8,{metalness:.5,roughness:.35}),pts=[[],[]],at=t=>new THREE.Vector3(Math.cos(t)*3.6,1.5+Math.sin(t*2)*1.0+Math.sin(t)*.3,Math.sin(t)*2.3);
      for(let k=0;k<96;k++){
        const t=k/96*Math.PI*2,p=at(t),q=at(t+.01).sub(p).normalize(),side=new THREE.Vector3(-q.z,0,q.x).normalize();
        pts[0].push(p.clone().addScaledVector(side,.32));pts[1].push(p.clone().addScaledVector(side,-.32));
        if(k%8===0)add(g,new THREE.CylinderGeometry(.06,.06,p.y,6),steel,p.x,p.y/2,p.z);
      }
      for(const line of pts)add(g,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(line,true),96,.05,5,true),material(0xd5485b));
      const cars=[0,1,2].map(k=>{const car=compact(place(g,'moon/coaster-car',0,0,0));if(car)car.name=`car-${k}`;return car});compact(g,['car-0','car-1','car-2']);
      rides.push({kind:'coaster',cars,at,t:random()*6});s.ringR=s.r-.9;
    }
  }

  // --- Alien visitors, three to an island, hopping round the plazas. ---
  const skins=[0x7fdc8a,0xff9fd0,0x8fd3ff,0xffe066,0xc9a0ff,0xff9f6a];
  const visitors=[],perSite=3,crowd=createCrowd(scene,'moon/alien',sites.length*perSite,{Skin:skins});
  if(crowd)sites.forEach((s,i)=>{for(let k=0;k<perSite;k++)visitors.push({i:visitors.length,site:s,a:k/perSite*Math.PI*2+random(),speed:(random()<.5?-1:1)*(.18+random()*.12),phase:random()*12,object:Object.assign(new THREE.Object3D(),{}),scale:.8+random()*.35})});
  const poseVisitor=(v,time,dt)=>{
    const cycle=(time+v.phase)%12,walking=cycle<8;if(walking)v.a+=v.speed*dt;
    const s=v.site,r=s.ringR??s.r-1;
    v.object.position.set(s.x+Math.cos(v.a)*r,s.y+.25+(walking?Math.abs(Math.sin(time*6+v.phase))*.22:0),s.z+Math.sin(v.a)*r);
    const dir=Math.sign(v.speed);v.object.rotation.y=walking?Math.atan2(-Math.sin(v.a)*dir,Math.cos(v.a)*dir):Math.atan2(cx-v.object.position.x,cz-v.object.position.z)+Math.sin(time*.8+v.phase)*.4;
    v.object.scale.setScalar(v.scale);crowd.set(v.i,v.object);
  };
  for(const v of visitors)poseVisitor(v,0,0);crowd?.commit();

  // --- Balloons drifting up from the kiosk islands. ---
  const balloonGeometry=new THREE.SphereGeometry(.42,12,10);balloonGeometry.scale(1,1.18,1);
  const balloonColors=[0xff8fc8,0x8fd3ff,0xffe066,0x7fdc8a,0xff9f6a,0xc9a0ff];
  const launch=sites.filter(s=>s.balloons).concat(sites).slice(0,3),balloons=[];
  for(let k=0;k<9;k++){
    const g=new THREE.Group();scene.add(g);
    add(g,balloonGeometry,material(balloonColors[k%balloonColors.length],{roughness:.3,flatShading:false})).castShadow=false;
    add(g,new THREE.CylinderGeometry(.008,.008,1.4,3),material(0xf4e8d2),0,-1.15,0).castShadow=false;
    balloons.push({g,from:launch[k%launch.length],t:k*3.1,period:28,dx:random()-.5,dz:random()-.5});
  }

  // --- Sky: fireworks, searchlights, a UFO, shooting stars. ---
  const soft=softTexture();
  const sparks=[0xffd27a,0xff8fc8,0x7fffe0].map(color=>createPuffs(scene,{count:260,color,size:.55,opacity:.95,life:1.7,gravity:1.4,grow:.3,texture:soft,additive:true}));
  const trail=createPuffs(scene,{count:80,color:0xffe6b0,size:.35,opacity:.8,life:.6,grow:.2,texture:soft,additive:true});
  const shells=[];let nextShell=1.5;
  const beamTexture=canvasTexture(4,64,(ctx,w,h)=>{const g=ctx.createLinearGradient(0,h,0,0);g.addColorStop(0,'rgba(220,210,255,.5)');g.addColorStop(1,'rgba(220,210,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)});
  const searchlights=back.slice(0,2).map((s,k)=>{
    const pivot=new THREE.Group();pivot.position.set(s.x,s.y+.3,s.z);scene.add(pivot);
    const cone=new THREE.Mesh(new THREE.CylinderGeometry(3.2,.2,46,16,1,true),new THREE.MeshBasicMaterial({map:beamTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,opacity:.5}));
    cone.position.y=23;cone.castShadow=false;pivot.add(cone);return {pivot,phase:k*2.2};
  });
  const ufo=place(scene,'moon/ufo',cx,18,cz-24);ufo?.traverse(o=>{o.castShadow=false});if(ufo)compact(ufo);
  const tractor=ufo?new THREE.Mesh(new THREE.CylinderGeometry(.6,2.6,9,20,1,true),new THREE.MeshBasicMaterial({color:0x7fffe0,transparent:true,opacity:.14,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide})):null;
  if(tractor){tractor.position.y=-5;ufo.add(tractor)}
  const streakTexture=canvasTexture(64,4,(ctx,w,h)=>{const g=ctx.createLinearGradient(0,0,w,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,250,230,1)');ctx.fillStyle=g;ctx.fillRect(0,0,w,h)});
  const streak=new THREE.Mesh(new THREE.PlaneGeometry(14,.25),new THREE.MeshBasicMaterial({map:streakTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0}));
  streak.castShadow=false;scene.add(streak);let streakAt={t:-99,from:new THREE.Vector3(),dir:new THREE.Vector3()};

  bakeStatic(statics);

  let last=null;
  const v=new THREE.Vector3(),fwd=new THREE.Vector3(),up=new THREE.Vector3(),side=new THREE.Vector3(),basis=new THREE.Matrix4();
  return {update(time){
    if(reducedMotion)return;
    const dt=last===null?1/60:Math.min(.1,Math.max(0,time-last));last=time;
    // Chasing lights.
    const chase=Math.sin(time*5)>0;bulbA.emissiveIntensity=chase?2.2:.7;bulbB.emissiveIntensity=chase?.7:2.2;
    for(const r of rides){
      if(r.kind==='drop'&&r.seat)r.seat.position.y=dropHeight(time+r.phase);
      if(r.kind==='swing'&&r.spin){const s=rideSpeed(time+r.phase);r.angle+=s*1.1*dt;r.spin.rotation.y=r.angle;for(const a of r.arms)a.rotation.z=s*.62}
      if(r.kind==='rocket'&&r.spin){const s=rideSpeed(time+r.phase,14,5,3);r.angle+=s*1.3*dt;r.spin.rotation.y=r.angle;r.arms.forEach((a,k)=>{a.rotation.z=s*(.15+.22*Math.sin(time*1.1+k*1.7))})}
      if(r.kind==='ferris'){r.wheel.rotation.z=time*.12;for(const g of r.gondolas)g.rotation.z=-r.wheel.rotation.z}
      if(r.kind==='striker'){const c=(time+r.phase)%5,k=c<.5?Math.sin(c/.5*Math.PI/2):c<1.5?1-((c-.5)):0;r.puck.position.y=.4+Math.max(0,k)*3.9}
      if(r.kind==='coaster'){
        const p0=r.at(r.t),slope=r.at(r.t+.02).y-p0.y;r.t+=dt*(.75-slope*6);
        r.cars.forEach((car,k)=>{
          if(!car)return;const t=r.t-k*.42,p=r.at(t);fwd.copy(r.at(t+.02)).sub(p).normalize();
          side.crossVectors(fwd,up.set(0,1,0)).normalize();up.crossVectors(side,fwd);basis.makeBasis(fwd,up,side);
          car.position.copy(p).addScaledVector(up,.05);car.quaternion.setFromRotationMatrix(basis);car.scale.setScalar(.75);
        });
      }
    }
    if(crowd){for(const vis of visitors)poseVisitor(vis,time,dt);crowd.commit()}
    for(const b of balloons){
      const t=((time+b.t)%b.period)/b.period,s=b.from;
      b.g.position.set(s.x+b.dx*3+Math.sin(time*.7+b.t)*.6*t*4,s.y+2+t*34,s.z+b.dz*3+Math.cos(time*.5+b.t)*.6*t*4);
      b.g.rotation.z=Math.sin(time*1.3+b.t)*.15;b.g.visible=t<.97;
    }
    // Fireworks: a shell climbs, then bursts into a ball of sparks.
    nextShell-=dt;
    if(nextShell<=0){nextShell=2.2+Math.random()*2.6;shells.push({p:new THREE.Vector3(cx+(Math.random()-.5)*70,-4,minZ-30-Math.random()*30),vy:18+Math.random()*5,fuse:1.1+Math.random()*.4,color:Math.floor(Math.random()*3)})}
    for(let i=shells.length-1;i>=0;i--){
      const s=shells[i];s.fuse-=dt;s.p.y+=s.vy*dt;trail.emit(s.p.x,s.p.y,s.p.z,0,-1,0);
      if(s.fuse<=0){window.dispatchEvent(new CustomEvent('fair-burst',{detail:{x:s.p.x-cx}}));for(let k=0;k<60;k++){v.randomDirection().multiplyScalar(5+Math.random()*2.5);sparks[s.color].emit(s.p.x,s.p.y,s.p.z,v.x,v.y,v.z)}shells.splice(i,1)}
    }
    for(const s of sparks)s.update(dt);trail.update(dt);
    for(const l of searchlights){l.pivot.rotation.set(Math.sin(time*.23+l.phase)*.5,0,Math.cos(time*.19+l.phase)*.45-.15)}
    if(ufo){
      const a=time*.06;ufo.position.set(cx+Math.cos(a)*28,17+Math.sin(time*.8)*.6,cz-26+Math.sin(a)*9);
      ufo.rotation.set(Math.sin(time*.9)*.06,time*.5,Math.cos(time*.7)*.06);
      tractor.material.opacity=.08+Math.max(0,Math.sin(time*.4))*.14;
    }
    if(time-streakAt.t>7+Math.random()*4){
      streakAt={t:time,from:new THREE.Vector3(cx-60+Math.random()*80,55+Math.random()*25,-110),dir:new THREE.Vector3(1,-.35,0).normalize()};
      streak.rotation.z=Math.atan2(streakAt.dir.y,streakAt.dir.x);
    }
    const st=time-streakAt.t;streak.position.copy(streakAt.from).addScaledVector(streakAt.dir,st*70);streak.material.opacity=st<1.2?Math.sin(st/1.2*Math.PI):0;
  }};
}
