import test from 'node:test';
import assert from 'node:assert/strict';
import { TROPHIES, TIERS, GAME_ID, freshStats, cleanStats, onEvent, evaluate, facts, trophyArt } from '../src/trophies.js';
import { ROUND, WORLDS } from '../src/round.js';

const storage=(entries={})=>{const m=new Map(Object.entries(entries));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};
const records=(slots,strokes)=>Object.fromEntries(slots.map(slot=>[slot.level.recordKey,String(strokes(slot))]));
const built=ROUND.filter(slot=>slot.level);

test('31 trophies to the GameVolt standard: 15 bronze, 10 silver, 5 gold, 1 platinum',()=>{
  assert.equal(TROPHIES.length,31);
  assert.deepEqual(TIERS.map(tier=>TROPHIES.filter(t=>t.tier===tier).length),[15,10,5,1]);
  assert.equal(new Set(TROPHIES.map(t=>t.id)).size,31,'Ids are unique');
  for(const t of TROPHIES){
    assert.match(t.id,/^[a-z0-9_]+$/);assert.ok(t.name&&t.desc&&t.icon&&t.form,t.id);
    assert.match(trophyArt(t),/^trophies\/[a-z]+-(bronze|silver|gold|platinum)\.webp$/);
  }
  assert.equal(TROPHIES.at(-1).id,'master');assert.equal(GAME_ID,'mini-mayhem');
});

test('holes count pars, birdies, eagles, aces and birdie streaks',()=>{
  const s=freshStats();
  onEvent(s,'hole',{strokes:3,par:3});onEvent(s,'hole',{strokes:2,par:3});onEvent(s,'hole',{strokes:2,par:4,putt:true});
  onEvent(s,'hole',{strokes:1,par:3});onEvent(s,'hole',{strokes:5,par:3});
  assert.deepEqual([s.holes,s.pars,s.birdies,s.eagles,s.aces,s.best_streak,s.streak,s.putts_in],[5,4,3,2,1,3,0,1]);
  onEvent(s,'run',{strokes:15,par:18,perfect:false});onEvent(s,'run',{strokes:20,par:18,perfect:false});
  assert.deepEqual([s.under_par_runs,s.perfect_runs],[1,0]);
  assert.deepEqual(cleanStats({holes:'x',birdies:4,eagles:-1,junk:9}),{...freshStats(),birdies:4});
});

test('facts come from the saved records: worlds cleared, worlds of three stars, stars and the campaign',()=>{
  const clock=built.filter(slot=>slot.world.key==='clockwork');
  let f=facts(storage());
  assert.deepEqual([f.worldsDone,f.starWorlds,f.stars,f.campaign],[[],0,0,false]);
  assert.equal(f.maxStars,72);
  f=facts(storage(records(clock,slot=>slot.level.par-1)));
  assert.deepEqual(f.worldsDone,['clockwork']);assert.equal(f.starWorlds,1);assert.equal(f.stars,18);
  f=facts(storage(records(built.filter(slot=>!slot.world.special),slot=>slot.level.par+1)));
  assert.equal(f.campaign,true);assert.equal(f.worldsDone.length,WORLDS.length-1,'Spökhamnen is not part of the campaign');
});

test('trophies unlock once, and the platinum comes with the other thirty',()=>{
  const s=freshStats();
  assert.deepEqual(evaluate(s,facts(storage())),[]);
  onEvent(s,'hole',{strokes:3,par:3});
  const first=evaluate(s,facts(storage()));
  assert.deepEqual(first,['first_hole','first_par']);
  assert.deepEqual(evaluate(s,facts(storage()),first),[],'Nothing twice');
  // Everything at once: every trophy can be earned.
  const all={...freshStats(),holes:99,pars:99,birdies:99,eagles:9,aces:1,best_streak:9,strokes:999,perfect_hits:1,putts_in:1,cannons:1,tubes:1,loops:1,
    ferris:1,rescues:1,penalties:1,strikes:1,under_par_runs:1,perfect_runs:1,match_holes:1,match_wins:1};
  const everything=evaluate(all,facts(storage(records(built,slot=>slot.level.par-1)))).sort();
  assert.deepEqual(everything,TROPHIES.map(t=>t.id).sort());
  const almost=TROPHIES.filter(t=>t.id!=='master'&&t.id!=='eagles_3').map(t=>t.id);
  assert.deepEqual(evaluate({...all,eagles:3},facts(storage()),almost),['eagles_3','master']);
});

test('GameVolt\'s copy (gamevolt/) matches the list: run scripts/gamevolt-export.mjs after changing it',async()=>{
  const {readFileSync}=await import('node:fs');
  const sqlText=readFileSync(new URL('../gamevolt/achievement_defs.sql',import.meta.url),'utf8');
  const ids=[...sqlText.matchAll(/\('(mini-mayhem-[a-z0-9_]+)', 'mini-mayhem'/g)].map(m=>m[1]);
  assert.deepEqual(ids,TROPHIES.map(t=>`${GAME_ID}-${t.id}`));
  const {default:en}=await import('../src/locales/en.js');
  for(const t of TROPHIES)assert.ok(sqlText.includes(en[t.name].replace(/'/g,"''")),`${t.id} in English`);
});
