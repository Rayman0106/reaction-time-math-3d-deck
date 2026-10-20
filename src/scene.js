/* Reaction time investigation · attributed Sketchfab scene.
 * Original meshes/materials with absolute-time camera and skeletal posing.
 * The investigator is a fictional illustration, not a study participant.
 */
window.createReactionScene = async function createReactionScene(THREE, canvas, options) {
  'use strict';
  options=options||{};
  const yieldControl=options.yieldControl||(()=>Promise.resolve());
  const report=(stage,done,total,detail)=>options.onProgress?.(stage,done,total,detail);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#101e27');
  scene.fog=new THREE.FogExp2('#101e27',.012);
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const camera=new THREE.PerspectiveCamera(34,16/9,.08,100);
  const geometries=new Set(),materials=new Set(),textures=new Set();
  const color={cyan:0x72d8e5,amber:0xf1b66b,green:0x9bf7c1};
  const seatedYaw=-2.42,audienceYaw=-.58;
  const thinkingPose={lean:.045,bodyRoll:-.036,bodyYaw:-.07,headYaw:.60,headPitch:-.055,headRoll:-.075,hand:[.30,2.84,.48],wrist:-.06,elbow:.07};
  function mesh(geometry,mat,parent=scene,x=0,y=0,z=0){
    geometries.add(geometry);const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);parent.add(m);return m;
  }
  const screenTextureCanvas=document.createElement('canvas');screenTextureCanvas.width=2048;screenTextureCanvas.height=1200;
  const ctx=screenTextureCanvas.getContext('2d');
  const tex=new THREE.CanvasTexture(screenTextureCanvas);tex.colorSpace=THREE.SRGBColorSpace;tex.flipY=true;
  tex.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);textures.add(tex);
  const screenMat=new THREE.MeshBasicMaterial({map:tex,toneMapped:false});materials.add(screenMat);
  const loader=new window.DECK_GLTFLoader();
  let loadedModels=0;report('models',0,4,'Reading local GLBs');await yieldControl();
  const [pcGLTF,humanGLTF,roomGLTF,shelfGLTF]=await Promise.all(['pc','character','room','bookshelf'].map(async k=>{const gltf=window.DECK_MODEL_DATA[k]?await loader.loadAsync(window.DECK_MODEL_DATA[k]):null;report('models',++loadedModels,4,k);return gltf;}));
  report('scene',0,4,'Desktop & contact anchors');await yieldControl();
  const props=await window.createGamingProps(THREE,pcGLTF,{screenMaterial:screenMat,mergeGeometries:window.DECK_MERGE});scene.add(props.group);
  // Keep the desktop at plausible human scale; preserve mesh proportions.
  function resizeProp(prop,anchor,factor){prop.position.sub(new THREE.Vector3(...anchor)).multiplyScalar(factor).add(new THREE.Vector3(...anchor));prop.scale.multiplyScalar(factor);}
  resizeProp(props.monitor,[0,1.68,-.5],.65);
  for(let i=0;i<props.speakers.length;i++){const side=i===0?-1:1;resizeProp(props.speakers[i],[side*2.83,1.68,-.54],.65);props.speakers[i].position.x-=side*.85;}

  const workstation=window.arrangeReactionWorkstation(THREE,props),controls=workstation.anchors;
  const studySpeakers=window.createStudySpeakers(THREE,props);
  const screenEntry=window.createScreenTransition(THREE,props.screen);
  report('scene',1,4,'Desktop ready');await yieldControl();
  const analysisImage=options.screenImage||await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Cannot decode the analysis screen image.'));img.src=window.DECK_ASSETS.screenAnalysis;});
  const limitationsImage=options.limitationsImage||options.screenImage||await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('Cannot decode the limitations screen image.'));img.src=window.DECK_ASSETS.screenLimitations;});
  const character=window.createNathanCharacter(THREE,humanGLTF);scene.add(character.group);
  report('scene',2,4,'Skeleton & clothing bindings cached');await yieldControl();
  const environment=await window.createRoomEnvironment(THREE,roomGLTF,{mergeGeometries:window.DECK_MERGE});scene.add(environment.group);
  report('scene',3,4,'Room geometry ready');await yieldControl();
  // The brighter room exposes the old diorama's floor edge in the wide shot.
  // Extend that same floor, with one surface and no overlapping filler plane.
  const floorCenter=new THREE.Box3().setFromObject(environment.floor,true).getCenter(new THREE.Vector3());
  environment.floor.scale.x*=2.2;environment.floor.scale.z*=2.2;environment.floor.updateWorldMatrix(true,true);
  environment.floor.position.add(floorCenter.sub(new THREE.Box3().setFromObject(environment.floor,true).getCenter(new THREE.Vector3())));
  if(shelfGLTF){
    const previous=new THREE.Box3().setFromObject(environment.bookshelf,true),shelf=shelfGLTF.scene;
    // The source bookcase opens along -X. Face that opening into the room (+Z).
    shelf.rotation.y+=Math.PI/2;shelf.updateMatrixWorld(true);
    const before=new THREE.Box3().setFromObject(shelf,true),factor=previous.getSize(new THREE.Vector3()).y/before.getSize(new THREE.Vector3()).y;
    shelf.name='Study_Bookshelf';shelf.scale.multiplyScalar(factor);shelf.updateMatrixWorld(true);
    const after=new THREE.Box3().setFromObject(shelf,true);
    shelf.position.add(previous.getCenter(new THREE.Vector3()).sub(after.getCenter(new THREE.Vector3())));
    environment.bookshelf.visible=false;environment.group.add(shelf);environment.bookshelf=shelf;
    shelf.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  }
  const artDirection=window.createStudyArtDirection(THREE,{scene,renderer,props,character,environment});
  const greenLight=artDirection.signalLight;
  const poweredMaterials=new Map();
  props.group.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.emissive&&(m.emissive.r+m.emissive.g+m.emissive.b)>0&&!poweredMaterials.has(m))poweredMaterials.set(m,{color:m.color.clone(),emissiveIntensity:m.emissiveIntensity});});
  const maxAnisotropy=renderer.capabilities.getMaxAnisotropy();
  const textureInfo=[];
  // Keep the adapters' shadow policy: screen, floor, walls and annotations do
  // not become shadow casters merely because their textures are registered.
  scene.traverse(o=>{if(o.isMesh){
    for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);for(const v of Object.values(m)){if(v?.isTexture){v.anisotropy=Math.min(maxAnisotropy,8);textures.add(v);if(v.image)textureInfo.push({name:o.name,width:v.image.width,height:v.image.height});}}}
    if(o.geometry)geometries.add(o.geometry);
  }});
  props.screen.castShadow=false;
  // Thirty dots are a conceptual data annotation, not additional physical models.
  const dataGroup=new THREE.Group();dataGroup.position.set(-1.3,1.2,.65);dataGroup.scale.set(.6,1,.6);scene.add(dataGroup);
  const markerMaterials=[color.cyan,color.amber].map(c=>{const m=new THREE.MeshBasicMaterial({color:c,toneMapped:false,transparent:true});materials.add(m);return m;});
  const markerGeometry=new THREE.SphereGeometry(.049,12,8);const markers=[];
  for(let i=0;i<30;i++)markers.push(mesh(markerGeometry,markerMaterials[i<15?0:1],dataGroup));
  // Thought and candidate cards are conceptual illustrations, never data.
  function plaque(label,accent){
    const c=document.createElement('canvas');c.width=512;c.height=256;const q=c.getContext('2d');
    q.clearRect(0,0,512,256);q.beginPath();q.roundRect(8,40,496,176,28);q.fillStyle='rgba(12,35,44,.94)';q.fill();q.strokeStyle=accent;q.lineWidth=2;q.stroke();
    q.fillStyle=accent;q.textAlign='center';q.font='500 43px Manrope, sans-serif';q.fillText(label,256,156);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;textures.add(t);
    const m=new THREE.MeshBasicMaterial({map:t,transparent:true,opacity:0,toneMapped:false,depthWrite:false});materials.add(m);
    const o=mesh(new THREE.PlaneGeometry(1.42,.71),m,scene);o.castShadow=false;return o;
  }
  const thought=plaque('Why?','#a5d7e3');
  const ideas=[plaque('Sleep','#9eb3be'),plaque('Practice','#9eb3be'),plaque('Time','#9eb3be'),plaque('Device','#9eb3be'),plaque('Sound','#f1b66b')];
  // Camera endpoints use physical lateral framing and remain deterministic.
  const basePose={distance:21.8,azimuth:-.56,elevation:.25,lookY:2.15,offset:4.45,fov:34};
  const poses=[
    {...basePose,distance:14.5,azimuth:.32,elevation:.28,lookY:2.6,offset:3.8,focusX:1.4,focusZ:1.05,mode:0},
    {...basePose,distance:20.9,azimuth:-.63,lookY:2.45,offset:4.35,mode:1},
    {...basePose,distance:22.8,elevation:.3,lookY:2.65,offset:4.65,mode:2},
    {...basePose,distance:20.9,azimuth:.18,elevation:.34,lookY:2.05,offset:4.38,mode:3},
    {...basePose,distance:20.9,azimuth:.18,elevation:.34,lookY:2.15,offset:4.48,mode:4},
    {...basePose,distance:8.2,azimuth:0,elevation:.02,lookY:3.62,offset:0,mode:5},
    {...basePose,distance:10.5,azimuth:.04,elevation:.10,lookY:3.4,offset:0,mode:6},
    {...basePose,distance:11.0,azimuth:-.03,elevation:.14,lookY:3.4,offset:0,mode:7},
    {...basePose,distance:11.0,azimuth:-.1,elevation:.14,lookY:3.4,offset:0,mode:8},
    {...basePose,distance:10.5,azimuth:0,elevation:.08,lookY:3.5,offset:0,mode:9},
    {...basePose,distance:11.0,azimuth:.1,elevation:.16,lookY:3.4,offset:0,mode:10},
    {...basePose,distance:11.0,azimuth:-.05,elevation:.14,lookY:3.4,offset:0,mode:11},
    {...basePose,distance:21.4,azimuth:-.58,elevation:.22,lookY:2.16,offset:4.4,mode:12},
    {...basePose,distance:20.9,azimuth:.18,elevation:.29,lookY:2.05,offset:4.38,mode:13},
    {...basePose,distance:18.8,azimuth:-.42,elevation:.18,lookY:2.35,offset:2.6,mode:14},
    {...basePose,mode:15},{...basePose,mode:16}
  ];
  const rigMotion=window.createStudyMotion(THREE);
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smoother=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
  const mix=(a,b,t)=>a+(b-a)*t;
  const vMix=(a,b,t)=>a.map((x,j)=>mix(x,b[j],t));
  const durations={0:window.ReactionPractice.duration,1:14,2:18,3:10,12:10,13:8,14:window.ReactionBow.duration};
  function episodeDuration(index){return Math.max(durations[index]||0,window.ReactionCamera.episodeDuration(index));}
  let current={from:0,to:0,progress:1,storySeconds:0};
  let width=1920,height=1080,lastScreenKey='';
  const screenA=document.createElement('canvas'),screenB=document.createElement('canvas');
  screenA.width=screenB.width=2048;screenA.height=screenB.height=1200;
  function poseAt(i){return poses[Math.max(0,Math.min(poses.length-1,Math.round(Number(i)||0)))];}
  function localWorld(point,yaw){
    const [x,y,z]=point;return [2.65+x*Math.cos(yaw)+z*Math.sin(yaw),y,2.5-x*Math.sin(yaw)+z*Math.cos(yaw)];
  }
  function restingHand(point,yaw){
    const target=localWorld(point,yaw);
    // Keep relaxed fingers above the desk until the palm clears its front
    // edge, then lower onto the lap as the chair turns toward the audience.
    target[1]=mix(2.03,point[1],smoother((target[2]-2.55)/.25));
    return target;
  }
  // Overlapping, finite actions: gaze leads the torso; wrists settle last.
  // Everything remains a pure function of the episode clock for reversible playback.
  function arcMix(a,b,t,arc=[0,0,0]){
    const u=smoother(t),lift=Math.sin(Math.PI*u);return a.map((v,j)=>mix(v,b[j],u)+arc[j]*lift);
  }
  function handOffDesk(local,seconds,yaw,delay=0){
    // Clearance belongs to the path, not a late height clamp at the desk edge.
    // Leave the surface first, then enter a relaxed pose in front of the waist.
    const around=beat(seconds,.10+delay,.80+delay,1.10+delay,2.15+delay),lower=smoother((seconds-.95-delay)/1.45);
    // The old negative Z retraction crossed the hoodie. Keep the palm in
    // front of the abdomen and pass around its side before reaching the lap.
    const settle=smoother((seconds-.65-delay)/1.50);
    return localWorld([local[0]+Math.sign(local[0])*(.18*around+.16*settle),mix(2.03,local[1]+.20,lower)+.075*around,local[2]+.14*around+.30*settle],yaw);
  }
  function beat(s,a,b,c,d){return smoother((s-a)/(b-a))*(1-smoother((s-c)/(d-c)));}
  function chairFootsteps(st,s,fromYaw,toYaw,times){
    st.footAnchorBlend=1;st.footYawLag=0;
    for(let j=0;j<2;j++){
      const local=j===0?[.34,.225,.97]:[-.29,.25,.81],plan=times[j];
      const second=s>=plan[2],start=second?plan[2]:plan[0],end=second?plan[3]:plan[1];
      const swing=smoother((s-start)/(end-start)),u=(second?.5:0)+.5*swing;
      local[0]+=Math.sign(local[0])*.10*Math.sin(Math.PI*swing);
      // Keep the foot on its arc around the chair. A straight chord cuts
      // across the lap and makes one calf intersect the opposite shorts leg.
      const target=localWorld(local,mix(fromYaw,toYaw,u));
      target[1]+=Math.sin(Math.PI*swing)*.045;
      st[j===0?'footL':'footR']=target;st[j===0?'footYawL':'footYawR']=mix(fromYaw,toYaw,u);
    }
  }
  function episode(index,seconds){
    const d=episodeDuration(index),s=Math.min(Math.max(0,seconds||0),d),e=d?s/d:1;
    const st={yaw:seatedYaw,headYaw:.32,headPitch:.025,headRoll:-.018,bodyRoll:-.018,bodyYaw:0,pelvisSway:0,lean:.12,
      shoulderRelax:.88,palmOpenR:0,palmOpenL:0,explainR:0,explainL:0,handFollowR:0,handFollowL:0,handPitchR:0,handPitchL:0,shoulderGestureR:0,shoulderGestureL:0,gestureElbowR:[0,0,0],gestureElbowL:[0,0,0],wristRollR:.10,wristRollL:-.07,elbowSpreadR:.10,elbowSpreadL:.16,
      thinkBlend:0,thinkSupport:0,thinkingClearance:0,mouseGripL:0,mouseGripR:0,chinFollow:0,neckFollow:0,chestBreath:0,shoulderBreath:0,gazeYaw:0,gazePitch:0,fingerTapR:0,fingerTapL:0,footYawLag:0,stand:0,bow:0,standHands:0,rootOffset:[0,0,0],chairOffset:[0,0,0],chairYaw:seatedYaw,
      stanceLower:0,footAnchorBlend:0,handLapR:-1,handLapL:-1,closingFootLiftL:0,closingFootLiftR:0,closingFootOutL:0,closingFootOutR:0,footL:localWorld([.34,.225,.97],seatedYaw),footR:localWorld([-.29,.25,.81],seatedYaw),footYawL:seatedYaw,footYawR:seatedYaw,
      mouth:0,power:1,press:0,powerPress:0,question:0,ideas:[0,0,0,0,0],choice:0,screen:'research',phase:'READY',attempt:0,checks:0,result:243,clickAge:.45,cue:0,cueColor:0x9ff8b7,
      handR:restingHand([.32,1.70,.64],seatedYaw),handL:[...controls.reactionHand]};
    const lapR=()=>restingHand([.32,1.70,.64],st.yaw),lapL=()=>restingHand([-.30,1.68,.70],st.yaw);
    if(index===0){
      const demo=window.ReactionPractice.sample(s);
      st.screen='practice';st.attempt=demo.attempt;st.phase=demo.phase;st.checks=demo.checks;
      st.result=demo.result;st.clickAge=demo.clickAge;st.cue=1;
      st.cueColor=demo.phase==='WAIT'?0xc47b6b:0x9ff8b7;st.press=demo.press;
      st.handL=[...controls.reactionHand];st.handL[1]-=.012*st.press;st.handLapL=0;st.mouseGripL=1;
      const settle=smoother(s/1.4),breath=beat(s,1.5,3.4,4.8,7.4);
      st.lean=.13-.025*settle+.015*breath;st.bodyRoll=-.025-.015*breath;
      st.headPitch=.025+.018*st.press;st.headRoll=-.025;
      st.wristRollL=-.055-.025*st.press;
    }else if(index===1){
      // A short reaction, a leading gaze, then an elbow-led reach. Wrist and
      // fingers arrive after the arm; the head settles into the supported hand.
      const attention=smoother((s-.12)/1.05),raise=smoother((s-.62)/3.3);
      st.question=smoother((s-1.4)/1.5);st.screen='practice';st.phase='COMPLETE';st.attempt=5;st.checks=5;
      st.lean=mix(.105,thinkingPose.lean,smoother((s-.45)/1.65));
      st.bodyRoll=mix(-.025,thinkingPose.bodyRoll,smoother((s-.65)/1.8));
      st.bodyYaw=thinkingPose.bodyYaw*smoother((s-.4)/1.75);
      st.neckFollow=smoother((s-.2)/1.1);
      st.headYaw=mix(.32,thinkingPose.headYaw,attention)+.025*beat(s,3.0,3.5,4.1,4.7);
      st.headPitch=mix(.025,thinkingPose.headPitch,attention)+.035*beat(s,2.65,3.15,3.65,4.45);
      st.headRoll=mix(-.025,thinkingPose.headRoll,smoother((s-.48)/1.65));
      st.gazeYaw=.08*beat(s,.06,.32,.85,1.7)+.025*beat(s,6.0,6.4,7.2,7.65);
      st.gazePitch=-.06*beat(s,.1,.4,1.0,1.8);
      const reach=rigMotion.thinkingReach(s),lift=Math.sin(Math.PI*reach.progress),clear=localWorld([.32*lift,.08*lift,.36*lift],st.yaw).map((v,j)=>v-[2.65,0,2.5][j]);
      st.handR=vMix(lapR(),localWorld(thinkingPose.hand,st.yaw),reach.progress).map((v,j)=>v+clear[j]);st.thinkingClearance=smoother((s-.10)/1.30);st.handLapR=.361352657*(1-smoother((s-.4)/2.5));
      st.thinkBlend=smoother((s-.95)/2.6);st.thinkSupport=1;st.chinFollow=smoother((s-3.15)/1.0);
      st.wristRollR=mix(.10,thinkingPose.wrist,smoother((s-1.05)/2.55));
      st.elbowSpreadR=mix(.10,thinkingPose.elbow,raise);st.shoulderRelax=mix(.88,.96,raise);
      st.handL=[...controls.reactionHand];st.wristRollL=-.025;st.handLapL=0;st.mouseGripL=1;
    }else if(index===2){
      const lower=smoother((s-1.7)/2.35),choose=smoother((s-4.2)/1.0),nod=beat(s,4.35,4.8,5.0,5.65);
      st.question=1-smoother(s/1.5);st.ideas=ideas.map((_,j)=>smoother((s-.4-j*.58)/1.0));st.choice=choose;st.screen='question';
      st.lean=thinkingPose.lean+.035*lower;st.bodyRoll=thinkingPose.bodyRoll+.016*lower;st.bodyYaw=thinkingPose.bodyYaw*(1-choose);
      st.headYaw=thinkingPose.headYaw-.18*lower-.07*choose;st.headPitch=thinkingPose.headPitch+.025*lower+.045*nod;st.headRoll=thinkingPose.headRoll+.05*lower;
      st.neckFollow=1;st.chinFollow=1-lower;
      st.handR=arcMix(localWorld(thinkingPose.hand,st.yaw),lapR(),(s-1.7)/2.35,localWorld([.32,.08,.36],st.yaw).map((v,j)=>v-[2.65,0,2.5][j]));st.thinkingClearance=1-lower;st.handLapR=.361352657*lower;
      st.handL=[...controls.reactionHand];st.wristRollL=-.025;st.mouseGripL=1;st.handLapL=0;st.thinkBlend=1-lower;st.thinkSupport=1;st.wristRollR=thinkingPose.wrist+.16*lower;st.elbowSpreadR=thinkingPose.elbow+.03*lower;st.shoulderRelax=.96-.08*lower;
    }else if(index===3){
      st.screen='research';st.headYaw=.22;st.headPitch=.055+.018*beat(s,.1,.8,7.4,9.5);
      st.lean=.12+.055*beat(s,.35,1.45,7.3,9.7);st.bodyRoll=-.018+.025*beat(s,3.5,4.5,5.5,6.5);
      const tap=(times)=>times.reduce((sum,t)=>sum+beat(s,t,t+.07,t+.11,t+.23),0);
      const r=tap([1.10,1.63,2.24,3.21,3.75,5.02,5.47,6.13,7.03,7.55]);
      const l=tap([1.38,1.94,2.61,3.53,4.10,5.25,5.79,6.52,7.28]);
      st.handR=[...controls.typingRight];st.handL=[...controls.typingLeft];st.handR[1]-=.018*r;st.handL[1]-=.018*l;
      st.fingerTapR=r;st.fingerTapL=l;st.wristRollR=.035;st.wristRollL=-.04;
    }else if(index===4){st.screen='cleaning';st.headYaw=.22;}
    else if(index>=5&&index<=11){st.screen=index===5?'analysis-slide':index===11?'limitations-slide':'analysis';st.headYaw=.22;}
    else if(index===12){
      // The requested "67" gesture: palms face up and move in opposite
      // vertical phases for a few beats, then settle for the qualifier.
      const turn=smoother((s-.35)/2.40),lead=beat(s,.06,.55,1.35,2.45);
      const first=beat(s,2.55,3.65,8.10,9.50),second=beat(s,2.70,3.80,8.22,9.62);
      // Unequal strokes and soft extrema: shoulder/elbow lead the palm;
      // the wrist arrives later. Two broad cycles replace the rapid bobbing.
      const waveKeys=[[3.90,0],[4.50,1],[5.45,-1],[6.45,1],[7.45,-1],[8.05,0]];
      const stroke=time=>{if(time<=waveKeys[0][0]||time>=waveKeys.at(-1)[0])return 0;for(let j=1;j<waveKeys.length;j++){const a=waveKeys[j-1],b=waveKeys[j];if(time<=b[0])return mix(a[1],b[1],smoother((time-a[0])/(b[0]-a[0])));}return 0;};
      const w=stroke(s),wave=.21*w,follow=.035*stroke(s-.10),anticipateR=stroke(s+.10),anticipateL=-stroke(s+.06);
      const settle=smoother((s-.35)/2.40),nod=beat(s,9.20,9.45,9.60,9.95);
      st.yaw=mix(seatedYaw,audienceYaw,turn);st.bodyYaw=.10*lead;st.footYawLag=-.10*lead;
      st.neckFollow=1;st.gazeYaw=.08*lead;st.headYaw=mix(.22,0,smoother((s-.06)/1.80))+.19*lead;st.screen='conclusion';
      st.lean=.12-.075*settle+.018*first-.008*second;
      st.bodyRoll=-.018-.017*first+.025*second-.025*wave;st.headRoll=-.018+.017*second;
      st.bodyYaw+=.025*first-.035*second;
      st.headYaw+=.055*first-.085*second;
      st.headPitch=.025*(1-turn)+.055*nod;
      const downR=handOffDesk([.32,1.70,.64],s,st.yaw,.04);
      const downL=handOffDesk([-.30,1.68,.70],s,st.yaw,.14);
      st.handR=vMix(downR,localWorld([.56,2.14,.85],st.yaw),first);
      st.handL=vMix(downL,localWorld([-.53,2.12,.84],st.yaw),second);
      st.handR[1]+=.065*Math.sin(Math.PI*first)+wave;st.handL[1]+=.05*Math.sin(Math.PI*second)-wave;
      st.handR[2]+=follow;st.handL[2]-=follow;
      st.explainR=beat(s,1.50,3.90,7.90,10);st.explainL=beat(s,1.60,4.00,7.95,10);
      st.handLapR=mix(.361352657,1,smoother((s-.70)/1.60))*(1-first);st.handLapL=mix(.262801932,1,smoother((s-.80)/1.60))*(1-second);
      st.handFollowR=st.handFollowL=beat(s,3.40,4.10,7.90,8.70);
      st.handPitchR=.12*(stroke(s-.14)-w);st.handPitchL=.12*(-stroke(s-.18)+w);
      st.shoulderGestureR=.035*anticipateR;st.shoulderGestureL=.035*anticipateL;
      st.gestureElbowR=[.018*anticipateR,.105*anticipateR,.035*stroke(s+.04)];
      st.gestureElbowL=[-.018*anticipateL,.105*anticipateL,-.035*stroke(s+.02)];
      const sleeveClear=beat(s,.30,1.30,2.65,3.60);
      st.gestureElbowR[0]+=.20*sleeveClear;st.gestureElbowL[0]-=.20*sleeveClear;
      st.gestureElbowR[2]+=.18*sleeveClear;st.gestureElbowL[2]+=.18*sleeveClear;
      st.palmOpenR=.83*st.explainR;st.palmOpenL=.80*st.explainL;
      st.wristRollR=.10-.055*first+.035*wave;st.wristRollL=-.07+.045*second-.035*wave;
      st.elbowSpreadR=.08+.045*first;st.elbowSpreadL=.10+.035*second;
      st.shoulderRelax=.94-.035*first-.025*second;
      st.mouth=0;
      chairFootsteps(st,s,seatedYaw,audienceYaw,[[.40,1.12,1.42,2.15],[.72,1.44,1.74,2.45]]);
      st.pelvisSway=.012*beat(s,.4,.7,1.12,1.6)-.010*beat(s,1.3,1.62,2.15,2.65);
    }else if(index===13){
      const turn=smoother((s-.95)/2.80),lead=beat(s,0,.60,1.1,3.75),reachR=(s-2.20)/1.90,reachL=(s-2.55)/1.95,release=(s-5.75)/2.25;
      st.yaw=mix(audienceYaw,seatedYaw,turn);st.headYaw=.22*turn-.16*lead;st.bodyYaw=-.12*lead;st.footYawLag=.13*lead;st.screen='shutdown';
      st.lean=.045+.13*smoother((s-.7)/2.1)-.105*smoother(release);st.bodyRoll=-.018-.012*beat(s,1.5,2.5,5.3,7.2);st.headPitch=.025*turn-.015*smoother(release);
      // Lap anchors rotate at their real height. The general desk-height
      // clamp must not raise the hands as a side effect of turning the chair.
      const liftR=smoother((s-.10)/2.20),liftL=smoother((s-.25)/2.25);
      const startR=localWorld([.48+.06*Math.sin(Math.PI*liftR),mix(1.90,2.20,liftR),.94+.04*liftR],st.yaw),startL=localWorld([-.46-.07*Math.sin(Math.PI*liftL),mix(1.88,2.20,liftL),1.0+.04*liftL],st.yaw);
      st.handR=arcMix(startR,controls.typingRight,reachR,[.03,.04,.10]);
      st.handL=arcMix(startL,controls.shutdownHand,reachL,[.03,.04,.10]);
      st.handR=arcMix(st.handR,lapR(),release,[0,.06,.06]);st.handL=arcMix(st.handL,lapL(),release,[0,.07,.08]);
      st.handLapR=1-smoother((s-.55)/3.10)+.361352657*smoother(release);st.handLapL=1-smoother((s-.70)/3.25)+.262801932*smoother(release);
      const sleeveClear=beat(s,.40,1.60,5.40,7.50);
      st.gestureElbowR=[.20*sleeveClear,0,.18*sleeveClear];st.gestureElbowL=[-.20*sleeveClear,0,.18*sleeveClear];
      chairFootsteps(st,s,audienceYaw,seatedYaw,[[1.15,2.05,2.45,3.45],[1.45,2.40,2.75,3.75]]);
      st.power=1-smoother((s-5.4)/.8);st.powerPress=(s>=5&&s<=5.4)?Math.sin((s-5)/.4*Math.PI)**2:0;st.press=st.powerPress;st.handL[1]-=.025*st.powerPress;
    }else if(index===14){
      st.screen='shutdown';st.power=0;st.lean=.07;st.headYaw=.22;st.headPitch=.01;st.bodyRoll=-.018;
      st.handR=lapR();st.handL=lapL();
      if(window.ReactionBow)Object.assign(st,window.ReactionBow.sample(s,{handR:st.handR,handL:st.handL}));
    }else{st.screen='analysis';}
    // Small, overlapping spine/clavicle motion keeps held poses alive during
    // the finite episode, while exact boundaries remain stable for navigation.
    if([0,1,2,3,4,12,13].includes(index)&&d>0){
      const envelope=beat(s,.05,.65,d-1.0,d);
      st.chestBreath=envelope*(.0025*Math.sin(s*1.20)+.0008*Math.sin(s*1.85+.6));
      st.shoulderBreath=envelope*.0015*Math.sin(s*1.20-.35);
      if(index===1||index===12)st.headPitch+=envelope*.004*Math.sin(s*1.3+.4);
    }
    Object.assign(st,rigMotion.sample(index,s,d));
    if(index!==14)st.chairYaw=st.yaw;
    return st;
  }
  function mixState(a,b,t){
    const st={};for(const k of Object.keys(a))st[k]=Array.isArray(a[k])?vMix(a[k],b[k],t):typeof a[k]==='number'?mix(a[k],b[k],t):(t<.5?a[k]:b[k]);
    if(t>0&&t<1)for(const k of ['handLapR','handLapL'])if(a[k]<0||b[k]<0)st[k]=-1;
    st.cueColor=new THREE.Color(a.cueColor).lerp(new THREE.Color(b.cueColor),t).getHex();return st;
  }
  function drawScreen(target,st){
    const q=target.getContext('2d');q.setTransform(2,0,0,2,0,0);q.clearRect(0,0,1024,600);q.fillStyle='#0a1e27';q.fillRect(0,0,1024,600);
    q.strokeStyle='#244550';q.lineWidth=2;q.strokeRect(42,36,940,527);
    q.textAlign='left';q.fillStyle='#a4c5ce';q.font='22px monospace';q.fillText(st.screen==='practice'?'REACTION PRACTICE':'S1  /  RESEARCH DESK',68,80);
    q.textAlign='right';q.fillStyle='#678b99';q.font='18px monospace';q.fillText(st.screen==='practice'?'ATTEMPT '+st.attempt+' / 5':'30 PARTICIPANTS',954,80);
    if(st.screen==='analysis-slide'||st.screen==='limitations-slide'){
      const r=screenEntry.imageRect(16/9);q.fillStyle='#f0f3f2';q.fillRect(0,0,1024,600);q.drawImage(st.screen==='analysis-slide'?analysisImage:limitationsImage,r.x*1024,r.y*600,r.width*1024,r.height*600);return;
    }
    if(st.screen==='practice'){
      window.ReactionPractice.paint(q,st);
    }else{
      const content=st.screen==='shutdown'?['INVESTIGATION COMPLETE','Shut down computer?','Press Enter to confirm']:st.screen==='question'?['WHAT COULD CHANGE IT?','Sleep · practice · time · device · sound','Choose one factor to investigate.']:st.screen==='cleaning'?['CHECK THE RECORDS','150 quiet / 148 conversation trials','Keep the exclusion rule visible.']:st.screen==='analysis'?['FOLLOW THE EVIDENCE','Distribution → paired differences','Then test the conclusion.']:st.screen==='conclusion'?['THE EFFECT IS NOT UNIFORM','19 of 30 slowed down','Individual differences matter.']:['COMPARE TWO CONDITIONS','QUIET  /  BACKGROUND CONVERSATION','Same people · 5 trials each'];
      q.textAlign='center';q.fillStyle='#d6edf1';q.font='bold 35px sans-serif';q.fillText(content[0],512,230);
      q.fillStyle='#9bd5df';q.font='24px sans-serif';q.fillText(content[1],512,315);
      q.fillStyle='#7897a2';q.font='22px sans-serif';q.fillText(content[2],512,390);
      q.strokeStyle='#3f616c';q.lineWidth=3;q.beginPath();q.moveTo(230,456);q.lineTo(794,456);q.stroke();
      q.fillStyle='#f1b66b';q.fillRect(230,451,170,10);
    }
  }
  function updateScreen(a,b,t,power){
    const key=JSON.stringify([a.screen,a.phase,a.attempt,a.checks,a.result,Math.floor((a.clickAge??.45)*30),b.screen,b.phase,b.attempt,b.checks,b.result,Math.floor((b.clickAge??.45)*30),Math.round(t*120)]);
    if(key!==lastScreenKey){
      drawScreen(screenA,a);drawScreen(screenB,b);ctx.globalAlpha=1;ctx.clearRect(0,0,2048,1200);ctx.drawImage(screenA,0,0);ctx.globalAlpha=t;ctx.drawImage(screenB,0,0);ctx.globalAlpha=1;tex.needsUpdate=true;lastScreenKey=key;
    }
    screenMat.color.setScalar(power);
  }
  function markerPosition(i,mode){
    const row=i<15?0:1,j=i%15;
    const p=[-3.14+j*.448,.635,1.46+row*.39];
    if((mode===4||mode===10)&&i>=28){p[0]=2.75+(i-28)*.35;p[1]=1.12;p[2]=.95;}
    return p;
  }
  function cameraFrame(pose){
    const view=window.ReactionCamera.toView(pose),c=new THREE.PerspectiveCamera(pose.fov,camera.aspect,.08,100);
    c.position.fromArray(view.position);c.lookAt(new THREE.Vector3(...view.target));
    return {position:c.position.clone(),quaternion:c.quaternion.clone(),fov:pose.fov};
  }
  function applyFrame(a,b,t){camera.position.lerpVectors(a.position,b.position,t);camera.quaternion.copy(a.quaternion).slerp(b.quaternion,t);camera.fov=mix(a.fov,b.fov,t);camera.updateProjectionMatrix();}
  function sample(fromIndex,toIndex,progress,storySeconds=0,fromStorySeconds){
    current={from:fromIndex,to:toIndex,progress,storySeconds,fromStorySeconds};
    const moving=fromIndex!==toIndex,p=clamp(Number(progress)||0),t=moving?smoother(p):1;
    const departureSeconds=Number.isFinite(fromStorySeconds)?fromStorySeconds:episodeDuration(fromIndex);
    const a=window.ReactionCamera.sample(poseAt(fromIndex),fromIndex,moving?departureSeconds:storySeconds);
    const b=moving?window.ReactionCamera.sample(poseAt(toIndex),toIndex,0):a;
    const sa=moving?episode(fromIndex,departureSeconds):episode(toIndex,storySeconds);
    const sb=moving?episode(toIndex,0):sa,st=mixState(sa,sb,t);
    // A jump from the closing standing pose back to a seated page needs an
    // overhead hand path. Blending the two full-body poses alone sweeps the
    // newly relaxed fingers through the desktop halfway through that jump.
    st.handoffHandLift=moving&&Math.max(sa.closingWeight,sb.closingWeight)>.01?
      .32*Math.sin(Math.PI*t):0;
    if(moving)for(const key of ['handR','handL']){
      const distance=Math.hypot(...sa[key].map((v,j)=>v-sb[key][j]));
      if(Math.min(sa[key][1],sb[key][1])<1.9&&distance>.25){
        const clearance=Math.sin(Math.PI*t)*.25;
        st[key][1]+=clearance;st[key][2]+=clearance;
      }
    }
    const travel=moving?Math.sin(Math.PI*p):0;
    const az=mix(a.azimuth,b.azimuth,t),el=mix(a.elevation,b.elevation,t),d=mix(a.distance,b.distance,t);
    const lookY=mix(a.lookY,b.lookY,t),offset=mix(a.offset,b.offset,t);
    const right=new THREE.Vector3(Math.cos(az),0,-Math.sin(az));
    const target=new THREE.Vector3(mix(a.focusX,b.focusX,t),lookY,mix(a.focusZ,b.focusZ,t)).addScaledVector(right,-offset);
    camera.position.copy(target).add(new THREE.Vector3(Math.sin(az)*Math.cos(el)*d,Math.sin(el)*d,Math.cos(az)*Math.cos(el)*d));
    camera.up.set(0,1,0);camera.lookAt(target);camera.fov=mix(a.fov,b.fov,t);camera.updateProjectionMatrix();
    if(fromIndex===5||toIndex===5||fromIndex===11||toIndex===11){
      if(fromIndex===4&&toIndex===5&&moving)screenEntry.apply(camera,cameraFrame(a),p);
      else if(fromIndex===5&&toIndex===4&&moving)screenEntry.apply(camera,cameraFrame(b),1-p);
      else if(fromIndex===11&&toIndex===12&&moving)screenEntry.applyExit(camera,cameraFrame(b),p);
      else if(fromIndex===12&&toIndex===11&&moving)screenEntry.applyExit(camera,cameraFrame(a),1-p);
      else{
        const fa=[5,11].includes(fromIndex)?screenEntry.endPose(camera):cameraFrame(a),fb=[5,11].includes(toIndex)?screenEntry.endPose(camera):cameraFrame(b);
        applyFrame(fa,fb,moving?t:1);
      }
    }
    current.typing=Math.max(st.fingerTapR||0,st.fingerTapL||0);
    character.pose(st);
    if(environment.pose)environment.pose(st);
    environment.chair.position.set(2.65+st.chairOffset[0],-.04+st.chairOffset[1],2.5+st.chairOffset[2]);environment.chair.rotation.y=st.chairYaw-Math.PI;
    greenLight.intensity=st.power*(st.cue?.55:.12);
    const screenBlend=moving&&fromIndex===4&&toIndex===5?smoother((p-.06)/.24):moving&&fromIndex===5&&toIndex===4?smoother((p-.70)/.25):moving&&fromIndex===11&&toIndex===12?smoother((p-.90)/.10):moving&&fromIndex===12&&toIndex===11?smoother(p/.10):t;
    updateScreen(sa,sb,screenBlend,st.power);
    for(const [m,original] of poweredMaterials){m.emissiveIntensity=original.emissiveIntensity*st.power;m.color.copy(original.color).multiplyScalar(.08+.92*st.power);}
    dataGroup.visible=false;markerMaterials.forEach(m=>m.opacity=mix(fromIndex===4?1:0,toIndex===4?1:0,t));
    for(let i=0;i<markers.length;i++){
      const ma=markerPosition(i,a.mode),mb=markerPosition(i,b.mode);markers[i].position.set(...vMix(ma,mb,t));
    }
    thought.position.set(3.0,4.5,2.5);thought.quaternion.copy(camera.quaternion);thought.material.opacity=0;
    for(let j=0;j<ideas.length;j++){
      const card=ideas[j];card.position.set(-2.6+j*1.35,5.25+(j%2)*1.05,-.20);
      card.quaternion.copy(camera.quaternion);card.material.opacity=0;card.scale.setScalar(j===4?1+st.choice*.15:1-st.choice*.06);
    }
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  }
  function resize(w,h,dpr){
    width=Math.max(1,Number(w)||1920);height=Math.max(1,Number(h)||1080);
    renderer.setPixelRatio(Math.min(Number(dpr)||window.devicePixelRatio||1,2));renderer.setSize(width,height,false);
    camera.aspect=width/height;camera.updateProjectionMatrix();sample(current.from,current.to,current.progress,current.storySeconds,current.fromStorySeconds);
  }
  function render(){renderer.render(scene,camera);}
  let warmupReport=null;
  async function warmup({onProgress=()=>{},yieldControl=()=>Promise.resolve()}={}){
    const saved={...current},shots=[];
    for(const i of[0,1,2,3,4,12,13,14]){const d=episodeDuration(i);for(const t of[0,Math.min(.9,d),d*.45,d*.8,d])shots.push([i,i,1,t]);}
    for(const[from,to]of[[4,5],[5,4],[11,12],[12,11],[12,13],[13,14]])for(const p of[.10,.55,.95])shots.push([from,to,p,0]);
    const total=textures.size+shots.length+1;let done=0,uploaded=0,compiled=false,drained=false;
    const advance=async detail=>{onProgress(++done,total,detail);await yieldControl();};
    onProgress(0,total,'Uploading textures');await yieldControl();
    try{
      for(const texture of textures){if(renderer.initTexture){renderer.initTexture(texture);uploaded++;}await advance('Textures');}
      sample(0,0,1,0);
      if(renderer.compileAsync){await renderer.compileAsync(scene,camera);compiled=true;}
      else if(renderer.compile){renderer.compile(scene,camera);compiled=true;}
      await advance('Scene shaders');
      for(const shot of shots){sample(...shot);render();await advance(`Shot ${shot[0]+1} → ${shot[1]+1}`);}
      // A single startup drain keeps pending uploads/draws under the cover.
      // No GPU wait or readback is introduced into the playback loop.
      const gl=renderer.getContext?.();if(gl?.finish){gl.finish();drained=true;}await yieldControl();
      warmupReport={textures:uploaded,compiled,renderedShots:shots.length,episodes:[0,1,2,3,4,12,13,14],transitionPairs:[[4,5],[5,4],[11,12],[12,11],[12,13],[13,14]],gpuDrained:drained};
      return warmupReport;
    }finally{sample(saved.from,saved.to,saved.progress,saved.storySeconds,saved.fromStorySeconds);render();}
  }
  const semanticBones=Object.fromEntries(['hand_l','hand_r','hip','neck'].map(k=>[k,character.group.getObjectByName('student_'+k+'_rig')]));
  function semanticAnchors(){
    const project=o=>{const p=o.getWorldPosition(new THREE.Vector3()).project(camera);return [(p.x+1)*960,(1-p.y)*540];};
    return {typing:current.typing||0,screen:project(props.screen),handR:project(semanticBones.hand_l),handL:project(semanticBones.hand_r),head:project(semanticBones.neck),closingSecond:current.to===14?window.ReactionBow.clock(current.storySeconds):0};
  }
  function dispose(){studySpeakers.dispose();artDirection.dispose();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();}
  resize(canvas.clientWidth||1920,canvas.clientHeight||1080,window.devicePixelRatio||1);sample(0,0,1);
  // Compile and upload the initial scene while the loading cover is present.
  // The first visible click sequence should not pay the shader warm-up cost.
  report('scene',4,4,'Lights & camera ready');await yieldControl();
  if(!options.deferWarmup){if(renderer.compileAsync)await renderer.compileAsync(scene,camera);else if(renderer.compile)renderer.compile(scene,camera);render();}
  return {resize,sample,render,warmup,dispose,episodeDuration,semanticAnchors,metrics(){return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};},inspect(){return {warmup:warmupReport,artDirection:artDirection.report,speakers:studySpeakers.report,motionSource:rigMotion.source,textureInfo,maxTextureSize:renderer.capabilities.maxTextureSize,character:character.inspect(),props:props.stats,environment:environment.stats,workstation:workstation.anchors,screenTransition:screenEntry.inspect(camera),render:renderer.info.render};}};
};
