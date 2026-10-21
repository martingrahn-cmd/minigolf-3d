// Playing together online: the rules of a room, kept free of network and DOM so
// they can be tested on their own. Up to four players each play their own ball
// on their own device. A match is played in one of two ways:
//   - together: all on the same hole at the same time, the others' balls shown
//     as coloured ghosts;
//   - turns: one player plays the whole hole while the others watch, then the
//     next. The order is drawn at random and moves one step each hole, so
//     everyone gets to go first (and last) about as often.
// When everyone still in the game has holed out, the room moves on together.
//
// Each player is the only source of their own scores; everyone merges what
// they hear. The host (the player who has been in the room longest) owns the
// match itself: which holes, which one is being played, and when to move on.

export const MAX_PLAYERS=4;
// A hole ends for a player at this many strokes, so nobody keeps the others waiting.
export const STROKE_CAP=10;
// Someone who has been gone this long no longer holds up the hole.
export const AWAY_AFTER=30;
export const PLAYER_COLORS=[0xff8a2a,0x3fd0c0,0xff6fa8,0xa98bff];
export const COLOR_NAMES=['orange','turkos','rosa','lila'];

// Room codes avoid letters that are easy to mix up (I, O, Q).
const LETTERS='ABCDEFGHJKLMNPRSTUVWXYZ';
export function roomCode(random=Math.random){
  return Array.from({length:4},()=>LETTERS[Math.floor(random()*LETTERS.length)]).join('');
}
export function normalizeCode(text=''){
  return String(text).toUpperCase().replace(/[^A-Z]/g,'').replace(/[IOQ]/g,'').slice(0,4);
}
export function cleanName(text='',fallback='Spelare'){
  return String(text).replace(/\s+/g,' ').trim().slice(0,14)||fallback;
}

// The players in the order they joined; the first four get a seat and a colour.
export function seatPlayers(players){
  const sorted=[...players].sort((a,b)=>a.joinedAt-b.joinedAt||String(a.id).localeCompare(String(b.id)));
  return sorted.map((p,i)=>({...p,seat:i<MAX_PLAYERS?i:null,color:i<MAX_PLAYERS?PLAYER_COLORS[i]:null}));
}
export const electHost=players=>seatPlayers(players)[0]??null;

// A new match: the built holes of one world, played in order.
export function createMatch(world,holes,players,random=Math.random,mode='together'){
  const seated=seatPlayers(players).filter(p=>p.seat!==null).map(({id,name,seat,color})=>({id,name,seat,color}));
  const match={id:Math.floor(random()*1e9).toString(36),world,holes:[...holes],index:0,finished:false,mode:mode==='turns'?'turns':'together',players:seated};
  if(match.mode==='turns'){
    const order=seated.map(p=>p.id);
    for(let i=order.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}
    Object.assign(match,{order,forfeits:{}});
  }
  return match;
}

// Turns: who plays when on the current hole. The drawn order, moved one step per hole.
export function turnOrder(match){
  const order=match.order||match.players.map(p=>p.id),k=match.index%Math.max(1,order.length);
  return [...order.slice(k),...order.slice(0,k)].map(id=>match.players.find(p=>p.id===id)).filter(Boolean);
}
// A player whose turn came while they were away loses that hole at the cap. The
// host records it in the match, so it holds even if they come back.
export function forfeit(match,playerId){
  const list=match.forfeits?.[match.index]||[];
  return list.includes(playerId)?match:{...match,forfeits:{...match.forfeits,[match.index]:[...list,playerId]}};
}
// The scores with forfeited holes filled in at the cap.
export function withForfeits(match,scores){
  let out=scores;
  for(const [index,ids] of Object.entries(match.forfeits||{}))for(const id of ids){
    if(Number.isFinite(out[id]?.[index]))continue;
    const list=[...(out[id]||[])];list[index]=STROKE_CAP;out={...out,[id]:list};
  }
  return out;
}
// Whose turn it is: the first in this hole's order who has not finished it, or
// null when everyone has.
export const currentTurn=(match,scores)=>turnOrder(match).find(p=>!Number.isFinite(scores[p.id]?.[match.index]))??null;

// Scores are {playerId: [strokes per hole, or null]}. A player's own list wins
// for every hole it has a number for.
export function mergeScores(scores,playerId,list=[]){
  const own=[...(scores[playerId]||[])];
  list.forEach((v,i)=>{if(Number.isFinite(v))own[i]=v});
  return {...scores,[playerId]:own};
}

// Who the current hole still waits for: match players who have not holed out
// and have been seen recently (lastSeen in seconds, `now` likewise).
export function waitingFor(match,scores,lastSeen,now){
  return match.players.filter(p=>!Number.isFinite(scores[p.id]?.[match.index])&&now-(lastSeen[p.id]??-Infinity)<AWAY_AFTER);
}
export const holeDone=(match,scores,lastSeen,now)=>waitingFor(match,scores,lastSeen,now).length===0;

// The match after the current hole: the next hole, or finished after the last.
export function advance(match){
  const index=match.index+1;
  return index>=match.holes.length?{...match,index:match.holes.length-1,finished:true}:{...match,index};
}

// Standings so far, against par over the holes played (as on a golf
// leaderboard). A hole a player never finished counts as the cap, so leaving
// early is never a way to win. Ties share a place.
export function standings(match,scores,pars=[]){
  const upTo=match.finished?match.holes.length:match.index+1;
  const rows=match.players.map(p=>{
    const holes=match.holes.slice(0,upTo).map((_,i)=>scores[p.id]?.[i]??null);
    const total=holes.reduce((s,v,i)=>s+(Number.isFinite(v)?v:(i<match.index||match.finished?STROKE_CAP:0)),0);
    const par=pars.slice(0,upTo).reduce((s,v,i)=>s+(Number.isFinite(holes[i])||i<match.index||match.finished?v:0),0);
    return {player:p,holes,total,toPar:total-par,played:holes.filter(Number.isFinite).length};
  }).sort((a,b)=>a.toPar-b.toPar||a.player.seat-b.player.seat);
  rows.forEach((r,i)=>{r.place=i&&rows[i-1].toPar===r.toPar?rows[i-1].place:i+1});
  return rows;
}
