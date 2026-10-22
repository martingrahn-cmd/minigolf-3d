import test from 'node:test';
import assert from 'node:assert/strict';
import { RUN_BASE, TIME_SLOTS, runMode, encodeRun, decodeRun, formatTime, betterRun, bestRun, recordRun, localScores, migrationKeys, bestRunKey, bestTimeKey } from '../src/leaderboard.js';
import { WORLDS } from '../src/round.js';

const storage=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};

test('fewer strokes rank higher on GameVolt, where the highest score is first, and time breaks a tie',()=>{
  assert.ok(encodeRun(17,300)>encodeRun(18,60),'Strokes come first');
  assert.ok(encodeRun(17,250.4)>encodeRun(17,250.5),'Then the faster round');
  assert.ok(encodeRun(17,9999)>encodeRun(17,null),'A round without a time comes last on its strokes');
  assert.ok(encodeRun(17,null)>encodeRun(18,1));
  assert.deepEqual(decodeRun(encodeRun(17,252.3)),{strokes:17,seconds:252.3});
  assert.deepEqual(decodeRun(String(encodeRun(21,null))),{strokes:21,seconds:null});
  assert.deepEqual(decodeRun(encodeRun(30,1e6)),{strokes:30,seconds:(TIME_SLOTS-2)/10},'Capped below the no-time slot');
  assert.ok(encodeRun(1,0)<2**31,'Fits GameVolt\'s INT column');assert.equal(RUN_BASE,1000);
  assert.deepEqual([formatTime(42.34),formatTime(252.3),formatTime(725)],['0:42.3','4:12.3','12:05.0']);
  assert.ok(betterRun({strokes:20,seconds:99},{strokes:20,seconds:null})&&!betterRun({strokes:21,seconds:1},{strokes:20,seconds:500}));
  assert.deepEqual(WORLDS.map(w=>runMode(w.key)),['clockwork-run','forest-run','moon-run','halloween-run']);
});

test('the best round per world is kept on the device and goes with a guest who signs in',()=>{
  const s=storage();
  assert.equal(bestRun(s,'moon'),null);
  assert.deepEqual(recordRun(s,'moon',22,301.24),{best:{strokes:22,seconds:301.2},newBest:true});
  assert.deepEqual(recordRun(s,'moon',25,100),{best:{strokes:22,seconds:301.2},newBest:false});
  assert.deepEqual(recordRun(s,'moon',22,290),{best:{strokes:22,seconds:290},newBest:true},'Same strokes, faster');
  assert.deepEqual(recordRun(s,'moon',19,null),{best:{strokes:19,seconds:null},newBest:true});
  assert.equal(s.getItem(bestTimeKey('moon')),null,'An untimed best leaves no stale time');
  assert.deepEqual(recordRun(s,'moon',19,400),{best:{strokes:19,seconds:400},newBest:true});
  assert.equal(bestRun(s,'forest'),null);
  const local=Object.fromEntries(migrationKeys().map(k=>[k,s.getItem(k)]));
  assert.deepEqual(localScores(local),[{score:encodeRun(19,400),mode:'moon-run'}]);
  assert.deepEqual(localScores({[bestRunKey('forest')]:'30'}),[{score:encodeRun(30,null),mode:'forest-run'}],'Rounds saved before the clock');
  assert.equal(bestRunKey('moon'),'minimayhem-best-run-moon');
});
