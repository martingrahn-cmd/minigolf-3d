// The game in three languages. Swedish is the source text, written straight into
// the code and the page; English and Spanish (Latin American, "tú") are
// dictionaries keyed by that Swedish text. A text missing from a dictionary shows
// in Swedish (tests/i18n.test.js keeps them complete).
//
//   t('Sikta')                     → 'Aim' / 'Apunta'
//   t('Hål {n}',{n:3})             → 'Hole 3' / 'Hoyo 3'
//   num(1.5)                       → '1,5' (sv, es) / '1.5' (en)
//
// The language is chosen once per page load: `?lang=xx`, then the player's own
// choice, then the device's language. Changing it reloads the page.
import en from './locales/en.js';
import es from './locales/es.js';

export const LANGUAGES=[
  {code:'sv',name:'Svenska',flag:'🇸🇪'},
  {code:'en',name:'English',flag:'🇬🇧'},
  {code:'es',name:'Español',flag:'🇪🇸'},
];
const DICTIONARIES={en,es};
const KEY='minimayhem-language';

export function detectLanguage({search='',stored=null,preferred=[]}={}){
  const known=code=>LANGUAGES.some(l=>l.code===code)?code:null;
  const asked=known(new URLSearchParams(search).get('lang'));
  if(asked)return asked;
  if(known(stored))return stored;
  for(const tag of preferred){const code=known(String(tag).slice(0,2).toLowerCase());if(code)return code}
  return 'en';
}

const browser=typeof window!=='undefined';
let storedLanguage=null;
try{
  if(browser){
    // A language asked for in the address (a shared link) is kept for the next pages too.
    const asked=new URLSearchParams(location.search).get('lang');
    if(LANGUAGES.some(l=>l.code===asked))localStorage.setItem(KEY,asked);
    storedLanguage=localStorage.getItem(KEY);
  }
}catch{}
// Outside a browser (the tests) the source text is used.
export let lang=browser?detectLanguage({search:location.search,stored:storedLanguage,preferred:navigator.languages||[navigator.language]}):'sv';
export function useLanguage(code){lang=LANGUAGES.some(l=>l.code===code)?code:'sv'}

const fill=(text,vars)=>vars?text.replace(/\{(\w+)\}/g,(m,k)=>k in vars?String(vars[k]):m):text;
export function t(text,vars){
  const dictionary=DICTIONARIES[lang];
  return fill(dictionary?.[text]??text,vars);
}
// One or many: t(one) for exactly one, else t(many); both get {n}.
export const plural=(n,one,many,vars={})=>t(n===1?one:many,{n,...vars});
// Decimals the local way.
export const num=(value,digits=1)=>{const s=Number(value).toFixed(digits);return lang==='en'?s:s.replace('.',',')};

export function setLanguage(code){
  try{localStorage.setItem(KEY,code)}catch{}
  const url=new URL(location.href);url.searchParams.delete('lang');location.replace(url);
}

// The static page: every text node and label written in Swedish in index.html.
const ATTRIBUTES=['aria-label','placeholder','title','alt'];
export function translatePage(root=document.body){
  if(lang==='sv')return;
  document.documentElement.lang=lang;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let node=walker.nextNode();node;node=walker.nextNode()){
    const text=node.nodeValue,trimmed=text.trim();
    if(!trimmed||node.parentElement?.closest('script,style,[data-no-translate]'))continue;
    const translated=t(trimmed);
    if(translated!==trimmed)node.nodeValue=text.replace(trimmed,translated);
  }
  for(const el of root.querySelectorAll(ATTRIBUTES.map(a=>`[${a}]`).join(',')))
    for(const a of ATTRIBUTES)if(el.hasAttribute(a)){const v=el.getAttribute(a),tr=t(v.trim());if(tr!==v.trim())el.setAttribute(a,tr)}
  document.title=t(document.title);
}

// Game data (holes, worlds): every string with a translation is replaced in place.
// A hole's two-line title is looked up as one ("SPÖK|KANONEN"), since languages put
// the words in different orders. Internal keys never match a Swedish text.
export function translateData(value){
  if(lang==='sv'||!value||typeof value!=='object')return value;
  if(Array.isArray(value)){value.forEach((v,i)=>{if(typeof v==='string')value[i]=t(v);else translateData(v)});return value}
  for(const [key,v] of Object.entries(value)){
    if(key==='title'&&Array.isArray(v)&&v.length===2&&v.every(s=>typeof s==='string')){
      const joined=t(v.join('|'));value[key]=joined.includes('|')?joined.split('|'):v.map(s=>t(s));
    }else if(typeof v==='string')value[key]=t(v);
    else if(v&&typeof v==='object'&&Object.getPrototypeOf(v)===Object.prototype||Array.isArray(v))translateData(v);
  }
  return value;
}
