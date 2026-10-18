// Each world's music, written as data and played by the synth in audio.js.
// A song is a loop of bars. Every step (`beat` seconds) the player asks
// `eventsAt` what to play, from the step's place on one shared clock, so the
// music and the moon fair's calliope keep the same time even after a pause.
//
// chords: one per bar, MIDI notes with the root first.
// melody: [step, note, length in steps] within the loop.
// arp: chord-tone indices played on each step of the bar (3 = root an octave up).
// bass/pad: steps of the bar that take the root, fifth or a chord stab.
// rest: the lead sits out every `rest`-th loop so the tune can breathe.

const F=[53,57,60],Am=[57,60,64],Bb=[58,62,65],Cmaj=[60,64,67],Dm=[62,65,69];
const G=[55,59,62],Fmaj=[53,57,60],E7=[52,56,59,62],G7=[55,59,62,65];

// The calliope's oom-pah-pah from the moon fair (ambience), one root per bar of
// three beats. The moon's music is written over the same bars.
export const CALLIOPE={beat:.4,bar:3,bass:[48,43,48,43,53,48,55,43]};
const moonChord={48:Cmaj,43:G,53:Fmaj,55:G};

export const SONGS={
  // A pastoral lilt in 6/8: marimba arpeggios, a soft bass and a wooden flute.
  forest:{
    key:[5,7,9,10,0,2,4],beat:.3,bar:6,rest:3,lead:'flute',arp:'marimba',
    chords:[F,Am,Bb,Cmaj,F,Dm,Bb,Cmaj],
    arpSteps:[0,1,2,3,2,1],bass:{0:'root',3:'fifth'},
    melody:[[0,69,3],[3,72,3],[6,76,4],[10,74,2],[12,74,3],[15,72,2],[17,70,1],[18,72,6],
      [24,69,2],[26,70,1],[27,72,3],[30,77,4],[34,76,2],[36,74,3],[39,70,3],[42,72,3],[45,67,3]],
  },
  // A tick-tock march for the clockwork town: pizzicato oom-pah and a music box.
  clockwork:{
    key:[0,2,4,5,7,9,11],beat:.27,bar:8,rest:3,lead:'musicbox',
    chords:[Cmaj,Am,Fmaj,G,Cmaj,E7,Am,G7],
    bass:{0:'root',4:'root',2:'stab',6:'stab'},
    melody:[[0,79,1],[1,76,1],[2,72,1],[3,76,1],[4,79,2],[6,84,2],
      [8,81,2],[10,76,1],[11,72,1],[12,76,2],[14,81,2],
      [16,77,1],[17,81,1],[18,84,2],[20,81,1],[21,77,1],[22,72,2],
      [24,79,2],[26,74,2],[28,71,2],[30,74,2],
      [32,76,1],[33,79,1],[34,84,2],[36,83,1],[37,84,1],[38,79,2],
      [40,80,2],[42,76,2],[44,74,2],[46,71,2],
      [48,72,2],[50,76,2],[52,81,2],[54,79,1],[55,77,1],
      [56,77,1],[57,74,1],[58,71,2],[60,74,2],[62,79,2]],
  },
  // Over the calliope's waltz: glassy arpeggios and a theremin drifting in space.
  moon:{
    key:[0,2,4,5,7,9,11],beat:CALLIOPE.beat,bar:CALLIOPE.bar,rest:3,lead:'theremin',arp:'glass',
    chords:[...CALLIOPE.bass,...CALLIOPE.bass].map(root=>moonChord[root]),
    arpSteps:[0,1,2],
    melody:[[0,76,3],[3,74,2],[5,71,1],[6,72,3],[9,67,3],[12,69,2],[14,72,1],[15,76,3],[18,79,3],[21,74,3],
      [24,79,2],[26,77,1],[27,74,3],[30,76,2],[32,79,1],[33,83,3],[36,81,2],[38,77,1],[39,79,3],[42,74,3],[45,71,1],[46,74,2]],
  },
};

export const loopLength=song=>song.chords.length*song.bar;

// What to play on a step of the shared clock: [{voice, note, steps, accent}].
export function eventsAt(song,step){
  const length=loopLength(song),loop=Math.floor(step/length),at=step-loop*length;
  const chord=song.chords[Math.floor(at/song.bar)],inBar=at%song.bar,out=[];
  const part=song.bass?.[inBar];
  if(part==='root'||part==='fifth')out.push({voice:'bass',note:(part==='root'?chord[0]:chord[2])-24,steps:song.bar/2,accent:inBar===0});
  if(part==='stab')out.push({voice:'stab',notes:chord.slice(1).map(n=>n-12),steps:1});
  if(song.arpSteps){const i=song.arpSteps[inBar%song.arpSteps.length];out.push({voice:song.arp,note:i===3?chord[0]+12:chord[i]+12,steps:1,accent:inBar===0})}
  if(loop%song.rest!==song.rest-1)for(const [s,note,steps] of song.melody)if(s===at)out.push({voice:song.lead,note,steps});
  return out;
}

// The player's sound settings, kept on the device.
const SETTINGS_KEY='minimayhem-audio';
export const AUDIO_DEFAULTS={on:true,music:.5,effects:1,ambience:.8};
const level=v=>Math.max(0,Math.min(1,Number(v)));
export function loadAudioSettings(storage){
  let saved={};
  try{saved=JSON.parse(storage.getItem(SETTINGS_KEY))||{}}catch{}
  const out={...AUDIO_DEFAULTS};
  if(typeof saved.on==='boolean')out.on=saved.on;
  for(const key of ['music','effects','ambience'])if(Number.isFinite(Number(saved[key]))&&saved[key]!==null)out[key]=level(saved[key]);
  return out;
}
export function saveAudioSettings(storage,settings){
  try{storage.setItem(SETTINGS_KEY,JSON.stringify(settings))}catch{}
}
