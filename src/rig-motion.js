/* Retargeted, additive CC0 Mesh2Motion clips. AnimationMixer samples an
 * isolated channel rig so contact IK can solve after the authored body layer. */
window.createStudyMotion = function (THREE) {
  const data=window.DECK_RIG_MOTION;
  if(!data)throw new Error('Missing packaged character motion');
  const names=['spine_01','spine_02','spine_03','neck_01','head','clavicle_l','clavicle_r'];
  for(const side of ['l','r'])for(const digit of ['index','middle','ring','pinky','thumb'])for(let n=1;n<=3;n++)names.push(`${digit}_0${n}_${side}`);
  names.push('hand_l','hand_r','upperarm_l','lowerarm_l','upperarm_r','lowerarm_r');
  const identity=()=>names.flatMap(()=>[0,0,0,1]);
  const players={};
  for(const [name,clip] of Object.entries(data.clips)){
    const root=new THREE.Group(),channels={};
    const times=Array.from({length:clip.count},(_,i)=>Math.min(i/data.fps,clip.duration));
    const tracks=[];
    for(const key of names){
      const node=new THREE.Object3D();node.name=key;root.add(node);channels[key]=node;
      tracks.push(new THREE.QuaternionKeyframeTrack(key+'.quaternion',times,clip.bones[key]));
    }
    for(const key of ['hand_l','hand_r','elbow_l','elbow_r']){
      const node=new THREE.Object3D();node.name='offset_'+key;root.add(node);channels['offset_'+key]=node;
      const source=key.startsWith('hand')?clip.handOffsets:clip.elbowOffsets;
      tracks.push(new THREE.VectorKeyframeTrack(node.name+'.position',times,source[key.endsWith('l')?'l':'r']));
    }
    const mixer=new THREE.AnimationMixer(root),action=mixer.clipAction(new THREE.AnimationClip(name,clip.duration,tracks));
    action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
    players[name]={mixer,action,channels,duration:clip.duration};
  }
  const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
  const pulse=(s,a,b,c,d)=>smooth((s-a)/(b-a))*(1-smooth((s-c)/(d-c)));
  const quat=new THREE.Quaternion(),neutral=new THREE.Quaternion();
  const closing=data.closing;
  function closingFrame(seconds,clip=closing){
    if(!clip)return {};
    const frame=Math.min(clip.duration,Math.max(0,seconds))*clip.fps;
    const a=Math.min(Math.floor(frame),clip.pelvis.length/3-1),b=Math.min(a+1,clip.pelvis.length/3-1),u=frame-a,stride=clip.boneNames.length*4;
    const pose=new Array(stride);
    for(let i=0;i<stride;i+=4)THREE.Quaternion.slerpFlat(pose,i,clip.quaternions,a*stride+i,clip.quaternions,b*stride+i,u);
    const vector=values=>[0,1,2].map(j=>values[a*3+j]+(values[b*3+j]-values[a*3+j])*u);
    const result={closingPose:pose,closingPelvis:vector(clip.pelvis),closingFeet:[...vector(clip.feet.l),...vector(clip.feet.r)]};
    if(clip.fingers){const stride=clip.fingers.boneNames.length*4;result.closingFingerPose=new Array(stride);for(let i=0;i<stride;i+=4)THREE.Quaternion.slerpFlat(result.closingFingerPose,i,clip.fingers.quaternions,a*stride+i,clip.fingers.quaternions,b*stride+i,u);}
    return result;
  }
  function thinkingReach(seconds){
    const player=players.Confused,finish=.82;
    const read=time=>{player.action.paused=false;player.mixer.setTime(time);return player.channels.offset_hand_r.position.clone();};
    const end=read(finish),u=clamp((seconds-.62)/3.3),v=read(u*finish);
    // Symmetric source-time filtering removes the source clip's sharp reach
    // pulse while retaining absolute-time seeking and exact held endpoints.
    const taps=[[-.32,1],[-.16,4],[0,6],[.16,4],[.32,1]];
    const progress=taps.reduce((sum,[shift,weight])=>sum+weight*clamp(read(clamp((seconds+shift-.62)/3.3)*finish).y/end.y),0)/16;
    // Mirror the source's head-reaching arm onto the presentation's supporting
    // side. Preserve its lateral sweep and front clearance, then register its
    // endpoint to the existing chin anchor rather than the source's forehead.
    return {progress,offset:[-(v.x-end.x*progress)*.45,0,(v.z-end.z*progress)*.23]};
  }
  function sample(index,s,duration){
    const out={rigPose:identity(),elbowMotionR:[0,0,0],elbowMotionL:[0,0,0],gestureOffset:[0,0,0],armFreedomR:0,armFreedomL:0,closingWeight:0,clothStanding:0,danceWeight:0,closingFootLock:[0,0],closingFingerPose:[...(data.dance?.fingers?.rest||[])],closingSource:'Mesh2Motion: Sitting_Exit → Turn_Left_90 → Bow',...closingFrame(0)};
    if(![0,1,2,3,4,12,13,14].includes(index)||!duration)return out;
    const envelope=pulse(s,0,.6,duration-1.1,duration),layers=[];
    if(index===14){
      const closingSecond=data.dance?window.ReactionBow.clock(s):s;
      Object.assign(out,closingFrame(closingSecond));
      const danceWeight=data.dance?window.ReactionBow.danceWeight(s):0,dance=data.dance;
      if(dance&&danceWeight>0){
        const t=Math.min(dance.duration,Math.max(0,s-window.ReactionBow.danceStart)*dance.playbackRate),frame=closingFrame(t,dance);
        for(let i=0;i<out.closingPose.length;i+=4)THREE.Quaternion.slerpFlat(out.closingPose,i,out.closingPose,i,frame.closingPose,i,danceWeight);
        for(const key of ['closingPelvis','closingFeet'])out[key]=out[key].map((v,i)=>v+(frame[key][i]-v)*danceWeight);
        if(frame.closingFingerPose)out.closingFingerPose=frame.closingFingerPose;
      }
      out.danceWeight=danceWeight;
      out.closingFootLock=[smooth((s-15.12)/.44),smooth((s-14.79)/.51)];
      out.closingSource=danceWeight>0?'Mixamo: Gangnam Style (sourced performance)':'Mesh2Motion: Sitting_Exit → Turn_Left_90 → Bow';
      out.closingWeight=smooth((closingSecond-.55)/.85);
      // Keep the knee-following garment fit during the sourced knee bends;
      // the standing gusset resumes on the original post-dance bow clock.
      out.clothStanding=smooth((closingSecond-6.10)/.50);
      out.armFreedomR=out.armFreedomL=out.closingWeight;
      return out;
    }else{
      // Keep the authored seated contact pose. Two short looping idle clips
      // previously rocked the spine every two seconds on top of scene breath.
      out.armFreedomR=index===0||index===4?1:index===1?0:index===2?smooth((s-3.3)/1.3):0;
      out.armFreedomL=index===2?smooth((s-3.5)/1.2):0;
    }
    if(index===1)layers.push(['Confused',Math.min(1.65,Math.max(0,(s-.2)*.55)),.055*pulse(s,.2,1.1,3.0,4.8),'body']);
    // Page 13 has a specific two-result gesture in scene.js. A generic talking
    // clip used to overwrite those hand targets with an unrelated curled hand.
    for(const [name,time,weight,mask] of layers){
      if(!weight)continue;
      const player=players[name];player.action.paused=false;player.mixer.setTime(Math.min(time,player.duration));
      names.forEach((key,i)=>{
        const finger=/^(index|middle|ring|pinky|thumb)/.test(key),wrist=key.startsWith('hand');
        // Contact fingers stay controlled by the response/keyboard/chin pose.
        const limb=/^(upperarm|lowerarm)_/.test(key);
        const influence=finger||wrist?(mask==='gesture'&&key.endsWith('_l')?weight*.55:mask==='bow'&&wrist?weight*.4:0):limb&&mask==='gesture'&&!key.endsWith('_l')?0:mask==='gesture'&&!limb?weight*.25:weight;
        if(!influence)return;
        quat.copy(neutral).slerp(player.channels[key].quaternion,influence);
        const combined=new THREE.Quaternion().fromArray(out.rigPose,i*4).multiply(quat).normalize();
        combined.toArray(out.rigPose,i*4);
      });
      if(mask==='gesture'){
        // The first phrase is one modest gesture; retain its authored path
        // and elbow follow while leaving the resting arm and both feet pinned.
        out.gestureOffset=[0,0,0];
        out.elbowMotionR=[0,0,0];
      }
    }
    return out;
  }
  return {names,identity,sample,thinkingReach,source:{repository:data.source,commit:data.commit,license:data.license,clips:Object.keys(players)}};
};
