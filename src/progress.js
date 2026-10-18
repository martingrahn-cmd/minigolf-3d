import { ROUND, CAMPAIGN } from './round.js';

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

const holeBest=storage=>slot=>{
  const best=Number(storage.getItem(slot.level.recordKey))||0;
  return {slot,best,stars:starsFor(best,slot.level.par)};
};
// One world's progress from each built hole's best score (special worlds too).
export function worldProgress(storage,world){
  const own=ROUND.filter(slot=>slot.world===world&&slot.level).map(holeBest(storage)),done=own.filter(h=>h.best);
  return {world,played:done.length,total:own.length,stars:own.reduce((s,h)=>s+h.stars,0),max:own.length*STARS_PER_HOLE,
    strokes:done.reduce((s,h)=>s+h.best,0),par:done.reduce((s,h)=>s+h.slot.level.par,0)};
}

// The whole campaign, from each hole's best score: how many holes are cleared,
// the stars, and the best strokes against par for the holes played so far.
export function campaignProgress(storage){
  const holes=CAMPAIGN.filter(slot=>slot.level).map(holeBest(storage));
  const played=holes.filter(h=>h.best);
  const worlds=[...new Set(holes.map(h=>h.slot.world))].map(world=>worldProgress(storage,world));
  return {
    holes,worlds,played:played.length,total:holes.length,complete:played.length===holes.length,
    stars:holes.reduce((s,h)=>s+h.stars,0),max:holes.length*STARS_PER_HOLE,
    strokes:played.reduce((s,h)=>s+h.best,0),par:played.reduce((s,h)=>s+h.slot.level.par,0),
    next:holes.find(h=>!h.best)?.slot??null,
  };
}
// The last hole of the campaign (the moon rocket), where the ending is offered.
export const isCampaignFinale=slot=>!!slot&&slot.hole===CAMPAIGN.filter(s=>s.level).at(-1).hole;
