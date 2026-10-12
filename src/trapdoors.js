// The hinge animation and disappearing support use exactly the same cycle.
export function trapdoorPose(time,door){
  const period=door.closed+door.opened+2*door.travel;
  const t=((time-door.offset)%period+period)%period;
  let amount=0;
  if(t>=door.closed&&t<door.closed+door.travel)amount=(t-door.closed)/door.travel;
  else if(t>=door.closed+door.travel&&t<door.closed+door.travel+door.opened)amount=1;
  else if(t>=door.closed+door.travel+door.opened)amount=1-(t-door.closed-door.travel-door.opened)/door.travel;
  amount=amount*amount*(3-2*amount);
  const angle=amount*Math.PI*.48,supported=angle<.065;
  return{angle,supported,signal:!supported?'red':t>door.closed-.75?'amber':'green'};
}
export function trapdoorAt(x,z,doors=[]){
  return doors.find(d=>x>=d.x1&&x<d.x2&&Math.abs(z-d.z)<=d.halfWidth);
}
export function supportedByTrapdoors(x,z,time,doors=[]){
  const door=trapdoorAt(x,z,doors);
  return !door||trapdoorPose(time,door).supported;
}
