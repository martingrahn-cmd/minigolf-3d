// Background sound for a world, synthesised with Web Audio so no files are needed.
// Molnskogen: wind in the leaves that swells and settles, and birdsong phrases
// at random intervals. Kept quiet under the game's own effects.
export function createAmbience(context,theme){
  if(theme!=='forest')return null;
  const master=context.createGain();master.gain.value=0;master.connect(context.destination);

  // Wind: looping noise through a low-pass filter, its loudness drifting slowly.
  const length=context.sampleRate*4,buffer=context.createBuffer(1,length,context.sampleRate),data=buffer.getChannelData(0);
  let last=0;for(let i=0;i<length;i++){last=(last+.02*(Math.random()*2-1))/1.02;data[i]=last*3.5}
  const noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;
  const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=520;
  const windGain=context.createGain();windGain.gain.value=.05;
  const lfo=context.createOscillator(),lfoGain=context.createGain();lfo.frequency.value=.07;lfoGain.gain.value=.035;
  lfo.connect(lfoGain);lfoGain.connect(windGain.gain);
  noise.connect(filter);filter.connect(windGain);windGain.connect(master);noise.start();lfo.start();

  // Birdsong: short phrases of rising and falling whistles from a few "species".
  const species=[{base:2600,span:900,notes:[3,5]},{base:3400,span:600,notes:[4,7]},{base:1900,span:500,notes:[2,3]}];
  let timer=null,enabled=false;
  function chirp(at,from,to,dur,vol){
    const osc=context.createOscillator(),gain=context.createGain();osc.type='sine';
    osc.frequency.setValueAtTime(from,at);osc.frequency.exponentialRampToValueAtTime(to,at+dur);
    gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(vol,at+dur*.2);gain.gain.exponentialRampToValueAtTime(.0005,at+dur);
    osc.connect(gain);gain.connect(master);osc.start(at);osc.stop(at+dur+.02);
  }
  function phrase(){
    if(!enabled)return;
    const s=species[Math.floor(Math.random()*species.length)],count=s.notes[0]+Math.floor(Math.random()*(s.notes[1]-s.notes[0]+1));
    let t=context.currentTime+.05;const vol=.012+Math.random()*.012;
    for(let i=0;i<count;i++){
      const f=s.base+Math.random()*s.span,dur=.06+Math.random()*.1;
      chirp(t,f,f*(Math.random()<.5?1.35:.72),dur,vol);t+=dur+.03+Math.random()*.08;
    }
    timer=setTimeout(phrase,1400+Math.random()*4200);
  }
  return {
    setEnabled(on){
      if(on===enabled)return;enabled=on;
      const t=context.currentTime;master.gain.cancelScheduledValues(t);master.gain.setTargetAtTime(on?1:0,t,.6);
      clearTimeout(timer);if(on)timer=setTimeout(phrase,800);
    },
  };
}
