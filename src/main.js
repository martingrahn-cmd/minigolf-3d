import './localize-data.js';
import * as THREE from 'three';
import { createCourse, LEVEL, LEVELS, SELECTION, START, CUP, CANNON, LANDING, PIPE_IN, PIPE_OUT, SPRINGS, SPINNER, onCourse, heightAt, heightSlope, heightSlopeZ, frictionAt } from './course.js';
import { padTriggers, BALL_RADIUS, PERFECT_ZONE, perfectZone, powerAt, precisionAt, shotError, shotSpeed, shouldSink, collideWalls, collideSpinner, collidePipe, entersPipe, springImpulse, collideBumper } from './mechanics.js';
import { createLoopTrack, enterLoop, stepLoop } from './loop.js';
import { onBridge, stepBridge, leavesBridge, bridgeFlight, flightPosition } from './bridge.js';
import { advanceGate, collideGate } from './gates.js';
import { trapdoorAt, supportedByTrapdoors } from './trapdoors.js';
import { collidePendulum } from './pendulum.js';
import { trampolineFlight, throughHoop, createPinRack, knockPin, advancePins } from './carnival.js';
import { themeFor } from './environment.js';
import { APP_VERSION, watchForUpdates, applyUpdate } from './updates.js';
import { hydrateIcons, setIcon } from './icons.js';
import { WORLDS, ROUND, CAMPAIGN, holeLabel, builtCount, nextInRound } from './round.js';
import { createGolfBall } from './ball.js';
import * as activeLayout from './layout.js';
import { puttingContext, puttSpeed, puttLengthAt, PUTT_MAX } from './putting.js';
import { entersFunnel,createFunnelTrack,startFunnelRide,sampleFunnelRide } from './funnel.js';
import { createTubeCameraRail,tubeCameraPose,tubeCameraBlend } from './tube-camera.js';
import {createBellBridgeState,stepBellBridge,strikeBell,collideBellBridge,restoreBellBridge} from './bell-bridge.js';
import {createLiftState,liftPose,tryBoardLift,stepLift,liftBarriers,restoreLift} from './lift.js';
import {collideClockWheel,wheelSignal} from './clock-wheel.js';
import {clockHandPose,inClockWell,supportedByClockHand,carryOnClockHand} from './clock-hand.js';
import {crossTreeEye} from './mother-tree.js';
import {inLowGravity,stepFloat,floatDrop} from './low-gravity.js';
import {blackHolePull,crossesHorizon} from './black-hole.js';
import {barrelAngle,cometRange,loadsCannon,feedPose,cometPose,landingVelocity,cometLanding} from './comet-cannon.js';
import {wheelTurn,docked,crossesDock,ridePose} from './ferris.js';
import {starsFor,starText,bestStars,worldStars,startWorldRun,activeRun,recordRunHole,endWorldRun,nextRunHole,runScorecard,campaignProgress,worldProgress,isCampaignFinale} from './progress.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createAudio } from './audio.js';
import { QA, BOT, setupQA } from './qa.js';
import { loadAudioSettings, saveAudioSettings } from './music.js';
import { createMultiplayer } from './multiplayer.js';
import * as trophies from './trophies.js';
import { createGhostBalls } from './ghost-balls.js';
import { STROKE_CAP } from './room.js';
import { createCoach } from './coach.js';
import { SINK, SLOW_MOTION, sinkPose, RESCUE, onTheLip } from './cup-celebration.js';
import { t, num, plural, translateData, translatePage, LANGUAGES, lang, setLanguage } from './i18n.js';
import './style.css';

const $=id=>document.getElementById(id);
// The page's own texts in the chosen language (the holes' are done in localize-data.js).
translatePage();
const canvas=$('game');
// The stencil buffer cuts the cup's hole through the felt (cup-celebration.js).
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,stencil:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=LEVEL.theme==='forest'?1:1.1;
const scene=new THREE.Scene();
// A soft studio environment gives metals, glass and lacquer something to reflect.
const environmentMap=new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(),.04).texture;
scene.environment=environmentMap;scene.environmentIntensity=.16;
const camera=new THREE.PerspectiveCamera(54,1,.08,200);
const overviewCamera=new THREE.OrthographicCamera(-25,25,14,-14,.1,200);
const clock=new THREE.Clock();
const pointer=new THREE.Vector2();
const raycaster=new THREE.Raycaster();
const aimPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
const cameraRig=LEVEL.theme==='clockwork'?{back:11,height:9,ahead:7}:['forest','moon'].includes(LEVEL.theme)?{back:10.5,height:9.5,ahead:5.5}:{back:8.5,height:8,ahead:3.4};
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
const audioSettings=loadAudioSettings(localStorage);
let audioEnabled=audioSettings.on;
let toastTimer;
const aimKeys=new Set();
// Touch and mouse/keyboard get their own hints and controls. Starts from the primary
// pointer and follows whatever the player actually uses (e.g. an iPad with a keyboard).
const root=document.documentElement;
root.dataset.input=matchMedia('(pointer: coarse)').matches?'touch':'mouse';
const touchInput=()=>root.dataset.input==='touch';
function setInput(mode){if(root.dataset.input!==mode){root.dataset.input=mode;updateUI()}}
window.addEventListener('pointerdown',e=>setInput(e.pointerType==='touch'||e.pointerType==='pen'?'touch':'mouse'),true);
let fineAim=0,fineAimHeld=0;
// Seconds left of the course overview shown when a hole starts; any tap begins play.
let preview=0;
let pipeCooldown=0;
const springCooldowns=SPRINGS.map(()=>0);
const gates=LEVEL.gates||[];
const gateClocks=gates.map(()=>0);
let pendulumTime=0,pendulumHitCooldown=0,crownTime=0,cometTime=0,wheelTime=0;
let elapsed=0;
// The sink celebration: slow motion, a close-up and the cup critter.
let sink=null,timeScale=1,realDt=0;
// A friend who helps a ball that stopped right on the lip of the cup.
let rescue=null;
// Tips for a first round, shown once each as the moment for them comes.
const coach=createCoach(localStorage,$);let aimAtIdle=0,wasIdle=false;
// Online play with friends: the room, the scoreboard and the other players' balls.
let ghosts=null;
const mp=createMultiplayer({
  $,toast:(...a)=>toast(...a),hydrateIcons,worlds:WORLDS,round:ROUND,hole:SELECTION.menu?null:SELECTION.slot?.hole,
  pars:match=>match.holes.map(h=>ROUND.find(s=>s.hole===h).level.par),
  strokes:()=>state.strokes,onMatchStart:()=>endWorldRun(localStorage),
  onRemoteBall:(player,b)=>mp.mode()==='turns'?followTurn(b):ghosts?.set(player,b),
  onTurn:(player,mine,turn)=>startTurn(player,mine,turn),onTurnResult:(player,strokes)=>turnResult(player,strokes),
  onRemoteReplay:log=>catchUpTurn(log),onMatchEnd:won=>{if(won&&!QA)trophies.event('matchWin')},onReaction:(player,emoji)=>showReaction(player,emoji),onRemoteShot:shot=>replayShot(shot),onRemoteFire:fire=>{pendingFire=fire},onTurnChange:()=>updateUI(),
});
// Turns: a cannon shot heard before the replay has loaded the cannon waits for it.
let pendingFire=null;
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
// Drawn after the cup's hole so the ball can be seen inside it.
ball.traverse(o=>{o.renderOrder=3});
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
// True while a turn is caught up on at once: no toasts, sparks or sounds then.
let quiet=false;
// Trophies count the player's own play: not a shot replayed for someone watching, a turn caught up on or the QA bench.
const trophy=(name,data)=>{if(!QA&&!quiet&&!mp.watching())trophies.event(name,data)};
let lastShotPutt=false;
function burst(x,y,z,color=0xffdb77,count=16,force=1){
  if(quiet)return;
  for(let i=0;i<count;i++){
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(.055+Math.random()*.065,7,6),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false}));
    mesh.position.set(x,y,z);scene.add(mesh);
    const a=Math.random()*Math.PI*2;
    particles.push({mesh,vx:Math.cos(a)*(1.2+Math.random()*3)*force,vy:(1+Math.random()*3)*force,vz:Math.sin(a)*(1.2+Math.random()*3)*force,life:.55+Math.random()*.5,max:1});
  }
}
// Sound: game effects and each world's soundscape, synthesised in audio.js.
// Browsers only start sound after a gesture, so the first tap unlocks it.
const audio=createAudio(LEVEL.theme);audio.setLevels(audioSettings);
for(const type of ['pointerdown','touchend','click','keydown'])window.addEventListener(type,()=>audio.unlock(),{capture:true});
function sound(freq=440,duration=.13,type='sine',vol=.055,slide=1){if(audioEnabled)audio.tone(freq,duration,type,vol,slide)}
function toast(text,ms=2000){
  if(quiet)return;
  const el=$('toast');el.textContent=t(text);el.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),ms);
}
function setPhase(phase){
  const previous=state.phase;state.phase=phase;
  // In a match a hole ends at the stroke cap, so nobody keeps the others waiting.
  if(phase==='idle'&&previous!=='idle'&&mp.inMatch()&&!mp.watching()&&state.strokes>=STROKE_CAP){capHole();return}
  if(phase==='idle'&&previous!=='idle'){
    nearPutt=puttingContext(state,activeLayout);puttEnabled=!!nearPutt;
  }
  updateUI();
}
function updateUI(){
  $('strokeCount').textContent=state.strokes;
  $('bestScore').textContent=localStorage.getItem(LEVEL.recordKey)||'–';
  const names={idle:t('Sikta'),power:t('Välj kraft'),accuracy:t('Träffa grönt'),moving:t('Bollen rullar'),looping:t('Runt i roten!'),cannon:t('Flygtur!'),pipe:t('Rörpost!'),funnel:t('Specialleverans!'),elevator:t('Nästa våning!'),bridgeflight:t('Luft under bollen!'),floating:t('Svävar!'),riding:t('Åker pariserhjul!'),loading:t('In i kanonen!'),loaded:LEVEL.cometCannon?.launchY?t('Raketen laddad'):t('Kanonen laddad'),comet:t('Kometen flyger!'),drumflight:LEVEL.trampoline?.title||t('Skybowling!'),falling:t('Oj då!'),win:t('I hålet!')};
  $('controlTitle').textContent=names[state.phase]||t('Sikta');
  const actions={idle:t('Starta'),power:t('Lås kraft'),accuracy:t('Slå!'),moving:t('Rullar…'),looping:t('Loopar…'),cannon:t('Flyger…'),pipe:t('Rörpost…'),funnel:t('På väg…'),elevator:t('Åker upp…'),bridgeflight:t('Flyger…'),floating:t('Svävar…'),riding:t('Åker…'),loading:t('Laddar…'),loaded:t('FYR!'),comet:t('Flyger…'),drumflight:t('Flyger…'),falling:t('Vänta…'),win:t('Klart!')};
  $('actionText').textContent=actions[state.phase]||t('Starta');
  const busy=!['idle','power','accuracy','loaded'].includes(state.phase);
  $('actionButton').disabled=busy;
  $('actionSteps').dataset.step={idle:0,power:1,accuracy:2}[state.phase]??'';
  $('controlPanel').classList.toggle('busy',busy);
  $('app').classList.toggle('overview',cameraOverview);
  $('meter').classList.toggle('accuracy',state.phase==='accuracy');
  const touch=touchInput();
  $('meterStatus').textContent={idle:cameraOverview?(touch?t('Tryck på banan för att sikta'):t('Klicka på banan för att sikta')):(touch?t('Dra för att sikta · ◁ ▷ finsiktar'):t('Dra för att sikta · A / D finjusterar')),power:touch?t('Mjukt ← kraft → hårt'):t('Mjukt ← kraft → hårt · Esc avbryter'),accuracy:t('Pricka mitten · hårda slag kräver mest precision'),moving:t('Nästa slag när bollen stannar'),looping:t('Farten avgör om du når runt'),cannon:t('Över gapet mot flaggan'),pipe:t('På väg till kanonen'),bridgeflight:t('Nästa stopp: flippergreen'),floating:t('Låg gravitation · bollen sjunker långsamt'),riding:t('Gondolen tippar ut bollen på greenen'),loading:t('Tryckluften blåser upp bollen i kanonen'),loaded:t(LEVEL.cometCannon?.launchY?(touch?'Tryck FYR eller på banan när siktet står där du vill landa':'Tryck FYR eller Mellanslag när siktet står där du vill landa'):(touch?'Tryck FYR eller på banan när siktet pekar rätt':'Tryck FYR eller Mellanslag när siktet pekar rätt')),comet:t('Mot landningshyllorna'),drumflight:LEVEL.trampoline?.status||t('Genom ringen – mot käglorna!'),falling:'+1 pliktslag',win:t('Flaggan är din!')}[state.phase]||'';
  if(state.phase==='funnel')$('meterStatus').textContent=t('Tryckluften lyfter dig till postterrassen');
  if(state.phase==='elevator')$('meterStatus').textContent=t('Motvikterna tar dig till balkongen');
  const putting=puttEnabled&&['idle','power','accuracy'].includes(state.phase);
  $('meter').hidden=state.phase==='loaded';
  $('shotMode').hidden=!nearPutt||state.phase!=='idle';
  $('fineAim').hidden=state.phase!=='idle'||cameraOverview;
  $('cancelShot').hidden=!touch||!['power','accuracy'].includes(state.phase);
  if($('fineAim').hidden)fineAim=0;
  $('shotMode').textContent=puttEnabled?t('Fullt slag'):t('Närputt');
  if(putting){
    // The near putt uses the same meter: the power sets the roll in metres, then hit the centre.
    $('controlTitle').textContent=t('Närputt');$('actionText').textContent=state.phase==='idle'?t('Putta'):$('actionText').textContent;
    $('meterStatus').textContent=state.phase==='idle'?t('{m} m till hålet · tryck för rulllängd',{m:num(nearPutt.distance)}):state.phase==='power'?t('Tryck när rulllängden stämmer'):t('Pricka mitten för en rak putt');
  }
  // Turns: the round card shows whose round it is.
  const active=mp.watching()?mp.activePlayer():null,owner=active?.name.toUpperCase();
  $('scoreTitle').textContent=owner?t('{name}S RUNDA',{name:owner}).replace(/([SXZ])S /,'$1 '):t('DIN RUNDA');
  if(mp.watching()){
    // Turns: someone else is playing; this panel tells whose turn it is.
    const turn=mp.turnStatus();
    $('controlTitle').textContent=turn.title;$('actionText').textContent=t('Tittar på');$('meterStatus').textContent=turn.detail;
    $('actionButton').disabled=true;$('controlPanel').classList.add('busy');
    $('shotMode').hidden=true;$('fineAim').hidden=true;$('cancelShot').hidden=true;fineAim=0;
  }else if(preview>0){
    $('controlTitle').textContent=t('Banöversikt');$('actionText').textContent=t('Börja');$('actionSteps').dataset.step='';$('meter').hidden=true;
    $('meterStatus').textContent=touch?t('Så ser banan ut · tryck för att börja'):t('Så ser banan ut · klicka eller Mellanslag för att börja');
  }
}
function setOverview(on){
  cameraOverview=on;$('cameraText').textContent=on?t('Spelvy'):t('Översikt');setIcon($('cameraIcon'),on?'follow':'map');resize();updateUI();
}
function startPreview(){preview=4.5;setOverview(true);if(!mp.watching())toast('Banöversikt · tryck för att börja',2400)}
function finishPreview(){preview=0;setOverview(false);toast('Sikta · välj kraft · träffa grönt',2200)}
function endPreview(){if(preview<=0)return false;finishPreview();return true}
function action(){
  if(endPreview()||mp.watching())return;
  if(state.phase==='loaded'){fireComet();return}
  if(state.phase==='idle'){
    setPhase('power');state.power=0;state.meterStart=elapsed;sound(530,.08,'triangle',.04,1.2);
  }else if(state.phase==='power'){
    if(state.power<.01)state.power=.01;
    setPhase('accuracy');state.needle=-1;state.accuracyStart=elapsed;sound(720,.08,'triangle',.04,.85);
  }else if(state.phase==='accuracy'){
    state.accuracy=state.needle;
    shoot(puttEnabled&&nearPutt?puttSpeed(puttLength,nearPutt.friction):undefined);
  }
}
function shoot(puttingSpeed){
  // A putt misses like a gentle shot: a little off line when the needle is off centre.
  const error=shotError(state.accuracy,puttingSpeed!==undefined?.35:state.power);
  const angle=state.aim+error;
  const speed=puttingSpeed??shotSpeed(state.power);
  const putt=puttingSpeed!==undefined,vx=Math.cos(angle)*speed,vz=Math.sin(angle)*speed;
  lastShotPutt=putt;trophy('stroke');if(Math.abs(state.accuracy)<=perfectZone(state.power))trophy('perfect');
  // Turns: everything the watchers need to play the same shot.
  mp.reportShot({x:state.x,z:state.z,aim:state.aim,power:state.power,accuracy:state.accuracy,strokes:state.strokes,saved:state.saved,
    clocks:{pendulumTime,crownTime,cometTime,wheelTime},gates:[...gateClocks],bridge:bridgeAngle,vx,vz,putt,error});
  launchShot(vx,vz,putt,error);
}
function launchShot(vx,vz,putt,error){
  pinRack.beginShot();
  bellBridgeState.savedOpen=bellBridgeState.open;
  liftState.savedTop=liftState.mode==='top';
  shotKick=state.power>.8?1:0;
  state.vx=vx;state.vz=vz;
  state.strokes++;state.shotAge=0;state.settle=0;
  // The return spot after a fall also remembers where the player aimed from it.
  if(!trapdoorAt(state.x,state.z,LEVEL.trapdoors)&&!inClockWell(state.x,state.z,LEVEL.clockHand))state.saved={x:state.x,z:state.z,aim:state.aim};
  $('strokeCount').textContent=state.strokes;
  setPhase('moving');
  audio.putt(state.power);
  burst(state.x,.25+surfaceHeight(state.x,state.z),state.z,0xffffff,8,.45);
  if(Math.abs(state.accuracy)<=perfectZone(state.power))toast(putt?t('RAK PUTT ✦'):state.power>.82?t('SUPERTRÄFF! ✦'):t('PERFEKT TRÄFF! ✦'),1300);
  else if(Math.abs(error)>.06)toast(t('SNETT SLAG · {deg}°',{deg:num(Math.abs(error*180/Math.PI))}),1300);
}
function reset(full=true){
  state.x=START.x;state.z=START.z;state.vx=0;state.vz=0;state.aim=0;state.power=0;state.needle=0;state.flight=0;state.pipe=0;state.fall=0;state.boost=0;state.strokes=full?0:state.strokes;
  pipeCooldown=0;springCooldowns.fill(0);gateClocks.fill(0);bridgeAngle=LEVEL.bridge?.maxAngle||0;launch=null;shotKick=0;ball.visible=true;ballCore.quaternion.identity();
  clearSink();
  pinRack.reset();course?.carnival?.reset();course?.motherTree?.reset();hoopHit=false;
  pendulumTime=0;pendulumHitCooldown=0;crownTime=0;
  loopRide=null;loopPosition=null;state.saved={...START,aim:0};
  funnelRide=null;funnelPosition=null;
  tubeCameraEntry=null;tubeCameraRecovery=0;camera.up.set(0,1,0);
  Object.assign(bellBridgeState,createBellBridgeState());
  Object.assign(liftState,createLiftState());
  nearPutt=null;puttEnabled=false;puttLength=1;
  preview=0;cameraOverview=false;$('cameraText').textContent=t('Översikt');setIcon($('cameraIcon'),'map');
  setPhase('idle');
  if(full)toast('Ny chans! Sikta mot flaggan.');
}
function clearSink(){
  sink=null;rescue=null;course?.lipRescuer?.hide();timeScale=1;ball.scale.setScalar(1);course?.cupCritter?.hide();
  if(course?.flagstick){course.flagstick.position.y=course.cupHeight;course.flagstick.rotation.z=0}
}
// --- Turns: watching another player's hole. ---
// Their shot, replayed here from the same spot, clocks and velocity.
function replayShot(s){if(mp.watching())applyShot(s)}
function applyShot(s){
  // A replay that drifted (sunk here but not there, say) is put right by the next shot.
  if(!['idle','power','accuracy'].includes(state.phase)){clearSink();ball.visible=true}
  Object.assign(state,{x:s.x,z:s.z,aim:s.aim,power:s.power,accuracy:s.accuracy,strokes:s.strokes,saved:s.saved,fall:0,flight:0,pipe:0,boost:0});
  ({pendulumTime,crownTime,cometTime,wheelTime}=s.clocks);
  s.gates.forEach((t,i)=>{gateClocks[i]=t});bridgeAngle=s.bridge;
  puttEnabled=s.putt;pendingFire=null;
  launchShot(s.vx,s.vz,s.putt,s.error);
}
// A turn already under way (joining late, or reloading the page): its shots are
// played through at once and quietly, so the ball, the strokes and every moving
// part (bridges, lifts, pins) end up where they are for everyone else.
function fastForward(log){
  if(!log?.length)return;
  quiet=true;audio.hush(2.5);
  try{
    for(const e of log){
      if(e.kind==='fire'){if(state.phase==='loaded'){cometTime=e.cometTime;fireComet()}}
      else applyShot(e);
      for(let n=0;n<120*90&&!['idle','power','accuracy','win','loaded'].includes(state.phase);n++)physics(1/120);
    }
  }finally{quiet=false}
  updateUI();
}
function catchUpTurn(log){
  if(!mp.watching())return;
  if(state.phase!=='intro'){reset(false);state.strokes=0}
  fastForward(log);
}
// Their ball while it rests: aim, the meter and its true spot.
function followTurn(b){
  if(!mp.watching())return;
  const aiming=['idle','power','accuracy'];
  if(!aiming.includes(state.phase)||!aiming.includes(b.phase))return;
  state.x=b.sx;state.z=b.sz;state.aim=b.aim;state.strokes=b.strokes;puttEnabled=b.putt&&!!nearPutt;
  if(b.phase!==state.phase){
    if(b.phase==='power'){setPhase('power');state.meterStart=elapsed-b.meter}
    else if(b.phase==='accuracy'){state.power=b.power;setPhase('accuracy');state.accuracyStart=elapsed-b.meter}
    else setPhase('idle');
  }
  updateUI();
}
// A new turn: the hole starts over for the next player.
function startTurn(player,mine,turn){
  $('win').classList.add('hidden');
  if(state.phase!=='intro'){reset(false);state.strokes=0;updateUI()}
  // Back on this page in the middle of one's own turn: pick up where it was.
  if(mine)fastForward(mp.ownTurnLog());
  const first=turn.turn===1,name=player.name.toUpperCase();
  showSplash({color:player.color,kicker:t('HÅL {hole} · TUR {turn} AV {turns}',turn),
    title:mine?(first?t('DU BÖRJAR!'):t('DIN TUR!')):first?t('{name} BÖRJAR!',{name}):t('{name}S TUR!',{name}).replace(/([SXZ])S /,'$1 '),detail:mine?player.name:''});
}
// Someone else holed out: the others see how it went (the player has the win card).
// Playing together it is a smaller sign, higher up, so it does not get in the way.
function turnResult(player,strokes){
  if(!player||player.id===mp.me()?.id)return;
  showSplash({color:player.color,kicker:player.name.toUpperCase(),title:scoreName(strokes,LEVEL.par),detail:plural(strokes,'1 slag','{n} slag'),compact:mp.mode()!=='turns'});
}
// A reaction from someone in the match, floating up in their colour.
function showReaction(player,emoji){
  if(!player)return;
  const el=document.createElement('div');el.className='mp-reaction';el.style.setProperty('--c',`#${player.color.toString(16).padStart(6,'0')}`);
  el.style.left=`${58+Math.random()*30}%`;el.textContent=emoji;
  const name=document.createElement('small');name.textContent=player.name;el.append(name);
  $('mpReactions').append(el);setTimeout(()=>el.remove(),2500);
}
const scoreName=(strokes,par)=>strokes>=STROKE_CAP?t('TIO SLAG'):strokes===1?t('HOLE IN ONE!'):strokes<=par-2?t('EAGLE!'):strokes===par-1?t('BIRDIE!'):strokes===par?t('PAR!'):
  [t('BOGEY'),t('DUBBELBOGEY'),t('TRIPPELBOGEY')][strokes-par-1]??t('{n} SLAG',{n:strokes});
// The big sign in the player's colour. Kept until the intro card is closed if it is up.
let splashTimer=null,pendingSplash=null;
function showSplash(sign){
  if(!$('intro').classList.contains('hidden')){if(!sign.compact)pendingSplash=sign;return}
  pendingSplash=null;
  const el=$('turnSplash');el.style.setProperty('--c',`#${sign.color.toString(16).padStart(6,'0')}`);
  $('turnSplashKicker').textContent=sign.kicker;$('turnSplashTitle').textContent=sign.title;
  $('turnSplashDetail').textContent=sign.detail;$('turnSplashDetail').hidden=!sign.detail;
  el.classList.toggle('compact',!!sign.compact);
  el.hidden=false;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
  clearTimeout(splashTimer);splashTimer=setTimeout(()=>{el.hidden=true;el.classList.remove('show')},2500);
}
function doFall(fromHeight=surfaceHeight(state.x,state.z),reason){
  if(state.phase==='falling')return;
  state.fall=0;state.fallY=fromHeight;state.fallX=state.x;state.fallZ=state.z;state.vx=0;state.vz=0;setPhase('falling');trophy('penalty');
  audio.fall();toast(reason||(LEVEL.theme==='forest'?t('Ner i molnen! +1 pliktslag'):LEVEL.theme==='moon'?t('Ut i rymden! +1 pliktslag'):LEVEL.theme==='halloween'?t('Plask i det svarta vattnet! +1 pliktslag'):t('Plums! +1 pliktslag')),1800);
  burst(state.x,0,state.z,0x9ce8ef,20,1.1);
}
function loadComet(){
  const c=LEVEL.cometCannon;state.x=c.x;state.z=c.z;state.vx=0;state.vz=0;state.aim=c.heading;
  // The moon rocket hides the flight line from the chase camera; show the whole hole.
  if(c.launchY)setOverview(true);
  setPhase('loaded');toast('LADDAD! Tryck FYR ☄',1500);sound(240,.3,'triangle',.08,1.6);
}
function fireComet(){
  if(!quiet)mp.reportFire({cometTime});
  if(LEVEL.cometCannon.launchY)setOverview(false);
  state.cometAngle=barrelAngle(LEVEL.cometCannon,cometTime);state.cometRange=cometRange(LEVEL.cometCannon,cometTime);state.flight=0;setPhase('comet');trophy('cannon');
  course?.cometCannon?.fire();toast('FYR! ☄',900);
  sound(110,.42,'sawtooth',.12,2.8);sound(70,.55,'triangle',.14,.3);
  const c=LEVEL.cometCannon;burst(c.x+Math.cos(state.cometAngle)*1.4,1.2,c.z+Math.sin(state.cometAngle)*1.4,0xffbf5d,30,1.4);
}
function swallow(){
  const hole=LEVEL.blackHole;state.x=hole.x;state.z=hole.z;
  course?.blackHole?.swallow();burst(hole.x,.3,hole.z,0xb69cff,26,1.2);
  doFall(surfaceHeight(hole.x,hole.z),t('Uppslukad av svarta hålet! +1 pliktslag'));
}
function startCannon(){
  state.flight=0;state.vx=0;state.vz=0;setPhase('cannon');trophy('cannon');
  toast('KANONSKOTT! 🚀',1700);
  sound(110,.42,'sawtooth',.13,2.8);sound(70,.55,'triangle',.15,.3);
  burst(CANNON.x,1.1,CANNON.z,0xffbf5d,30,1.4);
}
function startPipe(){
  state.pipe=0;
  state.vx=0;state.vz=0;pipeCooldown=3;setPhase('pipe');trophy('tube');
  toast('RÖRPOST! ✦',1500);sound(380,.36,'sine',.07,1.8);
  burst(PIPE_IN.x,.5,PIPE_IN.z,0x66dbed,19,1);
}
function startRescue(){
  const dx=CUP.x-state.x,dz=CUP.z-state.z,d=Math.hypot(dx,dz)||1;
  rescue={t:0,ball:{x:state.x,z:state.z},dir:{x:dx/d,z:dz/d},events:new Set()};setPhase('rescue');trophy('rescue');
  toast(LEVEL.theme==='forest'?t('På kanten! Mullvaden kommer…'):LEVEL.theme==='clockwork'?t('På kanten! Katten har sett den…'):LEVEL.theme==='halloween'?t('På kanten! Häxans katt smyger fram…'):t('På kanten! Något hoppar hitåt…'),1800);
  if(cameraOverview){cameraOverview=false;$('cameraText').textContent=t('Översikt');setIcon($('cameraIcon'),'map')}
}
function updateRescue(dt){
  const t=(rescue.t+=dt),once=(name,at)=>t>=at&&!rescue.events.has(name)&&rescue.events.add(name);
  const cat=['clockwork','halloween'].includes(LEVEL.theme);
  if(once('hello',.3))audio.critter(LEVEL.theme==='forest'?'dig':cat?'meow':'boop');
  if(once('look',RESCUE.arrive+.1)&&LEVEL.theme!=='forest')audio.critter(cat?'meow':'boop');
  if(once('tap',RESCUE.tap)&&state.phase==='rescue'){
    // The tap-in: just enough to roll over the lip. It counts as a stroke, as a tap-in would.
    audio.critter('tap');state.strokes++;$('strokeCount').textContent=state.strokes;toast('Inknackad · +1 slag',1400);
    state.vx=rescue.dir.x*1.8;state.vz=rescue.dir.z*1.8;state.settle=0;setPhase('moving');
  }
  if(t>=RESCUE.gone){course?.lipRescuer?.hide();rescue=null}
}
function startSink(){
  sink={t:0,entry:{x:state.x-CUP.x,z:state.z-CUP.z,vx:state.vx,vz:state.vz},y:0,events:new Set()};
  state.vx=0;state.vz=0;setPhase('sinking');audio.swoosh();audio.duck(7);
  if(cameraOverview){cameraOverview=false;$('cameraText').textContent=t('Översikt');setIcon($('cameraIcon'),'map')}
}
function updateSink(dt){
  const t=(sink.t+=dt),once=(name,at)=>t>=at&&!sink.events.has(name)&&sink.events.add(name);
  if(t<SINK.settle){const p=sinkPose(t,sink.entry);state.x=CUP.x+p.x;state.z=CUP.z+p.z;sink.y=p.y}
  if(once('drop',SINK.drop)){audio.plink(1);audio.cup()}
  if(once('bounce',SINK.drop+.12))audio.plink(.5);
  const critter=course?.cupCritter;
  if(critter){
    if(once('pop',SINK.settle+.05)){audio.critter('pop');burst(CUP.x,course.cupHeight+.3,CUP.z,0xffffff,10,.5)}
    if(once('gulp',SINK.gulp)){audio.critter('gulp')}
    if(once('munch',SINK.swallowed)){audio.critter('munch');toast(LEVEL.theme==='forest'?t('MUMS! sa mullvaden ✦'):LEVEL.theme==='clockwork'?t('KUKU! Gött! ✦'):LEVEL.theme==='halloween'?t('HEHEHE! Skeletthanden tog bollen ✦'):t('BLIPP! Smaskens ✦'),1600);burst(CUP.x,course.cupHeight+1.1,CUP.z,0xffd264,28,1.2)}
    if(once('duck',SINK.duck))audio.critter('duck');
  }
  if(t>=(critter?SINK.done:SINK.settle+.25))finishSink();
}
function finishSink(){
  if(!sink)return;sink=null;timeScale=1;course?.cupCritter?.hide();rescue=null;course?.lipRescuer?.hide();ball.visible=false;win();
}
// The stroke cap in a match: the hole counts as the cap and the player waits for the others.
function capHole(){
  state.phase='win';state.vx=0;state.vz=0;updateUI();
  $('winStars').textContent=starText(0);$('winStarsNote').textContent=t('{n} slag är max i en match',{n:STROKE_CAP});
  $('winStrokes').textContent=STROKE_CAP;$('winTitle').innerHTML=t('TIO<br><em>SLAG</em>');
  $('winText').textContent=t('Hålet räknas som tio slag. Nästa hål blir bättre!');
  $('win').classList.remove('hidden');mp.finishHole(STROKE_CAP);trophy('matchHole');
}
function win(){
  setPhase('win');state.vx=0;state.vz=0;
  const stars=starsFor(state.strokes,LEVEL.par);
  // Turns: someone else's ball went in. Celebrate it, but it is their score.
  if(mp.watching()){burst(CUP.x,.6,CUP.z,0xffd264,55,1.7);audio.duck(4);audio.fanfare(stars);return}
  const best=Number(localStorage.getItem(LEVEL.recordKey))||Infinity;
  // The event bench never saves scores.
  if(!QA){
    if(state.strokes<best)localStorage.setItem(LEVEL.recordKey,String(state.strokes));
    const run=recordRunHole(localStorage,SELECTION.slot,state.strokes);
    trophy('hole',{strokes:state.strokes,par:LEVEL.par,putt:lastShotPutt});
    // A world played in a row and finished: under par, perhaps three stars all the way.
    const card=run&&runScorecard(run,SELECTION.slot.world);
    if(card?.complete&&!mp.inMatch())trophy('run',{strokes:card.strokes,par:card.par,perfect:card.rows.every(row=>row.stars===3)});
  }
  updateUI();
  const bestNow=bestStars(localStorage,LEVEL);
  $('winStars').textContent=starText(stars);$('winStars').setAttribute('aria-label',t('{n} av 3 stjärnor',{n:stars}));
  $('winStarsNote').textContent=stars===3?t('Alla tre stjärnorna!'):bestNow>stars?t('Ditt bästa: {stars}',{stars:starText(bestNow)}):stars===2?t('Birdie ger tre stjärnor'):stars===1?t('Par ger två stjärnor'):t('Bogey ger en stjärna');
  $('winStrokes').textContent=state.strokes;
  $('winTitle').innerHTML=state.strokes===1?t('HOLE IN<br><em>ONE!</em>'):state.strokes<=LEVEL.par-2?t('EAGLE!<br><em>✦ ✦ ✦</em>'):state.strokes===LEVEL.par-1?t('BIRDIE!<br><em>✦ ✦</em>'):state.strokes===LEVEL.par?t('PÅ PAR!<br><em>✦</em>'):t('I MÅL<br><em>SNYGGT!</em>');
  $('winText').textContent=state.strokes<LEVEL.par?plural(LEVEL.par-state.strokes,'Du slog par med 1 slag. Snyggt jobbat!','Du slog par med {n} slag. Snyggt jobbat!'):state.strokes===LEVEL.par?t('Precis på par. En stark runda!'):t('Flaggan är din – dags för ett nytt försök?');
  if(SELECTION.slot?.finale)$('winText').textContent+=' '+t('Du klarade {finale}!',{finale:SELECTION.slot.world.finale});
  $('win').classList.remove('hidden');
  burst(CUP.x,.6,CUP.z,0xffd264,55,1.7);burst(CUP.x,.6,CUP.z,0xf47761,30,1.2);
  // The world finale on the moon ends with fireworks over the summit.
  if(LEVEL.scenery==='moonrocket')[0xffd264,0x9ff3ff,0xff8fc8,0xb18cff,0x6fe3a0,0xff9f5a].forEach((color,i)=>setTimeout(()=>{
    burst(CUP.x-4+i*1.6,7+(i%3)*1.8,CUP.z+(i%2?-3:3),color,46,2.4);audio.boom(-4+i*1.6);
  },250+i*420));
  if(course?.motherTree){course.motherTree.bloom();burst(LEVEL.treeEye.x,LEVEL.treeEye.y,LEVEL.treeEye.z,0xffb3d4,60,2.2)}
  audio.duck(4);audio.fanfare(stars);
  mp.finishHole(state.strokes);if(mp.inMatch())trophy('matchHole');
}

function celebratePins(indices){
  if(!indices.length||state.phase==='falling')return;
  const count=pinStates.filter(pin=>pin.down).length;
  for(const i of indices){
    const pin=LEVEL.pins[i];burst(pin.x,.7,pin.z,0xffa5d3,10,.7);
  }
  sound(320+count*70,.14,'triangle',.08,1.5);
  if(state.phase!=='win')toast(count===pinStates.length?t('ALLA KÄGLOR! ✦'):t('{count} / {all} KÄGLOR!',{count,all:pinStates.length}),1100);
  if(count===pinStates.length){course?.carnival?.celebrate();trophy('strike')}
}
function physics(dt){
  if(rescue)updateRescue(dt);
  if(state.phase==='sinking'){updateSink(dt);return}
  if(state.phase==='rescue')return;
  stepBellBridge(bellBridgeState,dt,LEVEL.bellBridge);
  if(['idle','power','accuracy','moving'].includes(state.phase)&&tryBoardLift(state,liftState,LEVEL.lift,dt)){
    setPhase('elevator');toast('NÄSTA VÅNING! ↑',1800);sound(165,.6,'triangle',.07,1.8);return;
  }
  celebratePins(advancePins(pinStates,dt,LEVEL.pins));
  gates.forEach((gate,i)=>{gateClocks[i]=advanceGate(gateClocks[i],dt,state,gate)});
  bridgeAngle=stepBridge(bridgeAngle,state,LEVEL.bridge,dt);
  if(['idle','power','accuracy','moving'].includes(state.phase))carryOnClockHand(state,crownTime,crownTime+dt,LEVEL.clockHand);
  if(!['intro','win'].includes(state.phase))crownTime+=dt;
  if(['idle','power','accuracy','moving'].includes(state.phase)&&!supportedByClockHand(state.x,state.z,crownTime,LEVEL.clockHand)){doFall(undefined,t('Ner i urverket! +1 pliktslag'));return}
  if(['idle','power','accuracy','moving'].includes(state.phase)&&!supportedByTrapdoors(state.x,state.z,crownTime,LEVEL.trapdoors)){doFall(undefined,t('Rotluckan öppnades! +1 pliktslag'));return}
  pendulumTime+=dt;cometTime+=dt;wheelTime+=dt;pendulumHitCooldown=Math.max(0,pendulumHitCooldown-dt);
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
    if(blackHolePull(state,LEVEL.blackHole,dt)==='swallowed'){swallow();return}
    const previous={x:state.x,z:state.z};
    state.x+=state.vx*dt;state.z+=state.vz*dt;
    if(crossesHorizon(previous,state,LEVEL.blackHole)){swallow();return}
    if(crossesDock(previous,state,LEVEL.ferris)){
      if(docked(LEVEL.ferris,wheelTime)){
        state.ride=wheelTurn(LEVEL.ferris,wheelTime);state.vx=0;state.vz=0;setPhase('riding');trophy('ferris');
        toast('OMBORD! ✦',1200);sound(520,.3,'sine',.08,1.5);burst(state.x,.4,state.z,0xffd264,18,.8);return;
      }
      state.x=previous.x;state.vx=-state.vx*.5;state.settle=0;
      toast('Grinden är stängd – vänta tills den lyser grönt',1500);sound(150,.12,'triangle',.06,.7);
    }
    if(entersFunnel(previous,state,LEVEL.funnel)){
      funnelRide=startFunnelRide(state,LEVEL.funnel);funnelPosition=sampleFunnelRide(funnelRide,funnelTrack);
      tubeCameraEntry={position:cameraPosition.clone(),target:cameraTarget.clone(),up:camera.up.clone()};
      state.vx=0;state.vz=0;setPhase('funnel');trophy('tube');
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
      course?.carnival?.bounce();course?.motherTree?.bounce();toast('BOING! ✦',1300);
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
    if(collideWalls(state))audio.knock(Math.hypot(state.vx,state.vz));
    if(collideWalls(state,liftBarriers(liftState,LEVEL.lift),[]))sound(190,.1,'triangle',.04);
    if(strikeBell(state,bellBridgeState,LEVEL.bellBridge)){
      toast('KLANG! Genvägen öppnas',2200);sound(523,.9,'sine',.15,1);sound(1046,.6,'triangle',.045,1);
      const s=LEVEL.bellBridge.switch;burst(s.x,.55,s.z,0xffd784,22,.7);
    }
    if(collideBellBridge(state,bellBridgeState,LEVEL.bellBridge)){
      sound(145,.1,'triangle',.04);toast('Träffa klockknappen för att öppna bron',1600);
    }
    if(!onCourse(state.x,state.z)){
      // In weak gravity the ball floats on over a gap instead of dropping at once.
      if(inLowGravity(previous.x,previous.z,LEVEL.lowGravity)){
        state.float=0;state.floatY=surfaceHeight(previous.x,previous.z);setPhase('floating');
        toast('SVÄVAR! ✦',1100);sound(300,.5,'sine',.07,1.6);return;
      }
      doFall(surfaceHeight(previous.x,previous.z));return;
    }
    if(!supportedByClockHand(state.x,state.z,crownTime,LEVEL.clockHand)){doFall(undefined,t('Missad visarbrygga! +1 pliktslag'));return}
    if(!supportedByTrapdoors(state.x,state.z,crownTime,LEVEL.trapdoors)){doFall(undefined,t('Rotluckan öppnades! +1 pliktslag'));return}
    gates.forEach((gate,i)=>{if(collideGate(state,gate,gateClocks[i]))sound(190,.08,'triangle',.04,.8)});
    if(SPINNER)collideSpinner(state,(SPINNER.custom==='thorn'?crownTime:elapsed)*SPINNER.speed);
    (LEVEL.bumpers||[]).forEach((bumper,i)=>{
      if(collideBumper(state,bumper)){
        if(course?.bumpers[i])course.bumpers[i].pulse=1;
        sound(680,.16,'sine',.09,1.7);burst(bumper.x,.65,bumper.z,0xffa7dc,12,.8);
        toast(LEVEL.bumperToast??(LEVEL.clockWheel?t('KLANG!'):t('FLIPPER!')),850);state.settle=0;
      }
    });
    (LEVEL.pins||[]).forEach((pin,i)=>{
      if(knockPin(state,pin,pinStates[i]))celebratePins([i]);
    });
    if(LEVEL.hasPipe&&pipeCooldown<=0&&entersPipe(previous,state)){startPipe();return}
    if(LEVEL.hasPipe)collidePipe(state);
    if(CANNON&&Math.hypot(state.x-CANNON.x,state.z-CANNON.z)<1.02){startCannon();return}
    if(loadsCannon(state,LEVEL.cometCannon)){
      state.vx=0;state.vz=0;state.feed=0;setPhase('loading');course?.cometCannon?.suck();sound(320,.45,'sine',.07,2.2);return;
    }
    SPRINGS.forEach((spring,i)=>{
      if(springCooldowns[i]>0||!padTriggers(state,spring))return;
      springCooldowns[i]=2;state.boost=.42;springImpulse(state,spring);course?.rocketPads?.fire(i);
      state.aim=Math.atan2(state.vz,state.vx);state.shotAge=0;state.settle=0;
      toast(LEVEL.springToasts?.[i]??(SPRINGS.length>1?t('STUDS {n}!',{n:i+1}):t('STUDSPLATTA!')),1300);
      sound(380,.26,'sine',.1,2.8);burst(spring.x,.25,spring.z,0xffd36c,17,1.1);
    });
    if(shouldSink(state,CUP)){startSink();return}
    if(Math.hypot(state.vx,state.vz)<.23){
      state.settle+=dt;
      if(state.settle>.45){state.vx=0;state.vz=0;if(onTheLip(state,CUP)&&course?.lipRescuer){startRescue();return}setPhase('idle');toast('Din tur igen',1000)}
    }else state.settle=0;
    if(state.shotAge>14){state.vx=0;state.vz=0;setPhase('idle')}
  }else if(state.phase==='floating'){
    const result=stepFloat(state,dt,onCourse);
    if(result==='land'){
      state.settle=0;state.shotAge=0;setPhase('moving');
      sound(180,.14,'triangle',.08,.8);burst(state.x,surfaceHeight(state.x,state.z)+.2,state.z,0xc8b6ff,16,.7);
    }else if(result==='lost')doFall(state.floatY-floatDrop(state.float),t('Ut i rymden! +1 pliktslag'));
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
      toast(rolledBack?t('För lite fart – tillbaka till ansatsen'):LEVEL.loop.exitToast||t('ROTVOLT! ↻ Bromsa före kanten'),1800);
      sound(rolledBack?140:640,.25,'triangle',.09,rolledBack?.6:1.4);
      if(!rolledBack){burst(state.x,.7,state.z,0xffd884,22,.9);trophy('loop')}
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
    if(fromDrum&&LEVEL.treeEye){
      // Only the tunnel lets a flight through the Mother Tree.
      const pass=crossTreeEye(previous,p,LEVEL.treeEye);
      if(pass==='bark'){state.x=previous.x;state.z=previous.z;doFall(previous.y,t('Rakt i barken! +1 pliktslag'));return}
      if(pass==='eye'&&!hoopHit){
        hoopHit=true;course?.motherTree?.celebrate();toast('GENOM ÖGAT! ✦',1300);
        sound(660,.3,'sine',.09,1.6);burst(p.x,p.y+.4,p.z,0xffd884,26,1.1);
      }
    }
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
  }else if(state.phase==='loading'){
    state.feed+=dt;const pose=feedPose(LEVEL.cometCannon,state.feed);state.x=pose.x;state.z=pose.z;
    if(pose.done)loadComet();
  }else if(state.phase==='riding'){
    const wheel=LEVEL.ferris,pose=ridePose(wheel,state.ride,wheelTime);state.x=pose.x;state.z=pose.z;
    if(pose.done){
      state.x=wheel.exitX;state.z=wheel.z;state.vx=wheel.exitPush;state.vz=0;state.settle=0;state.shotAge=0;setPhase('moving');
      toast('AVSTIGNING! ✦',1000);sound(260,.18,'triangle',.08,1.2);burst(state.x,surfaceHeight(state.x,state.z)+.3,state.z,0xffd264,18,.8);
    }
  }else if(state.phase==='comet'){
    const c=LEVEL.cometCannon;state.flight+=dt;
    const pose=cometPose(c,state.cometAngle,state.flight,state.cometRange);state.x=pose.x;state.z=pose.z;
    if(pose.done){
      if(!onCourse(state.x,state.z)){state.reload=true;doFall(0,t('Kometen for ut i rymden! +1 pliktslag'));return}
      const v=landingVelocity(c,state.cometAngle);state.vx=v.vx;state.vz=v.vz;state.settle=0;state.shotAge=0;setPhase('moving');
      toast('LANDNING! ✦',900);burst(state.x,.3,state.z,0xffd264,26,1.2);sound(200,.14,'triangle',.1,.7);
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
      state.strokes++;state.vx=0;state.vz=0;ball.visible=true;
      // A missed comet goes back into the cannon for another try.
      if(state.reload){state.reload=false;loadComet();return}
      state.x=state.saved.x;state.z=state.saved.z;state.aim=state.saved.aim??state.aim;setPhase('idle');
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
  if(phase==='floating')extraY=state.floatY-ballHeight-floatDrop(state.float);
  if(phase==='riding')extraY=ridePose(LEVEL.ferris,state.ride,wheelTime).y-ballHeight;
  if(phase==='loading')extraY=feedPose(LEVEL.cometCannon,state.feed).y-ballHeight-.04-BALL_RADIUS;
  if(phase==='comet')extraY=cometPose(LEVEL.cometCannon,state.cometAngle,state.flight,state.cometRange).y;
  if(phase==='sinking'&&sink)extraY=sink.y;
  ball.position.set(state.x,ballHeight+.04+BALL_RADIUS+extraY,state.z);
  ball.visible=phase!=='loaded'&&phase!=='win';ball.scale.setScalar(1);
  ghosts?.update(dt);
  mp.reportBall({x:ball.position.x,y:ball.position.y,z:ball.position.z,strokes:state.strokes,hidden:!ball.visible||phase==='sinking',
    sx:state.x,sz:state.z,aim:state.aim,phase,power:state.power,putt:puttEnabled,meter:phase==='power'?elapsed-state.meterStart:phase==='accuracy'?elapsed-state.accuracyStart:0});
  if(rescue)course?.lipRescuer?.update(rescue.t,rescue.ball,rescue.dir,camera);
  if(phase==='sinking'&&sink){
    // The flag comes out of the cup, and the critter takes the ball in its mouth.
    const lift=THREE.MathUtils.smoothstep(sink.t,0,.25);
    if(course?.flagstick){course.flagstick.position.y=course.cupHeight+2.2*lift;course.flagstick.rotation.z=.3*lift}
    const held=course?.cupCritter?.update(sink.t,camera);
    if(held){ball.position.copy(held.ball);ball.scale.setScalar(held.scale/.75*.75);ball.visible=held.scale>.01}
  }
  const rollingSpeed=Math.hypot(state.vx,state.vz);
  audio.roll(phase==='moving'?rollingSpeed:0);
  trail.forEach(m=>{m.material.opacity=Math.max(0,m.material.opacity-dt*1.8);m.scale.multiplyScalar(Math.exp(-dt*2))});
  trailTimer+=dt;
  if(trailTimer>.025){trailTimer=0;if((phase==='moving'&&rollingSpeed>6)||phase==='looping'||phase==='bridgeflight'||phase==='drumflight'||phase==='floating'||phase==='comet'){
    const m=trail[trailCursor++%trail.length];m.position.copy(ball.position);m.scale.setScalar(1);m.material.opacity=.65;
  }}
  if(rollingSpeed>.001){
    rollAxis.set(state.vz,0,-state.vx).normalize();
    ballCore.rotateOnWorldAxis(rollAxis,rollingSpeed*dt/BALL_RADIUS);
  }
  ballShadow.position.set(state.x,ballHeight+.08,state.z);ballShadow.visible=phase!=='sinking'&&phase!=='win'&&phase!=='looping'&&phase!=='bridgeflight'&&phase!=='drumflight'&&phase!=='cannon'&&phase!=='comet'&&phase!=='loaded'&&phase!=='loading'&&phase!=='riding'&&phase!=='falling'&&phase!=='pipe';
  if(phase==='funnel')ballShadow.visible=false;
  halo.position.set(state.x,ballHeight+.085,state.z);halo.visible=phase==='idle'||phase==='power'||phase==='accuracy';
  if(LEVEL.heightProfile){
    const tilt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.atan(heightSlope(state.x,state.z)));
    for(const marker of [ballShadow,halo]){marker.rotation.set(-Math.PI/2,0,0);marker.quaternion.premultiply(tilt)}
  }
  halo.material.opacity=.28+.08*Math.sin(elapsed*3);
  aimGroup.visible=phase==='idle'||phase==='power'||phase==='accuracy';
  const c=Math.cos(state.aim),s=Math.sin(state.aim);
  const aimLength=puttEnabled&&(phase==='power'||phase==='accuracy')?puttLength:puttEnabled&&phase==='idle'&&nearPutt?nearPutt.distance:6.25;
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
      $('routeDetail0').textContent={green:t('Rak bro · läge för kraftslag'),amber:t('Snart vridning · vänta'),red:t('Passagen stängd · invänta grönt')}[signal];
      $('routeDetail0').style.color={green:'#a1ecc4',amber:'#f4ca7f',red:'#edbba5'}[signal];
    }
    if(LEVEL.clockWheel){
      const signal=wheelSignal(crownTime,LEVEL.clockWheel);
      $('routeDetail0').textContent={green:t('Öppning vid golvet'),amber:t('Öppningen passerar'),red:t('Vänta på nästa öppning')}[signal];
      $('routeDetail0').style.color={green:'#a1ecc4',amber:'#f4ca7f',red:'#edbba5'}[signal];
    }
    course.carnival?.update(dt,elapsed,pinStates);course.motherTree?.update(dt,elapsed);course.rocketPads?.update(dt);course.blackHole?.update(dt,elapsed);
    if(LEVEL.ferris)course.ferris?.update(wheelTurn(LEVEL.ferris,wheelTime),docked(LEVEL.ferris,wheelTime));
    if(LEVEL.cometCannon){const angle=barrelAngle(LEVEL.cometCannon,cometTime),range=cometRange(LEVEL.cometCannon,cometTime),spot=cometLanding(LEVEL.cometCannon,angle,range);course.cometCannon?.update(dt,angle,state.phase==='loaded',onCourse(spot.x,spot.z),range)}
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
  if(LEVEL.treeEye&&phase==='drumflight'&&!cameraOverview){
    // A wide side view shows the tunnel, the flight and the landing together.
    const e=LEVEL.treeEye;
    desiredPosition.set(e.x-1,e.y+6,e.z+20);
    desiredTarget.set((state.x+e.x)/2+2,e.y-.5,e.z);
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
  if(rescue&&phase!=='sinking'&&phase!=='win'&&!cameraOverview&&!reducedCameraMotion){
    // A side view of the ball, the cup and the helper.
    const mx=(rescue.ball.x+CUP.x)/2,mz=(rescue.ball.z+CUP.z)/2,h=course?.cupHeight??0;
    let px=-rescue.dir.z,pz=rescue.dir.x;if(px*(cameraPosition.x-mx)+pz*(cameraPosition.z-mz)<0){px=-px;pz=-pz}
    desiredPosition.set(mx+px*3.4-rescue.dir.x*1.2,h+1.8,mz+pz*3.4-rescue.dir.z*1.2);desiredTarget.set(mx-rescue.dir.x*.3,h+.3,mz-rescue.dir.z*.3);desiredFov=46;
  }
  if(phase==='sinking'&&sink&&!cameraOverview&&!reducedCameraMotion){
    // Down to the cup, looking along the line the ball came in on.
    const speed=Math.hypot(sink.entry.vx,sink.entry.vz);
    let bx=speed>.01?-sink.entry.vx/speed:-Math.cos(state.aim),bz=speed>.01?-sink.entry.vz/speed:-Math.sin(state.aim);
    // After a tap-in the helper stands behind the ball: watch from its side instead.
    if(rescue){bx=-rescue.dir.z;bz=rescue.dir.x;if(bx*(cameraPosition.x-CUP.x)+bz*(cameraPosition.z-CUP.z)<0){bx=-bx;bz=-bz}}
    const up=sink.t>SINK.settle?1:0,h=course?.cupHeight??0;
    desiredPosition.set(CUP.x+bx*3.1-bz*.8,h+1.55+up*.35,CUP.z+bz*3.1+bx*.8);
    desiredTarget.set(CUP.x,h-.1+up*.6,CUP.z);desiredFov=44;
  }
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
    const smoothing=1-Math.exp(-(tubeCameraRecovery>0?2.7:phase==='sinking'?3.2:5.2)*(phase==='sinking'?realDt:dt));
    cameraPosition.lerp(desiredPosition,smoothing);cameraTarget.lerp(desiredTarget,smoothing);
    camera.up.lerp(new THREE.Vector3(0,1,0),1-Math.exp(-5*dt)).normalize();
  }
  shotKick=Math.max(0,shotKick-dt*2);camera.fov=THREE.MathUtils.lerp(camera.fov,desiredFov+shotKick*2,1-Math.exp(-7*(phase==='sinking'?realDt:dt)));camera.updateProjectionMatrix();
  camera.position.copy(cameraPosition);camera.lookAt(cameraTarget);
  const activeCamera=cameraOverview?overviewCamera:camera;
  course?.environment.updateView?.(activeCamera,ball.position,dt,cameraOverview);
  if(forestRenderer)forestRenderer.render(activeCamera);else renderer.render(scene,activeCamera);
  const label=$('floatingLabel');
  if(phase==='moving'&&state.shotAge<1.15){
    const v=new THREE.Vector3(state.x,ballHeight+1.1,state.z).project(activeCamera);
    label.style.left=`${(v.x*.5+.5)*innerWidth}px`;label.style.top=`${(-v.y*.5+.5)*innerHeight}px`;
    label.textContent=t('SLAG {n}',{n:state.strokes});label.style.opacity=String(Math.min(1,(1.15-state.shotAge)*2));
  }else label.style.opacity='0';
}
function frame(){
  requestAnimationFrame(frame);
  realDt=Math.min(clock.getDelta(),.05);
  const slow=sink&&sink.t<SINK.settle&&!reducedCameraMotion?SLOW_MOTION:1;timeScale+=(slow-timeScale)*Math.min(1,realDt*8);
  const dt=realDt*timeScale;elapsed+=dt;
  if(preview>0){preview-=dt;if(preview<=0)finishPreview()}
  if(pendingFire&&state.phase==='loaded'){cometTime=pendingFire.cometTime;pendingFire=null;fireComet()}
  if(state.phase==='idle'&&!mp.watching()){
    const direction=Number(aimKeys.has('KeyD')||aimKeys.has('ArrowRight'))-Number(aimKeys.has('KeyA')||aimKeys.has('ArrowLeft'));
    state.aim+=direction*dt*(aimKeys.has('ShiftLeft')||aimKeys.has('ShiftRight')?.15:.65);
    if(fineAim){fineAimHeld+=dt;state.aim+=fineAim*dt*(fineAimHeld>.7?.3:.1)}
  }
  if(state.phase==='power')state.power=powerAt(elapsed-state.meterStart);
  if(state.phase==='power'&&puttEnabled)puttLength=puttLengthAt(state.power);
  if(state.phase==='idle'&&!wasIdle)aimAtIdle=state.aim;wasIdle=state.phase==='idle';
  coach.update({
    // The first-round tips are for playing alone: never in a match or over the room panel.
    enabled:!QA&&!mp.inMatch()&&!$('mpPanel').open&&preview<=0&&['idle','power','accuracy'].includes(state.phase)&&$('intro').classList.contains('hidden')&&$('menu').classList.contains('hidden')&&!$('helpPanel').open&&!$('levelPanel').open&&!$('soundPanel').open,
    phase:state.phase,putting:puttEnabled&&!!nearPutt,shots:state.strokes,aimMoved:Math.abs(state.aim-aimAtIdle)>.12,overview:cameraOverview,
  },elapsed);
  if(state.phase==='accuracy')state.needle=precisionAt(elapsed-state.accuracyStart);
  $('meterValue').textContent=state.phase==='accuracy'?t('Pricka grönt'):state.phase==='power'?(puttEnabled?`${num(puttLength)} m`:`${state.power>.82?t('MAXKRAFT')+' · ':''}${Math.round(state.power*100)} %`):'';
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
  if(endPreview()||mp.watching())return;
  if(state.phase==='sinking'){finishSink();return}
  if(state.phase==='loaded'){fireComet();return}
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
  if(draggingAim&&puttEnabled&&!cameraOverview&&Math.hypot(e.clientX-pointerDownX,e.clientY-pointerDownY)<(e.pointerType==='touch'?12:5))overviewAim(e,camera);
  draggingAim=false;
});
canvas.addEventListener('pointercancel',()=>{draggingAim=false});
window.addEventListener('keydown',e=>{
  if(e.code==='Escape'){
    if($('helpPanel').open)$('helpPanel').close();
    if($('levelPanel').open)$('levelPanel').close();
    if($('soundPanel').open)$('soundPanel').close();
    if(['power','accuracy'].includes(state.phase)&&!mp.watching()){state.power=0;setPhase('idle')}
    return;
  }
  // Typing a name or a room code: the letters are text, not game keys.
  const field=e.target instanceof HTMLElement?e.target:null;
  if(field&&(field.isContentEditable||field instanceof HTMLTextAreaElement||(field instanceof HTMLInputElement&&!['range','checkbox','radio','button'].includes(field.type))))return;
  if(e.code==='KeyM'&&!e.repeat){applySound({on:!audioSettings.on});toast(audioSettings.on?t('Ljudet på'):t('Ljudet av'),1000);return}
  if($('helpPanel').open||$('levelPanel').open||$('soundPanel').open||$('mpPanel').open)return;
  if(e.target instanceof HTMLInputElement&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.code))return;
  if(e.code==='Space'||e.code==='Enter'){
    if(state.phase==='sinking'){e.preventDefault();finishSink();return}
    if(state.phase==='intro'||state.phase==='win')return;
    if(e.target instanceof HTMLElement&&e.target.closest('button')&&e.target.id!=='actionButton')return;
    e.preventDefault();if(!e.repeat)action();
  }
  if(['KeyA','KeyD','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){
    e.preventDefault();aimKeys.add(e.code);
  }
  if(e.code==='KeyR'&&state.phase!=='intro'&&!mp.inMatch()){reset();$('win').classList.add('hidden')}
});
window.addEventListener('keyup',e=>aimKeys.delete(e.code));
window.addEventListener('keydown',e=>{if(!e.repeat&&e.code!=='Tab')setInput('mouse')},true);
window.addEventListener('blur',()=>{aimKeys.clear();draggingAim=false;fineAim=0});
// Fine aim for touch: a tap nudges about 0.2 degrees, holding turns slowly and then a little faster.
for(const [id,dir] of [['aimLeft',-1],['aimRight',1]]){
  const button=$(id);
  button.addEventListener('pointerdown',e=>{
    if(state.phase!=='idle')return;
    e.preventDefault();button.setPointerCapture(e.pointerId);
    state.aim+=dir*.0035;fineAim=dir;fineAimHeld=0;
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,()=>{fineAim=0});
  button.addEventListener('contextmenu',e=>e.preventDefault());
}
$('helpButton').addEventListener('click',()=>{
  if(['power','accuracy'].includes(state.phase)){state.power=0;setPhase('idle')}
  aimKeys.clear();$('helpPanel').showModal();
});
$('closeHelp').addEventListener('click',()=>$('helpPanel').close());
$('actionButton').addEventListener('click',action);
$('cancelShot').addEventListener('click',()=>{if(['power','accuracy'].includes(state.phase)){state.power=0;setPhase('idle')}});
$('mpReact').addEventListener('click',e=>{const b=e.target.closest('[data-react]');if(b){mp.react(b.dataset.react);b.blur()}});
$('shotMode').addEventListener('click',()=>{if(!mp.watching())puttEnabled=!puttEnabled;updateUI();$('shotMode').blur()});
$('playButton').addEventListener('click',()=>{lockPortrait();audio.unlock();$('intro').classList.add('hidden');if(state.phase==='intro'||!mp.inMatch())reset();startPreview();if(pendingSplash)showSplash(pendingSplash)});
$('againButton').addEventListener('click',()=>{$('win').classList.add('hidden');reset()});
$('resetButton').addEventListener('click',()=>{if(state.phase!=='intro'&&!mp.inMatch()){reset();$('win').classList.add('hidden')}});
$('cameraButton').addEventListener('click',()=>{preview=0;setOverview(!cameraOverview)});
// Sound settings: everything on or off, and music, effects and ambience apart.
function applySound(change={}){
  Object.assign(audioSettings,change);audioEnabled=audioSettings.on;audio.setLevels(audioSettings);saveAudioSettings(localStorage,audioSettings);
  const silent=!audioSettings.on||audioSettings.music+audioSettings.effects+audioSettings.ambience===0;
  $('soundButton').classList.toggle('off',silent);setIcon($('soundIcon'),silent?'mute':'sound');
  $('soundOn').checked=audioSettings.on;$('soundPanel').classList.toggle('muted',!audioSettings.on);
  for(const key of ['music','effects','ambience']){$(`${key}Level`).value=Math.round(audioSettings[key]*100);$(`${key}Value`).textContent=`${Math.round(audioSettings[key]*100)} %`}
}
function openSound(){if(['power','accuracy'].includes(state.phase)){state.power=0;setPhase('idle')}aimKeys.clear();audio.unlock();$('soundPanel').showModal()}
$('soundButton').addEventListener('click',openSound);
$('menuSound').addEventListener('click',openSound);
$('closeSound').addEventListener('click',()=>$('soundPanel').close());
$('soundOn').addEventListener('change',e=>applySound({on:e.target.checked}));
for(const key of ['music','effects','ambience'])$(`${key}Level`).addEventListener('input',e=>applySound({[key]:Number(e.target.value)/100,on:true}));
applySound();
window.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>audio.setHidden(document.hidden));

const recordText=level=>{const best=localStorage.getItem(level.recordKey);return best?`${starText(bestStars(localStorage,level))} · ${t('Bästa {n}',{n:best})}`:t('Inget rekord')};
function openLevels(){
  if(['power','accuracy'].includes(state.phase)){state.power=0;setPhase('idle')}
  aimKeys.clear();
  for(const level of LEVELS)$(`record-${level.id}`).textContent=recordText(level);
  WORLDS.forEach(world=>{const {stars,max}=worldStars(localStorage,world);$(`stars-${world.key}`).textContent=`${stars}/${max} ★`});
  $('levelPanel').showModal();
}
$('levelsButton').addEventListener('click',openLevels);
$('introLevels').addEventListener('click',openLevels);
$('winLevels').addEventListener('click',openLevels);
$('closeLevels').addEventListener('click',()=>$('levelPanel').close());
$('levelOptions').addEventListener('click',event=>{if(event.target.closest('a.hole-card'))endWorldRun(localStorage)});
$('menuContinue').addEventListener('click',()=>endWorldRun(localStorage));

function holeCard(slot){
  const number=holeLabel(slot.hole);
  if(slot.placeholder)return `<div class="hole-card placeholder" title="${slot.placeholder.idea}">
      <span class="hole-number">${number}</span><strong>${slot.placeholder.name}</strong>
      <small>${slot.placeholder.idea}</small><span class="hole-status">${t('Byggs')}</span></div>`;
  const {level}=slot;
  return `<a id="level-${level.id}" href="?hole=${slot.hole}" class="hole-card" data-world="${slot.world.key}">
      <span class="hole-number">${number}</span><strong>${level.name}</strong>
      <small>${level.feature}</small><span class="hole-meta">PAR ${level.par}${slot.finale?' · '+t('FINAL'):''} · <span id="record-${level.id}">${t('Inget rekord')}</span></span></a>`;
}
const worldRange=(world,w)=>`${world.label?`${world.label} · `:''}${t('HÅL {from}–{to}',{from:holeLabel(w*6+1),to:holeLabel(w*6+6)})}`;
// Special worlds (Spökhamnen) are shown first while they are in season.
const menuOrder=()=>WORLDS.map((world,w)=>[world,w]).sort(([a],[b])=>!!b.special-!!a.special);
function worldSection([world,w]){
  const slots=ROUND.filter(slot=>slot.world===world),mine=worldProgress(localStorage,world);
  const status=mine.played===mine.total?t('Klarad ✓'):mine.played?t('{played} av {total} klarade',mine):t('Inte spelad'),built=mine.played===mine.total?6:0;
  return `<section class="world-section" data-world="${world.key}">
    <header><div><span class="world-range">${worldRange(world,w)}</span><h3>${world.name}</h3></div>
    <span class="world-badges"><span id="stars-${world.key}" class="world-stars"></span><span class="world-status${built===6?' done':''}">${status}</span></span></header>
    <div class="hole-grid">${slots.map(holeCard).join('')}</div></section>`;
}
function configureMenu(){
  // Progress is the player's: holes cleared and stars, from each hole's best score.
  const campaign=campaignProgress(localStorage);
  $('menuWorlds').innerHTML=menuOrder().map(([world,w])=>{const built=builtCount(world),mine=worldProgress(localStorage,world);
    return `<div class="menu-world${world.special?' special':''}" data-world="${world.key}"><div class="menu-world-head"><strong>${world.name}</strong><span>${worldRange(world,w)}</span></div>
      <div class="menu-progress" role="img" aria-label="${t('{played} av {total} hål klarade',mine)}">${ROUND.filter(s=>s.world===world).map(s=>`<i class="${s.level&&localStorage.getItem(s.level.recordKey)?'built':''}"></i>`).join('')}</div>
      <small>${mine.played===mine.total?t('Klarad ✓'):mine.played?t('{played} av {total} klarade',mine):t('Inte spelad')} · ${world.tagline}</small>
      ${built?`<div class="menu-world-foot"><span class="world-stars">${worldStars(localStorage,world).stars}/${worldStars(localStorage,world).max} ★</span><button class="world-play" data-world="${world.key}">${t('Spela {n} hål',{n:built})} <span>→</span></button></div>`:''}</div>`}).join('');
  $('menuWorlds').querySelectorAll('.world-play').forEach(button=>button.addEventListener('click',()=>{
    const first=startWorldRun(localStorage,WORLDS.find(world=>world.key===button.dataset.world));
    location.href=`?hole=${first.hole}`;
  }));
  $('menuProgress').innerHTML=`<strong>★ ${campaign.stars}</strong><span>${t('av {max} stjärnor · {played} av {total} hål klarade',campaign)}</span>`;
  $('menuSummary').textContent=campaign.complete?t('Kampanjen klar! Jaga de stjärnor som fattas.'):plural(campaign.total-campaign.played,'1 hål kvar till kampanjens slut','{n} hål kvar till kampanjens slut');
  $('menuEnding').hidden=!campaign.complete;
  const unplayed=CAMPAIGN.find(slot=>slot.level&&!localStorage.getItem(slot.level.recordKey));
  if(unplayed&&unplayed.hole>1){$('menuContinue').hidden=false;$('menuContinue').href=`?hole=${unplayed.hole}`;$('menuContinue').innerHTML=`<i data-icon="arrow"></i>${t('Fortsätt · Hål {hole} {name}',{hole:holeLabel(unplayed.hole),name:unplayed.level.name})}`;hydrateIcons($('menuContinue'))}
  if(SELECTION.missing){$('menuNotice').hidden=false;$('menuNotice').textContent=t('Hål {hole} · {name} byggs fortfarande.',{hole:holeLabel(SELECTION.missing.hole),name:SELECTION.missing.placeholder.name})}
}
$('menuPlay').addEventListener('click',()=>{
  endWorldRun(localStorage);
  history.replaceState(null,'','?hole=1');
  document.title=`${LEVEL.name} · ${t('Hål {n}',{n:'01'})}`;
  $('menu').classList.add('hidden');$('intro').classList.remove('hidden');$('playButton').focus();
});
$('menuLevels').addEventListener('click',openLevels);
// The language: native names, a reload on change.
$('menuLanguage').innerHTML=LANGUAGES.map(l=>`<button data-lang="${l.code}" title="${l.name}" aria-label="${l.name}"${l.code===lang?' class="active" aria-pressed="true"':' aria-pressed="false"'}><span aria-hidden="true">${l.flag}</span><b>${l.code.toUpperCase()}</b></button>`).join('');
$('menuLanguage').addEventListener('click',e=>{const b=e.target.closest('[data-lang]');if(b&&b.dataset.lang!==lang)setLanguage(b.dataset.lang)});
// --- Trophies: the cabinet in the menu, and a toast when one is won. ---
const TIER_NAMES={bronze:t('Brons'),silver:t('Silver'),gold:t('Guld'),platinum:t('Platina')};
const trophiesOf=tier=>trophies.TROPHIES.filter(x=>x.tier===tier);
function updateTrophyCount(){$('menuTrophyCount').textContent=`${trophies.getUnlocked().length}/${trophies.TROPHIES.length}`}
function openTrophies(){
  const held=new Set(trophies.getUnlocked());
  $('trophySummary').textContent=t('{n} av {all} troféer',{n:trophies.TROPHIES.filter(x=>held.has(x.id)).length,all:trophies.TROPHIES.length});
  $('trophyTally').innerHTML=trophies.TIERS.map(tier=>{const all=trophiesOf(tier);
    return `<div class="tally tally--${tier}"><b>${all.filter(x=>held.has(x.id)).length}<small>/${all.length}</small></b><span>${TIER_NAMES[tier]}</span></div>`}).join('');
  // A grid per tier, as in GameVolt's other games; a locked trophy shows its object in dark metal.
  $('trophyList').innerHTML=trophies.TIERS.map(tier=>{const items=trophiesOf(tier);
    return `<h3 class="tier-head tier-head--${tier}">${TIER_NAMES[tier]}<span>${items.filter(x=>held.has(x.id)).length}/${items.length}</span></h3><div class="trophy-grid">${items.map(x=>
      `<div class="trophy-card trophy-card--${tier}${held.has(x.id)?' is-held':''}" role="img" aria-label="${t(x.name)}: ${t(x.desc)}${held.has(x.id)?'':` (${t('låst')})`}"><img src="${trophies.trophyArt(x)}" alt="" width="96" height="96" loading="lazy" decoding="async" /><b>${t(x.name)}</b><small>${t(x.desc)}</small></div>`).join('')}</div>`}).join('');
  $('trophyPanel').showModal();
}
$('menuTrophies').addEventListener('click',openTrophies);
$('closeTrophies').addEventListener('click',()=>$('trophyPanel').close());
const trophyQueue=[];let trophyShowing=false;
function showTrophyToast(x){trophyQueue.push(x);updateTrophyCount();if(!trophyShowing)nextTrophyToast()}
function nextTrophyToast(){
  const x=trophyQueue.shift();if(!x){trophyShowing=false;return}
  trophyShowing=true;const el=$('trophyToast');
  $('trophyToastArt').src=trophies.trophyArt(x);$('trophyToastName').textContent=t(x.name);
  $('trophyToastTier').textContent=TIER_NAMES[x.tier];el.className=`trophy-toast trophy-toast--${x.tier}`;
  el.hidden=false;void el.offsetWidth;el.classList.add('show');
  const lift=x.tier==='platinum'?2:x.tier==='gold'?1.5:x.tier==='silver'?1.26:1;
  sound(784*lift,.16,'triangle',.06,1.2);setTimeout(()=>sound(1175*lift,.3,'triangle',.05,1.1),130);
  setTimeout(()=>{el.classList.remove('show');setTimeout(()=>{el.hidden=true;nextTrophyToast()},400)},3400);
}
updateTrophyCount();
$('menuFriends').hidden=!mp.available;
$('menuFriends').addEventListener('click',()=>mp.openLobby());
$('menuHelp').addEventListener('click',()=>$('helpPanel').showModal());
$('coachReset').addEventListener('click',()=>{coach.reset();$('helpPanel').close();toast('Tipsen visas igen',1400)});
$('menuEnding').addEventListener('click',()=>{$('menu').classList.add('hidden');openEnding()});

function configureLevelUI(){
  const campaign=campaignProgress(localStorage);
  $('levelSummary').textContent=t('{played} av {total} hål klarade · ★ {stars} av {max} stjärnor',campaign);
  $('levelOptions').innerHTML=menuOrder().map(worldSection).join('');
  const number=holeLabel(SELECTION.slot.hole);
  const holeText=t('HÅL {n}',{n:number});
  const theme=themeFor(LEVEL.id);
  document.documentElement.dataset.theme=theme.key;
  document.documentElement.dataset.hole=LEVEL.id;
  const run=activeRun(localStorage,SELECTION.slot);
  if(run){const holes=ROUND.filter(slot=>slot.world===SELECTION.slot.world&&slot.level);$('worldName').textContent=`${theme.name} · ${t('hål {n} av {all}',{n:holes.indexOf(SELECTION.slot)+1,all:holes.length})}`}
  else $('worldName').textContent=theme.name;
  $('introWorld').textContent=`${SELECTION.slot.world.name} · ${theme.range}`;
  $('meter').style.setProperty('--sweet-start',`${50-PERFECT_ZONE*50}%`);
  $('meter').style.setProperty('--sweet-end',`${50+PERFECT_ZONE*50}%`);
  $('meter').style.setProperty('--sweet-width',`${PERFECT_ZONE*100}%`);
  configureNext();

  document.title=SELECTION.menu?'Mini Mayhem':`${LEVEL.name} · ${t('Hål {n}',{n:number})}`;
  $('holeNumber').textContent=number;$('holeName').textContent=LEVEL.name.toUpperCase();
  $('parCount').textContent=LEVEL.par;
  $('introKicker').textContent=mp.inMatch()?mp.holeLabel():SELECTION.slot.finale?`${SELECTION.slot.world.finale.toUpperCase()} · ${holeText}`:t('VÄLKOMMEN TILL {hole}',{hole:holeText});
  // A match cannot be restarted hole by hole: the reset button is gone and the
  // way onward is the room's, not the round's.
  $('resetButton').hidden=mp.inMatch();$('mpReact').hidden=!mp.inMatch();
  $('introTitle').innerHTML=`${LEVEL.title[0]}<br><em>${LEVEL.title[1]}</em><span class="title-star">✦</span>`;
  $('introDescription').textContent=LEVEL.description;
  $('featureBadge').textContent=LEVEL.feature.toUpperCase();$('parBadge').textContent=`⛳ PAR ${LEVEL.par}`;
  $('playButton').innerHTML=`${t('SPELA {hole}',{hole:holeText})} <span>→</span>`;
  $('routeHeading').textContent=LEVEL.routeHeading||t('TVÅ VÄGAR TILL FLAGGAN');
  LEVEL.routes.forEach(([title,detail],i)=>{$(`routeTitle${i}`).textContent=title;$(`routeDetail${i}`).textContent=detail});
  $(`level-${LEVEL.id}`).setAttribute('aria-current','true');
  configureMenu();
  if(SELECTION.menu){$('intro').classList.add('hidden');$('menu').classList.remove('hidden')}
}
function configureNext(){
  const link=$('nextHole'),note=$('nextNote');
  if(mp.inMatch()){link.hidden=true;note.hidden=true;$('againButton').hidden=true;$('winLevels').hidden=true;return}
  // The way onward is the primary button; replaying is secondary unless nothing follows.
  const show=(href,label)=>{
    link.hidden=!href;$('againButton').className=href?'secondary-button wide':'play-button';
    $('winMenu').hidden=href==='./';
    if(href){link.href=href;link.innerHTML=`<span>${label}</span><i data-icon="arrow"></i>`;hydrateIcons(link)}
  };
  const run=activeRun(localStorage,SELECTION.slot);
  if(run){
    const next=nextRunHole(SELECTION.slot);
    if(next)show(`?hole=${next.hole}`,t('Nästa hål · {hole} {name}',{hole:holeLabel(next.hole),name:next.level.name}));
    else show('#resultat',t('Resultat för {world}',{world:SELECTION.slot.world.name}));
    return;
  }
  if(isCampaignFinale(SELECTION.slot)){show('#slutet',t('Kampanjens slut ✦'));return}
  const {slot,skipped}=nextInRound(SELECTION.slot.hole);
  if(slot)show(`?hole=${slot.hole}`,`${slot.world===SELECTION.slot.world?t('Nästa hål'):t('Vidare till {world}',{world:slot.world.name})} · ${holeLabel(slot.hole)} ${slot.level.name}`);
  else show('./',t('Till menyn'));
  if(skipped.length){
    note.hidden=false;
    note.textContent=skipped.length===1?t('Hål {hole} byggs fortfarande och hoppas över.',{hole:holeLabel(skipped[0].hole)}):t('Hål {from}–{to} byggs fortfarande.',{from:holeLabel(skipped[0].hole),to:holeLabel(skipped.at(-1).hole)});
  }
}

// The world scorecard: every built hole of the world, its score and its stars.
function openScorecard(){
  const world=SELECTION.slot.world,card=runScorecard(activeRun(localStorage,SELECTION.slot)??{scores:{}},world);
  $('scoreKicker').textContent=card.complete?t('{world} KLAR!',{world:world.name.toUpperCase()}):world.name.toUpperCase();
  $('scoreTitle').innerHTML=card.stars===card.max?t('PERFEKT<br><em>★★★</em>'):t('RESULTAT');
  $('scoreRows').innerHTML=card.rows.map(row=>`<div class="score-row${row.strokes?'':' missing'}"><span>${holeLabel(row.slot.hole)}</span><strong>${row.slot.level.name}</strong><small>${t('Par {n}',{n:row.par})}</small><b>${row.strokes??'–'}</b><em>${starText(row.stars)}</em></div>`).join('');
  const diff=card.strokes-card.par;
  $('scoreStrokes').textContent=card.strokes;$('scoreVsPar').textContent=diff===0?t('på par'):diff<0?t('{n} under par',{n:-diff}):t('{n} över par',{n:diff});
  $('scoreStars').textContent=card.stars;$('scoreStarsMax').textContent=t('av {n}',{n:card.max});
  const missing=card.max-card.stars;
  $('scoreText').textContent=missing===0?t('Alla stjärnor i världen. Mästarklass!'):plural(missing,'{n} stjärna kvar att hämta. Hål med tomma stjärnor är värda ett nytt försök.','{n} stjärnor kvar att hämta. Hål med tomma stjärnor är värda ett nytt försök.');
  $('scoreEnding').hidden=!isCampaignFinale(SELECTION.slot);
  $('win').classList.add('hidden');$('scorecard').classList.remove('hidden');($('scoreEnding').hidden?$('scoreAgain'):$('scoreEnding')).focus();
}

// The end of the campaign: totals for every world, credits rolling, and fireworks
// over the course while the card is open.
let endingFireworks=null;
function openEnding(){
  const p=campaignProgress(localStorage),diff=p.strokes-p.par;
  $('endingKicker').textContent=p.complete?t('MINI MAYHEM · ALLA 18 HÅL'):'MINI MAYHEM';
  $('endingTitle').innerHTML=p.complete?(p.stars===p.max?t('MÄSTARE<br><em>★★★</em>'):t('KAMPANJEN<br><em>KLAR!</em>')):t('NÄSTAN<br><em>I MÅL</em>');
  $('endingStars').textContent=p.stars;$('endingStarsMax').textContent=t('av {n}',{n:p.max})+' ★';
  $('endingText').textContent=p.complete
    ?`${t('Du har klarat alla tre världarna på {n} slag, {vs}.',{n:p.strokes,vs:diff===0?t('precis på par'):diff<0?t('{n} under par',{n:-diff}):t('{n} över par',{n:diff})})} ${p.stars===p.max?t('Varenda stjärna. Ren mästarklass!'):plural(p.max-p.stars,'{n} stjärna finns kvar att jaga.','{n} stjärnor finns kvar att jaga.')}`
    :plural(p.total-p.played,'1 hål kvar innan hela kampanjen är klar.','{n} hål kvar innan hela kampanjen är klar.');
  $('endingWorlds').innerHTML=p.worlds.map(w=>{const d=w.strokes-w.par;return `<div class="ending-world"><strong>${w.world.name}</strong><small>${w.played===w.total?(d===0?t('par'):d<0?`${d}`:`+${d}`):t('{played}/{total} hål',w)}</small><b>${w.stars}/${w.max} ★</b></div>`}).join('');
  // Onward: an unplayed hole, then the first hole still missing stars.
  const hunt=p.holes.find(h=>h.stars<3)?.slot,next=p.next??hunt;
  const link=$('endingNext');
  if(next){link.href=`?hole=${next.hole}`;link.innerHTML=`<span>${t(p.next?'Spela hål {hole} {name}':'Jaga stjärnor · hål {hole} {name}',{hole:holeLabel(next.hole),name:next.level.name})}</span><i data-icon="arrow"></i>`}
  else{link.href='./';link.innerHTML=`<span>${t('Till menyn')}</span><i data-icon="arrow"></i>`}
  hydrateIcons(link);
  $('win').classList.add('hidden');$('scorecard').classList.add('hidden');$('ending').classList.remove('hidden');link.focus();
  if(p.complete&&!endingFireworks&&!reducedCameraMotion){
    const colors=[0xffd264,0x9ff3ff,0xff8fc8,0xb18cff,0x6fe3a0,0xff9f5a];let i=0;
    endingFireworks=setInterval(()=>{const c=colors[i++%colors.length],x=CUP.x+(Math.random()-.5)*10;burst(x,6+Math.random()*4,CUP.z+(Math.random()-.5)*6,c,40,2.2);audio.boom(x-CUP.x)},900);
  }
}
function closeEnding(){$('ending').classList.add('hidden');clearInterval(endingFireworks);endingFireworks=null}
$('endingClose').addEventListener('click',()=>{closeEnding();if(state.phase==='win')$('win').classList.remove('hidden');else if(SELECTION.menu)$('menu').classList.remove('hidden')});
$('nextHole').addEventListener('click',event=>{
  const href=$('nextHole').getAttribute('href');
  if(href==='#resultat'){event.preventDefault();openScorecard()}
  if(href==='#slutet'){event.preventDefault();openEnding()}
});
$('scoreEnding').addEventListener('click',openEnding);
$('scoreAgain').addEventListener('click',()=>{const first=startWorldRun(localStorage,SELECTION.slot.world);location.href=`?hole=${first.hole}`});
$('scoreClose').addEventListener('click',()=>{$('scorecard').classList.add('hidden');$('win').classList.remove('hidden')});

let pendingUpdate=null;
function showUpdate(latest){pendingUpdate=latest;$('updateBanner').hidden=false}
$('updateButton').addEventListener('click',()=>{if(pendingUpdate)applyUpdate(pendingUpdate)});
$('updateLater').addEventListener('click',()=>{$('updateBanner').hidden=true});
// Phones play in portrait. Installed on Android the manifest locks it; iOS can't lock,
// so a landscape phone gets a hint that can be dismissed.
$('rotateAnyway').addEventListener('click',()=>{root.dataset.landscape='ok'});
function lockPortrait(){screen.orientation?.lock?.('portrait').catch(()=>{})}

async function init(){
  hydrateIcons();
  $('menuVersion').textContent=t('Version {v}',{v:APP_VERSION.label});
  watchForUpdates(showUpdate);
  configureLevelUI();resize();
  try{course=await createCourse(scene)}catch(error){console.error(error);toast('Vissa modeller kunde inte läsas.');}
  if(['forest','clockwork','moon'].includes(LEVEL.theme)){
    const {createForestRenderer}=await import('./forest-renderer.js');
    forestRenderer=createForestRenderer(renderer,scene,camera);resize();
  }
  $('playButton').disabled=false;
  $('loading').classList.add('done');updateUI();
  if(BOT){startBot();return}
  ghosts=createGhostBalls(scene,BALL_RADIUS);
  frame();
  // Trophies: what the records already earn, quietly; GameVolt when the game runs there.
  if(!QA){trophies.setToast(showTrophyToast);trophies.check(true);trophies.loadSDK().then(ok=>{if(ok)trophies.initSDK()})}
  if(QA)startQA();else mp.start();
  // The browser tests drive a match through this handle; only in development.
  if(import.meta.env?.DEV){window.minigolfMultiplayer=mp;window.minigolfTrophies={...trophies,toast:showTrophyToast,open:openTrophies};window.minigolfBall=()=>({phase:state.phase,x:state.x,z:state.z,strokes:state.strokes})}
}
// The event bench: start straight into play, with a panel of set pieces to fire.
function startQA(){
  window.minigolfAudio=audio;
  $('intro').classList.add('hidden');reset();setPhase('idle');
  // `&at=x,z,aim` puts the ball anywhere on the hole, to look at a spot.
  const at=new URLSearchParams(location.search).get('at')?.split(',').map(Number);
  if(at){state.x=at[0];state.z=at[1];state.aim=at[2]||0;setPhase('idle')}
  // Roll in along the line from the tee, so the camera and the helpers behave as in play.
  const tx=CUP.x-START.x,tz=CUP.z-START.z,td=Math.hypot(tx,tz)||1,dir={x:tx/td,z:tz/td};
  setupQA({
    hole:SELECTION.slot?.hole??LEVEL.id,
    prepare(){$('win').classList.add('hidden');reset(false);ball.visible=true},
    roll(side,speed,from=1.5){
      const px=-dir.z*side,pz=dir.x*side;
      state.x=CUP.x-dir.x*from+px;state.z=CUP.z-dir.z*from+pz;
      const vx=CUP.x-state.x,vz=CUP.z-state.z,d=Math.hypot(vx,vz);
      state.aim=Math.atan2(vz,vx);state.vx=vx/d*speed;state.vz=vz/d*speed;state.settle=0;setPhase('moving');
    },
    lip(side){
      const a=Math.atan2(-dir.z,-dir.x)+side;
      state.x=CUP.x+Math.cos(a)*.66;state.z=CUP.z+Math.sin(a)*.66;state.aim=a+Math.PI;
      state.vx=Math.cos(a+Math.PI)*.02;state.vz=Math.sin(a+Math.PI)*.02;state.settle=0;setPhase('moving');
    },
    fall(){state.x=CUP.x-dir.x*2;state.z=CUP.z-dir.z*2;doFall()},
    win(){state.x=CUP.x;state.z=CUP.z;win()},
  });
}
// The par bot's handle on the hole: it plays shots with the game's own physics,
// stepped as fast as the page can, and reads back where the ball came to rest.
function startBot(){
  window.minigolfAudio=audio;
  $('intro').classList.add('hidden');
  const step=()=>{elapsed+=1/120;physics(1/120)};
  const run=(seconds,done)=>{for(let t=0;t<seconds&&!done();t+=1/120)step()};
  const settled=()=>['idle','win','loaded'].includes(state.phase);
  const look=()=>({phase:state.phase,x:state.x,z:state.z,y:surfaceHeight(state.x,state.z),strokes:state.strokes,putt:nearPutt?.distance??null,flags:{bridge:bellBridgeState.open,lift:liftState.mode==='top'}});
  window.minigolfBot={
    level:{name:LEVEL.name,par:LEVEL.par,start:{...START},cup:{x:CUP.x,z:CUP.z,y:surfaceHeight(CUP.x,CUP.z)}},
    restart(){
      // Without drawing nothing ages the particles away, so clear them here.
      for(const p of particles){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose()}particles.length=0;
      reset(false);state.strokes=0;elapsed=0;cometTime=0;wheelTime=0;accumulator=0;return look()},
    look,
    onCourse:(x,z)=>onCourse(x,z),
    // True where a wall or post would push a resting ball out of the spot.
    blocked(x,z){const probe={x,z,vx:0,vz:0};collideWalls(probe,activeLayout.WALLS,activeLayout.POST_COLLIDERS);return Math.hypot(probe.x-x,probe.z-z)>.005},
    // wait: seconds to hold before striking (moving obstacles), putt: metres of roll
    // on the meter when the putting meter is offered, fire: delay before the cannon fires.
    shot({aim,power=.5,needle=0,putt,wait=0,fire=0}){
      run(wait,()=>false);run(20,settled);
      if(state.phase==='win')return look();
      state.aim=aim;state.power=putt!==undefined?(putt-.25)/(PUTT_MAX-.25):power;state.accuracy=needle;
      shoot(putt!==undefined&&nearPutt?puttSpeed(putt,nearPutt.friction):undefined);
      run(60,settled);
      if(state.phase==='loaded'){run(fire,()=>false);fireComet();run(60,settled)}
      return look();
    },
  };
}
init();
