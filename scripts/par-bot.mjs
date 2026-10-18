// The par bot: plays holes with the game's own physics in a headless browser and
// reports what a normal player scores. Used for the balance pass in DESIGN.md.
//
//   npm run dev -- --port 5199            (in another terminal)
//   node scripts/par-bot.mjs 1,2,3        (holes; default all 18)
//   node scripts/par-bot.mjs 15 --trials 32 --best
//
// --best searches the fewest strokes with flawless shots instead. Playwright is
// not a dependency: it uses a global install (npm i -g playwright).
import {createRequire} from 'node:module';
import {execSync} from 'node:child_process';
import {readFileSync} from 'node:fs';

const require=createRequire(import.meta.url);
const {chromium}=require(`${execSync('npm root -g').toString().trim()}/playwright`);
const args=process.argv.slice(2),flag=name=>args.includes(`--${name}`),option=(name,fallback)=>{const i=args.indexOf(`--${name}`);return i<0?fallback:args[i+1]};
const holes=(args[0]&&!args[0].startsWith('--')?args[0]:'1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18').split(',').map(Number);
const trials=Number(option('trials',16)),url=option('url','http://localhost:5199');

// A normal player's spread when striking: aim in degrees, power and needle as on the
// meters, putt length in metres and timing (FYR) in seconds.
const NOISE={aim:1,power:.035,needle:.1,putt:.2,fire:.07};
const PLAN={beam:5,depth:3,aims:36,fine:[-.2,-.1,-.05,0,.05,.1,.2],powers:[.15,.25,.35,.45,.55,.65,.75,.85,.95]};
// How a player reads each hole: when to wait for a mechanism, what to do first.
const waits=[0,.6,1.2,1.8,2.4];
const fires=period=>Array.from({length:20},(_,i)=>+(i*period/20).toFixed(2));
const HOLES={
  1:{waits,aims:24},
  3:{via:{x:-8.5,z:-2.1,flag:'bridge'},passable:[{x1:0,x2:7,z1:-1.5,z2:1.5}]},
  4:{powers:[.15,.25,.3,.33,.36,.39,.42,.45,.48,.51,.55,.65,.75,.85,.95]},
  5:{waits,aims:24},6:{waits,aims:24},9:{waits,aims:24},11:{waits,aims:24},
  16:{aims:12,fine:[-.1,0,.1],powers:[.5,.7,.9],fires:fires(3)},
  17:{waits:[...waits,3,3.6],aims:24},
  18:{aims:12,fine:[-.1,0,.1],powers:[.5,.7,.9],fires:fires(3.2)},
};

const browser=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});
const solver=readFileSync(new URL('./par-bot-solver.js',import.meta.url),'utf8');
for(const hole of holes){
  const page=await browser.newPage({viewport:{width:200,height:150}});
  await page.goto(`${url}/?hole=${hole}&qa&bot`);
  await page.waitForFunction(()=>window.minigolfBot,null,{timeout:400000});
  await page.addScriptTag({content:solver});
  const level=await page.evaluate(()=>window.minigolfBot.level),started=Date.now();
  if(flag('best')){
    const r=await page.evaluate(o=>window.parBot.solve([],o),{beam:8,depth:4,aims:48,...HOLES[hole]});
    console.log(JSON.stringify({hole,name:level.name,par:level.par,best:r.strokes,plan:r.plan}));
  }else{
    const scores=[];
    for(let i=0;i<trials;i++)scores.push((await page.evaluate(([noise,o,seed])=>window.parBot.play(noise,o,12,seed),[NOISE,{...PLAN,...HOLES[hole],risk:NOISE},i+1])).strokes);
    const avg=scores.reduce((a,b)=>a+b,0)/scores.length;
    console.log(JSON.stringify({hole,name:level.name,par:level.par,avg:+avg.toFixed(2),scores:scores.sort((a,b)=>a-b),seconds:Math.round((Date.now()-started)/1000)}));
  }
  await page.close();
}
await browser.close();
