import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Each build gets its own version id. The bundle carries it and version.json publishes it,
// so a running game (also one started from the home screen) can notice a newer deploy.
function buildVersion(){
  let sha=(process.env.GITHUB_SHA||'').slice(0,7);
  if(!sha){try{sha=execSync('git rev-parse --short HEAD',{stdio:['ignore','pipe','ignore']}).toString().trim()}catch{sha='lokal'}}
  const stamp=new Date().toISOString().slice(0,16).replace('T',' ');
  return {id:`${sha}-${Date.now().toString(36)}`,label:`${stamp} · ${sha}`};
}
const version=buildVersion();

export default defineConfig({
  // Relative paths so the same build works at a domain root and under /minigolf-3d/ on GitHub Pages.
  base:'./',
  define:{__APP_VERSION__:JSON.stringify(version)},
  plugins:[{
    name:'version-json',
    apply:'build',
    generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify(version)})},
  }],
});
