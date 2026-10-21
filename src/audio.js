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
// Spökhamnen: a howling wind, waves against the piles, an owl, the ghost ship
//   creaking, bats squeaking and now and then a wolf far away.
//
// On top of that each world has its own music (the songs are in music.js).
// Effects, ambience and music have their own bus and volume.
import { SONGS, CALLIOPE, eventsAt, AUDIO_DEFAULTS } from './music.js';

const NOTE=n=>440*Math.pow(2,(n-69)/12);
// Each bus at full volume; the player's settings scale them.
const BUS_GAIN={effects:2.6,ambience:1.1,music:1};

export function createAudio(theme){
  let ctx=null,master,sfxBus,ambBus,musicBus,reverbSend,noise,levels={...AUDIO_DEFAULTS},hidden=false,world=null,roll=null,lastKnock=0,t0=0,ducked=1,duckTimer=0;

  function build(){
    ctx=new (window.AudioContext||window.webkitAudioContext)();
    const comp=ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=3;comp.connect(ctx.destination);
    master=ctx.createGain();master.gain.value=levels.on?1:0;master.connect(comp);
    sfxBus=ctx.createGain();sfxBus.gain.value=BUS_GAIN.effects*levels.effects;sfxBus.connect(master);
    ambBus=ctx.createGain();ambBus.gain.value=BUS_GAIN.ambience*levels.ambience;ambBus.connect(master);
    musicBus=ctx.createGain();musicBus.gain.value=BUS_GAIN.music*levels.music;musicBus.connect(master);
    // The shared clock: music and the fair's calliope count their beats from here.
    t0=ctx.currentTime+.2;
    // A generated impulse response: a moon-sized hall, a workshop, an open forest.
    const seconds=theme==='moon'?3.2:theme==='halloween'?2.4:theme==='clockwork'?1.6:1.1,len=Math.floor(ctx.sampleRate*seconds);
    const ir=ctx.createBuffer(2,len,ctx.sampleRate);
    for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,theme==='moon'?2.2:3)}
    const convolver=ctx.createConvolver();convolver.buffer=ir;
    reverbSend=ctx.createGain();reverbSend.gain.value=theme==='moon'?.5:theme==='halloween'?.45:.3;reverbSend.connect(convolver);convolver.connect(master);
    noise=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const n=noise.getChannelData(0);for(let i=0;i<n.length;i++)n[i]=Math.random()*2-1;
    world=({forest:forestAmbience,clockwork:clockAmbience,moon:moonAmbience,halloween:spookAmbience}[theme]??(()=>null))();
    world?.start();
    if(SONGS[theme])music(SONGS[theme]);
  }
  // Browsers only allow sound after a tap; call this from a gesture.
  function unlock(){
    try{if(!ctx)build();if(ctx.state==='suspended'&&!hidden)ctx.resume()}catch{}
  }
  const live=()=>ctx&&levels.on&&!hidden&&ctx.state==='running';

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
    // { on, music, effects, ambience }, levels from 0 to 1.
    setLevels(next){
      levels={...levels,...next};if(!ctx)return;const t=ctx.currentTime;
      master.gain.setTargetAtTime(levels.on?1:0,t,.08);
      sfxBus.gain.setTargetAtTime(BUS_GAIN.effects*levels.effects,t,.05);
      ambBus.gain.setTargetAtTime(BUS_GAIN.ambience*levels.ambience,t,.1);
      musicBus.gain.setTargetAtTime(BUS_GAIN.music*levels.music*ducked,t,.1);
      if(levels.on)unlock();
    },
    // Silent for a moment, then back to the set level: a turn being caught up on
    // plays all its sounds at once, and none of them should be heard.
    hush(seconds=1.5){
      if(!ctx)return;const t=ctx.currentTime;
      master.gain.cancelScheduledValues(t);master.gain.setValueAtTime(0,t);master.gain.setTargetAtTime(levels.on?1:0,t+seconds,.15);
    },
    // The music steps back for a moment, e.g. under the sink and the fanfare.
    duck(seconds=3){
      if(!ctx)return;const t=ctx.currentTime;ducked=.3;
      musicBus.gain.setTargetAtTime(BUS_GAIN.music*levels.music*ducked,t,.15);
      clearTimeout(duckTimer);duckTimer=setTimeout(()=>{ducked=1;musicBus.gain.setTargetAtTime(BUS_GAIN.music*levels.music,ctx.currentTime,.8)},seconds*1000);
    },
    // The QA bench's level meter: loudness of each bus in dBFS right now.
    meter(){
      if(!ctx)return null;
      api.meters??=Object.fromEntries([['music',musicBus],['effects',sfxBus],['ambience',ambBus],['all',master]].map(([k,bus])=>{const a=ctx.createAnalyser();a.fftSize=2048;bus.connect(a);return [k,a]}));
      return Object.fromEntries(Object.entries(api.meters).map(([k,a])=>{const d=new Float32Array(a.fftSize);a.getFloatTimeDomainData(d);const rms=Math.sqrt(d.reduce((s,v)=>s+v*v,0)/d.length);return [k,+(20*Math.log10(rms||1e-6)).toFixed(1)]}));
    },
    setHidden(h){hidden=h;if(!ctx)return;try{h?ctx.suspend():levels.on&&ctx.resume()}catch{}},
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
      const kind=theme==='forest'||theme==='halloween'?'marimba':theme==='clockwork'?'musicbox':'glock';
      // Spökhamnen's fanfare is in a minor key, rattled out on bones.
      const run=(theme==='halloween'?[72,75,79,84,87,91]:[72,76,79,84,88,91]).slice(0,3+stars);
      run.forEach((n,i)=>struck(t+i*.13,NOTE(n),.16,kind,{wet:.4}));
      const end=t+run.length*.13;(theme==='halloween'?[72,75,79]:[72,76,79]).forEach(n=>struck(end+.05,NOTE(n+12),.08,kind,{wet:.5}));
    },
    // The sink celebration: a slow-motion whoosh, the ball plinking on the bottom,
    // and the critter popping up, gulping and munching.
    swoosh(){
      if(!live())return;const t=ctx.currentTime;
      hiss(t,'lowpass',3200,.8,.22,.15,1.3,{wet:.5},260);osc(t,'sine',140,55,.25,.1,1.2,{wet:.4});
    },
    plink(k=1){
      if(!live())return;const t=ctx.currentTime;
      osc(t,'sine',1650,1550,.16*k,.001,.09,{wet:.35});hiss(t,'bandpass',4200,3,.12*k,.001,.025,{wet:.3});osc(t,'sine',220,140,.25*k,.002,.12,{wet:.2});
    },
    critter(event){
      if(!live())return;const t=ctx.currentTime;
      if(event==='pop'&&theme==='halloween'){
        // The hand rises: an eerie glide and a rattle of bones.
        const o=osc(t,'sine',300,900,.12,.15,.6,{wet:.6});lfo(o.frequency,6,14);
        for(let i=0;i<6;i++)struck(t+.1+i*.05,NOTE(84+(i%3)*3),.05,'marimba',{wet:.3});
        return;
      }
      if(event==='munch'&&theme==='halloween'){
        // A dry little cackle: heh-heh-heh-heh.
        for(let i=0;i<4;i++){const o=osc(t+i*.15,'triangle',420-i*25,330-i*25,.1,.01,.12,{wet:.4});lfo(o.frequency,30,25)}
        return;
      }
      if(event==='gulp'&&theme==='halloween'){for(let i=0;i<4;i++)struck(t+i*.06,NOTE(79-i*2),.06,'marimba',{wet:.3});return}
      if(event==='pop'){
        osc(t,'sine',280,950,.3,.005,.13,{wet:.3});
        if(theme==='forest')[0,.14].forEach(d=>osc(t+.18+d,'sine',1350,1850,.12,.01,.09,{wet:.3}));
        else if(theme==='clockwork')[[NOTE(79),0],[NOTE(75),.3]].forEach(([f,d])=>{const o=osc(t+.15+d,'triangle',f,f*.98,.16,.02,.24,{wet:.4});lfo(o.frequency,6,5)});
        else{const o=osc(t+.15,'square',600,1300,.05,.01,.18,{wet:.5});osc(t+.38,'square',1000,420,.05,.01,.2,{wet:.5});lfo(o.frequency,18,40)}
      }
      if(event==='gulp'){osc(t,'sine',420,110,.4,.01,.22,{wet:.2});osc(t+.18,'sine',300,520,.12,.01,.08,{wet:.3})}
      if(event==='munch')for(let i=0;i<5;i++)hiss(t+i*.13,'bandpass',1800+Math.random()*900,2,.18,.002,.05,{wet:.15});
      if(event==='dig')for(let i=0;i<6;i++)hiss(t+i*.09,'lowpass',900+Math.random()*500,1,.22,.003,.07,{wet:.15});
      if(event==='meow'){const o=osc(t,'sawtooth',520,760,.05,.04,.22,{wet:.3});osc(t+.26,'sawtooth',760,560,.05,.01,.3,{wet:.3});lfo(o.frequency,7,6)}
      if(event==='boop'){osc(t,'sine',500,1500,.12,.005,.12,{wet:.4});osc(t+.13,'sine',1500,800,.1,.005,.12,{wet:.4})}
      if(event==='tap'){hiss(t,'bandpass',2200,2,.3,.001,.03,{wet:.15});osc(t,'sine',240,160,.25,.002,.08,{wet:.15})}
      if(event==='duck'){osc(t,'sine',700,180,.2,.01,.28,{wet:.3});hiss(t,'lowpass',2000,.7,.1,.01,.25,{wet:.3},300)}
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
  // A beat grid on the shared clock: fn(step, time) for every step, counted from t0,
  // so two grids with the same beat stay together whatever was skipped.
  function transport(beat,fn){
    let last=-1;
    setInterval(()=>{if(!live())return;const end=ctx.currentTime+.4;
      for(let k=Math.max(last+1,Math.ceil((ctx.currentTime+.05-t0)/beat));t0+k*beat<end;k++){fn(k,t0+k*beat);last=k}},90);
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
      // The music box on the carousel plays its waltz every so often, when the
      // town's own music is off (the two would play over each other).
      const tune=[72,76,79,76,74,77,81,77,76,79,84,79,77,74,71,72];
      scheduler(at=>{if(levels.music<=0)tune.forEach((n,i)=>struck(at+i*.32,NOTE(n),.035,'musicbox',{pan:-.3,wet:.5,bus:ambBus}));return at+tune.length*.32+14+Math.random()*10}).start();
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
      // It keeps the shared clock, so the moon's music can play along with it.
      transport(CALLIOPE.beat,(beat,at)=>{
        const bar=Math.floor(beat/CALLIOPE.bar),inBar=beat%CALLIOPE.bar,root=CALLIOPE.bass[bar%CALLIOPE.bass.length];
        if(inBar===0)osc(at,'triangle',NOTE(root),0,.05,.005,.28,{pan:-.2,wet:.6,bus:ambBus});
        else for(const n of [root+16,root+19])osc(at,'square',NOTE(n),0,.01,.005,.12,{pan:-.2,wet:.6,bus:ambBus});
        // With the moon's music playing, the calliope's own tune gives way to it.
        const m=levels.music>0?null:melody[beat%melody.length];
        if(m){const o=osc(at,'square',NOTE(m),0,.012,.01,.32,{pan:-.2,wet:.7,bus:ambBus});lfo(o.frequency,5.5,3)}
      });
      // Happy squeals from the rides.
      scheduler(at=>{const f=900+Math.random()*500,pan=Math.random()*1.6-.8;osc(at,'sine',f,f*1.6,.025,.08,.4,{pan,wet:.7,bus:ambBus});osc(at+.45,'sine',f*1.5,f*.9,.02,.05,.35,{pan,wet:.7,bus:ambBus});return at+4+Math.random()*7}).start();
      // A murmuring crowd.
      const crowd=loopNoise('bandpass',900,.9,.012);lfo(crowd.g.gain,.3,.006);lfo(crowd.f.frequency,.7,250);
      window.addEventListener('fair-burst',e=>api.boom(e.detail?.x??0));
    }};
  }

  function spookAmbience(){
    return {start(){
      // A howling wind that rises and falls, and waves slapping the piles.
      const wind=loopNoise('bandpass',420,2.2,.05);lfo(wind.g.gain,.09,.04);lfo(wind.f.frequency,.13,260);
      const swell=loopNoise('lowpass',300,.6,.05);lfo(swell.g.gain,.18,.035);
      // The owl: hoo... hoo-hoo.
      scheduler(at=>{
        for(const [d,len] of [[0,.5],[.75,.22],[1.05,.45]])osc(at+d,'sine',390,360,.035,.06,len,{pan:-.5,wet:.6,bus:ambBus});
        return at+11+Math.random()*10;
      }).start();
      // The ghost ship creaks at its moorings.
      scheduler(at=>{const f=180+Math.random()*120;hiss(at,'bandpass',f,9,.05,.08,.5,{pan:-.3,wet:.4,bus:ambBus},f*1.6);return at+5+Math.random()*7}).start();
      // Bats squeak overhead.
      scheduler(at=>{const pan=Math.random()*1.6-.8;for(let i=0;i<3;i++)osc(at+i*.07,'sine',5200+Math.random()*900,4300,.012,.003,.04,{pan,wet:.3,bus:ambBus});return at+3+Math.random()*6}).start();
      // A wolf, far away, once in a while.
      scheduler(at=>{
        const o=ctx.createOscillator(),g=env(at,.03,.6,2.8);o.type='sine';
        o.frequency.setValueAtTime(330,at);o.frequency.linearRampToValueAtTime(620,at+.9);o.frequency.linearRampToValueAtTime(560,at+2.2);o.frequency.linearRampToValueAtTime(380,at+3.2);
        lfo(o.frequency,5,8);o.connect(g);out(g,{pan:.6,wet:.9,bus:ambBus});o.start(at);o.stop(at+3.5);
        return at+38+Math.random()*30;
      }).start();
      // The ghost ship's cannons (Spökskeppet) go off with a dull bang.
      window.addEventListener('ship-cannon',e=>api.boom(e.detail?.x??0));
    }};
  }

  // --- Music. ---
  // A held note with a soft attack and release, for the flute and the theremin.
  function held(at,freq,vol,length,{type='sine',vibrato=0,glide=0,attack=.06,opts}={}){
    const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;
    o.frequency.setValueAtTime(freq*(1-glide),at);if(glide)o.frequency.exponentialRampToValueAtTime(freq,at+.14);
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(vol,at+attack);
    g.gain.setValueAtTime(vol,at+Math.max(attack,length-.1));g.gain.linearRampToValueAtTime(0,at+length+.18);
    if(vibrato){const l=ctx.createOscillator(),d=ctx.createGain();l.frequency.value=5;d.gain.setValueAtTime(0,at);d.gain.linearRampToValueAtTime(freq*vibrato,at+.45);l.connect(d);d.connect(o.frequency);l.start(at);l.stop(at+length+.25)}
    o.connect(g);out(g,opts);o.start(at);o.stop(at+length+.25);
  }
  function play(e,at,song){
    const length=e.steps*song.beat,f=NOTE(e.note),bus=musicBus;
    if(e.voice==='bass'){
      // Pizzicato in the clockwork town, a round soft bass elsewhere.
      if(theme==='clockwork'||theme==='halloween'){osc(at,'triangle',f,0,e.accent?.2:.15,.004,.2,{wet:.15,bus});osc(at,'sine',f*2,0,.05,.003,.1,{wet:.15,bus})}
      else osc(at,'sine',f,0,e.accent?.12:.09,.02,Math.min(.9,length),{wet:.1,bus});
    }
    // In Spökhamnen the stabs are a reedy organ.
    if(e.voice==='stab')e.notes.forEach(n=>theme==='halloween'?osc(at,'square',NOTE(n),0,.014,.01,.22,{wet:.5,bus}):osc(at,'triangle',NOTE(n),0,.035,.004,.16,{wet:.25,bus}));
    if(e.voice==='xylo'){struck(at,f,.06,'marimba',{wet:.35,bus});osc(at,'square',f*2,0,.006,.002,.05,{wet:.2,bus})}
    if(e.voice==='marimba')struck(at,f,e.accent?.06:.045,'marimba',{wet:.35,bus});
    if(e.voice==='musicbox')struck(at,f,.065,'musicbox',{wet:.4,bus});
    if(e.voice==='glass'){osc(at,'sine',f,0,e.accent?.035:.025,.01,.9,{wet:.7,bus});osc(at,'sine',f*2,0,.007,.01,.5,{wet:.7,bus})}
    if(e.voice==='flute')held(at,f,.05,length,{type:'triangle',vibrato:.005,attack:.07,opts:{wet:.4,bus}});
    if(e.voice==='theremin')held(at,f,.045,length,{vibrato:.012,glide:.03,attack:.15,opts:{wet:.75,bus}});
  }
  function music(song){transport(song.beat,(step,at)=>{if(levels.music>0)for(const e of eventsAt(song,step))play(e,at,song)})}

  return api;
}
