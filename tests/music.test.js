import test from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, CALLIOPE, eventsAt, loopLength, AUDIO_DEFAULTS, loadAudioSettings, saveAudioSettings } from '../src/music.js';

const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))}};

test('every world has a song, and every melody fits its loop without overlapping notes',()=>{
  for(const theme of ['forest','clockwork','moon','halloween']){
    const song=SONGS[theme],length=loopLength(song);
    assert.ok(song,theme);assert.equal(length%song.bar,0);
    let end=0;
    for(const [step,,steps] of song.melody){
      assert.ok(step>=end,`${theme}: note at ${step} overlaps the one before`);
      assert.ok(step+steps<=length,`${theme}: note at ${step} runs past the loop`);end=step+steps;
    }
    const seconds=length*song.beat;assert.ok(seconds>=12&&seconds<=25,`${theme}: a ${seconds.toFixed(1)} s loop`);
  }
});

test('melodies stay in key and land on a chord tone at the start of each bar',()=>{
  for(const [theme,song] of Object.entries(SONGS))for(const [step,note] of song.melody){
    const chord=song.chords[Math.floor(step/song.bar)],pc=note%12,inChord=chord.some(n=>n%12===pc);
    assert.ok(song.key.includes(pc)||inChord,`${theme}: note ${note} at ${step} is out of key`);
    if(step%song.bar===0)assert.ok(inChord,`${theme}: bar ${step/song.bar+1} starts off the chord`);
  }
});

test('the moon music follows the calliope bar for bar, on the same beat',()=>{
  const moon=SONGS.moon;
  assert.equal(moon.beat,CALLIOPE.beat);assert.equal(moon.bar,CALLIOPE.bar);
  moon.chords.forEach((chord,i)=>assert.equal(chord[0]%12,CALLIOPE.bass[i%CALLIOPE.bass.length]%12,`bar ${i+1}`));
});

test('the lead rests every third loop and the accompaniment keeps going',()=>{
  const song=SONGS.forest,length=loopLength(song),lead=step=>eventsAt(song,step).some(e=>e.voice===song.lead);
  assert.ok(lead(0)&&lead(length));assert.ok(!lead(2*length),'Third loop: no lead');
  assert.ok(eventsAt(song,2*length).some(e=>e.voice==='bass'),'Bass still plays');
  const stabs=eventsAt(SONGS.clockwork,2).find(e=>e.voice==='stab');assert.equal(stabs.notes.length,2);
});

test('sound settings fall back to defaults, clamp levels and survive a reload',()=>{
  const storage=memory();
  assert.deepEqual(loadAudioSettings(storage),AUDIO_DEFAULTS);
  saveAudioSettings(storage,{on:false,music:0,effects:.4,ambience:1});
  assert.deepEqual(loadAudioSettings(storage),{on:false,music:0,effects:.4,ambience:1});
  storage.setItem('minimayhem-audio',JSON.stringify({music:3,effects:-1,ambience:'x'}));
  assert.deepEqual(loadAudioSettings(storage),{...AUDIO_DEFAULTS,music:1,effects:0});
  storage.setItem('minimayhem-audio','{broken');
  assert.deepEqual(loadAudioSettings(storage),AUDIO_DEFAULTS);
});
