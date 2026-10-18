import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { WORLDS, ROUND, CAMPAIGN, resolveSelection, nextInRound } from '../src/round.js';

test('the campaign has three worlds of six holes numbered 1–18, and Spökhamnen stands beside it', () => {
  assert.equal(WORLDS.filter(world => !world.special).length, 3);
  assert.deepEqual(CAMPAIGN.map(slot => slot.hole), Array.from({length: 18}, (_, i) => i + 1));
  for (const world of WORLDS) assert.equal(world.slots.length, 6);
  const spook = ROUND.filter(slot => slot.world.key === 'halloween');
  assert.deepEqual(spook.map(slot => slot.hole), [19, 20, 21, 22, 23, 24]);
  assert.deepEqual(spook.map(slot => slot.level?.name ?? slot.placeholder.name), ['Kryptporten', 'Spökplankan', 'Pumpastudsen', 'Slemrännan', 'Spökkanonen', 'Spökskeppet']);
  assert.ok(spook.every(slot => !slot.level || slot.level.theme === 'halloween'));
});

test('every built level appears exactly once in the round', () => {
  const placed = ROUND.filter(slot => slot.level).map(slot => slot.level.id);
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
  assert.equal(resolveSelection('?proto=kanonkurvan').level.name,'Spökkanonen','Old prototype links find the hole');
  assert.equal(resolveSelection('?proto=kanonkurvan').slot.hole,23);
  assert.equal(resolveSelection('').menu,true);
  assert.equal(resolveSelection('?hole=13').level.name,'Raketrampen');
  assert.equal(resolveSelection('?hole=14').level.name,'Tyngdlösa tältet');
  assert.equal(resolveSelection('?hole=15').level.name,'Svarta hålet');
  assert.equal(resolveSelection('?hole=16').level.name,'Kanonkometen');
  assert.equal(resolveSelection('?hole=17').level.name,'Pariserhjulet');
  assert.equal(resolveSelection('?hole=18').level.name,'Månraketen');
  assert.equal(resolveSelection('?hole=19').level.name,'Kryptporten');
  assert.equal(resolveSelection('?hole=24').menu,true,'The finale is not built yet');
});

test('the next hole follows the round and stops when nothing more is built',()=>{
  assert.equal(nextInRound(6).slot.hole,7);
  const afterTen=nextInRound(10);
  assert.equal(afterTen.slot.hole,11);
  assert.deepEqual(afterTen.skipped,[]);
  assert.equal(nextInRound(12).slot.level.name,'Raketrampen');
  assert.equal(nextInRound(13).slot.level.name,'Tyngdlösa tältet');
  assert.equal(nextInRound(14).slot.level.name,'Svarta hålet');
  assert.equal(nextInRound(15).slot.level.name,'Kanonkometen');
  assert.equal(nextInRound(16).slot.level.name,'Pariserhjulet');
  assert.equal(nextInRound(17).slot.level.name,'Månraketen');
  const afterFinale=nextInRound(18);
  assert.equal(afterFinale.slot,null);
  assert.deepEqual(afterFinale.skipped,[],'All 18 holes are built; the campaign does not run on into Spökhamnen');
  assert.equal(nextInRound(19).slot.level.name,'Spökplankan');
  const afterSpook=nextInRound(23);
  assert.equal(afterSpook.slot,null);
  assert.deepEqual(afterSpook.skipped.map(slot=>slot.hole),[24]);
});
