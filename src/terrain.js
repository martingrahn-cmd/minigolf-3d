// Terrain height, gravity and friction are derived from the authored level data.
export function profileHeight(x,profile){
  if(x<=profile[0].x)return profile[0].y;
  for(let i=1;i<profile.length;i++){
    const a=profile[i-1],b=profile[i];
    if(x<=b.x)return a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
  }
  return profile.at(-1).y;
}
export function profileSlope(x,profile){
  for(let i=1;i<profile.length;i++){
    const a=profile[i-1],b=profile[i];
    if(x>=a.x&&x<b.x)return (b.y-a.y)/(b.x-a.x);
  }
  return 0;
}
export function surfaceFriction(x,z,surfaces=[]){
  return surfaces.find(s=>x>=s.x1&&x<=s.x2&&z>=s.z1&&z<=s.z2)?.friction??1.35;
}
