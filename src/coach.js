// The guided first round: short tips that turn up the first time each step of a
// shot happens, beside the control they talk about, and go away as soon as the
// player has done the thing. Each tip is shown once; the help panel can bring
// them back.
const KEY='minimayhem-coach';

export const TIPS={
  aim:{text:'Dra över banan för att sikta. Prickarna visar vart bollen går.',anchor:'scene'},
  power:{text:'Kraftmätaren går fram och tillbaka. Tryck igen när kraften känns rätt.',anchor:'meter'},
  accuracy:{text:'Nu sveper nålen. Tryck när den är i det gröna fältet, så går slaget rakt.',anchor:'meter'},
  overview:{text:'Översikt visar hela banan. Där kan du trycka precis dit du vill sikta.',anchor:'cameraButton',timeout:7},
  putt:{text:'Nära hålet räknar mätaren i meter. Tryck när rulllängden stämmer, och pricka sedan grönt.',anchor:'meter'},
};

// Which tip (if any) should show now, given what has been seen and the moment.
export function nextTip(seen,moment){
  const {phase,putting,shots}=moment;
  const fresh=key=>!seen.has(key);
  if(phase==='idle'&&putting&&fresh('putt'))return 'putt';
  if(phase==='idle'&&shots===0&&fresh('aim'))return 'aim';
  if(phase==='power'&&fresh('power'))return putting?(fresh('putt')?'putt':null):'power';
  if(phase==='accuracy'&&fresh('accuracy'))return 'accuracy';
  if(phase==='idle'&&shots>0&&fresh('overview')&&!putting)return 'overview';
  return null;
}

export function createCoach(storage,$){
  let seen;
  try{seen=new Set(JSON.parse(storage.getItem(KEY)||'[]'))}catch{seen=new Set()}
  const save=()=>{try{storage.setItem(KEY,JSON.stringify([...seen]))}catch{}};
  const bubble=document.createElement('div');bubble.className='coach';bubble.hidden=true;bubble.setAttribute('role','status');
  bubble.innerHTML='<span class="coach-text"></span><button class="coach-ok" aria-label="Okej">Okej</button>';
  document.body.append(bubble);
  let current=null,shownAt=0;
  const done=key=>{if(!key)return;seen.add(key);save();if(current===key)hide()};
  function hide(){bubble.hidden=true;current=null}
  bubble.querySelector('.coach-ok').addEventListener('click',e=>{e.stopPropagation();done(current)});
  function place(){
    const tip=TIPS[current],el=tip.anchor==='scene'?null:$(tip.anchor),r=el?.getBoundingClientRect();
    bubble.dataset.anchor=tip.anchor;
    if(!r||r.width===0){bubble.style.left='50%';bubble.style.top='42%';bubble.style.bottom='';bubble.classList.remove('below');return}
    const x=Math.min(innerWidth-16,Math.max(16,r.left+r.width/2));
    bubble.style.left=`${x}px`;
    // Above the control when there is room, otherwise below it.
    if(r.top>140){bubble.style.top='';bubble.style.bottom=`${innerHeight-r.top+14}px`;bubble.classList.remove('below')}
    else{bubble.style.bottom='';bubble.style.top=`${r.bottom+14}px`;bubble.classList.add('below')}
  }
  return {
    // Called every frame with the moment of play; shows, moves or retires tips.
    update(moment,now){
      if(!moment.enabled){if(!bubble.hidden)hide();return}
      // A tip whose step has been done retires for good.
      if(current==='aim'&&(moment.aimMoved||moment.phase!=='idle'))done('aim');
      if(current==='power'&&moment.phase==='accuracy')done('power');
      if(current==='accuracy'&&moment.phase!=='accuracy')done('accuracy');
      if(current==='putt'&&moment.phase==='moving')done('putt');
      if(current==='overview'&&(moment.overview||now-shownAt>TIPS.overview.timeout||moment.phase!=='idle'))done('overview');
      const key=nextTip(seen,moment);
      if(key&&key!==current){current=key;shownAt=now;bubble.querySelector('.coach-text').textContent=TIPS[key].text;bubble.hidden=false}
      // A tip that no longer fits the moment steps aside (it comes back when it does).
      if(!key&&current)hide();
      if(current)place();
    },
    reset(){seen.clear();save();hide()},
  };
}
