import test from 'node:test';
import assert from 'node:assert/strict';
import { WORLDS, ROUND } from '../src/round.js';
import { starsFor, starText, worldStars, startWorldRun, activeRun, recordRunHole, endWorldRun, nextRunHole, runScorecard } from '../src/progress.js';

const memory=()=>{const data=new Map();return {getItem:k=>data.has(k)?data.get(k):null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)}};
const moon=WORLDS.find(w=>w.key==='moon'),built=ROUND.filter(s=>s.world===moon&&s.level);

test('birdie or better gives three stars, par two, bogey one, worse none',()=>{
  assert.equal(starsFor(1,3),3);assert.equal(starsFor(2,3),3);assert.equal(starsFor(3,3),2);
  assert.equal(starsFor(4,3),1);assert.equal(starsFor(5,3),0);assert.equal(starsFor(0,3),0,'Not played');
  assert.equal(starText(2),'★★☆');
});

test('world stars come from each hole’s best score, out of the built holes',()=>{
  const storage=memory();
  assert.deepEqual(worldStars(storage,moon),{stars:0,max:built.length*3});
  storage.setItem(built[0].level.recordKey,String(built[0].level.par-1));
  storage.setItem(built[1].level.recordKey,String(built[1].level.par));
  assert.equal(worldStars(storage,moon).stars,5);
});

test('a world run walks the built holes in order and ends with a scorecard',()=>{
  const storage=memory();
  const first=startWorldRun(storage,moon);
  assert.equal(first,built[0]);
  assert.ok(activeRun(storage,built[1]));
  assert.equal(activeRun(storage,ROUND[0]),null,'A hole in another world is not part of the run');
  for(const slot of built.slice(0,-1))assert.equal(nextRunHole(slot),built[built.indexOf(slot)+1]);
  assert.equal(nextRunHole(built.at(-1)),null,'After the last built hole comes the scorecard');
  built.forEach((slot,i)=>recordRunHole(storage,slot,slot.level.par-1+i));
  const card=runScorecard(activeRun(storage,built[0]),moon);
  assert.ok(card.complete);
  assert.equal(card.strokes,built.reduce((s,slot,i)=>s+slot.level.par-1+i,0));
  assert.equal(card.strokes-card.par,built.reduce((s,_,i)=>s+i-1,0));
  assert.equal(card.stars,built.reduce((s,_,i)=>s+Math.max(0,3-i),0));
  recordRunHole(storage,built[0],built[0].level.par);
  assert.equal(runScorecard(activeRun(storage,built[0]),moon).rows[0].strokes,built[0].level.par,'Replaying a hole keeps the latest score');
  endWorldRun(storage);
  assert.equal(activeRun(storage,built[0]),null);
  assert.equal(recordRunHole(storage,built[0],3),null,'Without a run nothing is recorded');
});

test('a half-played run is shown as incomplete',()=>{
  const storage=memory();startWorldRun(storage,moon);recordRunHole(storage,built[0],2);
  const card=runScorecard(activeRun(storage,built[0]),moon);
  assert.equal(card.complete,false);assert.equal(card.rows[1].strokes,null);assert.equal(card.par,built[0].level.par);
});
