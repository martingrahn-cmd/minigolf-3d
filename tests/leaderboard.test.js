import test from 'node:test';
import assert from 'node:assert/strict';
import { RUN_BASE, runMode, encodeRun, decodeRun, bestRun, recordRun, localScores, migrationKeys, bestRunKey } from '../src/leaderboard.js';
import { WORLDS } from '../src/round.js';

const storage=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}};

test('fewer strokes rank higher on GameVolt, where the highest score is first',()=>{
  assert.ok(encodeRun(17)>encodeRun(18));
  assert.equal(decodeRun(encodeRun(17)),17);assert.equal(decodeRun(String(RUN_BASE-21)),21);
  assert.deepEqual(WORLDS.map(w=>runMode(w.key)),['clockwork-run','forest-run','moon-run','halloween-run']);
});

test('the best round per world is kept on the device and goes with a guest who signs in',()=>{
  const s=storage();
  assert.equal(bestRun(s,'moon'),null);
  assert.deepEqual(recordRun(s,'moon',22),{best:22,newBest:true});
  assert.deepEqual(recordRun(s,'moon',25),{best:22,newBest:false});
  assert.deepEqual(recordRun(s,'moon',19),{best:19,newBest:true});
  assert.equal(bestRun(s,'forest'),null);
  const local=Object.fromEntries(migrationKeys().map(k=>[k,s.getItem(k)]));
  assert.deepEqual(localScores(local),[{score:encodeRun(19),mode:'moon-run'}]);
  assert.equal(bestRunKey('moon'),'minimayhem-best-run-moon');
});
