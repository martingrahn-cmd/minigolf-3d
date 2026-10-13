// Notices a newer deploy and offers an update button. Checks on start, when the game
// comes back to the foreground and every few minutes. Off in the dev server.
/* global __APP_VERSION__ */
export const APP_VERSION=typeof __APP_VERSION__==='undefined'?{id:'dev',label:'utveckling'}:__APP_VERSION__;

export function watchForUpdates(onUpdate,{interval=5*60*1000}={}){
  if(import.meta.env?.DEV||APP_VERSION.id==='dev')return;
  let found=false;
  async function check(){
    if(found)return;
    try{
      const response=await fetch(`version.json?t=${Date.now()}`,{cache:'no-store'});
      if(!response.ok)return;
      const latest=await response.json();
      if(latest.id&&latest.id!==APP_VERSION.id){found=true;onUpdate(latest)}
    }catch{/* offline or blocked: try again later */}
  }
  check();
  setInterval(check,interval);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
}

// Reload with the new id in the URL so neither the browser nor GitHub Pages' cache
// hands back the old index.html. Hole and prototype parameters are kept.
export function applyUpdate(latest){
  const url=new URL(window.location.href);
  url.searchParams.set('v',latest.id);
  window.location.replace(url.toString());
}
