import test from 'node:test';
import assert from 'node:assert/strict';
import { nextTip, TIPS } from '../src/coach.js';

test('tips come once each, as the moment for them arrives', () => {
  const seen=new Set();
  assert.equal(nextTip(seen,{phase:'idle',shots:0}),'aim');
  seen.add('aim');
  assert.equal(nextTip(seen,{phase:'idle',shots:0}),null,'nothing more before the first shot');
  assert.equal(nextTip(seen,{phase:'power',shots:0}),'power');
  assert.equal(nextTip(seen,{phase:'accuracy',shots:0}),'accuracy');
  seen.add('power');seen.add('accuracy');
  assert.equal(nextTip(seen,{phase:'moving',shots:1}),null,'quiet while the ball rolls');
  assert.equal(nextTip(seen,{phase:'idle',shots:1}),'overview');
  seen.add('overview');
  assert.equal(nextTip(seen,{phase:'idle',shots:1}),null);
});

test('the first near putt explains the metre meter, before anything else', () => {
  assert.equal(nextTip(new Set(),{phase:'idle',shots:2,putting:true}),'putt');
  assert.equal(nextTip(new Set(['putt']),{phase:'power',shots:2,putting:true}),null,'the full-shot power tip waits for a full shot');
  assert.equal(nextTip(new Set(['putt']),{phase:'power',shots:2,putting:false}),'power');
  for(const tip of Object.values(TIPS))assert.ok(tip.text.length<120,'tips stay short enough for a phone');
});
