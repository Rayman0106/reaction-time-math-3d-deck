import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export const base=fileURLToPath(new URL('../../',import.meta.url));
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const tu=uri(fs.readFileSync(path.join(base,'vendor/three.module.min.js'),'utf8'));
export const T=await import(tu);
const bu=uri(fs.readFileSync(path.join(base,'vendor/BufferGeometryUtils.js'),'utf8').replace(/from 'three'/g,'from '+JSON.stringify(tu)));
const lu=uri(fs.readFileSync(path.join(base,'vendor/GLTFLoader.js'),'utf8').replace(/from 'three'/g,'from '+JSON.stringify(tu)).replace(/from '\.\.\/utils\/BufferGeometryUtils\.js'/g,'from '+JSON.stringify(bu)));
const {GLTFLoader}=await import(lu);
export async function loadTarget(){
 const loader=new GLTFLoader();loader.register(()=>({name:'QA_TEXTURE_PIXELS_STUB',loadTexture(){return Promise.resolve(new T.Texture());}}));
 const b=fs.readFileSync(path.join(base,'assets/models/student.glb'));
 return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
}
export function sourceRig(file){
 const b=fs.readFileSync(file),len=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+len)),bin=b.subarray(28+len);
 function accessor(id){const a=j.accessors[id],v=j.bufferViews[a.bufferView],size={SCALAR:1,VEC3:3,VEC4:4}[a.type];const start=(v.byteOffset||0)+(a.byteOffset||0),out=[];if(a.componentType!==5126||v.byteStride)throw Error('format');for(let i=0;i<a.count*size;i++)out.push(bin.readFloatLE(start+i*4));return out;}
 const nodes=j.nodes.map((n,i)=>{const o=new T.Object3D();o.name=n.name||'node_'+i;o.position.fromArray(n.translation||[0,0,0]);o.quaternion.fromArray(n.rotation||[0,0,0,1]);o.scale.fromArray(n.scale||[1,1,1]);return o;});
 const root=new T.Group(),parents=new Set();j.nodes.forEach((n,i)=>{for(const c of n.children||[]){nodes[i].add(nodes[c]);parents.add(c);}});nodes.forEach((n,i)=>{if(!parents.has(i))root.add(n);});root.updateMatrixWorld(true);
 const rest=nodes.map(o=>({p:o.position.clone(),q:o.quaternion.clone(),s:o.scale.clone()}));
 const reset=()=>{nodes.forEach((o,i)=>{o.position.copy(rest[i].p);o.quaternion.copy(rest[i].q);o.scale.copy(rest[i].s);});root.updateMatrixWorld(true);};
 let mixer,action,clip;
 function play(name){mixer?.stopAllAction();reset();const a=j.animations.find(a=>a.name===name);if(!a)throw Error(name);clip=new T.AnimationClip(name,-1,a.channels.map(c=>{const s=a.samplers[c.sampler],property=c.target.path;return property==='rotation'?new T.QuaternionKeyframeTrack(nodes[c.target.node].name+'.quaternion',accessor(s.input),accessor(s.output)):new T.VectorKeyframeTrack(nodes[c.target.node].name+'.'+(property==='translation'?'position':'scale'),accessor(s.input),accessor(s.output));}));mixer=new T.AnimationMixer(root);action=mixer.clipAction(clip);action.setLoop(T.LoopOnce,1);action.clampWhenFinished=true;action.play();sample(0);return clip;}
 function sample(t){action.paused=false;mixer.setTime(Math.max(0,Math.min(clip.duration,t)));root.updateMatrixWorld(true);return root;}
 return {root,nodes,reset,play,sample,animations:j.animations.map(a=>a.name),get:name=>root.getObjectByName(name)};
}
