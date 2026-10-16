import test from 'node:test';
import assert from 'node:assert/strict';
import { dropHeight, rideSpeed } from '../src/moon-fair.js';

test('the drop tower hauls up slowly, waits, drops fast and settles', () => {
  assert.equal(dropHeight(0),1);
  assert.ok(Math.abs(dropHeight(6)-10)<1e-9,'at the top after the haul');
  assert.equal(dropHeight(7),10,'waits at the top');
  assert.ok(dropHeight(8.4)<1.01,'the drop takes under a second');
  for(let t=0;t<22;t+=.05){const h=dropHeight(t);assert.ok(h>=1-1e-9&&h<=10+1e-9,`stays on the tower at ${t}`)}
});

test('rides run, ease to a stop, wait and start again', () => {
  assert.equal(rideSpeed(0),0);
  assert.equal(rideSpeed(6),1);
  assert.equal(rideSpeed(14),0,'stopped between rides');
  assert.equal(rideSpeed(17+6),1,'repeats');
  for(let t=0;t<40;t+=.1){const s=rideSpeed(t);assert.ok(s>=0&&s<=1)}
});
