import { LEVELS } from './levels.js';
import { onBridge, bridgeHeight } from './bridge.js';
import { profileHeight, profileSlope, surfaceFriction } from './terrain.js';
import { funnelSurface } from './funnel.js';
import { onLift } from './lift.js';
export { LEVELS };

export function createLayout(LEVEL){
const START=LEVEL.start,CUP=LEVEL.cup,CANNON=LEVEL.cannon,LANDING=LEVEL.landing;
const SPRINGS=LEVEL.springs,SPINNER=LEVEL.spinner,TILES=LEVEL.tiles;
const RAMP_X=LEVEL.hasRamp===false?[]:[-10,-8.5,-6.7,-5.2,-3];
const PIPE_IN = { x: -1.45, z: -3.55 };
// The mouth faces the clear landing area at the end of the yellow ramp.
const inletLength=Math.hypot(1.55,3.55);
const PIPE_DIRECTION = { x:1.55/inletLength, z:-3.55/inletLength };
const PIPE_ENTRY = { length:1.7, startHalfWidth:.86, endHalfWidth:.55, rise:.35, centerY:.70 };
function pipeCoordinates(x,z){
  const dx=x-PIPE_IN.x,dz=z-PIPE_IN.z;
  return {along:dx*PIPE_DIRECTION.x+dz*PIPE_DIRECTION.z,across:-dx*PIPE_DIRECTION.z+dz*PIPE_DIRECTION.x};
}
function pipeWorld(along,across=0){
  return {x:PIPE_IN.x+along*PIPE_DIRECTION.x-across*PIPE_DIRECTION.z,z:PIPE_IN.z+along*PIPE_DIRECTION.z+across*PIPE_DIRECTION.x};
}
function pipeRampAt(x,z){
  const {along,across}=pipeCoordinates(x,z);
  if(along < -PIPE_ENTRY.length || along > 0)return null;
  const t=(along+PIPE_ENTRY.length)/PIPE_ENTRY.length;
  const halfWidth=PIPE_ENTRY.startHalfWidth+(PIPE_ENTRY.endHalfWidth-PIPE_ENTRY.startHalfWidth)*t;
  return Math.abs(across)<=halfWidth?{height:t*PIPE_ENTRY.rise,slope:PIPE_ENTRY.rise/PIPE_ENTRY.length}:null;
}
const PIPE_GUIDES = [-1,1].map(side=>({
  a:pipeWorld(-PIPE_ENTRY.length,side*PIPE_ENTRY.startHalfWidth),
  b:pipeWorld(0,side*PIPE_ENTRY.endHalfWidth),
}));
const PIPE_OUT = { x: 3.36, z: -4.1 };
function onCourse(x, z) {
  return TILES.some(t => x >= t.x1 && x <= t.x2 && z >= t.z1 && z <= t.z2);
}
function heightAt(x, z, angle=LEVEL.bridge?.maxAngle, liftY=LEVEL.lift?.bottom) {
  if(onLift(x,z,LEVEL.lift))return liftY;
  const bowl=funnelSurface(x,z,LEVEL.funnel);if(bowl)return bowl.height;
  if(LEVEL.heightProfile)return profileHeight(x,LEVEL.heightProfile);
  if(onBridge(x,z,LEVEL.bridge))return bridgeHeight(x,LEVEL.bridge,angle);
  const entry=LEVEL.hasPipe?pipeRampAt(x,z):null;
  if(entry)return entry.height;
  if (LEVEL.hasRamp===false || x < -10 || x > -3 || Math.abs(z) > 2.35001) return 0;
  if (x < -8.5) return (x + 10) * .62;
  if (x < -6.7) return .93;
  if (x < -5.2) return .93 * ((-5.2 - x) / 1.5);
  return 0;
}
function heightSlope(x, z, angle=LEVEL.bridge?.maxAngle) {
  if(onLift(x,z,LEVEL.lift))return 0;
  const bowl=funnelSurface(x,z,LEVEL.funnel);if(bowl)return bowl.slopeX;
  if(LEVEL.heightProfile)return profileSlope(x,LEVEL.heightProfile);
  if(onBridge(x,z,LEVEL.bridge))return Math.tan(angle);
  const entry=LEVEL.hasPipe?pipeRampAt(x,z):null;
  if(entry)return entry.slope*PIPE_DIRECTION.x;
  if (LEVEL.hasRamp===false || Math.abs(z) > 2.35) return 0;
  if (x >= -10 && x < -8.5) return .62;
  if (x >= -6.7 && x < -5.2) return -.62;
  return 0;
}

function heightSlopeZ(x,z){
  const bowl=funnelSurface(x,z,LEVEL.funnel);if(bowl)return bowl.slopeZ;
  const entry=LEVEL.hasPipe?pipeRampAt(x,z):null;
  return entry?entry.slope*PIPE_DIRECTION.z:0;
}

// Partition the union once. Internal joins have no walls and no duplicate faces.
const GRID_X = [...new Set([...TILES.flatMap(t => [t.x1,t.x2]), ...RAMP_X,
  ...(LEVEL.funnel?[LEVEL.funnel.x-LEVEL.funnel.plate,LEVEL.funnel.x+LEVEL.funnel.plate]:[]),
  ...(LEVEL.heightProfile||[]).map(p=>p.x),...(LEVEL.openEdges||[]).flatMap(e=>e.x===undefined?[e.x1,e.x2]:[e.x])])].sort((a,b)=>a-b);
const GRID_Z = [...new Set([...TILES.flatMap(t => [t.z1,t.z2]), -5.3, -2.9,
  ...(LEVEL.funnel?[LEVEL.funnel.z-LEVEL.funnel.plate,LEVEL.funnel.z+LEVEL.funnel.plate]:[]),
  ...(LEVEL.openEdges||[]).flatMap(e=>e.z===undefined?[e.z1,e.z2]:[e.z])])].sort((a,b)=>a-b);
const CELLS = [];
const BOUNDARIES = [];
for(let i=0;i<GRID_X.length-1;i++) for(let j=0;j<GRID_Z.length-1;j++) {
  const x1=GRID_X[i],x2=GRID_X[i+1],z1=GRID_Z[j],z2=GRID_Z[j+1];
  const x=(x1+x2)/2,z=(z1+z2)/2;
  const tile=TILES.find(t=>x>t.x1&&x<t.x2&&z>t.z1&&z<t.z2);
  if(!tile)continue;
  CELLS.push({x1,x2,z1,z2,color:tile.color,surface:tile.surface,dynamic:!!tile.dynamic});
  const edge=(ax,az,bx,bz,nx,nz)=>{
    const mx=(ax+bx)/2,mz=(az+bz)/2;
    if(onCourse(mx-nx*.001,mz-nz*.001))return;
    const open=(LEVEL.hasPipe&&ax===7&&bx===7&&mz>-5.3&&mz<-2.9)||
      (!!tile.dynamic&&ax===LEVEL.bridge.x2&&bx===LEVEL.bridge.x2)||
      (LEVEL.openEdges||[]).some(e=>e.x===undefined
        ?az===e.z&&bz===e.z&&mx>=e.x1&&mx<=e.x2
        :ax===e.x&&bx===e.x&&mz>=e.z1&&mz<=e.z2);
    BOUNDARIES.push({ax,az,bx,bz,nx,nz,open,dynamic:!!tile.dynamic});
  };
  edge(x1,z1,x1,z2,1,0);edge(x2,z1,x2,z2,-1,0);
  edge(x1,z1,x2,z1,0,1);edge(x1,z2,x2,z2,0,-1);
}
const POST_COLLIDERS = LEVEL.arches.flatMap(a=>[-1.8,1.8].map(offset=>({x:a.x,z:a.z+offset,r:.27})));
const frictionAt=(x,z)=>surfaceFriction(x,z,LEVEL.surfaces);
const WALLS=[...BOUNDARIES,...(LEVEL.banks||[])];

return {LEVEL, START, CUP, CANNON, LANDING, PIPE_IN, PIPE_OUT, PIPE_DIRECTION, PIPE_ENTRY, PIPE_GUIDES, pipeCoordinates, pipeWorld, pipeRampAt, SPRINGS, SPINNER, RAMP_X, TILES, onCourse, heightAt, heightSlope, heightSlopeZ, frictionAt, GRID_X, GRID_Z, CELLS, BOUNDARIES, WALLS, POST_COLLIDERS};
}
const selectedId=typeof window==='undefined'?9:Number(new URLSearchParams(window.location.search).get('hole'));
export const {LEVEL, START, CUP, CANNON, LANDING, PIPE_IN, PIPE_OUT, PIPE_DIRECTION, PIPE_ENTRY, PIPE_GUIDES, pipeCoordinates, pipeWorld, pipeRampAt, SPRINGS, SPINNER, RAMP_X, TILES, onCourse, heightAt, heightSlope, heightSlopeZ, frictionAt, GRID_X, GRID_Z, CELLS, BOUNDARIES, WALLS, POST_COLLIDERS}=createLayout(LEVELS.find(level=>level.id===selectedId)||LEVELS[0]);
