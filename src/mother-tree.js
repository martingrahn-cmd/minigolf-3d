import { BALL_RADIUS } from './mechanics.js';

// The Mother Tree's eye is a round tunnel along +x through the trunk. A drum
// flight must cross both tunnel mouths inside the opening. Crossing either
// mouth plane beside it, within the trunk, its buttress roots and vine curtain,
// means the ball hits the tree. The same numbers drive the visible tunnel.
export function eyeMouths(eye){
  return [eye.x-eye.depth/2,eye.x+eye.depth/2];
}

export function eyeClearance(eye){
  return eye.radius-BALL_RADIUS-.1;
}

// Returns 'eye' when a segment passes a mouth inside the opening, 'bark' when it
// strikes the tree or the tunnel wall, and null otherwise.
export function crossTreeEye(previous,position,eye){
  if(!eye||position.x<=previous.x)return null;
  const [front,back]=eyeMouths(eye);
  let result=null;
  for(const plane of [front,back]){
    if(previous.x>=plane||position.x<plane)continue;
    const t=(plane-previous.x)/(position.x-previous.x);
    const y=previous.y+(position.y-previous.y)*t+BALL_RADIUS+.04;
    const z=previous.z+(position.z-previous.z)*t;
    if(Math.hypot(y-eye.y,z-eye.z)<eyeClearance(eye))result='eye';
    else if(Math.abs(z-eye.z)<eye.blockHalfWidth)return 'bark';
  }
  // Inside the tunnel a ball that drops too low lands in the heartwood.
  if(position.x>front&&position.x<back&&Math.abs(position.z-eye.z)<eye.blockHalfWidth&&Math.hypot(position.y+BALL_RADIUS+.04-eye.y,position.z-eye.z)>=eyeClearance(eye))return 'bark';
  return result;
}
