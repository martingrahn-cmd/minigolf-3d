// How the players in a room reach each other. One small interface over two
// transports:
//   - Supabase Realtime (broadcast and presence), used online. No database
//     tables are needed; the room is just a channel named after its code.
//   - A local transport over BroadcastChannel, for tabs in the same browser
//     (development, tests and trying it out alone). `?net=local` picks it.
//
//   const link=await connect(code,me);
//   link.on('ball',(data,from)=>…); link.send('ball',{x,y,z});
//   link.onPlayers(players=>…);     // [{id,name,joinedAt}], everyone present, me included
//   link.close();

import { SUPABASE } from './supabase-config.js';

const CONFIG={url:import.meta.env?.VITE_SUPABASE_URL||SUPABASE.url,key:import.meta.env?.VITE_SUPABASE_ANON_KEY||SUPABASE.anonKey};
const forceLocal=()=>typeof location!=='undefined'&&new URLSearchParams(location.search).get('net')==='local';
export const transportName=()=>forceLocal()||!CONFIG.url||!CONFIG.key?'local':'supabase';
// Online play is offered when the game is built with a Supabase project, or for testing.
export const multiplayerAvailable=()=>transportName()==='supabase'||forceLocal()||!!import.meta.env?.DEV;

function hub(me){
  const handlers=new Map(),watchers=new Set();let last=null;
  return {
    on(type,fn){if(!handlers.has(type))handlers.set(type,new Set());handlers.get(type).add(fn);return()=>handlers.get(type).delete(fn)},
    // A late listener hears the current list straight away.
    onPlayers(fn){watchers.add(fn);if(last)fn(last);return()=>watchers.delete(fn)},
    dispatch(message){if(!message||message.from===me.id)return;for(const fn of handlers.get(message.type)||[])fn(message.data,message.from)},
    players(list){last=list;for(const fn of watchers)fn(list)},
  };
}

export async function connect(code,me){
  return transportName()==='supabase'?connectSupabase(code,me):connectLocal(code,me);
}

async function connectSupabase(code,me){
  const {createClient}=await import('@supabase/supabase-js');
  const client=createClient(CONFIG.url,CONFIG.key,{auth:{persistSession:false},realtime:{params:{eventsPerSecond:30}}});
  const events=hub(me);
  const channel=client.channel(`minimayhem-${code}`,{config:{broadcast:{self:false},presence:{key:me.id}}});
  channel.on('broadcast',{event:'msg'},({payload})=>events.dispatch(payload));
  channel.on('presence',{event:'sync'},()=>{
    const state=channel.presenceState();
    events.players(Object.values(state).map(list=>list[0]).filter(Boolean));
  });
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error('Kunde inte nå servern')),10000);
    channel.subscribe(async status=>{
      if(status==='SUBSCRIBED'){clearTimeout(timer);await channel.track({id:me.id,name:me.name,joinedAt:me.joinedAt});resolve()}
      else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(timer);reject(new Error('Kunde inte ansluta till rummet'))}
    });
  });
  return {
    ...events,
    send(type,data){channel.send({type:'broadcast',event:'msg',payload:{type,from:me.id,data}})},
    rename(name){me.name=name;channel.track({id:me.id,name,joinedAt:me.joinedAt})},
    close(){channel.unsubscribe();client.removeAllChannels()},
  };
}

// Same-browser rooms: messages over BroadcastChannel and a presence heartbeat.
function connectLocal(code,me){
  const channel=new BroadcastChannel(`minimayhem-${code}`),events=hub(me),seen=new Map();
  const post=(type,data)=>channel.postMessage({type,from:me.id,data});
  const list=()=>[{id:me.id,name:me.name,joinedAt:me.joinedAt},...[...seen.values()].map(s=>s.player)];
  let last='';
  const publish=()=>{const players=list(),key=JSON.stringify(players);if(key!==last){last=key;events.players(players)}};
  channel.onmessage=({data:message})=>{
    if(message.type==='presence'){seen.set(message.from,{player:message.data,at:Date.now()});publish();return}
    if(message.type==='bye'){seen.delete(message.from);publish();return}
    events.dispatch(message);
  };
  const beat=()=>{post('presence',{id:me.id,name:me.name,joinedAt:me.joinedAt});for(const [id,s] of seen)if(Date.now()-s.at>3500)seen.delete(id);publish()};
  const timer=setInterval(beat,1000);beat();
  addEventListener('pagehide',()=>post('bye',{}));
  return Promise.resolve({
    ...events,
    send:post,
    rename(name){me.name=name;beat()},
    close(){clearInterval(timer);post('bye',{});channel.close()},
  });
}
