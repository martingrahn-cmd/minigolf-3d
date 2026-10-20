import * as THREE from 'three';

// The other players' balls in an online match: a ball in each player's colour
// with a name tag, eased towards the latest position heard over the network.
// They never touch the local ball or the course.
function nameTag(name,color){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=64;const ctx=canvas.getContext('2d');
  ctx.font='700 30px "DM Sans", sans-serif';const w=Math.min(240,ctx.measureText(name).width+36);
  ctx.fillStyle='rgba(20,14,34,.82)';ctx.beginPath();ctx.roundRect((256-w)/2,10,w,44,22);ctx.fill();
  ctx.fillStyle=`#${color.toString(16).padStart(6,'0')}`;ctx.beginPath();ctx.arc((256-w)/2+20,32,7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(name,(256-w)/2+34,33,w-44);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true}));
  sprite.scale.set(2.4,.6,1);sprite.renderOrder=10;return sprite;
}

export function createGhostBalls(scene,radius){
  const balls=new Map();
  function ensure(player){
    if(balls.has(player.id))return balls.get(player.id);
    const group=new THREE.Group();group.visible=false;scene.add(group);
    const ball=new THREE.Mesh(new THREE.SphereGeometry(radius,24,16),new THREE.MeshStandardMaterial({color:player.color,roughness:.35,emissive:player.color,emissiveIntensity:.25,transparent:true,opacity:.88}));
    ball.castShadow=true;group.add(ball);
    const ring=new THREE.Mesh(new THREE.RingGeometry(radius*1.05,radius*1.45,28),new THREE.MeshBasicMaterial({color:player.color,transparent:true,opacity:.5,depthWrite:false,side:THREE.DoubleSide}));
    ring.rotation.x=-Math.PI/2;group.add(ring);
    const tag=nameTag(player.name,player.color);tag.position.y=1.05;group.add(tag);
    const entry={group,ring,target:new THREE.Vector3(),seen:false,hidden:false};balls.set(player.id,entry);return entry;
  }
  return {
    // A position heard from another player: {x,y,z,hidden}.
    set(player,ball){
      if(!player)return;const e=ensure(player);e.target.set(ball.x,ball.y,ball.z);e.hidden=!!ball.hidden;
      if(!e.seen){e.group.position.copy(e.target);e.seen=true}
    },
    update(dt){
      for(const e of balls.values()){
        e.group.visible=e.seen&&!e.hidden;
        // Ease in over about a tenth of a second; jump if it is far behind (a respawn).
        if(e.group.position.distanceTo(e.target)>6)e.group.position.copy(e.target);
        else e.group.position.lerp(e.target,1-Math.exp(-14*dt));
        e.ring.position.y=-radius+.04;
      }
    },
  };
}
