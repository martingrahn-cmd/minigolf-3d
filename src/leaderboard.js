// The leaderboards on GameVolt: one per world, for the world played in a row
// (the scorecard's total strokes). GameVolt ranks the highest score first, so a
// round is stored as RUN_BASE − strokes, the way Sudoku and Minesweeper store
// their times; the game shows it as strokes again.
//
// The best round per world is also kept on the device, so the scorecard can
// show it without GameVolt. The board itself is GameVolt's own
// (GameVolt.ui.leaderboard), so it only opens where the SDK is loaded.
import { WORLDS } from './round.js';

export const RUN_BASE=1000;
export const runMode=worldKey=>`${worldKey}-run`;
export const encodeRun=strokes=>RUN_BASE-strokes;
export const decodeRun=score=>RUN_BASE-Number(score);
export const bestRunKey=worldKey=>`minimayhem-best-run-${worldKey}`;

export function bestRun(storage,worldKey){
  const v=Number(storage.getItem(bestRunKey(worldKey)));
  return Number.isInteger(v)&&v>0?v:null;
}
/** A world finished in a row: keep it if it is the best, and send it to GameVolt. */
export function recordRun(storage,worldKey,strokes){
  const before=bestRun(storage,worldKey),newBest=before===null||strokes<before;
  if(newBest)storage.setItem(bestRunKey(worldKey),String(strokes));
  submitRun(worldKey,strokes);
  return {best:newBest?strokes:before,newBest};
}
/** The best rounds, for GameVolt's migration when a guest signs in. */
export function localScores(local){
  return WORLDS.map(w=>[w,Number(local[bestRunKey(w.key)])]).filter(([,v])=>Number.isInteger(v)&&v>0)
    .map(([w,v])=>({score:encodeRun(v),mode:runMode(w.key)}));
}
export const migrationKeys=()=>WORLDS.map(w=>bestRunKey(w.key));

const sdk=()=>(typeof window!=='undefined'&&window.GameVolt)||null;
export const available=()=>!!sdk()?.ui?.leaderboard;
export function submitRun(worldKey,strokes){
  try{sdk()?.leaderboard?.submit(encodeRun(strokes),{mode:runMode(worldKey)})}catch{/* the game does not depend on it */}
}
/** GameVolt's board, a tab per world, opened on `worldKey`'s. */
export function openBoard({worldKey,title,format,worlds=WORLDS}){
  const GV=sdk();if(!GV?.ui?.leaderboard)return false;
  GV.ui.leaderboard({title,accent:'#f36b53',limit:50,format,
    tabs:worlds.map(w=>({label:w.name,mode:runMode(w.key)})),mode:worldKey?runMode(worldKey):undefined});
  return true;
}
