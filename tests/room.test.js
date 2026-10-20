import test from 'node:test';
import assert from 'node:assert/strict';
import { roomCode, normalizeCode, cleanName, seatPlayers, electHost, createMatch, mergeScores, waitingFor, holeDone, advance, standings, turnOrder, currentTurn, forfeit, withForfeits, STROKE_CAP, MAX_PLAYERS, PLAYER_COLORS, AWAY_AFTER } from '../src/room.js';

const ann={id:'a',name:'Ann',joinedAt:10},bo={id:'b',name:'Bo',joinedAt:12},cy={id:'c',name:'Cy',joinedAt:11},di={id:'d',name:'Di',joinedAt:20},ed={id:'e',name:'Ed',joinedAt:30};

test('room codes are four easy letters; typed codes are cleaned up',()=>{
  let seed=1;const random=()=>(seed=seed*16807%2147483647)/2147483647;
  for(let i=0;i<50;i++){const c=roomCode(random);assert.match(c,/^[A-HJ-NPR-Z]{4}$/)}
  assert.equal(normalizeCode(' ab-cd9 '),'ABCD');assert.equal(normalizeCode('ioqxyz'),'XYZ');
  assert.equal(cleanName('   '),'Spelare');assert.equal(cleanName('  Anna   Lisa  '),'Anna Lisa');assert.equal(cleanName('x'.repeat(30)).length,14);
});

test('players are seated in the order they joined; four seats, four colours, the first is host',()=>{
  const seated=seatPlayers([bo,ed,ann,di,cy]);
  assert.deepEqual(seated.map(p=>p.id),['a','c','b','d','e']);
  assert.deepEqual(seated.slice(0,MAX_PLAYERS).map(p=>p.color),PLAYER_COLORS);
  assert.equal(seated[4].seat,null,'A fifth player gets no seat');
  assert.equal(electHost([bo,cy,ann]).id,'a');
  assert.equal(electHost([bo,cy]).id,'c','When the host leaves, the next in line takes over');
  assert.equal(electHost([]),null);
});

test('a match plays one world\'s holes in order and finishes after the last',()=>{
  let m=createMatch('moon',[13,14,15],[bo,ann,ed]);
  assert.deepEqual(m.players.map(p=>p.name),['Ann','Bo','Ed']);assert.equal(m.index,0);
  m=advance(m);assert.equal(m.index,1);m=advance(advance(m));
  assert.ok(m.finished);assert.equal(m.index,2);
});

test('each player\'s own scores win when merged, hole by hole',()=>{
  let s=mergeScores({},'a',[3,null,4]);
  s=mergeScores(s,'a',[null,2]);assert.deepEqual(s.a,[3,2,4]);
  s=mergeScores(s,'b',[5]);assert.deepEqual(Object.keys(s),['a','b']);
});

test('the hole waits for everyone still here, but not for someone who left',()=>{
  const m=createMatch('moon',[13,14],[ann,bo,cy]);
  const seen={a:100,b:100,c:100};
  let s=mergeScores(mergeScores({},'a',[3]),'b',[4]);
  assert.deepEqual(waitingFor(m,s,seen,101).map(p=>p.id),['c']);
  assert.ok(!holeDone(m,s,seen,101));
  assert.ok(holeDone(m,s,seen,100+AWAY_AFTER+1),'Cy has been gone too long to wait for');
  s=mergeScores(s,'c',[2]);assert.ok(holeDone(m,s,seen,101));
});

test('standings add up strokes; unfinished holes count as the cap, ties share a place',()=>{
  let m=createMatch('clockwork',[1,2,3],[ann,bo,cy]);
  let s={};s=mergeScores(s,'a',[3,4]);s=mergeScores(s,'b',[4,3]);s=mergeScores(s,'c',[2]);
  m=advance(m);
  let rows=standings(m,s,[3,3,3]);
  // Mid-match, the hole being played only counts once it is finished.
  assert.deepEqual(rows.map(r=>[r.player.id,r.total,r.place]),[['c',2,1],['a',7,2],['b',7,2]]);
  m=advance(advance(m));assert.ok(m.finished);
  s=mergeScores(s,'a',[3,4,2]);s=mergeScores(s,'b',[4,3,3]);
  rows=standings(m,s,[3,3,3]);
  assert.deepEqual(rows.map(r=>r.player.id),['a','b','c']);
  assert.equal(rows.find(r=>r.player.id==='c').total,2+2*STROKE_CAP,'Cy left after one hole');
  assert.equal(rows[0].toPar,0);assert.equal(rows[0].place,1);
});

test('turns: the order is drawn at random and moves one step each hole',()=>{
  let seed=7;const random=()=>(seed=seed*16807%2147483647)/2147483647;
  const m=createMatch('moon',[13,14,15,16],[ann,bo,cy],random,'turns');
  assert.equal(m.mode,'turns');assert.deepEqual([...m.order].sort(),['a','b','c']);
  const firsts=[0,1,2,3].map(index=>turnOrder({...m,index})[0].id);
  assert.deepEqual(turnOrder(m).map(p=>p.id),m.order);
  assert.deepEqual(turnOrder({...m,index:1}).map(p=>p.id),[...m.order.slice(1),m.order[0]]);
  assert.equal(new Set(firsts.slice(0,3)).size,3,'Each player goes first once in three holes');
  const starts=new Set();for(let s=1;s<40;s++){seed=s;starts.add(createMatch('moon',[13],[ann,bo,cy],random,'turns').order[0])}
  assert.equal(starts.size,3,'Anyone can be drawn to start');
  assert.equal(createMatch('moon',[13],[ann,bo]).mode,'together');assert.equal(createMatch('moon',[13],[ann,bo]).order,undefined);
});

test('turns: the turn passes when a player holes out; a forfeit counts as the cap',()=>{
  const m={...createMatch('moon',[13,14],[ann,bo,cy],Math.random,'turns'),order:['b','a','c']};
  let scores={};
  assert.equal(currentTurn(m,scores).id,'b');
  scores=mergeScores(scores,'b',[3]);assert.equal(currentTurn(m,scores).id,'a');
  const f=forfeit(m,'a');assert.deepEqual(f.forfeits,{0:['a']});assert.equal(forfeit(f,'a'),f);
  const filled=withForfeits(f,scores);assert.equal(filled.a[0],STROKE_CAP);assert.equal(currentTurn(f,filled).id,'c');
  assert.equal(withForfeits(f,mergeScores(scores,'a',[4])).a[0],4,'A real score stands over a forfeit');
  assert.equal(currentTurn(f,mergeScores(filled,'c',[2])),null);
  assert.equal(currentTurn({...f,index:1},filled).id,'a','The next hole starts one step further on');
});
