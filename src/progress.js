import { ROUND } from './round.js';

// Stars turn a score into a goal that reads the same on every hole:
// birdie or better ★★★, par ★★, bogey ★, worse still counts as cleared.
export const STARS_PER_HOLE=3;
export function starsFor(strokes,par){
  if(!strokes)return 0;
  return Math.max(0,Math.min(STARS_PER_HOLE,par-strokes+2));
}
export const starText=stars=>'★'.repeat(stars)+'☆'.repeat(STARS_PER_HOLE-stars);

const best=(storage,level)=>Number(storage.getItem(level.recordKey))||0;
export const bestStars=(storage,level)=>starsFor(best(storage,level),level.par);

// Stars collected in a world, from each hole's best score, out of what is built.
export function worldStars(storage,world){
  const built=ROUND.filter(slot=>slot.world===world&&slot.level);
  return {stars:built.reduce((sum,slot)=>sum+bestStars(storage,slot.level),0),max:built.length*STARS_PER_HOLE};
}

// A world run plays one world's built holes in order and ends with a scorecard.
// It is kept in storage so it survives the page load between holes.
const RUN_KEY='minimayhem-world-run';
export function startWorldRun(storage,world){
  storage.setItem(RUN_KEY,JSON.stringify({world:world.key,scores:{}}));
  return ROUND.find(slot=>slot.world===world&&slot.level);
}
export function activeRun(storage,slot){
  try{
    const run=JSON.parse(storage.getItem(RUN_KEY));
    return run&&slot&&run.world===slot.world.key?run:null;
  }catch{return null}
}
export function recordRunHole(storage,slot,strokes){
  const run=activeRun(storage,slot);if(!run)return null;
  run.scores[slot.hole]=strokes;storage.setItem(RUN_KEY,JSON.stringify(run));return run;
}
export const endWorldRun=storage=>storage.removeItem(RUN_KEY);

// The next hole of the run, or null after the world's last built hole.
export function nextRunHole(slot){
  return ROUND.find(s=>s.world===slot.world&&s.level&&s.hole>slot.hole)??null;
}

export function runScorecard(run,world){
  const rows=ROUND.filter(slot=>slot.world===world&&slot.level).map(slot=>{
    const strokes=run.scores[slot.hole]??null;
    return {slot,strokes,par:slot.level.par,stars:strokes?starsFor(strokes,slot.level.par):0};
  });
  const played=rows.filter(row=>row.strokes);
  return {
    rows,complete:played.length===rows.length,
    strokes:played.reduce((sum,row)=>sum+row.strokes,0),
    par:played.reduce((sum,row)=>sum+row.par,0),
    stars:rows.reduce((sum,row)=>sum+row.stars,0),max:rows.length*STARS_PER_HOLE,
  };
}
