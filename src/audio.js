// Mini Mayhem's sound, synthesised with Web Audio so no files are needed.
// One engine: game effects (the putt, the ball rolling, knocks on the rails,
// the cup, a fall, a fanfare in each world's own instrument) and a background
// soundscape per world, all through a soft compressor and a little reverb.
//
// Molnskogen: wind in the leaves, birdsong.
// Urverkets stad: clocks ticking round the room, a cuckoo now and then, the
//   toy train chuffing past and whistling, a music box, the cat purring.
// Månkarnevalen: a calliope waltz from the fair, the hum of space, squeals
//   from the rides, and fireworks that bang when the bursts are seen.

const NOTE=n=>440*Math.pow(2,(n-69)/12);

export function createAudio(theme){
  let ctx=null,master,sfxBus,ambBus,reverbSend,noise,enabled=true,hidden=false,world=null,roll=null,lastKnock=0;

  function build(){
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;comp.connect(ctx.destination);
    master=ctx.createGain();master.gain.value=enabled?1:0;master.connect(comp);
    sfxBus=ctx.createGain();sfxBus.gain.value=2.6;sfxBus.connect(master);
    ambBus=ctx.createGain();ambBus.gain.value=1.1;ambBus.connect(master);
    // A generated impulse response: a moon-sized hall, a workshop, an open forest.
    const seconds=theme==='moon'?3.2:theme==='clockwork'?1.6:1.1,len=Math.floor(ctx.sampleRate*seconds);
    const ir=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,theme==='moon'?2.2:3)}
    const convolver=ctx.createConvolver();convolver.buffer=ir;
    reverbSend=ctx.createGain();reverbSend.gain.value=theme==='moon'?.5:.3;reverbSend.connect(convolver);convolver.connect(master);
    noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const n=noise.getChannelData(0);for(let i=0;i<n.length;i++)n[i]=Math.random()*2-1;
    world=({forest:forestAmbience,clockwork:clockAmbience,moon:moonAmbience}[theme]??(()=>null))();
    world?.start();
  }
  // Browsers only allow sound after a tap; call this from a gesture.
  function unlock(){
    try{if(!ctx)build();if(ctx.state==='suspended'&&!hidden)ctx.resume()}catch{}
  }
  const live=()=>ctx&&enabled&&!hidden&&ctx.state==='running';

  // --- Building blocks. ---
  function out(node,{pan=0,wet=.25,bus=sfxBus}={}){
    let last=node;
    if(pan&&ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;last.connect(p);last=p}
    last.connect(bus);
    if(wet){const w=ctx.createGain();w.gain.value=wet;last.connect(w);w.connect(reverbSend)}
  }
  function env(at,vol,attack,decay){
    const g=ctx.createGain();g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol,at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+attack+decay);return g;
  }
  function osc(at,type,freq,toFreq,vol,attack,decay,opts){
    const o=ctx.createOscillator(),g=env(at,vol,attack,decay);o.type=type;o.frequency.setValueAtTime(freq,at);
    if(toFreq&&toFreq!==freq)o.frequency.exponentialRampToValueAtTime(Math.max(20,toFreq),at+attack+decay);
    o.connect(g);out(g,opts);o.start(at);o.stop(at+attack+decay+.05);return o;
  }
  function hiss(at,filterType,freq,q,vol,attack,decay,opts,toFreq){
    const s=ctx.createBufferSource();s.buffer=noise;s.playbackRate.value=.8+Math.random()*.4;
    const f=ctx.createBiquadFilter();f.type=filterType;f.frequency.setValueAtTime(freq,at);f.Q.value=q;
    if(toFreq)f.frequency.exponentialRampToValueAtTime(toFreq,at+attack+decay);
    const g=env(at,vol,attack,decay);s.connect(f);f.connect(g);out(g,opts);
    s.start(at,Math.random()*1.5);s.stop(at+attack+decay+.05);
  }
  // A plucked or struck note with a few partials: marimba, music box, glockenspiel.
  function struck(at,freq,vol,kind,opts){
    const partials=kind==='marimba'?[[1,1,.5],[4,.25,.08],[10,.06,.03]]:kind==='musicbox'?[[1,1,1.1],[2.76,.35,.25],[5.4,.12,.08]]:[[1,1,1.6],[2.4,.4,.5],[5.9,.15,.2]];
    for(const [mult,amp,decay] of partials)osc(at,'sine',freq*mult,0,vol*amp,.004,decay,opts);
  }

  // --- Game effects. ---
  const api={
    unlock,
    setEnabled(on){enabled=on;if(!ctx)return;master.gain.setTargetAtTime(on?1:0,ctx.currentTime,.08);if(on)unlock()},
    setHidden(h){hidden=h;if(!ctx)return;try{h?ctx.suspend():enabled&&ctx.resume()}catch{}},
    // The old one-line beeps, now with a soft attack and a touch of room.
    tone(freq=440,duration=.13,type='sine',vol=.055,slide=1){
      if(!live())return;const t=ctx.currentTime;
      osc(t,type==='sawtooth'?'triangle':type,freq,freq*slide,vol*.42,.006,duration,{wet:.3});
      osc(t,'sine',freq*2,freq*2*slide,vol*.1,.004,duration*.6,{wet:.3});
    },
    putt(power=.5){
      if(!live())return;const t=ctx.currentTime,p=.35+power*.65;
      hiss(t,'bandpass',2600,1.2,.55*p,.001,.035,{wet:.15});
      osc(t,'sine',190,95,.45*p,.002,.09,{wet:.1});
      osc(t,'triangle',1250,1150,.06*p,.001,.05,{wet:.2});
    },
    knock(speed){
      if(!live()||speed<.6)return;const t=ctx.currentTime;if(t-lastKnock<.06)return;lastKnock=t;
      const v=Math.min(1,speed/12)*.5;
      if(theme==='clockwork'){osc(t,'sine',1180,1170,v*.5,.001,.35,{wet:.35});osc(t,'sine',1830,1820,v*.25,.001,.2,{wet:.35});hiss(t,'highpass',3000,.7,v*.4,.001,.02)}
      else if(theme==='moon'){osc(t,'triangle',300,190,v*.8,.002,.14,{wet:.3});hiss(t,'bandpass',1200,2,v*.3,.001,.03)}
      else{hiss(t,'bandpass',950,4,v*1.2,.001,.05,{wet:.15});osc(t,'sine',330,250,v*.6,.002,.09,{wet:.15})}
    },
    // Called every frame with the ball's speed on the felt (0 when airborne).
    roll(speed){
      if(!ctx)return;
      if(!roll){
        const s=ctx.createBufferSource();s.buffer=noise;s.loop=true;
        const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=300;f.Q.value=.7;
        const g=ctx.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(sfxBus);s.start();roll={f,g};
      }
      const t=ctx.currentTime,on=live()?Math.min(1,speed/10):0;
      roll.g.gain.setTargetAtTime(on*on*.22+(on>0?.015:0),t,.05);roll.f.frequency.setTargetAtTime(180+on*900,t,.05);
    },
    cup(){
      if(!live())return;const t=ctx.currentTime;
      [0,.055,.095].forEach((d,i)=>hiss(t+d,'bandpass',3200-i*500,3,.35-i*.08,.001,.03,{wet:.2}));
      osc(t+.12,'sine',150,70,.5,.003,.18,{wet:.15});
      osc(t+.13,'sine',420,260,.18,.004,.22,{wet:.3});
    },
    fanfare(stars=2){
      if(!live())return;const t=ctx.currentTime+.25;
      const kind=theme==='forest'?'marimba':theme==='clockwork'?'musicbox':'glock';
      const run=[72,76,79,84,88,91].slice(0,3+stars);
      run.forEach((n,i)=>struck(t+i*.13,NOTE(n),.16,kind,{wet:.4}));
      const end=t+run.length*.13;[72,76,79].forEach(n=>struck(end+.05,NOTE(n+12),.08,kind,{wet:.5}));
    },
    fall(){
      if(!live())return;const t=ctx.currentTime;
      osc(t,'sine',900,180,.18,.02,.75,{wet:.4});
      hiss(t,'lowpass',2500,.5,.18,.05,.7,{wet:.3},200);
    },
    boom(x=0){
      // A firework far away: the light first, the bang a moment later.
      if(!live())return;const t=ctx.currentTime+.35,pan=Math.max(-.8,Math.min(.8,x/40));
      osc(t,'sine',90,38,.5,.004,.6,{pan,wet:.7,bus:ambBus});
      hiss(t,'lowpass',900,.6,.35,.003,.5,{pan,wet:.7,bus:ambBus},200);
      for(let i=0;i<14;i++)hiss(t+.15+Math.random()*.9,'highpass',4000,1,.05+Math.random()*.05,.001,.02,{pan:pan+(Math.random()-.5)*.4,wet:.6,bus:ambBus});
    },
  };

  // --- Background scheduling: a little look-ahead clock for each world. ---
  function scheduler(step){
    let timer=null,next=0;
    return {start(){next=ctx.currentTime+.2;timer=setInterval(()=>{if(!live())return;if(next<ctx.currentTime-.1)next=ctx.currentTime+.05;while(next<ctx.currentTime+.4)next=step(next)},90)}};
  }
  function loopNoise(filterType,freq,q,vol,pan=0){
    const s=ctx.createBufferSource();s.buffer=noise;s.loop=true;const f=ctx.createBiquadFilter();f.type=filterType;f.frequency.value=freq;f.Q.value=q;
    const g=ctx.createGain();g.gain.value=vol;s.connect(f);f.connect(g);out(g,{pan,wet:.2,bus:ambBus});s.start();return {s,f,g};
  }
  function lfo(param,rate,depth){const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=rate;g.gain.value=depth;o.connect(g);g.connect(param);o.start()}

  function forestAmbience(){
    return {start(){
      const wind=loopNoise('lowpass',520,.7,.09);lfo(wind.g.gain,.07,.06);lfo(wind.f.frequency,.05,180);
      const leaves=loopNoise('bandpass',3200,.8,.012,.3);lfo(leaves.g.gain,.11,.01);
      const species=[{base:2600,span:900,notes:[3,5]},{base:3400,span:600,notes:[4,7]},{base:1900,span:500,notes:[2,3]}];
      scheduler(at=>{
        const s=species[Math.floor(Math.random()*species.length)],count=s.notes[0]+Math.floor(Math.random()*(s.notes[1]-s.notes[0]+1)),pan=Math.random()*1.6-.8;
        let t=at;const vol=.03+Math.random()*.03;
        for(let i=0;i<count;i++){const f=s.base+Math.random()*s.span,d=.06+Math.random()*.1;osc(t,'sine',f,f*(Math.random()<.5?1.35:.72),vol,d*.2,d*.8,{pan,wet:.3,bus:ambBus});t+=d+.03+Math.random()*.08}
        return t+1.4+Math.random()*4.2;
      }).start();
    }};
  }

  function clockAmbience(){
    return {start(){
      // Room tone and the fountain's trickle.
      loopNoise('lowpass',180,.5,.05);
      const trickle=loopNoise('bandpass',2400,.6,.012,.4);lfo(trickle.g.gain,1.7,.006);
      // Three clocks ticking at their own pace from different corners.
      for(const [period,pan,pitch,vol] of [[1,-.6,5200,.06],[.75,.35,3900,.04],[1.5,.75,2800,.05]]){
        let tock=false;
        scheduler(at=>{hiss(at,'bandpass',tock?pitch*.8:pitch,6,vol,.001,.025,{pan,wet:.25,bus:ambBus});osc(at,'sine',tock?1500:1900,0,vol*.25,.001,.02,{pan,wet:.2,bus:ambBus});tock=!tock;return at+period/2}).start();
      }
      // The cuckoo: two falling notes, called a few times.
      scheduler(at=>{
        const calls=2+Math.floor(Math.random()*3);
        for(let i=0;i<calls;i++){const t=at+i*.7;
          for(const [n,d] of [[NOTE(76),0],[NOTE(72),.28]]){const o=osc(t+d,'triangle',n,n*.98,.07,.02,.22,{pan:.2,wet:.4,bus:ambBus});lfo(o.frequency,6,4)}
        }
        return at+22+Math.random()*16;
      }).start();
      // The toy train: chuffs that swell as it passes, and its whistle.
      let chuff=0;
      scheduler(at=>{
        const lap=(at%64)/64,near=Math.pow(Math.max(0,Math.sin(lap*Math.PI*2)),2),pan=Math.cos(lap*Math.PI*2)*.7;
        hiss(at,'bandpass',chuff%2?1500:1100,1.2,.015+near*.05,.005,.09,{pan,wet:.2,bus:ambBus});chuff++;
        if(chuff%90===0){for(const f of [NOTE(81),NOTE(85)])osc(at,'sine',f,f*1.01,.035+near*.03,.06,.7,{pan,wet:.4,bus:ambBus})}
        return at+.24;
      }).start();
      // The music box on the carousel plays its waltz every so often.
      const tune=[72,76,79,76,74,77,81,77,76,79,84,79,77,74,71,72];
      scheduler(at=>{tune.forEach((n,i)=>struck(at+i*.32,NOTE(n),.035,'musicbox',{pan:-.3,wet:.5,bus:ambBus}));return at+tune.length*.32+14+Math.random()*10}).start();
      // The cat purrs.
      const purr=loopNoise('lowpass',260,.8,0);lfo(purr.g.gain,24,.02);
      scheduler(at=>{purr.g.gain.setTargetAtTime(Math.random()<.5?.02:0,at,1.5);return at+8+Math.random()*8}).start();
    }};
  }

  function moonAmbience(){
    return {start(){
      // The hum of space: two soft detuned chords, slowly changing.
      const pad=ctx.createBiquadFilter();pad.type='lowpass';pad.frequency.value=700;const padGain=ctx.createGain();padGain.gain.value=.025;pad.connect(padGain);out(padGain,{wet:.8,bus:ambBus});
      const voices=[0,1,2].map(()=>{const o=ctx.createOscillator();o.type='sawtooth';o.connect(pad);o.start();return o});
      const chords=[[48,55,64],[45,52,60],[41,48,57],[43,50,59]];let chord=0;
      scheduler(at=>{chords[chord%4].forEach((n,i)=>voices[i].frequency.setTargetAtTime(NOTE(n)*(1+(i-1)*.003),at,1.2));chord++;return at+8}).start();
      // The calliope waltz drifting over from the fair: oom-pah-pah and a tune.
      const melody=[79,77,76,77,79,84,83,81,79,76,77,74,72,74,76,79,77,74,72,71,72,null];
      const bass=[48,43,48,43,53,48,55,43];let beat=0;
      scheduler(at=>{
        const bar=Math.floor(beat/3),inBar=beat%3,root=bass[bar%bass.length];
        if(inBar===0)osc(at,'triangle',NOTE(root),0,.05,.005,.28,{pan:-.2,wet:.6,bus:ambBus});
        else for(const n of [root+16,root+19])osc(at,'square',NOTE(n),0,.01,.005,.12,{pan:-.2,wet:.6,bus:ambBus});
        const m=melody[beat%melody.length];
        if(m){const o=osc(at,'square',NOTE(m),0,.012,.01,.32,{pan:-.2,wet:.7,bus:ambBus});lfo(o.frequency,5.5,3)}
        beat++;return at+.4;
      }).start();
      // Happy squeals from the rides.
      scheduler(at=>{const f=900+Math.random()*500,pan=Math.random()*1.6-.8;osc(at,'sine',f,f*1.6,.025,.08,.4,{pan,wet:.7,bus:ambBus});osc(at+.45,'sine',f*1.5,f*.9,.02,.05,.35,{pan,wet:.7,bus:ambBus});return at+4+Math.random()*7}).start();
      // A murmuring crowd.
      const crowd=loopNoise('bandpass',900,.9,.012);lfo(crowd.g.gain,.3,.006);lfo(crowd.f.frequency,.7,250);
      window.addEventListener('fair-burst',e=>api.boom(e.detail?.x??0));
    }};
  }

  return api;
}
