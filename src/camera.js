/* One continuous observation path. A page holds its last composition; the next
 * begins there, rather than returning to a shared wide shot after every action. */
window.ReactionCamera = (() => {
  'use strict';
  const clamp=x=>Math.min(1,Math.max(0,x));
  const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
  const finite=(x,f=0)=>Number.isFinite(Number(x))?Number(x):f;
  const fields=['distance','azimuth','elevation','lookY','offset','fov','focusX','focusZ'];
  const point=(distance,azimuth,elevation,anchor,screenX=.755)=>({distance,azimuth,elevation,lookY:anchor[1],focusX:anchor[0],focusZ:anchor[2],screenX,fov:34});
  const opening=point(12.8,.48,.26,[1.5,2.75,1.3]);
  const monitor=point(7.5,.48,.31,[1.4,2.88,1.05]);
  const face=point(5.9,-.88,.12,[2.40,2.95,2.46]);
  const context=point(13.3,-.58,.21,[2.1,3.25,1.9]);
  const hands=point(10.5,.30,.39,[2.22,2.2,1.63]);
  const entry=point(10.1,.39,.30,[1.4,2.8,1.05]);
  const reflection=point(12.3,-.44,.17,[2.5,3.0,2.8]);
  const audience=point(10.9,-.47,.13,[2.5,3.15,2.8]);
  const shutdown=point(10.7,.22,.34,[2.22,2.3,1.7]);
  const bow=point(13.8,-.50,.10,[2.85,2.2,3.65]);
  const shots={
    0:{name:'Stay beside the reaction test',duration:18,keys:[[0,opening],[3.0,monitor],[18,monitor]]},
    1:{name:'Follow attention from the screen to the face',duration:14,keys:[[0,monitor],[4.6,face],[14,face]]},
    2:{name:'Let the question open into its surroundings',duration:18,keys:[[0,face],[3.4,context],[18,context]]},
    3:{name:'Follow the hands introducing the method',duration:10,keys:[[0,context],[3.5,hands],[10,hands]]},
    4:{name:'Turn toward the monitor without a reset',duration:3.0,keys:[[0,hands],[3.0,entry]]},
    12:{name:'A quiet push toward the reflection',duration:10,keys:[[0,reflection],[3.8,audience],[10,audience]]},
    13:{name:'Follow the closing gesture to the keyboard',duration:8,keys:[[0,audience],[3.2,shutdown],[8,shutdown]]},
    14:{name:'Make room for the horse-riding dance and closing bow',duration:24,keys:[[0,shutdown],[2.9,bow],[24,bow]]}
  };
  const getShot=i=>shots[Math.round(finite(i,-1))]||null;
  const episodeDuration=i=>getShot(i)?.duration||0;
  function sample(base,index,seconds,options={}){
    const shot=getShot(index);
    if(!shot)return {...base,focusX:finite(base.focusX),focusZ:finite(base.focusZ)};
    const t=Math.min(shot.duration,Math.max(0,finite(seconds)));
    let a=shot.keys[0],b=shot.keys[shot.keys.length-1];
    for(let j=1;j<shot.keys.length;j++)if(t<=shot.keys[j][0]){a=shot.keys[j-1];b=shot.keys[j];break;}
    const p=smooth((t-a[0])/Math.max(.001,b[0]-a[0]));
    const pose={...base};
    for(const k of ['distance','azimuth','elevation','lookY','focusX','focusZ','fov'])pose[k]=a[1][k]+(b[1][k]-a[1][k])*p;
    const screenX=a[1].screenX+(b[1].screenX-a[1].screenX)*p;
    pose.offset=(2*screenX-1)*Math.tan(pose.fov*Math.PI/360)*Math.max(.1,finite(options.aspect,16/9))*pose.distance;
    return pose;
  }
  function toView(pose){
    const az=pose.azimuth,el=pose.elevation,right=[Math.cos(az),0,-Math.sin(az)];
    const back=[Math.sin(az)*Math.cos(el),Math.sin(el),Math.cos(az)*Math.cos(el)],up=[-Math.sin(az)*Math.sin(el),Math.cos(el),-Math.cos(az)*Math.sin(el)];
    const focus=[finite(pose.focusX),pose.lookY,finite(pose.focusZ)],target=focus.map((x,i)=>x-right[i]*pose.offset);
    return {position:target.map((x,i)=>x+back[i]*pose.distance),target,right,up,back,fov:pose.fov};
  }
  return Object.freeze({sample,getShot,episodeDuration,toView,fields});
})();
