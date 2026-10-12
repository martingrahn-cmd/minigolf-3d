import { HalfFloatType, Vector2, WebGLRenderTarget } from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Short-range ambient occlusion grounds the carved props and fence posts.
// Bloom only catches the brightest crystal highlights; turf stays crisp.
export function createForestRenderer(renderer,scene,camera){
  const target=new WebGLRenderTarget(1,1,{type:HalfFloatType,samples:Math.min(4,renderer.capabilities.maxSamples)});
  const composer=new EffectComposer(renderer,target);
  const color=new RenderPass(scene,camera),ao=new SSAOPass(scene,camera,1,1,16);
  ao.kernelRadius=.8;ao.minDistance=.00005;ao.maxDistance=.013;
  const bloom=new UnrealBloomPass(new Vector2(1,1),.16,.3,1.35);
  const crowns=[];scene.traverse(o=>{if(o.userData.forestOccluder)crowns.push(o)});
  const renderAO=ao.render.bind(ao);
  ao.render=(...args)=>{
    // Faded foreground leaves must not leave opaque shadows in the AO buffer.
    const hidden=crowns.filter(o=>o.visible&&o.material.opacity<.98);
    for(const crown of hidden)crown.visible=false;
    try{renderAO(...args)}finally{for(const crown of hidden)crown.visible=true}
  };
  composer.addPass(color);composer.addPass(ao);composer.addPass(bloom);composer.addPass(new OutputPass());
  let perspective=true;
  return {
    resize(w,h){
      composer.setSize(w,h);
      const ratio=renderer.getPixelRatio();
      ao.setSize(Math.round(w*ratio*.65),Math.round(h*ratio*.65));
    },
    render(activeCamera){
      color.camera=ao.camera=activeCamera;
      const next=!!activeCamera.isPerspectiveCamera;
      if(next!==perspective){
        perspective=next;ao.ssaoMaterial.defines.PERSPECTIVE_CAMERA=Number(next);ao.ssaoMaterial.needsUpdate=true;
      }
      const uniforms=ao.ssaoMaterial.uniforms;
      uniforms.cameraNear.value=activeCamera.near;uniforms.cameraFar.value=activeCamera.far;
      uniforms.cameraProjectionMatrix.value.copy(activeCamera.projectionMatrix);
      uniforms.cameraInverseProjectionMatrix.value.copy(activeCamera.projectionMatrixInverse);
      composer.render();
    },
  };
}
