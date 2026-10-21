// Small stroke icons for the HUD and menus. Markup uses <i data-icon="name">,
// filled in by hydrateIcons so the same set works in static and generated HTML.
const PATHS={
  menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  map:'<path d="M9 4 3 6.5V20l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  follow:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/>',
  sound:'<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18 7a7 7 0 0 1 0 10"/>',
  mute:'<path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="m16 9.5 5 5m0-5-5 5"/>',
  restart:'<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4.5 4v4.5H9"/>',
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9v.4"/><path d="M12 16.8v.2"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  podium:'<path d="M3 20h18M5 20v-6h4v6M10 20V8h4v12M15 20v-9h4v9"/>',
  users:'<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 14.2A4.6 4.6 0 0 1 21 18.6"/>',
  aim:'<circle cx="12" cy="12" r="6.5"/><path d="M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5"/>',
  power:'<path d="M5 19v-3M10 19v-7M15 19v-10M20 19V5"/>',
  target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 11.9v.2"/>',
  flag:'<path d="M6 21V4h11l-2.5 4 2.5 4H6"/>',
};

export function icon(name){
  return `<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PATHS[name]||''}</svg>`;
}

export function setIcon(element,name){
  element.dataset.icon=name;element.innerHTML=icon(name);
}

export function hydrateIcons(root=document){
  for(const element of root.querySelectorAll('i[data-icon]'))element.innerHTML=icon(element.dataset.icon);
}
