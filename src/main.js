import * as THREE from 'three';
import { createCourse, LEVEL, LEVELS, START, CUP, CANNON, LANDING, PIPE_IN, PIPE_OUT, SPRINGS, SPINNER, onCourse, heightAt, heightSlope, heightSlopeZ, frictionAt } from './course.js';
import { BALL_RADIUS, PERFECT_ZONE, perfectZone, powerAt, precisionAt, shotError, shotSpeed, shouldSink, collideWalls, collideSpinner, collidePipe, entersPipe, springImpulse, collideBumper } from './mechanics.js';
import { createLoopTrack, enterLoop, stepLoop } from './loop.js';
import { onBridge, stepBridge, leavesBridge, bridgeFlight, flightPosition } from './bridge.js';
import { advanceGate, collideGate } from './gates.js';
import { trapdoorAt, supportedByTrapdoors } from './trapdoors.js';
import { collidePendulum } from './pendulum.js';
import { trampolineFlight, throughHoop, createPinRack, knockPin, advancePins } from './carnival.js';
import { themeFor } from './environment.js';
import { createGolfBall } from './ball.js';
import * as activeLayout from './layout.js';
import { puttingContext, puttSpeed } from './putting.js';
import { entersFunnel,createFunnelTrack,startFunnelRide,sampleFunnelRide } from './funnel.js';
import { createTubeCameraRail,tubeCameraPose,tubeCameraBlend } from './tube-camera.js';
import {createBellBridgeState,stepBellBridge,strikeBell,collideBellBridge,restoreBellBridge} from './bell-bridge.js';
import {createLiftState,liftPose,tryBoardLift,stepLift,liftBarriers,restoreLift} from './lift.js';
import {collideClockWheel,wheelSignal} from './clock-wheel.js';
import {clockHandPose,inClockWell,supportedByClockHand,carryOnClockHand} from './clock-hand.js';
import './style.css';

const $=id=>document.getElementById(id);
const canvas=$('game');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=LEVEL.theme==='forest'?1:1.1;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(54,1,.08,200);
const overviewCamera=new THREE.OrthographicCamera(-25,25,14,-14,.1,200);
const clock=new THREE.Clock();
const pointer=new THREE.Vector2();
const raycaster=new THREE.Raycaster();
const aimPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const cameraRig=LEVEL.theme==='clockwork'?{back:11,height:9,ahead:7}:LEVEL.theme==='forest'?{back:10.5,height:9.5,ahead:5.5}:{back:8.5,height:8,ahead:3.4};
const cameraTarget=new THREE.Vector3(START.x+cameraRig.ahead,.2,0);
const cameraPosition=new THREE.Vector3(START.x-cameraRig.back,cameraRig.height,0);
camera.position.copy(cameraPosition);
camera.lookAt(cameraTarget);
overviewCamera.position.set(LEVEL.overview.x+(LEVEL.overview.cameraX||0),31,LEVEL.overview.z+42);
overviewCamera.lookAt(LEVEL.overview.x,LEVEL.overview.targetY||0,LEVEL.overview.z);
let cameraOverview=false;
let draggingAim=false;
let lastPointerX=0;
let pointerDownX=0,pointerDownY=0;
let nearPutt=null,puttEnabled=false,puttLength=1;
let course;
let forestRenderer;
let audioEnabled=true;
let audioContext;
let toastTimer;
const aimKeys=new Set();
let pipeCooldown=0;
const springCooldowns=SPRINGS.map(()=>0);
const gates=LEVEL.gates||[];
const gateClocks=gates.map(()=>0);
let pendulumTime=0,pendulumHitCooldown=0,crownTime=0;
let elapsed=0;
let accumulator=0;
let bridgeAngle=LEVEL.bridge?.maxAngle||0;
let launch=null;
const pinRack=createPinRack(LEVEL.pins),pinStates=pinRack.states;
let hoopHit=false;
let shotKick=0;
const liftState=createLiftState();
const surfaceHeight=(x,z)=>heightAt(x,z,bridgeAngle,LEVEL.lift?liftPose(liftState,LEVEL.lift).y:undefined);
const loopTrack=createLoopTrack(LEVEL.loop);
let loopRide=null,loopPosition=null;
const funnelTrack=createFunnelTrack(LEVEL.funnel);
let funnelRide=null,funnelPosition=null;
const tubeCameraRail=createTubeCameraRail(funnelTrack),bellBridgeState=createBellBridgeState();
let tubeCameraEntry=null,tubeCameraRecovery=0;
const reducedCameraMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state={phase:'intro',x:START.x,z:START.z,vx:0,vz:0,aim:0,power:0,needle:0,accuracy:0,strokes:0,shotAge:0,settle:0,flight:0,fall:0,fallX:0,fallZ:0,fallY:0,saved:{...START},pipe:0,boost:0,meterStart:0,accuracyStart:0};
const ball=new THREE.Group();
const ballCore=createGolfBall();
ball.add(ballCore);scene.add(ball);
const rollAxis=new THREE.Vector3();
const ballShadow=new THREE.Mesh(new THREE.CircleGeometry(.33,32),new THREE.MeshBasicMaterial({color:0x255665,transparent:true,opacity:.13,depthWrite:false}));
ballShadow.rotation.x=-Math.PI/2;scene.add(ballShadow);
const halo=new THREE.Mesh(new THREE.RingGeometry(.45,.475,48),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));
halo.rotation.x=-Math.PI/2;scene.add(halo);

const aimGroup=new THREE.Group();scene.add(aimGroup);
const aimDots=[];
for(let i=0;i<16;i++){
  const dot=new THREE.Mesh(new THREE.SphereGeometry(.047+i*.001,8,6),new THREE.MeshBasicMaterial({color:i<8?0xffffff:0xffd268,transparent:true,opacity:.85-i*.03,depthWrite:false}));
  aimGroup.add(dot);aimDots.push(dot);
}
const arrowGeo=new THREE.BufferGeometry();arrowGeo.setAttribute('position',new THREE.Float32BufferAttribute([.37,0,0,-.35,0,.27,-.35,0,-.27],3));arrowGeo.setIndex([0,1,2]);arrowGeo.computeVertexNormals();
const aimArrow=new THREE.Mesh(arrowGeo,new THREE.MeshBasicMaterial({color:0xffe3a1,side:THREE.DoubleSide,depthWrite:false}));aimGroup.add(aimArrow);

const trail=Array.from({length:16},()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),new THREE.MeshBasicMaterial({color:0x9effed,transparent:true,opacity:0,depthWrite:false}));scene.add(m);return m});
let trailCursor=0,trailTimer=0;
const particles=[];
function burst(x,y,z,color=0xffdb77,count=16,force=1){
  for(let i=0;i<count;i++){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.055+Math.random()*.065,7,6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}));
    mesh.position.set(x,y,z);scene.add(mesh);
    const a=Math.random()*Math.PI*2;
    particles.push({mesh,vx:Math.cos(a)*(1.2+Math.random()*3)*force,vy:(1+Math.random()*3)*force,vz:Math.sin(a)*(1.2+Math.random()*3)*force,life:.55+Math.random()*.5,max:1});
  }
}
function sound(freq=440,duration=.13,type='sine',vol=.055,slide=1){
  if(!audioEnabled)return;
  try{
    audioContext??=new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume();
    const osc=audioContext.createOscillator(),gain=audioContext.createGain();
    const t=audioContext.currentTime;osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+duration);
    gain.gain.setValueAtTime(vol,t);gain.gain.exponentialRampToValueAtTime(.001,t+duration);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start(t);osc.stop(t+duration);
  }catch{}
}
function toast(text,ms=2000){
  const el=$('toast');el.textContent=text;el.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),ms);
}
function setPhase(phase){
  const previous=state.phase;state.phase=phase;
  if(phase==='idle'&&previous!=='idle'){
    nearPutt=puttingContext(state,activeLayout);puttEnabled=!!nearPutt;
  }
  updateUI();
}
function updateUI(){
  $('strokeCount').textContent=state.strokes;
  $('bestScore').textContent=localStorage.getItem(LEVEL.recordKey)||'–';
  const names={idle:'Sikta',power:'Välj kraft',accuracy:'Träffa grönt',moving:'Bollen rullar',looping:'Runt i roten!',cannon:'Flygtur!',pipe:'Rörpost!',funnel:'Specialleverans!',elevator:'Nästa våning!',bridgeflight:'Luft under bollen!',drumflight:'Skybowling!',falling:'Oj då!',win:'I hålet!'};
  $('controlTitle').textContent=names[state.phase]||'Sikta';
  const actions={idle:'Starta',power:'Lås kraft',accuracy:'Slå!',moving:'Rullar…',looping:'Loopar…',cannon:'Flyger…',pipe:'Rörpost…',funnel:'På väg…',elevator:'Åker upp…',bridgeflight:'Flyger…',drumflight:'Flyger…',falling:'Vänta…',win:'Klart!'};
  $('actionText').textContent=actions[state.phase]||'Starta';
  const busy=!['idle','power','accuracy'].includes(state.phase);
  $('actionButton').disabled=busy;
  $('controlPanel').classList.toggle('busy',busy);
  $('app').classList.toggle('overview',cameraOverview);
  $('meter').classList.toggle('accuracy',state.phase==='accuracy');
  $('meterStatus').textContent={idle:cameraOverview?'Klicka på banan för att sikta':'Dra för att sikta · A / D finjusterar',power:'Mjukt ← kraft → hårt · Esc avbryter',accuracy:state.power<.3?'Mjuk putt · större grönt fält':'Pricka mitten · hårda slag kräver precision',moving:'Nästa slag när bollen stannar',looping:'Farten avgör om du når runt',cannon:'Över gapet mot flaggan',pipe:'På väg till kanonen',bridgeflight:'Nästa stopp: flippergreen',drumflight:'Genom ringen – mot käglorna!',falling:'+1 pliktslag',win:'Flaggan är din!'}[state.phase]||'';
  if(state.phase==='funnel')$('meterStatus').textContent='Tryckluften lyfter dig till postterrassen';
  if(state.phase==='elevator')$('meterStatus').textContent='Motvikterna tar dig till balkongen';
  const putting=puttEnabled&&state.phase==='idle';
  $('puttControls').hidden=!putting;$('meter').hidden=putting;
  $('shotMode').hidden=!nearPutt||state.phase!=='idle';
  $('shotMode').textContent=putting?'Fullt slag':'Närputt';
  if(putting){
    $('controlTitle').textContent='Närputt';$('actionText').textContent='Putta';
    $('puttDistance').textContent=`${nearPutt.distance.toFixed(1).replace('.',',')} m till hålet`;
    $('puttLength').value=puttLength;
    $('puttOutput').textContent=`${puttLength.toFixed(1).replace('.',',')} m`;
    $('meterStatus').textContent='Klicka på hålet för att sikta · välj rulllängd';
  }
}
function action(){
  if(state.phase==='idle'){
    if(puttEnabled){state.accuracy=0;state.power=0;shoot(puttSpeed(puttLength,nearPutt.friction));return}
    setPhase('power');state.power=0;state.meterStart=elapsed;sound(530,.08,'triangle',.04,1.2);
  }else if(state.phase==='power'){
    if(state.power<.01)state.power=.01;
    setPhase('accuracy');state.needle=-1;state.accuracyStart=elapsed;sound(720,.08,'triangle',.04,.85);
  }else if(state.phase==='accuracy'){
    state.accuracy=state.needle;
    shoot();
  }
}
function shoot(puttingSpeed){
  pinRack.beginShot();
  bellBridgeState.savedOpen=bellBridgeState.open;
  liftState.savedTop=liftState.mode==='top';
  const error=shotError(state.accuracy,state.power);
  shotKick=state.power>.8?1:0;
  const angle=state.aim+error;
  const speed=puttingSpeed??shotSpeed(state.power);
  state.vx=Math.cos(angle)*speed;state.vz=Math.sin(angle)*speed;
  state.strokes++;state.shotAge=0;state.settle=0;
  if(!trapdoorAt(state.x,state.z,LEVEL.trapdoors)&&!inClockWell(state.x,state.z,LEVEL.clockHand))state.saved={x:state.x,z:state.z};
  $('strokeCount').textContent=state.strokes;
  setPhase('moving');
  sound(170,.22,'triangle',.16,2.25);
  sound(68,.18,'sine',.13,.55);
  burst(state.x,.25+surfaceHeight(state.x,state.z),state.z,0xffffff,8,.45);
  if(puttingSpeed!==undefined)toast('Mjuk putt',900);
  else if(Math.abs(state.accuracy)<=perfectZone(state.power))toast(state.power>.82?'SUPERTRÄFF! ✦':'PERFEKT TRÄFF! ✦',1300);
  else if(Math.abs(error)>.06)toast(`SNETT SLAG · ${Math.abs(error*180/Math.PI).toFixed(1)}°`,1300);
}
function reset(full=true){
  state.x=START.x;state.z=START.z;state.vx=0;state.vz=0;state.aim=0;state.power=0;state.needle=0;state.flight=0;state.pipe=0;state.fall=0;state.boost=0;state.strokes=full?0:state.strokes;
  pipeCooldown=0;springCooldowns.fill(0);gateClocks.fill(0);bridgeAngle=LEVEL.bridge?.maxAngle||0;launch=null;shotKick=0;ball.visible=true;ballCore.quaternion.identity();
  pinRack.reset();course?.carnival?.reset();hoopHit=false;
  pendulumTime=0;pendulumHitCooldown=0;crownTime=0;
  loopRide=null;loopPosition=null;state.saved={...START};
  funnelRide=null;funnelPosition=null;
  tubeCameraEntry=null;tubeCameraRecovery=0;camera.up.set(0,1,0);
  Object.assign(bellBridgeState,createBellBridgeState());
  Object.assign(liftState,createLiftState());
  nearPutt=null;puttEnabled=false;puttLength=1;
  cameraOverview=false;$('cameraText').textContent='Översikt';
  setPhase('idle');
  if(full)toast('Ny chans! Sikta mot flaggan.');
}
function doFall(fromHeight=surfaceHeight(state.x,state.z),reason){
  if(state.phase==='falling')return;
  state.fall=0;state.fallY=fromHeight;state.fallX=state.x;state.fallZ=state.z;state.vx=0;state.vz=0;setPhase('falling');
  sound(250,.45,'sawtooth',.035,.28);toast(reason||(LEVEL.theme==='forest'?'Ner i molnen! +1 pliktslag':'Plums! +1 pliktslag'),1800);
  burst(state.x,0,state.z,0x9ce8ef,20,1.1);
}
function startCannon(){
  state.flight=0;state.vx=0;state.vz=0;setPhase('cannon');
  toast('KANONSKOTT! 🚀',1700);
  sound(110,.42,'sawtooth',.13,2.8);sound(70,.55,'triangle',.15,.3);
  burst(CANNON.x,1.1,CANNON.z,0xffbf5d,30,1.4);
}
function startPipe(){
  state.pipe=0;
  state.vx=0;state.vz=0;pipeCooldown=3;setPhase('pipe');
  toast('RÖRPOST! ✦',1500);sound(380,.36,'sine',.07,1.8);
  burst(PIPE_IN.x,.5,PIPE_IN.z,0x66dbed,19,1);
}
function win(){
  setPhase('win');state.vx=0;state.vz=0;
  const best=Number(localStorage.getItem(LEVEL.recordKey))||Infinity;
  if(state.strokes<best)localStorage.setItem(LEVEL.recordKey,String(state.strokes));
  updateUI();
  $('winStrokes').textContent=state.strokes;
  $('winTitle').innerHTML=state.strokes===1?'HOLE IN<br><em>ONE!</em>':state.strokes<=LEVEL.par-2?'EAGLE!<br><em>✦ ✦ ✦</em>':state.strokes===LEVEL.par-1?'BIRDIE!<br><em>✦ ✦</em>':state.strokes===LEVEL.par?'PÅ PAR!<br><em>✦</em>':'I MÅL<br><em>SNYGGT!</em>';
  $('winText').textContent=state.strokes<LEVEL.par?`Du slog par med ${LEVEL.par-state.strokes} slag. Snyggt jobbat!`:state.strokes===LEVEL.par?'Precis på par. En stark runda!':'Flaggan är din – dags för ett nytt försök?';
  if(LEVEL.worldFinale)$('winText').textContent+=' Du klarade Urverkets final!';
  $('win').classList.remove('hidden');
  burst(CUP.x,.6,CUP.z,0xffd264,55,1.7);burst(CUP.x,.6,CUP.z,0xf47761,30,1.2);
  sound(440,.18,'triangle',.08,1.5);setTimeout(()=>sound(660,.25,'triangle',.08,1.6),150);setTimeout(()=>sound(880,.42,'triangle',.08,1.3),310);
}

function celebratePins(indices){
  if(!indices.length||state.phase==='falling')return;
  const count=pinStates.filter(pin=>pin.down).length;
  for(const i of indices){
    const pin=LEVEL.pins[i];burst(pin.x,.7,pin.z,0xffa5d3,10,.7);
  }
  sound(320+count*70,.14,'triangle',.08,1.5);
  if(state.phase!=='win')toast(count===pinStates.length?'ALLA KÄGLOR! ✦':`${count} / ${pinStates.length} KÄGLOR!`,1100);
  if(count===pinStates.length)course?.carnival?.celebrate();
}
function physics(dt){
  stepBellBridge(bellBridgeState,dt,LEVEL.bellBridge);
  if(['idle','power','accuracy','moving'].includes(state.phase)&&tryBoardLift(state,liftState,LEVEL.lift,dt)){
    setPhase('elevator');toast('NÄSTA VÅNING! ↑',1800);sound(165,.6,'triangle',.07,1.8);return;
  }
  celebratePins(advancePins(pinStates,dt,LEVEL.pins));
  gates.forEach((gate,i)=>{gateClocks[i]=advanceGate(gateClocks[i],dt,state,gate)});
  bridgeAngle=stepBridge(bridgeAngle,state,LEVEL.bridge,dt);
  if(['idle','power','accuracy','moving'].includes(state.phase))carryOnClockHand(state,crownTime,crownTime+dt,LEVEL.clockHand);
  if(!['intro','win'].includes(state.phase))crownTime+=dt;
  if(['idle','power','accuracy','moving'].includes(state.phase)&&!supportedByClockHand(state.x,state.z,crownTime,LEVEL.clockHand)){doFall(undefined,'Ner i urverket! +1 pliktslag');return}
  if(['idle','power','accuracy','moving'].includes(state.phase)&&!supportedByTrapdoors(state.x,state.z,crownTime,LEVEL.trapdoors)){doFall(undefined,'Rotluckan öppnades! +1 pliktslag');return}
  pendulumTime+=dt;pendulumHitCooldown=Math.max(0,pendulumHitCooldown-dt);
  // A ball parked in the swing's path remains physical, including while aiming.
  if(['idle','power','accuracy'].includes(state.phase)&&collidePendulum(state,LEVEL.pendulum,pendulumTime)){
    state.shotAge=0;state.settle=0;setPhase('moving');pendulumFeedback();
  }
  if(SPINNER?.custom==='thorn'&&['idle','power','accuracy'].includes(state.phase)&&collideSpinner(state,crownTime*SPINNER.speed)){
    state.shotAge=0;state.settle=0;setPhase('moving');
    sound(140,.12,'triangle',.07);toast('TÖRNHJULET!',900);
  }
  if(['idle','power','accuracy'].includes(state.phase)&&collideClockWheel(state,state,crownTime,LEVEL.clockWheel)){
    state.shotAge=0;state.settle=0;setPhase('moving');
  }
  if(state.phase==='moving'){
    state.shotAge+=dt;
    const slope=heightSlope(state.x,state.z,bridgeAngle);
    state.vx-=slope*6.9*dt;
    state.vz-=heightSlopeZ(state.x,state.z)*6.9*dt;
    const friction=Math.exp(-(onBridge(state.x,state.z,LEVEL.bridge)?.38:onCourse(state.x,state.z)?frictionAt(state.x,state.z):1.7)*dt);
    state.vx*=friction;state.vz*=friction;
    const previous={x:state.x,z:state.z};
    state.x+=state.vx*dt;state.z+=state.vz*dt;
    if(entersFunnel(previous,state,LEVEL.funnel)){
      funnelRide=startFunnelRide(state,LEVEL.funnel);funnelPosition=sampleFunnelRide(funnelRide,funnelTrack);
      tubeCameraEntry={position:cameraPosition.clone(),target:cameraTarget.clone(),up:camera.up.clone()};
      state.vx=0;state.vz=0;setPhase('funnel');
      toast('SPECIALLEVERANS! ✦',1600);sound(210,.65,'sine',.09,3.2);
      burst(state.x,surfaceHeight(state.x,state.z)+.35,state.z,0x9befe1,16,.5);return;
    }
    const entering=enterLoop(previous,state,loopTrack);
    if(entering){
      loopRide=entering;loopPosition=loopTrack.sample(loopRide.distance,loopRide.across);
      state.x=loopPosition.x;state.z=loopPosition.z;setPhase('looping');
      toast('HÅLL FARTEN! ↻',1100);sound(260,.35,'triangle',.07,2);return;
    }
    const drumJump=trampolineFlight(state,LEVEL.trampoline);
    if(drumJump){
      launch=drumJump;state.flight=0;hoopHit=false;setPhase('drumflight');
      course?.carnival?.bounce();toast('BOING! ✦',1300);
      sound(160,.4,'triangle',.12,4);burst(state.x,.2,state.z,0x96ffea,26,1.3);return;
    }
    if(LEVEL.bridge&&leavesBridge(previous,state,LEVEL.bridge)){
      launch=bridgeFlight(state,LEVEL.bridge,bridgeAngle);state.flight=0;setPhase('bridgeflight');
      toast('VIPP & IVÄG! ✦',1500);sound(260,.3,'triangle',.12,3);
      burst(state.x,surfaceHeight(previous.x,previous.z)+.25,state.z,0x91ffdd,20,1.3);return;
    }
    if(collidePendulum(state,LEVEL.pendulum,pendulumTime)){state.settle=0;pendulumFeedback()}
    if(collideClockWheel(state,previous,crownTime,LEVEL.clockWheel)){
      sound(130,.13,'triangle',.055,.7);state.settle=0;
    }
    if(collideWalls(state))sound(125,.07,'triangle',.025,1.6);
    if(collideWalls(state,liftBarriers(liftState,LEVEL.lift),[]))sound(190,.1,'triangle',.04);
    if(strikeBell(state,bellBridgeState,LEVEL.bellBridge)){
      toast('KLANG! Genvägen öppnas',2200);sound(523,.9,'sine',.15,1);sound(1046,.6,'triangle',.045,1);
      const s=LEVEL.bellBridge.switch;burst(s.x,.55,s.z,0xffd784,22,.7);
    }
    if(collideBellBridge(state,bellBridgeState,LEVEL.bellBridge)){
      sound(145,.1,'triangle',.04);toast('Träffa klockknappen för att öppna bron',1600);
    }
    if(!onCourse(state.x,state.z)){doFall(surfaceHeight(previous.x,previous.z));return}
    if(!supportedByClockHand(state.x,state.z,crownTime,LEVEL.clockHand)){doFall(undefined,'Missad visarbrygga! +1 pliktslag');return}
    if(!supportedByTrapdoors(state.x,state.z,crownTime,LEVEL.trapdoors)){doFall(undefined,'Rotluckan öppnades! +1 pliktslag');return}
    gates.forEach((gate,i)=>{if(collideGate(state,gate,gateClocks[i]))sound(190,.08,'triangle',.04,.8)});
    if(SPINNER)collideSpinner(state,(SPINNER.custom==='thorn'?crownTime:elapsed)*SPINNER.speed);
    (LEVEL.bumpers||[]).forEach((bumper,i)=>{
      if(collideBumper(state,bumper)){
        if(course?.bumpers[i])course.bumpers[i].pulse=1;
        sound(680,.16,'sine',.09,1.7);burst(bumper.x,.65,bumper.z,0xffa7dc,12,.8);
        toast(LEVEL.clockWheel?'KLANG!':'FLIPPER!',850);state.settle=0;
      }
    });
    (LEVEL.pins||[]).forEach((pin,i)=>{
      if(knockPin(state,pin,pinStates[i]))celebratePins([i]);
    });
    if(LEVEL.hasPipe&&pipeCooldown<=0&&entersPipe(previous,state)){startPipe();return}
    if(LEVEL.hasPipe)collidePipe(state);
    if(CANNON&&Math.hypot(state.x-CANNON.x,state.z-CANNON.z)<1.02){startCannon();return}
    SPRINGS.forEach((spring,i)=>{
      if(springCooldowns[i]>0||Math.hypot(state.x-spring.x,state.z-spring.z)>=.84)return;
      springCooldowns[i]=2;state.boost=.42;springImpulse(state,spring);
      state.aim=Math.atan2(state.vz,state.vx);state.shotAge=0;state.settle=0;
      toast(SPRINGS.length>1?`STUDS ${i+1}!`:'STUDSPLATTA!',1300);
      sound(380,.26,'sine',.1,2.8);burst(spring.x,.25,spring.z,0xffd36c,17,1.1);
    });
    if(shouldSink(state,CUP)){win();return}
    if(Math.hypot(state.vx,state.vz)<.23){
      state.settle+=dt;
      if(state.settle>.45){state.vx=0;state.vz=0;setPhase('idle');toast('Din tur igen',1000)}
    }else state.settle=0;
    if(state.shotAge>14){state.vx=0;state.vz=0;setPhase('idle')}
  }else if(state.phase==='elevator'){
    if(stepLift(state,liftState,LEVEL.lift,dt)){
      state.aim=0;state.shotAge=0;state.settle=0;setPhase('moving');
      toast('BALKONGEN! Dosera slaget nedför.',2200);sound(740,.3,'sine',.08,1.25);
    }
  }else if(state.phase==='funnel'){
    funnelRide.time+=dt;funnelPosition=sampleFunnelRide(funnelRide,funnelTrack);
    state.x=funnelPosition.position.x;state.z=funnelPosition.position.z;
    if(funnelPosition.finished){
      state.vx=funnelTrack.direction.x*funnelRide.exitSpeed;state.vz=funnelTrack.direction.z*funnelRide.exitSpeed;
      state.aim=Math.atan2(state.vz,state.vx);state.shotAge=0;state.settle=0;
      funnelRide=null;funnelPosition=null;setPhase('moving');
      tubeCameraRecovery=1.2;
      toast('POSTEN FRAMME! Dosera slaget nedför.',2200);sound(730,.26,'triangle',.08,1.25);
      burst(state.x,surfaceHeight(state.x,state.z)+.4,state.z,0xffd584,16,.7);
    }
  }else if(state.phase==='looping'){
    loopPosition=stepLoop(loopRide,loopTrack,dt);
    state.x=loopPosition.x;state.z=loopPosition.z;
    state.vx=loopPosition.dx*loopRide.speed;state.vz=loopPosition.dz*loopRide.speed;
    if(loopPosition.finished||loopPosition.returned){
      const returned=loopPosition.returned,rolledBack=returned===(loopRide.entryDirection>0);
      state.x+=returned?-.03:.03;state.vx=loopRide.speed;state.vz=loopRide.sideSpeed;
      state.settle=0;state.shotAge=0;setPhase('moving');
      toast(rolledBack?'För lite fart – tillbaka till ansatsen':'ROTVOLT! ↻ Bromsa före kanten',1800);
      sound(rolledBack?140:640,.25,'triangle',.09,rolledBack?.6:1.4);
      if(!rolledBack)burst(state.x,.7,state.z,0xffd884,22,.9);
      loopRide=null;loopPosition=null;
    }
  }else if(state.phase==='bridgeflight'||state.phase==='drumflight'){
    const fromDrum=state.phase==='drumflight',previous=flightPosition(launch,state.flight);
    state.flight+=dt;const p=flightPosition(launch,state.flight);state.x=p.x;state.z=p.z;
    if(fromDrum)(LEVEL.pins||[]).forEach((pin,i)=>{
      // Lightweight pins can also topple under the descending ball.
      const contact={x:p.x,z:p.z,vx:launch.vx,vz:launch.vz};
      if(knockPin(contact,pin,pinStates[i],p.y))celebratePins([i]);
    });
    if(fromDrum&&!hoopHit&&throughHoop(previous,p,LEVEL.hoop)){
      hoopHit=true;course?.carnival?.celebrate();toast('RINGTRÄFF! ✦',1200);
      sound(780,.25,'sine',.09,1.5);burst(LEVEL.hoop.x,LEVEL.hoop.y,LEVEL.hoop.z,0xffd878,32,1.3);
    }
    if(state.flight>=launch.duration){
      if(!onCourse(state.x,state.z)){doFall();return}
      state.vx=launch.vx*(fromDrum?.38:.65);state.vz=launch.vz*(fromDrum?.38:.65);state.aim=Math.atan2(CUP.z-state.z,CUP.x-state.x);
      state.settle=0;state.shotAge=0;setPhase('moving');
      burst(state.x,.25,state.z,0x8bf7e0,24,1.2);sound(130,.14,'triangle',.12,.7);
    }
  }else if(state.phase==='cannon'){
    state.flight+=dt;
    const t=Math.min(1,state.flight/1.08),e=t*t*(3-2*t);
    state.x=THREE.MathUtils.lerp(CANNON.x,LANDING.x,e);
    state.z=THREE.MathUtils.lerp(CANNON.z,LANDING.z,e);
    if(t>=1){state.aim=Math.atan2(CUP.z-state.z,CUP.x-state.x);state.vx=7.1;state.vz=1.25;state.flight=0;setPhase('moving');burst(state.x,.3,state.z,0xffd264,24,1.1);sound(200,.14,'triangle',.1,.7)}
  }else if(state.phase==='pipe'){
    state.pipe+=dt;
    const t=Math.min(1,state.pipe/1.2),p=course.pipePath.getPoint(t);
    state.x=p.x;state.z=p.z;
    if(t>=1){state.x=PIPE_OUT.x+.36;state.vx=6.5;state.vz=0;setPhase('moving');burst(PIPE_OUT.x,.45,PIPE_OUT.z,0x7be0ed,20,1)}
  }else if(state.phase==='falling'){
    state.fall+=dt;
    if(state.fall>1.15){
      const raised=pinRack.restoreShot();
      restoreBellBridge(bellBridgeState);
      restoreLift(liftState);
      if(raised.length){
        course?.carnival?.restorePins(raised);
        toast('+1 pliktslag · käglorna återställda',1800);
      }
      state.strokes++;state.x=state.saved.x;state.z=state.saved.z;state.vx=0;state.vz=0;ball.visible=true;setPhase('idle');
    }
  }
  state.boost=Math.max(0,state.boost-dt);
  pipeCooldown=Math.max(0,pipeCooldown-dt);
  springCooldowns.forEach((time,i)=>springCooldowns[i]=Math.max(0,time-dt));
}

function pendulumFeedback(){
  if(pendulumHitCooldown>0)return;
  pendulumHitCooldown=.65;
  sound(95,.18,'triangle',.12,.65);burst(state.x,.45,state.z,0xe5b46f,12,.7);
  toast('EKOLLONSSMÄLL!',1100);
}

function resize(){
  const w=window.innerWidth,h=window.innerHeight,aspect=w/h;
  const span=LEVEL.overview.span||49;
  const viewH=Math.max(LEVEL.overview.span?22:28,span/aspect);
  overviewCamera.left=-viewH*aspect/2;overviewCamera.right=viewH*aspect/2;overviewCamera.top=viewH/2;overviewCamera.bottom=-viewH/2;overviewCamera.updateProjectionMatrix();
  camera.aspect=aspect;camera.updateProjectionMatrix();
  renderer.setSize(w,h,false);
  forestRenderer?.resize(w,h);
}
function draw(dt){
  const phase=state.phase;
  const ballHeight=phase==='falling'?state.fallY:surfaceHeight(state.x,state.z);
  let extraY=state.boost>0?Math.sin((.42-state.boost)/.42*Math.PI)*.8:0;
  if(phase==='bridgeflight'||phase==='drumflight')extraY=flightPosition(launch,state.flight).y-ballHeight;
  if(phase==='cannon')extraY=Math.sin(Math.min(1,state.flight/1.08)*Math.PI)*5.6;
  if(phase==='falling')extraY=-(Math.max(0,state.fall-.2)**2)*11;
  if(phase==='pipe')extraY=course.pipePath.getPoint(Math.min(1,state.pipe/1.2)).y-(ballHeight+.04+BALL_RADIUS);
  if(phase==='looping')extraY=loopPosition.y-(ballHeight+.04+BALL_RADIUS);
  if(phase==='funnel')extraY=funnelPosition.position.y-(ballHeight+.04+BALL_RADIUS);
  ball.position.set(state.x,ballHeight+.04+BALL_RADIUS+extraY,state.z);
  ball.visible=true;
  const rollingSpeed=Math.hypot(state.vx,state.vz);
  trail.forEach(m=>{m.material.opacity=Math.max(0,m.material.opacity-dt*1.8);m.scale.multiplyScalar(Math.exp(-dt*2))});
  trailTimer+=dt;
  if(trailTimer>.025){trailTimer=0;if((phase==='moving'&&rollingSpeed>6)||phase==='looping'||phase==='bridgeflight'||phase==='drumflight'){
    const m=trail[trailCursor++%trail.length];m.position.copy(ball.position);m.scale.setScalar(1);m.material.opacity=.65;
  }}
  if(rollingSpeed>.001){
    rollAxis.set(state.vz,0,-state.vx).normalize();
    ballCore.rotateOnWorldAxis(rollAxis,rollingSpeed*dt/BALL_RADIUS);
  }
  ballShadow.position.set(state.x,ballHeight+.08,state.z);ballShadow.visible=phase!=='looping'&&phase!=='bridgeflight'&&phase!=='drumflight'&&phase!=='cannon'&&phase!=='falling'&&phase!=='pipe';
  if(phase==='funnel')ballShadow.visible=false;
  halo.position.set(state.x,ballHeight+.085,state.z);halo.visible=phase==='idle'||phase==='power'||phase==='accuracy';
  if(LEVEL.heightProfile){
    const tilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.atan(heightSlope(state.x,state.z)));
    for(const marker of [ballShadow,halo]){marker.rotation.set(-Math.PI/2,0,0);marker.quaternion.premultiply(tilt)}
  }
  halo.material.opacity=.28+.08*Math.sin(elapsed*3);
  aimGroup.visible=phase==='idle'||phase==='power'||phase==='accuracy';
  const c=Math.cos(state.aim),s=Math.sin(state.aim);
  const aimLength=puttEnabled&&phase==='idle'?puttLength:6.25;
  aimDots.forEach((d,i)=>{const distance=.4+(aimLength-.4)*i/16;const x=state.x+c*distance,z=state.z+s*distance;d.position.set(x,surfaceHeight(x,z)+.16,z);d.visible=onCourse(x,z)&&supportedByTrapdoors(x,z,crownTime,LEVEL.trapdoors)&&supportedByClockHand(x,z,crownTime,LEVEL.clockHand)});
  const ax=state.x+c*aimLength,az=state.z+s*aimLength;aimArrow.position.set(ax,surfaceHeight(ax,az)+.2,az);aimArrow.rotation.y=-state.aim;aimArrow.visible=onCourse(ax,az)&&supportedByClockHand(ax,az,crownTime,LEVEL.clockHand);
  if(course){
    if(course.spinner)course.spinner.rotation.y=(SPINNER.custom==='thorn'?crownTime:elapsed)*SPINNER.speed;
    course.springGlows.forEach(glow=>glow.scale.setScalar(1+.08*Math.sin(elapsed*5)));
    course.gates.forEach((gate,i)=>gate.update(gateClocks[i]));
    course.pendulum?.update(pendulumTime);
    course.trapdoors?.update(crownTime);
    course.funnel?.update(elapsed,phase==='funnel',funnelPosition?.progress||0);
    course.bellBridge?.update(bellBridgeState,elapsed);
    course.lift?.update(liftState);
    course.clockWheel?.update(crownTime);
    course.clockHand?.update(crownTime,phase==='win',elapsed);
    if(LEVEL.clockHand){
      const signal=clockHandPose(crownTime,LEVEL.clockHand).signal;
      $('routeDetail0').textContent={green:'Rak bro · läge för kraftslag',amber:'Snart vridning · vänta',red:'Passagen stängd · invänta grönt'}[signal];
      $('routeDetail0').style.color={green:'#a1ecc4',amber:'#f4ca7f',red:'#edbba5'}[signal];
    }
    if(LEVEL.clockWheel){
      const signal=wheelSignal(crownTime,LEVEL.clockWheel);
      $('routeDetail0').textContent={green:'Öppning vid golvet',amber:'Öppningen passerar',red:'Vänta på nästa öppning'}[signal];
      $('routeDetail0').style.color={green:'#a1ecc4',amber:'#f4ca7f',red:'#edbba5'}[signal];
    }
    course.carnival?.update(dt,elapsed,pinStates);
    course.bridge?.update(bridgeAngle);course.bumpers.forEach(b=>b.update(dt));course.environment.update(elapsed,gateClocks[0]);
  }
  for(const p of particles){p.life-=dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.z+=p.vz*dt;p.vy-=7*dt;p.mesh.material.opacity=Math.max(0,p.life);p.mesh.scale.setScalar(Math.max(.01,p.life))}
  for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0){scene.remove(particles[i].mesh);particles[i].mesh.geometry.dispose();particles[i].mesh.material.dispose();particles.splice(i,1)}
  scene.children.forEach(o=>{if(o.userData.float)o.position.y=-5.8+Math.sin(elapsed*.7+o.position.x)*.17;if(o.userData.waterRing!==undefined)o.scale.setScalar(1+Math.sin(elapsed*2+o.userData.waterRing)*.07)});

  const directionX=Math.cos(state.aim),directionZ=Math.sin(state.aim);
  const side=LEVEL.cameraSide||0;
  const desiredPosition=new THREE.Vector3(state.x-directionX*cameraRig.back-directionZ*side,ballHeight+cameraRig.height+Math.max(0,extraY)*.28,state.z-directionZ*cameraRig.back+directionX*side);
  const desiredTarget=new THREE.Vector3(state.x+directionX*cameraRig.ahead,ballHeight+.2+Math.max(0,extraY)*.35,state.z+directionZ*cameraRig.ahead);
  if(phase==='looping'&&!cameraOverview){
    desiredPosition.set(LEVEL.loop.x-5,LEVEL.loop.y+8,LEVEL.loop.z+12);
    desiredTarget.set(LEVEL.loop.x+LEVEL.loop.advance/2,LEVEL.loop.y+LEVEL.loop.radius,LEVEL.loop.z+LEVEL.loop.shift/2);
  }
  if(phase==='elevator'&&!cameraOverview){
    const mid=(LEVEL.lift.x1+LEVEL.lift.x2)/2;
    desiredPosition.set(mid+.9,ballHeight+7,LEVEL.lift.z+11);
    desiredTarget.set(mid+1,ballHeight+1,LEVEL.lift.z);
  }else if(LEVEL.lift&&liftState.mode==='top'&&state.x>LEVEL.lift.x1&&state.x<LEVEL.lift.x2+7&&!cameraOverview){
    // Look beside the tower while aiming from its landing, then resume the chase.
    const sideBlend=1-THREE.MathUtils.smoothstep(state.x,LEVEL.lift.x2+4,LEVEL.lift.x2+7);
    desiredPosition.lerp(new THREE.Vector3(state.x+2.5,ballHeight+9,state.z+13),sideBlend);
    desiredTarget.lerp(new THREE.Vector3(state.x+5,ballHeight+.5,state.z),sideBlend);
  }
  if(LEVEL.clockWheel&&state.x>LEVEL.clockWheel.x+.55&&state.x<LEVEL.clockWheel.x+9&&!cameraOverview){
    // Once through, look from beside the wheel so its brass face cannot hide the ball.
    const blend=1-THREE.MathUtils.smoothstep(state.x,LEVEL.clockWheel.x+6,LEVEL.clockWheel.x+9);
    desiredPosition.lerp(new THREE.Vector3(state.x+3.5,ballHeight+11,state.z+12),blend);
    desiredTarget.lerp(new THREE.Vector3(state.x+4,ballHeight+.2,state.z-1),blend);
  }
  if(inClockWell(state.x,state.z,LEVEL.clockHand)&&!cameraOverview){
    desiredPosition.set(LEVEL.clockHand.x-7,14,LEVEL.clockHand.z+14);
    desiredTarget.set(state.x+2,.1,state.z);
  }
  let desiredFov=54;
  if(phase==='funnel'&&!cameraOverview&&!reducedCameraMotion){
    const chase=tubeCameraPose(tubeCameraRail,funnelPosition.progress),blend=tubeCameraBlend(funnelRide.time);
    // Interpolate along the rail, not across corners: the camera fits inside the tube.
    cameraPosition.copy(tubeCameraEntry.position).lerp(chase.position,blend);
    cameraTarget.copy(tubeCameraEntry.target).lerp(chase.target,blend);
    const qa=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),tubeCameraEntry.up);
    const qb=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),chase.up);
    camera.up.set(0,1,0).applyQuaternion(qa.slerp(qb,blend));desiredFov=54+(chase.fov-54)*blend;
  }else{
    if(phase==='funnel'&&reducedCameraMotion){desiredPosition.set(-16,10,13);desiredTarget.set(-5,1.6,-2)}
    tubeCameraRecovery=Math.max(0,tubeCameraRecovery-dt);
    const smoothing=1-Math.exp(-(tubeCameraRecovery>0?2.7:5.2)*dt);
    cameraPosition.lerp(desiredPosition,smoothing);cameraTarget.lerp(desiredTarget,smoothing);
    camera.up.lerp(new THREE.Vector3(0,1,0),1-Math.exp(-5*dt)).normalize();
  }
  shotKick=Math.max(0,shotKick-dt*2);camera.fov=THREE.MathUtils.lerp(camera.fov,desiredFov+shotKick*2,1-Math.exp(-7*dt));camera.updateProjectionMatrix();
  camera.position.copy(cameraPosition);camera.lookAt(cameraTarget);
  const activeCamera=cameraOverview?overviewCamera:camera;
  course?.environment.updateView?.(activeCamera,ball.position,dt,cameraOverview);
  if(forestRenderer)forestRenderer.render(activeCamera);else renderer.render(scene,activeCamera);
  const label=$('floatingLabel');
  if(phase==='moving'&&state.shotAge<1.15){
    const v=new THREE.Vector3(state.x,ballHeight+1.1,state.z).project(activeCamera);
    label.style.left=`${(v.x*.5+.5)*innerWidth}px`;label.style.top=`${(-v.y*.5+.5)*innerHeight}px`;
    label.textContent=`SLAG ${state.strokes}`;label.style.opacity=String(Math.min(1,(1.15-state.shotAge)*2));
  }else label.style.opacity='0';
}
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),.05);elapsed+=dt;
  if(state.phase==='idle'){
    const direction=Number(aimKeys.has('KeyD')||aimKeys.has('ArrowRight'))-Number(aimKeys.has('KeyA')||aimKeys.has('ArrowLeft'));
    state.aim+=direction*dt*(aimKeys.has('ShiftLeft')||aimKeys.has('ShiftRight')?.15:.65);
  }
  if(state.phase==='power')state.power=powerAt(elapsed-state.meterStart);
  if(state.phase==='accuracy')state.needle=precisionAt(elapsed-state.accuracyStart);
  $('meterValue').textContent=state.phase==='accuracy'?'Pricka grönt':state.phase==='power'?`${state.power>.82?'MAXKRAFT · ':''}${Math.round(state.power*100)} %`:'';
  const zone=perfectZone(state.power);
  $('meter').style.setProperty('--sweet-start',`${50-zone*50}%`);
  $('meter').style.setProperty('--sweet-end',`${50+zone*50}%`);
  $('meter').style.setProperty('--sweet-width',`${zone*100}%`);
  $('meter').classList.toggle('overdrive',state.phase==='power'&&state.power>.82);
  const pos=state.phase==='accuracy'?(state.needle+1)/2:state.phase==='power'?state.power:state.power;
  $('meterNeedle').style.left=`${Math.max(0,Math.min(100,pos*100))}%`;
  $('meterFill').style.width=`${Math.max(0,Math.min(100,state.power*100))}%`;
  accumulator+=dt;
  let steps=0;
  while(accumulator>=1/120&&steps<8){physics(1/120);accumulator-=1/120;steps++}
  draw(dt);
}
function overviewAim(ev,activeCamera=overviewCamera){
  pointer.set(ev.clientX/innerWidth*2-1,-(ev.clientY/innerHeight*2-1));
  raycaster.setFromCamera(pointer,activeCamera);aimPlane.constant=-surfaceHeight(state.x,state.z);
  const hit=new THREE.Vector3();
  const terrainHit=LEVEL.heightProfile?raycaster.intersectObjects([course.aimSurface,...(course.funnel?[course.funnel.bowl]:[]),...(course.lift?[course.lift.deck]:[])])[0]:null;
  if(terrainHit)hit.copy(terrainHit.point);
  if(terrainHit||((!LEVEL.heightProfile||LEVEL.funnel)&&raycaster.ray.intersectPlane(aimPlane,hit))){
    const dx=hit.x-state.x,dz=hit.z-state.z;
    if(Math.hypot(dx,dz)>.55)state.aim=Math.atan2(dz,dx);
  }
}
canvas.addEventListener('pointerdown',e=>{
  if(state.phase!=='idle')return;
  draggingAim=true;lastPointerX=e.clientX;pointerDownX=e.clientX;pointerDownY=e.clientY;canvas.setPointerCapture(e.pointerId);
  if(cameraOverview)overviewAim(e);
});
canvas.addEventListener('pointermove',e=>{
  if(state.phase!=='idle'||!draggingAim)return;
  if(cameraOverview){overviewAim(e);return}
  state.aim+=(e.clientX-lastPointerX)*(e.shiftKey?.001:.004);lastPointerX=e.clientX;
});
canvas.addEventListener('pointerup',e=>{
  if(draggingAim&&puttEnabled&&!cameraOverview&&Math.hypot(e.clientX-pointerDownX,e.clientY-pointerDownY)<5)overviewAim(e,camera);
  draggingAim=false;
});
canvas.addEventListener('pointercancel',()=>{draggingAim=false});
window.addEventListener('keydown',e=>{
  if(e.code==='Escape'){
    if($('helpPanel').open)$('helpPanel').close();
    if($('levelPanel').open)$('levelPanel').close();
    if(['power','accuracy'].includes(state.phase)){state.power=0;setPhase('idle')}
    return;
  }
  if($('helpPanel').open||$('levelPanel').open)return;
  if(e.target instanceof HTMLInputElement&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.code))return;
  if(e.code==='Space'||e.code==='Enter'){
    if(state.phase==='intro'||state.phase==='win')return;
    if(e.target instanceof HTMLElement&&e.target.closest('button')&&e.target.id!=='actionButton')return;
    e.preventDefault();if(!e.repeat)action();
  }
  if(['KeyA','KeyD','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){
    e.preventDefault();aimKeys.add(e.code);
  }
  if(e.code==='KeyR'&&state.phase!=='intro'){reset();$('win').classList.add('hidden')}
});
window.addEventListener('keyup',e=>aimKeys.delete(e.code));
window.addEventListener('blur',()=>{aimKeys.clear();draggingAim=false});
$('helpButton').addEventListener('click',()=>{
  if(['power','accuracy'].includes(state.phase)){state.power=0;setPhase('idle')}
  aimKeys.clear();$('helpPanel').showModal();
});
$('closeHelp').addEventListener('click',()=>$('helpPanel').close());
$('actionButton').addEventListener('click',action);
$('puttLength').addEventListener('input',()=>{puttLength=Number($('puttLength').value);updateUI()});
$('shotMode').addEventListener('click',()=>{puttEnabled=!puttEnabled;updateUI();$('shotMode').blur()});
$('playButton').addEventListener('click',()=>{$('intro').classList.add('hidden');reset();toast('Sikta · välj kraft · träffa grönt',2600)});
$('againButton').addEventListener('click',()=>{$('win').classList.add('hidden');reset()});
$('resetButton').addEventListener('click',()=>{if(state.phase!=='intro'){reset();$('win').classList.add('hidden')}});
$('cameraButton').addEventListener('click',()=>{cameraOverview=!cameraOverview;$('cameraText').textContent=cameraOverview?'Spelvy':'Översikt';resize();updateUI()});
$('soundButton').addEventListener('click',()=>{audioEnabled=!audioEnabled;$('soundButton').classList.toggle('off',!audioEnabled);$('soundButton').textContent=audioEnabled?'♪':'×'});
window.addEventListener('resize',resize);

function openLevels(){
  if(['power','accuracy'].includes(state.phase)){state.power=0;setPhase('idle')}
  aimKeys.clear();
  for(const level of LEVELS){
    const best=localStorage.getItem(level.recordKey);
    $(`record-${level.id}`).textContent=best?`Bästa: ${best} slag`:'Inget rekord ännu';
  }
  $('levelPanel').showModal();
}
$('levelsButton').addEventListener('click',openLevels);
$('introLevels').addEventListener('click',openLevels);
$('winLevels').addEventListener('click',openLevels);
$('closeLevels').addEventListener('click',()=>$('levelPanel').close());
function configureLevelUI(){
  $('levelSummary').textContent=`${LEVELS.length} spelbara hål. ${new Set(LEVELS.map(level=>themeFor(level.id).key)).size} världar. Massor av bus.`;
  $('levelOptions').innerHTML=[...LEVELS].sort((a,b)=>a.id-b.id).map(level=>{
    const theme=themeFor(level.id);
    return `<a id="level-${level.id}" href="?hole=${level.id}" class="level-option" data-world="${theme.key}">
      <span class="level-number">${String(level.id).padStart(2,'0')}</span>
      <span class="level-info"><strong>${level.name}</strong><span class="level-world">${theme.name.toUpperCase()} · ${theme.range}</span>
      <span>${level.feature}</span><small>PAR ${level.par} · <span id="record-${level.id}">Inget rekord ännu</span></small></span><span class="level-arrow">→</span></a>`;
  }).join('');
  const number=String(LEVEL.id).padStart(2,'0');
  const theme=themeFor(LEVEL.id);
  document.documentElement.dataset.theme=theme.key;
  document.documentElement.dataset.hole=LEVEL.id;
  $('worldName').textContent=theme.name;
  $('introWorld').textContent=`${theme.name} · ${theme.range}`;
  $('meter').style.setProperty('--sweet-start',`${50-PERFECT_ZONE*50}%`);
  $('meter').style.setProperty('--sweet-end',`${50+PERFECT_ZONE*50}%`);
  $('meter').style.setProperty('--sweet-width',`${PERFECT_ZONE*100}%`);
  const next=LEVELS.find(l=>l.id===LEVEL.id+1);
  $('nextHole').hidden=!next;if(next){$('nextHole').href=`?hole=${next.id}`;$('nextHole').textContent=`Nästa hål · ${next.name} →`}

  document.title=`${LEVEL.name} · Hål ${number}`;
  $('holeNumber').textContent=number;$('holeName').textContent=LEVEL.name.toUpperCase();
  $('parCount').textContent=LEVEL.par;
  $('introKicker').textContent=LEVEL.worldFinale?`URVERKETS FINAL · HÅL ${number}`:`VÄLKOMMEN TILL HÅL ${number}`;
  $('introTitle').innerHTML=`${LEVEL.title[0]}<br><em>${LEVEL.title[1]}</em><span class="title-star">✦</span>`;
  $('introDescription').textContent=LEVEL.description;
  $('featureBadge').textContent=LEVEL.feature.toUpperCase();$('parBadge').textContent=`⛳ PAR ${LEVEL.par}`;
  $('playButton').innerHTML=`SPELA HÅL ${number} <span>→</span>`;
  $('routeHeading').textContent=LEVEL.routeHeading||(LEVEL.id===10?'RUNDA SVÄNGEN':'TVÅ VÄGAR TILL FLAGGAN');
  LEVEL.routes.forEach(([title,detail],i)=>{$(`routeTitle${i}`).textContent=title;$(`routeDetail${i}`).textContent=detail});
  $(`level-${LEVEL.id}`).setAttribute('aria-current','true');
}

async function init(){
  configureLevelUI();resize();
  try{course=await createCourse(scene)}catch(error){console.error(error);toast('Vissa modeller kunde inte läsas.');}
  if(['forest','clockwork'].includes(LEVEL.theme)){
    const {createForestRenderer}=await import('./forest-renderer.js');
    forestRenderer=createForestRenderer(renderer,scene,camera);resize();
  }
  $('playButton').disabled=false;
  $('loading').classList.add('done');updateUI();frame();
}
init();
