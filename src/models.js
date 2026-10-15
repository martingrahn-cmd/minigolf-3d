import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Blender models from blender/build.py, exported to public/assets/models. They are
// loaded before a hole is built; code that draws a part asks for an instance and
// falls back to its procedural stand-in when the model is missing.
const loader=new GLTFLoader(),library=new Map();
const url=name=>`${import.meta.env?.BASE_URL??'/'}assets/models/${name}.glb`;

export const COMMON_MODELS=['common/flag'];
export const MOON_MODELS=['moon/rocket','moon/asteroid-0','moon/asteroid-1','moon/asteroid-2','moon/lantern','moon/tent'];

export async function preloadModels(names){
  await Promise.all(names.map(async name=>{
    if(library.has(name))return;
    try{
      const gltf=await loader.loadAsync(url(name));
      gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
      library.set(name,gltf.scene);
    }catch(error){console.warn('Kunde inte läsa modell',name,error);library.set(name,null)}
  }));
}

// A fresh copy that shares geometry and materials with the loaded model.
export function modelInstance(name){
  const source=library.get(name);
  return source?source.clone(true):null;
}

// Give an instance its own copies of the named materials, recoloured.
export function tintMaterials(object,colors){
  const copies=new Map();
  object.traverse(o=>{
    if(!o.isMesh)return;
    const swap=m=>{
      const color=colors[m.name]??colors['*'];
      if(color===undefined)return m;
      if(!copies.has(m)){const copy=m.clone();copy.color.set(color);copies.set(m,copy)}
      return copies.get(m);
    };
    o.material=Array.isArray(o.material)?o.material.map(swap):swap(o.material);
  });
  return object;
}
