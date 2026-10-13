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
    slots:[20,21,
      {name:'Planetvallen',idea:'Flipperstötarna från Neonhamnen blir planeter som studsar bollen runt en asteroid.'},
      {name:'Kanonkometen',idea:'Kanonen från Kanonkurvan som raketkanon med svängande sikte och flera landningshyllor.'},
      {name:'Pariserhjulet',idea:'Pariserhjulsfärja som bär bollen mellan avsatser. Tajma när du kliver av.'},
      {name:'Månraketen',idea:'Final och set piece vid den trasiga månraketen: kanon och låg gravitation i kombination.'},
    ],
  },
];

// Older prototypes outside the 18-hole round. Still playable, waiting to be rebuilt
// into one of the worlds (their ideas may be reused, e.g. the cannon on the moon).
export const PROTOTYPES = [
  {id:9,slug:'kanonkurvan',world:'Solskensöarna'},
  {id:10,slug:'dubbelstudsen',world:'Neonhamnen'},
  {id:11,slug:'vippvarvet',world:'Neonhamnen'},
  {id:12,slug:'neonslussen',world:'Neonhamnen'},
  {id:13,slug:'frostfallet',world:'Neonhamnen'},
];

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

// Next playable hole after `hole`, plus the placeholders skipped on the way.
export function nextInRound(hole){
  const skipped=[];
  for(const slot of ROUND.filter(s=>s.hole>hole)){
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
  const proto=PROTOTYPES.find(p=>p.slug===params.get('proto'));
  if(proto)return {level:levelById(proto.id),prototype:proto,menu:false};
  const hole=Number(params.get('hole'));
  const slot=ROUND.find(s=>s.hole===hole);
  if(slot?.level)return {level:slot.level,slot,menu:false};
  return {level:ROUND[0].level,slot:ROUND[0],menu:true,missing:slot?.placeholder?slot:null};
}
