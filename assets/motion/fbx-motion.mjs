// Build-time only: Mixamo FBX to the same canonical source-rig interface as GLB.
// The FBX remains a private build input; only the incorporated retargeted
// performance is embedded in this presentation. No browser FBX dependency.
import fs from 'node:fs';
import path from 'node:path';
import {T,base} from './glb-motion.mjs';
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const tu=uri(fs.readFileSync(path.join(base,'vendor/three.module.min.js'),'utf8'));
const read=name=>fs.readFileSync(path.join(base,'vendor/fbx-build',name),'utf8');
const utils=uri(read('NURBSUtils.js').replace(/from 'three'/g,'from '+JSON.stringify(tu)));
const curve=uri(read('NURBSCurve.js').replace(/from 'three'/g,'from '+JSON.stringify(tu)).replace(/from '\.\.\/curves\/NURBSUtils\.js'/g,'from '+JSON.stringify(utils)));
const flate=uri(read('fflate.module.js'));
const loader=uri(read('FBXLoader.js').replace(/from 'three'/g,'from '+JSON.stringify(tu)).replace(/from '\.\.\/libs\/fflate\.module\.js'/g,'from '+JSON.stringify(flate)).replace(/from '\.\.\/curves\/NURBSCurve\.js'/g,'from '+JSON.stringify(curve)));
const {FBXLoader}=await import(loader);
export function sourceFBXRig(file){
 const bytes=fs.readFileSync(file),root=new FBXLoader().parse(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 root.scale.multiplyScalar(.01);root.updateMatrixWorld(true); // Source is centimetres.
 const nodes=[];root.traverse(o=>nodes.push(o));
 const rest=nodes.map(o=>({p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()}));
 const aliases={pelvis:'Hips',spine_01:'Spine',spine_02:'Spine1',spine_03:'Spine2',neck_01:'Neck',head:'Head'};
 for(const side of ['l','r'])for(const [k,v]of Object.entries({clavicle:'Shoulder',upperarm:'Arm',lowerarm:'ForeArm',hand:'Hand',thigh:'UpLeg',calf:'Leg',foot:'Foot'}))aliases[k+'_'+side]=(side==='l'?'Left':'Right')+v;
 for(const side of ['l','r'])for(const digit of ['index','middle','ring','pinky','thumb'])for(let n=1;n<=3;n++)aliases[`${digit}_0${n}_${side}`]=(side==='l'?'Left':'Right')+'Hand'+digit[0].toUpperCase()+digit.slice(1)+n;
 const get=name=>root.getObjectByName('mixamorig'+(aliases[name]||name));
 const reset=()=>{nodes.forEach((o,i)=>{o.position.copy(rest[i].p);o.quaternion.copy(rest[i].q);o.scale.copy(rest[i].s);});root.updateMatrixWorld(true);};
 // Symmetric time filtering removes high-frequency wrist/shoulder whip from
 // the mocap without changing its order, poses or authored dance vocabulary.
 // It is deterministic, build-time signal cleanup, not new choreography.
 const original=root.animations[0],sigma=.125,legSigma=.165,step=1/60,count=Math.round(original.duration*60)+1,times=Array.from({length:count},(_,i)=>Math.min(i*step,original.duration));
 const filtered=original.tracks.map(track=>{
  const interpolant=track.createInterpolant(),size=track.getValueSize(),quaternion=track.name.endsWith('.quaternion');
  const trackSigma=/Hips|UpLeg|Leg|Foot|Toe/.test(track.name)?legSigma:sigma;
  const values=[];
  for(const time of times){
   const center=Array.from(interpolant.evaluate(time)),sum=new Array(size).fill(0);let total=0;
   for(let offset=-30;offset<=30;offset++){
    const v=interpolant.evaluate(Math.max(0,Math.min(original.duration,time+offset*step))),w=Math.exp(-.5*(offset*step/trackSigma)**2),sign=quaternion&&v.reduce((a,x,i)=>a+x*center[i],0)<0?-1:1;
    total+=w;for(let j=0;j<size;j++)sum[j]+=v[j]*w*sign;
   }
   const v=sum.map(x=>x/total);if(quaternion){const q=new T.Quaternion().fromArray(v).normalize();values.push(...q.toArray());}else values.push(...v);
  }
  return quaternion?new T.QuaternionKeyframeTrack(track.name,times,values):new T.VectorKeyframeTrack(track.name,times,values);
 });
 let mixer,action,clip;
 function play(){mixer?.stopAllAction();reset();clip=new T.AnimationClip(original.name,original.duration,filtered);mixer=new T.AnimationMixer(root);action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();sample(0);return clip;}
 function sample(t){action.paused=false;mixer.setTime(Math.max(0,Math.min(clip.duration,t)));root.updateMatrixWorld(true);return root;}
 return {root,nodes,reset,play,sample,get,filterSigma:sigma,legFilterSigma:legSigma,animations:root.animations.map(a=>a.name)};
}
