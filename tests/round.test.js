import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { WORLDS, ROUND, PROTOTYPES, resolveSelection, nextInRound } from '../src/round.js';

test('the round has three worlds of six holes numbered 1–18', () => {
  assert.equal(WORLDS.length, 3);
  assert.deepEqual(ROUND.map(slot => slot.hole), Array.from({length: 18}, (_, i) => i + 1));
  for (const world of WORLDS) assert.equal(world.slots.length, 6);
});

test('every built level appears exactly once, in the round or as a prototype', () => {
  const placed = [...ROUND.filter(slot => slot.level).map(slot => slot.level.id), ...PROTOTYPES.map(p => p.id)];
  assert.deepEqual([...placed].sort((a, b) => a - b), LEVELS.map(level => level.id).sort((a, b) => a - b));
  assert.equal(new Set(LEVELS.map(level => level.recordKey)).size, LEVELS.length);
});

test('Molnskogen is holes 7–12 and ends with the Mother Tree set piece',()=>{
  assert.deepEqual(ROUND.slice(6,12).map(slot=>slot.level?.name??null),['Skybowling','Rotravinen','Ekollonsvingen','Rotvolten','Törnkronan','Moderträdet']);
  assert.equal(ROUND[5].level.worldFinale,true);
  assert.equal(ROUND[11].level.worldFinale,true);
  assert.ok(!ROUND[10].level.worldFinale,'Törnkronan is no longer the finale');
  assert.ok(ROUND[5].finale&&ROUND[11].finale&&!ROUND[10].finale);
});

test('URLs pick round holes, prototypes or the menu',()=>{
  assert.equal(resolveSelection('?hole=7').level.name,'Skybowling');
  assert.equal(resolveSelection('?hole=11').level.name,'Törnkronan');
  assert.equal(resolveSelection('?hole=12').level.name,'Moderträdet');
  assert.equal(resolveSelection('?proto=kanonkurvan').level.name,'Kanonkurvan');
  assert.equal(resolveSelection('').menu,true);
  assert.equal(resolveSelection('?hole=13').level.name,'Raketrampen');
  assert.equal(resolveSelection('?hole=14').level.name,'Tyngdlösa tältet');
  assert.equal(resolveSelection('?hole=15').level.name,'Svarta hålet');
  const missing=resolveSelection('?hole=16');
  assert.equal(missing.menu,true);
  assert.equal(missing.missing.hole,16);
});

test('the next hole follows the round and stops when nothing more is built',()=>{
  assert.equal(nextInRound(6).slot.hole,7);
  const afterTen=nextInRound(10);
  assert.equal(afterTen.slot.hole,11);
  assert.deepEqual(afterTen.skipped,[]);
  assert.equal(nextInRound(12).slot.level.name,'Raketrampen');
  assert.equal(nextInRound(13).slot.level.name,'Tyngdlösa tältet');
  assert.equal(nextInRound(14).slot.level.name,'Svarta hålet');
  const afterFifteen=nextInRound(15);
  assert.equal(afterFifteen.slot,null);
  assert.deepEqual(afterFifteen.skipped.map(slot=>slot.hole),[16,17,18]);
});
