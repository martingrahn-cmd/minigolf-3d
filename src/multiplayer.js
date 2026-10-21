// Playing with friends online: the lobby, the room across page loads, the live
// scoreboard and moving on together. The rules are in room.js and the network in
// net.js; the 3D ghost balls in ghost-balls.js. The room lives in the address
// (`?rum=ABCD`) and in sessionStorage, so each hole can be its own page load.
//
// In turns, the player whose turn it is sends each shot (where the ball lay,
// the clocks of the moving parts and the ball's new velocity). The watchers'
// games run the same shot themselves, so they see the real ball, the course
// and the sounds; while the ball is at rest they take its true spot.
import { connect, multiplayerAvailable, transportName } from './net.js';
import { roomCode, normalizeCode, cleanName, seatPlayers, electHost, createMatch, mergeScores, waitingFor, holeDone, advance, standings, turnOrder, currentTurn, forfeit, withForfeits, MAX_PLAYERS, STROKE_CAP, AWAY_AFTER } from './room.js';

const SESSION_KEY='minimayhem-room',NAME_KEY='minimayhem-player-name';
const NEXT_DELAY=4;
// Turns: the finished player's result stays up this long before the next one plays.
const TURN_DELAY=3;
const REACTIONS=['👏','😂','😱','🔥'];
const hex=c=>`#${c.toString(16).padStart(6,'0')}`;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const now=()=>Date.now()/1000;
const turnOf=name=>/[sxz]$/i.test(name)?`${name} tur`:`${name}s tur`;
export const roomInAddress=()=>typeof location!=='undefined'?normalizeCode(new URLSearchParams(location.search).get('rum')||''):'';

function loadSession(code){
  try{const s=JSON.parse(sessionStorage.getItem(SESSION_KEY));return s&&s.code===code?s:null}catch{return null}
}
function saveSession(s){try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(s))}catch{}}
function savedName(){try{return localStorage.getItem(NAME_KEY)||''}catch{return ''}}

// `game` gives the controller what it needs from the page:
//   {$, toast, hydrateIcons, worlds, round, hole, pars(match)->[par…], strokes(), onRemoteBall(player,ball),
//    onMatchStart(), onTurnResult(player,strokes) (someone holed out), onReaction(player,emoji),
//    and for turns: onTurn(player,mine,{turn,turns,hole}), onRemoteShot(shot), onRemoteFire(fire),
//    onRemoteReplay(log) (a turn under way, to catch up on), onTurnChange()}
export function createMultiplayer(game){
  const {$,toast}=game;
  const code=roomInAddress();
  let session=code?loadSession(code):null,link=null,players=[],lastSeen={},advanceAt=null,lastBall=0,lastSent='';
  // Turns: whose turn is being played here, and when the next one starts.
  let turnId=null,turnAt=null;
  // The host decides the world and the way to play; the others see the choice as it is made.
  let setup=null,lastReaction=0;
  // In a match on this page's hole: then the hole is played for the room.
  const inMatch=()=>!!(session?.match&&game.hole&&session.match.holes.includes(game.hole));
  const me=()=>session?.me;
  const isHost=()=>electHost(players)?.id===me()?.id;
  const holeUrl=(match)=>`?hole=${match.holes[match.index]}&rum=${session.code}`;
  const save=()=>saveSession(session);
  const turns=()=>inMatch()&&session.match.mode==='turns';
  const scoresNow=()=>withForfeits(session.match,session.scores);

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
    const world=game.worlds.find(w=>w.key===setup?.world);
    $('mpGuestWait').innerHTML=world?`Värden har valt <b>${escape(world.name)}</b> · <b>${setup.mode==='turns'?'Turordning':'Samtidigt'}</b>. Väntar på att värden startar…`:'Väntar på att värden väljer värld och startar…';
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
  function sendSetup(){
    if(!link||!isHost())return;
    link.send('setup',{world:document.querySelector('input[name=mpWorld]:checked')?.value,mode:document.querySelector('input[name=mpMode]:checked')?.value});
  }
  function startMatch(){
    const key=document.querySelector('input[name=mpWorld]:checked')?.value,world=game.worlds.find(w=>w.key===key);if(!world)return;
    const holes=game.round.filter(s=>s.world===world&&s.level).map(s=>s.hole);
    const mode=document.querySelector('input[name=mpMode]:checked')?.value;
    session.match=createMatch(world.key,holes,seatPlayers(players).filter(p=>p.seat!==null),Math.random,mode);session.scores={};save();
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
      if(!inMatch())sendSetup();
      renderBoard();check();
    });
    link.on('hello',(_,from)=>{
      if(isHost()&&session.match)link.send('match',session.match);sendSetup();sendScores();
      // Turns: someone (re)joined mid-turn. They get this turn's shots to catch up on.
      if(turns()&&turnId===me().id)link.send('replay',{i:session.match.index,to:from,log:ownTurnLog()});
    });
    link.on('replay',(replay,from)=>{
      if(replay.to!==me().id)return;catchUp(from);
      if(turns()&&from===turnId&&replay.i===session.match.index)game.onRemoteReplay?.(replay.log);
    });
    link.on('react',(data,from)=>{if(inMatch()&&REACTIONS.includes(data?.e))game.onReaction?.(playerFor(from),data.e)});
    link.on('setup',data=>{setup=data;renderLobby()});
    link.on('match',match=>{
      const fresh=match.id!==session.match?.id;
      session.match=match;if(fresh)session.scores={};save();
      if(fresh)endWorldRunHook();
      if(match.finished){if(inMatch())showResults();return}
      if(game.hole!==match.holes[match.index])location.href=holeUrl(match);
      else{advanceAt=null;renderBoard();check()}
    });
    link.on('scores',(list,from)=>{
      const before=scoresNow()[from]?.[session.match?.index];
      session.scores=mergeScores(session.scores,from,list);lastSeen[from]=now();save();
      // Turns: tell the watchers how the turn that just ended went.
      const after=scoresNow()[from]?.[session.match?.index];
      if(inMatch()&&!Number.isFinite(before)&&Number.isFinite(after))game.onTurnResult?.(playerFor(from),after);
      renderBoard();check();
    });
    link.on('ball',(ball,from)=>{
      lastSeen[from]=now();liveStrokes[from]=ball.strokes;
      if(turns()){catchUp(from);if(from===turnId)game.onRemoteBall?.(playerFor(from),ball)}
      else game.onRemoteBall?.(playerFor(from),ball);
      renderBoard();
    });
    link.on('shot',(shot,from)=>{lastSeen[from]=now();catchUp(from);if(turns()&&from===turnId&&shot.i===session.match.index)game.onRemoteShot?.(shot)});
    link.on('fire',(fire,from)=>{if(turns()&&from===turnId&&fire.i===session.match.index)game.onRemoteFire?.(fire)});
    link.send('hello',{});sendScores();
  }
  const liveStrokes={};
  const endWorldRunHook=()=>game.onMatchStart?.();
  const playerFor=id=>session.match?.players.find(p=>p.id===id)??seatPlayers(players).find(p=>p.id===id);
  const myScores=()=>session.scores[me().id]||[];
  // Turns: the shots of this player's turn on this hole, kept across a reload.
  const ownTurnLog=()=>{const t=session?.turnLog;return t&&t.match===session.match?.id&&t.i===session.match.index&&t.id===me().id?t.log:[]};
  function logTurn(entry){
    if(!ownTurnLog().length)session.turnLog={match:session.match.id,i:session.match.index,id:me().id,log:[]};
    session.turnLog.log.push(entry);save();
  }
  function sendScores(){if(link&&session?.match)link.send('scores',myScores())}

  // Everyone keeps an eye on whether the hole is done; the host moves the room on.
  function check(){
    if(!inMatch()||session.match.finished)return;
    const t=now();for(const p of players)lastSeen[p.id]=t;
    let match=session.match;
    if(game.hole!==match.holes[match.index])return;
    if(turns()&&link){
      // A player who is away when their turn comes loses the hole at the cap.
      const next=currentTurn(match,scoresNow());
      if(next&&isHost()&&next.id!==me().id&&t-(lastSeen[next.id]??-Infinity)>=AWAY_AFTER){
        session.match=match=forfeit(match,next.id);save();link.send('match',match);
        toast(`${next.name} är borta · hålet räknas som ${STROKE_CAP} slag`,2600);renderBoard();
      }
      updateTurn();
    }
    if(!holeDone(match,scoresNow(),lastSeen,t)){advanceAt=null;return}
    if(advanceAt===null)advanceAt=now()+NEXT_DELAY;
    renderWait();
    if(now()>=advanceAt&&isHost()){
      const next=advance(match);session.match=next;save();link.send('match',next);
      if(next.finished)showResults();else location.href=holeUrl(next);
    }
  }

  // --- Turns: who plays now. Everyone works it out from the scores; a short
  // pause shows the finished player's result before the next one starts. ---
  function updateTurn(immediate=false){
    if(!turns()||!link)return;
    const next=currentTurn(session.match,scoresNow()),id=next?.id??null;
    if(id===turnId){turnAt=null;game.onTurnChange?.();return}
    if(!immediate&&turnId!==null){turnAt??=now()+TURN_DELAY;if(now()<turnAt){game.onTurnChange?.();return}}
    turnId=id;turnAt=null;
    if(next){
      const order=turnOrder(session.match),turn=order.findIndex(p=>p.id===id);
      game.onTurn?.(next,id===me().id,{turn:turn+1,turns:order.length,hole:session.match.index+1});
    }
    renderBoard();game.onTurnChange?.();
  }
  // Someone already playing the next turn: no need to wait out the pause.
  function catchUp(from){if(turns()&&from!==turnId&&currentTurn(session.match,scoresNow())?.id===from)updateTurn(true)}
  function turnStatus(){
    const match=session.match,scores=scoresNow(),next=currentTurn(match,scores),secs=at=>Math.max(1,Math.ceil(at-now()));
    if(!next){
      const last=match.index+1>=match.holes.length;
      return {title:'Alla i hål!',detail:last?'Resultatet kommer…':`Nästa hål om ${secs(advanceAt??now()+NEXT_DELAY)} s`};
    }
    if(turnAt!==null)return {title:next.id===me().id?'Din tur snart':turnOf(next.name),detail:`Börjar om ${secs(turnAt)} s`};
    const order=turnOrder(match),mine=order.findIndex(p=>p.id===me().id),at=order.findIndex(p=>p.id===next.id);
    const left=mine>at?mine-at:0;
    return {title:`${next.name} spelar`,detail:`Slag ${liveStrokes[next.id]??0} · ${left===1?'du är näst på tur':left>1?`du spelar om ${left} turer`:'du har spelat hålet'}`};
  }

  // --- On the course: scoreboard, waiting card and results. ---
  function renderBoard(){
    if(!inMatch())return;
    const match=session.match,scores=scoresNow(),rows=standings(match,scores,game.pars(match));
    $('mpBoard').hidden=false;
    $('mpBoardTitle').textContent=`RUM ${session.code} · HÅL ${match.index+1}/${match.holes.length}`;
    $('mpBoardRows').innerHTML=rows.map(r=>{
      const done=Number.isFinite(scores[r.player.id]?.[match.index]),here=r.player.id===me().id||now()-(lastSeen[r.player.id]??-1e9)<15;
      const playing=turns()&&r.player.id===turnId&&!done,strokes=(r.player.id===me().id?game.strokes?.():liveStrokes[r.player.id])??0;
      const now_=done?`✓ ${scores[r.player.id][match.index]}`:!here?'borta':turns()?(playing?`▶ ${strokes} slag`:'väntar'):`${strokes} slag`;
      const par=r.toPar===0?'±0':r.toPar>0?`+${r.toPar}`:r.toPar;
      return `<li class="${done?'done':''}${here?'':' away'}${playing?' playing':''}"><i style="background:${hex(r.player.color)}"></i><b>${escape(r.player.name)}</b><span>${now_}</span><em>${par}</em></li>`;
    }).join('');
    renderWait();
  }
  function renderWait(){
    if(!inMatch())return;
    const match=session.match,mineDone=Number.isFinite(scoresNow()[me().id]?.[match.index]);
    $('mpWait').hidden=!mineDone;if(!mineDone)return;
    const waiting=waitingFor(match,scoresNow(),lastSeen,now());
    $('mpWaitText').textContent=turns()&&waiting.length?`${turnOf(currentTurn(match,scoresNow()).name)} härnäst`:waiting.length?`Väntar på ${waiting.map(p=>p.name).join(', ')}…`:
      match.index+1>=match.holes.length?'Alla i hål! Resultatet kommer…':`Alla i hål! Nästa hål om ${Math.max(0,Math.ceil((advanceAt??now()+NEXT_DELAY)-now()))} s`;
    $('mpWaitBoard').innerHTML=$('mpBoardRows').innerHTML;
  }
  function showResults(){
    const match=session.match,rows=standings(match,withForfeits(match,session.scores),game.pars(match)),medal=['🥇','🥈','🥉',''];
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
  $('mpHostControls').addEventListener('change',sendSetup);
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
    mode:()=>inMatch()?session.match.mode||'together':null,
    me:()=>session?.me,
    activePlayer:()=>turns()?playerFor(turnId)??null:null,
    ownTurnLog,
    // A quick reaction for everyone in the match (and here), at most one a second.
    react(emoji){
      if(!link||!inMatch()||!REACTIONS.includes(emoji))return;const t=performance.now();if(t-lastReaction<1000)return;
      lastReaction=t;link.send('react',{e:emoji});game.onReaction?.(playerFor(me().id),emoji);
    },
    // Turns: someone else is playing this hole and this game shows their shots.
    watching:()=>turns()&&!!link&&turnId!==me().id,
    turnStatus,
    // On page load: rejoin the room if the address has one.
    async start(){
      worldChoices();
      if(!code)return;
      if(!session){if(!game.hole)this.openLobby();return}
      // Everyone in the match counts as here from the start, before presence has
      // been heard: nobody is skipped or forfeited in the first moments on a hole.
      if(inMatch()){const t=now();for(const p of session.match.players)lastSeen[p.id]??=t}
      try{await open()}catch(error){toast(error.message||'Kunde inte ansluta till rummet',2600);return}
      if(inMatch()){
        renderBoard();
        if(session.match.finished)showResults();else check();
        setInterval(()=>{check();renderBoard()},1000);
      }else if(!game.hole)this.openLobby();
    },
    openLobby(){renderLobby();if(!$('mpPanel').open)$('mpPanel').showModal()},
    // The local ball, every frame; sent about ten times a second while it changes.
    // In turns only the player whose turn it is sends.
    reportBall(ball){
      if(!link||!inMatch()||(turns()&&turnId!==me().id))return;const t=performance.now();if(t-lastBall<100)return;
      const key=`${ball.x.toFixed(2)},${ball.y.toFixed(2)},${ball.z.toFixed(2)},${ball.strokes},${ball.hidden},${ball.aim?.toFixed(2)},${ball.phase},${ball.putt}`;
      if(key===lastSent&&t-lastBall<2000)return;
      lastBall=t;lastSent=key;link.send('ball',ball);
    },
    // Turns: this player's shot and cannon fire, for the watchers to play along.
    reportShot(shot){if(link&&turns()&&turnId===me().id){logTurn({kind:'shot',...shot});link.send('shot',{...shot,i:session.match.index})}},
    reportFire(fire){if(link&&turns()&&turnId===me().id){logTurn({kind:'fire',...fire});link.send('fire',{...fire,i:session.match.index})}},
    // The local player holed out (or hit the cap): record it for everyone.
    finishHole(strokes){
      if(!inMatch()||(turns()&&turnId!==me().id))return;const list=[...myScores()];list[session.match.index]=Math.min(strokes,STROKE_CAP);
      session.scores=mergeScores(session.scores,me().id,list);save();sendScores();renderBoard();check();
    },
    holeLabel(){const m=session.match;return `RUM ${session.code} · HÅL ${m.index+1} AV ${m.holes.length}${m.mode==='turns'?' · TURORDNING':''}`},
    refresh:renderBoard,
  };
}
export { MAX_PLAYERS, STROKE_CAP };
