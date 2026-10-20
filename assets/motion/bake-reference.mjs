// Extract CC0 joint motion without meshes or an additional runtime GLB loader.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
const sourceDir=process.argv[2];
if(!sourceDir)throw new Error('Usage: node assets/motion/bake-reference.mjs /path/to/downloaded/animations');
const three=fs.readFileSync(path.join(projectRoot,'vendor/three.module.min.js'),'utf8');
const T=await import('data:text/javascript;base64,'+Buffer.from(three).toString('base64'));
const round=x=>Math.round(x*1e6)/1e6;
const selected={
 'human-base-animations.glb':['Sitting_Idle','Sitting_Talking','Sitting_Exit'],
 'human-addon-animations.glb':['Idle Listening','Head Nod','Confused','Bow','Idle_Subtle']
};
const output={source:'Mesh2Motion/mesh2motion-app',commit:'653a9698f5f315523072f1c3ff3496100401317b',license:'CC0-1.0',fps:30,clips:{}};
for(const [file,names] of Object.entries(selected)){
 const bytes=fs.readFileSync(path.join(sourceDir,file));
 const length=bytes.readUInt32LE(12),gltf=JSON.parse(bytes.subarray(20,20+length)),bin=bytes.subarray(28+length);
 function accessor(id){
  const a=gltf.accessors[id],v=gltf.bufferViews[a.bufferView],size={SCALAR:1,VEC3:3,VEC4:4}[a.type];
  if(a.componentType!==5126||v.byteStride)throw Error('Unexpected accessor format');
  const start=(v.byteOffset||0)+(a.byteOffset||0);const out=[];
  for(let i=0;i<a.count*size;i++)out.push(bin.readFloatLE(start+i*4));return out;
 }
 const nodes=gltf.nodes.map((n,i)=>{
  const o=new T.Object3D();o.name=n.name||'node_'+i;
  o.position.fromArray(n.translation||[0,0,0]);o.quaternion.fromArray(n.rotation||[0,0,0,1]);o.scale.fromArray(n.scale||[1,1,1]);return o;
 });
 const root=new T.Group(),parents=new Map();
 gltf.nodes.forEach((n,i)=>{for(const c of n.children||[]){nodes[i].add(nodes[c]);parents.set(c,i);}});
 nodes.forEach((o,i)=>{if(!parents.has(i))root.add(o);});root.updateMatrixWorld(true);
 const rest=nodes.map(o=>({p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()}));
 const include=['spine_01','spine_02','spine_03','neck_01','head','clavicle_l','clavicle_r','upperarm_l','lowerarm_l','hand_l','upperarm_r','lowerarm_r','hand_r'];
 for(const side of ['l','r'])for(const finger of ['index','middle','ring','pinky','thumb'])for(let i=1;i<=3;i++)include.push(`${finger}_0${i}_${side}`);
 for(const name of names){
  const a=gltf.animations.find(a=>a.name===name);if(!a)throw Error(name);
  const tracks=a.channels.map(c=>{
   const s=a.samplers[c.sampler],time=accessor(s.input),values=accessor(s.output),target=nodes[c.target.node].name,property=c.target.path;
   const track=property==='rotation'?new T.QuaternionKeyframeTrack(target+'.quaternion',time,values):new T.VectorKeyframeTrack(target+'.'+(property==='translation'?'position':'scale'),time,values);
   return track;
  });
  nodes.forEach((o,i)=>{o.position.copy(rest[i].p);o.quaternion.copy(rest[i].q);o.scale.copy(rest[i].s);});
  const clip=new T.AnimationClip(name,-1,tracks),mixer=new T.AnimationMixer(root),action=mixer.clipAction(clip);
  action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();mixer.setTime(0);root.updateMatrixWorld(true);
  const refs=new Map(include.map(k=>{const o=root.getObjectByName(k);return [k,{q:o.quaternion.clone(),world:o.getWorldQuaternion(new T.Quaternion())}];}));
  const pelvis=root.getObjectByName('pelvis'),p0=pelvis.getWorldPosition(new T.Vector3());
  const sourceHeight=root.getObjectByName('head').getWorldPosition(new T.Vector3()).y+.2;
  const firstHand={},firstElbow={};for(const side of ['l','r']){firstHand[side]=root.getObjectByName('hand_'+side).getWorldPosition(new T.Vector3()).sub(p0);firstElbow[side]=root.getObjectByName('lowerarm_'+side).getWorldPosition(new T.Vector3()).sub(p0);}
  const count=Math.ceil(clip.duration*30)+1,bones=Object.fromEntries(include.map(k=>[k,[]])),handOffsets={l:[],r:[]},elbowOffsets={l:[],r:[]};
  for(let frame=0;frame<count;frame++){
   const t=Math.min(clip.duration,frame/30);action.paused=false;mixer.setTime(t);root.updateMatrixWorld(true);
   for(const k of include){
    const o=root.getObjectByName(k),ref=refs.get(k);
    const localDelta=ref.q.clone().invert().multiply(o.quaternion);
    const canonical=ref.world.clone().multiply(localDelta).multiply(ref.world.clone().invert()).normalize();
    if(canonical.w<0)canonical.set(-canonical.x,-canonical.y,-canonical.z,-canonical.w);
    bones[k].push(...canonical.toArray().map(round));
   }
   for(const side of ['l','r']){
    const d=root.getObjectByName('hand_'+side).getWorldPosition(new T.Vector3()).sub(pelvis.getWorldPosition(new T.Vector3())).sub(firstHand[side]).multiplyScalar(4.5/sourceHeight);
    handOffsets[side].push(...d.toArray().map(round));
    const elbow=root.getObjectByName('lowerarm_'+side).getWorldPosition(new T.Vector3()).sub(pelvis.getWorldPosition(new T.Vector3())).sub(firstElbow[side]).multiplyScalar(4.5/sourceHeight);
    elbowOffsets[side].push(...elbow.toArray().map(round));
   }
  }
  output.clips[name]={duration:round(clip.duration),count,bones,handOffsets,elbowOffsets};
  const maxHand=Object.fromEntries(Object.entries(handOffsets).map(([k,a])=>[k,[0,1,2].map(axis=>round(Math.max(...a.filter((_,i)=>i%3===axis).map(Math.abs))))]));
  console.log(JSON.stringify({name,duration:clip.duration,count,maxHand}));
  mixer.stopAllAction();mixer.uncacheRoot(root);
 }
}
const prior=JSON.parse(fs.readFileSync(path.join(projectRoot,'assets/motion/study-motion.json'),'utf8'));
if(prior.dance)output.dance=prior.dance;
fs.writeFileSync(path.join(projectRoot,'assets/motion/study-motion.json'),JSON.stringify(output));

// Bake the target-specific full-body closing sequence after the additive layer.
await import('./bake-closing.mjs');
