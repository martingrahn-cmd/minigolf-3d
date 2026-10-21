// Every Swedish text the game shows, gathered from where it is written:
//   - the code: the text given to t(), plural() and toast() (all the alternatives
//     in its first argument, e.g. t(touch?'Tryck…':'Klicka…'));
//   - the holes and worlds (src/levels.js, src/round.js);
//   - the page (index.html): text and labels.
// tests/i18n.test.js checks that each one is in every dictionary.
// `node scripts/i18n-keys.mjs [en|es]` lists what a dictionary still lacks.
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const hasWords=s=>/\p{L}{2}/u.test(s);
// Shown the same in every language: the name, key names and placeholders the game replaces.
export const SAME_EVERYWHERE=new Set(['Mini Mayhem','MINI MAYHEM','MINI','MAYHEM','HALLOWEEN','Esc','Shift','ABCD','clockwork','forest','moon','halloween','turns']);

// The string literals in a stretch of code (', " and ` without ${}).
function literals(code){
  const out=[];const re=/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\$]|\\.)*)`/g;
  for(let m;(m=re.exec(code));)out.push((m[1]??m[2]??m[3]).replace(/\\(.)/g,'$1'));
  return out;
}
// The arguments of the call whose '(' is at `open`, split at top-level commas.
function callArgs(src,open){
  const args=[];let depth=0,start=open+1,quote=null;
  for(let i=open;i<src.length;i++){
    const c=src[i];
    if(quote){if(c==='\\'){i++;continue}if(c===quote)quote=null;continue}
    if(c==="'"||c==='"'||c==='`'){quote=c;continue}
    if('([{'.includes(c))depth++;
    else if(')]}'.includes(c)){depth--;if(depth===0){args.push(src.slice(start,i));return args}}
    else if(c===','&&depth===1){args.push(src.slice(start,i));start=i+1}
  }
  return args;
}
export function codeKeys(){
  const keys=new Set(),dir=join(root,'src');
  for(const file of readdirSync(dir).filter(f=>f.endsWith('.js')&&f!=='i18n.js')){
    const src=readFileSync(join(dir,file),'utf8');
    for(const m of src.matchAll(/(?<![\w$.])(t|plural|toast)\(/g)){
      const args=callArgs(src,m.index+m[0].length-1);
      const parts=m[1]==='plural'?args.slice(1,3):args.slice(0,1);
      for(const part of parts)for(const s of literals(part))if(hasWords(s))keys.add(s);
    }
    for(const m of src.matchAll(/new Error\('([^']+)'\)/g))keys.add(m[1]);
  }
  return keys;
}

// Texts in the game data: every string, except internal names (ids, models, keys).
const INTERNAL=new Set(['id','theme','recordKey','model','folder','scenery','custom','key','kind','texture','shape']);
export async function dataKeys(){
  const {LEVELS}=await import('../src/levels.js');const {WORLDS}=await import('../src/round.js');
  const keys=new Set();
  const walk=(value,key)=>{
    if(typeof value==='string'){if(!INTERNAL.has(key)&&hasWords(value)&&!/^[a-z0-9_\-]+$/.test(value))keys.add(value);return}
    if(!value||typeof value!=='object')return;
    if(key==='title'&&Array.isArray(value)&&value.length===2&&value.every(s=>typeof s==='string')){keys.add(value.join('|'));return}
    if(Array.isArray(value))value.forEach(v=>walk(v,key));
    else for(const [k,v] of Object.entries(value))walk(v,k);
  };
  walk(LEVELS);walk(WORLDS);
  return keys;
}

// The page: text between tags (not in <script> or <style>) and the labels.
export function pageKeys(){
  const html=readFileSync(join(root,'index.html'),'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g,'');
  const keys=new Set();
  for(const m of html.matchAll(/>([^<>]+)</g)){const s=m[1].replace(/&nbsp;/g,' ').trim();if(hasWords(s))keys.add(s)}
  for(const m of html.matchAll(/\s(?:aria-label|placeholder|title|alt)="([^"]+)"/g))if(hasWords(m[1]))keys.add(m[1].trim());
  const title=html.match(/<title>([^<]*)<\/title>/);if(title)keys.add(title[1].trim());
  return keys;
}

export async function allKeys(){
  return new Set([...codeKeys(),...await dataKeys(),...pageKeys()].filter(k=>!SAME_EVERYWHERE.has(k)));
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
  const keys=[...await allKeys()].sort();
  const code=process.argv[2];
  if(!code){console.log(keys.length,'texts');for(const k of keys)console.log(JSON.stringify(k));}
  else{
    const dictionary=(await import(`../src/locales/${code}.js`)).default;
    const missing=keys.filter(k=>!(k in dictionary));
    console.log(`${code}: ${missing.length} of ${keys.length} missing`);for(const k of missing)console.log(JSON.stringify(k));
  }
}
