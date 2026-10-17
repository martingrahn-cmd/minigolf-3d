// The event bench (?qa in the address): a small panel to set off each of the
// game's set pieces on demand, to look them over one at a time. Nothing played
// here is saved as a score.
export const QA=typeof location!=='undefined'&&new URLSearchParams(location.search).has('qa');

const WORLDS=[['Urverket',1],['Molnskogen',7],['Månen',13]];

export function setupQA(game){
  const panel=document.createElement('div');panel.className='qa-panel';
  panel.innerHTML=`<strong>Händelser · hål ${game.hole}</strong>
    <div class="qa-row" data-group="sink"></div><div class="qa-row" data-group="lip"></div>
    <div class="qa-row" data-group="other"></div><div class="qa-row" data-group="world"></div>`;
  const add=(group,label,run)=>{const b=document.createElement('button');b.textContent=label;b.addEventListener('click',e=>{e.stopPropagation();game.prepare();run()});panel.querySelector(`[data-group=${group}]`).append(b)};
  add('sink','Sänk rakt',()=>game.roll(0,2.4));
  add('sink','Sänk från vänster',()=>game.roll(.25,2.6));
  add('sink','Sänk från höger',()=>game.roll(-.25,2.6));
  add('sink','Sänk långsamt',()=>game.roll(0,1.3,.9));
  add('lip','Boll på kanten',()=>game.lip(0));
  add('lip','På kanten, snett',()=>game.lip(.6));
  add('other','Fall utanför',()=>game.fall());
  add('other','Bara resultatkortet',()=>game.win());
  add('other','Nollställ',()=>{});
  for(const [name,hole] of WORLDS){const a=document.createElement('a');a.textContent=name;a.href=`?hole=${hole}&qa`;if(hole===game.hole)a.className='active';panel.querySelector('[data-group=world]').append(a)}
  document.body.append(panel);
}
