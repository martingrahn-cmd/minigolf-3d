import * as THREE from 'three';
import { BALL_RADIUS } from './mechanics.js';

export function createGolfBall() {
  const geometry=new THREE.SphereGeometry(BALL_RADIUS,128,96);
  const centers=[];
  const count=300,goldenAngle=Math.PI*(3-Math.sqrt(5));
  for(let i=0;i<count;i++){
    const y=1-2*(i+.5)/count,r=Math.sqrt(1-y*y),a=i*goldenAngle;
    centers.push(new THREE.Vector3(r*Math.cos(a),y,r*Math.sin(a)));
  }
  const positions=geometry.attributes.position,normal=new THREE.Vector3();
  const angularRadius=.078,threshold=Math.cos(angularRadius);
  for(let i=0;i<positions.count;i++){
    normal.fromBufferAttribute(positions,i).normalize();
    let inset=0;
    for(const center of centers){
      const dot=normal.dot(center);
      if(dot<=threshold)continue;
      const t=Math.acos(Math.min(1,dot))/angularRadius;
      inset=Math.max(inset,.0075*(1-t*t)**2);
    }
    positions.setXYZ(i,normal.x*(BALL_RADIUS-inset),normal.y*(BALL_RADIUS-inset),normal.z*(BALL_RADIUS-inset));
  }
  geometry.computeVertexNormals();
  const ball=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({
    color:0xf7f9fc,roughness:.42,metalness:0,clearcoat:.22,clearcoatRoughness:.38,
  }));
  ball.castShadow=true;ball.receiveShadow=true;
  return ball;
}
