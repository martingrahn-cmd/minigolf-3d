import test from 'node:test';
import assert from 'node:assert/strict';
import { loopPath } from '../src/clock-town.js';

test('the town loop is a closed rounded rectangle walked by distance', () => {
  const r=5,loop=loopPath(-20,20,-10,10,r);
  // Two straight sides each way plus a full circle of corners.
  assert.ok(Math.abs(loop.length-(2*(40-2*r)+2*(20-2*r)+2*Math.PI*r))<.2);
  const a=loop.at(3),b=loop.at(3+loop.length);
  assert.ok(Math.abs(a.x-b.x)<1e-9&&Math.abs(a.z-b.z)<1e-9,'wraps round');
  for(let s=0;s<loop.length;s+=1.7){
    const p=loop.at(s);
    assert.ok(Math.abs(Math.hypot(p.dx,p.dz)-1)<1e-9,'unit heading');
    assert.ok(p.x>=-20-1e-9&&p.x<=20+1e-9&&p.z>=-10-1e-9&&p.z<=10+1e-9,'stays on the loop');
    const q=loop.at(s+.05);
    assert.ok(Math.hypot(q.x-p.x,q.z-p.z)<.06,'continuous');
  }
});
