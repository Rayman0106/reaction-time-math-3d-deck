// Full-body FK retarget in a shared auxiliary T pose, followed by contact IK.
// Reference: https://github.com/upf-gti/retargeting-threejs/blob/main/docs/Algorithm.md
// Independent implementation of its shared auxiliary-pose method.
import fs from 'node:fs';
import crypto from 'node:crypto';
import{T,base,sourceRig,loadTarget}from'./glb-motion.mjs';
globalThis.window={};
const source=fs.readFileSync(base+'/src/character.js','utf8');
eval(source.replace('  pose();','  for(const r of rest){r.bone.position.copy(r.position);r.bone.quaternion.copy(r.quaternion);r.bone.scale.copy(r.scale);}group.position.set(0,0,0);group.rotation.set(0,0,0);model.position.y+=(standingPelvis-seatedPelvisHeight);group.updateMatrixWorld(true);'));
const actor=window.createNathanCharacter(T,await loadTarget()),g=actor.group,model=actor.model;
const V=(...v)=>new T.Vector3(...v),Q=()=>new T.Quaternion(),Y=V(0,1,0);
const bones=[];g.traverse(o=>{if(o.isBone)bones.push(o);});
const rest=bones.map(b=>({b,p:b.position.clone(),q:b.quaternion.clone(),s:b.scale.clone()}));
const standModel=model.position.clone(),reset=()=>{for(const r of rest){r.b.position.copy(r.p);r.b.quaternion.copy(r.q);r.b.scale.copy(r.s);}model.position.copy(standModel);g.updateMatrixWorld(true);};
const pos=b=>b.getWorldPosition(V()),wq=b=>b.getWorldQuaternion(Q());
function setQ(b,q){b.quaternion.copy(wq(b.parent).invert().multiply(q)).normalize();b.updateWorldMatrix(false,true);}
function aim(b,c,d){setQ(b,Q().setFromUnitVectors(pos(c).sub(pos(b)).normalize(),d.clone().normalize()).multiply(wq(b)));}
function ik(a,b,c,target,pole){const root=pos(a),lenA=root.distanceTo(pos(b)),lenB=pos(b).distanceTo(pos(c)),dir=target.clone().sub(root),distance=Math.min(lenA+lenB-.00005,Math.max(Math.abs(lenA-lenB)+.00005,dir.length()));dir.normalize();const bend=pole.clone().sub(root);bend.addScaledVector(dir,-bend.dot(dir)).normalize();const along=(lenA*lenA+distance*distance-lenB*lenB)/(2*distance),height=Math.sqrt(Math.max(0,lenA*lenA-along*along));const knee=root.clone().addScaledVector(dir,along).addScaledVector(bend,height);aim(a,b,knee.sub(root));aim(b,c,target.clone().sub(pos(b)));}
const semantic={pelvis:'student_hip_rig',spine_01:'student_spine_01_rig',spine_02:'CC_Base_Spine01_04',spine_03:'student_spine_03_rig',neck_01:'student_neck_rig',head:'student_head_rig'};
for(const side of ['l','r']){for(const[k,t]of Object.entries({clavicle:'shoulder',upperarm:'upperarm',lowerarm:'lowerarm',hand:'hand',thigh:'upperleg',calf:'lowerleg',foot:'foot'}))semantic[k+'_'+side]='student_'+t+'_'+side+'_rig';}
const mapped=Object.entries(semantic).map(([key,name])=>({key,b:g.getObjectByName(name)}));
if(mapped.some(x=>!x.b))throw Error('Incomplete skeleton map');
mapped.sort((a,b)=>{const depth=o=>o.parent?1+depth(o.parent):0;return depth(a.b)-depth(b.b);});
const hip=g.getObjectByName(semantic.pelvis),legs=['l','r'].map(s=>({s,upper:g.getObjectByName(semantic['thigh_'+s]),lower:g.getObjectByName(semantic['calf_'+s]),foot:g.getObjectByName(semantic['foot_'+s])}));
const neutralFootQ=Object.fromEntries(legs.map(leg=>[leg.s,wq(leg.foot)]));
const neutralLookQ=Object.fromEntries(['neck_01','head'].map(k=>[k,wq(g.getObjectByName(semantic[k]))]));
const neutralLegQ=Object.fromEntries(legs.map(leg=>[leg.s,{upper:wq(leg.upper),lower:wq(leg.lower)}]));
const sourceDir=process.argv[2];
if(!sourceDir)throw new Error('Usage: node assets/motion/bake-reference.mjs /path/to/downloaded/animations');
const danceInput=process.argv[3]||process.env.REACTION_DANCE_FBX;
const files={rise:'human-base-animations.glb',turn:'human-mocap-animations.glb',bow:'human-addon-animations.glb',idle:'human-addon-animations.glb',...(danceInput?{dance:danceInput}:{})};
const {sourceFBXRig}=danceInput?await import('./fbx-motion.mjs'):{};
const round=x=>+x.toFixed(7),clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const rotate=(v,yaw)=>v.clone().applyAxisAngle(Y,yaw);
const players={};
for(const [key,file]of Object.entries(files)){
 const r=key==='dance'?sourceFBXRig(file):sourceRig(sourceDir+'/'+file);reset();
 // The imported student is in an A pose; the animation library is in a T pose.
 // Match the arm and leg directions before calculating bind corrections.
 for(const side of ['l','r'])for(const[k,c]of [['upperarm','lowerarm'],['lowerarm','hand'],['thigh','calf'],['calf','foot']]){
  const direction=pos(r.get(c+'_'+side)).sub(pos(r.get(k+'_'+side)));
  aim(g.getObjectByName(semantic[k+'_'+side]),g.getObjectByName(semantic[c+'_'+side]),direction);
 }
 const refs=new Map(mapped.map(({key,b})=>[key,{src:wq(r.get(key)).invert(),trg:wq(b)}]));
 const aux=rest.map(({b})=>({b,q:b.quaternion.clone()}));
 const fingers=[];
 if(key==='dance')for(const s of ['l','r'])for(const digit of ['index','middle','ring','pinky','thumb'])for(let n=1;n<=3;n++){
  const k=`${digit}_0${n}_${s}`,b=g.getObjectByName('student_'+k+'_rig');
  if(b&&r.get(k))fingers.push({key:k,b,src:wq(r.get(k)).invert(),trg:wq(b)});
 }
 const clip=r.play({rise:'Sitting_Exit',turn:'Turn_Left_90',bow:'Bow',idle:'Idle_Subtle',dance:'mixamo.com'}[key]);
 const p0=pos(r.get('pelvis')),feet0=Object.fromEntries(['l','r'].map(s=>[s,pos(r.get('foot_'+s))]));
 const heading=()=>{const d=wq(r.get('pelvis')).multiply(refs.get('pelvis').src);const f=V(0,0,1).applyQuaternion(d);return Math.atan2(f.x,f.z);};
 const yaw0=heading();r.sample(clip.duration);const yaw1=heading();r.sample(0);
 players[key]={r,refs,aux,clip,p0,feet0,yaw0,yaw1,fingers};
}
const scale=2.45,turnAngle=1.84;
const startFeet={l:V(.34,.1924,.97),r:V(-.29,.2174,.81)};
function raw(key,u,hipStart,feetStart,yawStart=0){
 const p=players[key];p.r.sample(clamp(u)*p.clip.duration);reset();for(const a of p.aux)a.b.quaternion.copy(a.q);g.updateMatrixWorld(true);
 // Register every clip to the same anatomical forward, not just the turn.
 const deltaQ=wq(p.r.get('pelvis')).multiply(p.refs.get('pelvis').src),forward=V(0,0,1).applyQuaternion(deltaQ),sourceYaw=Math.atan2(forward.x,forward.z);
 const relativeYaw=key==='turn'?(sourceYaw-p.yaw0)*turnAngle/(p.yaw1-p.yaw0):key==='dance'?sourceYaw-p.yaw0:0;
 const prefix=Q().setFromAxisAngle(Y,yawStart+relativeYaw-sourceYaw);
 for(const {key:k,b}of mapped){const ref=p.refs.get(k);setQ(b,prefix.clone().multiply(wq(p.r.get(k))).multiply(ref.src).multiply(ref.trg));}
 for(const finger of p.fingers)setQ(finger.b,prefix.clone().multiply(wq(p.r.get(finger.key))).multiply(finger.src).multiply(finger.trg));
 const sp=pos(p.r.get('pelvis')),delta=sp.clone().sub(p.p0);
 let hp;
 if(key==='rise'){
  const end=players.rise;end.r.sample(end.clip.duration);const endY=pos(end.r.get('pelvis')).y;end.r.sample(clamp(u)*end.clip.duration);
  hp=V(delta.x*scale,1.5+delta.y*(actor.metadata.standingPelvisHeight-1.5)/(endY-p.p0.y),delta.z*2.10);
 }else if(key==='turn')hp=hipStart.clone().add(rotate(V(delta.x*scale,delta.y*scale,delta.z*scale),-p.yaw0));
 else {if(key==='dance')delta.y*=.70;hp=hipStart.clone().add(rotate(delta.multiplyScalar(scale),yawStart-(key==='dance'?p.yaw0:0)));}
 model.position.add(hp.clone().sub(pos(hip)));g.updateMatrixWorld(true);
 const feet={},footQ={},poles={};
 for(const leg of legs){
  const srcFoot=pos(p.r.get('foot_'+leg.s));let f;
  if(key==='rise')f=feetStart[leg.s].clone().add(srcFoot.sub(p.feet0[leg.s]).multiply(V(2.10,scale,2.10)));
  else if(key==='turn'){
   const norm0=rotate(p.feet0[leg.s].clone().sub(p.p0).multiplyScalar(scale),-p.yaw0).add(hipStart);
   const norm=rotate(srcFoot.sub(p.p0).multiplyScalar(scale),-p.yaw0).add(hipStart);
   const registration=feetStart[leg.s].clone().sub(norm0);f=norm.add(rotate(registration,relativeYaw));
  }else f=feetStart[leg.s].clone().add(rotate(srcFoot.sub(p.feet0[leg.s]).multiplyScalar(scale),yawStart-(key==='dance'?p.yaw0:0)));
  footQ[leg.s]=wq(leg.foot);poles[leg.s]=pos(leg.lower).add(rotate(V(0,0,.8),yawStart+relativeYaw));
  feet[leg.s]=f;
 }
 return {q:rest.map(({b})=>b.quaternion.clone()),hip:hp,feet,footQ,poles,yaw:yawStart+relativeYaw};
}
function mix(a,b,u){const v=(x,y)=>x.clone().lerp(y,u),o={q:a.q.map((q,i)=>q.clone().slerp(b.q[i],u)),hip:v(a.hip,b.hip),feet:{},footQ:{},poles:{},yaw:a.yaw+(b.yaw-a.yaw)*u};for(const s of ['l','r']){o.feet[s]=v(a.feet[s],b.feet[s]);o.footQ[s]=a.footQ[s].clone().slerp(b.footQ[s],u);o.poles[s]=v(a.poles[s],b.poles[s]);}return o;}
// Short, decaying continuation of the outgoing velocity. A static last-pose
// crossfade made each clip stop before the next one started. Feet stay on their
// authored contact path; contact IK is still applied after the body blend.
// Design reference: https://theorangeduck.com/page/dead-blending
function continuePose(a,b,seconds,step=1/120){
 const p=mix(b,b,0),travel=.12*(1-Math.exp(-Math.max(0,seconds)/.12));
 p.hip.add(b.hip.clone().sub(a.hip).multiplyScalar(travel/step));
 p.yaw+=(b.yaw-a.yaw)*travel/step;
 p.q=b.q.map((q,i)=>{
  const delta=q.clone().multiply(a.q[i].clone().invert()).normalize();
  if(delta.w<0)delta.set(-delta.x,-delta.y,-delta.z,-delta.w);
  const length=Math.hypot(delta.x,delta.y,delta.z);
  if(length<1e-7)return q.clone();
  const angle=2*Math.atan2(length,delta.w)*travel/step;
  return Q().setFromAxisAngle(V(delta.x,delta.y,delta.z).divideScalar(length),angle).multiply(q).normalize();
 });
 return p;
}
const rise0=raw('rise',0,null,startFeet),rise1=raw('rise',1,null,startFeet);
// Register the next clip by the planted feet, then bring the pelvis over that
// support area. Registering only by hips rotates the seated forward offset to
// one side and makes the two calves cross into the opposite shorts opening.
const turnSource=players.turn,sourceSupport=rotate(turnSource.feet0.l.clone().add(turnSource.feet0.r).multiplyScalar(.5).sub(turnSource.p0).multiplyScalar(scale),-turnSource.yaw0);
const turnHip=rise1.feet.l.clone().add(rise1.feet.r).multiplyScalar(.5).sub(sourceSupport);turnHip.y=rise1.hip.y;
const turn0=raw('turn',0,turnHip,rise1.feet),turn1=raw('turn',1,turnHip,rise1.feet);
// Finish the turn with two short, sequential steps into a balanced stance.
// The old clip registration kept the rise's long diagonal foot separation.
const support=turn1.feet.l.clone().add(turn1.feet.r).multiplyScalar(.5);
const standingHip=V(support.x,actor.metadata.standingPelvisHeight-.018,support.z).add(rotate(V(0,0,-.055),turnAngle));
const standingFeet=Object.fromEntries(legs.map(leg=>[leg.s,V(support.x,startFeet[leg.s].y,support.z).add(rotate(V(leg.s==='l'?.265:-.265,0,leg.s==='l'?.018:-.018),turnAngle))]));
const standing=raw('idle',0,standingHip,standingFeet,turnAngle);
for(const leg of legs){
 standing.feet[leg.s]=standingFeet[leg.s].clone();
 standing.footQ[leg.s]=Q().setFromAxisAngle(Y,turnAngle+(leg.s==='l'?.035:-.035)).multiply(neutralFootQ[leg.s]);
 standing.poles[leg.s]=standingFeet[leg.s].clone().add(rotate(V(0,1,.9),turnAngle));
}
reset();rest.forEach((r,j)=>r.b.quaternion.copy(standing.q[j]));g.updateMatrixWorld(true);
model.position.add(standing.hip.clone().sub(pos(hip)));g.updateMatrixWorld(true);
const arms=['l','r'].map(s=>({s,upper:g.getObjectByName(semantic['upperarm_'+s]),lower:g.getObjectByName(semantic['lowerarm_'+s]),hand:g.getObjectByName(semantic['hand_'+s])}));
const relaxedArms=arms.map(arm=>{
 const wrist=rotate(pos(arm.hand).sub(pos(hip)),-turnAngle),elbow=rotate(pos(arm.lower).sub(pos(hip)),-turnAngle);
 wrist.x*=.83;wrist.z+=arm.s==='l'?.018:-.012;
 return {...arm,wrist,elbow,shoulderRest:pos(arm.upper),orientation:wq(arm.hand)};
});
function restrainedBow(u){
 // The source contains a very quick dip between two long idle holds. Retain
 // its actual joint shape, but give the audience one broad, eased bow.
 const t=6.25+clamp(u)*3.20,amount=smooth((t-6.25)/1.40)*(1-smooth((t-8.20)/1.55));
 const p=mix(standing,raw('bow',.45,standingHip,standingFeet,turnAngle),.85*amount);
 for(const leg of legs){p.feet[leg.s]=standing.feet[leg.s].clone();p.footQ[leg.s]=standing.footQ[leg.s].clone();p.poles[leg.s]=standing.poles[leg.s].clone();}
 return p;
}
function closeSteps(t){
 const p=mix(turn1,standing,smooth((t-4.78)/1.37));
 for(const leg of legs){
  const a=leg.s==='l'?4.87:5.45,b=leg.s==='l'?5.43:6.10,u=smooth((t-a)/(b-a));
  p.feet[leg.s]=turn1.feet[leg.s].clone().lerp(standing.feet[leg.s],u);
  p.feet[leg.s].y+=Math.sin(Math.PI*u)*.085;
  p.footQ[leg.s]=turn1.footQ[leg.s].clone().slerp(standing.footQ[leg.s],u);
 }
 // Shift gently towards the supporting foot, then settle over both feet.
 p.hip.add(rotate(V(.032*Math.sin(clamp((t-4.78)/1.37)*Math.PI*2),0,0),turnAngle));
 return p;
}
const timeline={rise:[1.26,2.98],turn:[2.82,4.95],closeSteps:[4.87,6.10],bow:[6.25,9.45],settle:[9.45,10.90],blendWindows:[[2.82,3.20],[4.72,5.10]]};
const rising=t=>raw('rise',clamp((t-1.26)/1.72),null,startFeet);
const turning=t=>raw('turn',clamp((t-2.82)/2.13),turnHip,rise1.feet);
const riseVelocity=[rising(2.98-1/120),rising(2.98)],turnVelocity=[turning(4.95-1/120),turning(4.95)];
function sample(t){
 if(t<1.26)return rise0;
 if(t<2.82)return rising(t);
 if(t<3.20)return mix(t<=2.98?rising(t):continuePose(...riseVelocity,t-2.98),turning(t),smooth((t-2.82)/.38));
 if(t<4.72)return turning(t);
 if(t<5.10)return mix(t<=4.95?turning(t):continuePose(...turnVelocity,t-4.95),closeSteps(t),smooth((t-4.72)/.38));
 if(t<6.15)return closeSteps(t);
 if(t<6.65)return mix(standing,restrainedBow(clamp((t-6.25)/3.20)),smooth((t-6.15)/.50));
 if(t<=9.45)return restrainedBow((t-6.25)/3.20);
 if(t<10.90)return mix(restrainedBow(1),standing,smooth((t-9.45)/1.45));
 return standing;
}
const frames=Array.from({length:721},(_,i)=>sample(i/60));
// Feet have one owner across clip changes. Source rise/turn clips briefly
// planted, lifted again and reversed the same foot at a blend boundary.
// Retain the body performance; use explicit support/swing paths for its feet.
const groundFeet={l:startFeet.l.clone().add(V(.32,0,0)),r:startFeet.r.clone()};
const risePlant={l:groundFeet.l.clone(),r:rise1.feet.r.clone()};
const turnPlant={l:turn1.feet.l.clone(),r:turn1.feet.r.clone()};
for(const s of ['l','r']){risePlant[s].y=startFeet[s].y;turnPlant[s].y=startFeet[s].y;}
const finalPlant=Object.fromEntries(['l','r'].map(s=>[s,standing.feet[s].clone().setY(startFeet[s].y)]));
const plans={
 l:[{a:3.02,b:3.65,from:risePlant.l,to:turnPlant.l,yaw0:0,yaw1:turnAngle*.65,arcX:.20},
    {a:4.95,b:5.70,from:turnPlant.l,to:finalPlant.l,yaw0:turnAngle*.65,yaw1:turnAngle+.035}],
 r:[{a:1.75,b:2.91,from:groundFeet.r,to:risePlant.r,yaw0:0,yaw1:0,height:.17},
    {a:3.40,b:4.65,from:risePlant.r,to:finalPlant.r,yaw0:0,yaw1:turnAngle-.035,arcX:-.50,arcZ:.35}]
};
timeline.footSteps=Object.fromEntries(Object.entries(plans).map(([side,steps])=>[side,steps.map(p=>({start:p.a,end:p.b,from:p.from.toArray(),to:p.to.toArray(),arc:[p.arcX||0,p.height||.075,p.arcZ||0]}))]));
for(let i=0;i<frames.length;i++){
 const time=i/60,f=frames[i];
 for(const leg of legs){
  const s=leg.s,plan=plans[s];let target=groundFeet[s].clone(),yaw=0,lift=0;
  if(s==='l')target.x=startFeet.l.x+.32*smooth((time-1.10)/.30);
  for(const step of plan){if(time<step.a)break;const u=smooth((time-step.a)/(step.b-step.a)),arc=Math.sin(Math.PI*u);target=step.from.clone().lerp(step.to,u);lift=(step.height||.075)*arc**2;target.y+=lift;target.x+=(step.arcX||0)*arc;target.z+=(step.arcZ||0)*arc;if(step.height)target.x-=.13*arc**2;yaw=step.yaw0+(step.yaw1-step.yaw0)*u;}
  f.feet[s]=target;
  f.footQ[s]=Q().setFromAxisAngle(Y,yaw).multiply(neutralFootQ[s]);
  f.poles[s]=target.clone().add(rotate(V(0,1,.9),yaw));
 }
}
const shoes={};g.traverse(m=>{if(m.isSkinnedMesh&&m.material.name==='shoes')shoes[m.name==='Object_25'?'l':m.name==='Object_27'?'r':m.name]=m;});
const data={source:'Mesh2Motion/mesh2motion-app',commit:'653a9698f5f315523072f1c3ff3496100401317b',license:'CC0-1.0',algorithm:'Shared auxiliary T pose; world quaternion FK retarget; overlapping clips with decaying outgoing velocity; gaze lead; relaxed-arm follow; foot-contact IK',fps:60,duration:12,timeline,boneNames:rest.map(r=>r.b.name),quaternions:[],pelvis:[],feet:{l:[],r:[]},contacts:{l:[],r:[]}};
let prev,minimum=Infinity,maxCorrection=0,maxHipLower=0;
for(let i=0;i<frames.length;i++){
 const f=frames[i];reset();rest.forEach((r,j)=>r.b.quaternion.copy(f.q[j]));g.updateMatrixWorld(true);model.position.add(f.hip.clone().sub(pos(hip)));g.updateMatrixWorld(true);
 const time=i/60,pulse=(a,b,c,d)=>smooth((time-a)/(b-a))*(1-smooth((time-c)/(d-c)));
 // Eyes/head anticipate the torso, rather than facing rigidly with the hips.
 const gazeLead=.26*pulse(2.44,2.96,3.55,4.75);
 for(const [key,weight]of[['neck_01',.40],['head',.60]]){
  const b=g.getObjectByName(semantic[key]);setQ(b,Q().setFromAxisAngle(Y,gazeLead*weight).multiply(wq(b)));
 }
 // Gravity-oriented arms with a little delayed follow, not frozen world
 // quaternions. Keep a soft elbow and different settling times on each side.
 const relaxWeight=smooth((time-4.68)/1.60),acknowledge=pulse(6.55,7.35,8.15,9.60);
 if(relaxWeight)for(const arm of relaxedArms){
  const old=[arm.upper,arm.lower,arm.hand].map(b=>b.quaternion.clone());
  const follow=arm.s==='l'?1:.77;
  const target=f.hip.clone().add(rotate(arm.wrist,turnAngle));
  const armLength=pos(arm.upper).distanceTo(pos(arm.lower))+pos(arm.lower).distanceTo(pos(arm.hand));
  const gravityTarget=pos(arm.upper).add(V(0,-armLength*.92,0)).add(rotate(V(arm.s==='l'?.05:-.05,0,.15),turnAngle));
  const bowFollow=pulse(6.25,7.65,8.20,9.75);
  target.lerp(gravityTarget,bowFollow);
  target.add(rotate(V(0,-.025*acknowledge,.085*acknowledge*follow),turnAngle));
  // Keep the elbow plane attached to its moving shoulder. A hip-fixed pole
  // crossed the arm axis in a deep bow and snapped the forearm sideways.
  const pole=pos(arm.upper).add(rotate(V(arm.s==='l'?.30:-.30,-.40,.40),turnAngle));
  ik(arm.upper,arm.lower,arm.hand,target,pole);
  const swing=.035*pulse(5.0,5.5,5.85,6.55)*(arm.s==='l'?1:-.65);
  const wristQ=Q().setFromAxisAngle(rotate(V(1,0,0),turnAngle),.09*acknowledge*follow+swing).multiply(arm.orientation);
  setQ(arm.hand,wristQ);
  for(const[j,b]of[arm.upper,arm.lower,arm.hand].entries())b.quaternion.copy(old[j].slerp(b.quaternion,relaxWeight));
  g.updateMatrixWorld(true);
 }
 // The source idle starts with an averted gaze. Register the closing glance
 // to the audience, while retaining a small head-led nod rather than a rigid
 // head that bows and turns at exactly the same rate as the torso.
 const lookWeight=smooth((time-4.65)/1.15),nod=.14*pulse(6.72,7.32,7.95,9.20);
 const torso=pos(g.getObjectByName(semantic.neck_01)).sub(pos(hip)),forward=rotate(V(0,0,1),turnAngle);
 const torsoPitch=Math.atan2(torso.dot(forward),torso.y);
 for(const[key,fraction]of[['neck_01',.28],['head',1]]){
  const b=g.getObjectByName(semantic[key]);
  const desired=Q().setFromAxisAngle(rotate(V(1,0,0),turnAngle),torsoPitch*(key==='head'?1:.82)+nod*fraction)
   .multiply(Q().setFromAxisAngle(Y,turnAngle)).multiply(neutralLookQ[key]);
  setQ(b,wq(b).slerp(desired,lookWeight));
 }
 // Match the target's anatomical roll before solving the source foot path.
 // Matching source joint quaternions alone left an axial thigh twist even
 // when the knees/ankles were correctly placed, shearing the garment waist.
 for(const leg of legs){
  const heading=Q().setFromAxisAngle(Y,f.yaw);
  setQ(leg.upper,heading.clone().multiply(neutralLegQ[leg.s].upper));
  setQ(leg.lower,heading.clone().multiply(neutralLegQ[leg.s].lower));
 }
 const targets={};
 for(const leg of legs){
  const t=f.feet[leg.s].clone();ik(leg.upper,leg.lower,leg.foot,t,f.poles[leg.s]);setQ(leg.foot,f.footQ[leg.s]);
  // Match the source's foot lift while keeping the actual sneaker sole above
  // the floor. This uses the skinned shoe vertices, rather than ankle height.
  const shoe=shoes[leg.s];let minY=Infinity;if(shoe){shoe.skeleton.update();for(let v=0;v<shoe.geometry.attributes.position.count;v++){const p=V();shoe.getVertexPosition(v,p);shoe.localToWorld(p);minY=Math.min(minY,p.y);}}
  const lift=Math.max(0,t.y-(leg.s==='l'?.1924:.2174));
  const correction=(.006+lift)-minY;maxCorrection=Math.max(maxCorrection,Math.abs(correction));t.y+=correction;
  targets[leg.s]={t,lift};
 }
 let lower=0;
 for(const leg of legs){const target=targets[leg.s].t,root=pos(leg.upper),len= root.distanceTo(pos(leg.lower))+pos(leg.lower).distanceTo(pos(leg.foot))-.015;const horizontal=(target.x-root.x)**2+(target.z-root.z)**2;const maxVertical=Math.sqrt(Math.max(0,len*len-horizontal));lower=Math.max(lower,root.y-target.y-maxVertical);}
 if(lower>0){model.position.y-=lower;maxHipLower=Math.max(maxHipLower,lower);g.updateMatrixWorld(true);}
 for(const leg of legs){const {t,lift}=targets[leg.s];ik(leg.upper,leg.lower,leg.foot,t,f.poles[leg.s]);setQ(leg.foot,f.footQ[leg.s]);data.feet[leg.s].push(...pos(leg.foot).toArray().map(round));data.contacts[leg.s].push(lift<.045?1:0);}
 for(let pass=0;pass<4;pass++)for(const leg of legs){
  const shoe=shoes[leg.s];shoe.skeleton.update();let y=Infinity;for(let j=0;j<shoe.geometry.attributes.position.count;j++){const p=V();shoe.getVertexPosition(j,p);shoe.localToWorld(p);y=Math.min(y,p.y);}
  const {t,lift}=targets[leg.s];t.y+=(.006+lift-y);ik(leg.upper,leg.lower,leg.foot,t,f.poles[leg.s]);setQ(leg.foot,f.footQ[leg.s]);
 }
 for(const leg of legs)pos(leg.foot).toArray().map(round).forEach((v,j)=>data.feet[leg.s][i*3+j]=v);
 g.updateMatrixWorld(true);for(const s of Object.values(shoes)){s.skeleton.update();for(let j=0;j<s.geometry.attributes.position.count;j++){const p=V();s.getVertexPosition(j,p);s.localToWorld(p);minimum=Math.min(minimum,p.y);}}
 const qs=rest.map(({b},j)=>{const q=b.quaternion.clone();if(prev&&q.dot(prev[j])<0)q.set(-q.x,-q.y,-q.z,-q.w);return q;});
 data.quaternions.push(...qs.flatMap(q=>q.toArray().map(round)));data.pelvis.push(...pos(hip).toArray().map(round));prev=qs;
}
// Include only bones that actually animate, keeping untouched helper joints in
// the original hierarchy instead of storing hundreds of identical channels.
const animated=rest.map((r,j)=>j).filter(j=>frames.some((_,i)=>i&&Math.abs(data.quaternions[(i*rest.length+j)*4]-data.quaternions[j*4])+Math.abs(data.quaternions[(i*rest.length+j)*4+1]-data.quaternions[j*4+1])+Math.abs(data.quaternions[(i*rest.length+j)*4+2]-data.quaternions[j*4+2])>1e-5)||mapped.some(x=>x.b===rest[j].b));
const stride=rest.length*4;data.boneNames=animated.map(j=>rest[j].b.name);data.quaternions=frames.flatMap((_,i)=>animated.flatMap(j=>data.quaternions.slice(i*stride+j*4,i*stride+j*4+4)));
data.diagnostics={minSoleY:minimum,maxGroundCorrection:maxCorrection,maxHipLower,animatedBones:data.boneNames.length,frames:frames.length,sourceTurnDegrees:(players.turn.yaw1-players.turn.yaw0)*180/Math.PI,retargetTurnDegrees:turnAngle*180/Math.PI};
const existing=JSON.parse(fs.readFileSync(base+'/assets/motion/study-motion.json','utf8'));existing.closing=data;fs.writeFileSync(base+'/assets/motion/study-motion.json',JSON.stringify(existing));
console.log(JSON.stringify(data.diagnostics));

// Retarget the licensed Mixamo performance as a separate one-shot clip. The
// original closing sequence above remains byte-for-byte reproducible. There
// are no authored dance joint curves here: only source FK, target proportions
// and sole/contact correction, sampled into the existing full-body channel map.
if(danceInput){
const dancePlayer=players.dance,steps=Math.round(dancePlayer.clip.duration*60),danceDuration=steps/60;
// Register the final shoe headings while each foot is airborne. Continuing
// the source's last ankle-yaw arc during the exit blend made a planted shoe
// swivel before the bow. The body choreography remains source-authored.
const danceFootSettles=Object.fromEntries([['r',5.94,6.34],['l',6.20,6.54]].map(([s,a,b])=>[s,{a,b,q:raw('dance',a/dancePlayer.clip.duration,standingHip,standingFeet,turnAngle).footQ[s].clone()}]));
const sourceFloor={l:Infinity,r:Infinity};
for(let i=0;i<=steps;i++){
 dancePlayer.r.sample(i/steps*dancePlayer.clip.duration);
 for(const s of ['l','r'])sourceFloor[s]=Math.min(sourceFloor[s],pos(dancePlayer.r.get('foot_'+s)).y);
}
const channelIndices=data.boneNames.map(name=>rest.findIndex(r=>r.b.name===name));
const dance={source:'https://github.com/V-Sekai/three-vrm-1-sandbox-mixamo',commit:'9c13ee8eeefcbf18a0bcc80cd49ac59cd4af73e4',license:'Adobe Mixamo: incorporated presentation performance',terms:'https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html',sourceFile:'Gangnam Style.fbx',sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(danceInput)).digest('hex'),sourceClip:'Gangnam Style',nativeDuration:dancePlayer.clip.duration,duration:danceDuration,fps:60,playbackRate:.78,loop:false,boneNames:data.boneNames,quaternions:[],pelvis:[],feet:{l:[],r:[]},contacts:{l:[],r:[]},algorithm:'Source-authored Mixamo performance; shared auxiliary-pose retarget and actual sneaker-sole contact IK. No procedural dance choreography.'};
 dance.filterSigma=dancePlayer.r.filterSigma;dance.legFilterSigma=dancePlayer.r.legFilterSigma;dance.retargetRange={maxFootLift:.26,hipVerticalGain:.70};
 dance.endingFootOrientations=Object.fromEntries(['l','r'].map(s=>[s,standing.footQ[s].toArray().map(round)]));
 dance.fingers={boneNames:dancePlayer.fingers.map(f=>f.b.name),rest:dancePlayer.fingers.flatMap(f=>rest.find(r=>r.b===f.b).q.toArray().map(round)),quaternions:[]};
let dancePrev,danceMin=Infinity,danceLower=0;
for(let i=0;i<=steps;i++){
 const f=raw('dance',i/steps,standingHip,standingFeet,turnAngle);
 for(const s of ['l','r']){const settle=danceFootSettles[s],sourceSeconds=i/steps*dancePlayer.clip.duration;if(sourceSeconds>=settle.a)f.footQ[s].copy(settle.q).slerp(standing.footQ[s],smooth((sourceSeconds-settle.a)/(settle.b-settle.a)));}
 // Preserve the captured stepping rhythm while registering its high knee
 // lifts to this shorter, loose-shorts character's comfortable motion range.
 const lifts=Object.fromEntries(['l','r'].map(s=>{const lift=Math.max(0,(pos(dancePlayer.r.get('foot_'+s)).y-sourceFloor[s])*scale-.018);return [s,.26*Math.tanh(lift/.26)];}));
 reset();rest.forEach((r,j)=>r.b.quaternion.copy(f.q[j]));g.updateMatrixWorld(true);
 model.position.add(f.hip.clone().sub(pos(hip)));g.updateMatrixWorld(true);
 for(const leg of legs){const heading=Q().setFromAxisAngle(Y,f.yaw);setQ(leg.upper,heading.clone().multiply(neutralLegQ[leg.s].upper));setQ(leg.lower,heading.clone().multiply(neutralLegQ[leg.s].lower));}
 const targets={};
 for(const leg of legs){
  const target=f.feet[leg.s].clone();ik(leg.upper,leg.lower,leg.foot,target,f.poles[leg.s]);setQ(leg.foot,f.footQ[leg.s]);
  const shoe=shoes[leg.s];shoe.skeleton.update();let minY=Infinity;
  for(let j=0;j<shoe.geometry.attributes.position.count;j++){const p=V();shoe.getVertexPosition(j,p);shoe.localToWorld(p);minY=Math.min(minY,p.y);}
  target.y+=.006+lifts[leg.s]-minY;targets[leg.s]=target;
 }
 let lower=0;
 for(const leg of legs){const target=targets[leg.s],root=pos(leg.upper),length=root.distanceTo(pos(leg.lower))+pos(leg.lower).distanceTo(pos(leg.foot))-.015,horizontal=(target.x-root.x)**2+(target.z-root.z)**2;lower=Math.max(lower,root.y-target.y-Math.sqrt(Math.max(0,length*length-horizontal)));}
 if(lower>0){model.position.y-=lower;danceLower=Math.max(danceLower,lower);g.updateMatrixWorld(true);}
 for(let pass=0;pass<5;pass++)for(const leg of legs){
  const target=targets[leg.s];ik(leg.upper,leg.lower,leg.foot,target,f.poles[leg.s]);setQ(leg.foot,f.footQ[leg.s]);
  const shoe=shoes[leg.s];shoe.skeleton.update();let minY=Infinity;
  for(let j=0;j<shoe.geometry.attributes.position.count;j++){const p=V();shoe.getVertexPosition(j,p);shoe.localToWorld(p);minY=Math.min(minY,p.y);}
  target.y+=.006+lifts[leg.s]-minY;
 }
 for(const leg of legs){ik(leg.upper,leg.lower,leg.foot,targets[leg.s],f.poles[leg.s]);setQ(leg.foot,f.footQ[leg.s]);dance.feet[leg.s].push(...pos(leg.foot).toArray().map(round));dance.contacts[leg.s].push(lifts[leg.s]<.025?1:0);}
 g.updateMatrixWorld(true);
 for(const shoe of Object.values(shoes)){shoe.skeleton.update();for(let j=0;j<shoe.geometry.attributes.position.count;j++){const p=V();shoe.getVertexPosition(j,p);shoe.localToWorld(p);danceMin=Math.min(danceMin,p.y);}}
 const qs=channelIndices.map((j,k)=>{const q=rest[j].b.quaternion.clone();if(dancePrev&&q.dot(dancePrev[k])<0)q.set(-q.x,-q.y,-q.z,-q.w);return q;});
 dance.quaternions.push(...qs.flatMap(q=>q.toArray().map(round)));dance.pelvis.push(...pos(hip).toArray().map(round));dancePrev=qs;
 dance.fingers.quaternions.push(...dancePlayer.fingers.flatMap(f=>f.b.quaternion.toArray().map(round)));
}
dance.diagnostics={frames:steps+1,minSoleY:danceMin,maxHipLower:danceLower,sourceTemplate:true,sourceFloor};
existing.dance=dance;fs.writeFileSync(base+'/assets/motion/study-motion.json',JSON.stringify(existing));
console.log(JSON.stringify({dance:dance.sourceClip,...dance.diagnostics}));
}else console.log('Preserved the embedded sourced dance. Pass the private FBX input as argument 3 to rebake it.');
