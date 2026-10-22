// The leaderboards on GameVolt: one per world, for the world played in a row.
// Fewest strokes wins; on the same strokes the faster round does. GameVolt
// keeps one integer per entry and ranks the highest first, so a round is
// stored as (RUN_BASE − strokes) · TIME_SLOTS + (TIME_SLOTS − 1 − tenths of a
// second), the way Sudoku and Minesweeper store their times; the game shows
// it as strokes and a time again. A round without a time (played before the
// clock existed) sorts after every timed round on the same strokes.
//
// The best round per world is also kept on the device, so the scorecard can
// show it without GameVolt. The board itself is GameVolt's own
// (GameVolt.ui.leaderboard), so it only opens where the SDK is loaded.
import { WORLDS } from './round.js';

export const RUN_BASE=1000;
export const TIME_SLOTS=100000;
const NO_TIME=TIME_SLOTS-1;
export const runMode=worldKey=>`${worldKey}-run`;
// Timed rounds stop one tenth short of NO_TIME (2 h 46 min), so they never read as untimed.
const tenths=seconds=>seconds==null||!Number.isFinite(seconds)?NO_TIME:Math.min(NO_TIME-1,Math.max(0,Math.round(seconds*10)));
export const encodeRun=(strokes,seconds)=>(RUN_BASE-strokes)*TIME_SLOTS+NO_TIME-tenths(seconds);
export function decodeRun(score){
  const n=Number(score),left=NO_TIME-n%TIME_SLOTS;
  return {strokes:RUN_BASE-Math.floor(n/TIME_SLOTS),seconds:left===NO_TIME?null:left/10};
}
/** A stopwatch time: 0:42.3, 12:05.0 (to the tenth, like the board). */
export function formatTime(seconds){
  const d=tenths(seconds),m=Math.floor(d/600),s=Math.floor(d%600/10);
  return `${m}:${String(s).padStart(2,'0')}.${d%10}`;
}
export const bestRunKey=worldKey=>`minimayhem-best-run-${worldKey}`;
export const bestTimeKey=worldKey=>`minimayhem-best-time-${worldKey}`;

const runFrom=(strokes,time)=>{
  const s=Number(strokes),t=time==null?NaN:Number(time);
  return Number.isInteger(s)&&s>0?{strokes:s,seconds:Number.isFinite(t)&&t>=0?t:null}:null;
};
/** Fewer strokes, or the same strokes in less time. */
export const betterRun=(a,b)=>!b||a.strokes<b.strokes||a.strokes===b.strokes&&(a.seconds??Infinity)<(b.seconds??Infinity);

export function bestRun(storage,worldKey){
  return runFrom(storage.getItem(bestRunKey(worldKey)),storage.getItem(bestTimeKey(worldKey)));
}
/** A world finished in a row: keep it if it is the best, and send it to GameVolt. */
export function recordRun(storage,worldKey,strokes,seconds=null){
  const round={strokes,seconds:seconds==null?null:tenths(seconds)/10},before=bestRun(storage,worldKey),newBest=betterRun(round,before);
  if(newBest){
    storage.setItem(bestRunKey(worldKey),String(strokes));
    if(round.seconds==null)storage.removeItem(bestTimeKey(worldKey));else storage.setItem(bestTimeKey(worldKey),String(round.seconds));
  }
  submitRun(worldKey,strokes,round.seconds);
  return {best:newBest?round:before,newBest};
}
/** The best rounds, for GameVolt's migration when a guest signs in. */
export function localScores(local){
  return WORLDS.map(w=>[w,runFrom(local[bestRunKey(w.key)],local[bestTimeKey(w.key)])]).filter(([,run])=>run)
    .map(([w,run])=>({score:encodeRun(run.strokes,run.seconds),mode:runMode(w.key)}));
}
export const migrationKeys=()=>WORLDS.flatMap(w=>[bestRunKey(w.key),bestTimeKey(w.key)]);

const sdk=()=>(typeof window!=='undefined'&&window.GameVolt)||null;
export const available=()=>!!sdk()?.ui?.leaderboard;
export function submitRun(worldKey,strokes,seconds){
  try{sdk()?.leaderboard?.submit(encodeRun(strokes,seconds),{mode:runMode(worldKey)})}catch{/* the game does not depend on it */}
}
/** GameVolt's board, a tab per world, opened on `worldKey`'s. */
export function openBoard({worldKey,title,format,worlds=WORLDS}){
  const GV=sdk();if(!GV?.ui?.leaderboard)return false;
  GV.ui.leaderboard({title,accent:'#f36b53',limit:50,format,
    tabs:worlds.map(w=>({label:w.name,mode:runMode(w.key)})),mode:worldKey?runMode(worldKey):undefined});
  return true;
}
