// Playing with friends online: the lobby, the room across page loads, the live
// scoreboard and moving on together. The rules are in room.js and the network in
// net.js; the 3D ghost balls in ghost-balls.js. The room lives in the address
// (`?rum=ABCD`) and in sessionStorage, so each hole can be its own page load.
import { connect, multiplayerAvailable, transportName } from './net.js';
import { roomCode, normalizeCode, cleanName, seatPlayers, electHost, createMatch, mergeScores, waitingFor, holeDone, advance, standings, MAX_PLAYERS, STROKE_CAP } from './room.js';

const SESSION_KEY='minimayhem-room',NAME_KEY='minimayhem-player-name';
const NEXT_DELAY=4;
const hex=c=>`#${c.toString(16).padStart(6,'0')}`;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const now=()=>Date.now()/1000;
export const roomInAddress=()=>typeof location!=='undefined'?normalizeCode(new URLSearchParams(location.search).get('rum')||''):'';

function loadSession(code){
  try{const s=JSON.parse(sessionStorage.getItem(SESSION_KEY));return s&&s.code===code?s:null}catch{return null}
}
function saveSession(s){try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(s))}catch{}}
function savedName(){try{return localStorage.getItem(NAME_KEY)||''}catch{return ''}}

// `game` gives the controller what it needs from the page:
//   {$, toast, hydrateIcons, worlds, round, hole, pars(match)->[par…], onRemoteBall(player,ball), onRemoteGone(id)}
export function createMultiplayer(game){
  const {$,toast}=game;
  const code=roomInAddress();
  let session=code?loadSession(code):null,link=null,players=[],lastSeen={},advanceAt=null,lastBall=0,lastSent='';
  // In a match on this page's hole: then the hole is played for the room.
  const inMatch=()=>!!(session?.match&&game.hole&&session.match.holes.includes(game.hole));
  const me=()=>session?.me;
  const isHost=()=>electHost(players)?.id===me()?.id;
  const holeUrl=(match)=>`?hole=${match.holes[match.index]}&rum=${session.code}`;
  const save=()=>saveSession(session);

  // --- The lobby dialog (menu → Spela med vänner). ---
  function renderLobby(){
    const panel=$('mpPanel');
    if(!session||!link){
      panel.dataset.view='start';
      $('mpName').value=$('mpName').value||savedName();
      $('mpCode').value=$('mpCode').value||code;
      return;
    }
    panel.dataset.view='room';
    const seated=seatPlayers(players),mine=seated.find(p=>p.id===me().id),host=seated[0];
    $('mpRoomCode').textContent=session.code;
    $('mpPlayers').innerHTML=seated.map(p=>`<li class="${p.seat===null?'mp-extra':''}"><i style="background:${p.color!==null?hex(p.color):'#888'}"></i><b>${escape(p.name)}</b>${p.id===host.id?'<span class="mp-host">värd</span>':''}${p.id===me().id?'<span class="mp-you">du</span>':''}${p.seat===null?'<small>fullt – tittar på</small>':''}</li>`).join('');
    const full=mine?.seat===null;
    $('mpFull').hidden=!full;
    $('mpHostControls').hidden=!isHost();$('mpGuestWait').hidden=isHost()||full;
    $('mpStart').disabled=!isHost()||seated.filter(p=>p.seat!==null).length<1;
    $('mpTransport').textContent=transportName()==='local'?'Lokalt läge: bara flikar i den här webbläsaren':'';
  }
  function worldChoices(){
    $('mpWorlds').innerHTML=game.worlds.map((w,i)=>{
      const holes=game.round.filter(s=>s.world===w&&s.level).length;
      return `<label class="mp-world" data-world="${w.key}"><input type="radio" name="mpWorld" value="${w.key}"${i===0?' checked':''}><span><b>${w.name}</b><small>${holes} hål</small></span></label>`;
    }).join('');
  }
  async function join(roomCodeValue,name){
    const c=normalizeCode(roomCodeValue);if(c.length!==4){toast('Rumskoden har fyra bokstäver',1800);return}
    const clean=cleanName(name);try{localStorage.setItem(NAME_KEY,clean)}catch{}
    const old=loadSession(c);
    session=old?{...old,me:{...old.me,name:clean}}:{code:c,me:{id:Math.random().toString(36).slice(2,10),name:clean,joinedAt:Date.now()},match:null,scores:{}};
    save();history.replaceState(null,'',`?rum=${c}`);
    $('mpPanel').dataset.view='connecting';
    try{await open()}catch(error){$('mpPanel').dataset.view='start';toast(error.message||'Kunde inte ansluta',2400);return}
    renderLobby();
  }
  function startMatch(){
    const key=document.querySelector('input[name=mpWorld]:checked')?.value,world=game.worlds.find(w=>w.key===key);if(!world)return;
    const holes=game.round.filter(s=>s.world===world&&s.level).map(s=>s.hole);
    session.match=createMatch(world.key,holes,seatPlayers(players).filter(p=>p.seat!==null));session.scores={};save();
    link.send('match',session.match);
    location.href=holeUrl(session.match);
  }
  async function share(){
    const url=`${location.origin}${location.pathname}?rum=${session.code}`;
    try{if(navigator.share){await navigator.share({title:'Mini Mayhem',text:`Spela minigolf med mig! Rumskod ${session.code}`,url});return}}catch{return}
    try{await navigator.clipboard.writeText(url);toast('Länken är kopierad',1500)}catch{toast(url,4000)}
  }
  function leave(){
    link?.close();link=null;try{sessionStorage.removeItem(SESSION_KEY)}catch{}
    session=null;location.href='./';
  }

  // --- The room: messages, presence and moving on. ---
  async function open(){
    link=await connect(session.code,session.me);
    link.onPlayers(list=>{
      players=list;const t=now();for(const p of list)lastSeen[p.id]=t;
      if(!$('mpPanel').hidden&&$('mpPanel').open)renderLobby();
      renderBoard();check();
    });
    link.on('hello',()=>{if(isHost()&&session.match)link.send('match',session.match);sendScores()});
    link.on('match',match=>{
      const fresh=match.id!==session.match?.id;
      session.match=match;if(fresh)session.scores={};save();
      if(fresh)endWorldRunHook();
      if(match.finished){if(inMatch())showResults();return}
      if(game.hole!==match.holes[match.index])location.href=holeUrl(match);
      else{advanceAt=null;renderBoard()}
    });
    link.on('scores',(list,from)=>{session.scores=mergeScores(session.scores,from,list);lastSeen[from]=now();save();renderBoard();check()});
    link.on('ball',(ball,from)=>{lastSeen[from]=now();game.onRemoteBall?.(playerFor(from),ball);liveStrokes[from]=ball.strokes;renderBoard()});
    link.send('hello',{});sendScores();
  }
  const liveStrokes={};
  const endWorldRunHook=()=>game.onMatchStart?.();
  const playerFor=id=>session.match?.players.find(p=>p.id===id)??seatPlayers(players).find(p=>p.id===id);
  const myScores=()=>session.scores[me().id]||[];
  function sendScores(){if(link&&session?.match)link.send('scores',myScores())}

  // Everyone keeps an eye on whether the hole is done; the host moves the room on.
  function check(){
    if(!inMatch()||session.match.finished)return;
    const match=session.match;
    if(game.hole!==match.holes[match.index])return;
    if(!holeDone(match,session.scores,lastSeen,now())){advanceAt=null;return}
    if(advanceAt===null)advanceAt=now()+NEXT_DELAY;
    renderWait();
    if(now()>=advanceAt&&isHost()){
      const next=advance(match);session.match=next;save();link.send('match',next);
      if(next.finished)showResults();else location.href=holeUrl(next);
    }
  }

  // --- On the course: scoreboard, waiting card and results. ---
  function renderBoard(){
    if(!inMatch())return;
    const match=session.match,rows=standings(match,session.scores,game.pars(match));
    $('mpBoard').hidden=false;
    $('mpBoardTitle').textContent=`RUM ${session.code} · HÅL ${match.index+1}/${match.holes.length}`;
    $('mpBoardRows').innerHTML=rows.map(r=>{
      const done=Number.isFinite(session.scores[r.player.id]?.[match.index]),here=r.player.id===me().id||now()-(lastSeen[r.player.id]??-1e9)<15;
      const now_=done?`✓ ${session.scores[r.player.id][match.index]}`:here?`${(r.player.id===me().id?game.strokes?.():liveStrokes[r.player.id])??0} slag`:'borta';
      const par=r.toPar===0?'±0':r.toPar>0?`+${r.toPar}`:r.toPar;
      return `<li class="${done?'done':''}${here?'':' away'}"><i style="background:${hex(r.player.color)}"></i><b>${escape(r.player.name)}</b><span>${now_}</span><em>${par}</em></li>`;
    }).join('');
    renderWait();
  }
  function renderWait(){
    if(!inMatch())return;
    const match=session.match,mineDone=Number.isFinite(myScores()[match.index]);
    $('mpWait').hidden=!mineDone;if(!mineDone)return;
    const waiting=waitingFor(match,session.scores,lastSeen,now());
    $('mpWaitText').textContent=waiting.length?`Väntar på ${waiting.map(p=>p.name).join(', ')}…`:
      match.index+1>=match.holes.length?'Alla i hål! Resultatet kommer…':`Alla i hål! Nästa hål om ${Math.max(0,Math.ceil((advanceAt??now()+NEXT_DELAY)-now()))} s`;
    $('mpWaitBoard').innerHTML=$('mpBoardRows').innerHTML;
  }
  function showResults(){
    const match=session.match,rows=standings(match,session.scores,game.pars(match)),medal=['🥇','🥈','🥉',''];
    $('mpResultRows').innerHTML=rows.map(r=>{const par=r.toPar===0?'±0':r.toPar>0?`+${r.toPar}`:r.toPar;
      return `<li><span class="mp-place">${medal[r.place-1]??''}${r.place}</span><i style="background:${hex(r.player.color)}"></i><b>${escape(r.player.name)}</b><span>${r.total} slag</span><em>${par}</em></li>`}).join('');
    const winners=rows.filter(r=>r.place===1).map(r=>r.player.name);
    $('mpResultTitle').innerHTML=winners.length>1?'DELAD<br><em>SEGER!</em>':`${escape(winners[0])}<br><em>VANN!</em>`;
    const world=game.worlds.find(w=>w.key===match.world);$('mpResultWorld').textContent=`${world?.name??''} · ${match.holes.length} hål`;
    $('win').classList.add('hidden');$('mpResults').classList.remove('hidden');
  }

  // --- Wiring. ---
  $('mpCreate').addEventListener('click',()=>join(roomCode(),$('mpName').value));
  $('mpJoin').addEventListener('click',()=>join($('mpCode').value,$('mpName').value));
  $('mpCode').addEventListener('input',e=>{e.target.value=normalizeCode(e.target.value)});
  $('mpStart').addEventListener('click',startMatch);
  $('mpShare').addEventListener('click',share);
  $('mpLeave').addEventListener('click',leave);
  $('mpClose').addEventListener('click',()=>$('mpPanel').close());
  $('mpResultsAgain').addEventListener('click',()=>{location.href=`./?rum=${session.code}`});
  $('mpResultsLeave').addEventListener('click',leave);
  $('mpLeaveMatch').addEventListener('click',leave);

  return {
    available:multiplayerAvailable(),
    inMatch,
    code:()=>session?.code,
    match:()=>session?.match,
    // On page load: rejoin the room if the address has one.
    async start(){
      worldChoices();
      if(!code)return;
      if(!session){if(!game.hole)this.openLobby();return}
      try{await open()}catch(error){toast(error.message||'Kunde inte ansluta till rummet',2600);return}
      if(inMatch()){
        const t=now();for(const p of session.match.players)lastSeen[p.id]??=t;
        renderBoard();
        if(session.match.finished)showResults();
        setInterval(()=>{check();renderBoard()},1000);
      }else if(!game.hole)this.openLobby();
    },
    openLobby(){renderLobby();if(!$('mpPanel').open)$('mpPanel').showModal()},
    // The local ball, every frame; sent about ten times a second while it changes.
    reportBall(ball){
      if(!link||!inMatch())return;const t=performance.now();if(t-lastBall<100)return;
      const key=`${ball.x.toFixed(2)},${ball.y.toFixed(2)},${ball.z.toFixed(2)},${ball.strokes},${ball.hidden}`;
      if(key===lastSent&&t-lastBall<2000)return;
      lastBall=t;lastSent=key;link.send('ball',ball);
    },
    // The local player holed out (or hit the cap): record it for everyone.
    finishHole(strokes){
      if(!inMatch())return;const list=[...myScores()];list[session.match.index]=Math.min(strokes,STROKE_CAP);
      session.scores=mergeScores(session.scores,me().id,list);save();sendScores();renderBoard();check();
    },
    holeLabel(){const m=session.match;return `RUM ${session.code} · HÅL ${m.index+1} AV ${m.holes.length}`},
    refresh:renderBoard,
  };
}
export { MAX_PLAYERS, STROKE_CAP };
