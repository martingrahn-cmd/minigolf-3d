import { LEVELS } from './levels.js';

// The finished round: three worlds with six holes each. A slot either points at a
// built level (by its internal `id`, which never changes so records and tuning stay
// put) or is a placeholder describing the hole that still has to be built.
export const WORLDS = [
  {
    key:'clockwork',name:'Urverkets stad',finale:'Urverkets final',
    tagline:'Mässing, trä och turkos filt. Läsbara maskiner och tajmning.',
    slots:[1,2,3,4,5,6],
  },
  {
    key:'forest',name:'Molnskogen',finale:'Molnskogens final',
    tagline:'Rosa molnhimmel, rotbroar, svampar och snidade ugglor.',
    slots:[14,15,16,17,18,19],
  },
  {
    key:'moon',name:'Månkarnevalen',finale:'Månkarnevalens final',
    tagline:'Ett övergivet tivoli mellan asteroider. Raketer, tält och violett rymd.',
    // Built holes reuse the prototypes' best ideas in new form: Dubbelstudsen's
    // pads, Frostfallet's slippery open edges, the harbour's flippers and Kanonkurvan's
    // cannon.
    slots:[20,21,22,23,24,25],
  },
  {
    // The Halloween special: the five early prototypes, rebuilt as a haunted
    // harbour. A world of its own, outside the campaign's stars and ending.
    key:'halloween',name:'Spökhamnen',finale:'Spökhamnens final',special:true,label:'HALLOWEEN',
    tagline:'Fullmåne, dimma och pumplyktor i en hemsökt hamn.',
    slots:[12,11,10,13,9,{name:'Spökskeppet',idea:'Final: ombord på spökskeppet, med kanon och rangliga plankor'}],
  },
];

// The campaign is the three worlds of the 18-hole round; special worlds stand beside it.
export const isCampaignSlot=slot=>!slot.world.special;

// The early prototypes are now Spökhamnen's holes. Old ?proto= links still find them.
export const PROTOTYPES = [];
const LEGACY_PROTOTYPES={kanonkurvan:9,dubbelstudsen:10,vippvarvet:11,neonslussen:12,frostfallet:13};

const levelById=id=>LEVELS.find(level=>level.id===id);

export const ROUND = WORLDS.flatMap((world,w)=>world.slots.map((slot,i)=>{
  const hole=w*6+i+1;
  const base={hole,world,finale:i===world.slots.length-1};
  return typeof slot==='number'?{...base,level:levelById(slot)}:{...base,placeholder:slot};
}));

export const holeLabel=hole=>String(hole).padStart(2,'0');
export const builtCount=world=>ROUND.filter(slot=>slot.world===world&&slot.level).length;
export const slotForLevel=level=>ROUND.find(slot=>slot.level===level);
export const prototypeForLevel=level=>PROTOTYPES.find(p=>p.id===level.id);

export const CAMPAIGN = ROUND.filter(isCampaignSlot);

// Next playable hole after `hole`, plus the placeholders skipped on the way. The
// campaign and a special world each run on their own.
export function nextInRound(hole){
  const skipped=[],from=ROUND.find(s=>s.hole===hole),own=from?isCampaignSlot(from):true;
  for(const slot of ROUND.filter(s=>s.hole>hole&&isCampaignSlot(s)===own)){
    if(slot.level)return {slot,skipped};
    skipped.push(slot);
  }
  return {slot:null,skipped};
}

// Resolve the page URL: `?hole=N` plays round hole N, `?proto=slug` plays a
// prototype. Anything else (no parameter, or a hole that isn't built) opens the
// main menu, with hole 1 as the backdrop.
export function resolveSelection(search=''){
  const params=new URLSearchParams(search);
  const legacy=ROUND.find(s=>s.level&&s.level.id===LEGACY_PROTOTYPES[params.get('proto')]);
  if(legacy)return {level:legacy.level,slot:legacy,menu:false};
  const hole=Number(params.get('hole'));
  const slot=ROUND.find(s=>s.hole===hole);
  if(slot?.level)return {level:slot.level,slot,menu:false};
  return {level:ROUND[0].level,slot:ROUND[0],menu:true,missing:slot?.placeholder?slot:null};
}
