// The 31 trophies, to the GameVolt standard (as in GameVolt's other games): 15
// bronze for natural play, 10 silver for skill and dedication, 5 gold for the
// hardcore, and the platinum for having all the others.
//
// The core is pure: play events update a bag of numbers (`onEvent`), and
// `evaluate` reads those and a few facts from the saved records (worlds
// cleared, stars) and says what has been newly earned. Everything that
// touches localStorage, the GameVolt SDK or the screen sits below it, guarded,
// so the game plays the same with or without GameVolt around it.
//
// Names and descriptions are Swedish source text, translated like the rest
// of the game (src/i18n.js); GameVolt's own list is exported in English by
// scripts/gamevolt-export.mjs.
import { WORLDS, ROUND, CAMPAIGN } from './round.js';
import { worldProgress, campaignProgress, STARS_PER_HOLE } from './progress.js';

export const GAME_ID='mini-mayhem';

// `form` is the object on the plinth (blender/trophies.py renders each form in each tier's metal).
export const TROPHIES=[
  // ---- bronze (15): natural play ----
  {id:'first_hole',form:'ball',name:'I hål!',desc:'Sänk bollen för första gången',icon:'⛳',tier:'bronze',cond:s=>s.holes>=1},
  {id:'first_par',form:'flag',name:'På par',desc:'Klara ett hål på par eller bättre',icon:'🏌️',tier:'bronze',cond:s=>s.pars>=1},
  {id:'first_birdie',form:'star',name:'Birdie!',desc:'Gör en birdie, ett slag under par',icon:'🐦',tier:'bronze',cond:s=>s.birdies>=1},
  {id:'perfect_hit',form:'putter',name:'Mitt i prick',desc:'Träffa mitt i det gröna fältet',icon:'🎯',tier:'bronze',cond:s=>s.perfect_hits>=1},
  {id:'putt_in',form:'putter',name:'Närputten',desc:'Sänk bollen med en närputt',icon:'🕳️',tier:'bronze',cond:s=>s.putts_in>=1},
  {id:'cannon',form:'rocket',name:'Kanonkula',desc:'Flyg med en kanon',icon:'💥',tier:'bronze',cond:s=>s.cannons>=1},
  {id:'tube',form:'gear',name:'Rörpost',desc:'Åk genom ett rör',icon:'📮',tier:'bronze',cond:s=>s.tubes>=1},
  {id:'root_loop',form:'leaf',name:'Runt i roten',desc:'Ta dig hela vägen runt Rotvolten',icon:'🌀',tier:'bronze',cond:s=>s.loops>=1},
  {id:'ferris',form:'star',name:'Gondoljär',desc:'Åk pariserhjulet upp till greenen',icon:'🎡',tier:'bronze',cond:s=>s.ferris>=1},
  {id:'rescue',form:'ball',name:'Hjälp på traven',desc:'Få bollen inknackad från kanten',icon:'🐾',tier:'bronze',cond:s=>s.rescues>=1},
  {id:'splash',form:'flag',name:'Plums!',desc:'Få ditt första pliktslag',icon:'💦',tier:'bronze',cond:s=>s.penalties>=1},
  {id:'strokes_100',form:'putter',name:'Hundra slag',desc:'Slå 100 slag',icon:'💯',tier:'bronze',cond:s=>s.strokes>=100},
  {id:'clockwork_done',form:'gear',name:'Urmakarens lärling',desc:'Klara alla hål i Urverkets stad',icon:'⚙️',tier:'bronze',cond:(s,f)=>f.worldsDone.includes('clockwork')},
  {id:'forest_done',form:'leaf',name:'Skogsvandrare',desc:'Klara alla hål i Molnskogen',icon:'🌳',tier:'bronze',cond:(s,f)=>f.worldsDone.includes('forest')},
  {id:'friends',form:'ball',name:'Sällskapsspel',desc:'Spela ett hål i en match med vänner',icon:'👋',tier:'bronze',cond:s=>s.match_holes>=1},
  // ---- silver (10): skill and dedication ----
  {id:'moon_done',form:'rocket',name:'Rymdturist',desc:'Klara alla hål i Månkarnevalen',icon:'🚀',tier:'silver',cond:(s,f)=>f.worldsDone.includes('moon')},
  {id:'halloween_done',form:'pumpkin',name:'Spökjägare',desc:'Klara alla hål i Spökhamnen',icon:'🎃',tier:'silver',cond:(s,f)=>f.worldsDone.includes('halloween')},
  {id:'eagle',form:'star',name:'Örnöga',desc:'Gör en eagle, två slag under par',icon:'🦅',tier:'silver',cond:s=>s.eagles>=1},
  {id:'birdies_10',form:'flag',name:'Fågelskådare',desc:'Gör 10 birdies',icon:'🔭',tier:'silver',cond:s=>s.birdies>=10},
  {id:'hat_trick',form:'star',name:'Hattrick',desc:'Gör birdie eller bättre på tre hål i rad',icon:'🎩',tier:'silver',cond:s=>s.best_streak>=3},
  {id:'strike',form:'ball',name:'Strike!',desc:'Fäll alla käglor i Skybowling',icon:'🎳',tier:'silver',cond:s=>s.strikes>=1},
  {id:'under_par_run',form:'medal',name:'Under par',desc:'Spela en hel värld i rad under par',icon:'📉',tier:'silver',cond:s=>s.under_par_runs>=1},
  {id:'world_stars',form:'medal',name:'Stjärnvärld',desc:'Tre stjärnor på varje hål i en värld',icon:'🌟',tier:'silver',cond:(s,f)=>f.starWorlds>=1},
  {id:'stars_36',form:'star',name:'Halvvägs till himlen',desc:'Samla 36 stjärnor',icon:'⭐',tier:'silver',cond:(s,f)=>f.stars>=36},
  {id:'match_win',form:'cup',name:'Matchvinnare',desc:'Vinn en match mot vänner',icon:'🥇',tier:'silver',cond:s=>s.match_wins>=1},
  // ---- gold (5): for the hardcore ----
  {id:'hole_in_one',form:'ball',name:'Hole in one',desc:'Sänk bollen på första slaget',icon:'💫',tier:'gold',cond:s=>s.aces>=1},
  {id:'campaign',form:'cup',name:'Turneringsvinnare',desc:'Klara alla 18 hålen i kampanjen',icon:'🏆',tier:'gold',cond:(s,f)=>f.campaign},
  {id:'perfect_run',form:'crown',name:'Felfri värld',desc:'Spela en hel värld i rad med tre stjärnor på varje hål',icon:'✨',tier:'gold',cond:s=>s.perfect_runs>=1},
  {id:'all_stars',form:'crown',name:'Stjärnhimmel',desc:'Samla alla 72 stjärnor',icon:'🌌',tier:'gold',cond:(s,f)=>f.stars>=f.maxStars},
  {id:'eagles_3',form:'medal',name:'Örnarnas kung',desc:'Gör tre eagles',icon:'👑',tier:'gold',cond:s=>s.eagles>=3},
  // ---- platinum (1): every other trophy ----
  {id:'master',form:'gem',name:'Mini Mayhem-mästare',desc:'Lås upp alla 30 andra troféer',icon:'💎',tier:'platinum',cond:null},
];

export const TIERS=['bronze','silver','gold','platinum'];
export const trophyById=id=>TROPHIES.find(t=>t.id===id)||null;
/** The trophy as an object on its plinth: one picture per form and tier. A locked one is the same picture, darkened. */
export const trophyArt=t=>`trophies/${t.form}-${t.tier}.webp`;

const DEFAULTS={
  holes:0,pars:0,birdies:0,eagles:0,aces:0,streak:0,best_streak:0,strokes:0,
  perfect_hits:0,putts_in:0,cannons:0,tubes:0,loops:0,ferris:0,rescues:0,penalties:0,strikes:0,
  under_par_runs:0,perfect_runs:0,match_holes:0,match_wins:0,
};
export const freshStats=()=>({...DEFAULTS});
/** A saved bag of stats, field by field: anything wrong-typed is reset. */
export function cleanStats(raw){
  const s=freshStats();
  if(!raw||typeof raw!=='object')return s;
  for(const k of Object.keys(DEFAULTS))if(Number.isFinite(raw[k])&&raw[k]>=0)s[k]=raw[k];
  return s;
}

/**
 * Fold one event into the stats.
 *   hole   {strokes, par}            — the player holed out (not someone they watch)
 *   run    {strokes, par, perfect}   — a world played in a row, finished
 *   stroke, perfect, putt, cannon, tube, loop, ferris, rescue, penalty, strike,
 *   matchHole, matchWin              — moments in play
 */
export function onEvent(s,name,d={}){
  switch(name){
    case 'hole':{
      const under=d.par-d.strokes;
      s.holes++;
      if(under>=0)s.pars++;
      if(under>=1){s.birdies++;s.streak++;s.best_streak=Math.max(s.best_streak,s.streak)}else s.streak=0;
      if(under>=2)s.eagles++;
      if(d.strokes===1)s.aces++;
      if(d.putt)s.putts_in++;
      break;
    }
    case 'run':
      if(d.strokes<d.par)s.under_par_runs++;
      if(d.perfect)s.perfect_runs++;
      break;
    case 'stroke':s.strokes++;break;
    case 'perfect':s.perfect_hits++;break;
    case 'cannon':s.cannons++;break;
    case 'tube':s.tubes++;break;
    case 'loop':s.loops++;break;
    case 'ferris':s.ferris++;break;
    case 'rescue':s.rescues++;break;
    case 'penalty':s.penalties++;break;
    case 'strike':s.strikes++;break;
    case 'matchHole':s.match_holes++;break;
    case 'matchWin':s.match_wins++;break;
    default:break;
  }
  return s;
}

/** What the trophies need to know from the saved records (each hole's best score). */
export function facts(storage){
  const worlds=WORLDS.map(world=>worldProgress(storage,world));
  return {
    worldsDone:worlds.filter(w=>w.total&&w.played===w.total).map(w=>w.world.key),
    starWorlds:worlds.filter(w=>w.max&&w.stars===w.max).length,
    stars:worlds.reduce((n,w)=>n+w.stars,0),
    maxStars:ROUND.filter(slot=>slot.level).length*STARS_PER_HOLE,
    campaign:CAMPAIGN.some(slot=>slot.level)&&campaignProgress(storage).complete,
  };
}

/** Ids newly earned, given the stats, the facts and what is held. */
export function evaluate(s,f,unlocked=[]){
  const have=new Set(unlocked),earned=[];
  for(const t of TROPHIES){
    if(have.has(t.id)||!t.cond)continue;
    if(t.cond(s,f)){earned.push(t.id);have.add(t.id)}
  }
  if(!have.has('master')&&TROPHIES.filter(t=>t.tier!=='platinum').every(t=>have.has(t.id)))earned.push('master');
  return earned;
}

/* -------------------------------------------------------- in the browser */

const LS_STATS='minimayhem-trophy-stats-v1',LS_UNLOCKED='minimayhem-trophies-v1';
const hasDom=typeof document!=='undefined'&&typeof localStorage!=='undefined';
const sdk=()=>(typeof window!=='undefined'&&window.GameVolt)||null;

export function loadStats(){
  if(!hasDom)return freshStats();
  try{return cleanStats(JSON.parse(localStorage.getItem(LS_STATS)||'null'))}catch{return freshStats()}
}
function saveStats(s){if(hasDom)try{localStorage.setItem(LS_STATS,JSON.stringify(s))}catch{/* private mode */}}
export function getUnlocked(){
  if(!hasDom)return [];
  try{const a=JSON.parse(localStorage.getItem(LS_UNLOCKED)||'[]');return Array.isArray(a)?a.filter(id=>trophyById(id)):[]}catch{return []}
}
function saveUnlocked(a){if(hasDom)try{localStorage.setItem(LS_UNLOCKED,JSON.stringify(a))}catch{/* private mode */}}

/** Tell the GameVolt player page, when the game runs in its iframe. */
export function gvPost(action,payload){
  if(typeof window==='undefined'||window.parent===window)return;
  try{window.parent.postMessage({type:'gamevolt',action,gameId:GAME_ID,payload:payload||{}},'*')}catch{/* cross-origin */}
}

let toastHook=null;
/** The game's own toast, for when GameVolt's is not there. */
export function setToast(toast){toastHook=toast}

function unlock(id,silent){
  const held=getUnlocked();
  if(held.includes(id))return false;
  held.push(id);saveUnlocked(held);
  const GV=sdk();
  // Earned on another device already: keep it, but do not cheer twice.
  const cloudHas=!!GV?.achievements?.isUnlocked?.(id);
  if(GV?.achievements&&!cloudHas){try{GV.achievements.unlock(id)}catch{/* offline: the SDK keeps it */}}
  const t=trophyById(id);
  if(!silent&&!cloudHas&&t){
    gvPost('achievement',{id,name:t.name});
    // GameVolt's own toast where its SDK has one; the game's otherwise.
    if(GV?.ui?.achievementToast)GV.ui.achievementToast({icon:t.icon,name:t.name,tier:t.tier});
    else toastHook?.(t);
  }
  return true;
}

/** Fold an event in and unlock whatever it earned. Returns the new ids. */
export function event(name,data){
  if(!hasDom)return [];
  const s=onEvent(loadStats(),name,data);saveStats(s);
  return check(false,s);
}
/** Unlock what the stats and records already earn: silently on start, so a save
 *  from before the trophies existed gets its due without a parade. */
export function check(silent=false,s=loadStats()){
  if(!hasDom)return [];
  const earned=evaluate(s,facts(localStorage),getUnlocked());
  earned.forEach(id=>unlock(id,silent));
  return earned;
}

/** Pull trophies earned on another device into this one, quietly. */
function backfill(){
  const GV=sdk();
  if(!GV?.achievements?.getUnlockedIds)return;
  GV.achievements.getUnlockedIds().then(ids=>{
    const held=getUnlocked(),merged=[...new Set([...held,...Array.from(ids||[]).filter(id=>trophyById(id))])];
    if(merged.length!==held.length)saveUnlocked(merged);
  }).catch(()=>{});
}

/** Fetch the GameVolt SDK, only where it lives: on GameVolt itself. Anywhere
 *  else (GitHub Pages, a checkout) the game runs on its own. */
export function loadSDK(){
  if(typeof window==='undefined'||window.GameVolt)return Promise.resolve(!!sdk());
  if(!/(^|\.)gamevolt\.io$/.test(location.hostname))return Promise.resolve(false);
  return new Promise(resolve=>{
    const tag=document.createElement('script');tag.src='/sdk/gamevolt.js';
    tag.onload=()=>resolve(!!sdk());tag.onerror=()=>resolve(false);
    document.head.appendChild(tag);
  });
}

/** Hook into GameVolt when it is there: guest trophies follow the player into
 *  the cloud on sign-in, and the cloud's come back down. */
export function initSDK(){
  const GV=sdk();
  if(!GV)return;
  try{
    GV.init(GAME_ID);
    GV.save.registerMigration({
      keys:[LS_STATS,LS_UNLOCKED],
      merge:(local,cloud)=>{
        // Counts only ever grow: keep the larger of each.
        let ls={};try{ls=JSON.parse(local[LS_STATS]||'{}')}catch{/* keep {} */}
        const a=cleanStats(ls),b=cleanStats(cloud),out=freshStats();
        for(const k of Object.keys(out))out[k]=Math.max(a[k],b[k]);
        return out;
      },
      getAchievements:local=>{
        try{const ids=JSON.parse(local[LS_UNLOCKED]||'[]');return Array.isArray(ids)?ids.map(id=>({id,unlocked_at:Date.now()})):[]}catch{return []}
      },
      getScores:()=>[],
    });
    GV.auth.onStateChange(user=>{if(user)backfill()});
  }catch{/* the game does not depend on it */}
}
