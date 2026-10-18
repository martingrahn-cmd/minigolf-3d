// Injected by scripts/par-bot.mjs into a ?qa&bot page: window.parBot searches shots (beam search) and plays rounds with human-like errors.
(()=>{
const B=window.minigolfBot,L=B.level,cup=L.cup;
// Walking distance to the cup over the course, on a half-metre grid, so detours rank right.
const CELL=.5,R=70,N=Math.round(2*R/CELL),idx=(i,j)=>i*N+j,toI=v=>Math.round((v+R)/CELL);
let ok,geo;
function grid(passable=[]){ok=new Uint8Array(N*N);geo=new Float32Array(N*N).fill(Infinity);
 const free=(x,z)=>passable.some(r=>x>=r.x1&&x<=r.x2&&z>=r.z1&&z<=r.z2);
 for(let i=0;i<N;i++)for(let j=0;j<N;j++){const x=-R+i*CELL,z=-R+j*CELL;ok[idx(i,j)]=free(x,z)||(B.onCourse(x,z)&&!B.blocked(x,z))?1:0}
 const ci=toI(cup.x),cj=toI(cup.z),q=[[ci,cj]];geo[idx(ci,cj)]=0;ok[idx(ci,cj)]=1;
 for(let h=0;h<q.length;h++){const [i,j]=q[h],d=geo[idx(i,j)];
  for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=N||b>=N||!ok[idx(a,b)])continue;
   const nd=d+Math.hypot(di,dj)*CELL;if(nd<geo[idx(a,b)]-1e-6){geo[idx(a,b)]=nd;q.push([a,b])}}}}
const geoAt=(x,z)=>geo[idx(toI(x),toI(z))];
let VIA=null;
const walk0=s=>{const g=geoAt(s.x,s.z);const e=Math.hypot(s.x-cup.x,s.z-cup.z)+Math.max(0,cup.y-s.y)*3;return Number.isFinite(g)?Math.max(g,e):e*2.5+40};
// A hole read like a player would: some need a step first (ring the bell), then the cup.
const walk=s=>VIA&&!s.flags[VIA.flag]?Math.hypot(s.x-VIA.x,s.z-VIA.z)+walk0({x:VIA.x,z:VIA.z,y:s.y})+8:walk0(s);
const replay=plan=>{B.restart();let r=B.look();for(const s of plan){r=B.shot(s);if(r.phase==='win')break}return r};
const DEF={beam:8,depth:4,aims:48,fine:[-.3,-.2,-.12,-.07,-.035,0,.035,.07,.12,.2,.3],powers:[.12,.2,.28,.36,.45,.55,.65,.75,.85,.93,1],waits:[0],fires:[0]};
function candidates(s,o){const out=[],toCup=Math.atan2(cup.z-s.z,cup.x-s.x);
 const aims=[];for(let k=0;k<o.aims;k++)aims.push(k/o.aims*Math.PI*2);for(const d of o.fine)aims.push(toCup+d);
 for(const wait of o.waits)for(const fire of o.fires)for(const aim of aims)for(const power of o.powers)out.push({aim,power,wait,fire});
 if(s.putt!=null)for(const d of [-.04,-.02,0,.02,.04])for(const extra of [.1,.3,.5,.8])out.push({aim:toCup+d,putt:Math.min(6,s.putt+extra),wait:0});
 return out}
const D=Math.PI/180;
// Expected strokes for a plan's end state: strokes spent plus a rough guess at what is left.
const value=(r,base)=>(r.strokes-base.strokes)+(r.phase==='win'?0:1+walk(r)/12);
// A risk-aware look at the last shot: the same shot a little off in aim, power or timing.
function robust(prefix,item,base,o){const n=o.risk,last=item.plan[item.plan.length-1],head=prefix.concat(item.plan.slice(0,-1));
 const v=last.putt!==undefined?[{putt:last.putt+n.putt},{putt:Math.max(.25,last.putt-n.putt)}]:[{power:Math.min(1,last.power+n.power)},{power:Math.max(.01,last.power-n.power)}];
 v.push({aim:last.aim+n.aim*D},{aim:last.aim-n.aim*D});
 if(o.fires.length>1)v.push({fire:last.fire+n.fire},{fire:Math.max(0,last.fire-n.fire)});
 let sum=value(item.s,base);for(const x of v){replay(head);sum+=value(B.shot({...last,...x}),base)}return sum/(v.length+1)}
function solve(prefix=[],opts={}){
 const o={...DEF,...opts};{const k=JSON.stringify(o.passable||[]);if(!geo||k!==grid.last){grid(o.passable||[]);grid.last=k}}VIA=o.via||null;const base=replay(prefix);if(base.phase==='win')return {strokes:base.strokes,plan:[],done:true};
 let frontier=[{plan:[],s:base}],sims=0;
 for(let depth=1;depth<=o.depth;depth++){const kids=new Map(),wins=[];let best=null;
  for(const node of frontier)for(const c of candidates(node.s,o)){const r=(replay(prefix.concat(node.plan)),B.shot(c));sims++;
   const plan=node.plan.concat(c);
   if(r.phase==='win'){if(!best||r.strokes<best.strokes)best={strokes:r.strokes,plan};wins.push({plan,s:r});if(!o.risk&&r.strokes===base.strokes+depth)return {...best,sims,done:true};continue}
   const key=`${Math.round(r.x/.4)},${Math.round(r.z/.4)},${Math.round(r.y)},${r.strokes},${r.flags.bridge},${r.flags.lift}`,score=walk(r)+(r.strokes-base.strokes-depth)*25;
   if(!kids.has(key)||kids.get(key).score>score)kids.set(key,{plan,s:r,score})}
  const sorted=[...kids.values()].sort((a,b)=>a.score-b.score);
  if(o.risk){
   const pool=sorted.slice(0,o.beam*3),tries=wins.sort((a,b)=>a.s.strokes-b.s.strokes).slice(0,10);
   for(const it of [...pool,...tries])it.rv=robust(prefix,it,base,o);
   const bestWin=tries.sort((a,b)=>a.rv-b.rv)[0],bestOther=pool.sort((a,b)=>a.rv-b.rv)[0];
   if(bestWin&&(!bestOther||bestWin.rv<=bestOther.rv))return {strokes:bestWin.s.strokes,plan:bestWin.plan,rv:bestWin.rv,sims,done:true};
   frontier=pool.slice(0,o.beam);
  }else{if(best)return {...best,sims,done:true};frontier=sorted.slice(0,o.beam)}
  if(depth===o.depth||!frontier.length)return {strokes:null,plan:frontier[0]?.plan||[],guess:frontier[0]?.score,sims,done:false}}
}
// A human-ish execution of an intended shot.
let seed=1;const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const gauss=()=>Math.sqrt(-2*Math.log(rnd()||1e-9))*Math.cos(2*Math.PI*rnd());
function noisy(c,n){const out={...c,aim:c.aim+gauss()*n.aim*Math.PI/180,needle:Math.max(-1,Math.min(1,gauss()*n.needle)),wait:c.wait,fire:Math.max(0,(c.fire||0)+gauss()*n.fire)};
 if(c.putt!==undefined)out.putt=Math.max(.25,Math.min(6,c.putt+gauss()*n.putt));else out.power=Math.max(.01,Math.min(1,c.power+gauss()*n.power));return out}
let opening=null;
function play(noise,opts,cap=12,s=1){seed=s;const prefix=[];let r=replay(prefix);
 while(r.phase!=='win'&&r.strokes<cap){const plan=prefix.length===0&&opening?opening:solve(prefix,opts);if(prefix.length===0)opening=plan;
  if(!plan.plan.length)break;prefix.push(noisy(plan.plan[0],noise));r=replay(prefix)}
 return {strokes:r.phase==='win'?r.strokes:cap,won:r.phase==='win'}}
window.parBot={solve,replay,walk,play,level:L};
})();
