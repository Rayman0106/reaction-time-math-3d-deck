/* Nathan's original Sketchfab mesh, skin and materials, posed from its bind pose.
 * The legacy scene's R/L labels refer to its local +X/-X hands, so R drives
 * Nathan's anatomical left hand and L drives his anatomical right hand.
 */
window.createNathanCharacter = function createNathanCharacter(THREE, gltf) {
  const model = gltf.scene;
  const isStudent=!!model.getObjectByName('CC_Base_Hip_02');
  if(isStudent){
    model.getObjectByName('Skate_Board')?.removeFromParent();
    // These untextured Character Creator body proxies sit underneath the
    // authored hoodie/shorts. Their waist/thigh polygons protrude through the
    // outer garments in seated and standing poses; the exposed skin uses its
    // own textured head/arm/leg meshes and remains visible.
    model.traverse(mesh=>{
      if(mesh.isSkinnedMesh&&['lambert20','lambert17'].includes(mesh.material?.name)){
        mesh.visible=false;mesh.userData.coveredBodyProxy=true;
      }
    });
  }
  const group = new THREE.Group();
  group.name = isStudent?'Student investigator':'Nathan seated investigator';
  group.position.set(2.65, 0, 2.5);
  const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
  const Q = () => new THREE.Quaternion();
  const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
  const bones=[], meshes=[];
  model.traverse(o=>{if(o.isBone)bones.push(o);if(o.isSkinnedMesh)meshes.push(o);});
  if(!meshes.length) throw new Error('Nathan model does not contain its original skin.');
  if(isStudent){
    // The FBX conversion inserts nonuniform scale-compensation objects between
    // joints. Arbitrary IK rotations under them introduce shear and toe flips.
    // Build a rigid hierarchy at identical joint positions, then update inverse
    // binds so every mesh's current skinned surface is preserved algebraically.
    model.updateMatrixWorld(true);
    const oldWorld=new Map(bones.map(b=>[b,b.matrixWorld.clone()]));
    const rigidWorld=new Map(bones.map(b=>{
      const p=V(),q=Q(),s=V();b.matrixWorld.decompose(p,q,s);
      return [b,new THREE.Matrix4().compose(p,q.normalize(),V(1,1,1))];
    }));
    const parents=new Map(bones.map(b=>{let p=b.parent;while(p&&!p.isBone)p=p.parent;return [b,p];}));
    const skeletons=[...new Set(meshes.map(m=>m.skeleton))];
    const inverseBinds=new Map(skeletons.map(s=>[s,s.boneInverses.map(m=>m.clone())]));
    const rig=new THREE.Group();rig.name='Student_Rigid_Rig';model.add(rig);rig.updateWorldMatrix(true,false);
    bones.forEach(b=>b.removeFromParent());
    for(const b of bones){
      const parent=parents.get(b);(parent||rig).add(b);
      const parentMatrix=parent?rigidWorld.get(parent):rig.matrixWorld;
      const local=parentMatrix.clone().invert().multiply(rigidWorld.get(b));
      local.decompose(b.position,b.quaternion,b.scale);b.quaternion.normalize();
    }
    model.updateMatrixWorld(true);
    for(const skeleton of skeletons){
      skeleton.boneInverses=skeleton.bones.map((b,i)=>b.matrixWorld.clone().invert().multiply(oldWorld.get(b)).multiply(inverseBinds.get(skeleton)[i]));
      skeleton.update();
    }
    // Keep the GLB's valid neutral pose. Skeleton.pose() cannot reconstruct the
    // FBX export's non-bone scale-compensation nodes and distorts this asset.
    // Map semantic joints only; skin indices, bind matrices and parents survive.
    const joints={Hip:'hip',Waist:'spine_01',Spine02:'spine_03',NeckTwist01:'neck',
      Head:'head',JawRoot:'jaw',L_Eye:'eye_l',R_Eye:'eye_r'};
    for(const side of ['L','R']){
      const s=side.toLowerCase();
      for(const [source,target] of Object.entries({Clavicle:'shoulder',Upperarm:'upperarm',Forearm:'lowerarm',Hand:'hand',Thigh:'upperleg',Calf:'lowerleg',Foot:'foot'}))joints[side+'_'+source]=target+'_'+s;
      for(const [source,target] of Object.entries({Index:'index',Mid:'middle',Ring:'ring',Pinky:'pinky',Thumb:'thumb'}))for(let n=1;n<=3;n++)joints[side+'_'+source+n]=target+'_0'+n+'_'+s;
    }
    for(const [source,target] of Object.entries(joints)){
      const joint=bones.find(b=>new RegExp('^CC_Base_'+source+'_0[0-9]+$').test(b.name));
      if(!joint)throw new Error('Student rig missing '+source);
      joint.userData.originalBoneName=joint.name;joint.name='student_'+target+'_rig';
    }
    // Normalize the imported A pose to one shared bind space. The source FBX
    // has different inverse-bind offsets on main, twist and share joints.
    // Bake its visible neutral surface once before recalculating inverse binds;
    // clothing and skin can then share weights without spikes or knee shearing.
    model.updateMatrixWorld(true);
    for(const skeleton of skeletons)skeleton.update();
    const neutralSurfaces=meshes.map(mesh=>{
      const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
      const indices=mesh.geometry.attributes.skinIndex,weights=mesh.geometry.attributes.skinWeight;
      const positions=new Float32Array(p.count*3),normals=new Float32Array(n.count*3);
      const matrix=new THREE.Matrix4(),joint=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3();
      for(let i=0;i<p.count;i++){
        mesh.getVertexPosition(i,V()).toArray(positions,i*3);
        matrix.elements.fill(0);
        for(let j=0;j<4;j++){
          joint.fromArray(mesh.skeleton.boneMatrices,indices.getComponent(i,j)*16);
          const weight=weights.getComponent(i,j);
          for(let k=0;k<16;k++)matrix.elements[k]+=joint.elements[k]*weight;
        }
        matrix.premultiply(mesh.bindMatrixInverse).multiply(mesh.bindMatrix);
        normalMatrix.setFromMatrix4(matrix);
        V().fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize().toArray(normals,i*3);
      }
      return {mesh,positions,normals};
    });
    for(const {mesh,positions,normals}of neutralSurfaces){
      mesh.geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
      mesh.geometry.setAttribute('normal',new THREE.BufferAttribute(normals,3));
      mesh.geometry.computeBoundingBox();mesh.geometry.computeBoundingSphere();
    }
    for(const skeleton of skeletons){skeleton.calculateInverses();skeleton.update();}
    for(const mesh of meshes)mesh.bind(mesh.skeleton,mesh.matrixWorld.clone());
  }
  // The GLB's initial transforms are a walking frame. Inverse bind matrices
  // restore the neutral skeleton before any seated or gesturing pose is made.
  meshes.forEach(m=>{if(!isStudent)m.skeleton.pose();m.castShadow=true;m.receiveShadow=false;m.frustumCulled=false;});
  model.updateMatrixWorld(true);
  const bone = key => {
    const found=bones.find(b=>b.name.includes('_'+key+'_'));
    if(!found)throw new Error('Nathan rig missing '+key);
    return found;
  };
  const world = o => o.getWorldPosition(V());
  const worldQ = o => o.getWorldQuaternion(Q());
  const hip=bone('hip'),spine=bone('spine_01'),chest=bone('spine_03'),neck=bone('neck'),head=bone('head'),jaw=bone('jaw');
  const sourceHip=world(hip);
  const sourceBounds=new THREE.Box3().setFromObject(model,true);
  const uniformScale=4.5/(sourceBounds.max.y-sourceBounds.min.y);
  const seatedPelvisHeight=isStudent?1.5:1.6;
  // A little knee flexion below the measured bind-pose standing pelvis avoids
  // locking the legs straight. Zero-valued controls retain the seated rig.
  const soleAdjustment=isStudent?.0326:0;
  const standingPelvis=(sourceHip.y-sourceBounds.min.y)*uniformScale-.035-soleAdjustment;
  const wardrobeRepair={normalizedBindMeshes:isStudent?meshes.length:0,maskedLegFaces:0,transferredShortsVertices:0,hemClearanceVertices:0,gussetShapeVertices:0};
  let clothCorrection=null;
  if(isStudent&&window.DECK_WARDROBE_REPAIR!==false){
    const skin=meshes.find(m=>m.material.name==='Std_Skin_Leg1'),shorts=meshes.find(m=>m.material.name==='phong6');
    shorts.material.side=THREE.DoubleSide;
    const reference=m=>Array.from({length:m.geometry.attributes.position.count},(_,i)=>{
      const p=V();m.getVertexPosition(i,p);m.localToWorld(p);return p.sub(sourceHip).multiplyScalar(uniformScale).add(V(0,standingPelvis,0));
    });
    const body=reference(skin),cloth=reference(shorts),bodyIndex=Array.from(skin.geometry.index.array);
    const triangles=[];
    for(let i=0;i<bodyIndex.length;i+=3){const ids=bodyIndex.slice(i,i+3);triangles.push({ids,triangle:new THREE.Triangle(...ids.map(j=>body[j]))});}
    const oldPosition=shorts.geometry.attributes.position,oldNormal=shorts.geometry.attributes.normal;
    const indices=shorts.geometry.attributes.skinIndex,weights=shorts.geometry.attributes.skinWeight;
    const bodyWeights=skin.geometry.attributes.skinWeight,bodyBones=skin.geometry.attributes.skinIndex;
    const boneIndex=new Map(shorts.skeleton.bones.map((b,i)=>[b,i]));
    const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
    shorts.skeleton.update();
    clothCorrection={mesh:shorts,vertices:[]};
    const skinMatrix=(ids,values)=>{
      const sum=new THREE.Matrix4();sum.elements.fill(0);
      for(let j=0;j<4;j++){const m=new THREE.Matrix4().fromArray(shorts.skeleton.boneMatrices,ids[j]*16);for(let k=0;k<16;k++)sum.elements[k]+=m.elements[k]*values[j];}
      return shorts.bindMatrixInverse.clone().multiply(sum).multiply(shorts.bindMatrix);
    };
    for(let i=0;i<cloth.length;i++){
      const p=cloth[i];let blend=clamp((1.72-p.y)/.32);
      // The central gusset must have a continuous binding across the seam.
      // A nearest-leg assignment switched the two sides of a short edge from
      // 100% right calf to 100% left calf and stretched it into a fabric bridge.
      const gusset=smooth((.18-Math.abs(p.x))/.13)*smooth((2.02-p.y)/.3);
      if(!blend&&!gusset)continue;
      let closest=null,distance=Infinity,point=V();
      for(const t of triangles){if(Math.sign(body[t.ids[0]].x)!==Math.sign(p.x))continue;const v=t.triangle.closestPointToPoint(p,V()),d=v.distanceToSquared(p);if(d<distance){distance=d;closest=t;point=v;}}
      if(!closest||distance>.22*.22)blend=0;
      const bary=closest?.triangle.getBarycoord(point,V()),influences=new Map(),fitted=new Map();
      const add=(id,w)=>influences.set(id,(influences.get(id)||0)+w);
      const fitAdd=(id,w)=>fitted.set(id,(fitted.get(id)||0)+w);
      const originalIds=[0,1,2,3].map(j=>indices.getComponent(i,j)),originalWeights=[0,1,2,3].map(j=>weights.getComponent(i,j));
      for(let j=0;j<4;j++)fitAdd(originalIds[j],originalWeights[j]*(1-blend));
      if(blend)closest.ids.forEach((id,v)=>{for(let j=0;j<4;j++){const b=skin.skeleton.bones[bodyBones.getComponent(id,j)],mapped=boneIndex.get(b);if(mapped!==undefined)fitAdd(mapped,bodyWeights.getComponent(id,j)*bary.getComponent(v)*blend);}});
      for(const[id,w]of fitted)add(id,w*(1-gusset));
      const waist=smooth((p.y-1.40)/.65),left=smooth(.5+p.x/.30);
      add(boneIndex.get(hip),gusset*waist);
      add(boneIndex.get(bone('upperleg_l')),gusset*(1-waist)*left);
      add(boneIndex.get(bone('upperleg_r')),gusset*(1-waist)*(1-left));
      const chosen=[...influences].sort((a,b)=>b[1]-a[1]).slice(0,4),total=chosen.reduce((sum,v)=>sum+v[1],0);
      while(chosen.length<4)chosen.push([0,0]);const newIds=chosen.map(v=>v[0]),newWeights=chosen.map(v=>v[1]/total);
      const fitChosen=[...fitted].sort((a,b)=>b[1]-a[1]).slice(0,4),fitTotal=fitChosen.reduce((s,v)=>s+v[1],0);while(fitChosen.length<4)fitChosen.push([0,0]);
      const fitIds=fitChosen.map(v=>v[0]),fitWeights=fitChosen.map(v=>v[1]/fitTotal);
      // Each imported joint has its own inverse bind. Preserve the exact
      // visible reference surface and normals while changing only the weights.
      const oldM=skinMatrix(originalIds,originalWeights),newM=skinMatrix(newIds,newWeights);
      const visiblePosition=V().fromBufferAttribute(oldPosition,i).applyMatrix4(oldM);
      const fitVisiblePosition=visiblePosition.clone();
      if(p.y<1.48&&closest){
        const normal=closest.triangle.getNormal(V()),clearance=p.clone().sub(point).dot(normal);
        const fullAmount=clamp(.045-clearance,0,.085)*clamp((1.48-p.y)/.12),amount=fullAmount*(1-gusset);
        if(fullAmount>0){const corrected=p.clone().addScaledVector(normal,fullAmount).sub(V(0,standingPelvis,0)).divideScalar(uniformScale).add(sourceHip);fitVisiblePosition.copy(shorts.worldToLocal(corrected));}
        if(amount>0){
          const corrected=p.clone().addScaledVector(normal,amount).sub(V(0,standingPelvis,0)).divideScalar(uniformScale).add(sourceHip);
          visiblePosition.copy(shorts.worldToLocal(corrected));wardrobeRepair.hemClearanceVertices++;
        }
      }
      // The source's very low, baggy crotch hid the two tubes from the front.
      // Lift only the standing inner gusset into a shallow arch; the seated
      // corrective retains the original drape and the textured outer hems.
      const crotchRise=.12*smooth((.16-Math.abs(p.x))/.16)*smooth((1.60-p.y)/.30);
      if(crotchRise>0){
        const corrected=p.clone();corrected.y+=crotchRise;
        const local=corrected.sub(V(0,standingPelvis,0)).divideScalar(uniformScale).add(sourceHip);
        const originalLocal=p.clone().sub(V(0,standingPelvis,0)).divideScalar(uniformScale).add(sourceHip);
        visiblePosition.add(shorts.worldToLocal(local).sub(shorts.worldToLocal(originalLocal)));wardrobeRepair.gussetShapeVertices++;
      }
      const position=visiblePosition.applyMatrix4(newM.clone().invert());
      const normal=V().fromBufferAttribute(oldNormal,i).applyMatrix3(new THREE.Matrix3().setFromMatrix4(oldM)).applyMatrix3(new THREE.Matrix3().setFromMatrix4(newM).invert()).normalize();
      if(gusset>0){
        const fitM=skinMatrix(fitIds,fitWeights),fitNormal=V().fromBufferAttribute(oldNormal,i).applyMatrix3(new THREE.Matrix3().setFromMatrix4(oldM)).applyMatrix3(new THREE.Matrix3().setFromMatrix4(fitM).invert()).normalize();
        clothCorrection.vertices.push({i,fitIds,fitWeights,fitPosition:fitVisiblePosition.applyMatrix4(fitM.clone().invert()),fitNormal,position:position.clone(),normal:normal.clone(),newIds,newWeights});
      }
      oldPosition.setXYZ(i,...position.toArray());oldNormal.setXYZ(i,...normal.toArray());
      indices.setXYZW(i,...newIds);weights.setXYZW(i,...newWeights);wardrobeRepair.transferredShortsVertices++;
    }
    for(const attribute of [oldPosition,oldNormal,indices,weights])attribute.needsUpdate=true;
    shorts.geometry.computeVertexNormals();
    for(const v of clothCorrection.vertices)v.normal.fromBufferAttribute(shorts.geometry.attributes.normal,v.i);
    wardrobeRepair.binding='Continuous pelvis/thigh gusset with knee-flexion correction; fitted independent leg hems';
    wardrobeRepair.correctiveVertices=clothCorrection.vertices.length;
    // Keep an overlap band beneath the hem; remove only the covered upper-leg
    // faces. The visible knees, calves, socks and sneakers remain complete.
    const visible=[];
    for(let i=0;i<bodyIndex.length;i+=3){const face=bodyIndex.slice(i,i+3);if(face.every(j=>body[j].y>1.22))wardrobeRepair.maskedLegFaces++;else visible.push(...face);}
    skin.geometry.setIndex(visible);skin.userData.clothingMask='Shorts coverage with retained hem overlap';
  }
  const rest=bones.map(b=>({bone:b,position:b.position.clone(),quaternion:b.quaternion.clone(),scale:b.scale.clone()}));
  const restWorldQ=new Map(bones.map(b=>[b,worldQ(b)]));
  const closingBones=(window.DECK_RIG_MOTION?.closing?.boneNames||[]).map(name=>bones.find(b=>b.name===name));
  const danceFingerBones=(window.DECK_RIG_MOTION?.dance?.fingers?.boneNames||[]).map(name=>bones.find(b=>b.name===name));
  const motionNames=['spine_01','spine_02','spine_03','neck_01','head','clavicle_l','clavicle_r'];
  for(const side of ['l','r'])for(const digit of ['index','middle','ring','pinky','thumb'])for(let n=1;n<=3;n++)motionNames.push(`${digit}_0${n}_${side}`);
  motionNames.push('hand_l','hand_r','upperarm_l','lowerarm_l','upperarm_r','lowerarm_r');
  const motionBones=motionNames.map(key=>{
    if(key==='spine_02')return isStudent?bones.find(b=>/^CC_Base_Spine01_0[0-9]+$/.test(b.name)):null;
    return bone(key.replace('neck_01','neck').replace('clavicle','shoulder'));
  });
  function authoredRotation(state,index,weight=1){
    const joint=motionBones[index],values=state.rigPose;
    if(!joint||!Array.isArray(values))return;
    const delta=Q().slerp(Q().fromArray(values,index*4).normalize(),weight),basis=restWorldQ.get(joint);
    // Change the canonical motion axis into this imported joint's rest basis.
    const local=basis.clone().invert().multiply(delta).multiply(basis);
    joint.quaternion.multiply(local).normalize();joint.updateWorldMatrix(false,true);
  }
  const hands=['l','r'].map((side,j)=>{
    const hand=bone('hand_'+side),middle=bone('middle_01_'+side);
    const index=bone('index_01_'+side),pinky=bone('pinky_01_'+side);
    const forward=world(middle).sub(world(hand)).normalize();
    const across=world(index).sub(world(pinky)).normalize();
    let normal=V().crossVectors(forward,across).normalize();
    // A neutral T-pose has palms facing down. Fix the winding on each side.
    if(normal.y>0)normal.negate();
    const lateral=V().crossVectors(forward,normal).normalize();
    normal=V().crossVectors(lateral,forward).normalize();
    const frame=new THREE.Matrix4().makeBasis(forward,normal,lateral);
    return {key:j===0?'R':'L',side:j===0?1:-1,sourceSide:side,
      shoulder:bone('shoulder_'+side),upper:bone('upperarm_'+side),lower:bone('lowerarm_'+side),hand,
      restFrameQ:Q().setFromRotationMatrix(frame),restHandQ:worldQ(hand),
      fingers:bones.filter(b=>new RegExp('_(index|middle|ring|pinky)_0[123]_'+side+'_').test(b.name)),
      thumbs:bones.filter(b=>new RegExp('_thumb_0[12]_'+side+'_').test(b.name))};
  });
  const legs=['l','r'].map((side,j)=>({side:j===0?1:-1,
    upper:bone('upperleg_'+side),lower:bone('lowerleg_'+side),foot:bone('foot_'+side)}));
  const shareJoints=[];
  if(isStudent)for(const side of ['L','R'])for(const [kind,upper,lower]of [['Knee','upperleg','lowerleg'],['Elbow','upperarm','lowerarm']]){
    const joint=bones.find(b=>new RegExp('^CC_Base_'+side+'_'+kind+'ShareBone_0[0-9]+$').test(b.name));
    if(joint)shareJoints.push({joint,upper:bone(upper+'_'+side.toLowerCase()),lower:bone(lower+'_'+side.toLowerCase())});
  }
  group.add(model);
  model.scale.setScalar(uniformScale);
  model.position.set(-sourceHip.x*uniformScale,seatedPelvisHeight-sourceHip.y*uniformScale,-sourceHip.z*uniformScale);
  const seatedModelPosition=model.position.clone();
  const toWorld = p => group.localToWorld(Array.isArray(p)?V(...p):p.clone());
  const axisWorld = p => (Array.isArray(p)?V(...p):p.clone()).applyQuaternion(worldQ(group)).normalize();
  function setWorldQ(o,q){
    const parentQ=o.parent?worldQ(o.parent):Q();
    o.quaternion.copy(parentQ.invert().multiply(q)).normalize();
    o.updateWorldMatrix(false,true);
  }
  function rotateWorld(o,axis,angle){
    if(!angle)return;
    setWorldQ(o,Q().setFromAxisAngle(axis,angle).multiply(worldQ(o)));
  }
  function aimChild(o,child,target){
    const origin=world(o),from=world(child).sub(origin).normalize(),to=target.clone().sub(origin).normalize();
    setWorldQ(o,Q().setFromUnitVectors(from,to).multiply(worldQ(o)));
  }
  function solveLimb(upper,lower,end,requested,pole){
    const root=world(upper),joint=world(lower),tip=world(end);
    const a=root.distanceTo(joint),b=joint.distanceTo(tip);
    const delta=requested.clone().sub(root),rawDistance=delta.length();
    const distance=clamp(rawDistance,Math.abs(a-b)+.0001,a+b-.0001);
    const direction=delta.normalize();
    const actual=root.clone().addScaledVector(direction,distance);
    const bend=pole.clone().sub(root).addScaledVector(direction,-pole.clone().sub(root).dot(direction));
    if(bend.lengthSq()<1e-10)bend.copy(axisWorld([1,0,0]));
    bend.normalize();
    const along=(a*a+distance*distance-b*b)/(2*distance);
    const rise=Math.sqrt(Math.max(0,a*a-along*along));
    const jointTarget=root.clone().addScaledVector(direction,along).addScaledVector(bend,rise);
    aimChild(upper,lower,jointTarget);
    aimChild(lower,end,actual);
    return {requested:requested.toArray(),actual:world(end).toArray(),joint:world(lower).toArray(),root:world(upper).toArray(),error:world(end).distanceTo(requested),reach:a+b,requestedDistance:rawDistance};
  }
  function frameQuaternion(forward,normal){
    forward=forward.clone().normalize();
    normal=normal.clone().addScaledVector(forward,-normal.dot(forward)).normalize();
    const lateral=V().crossVectors(forward,normal).normalize();
    return Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(forward,normal,lateral));
  }
  function handFrame(hand,state,target){
    const localTarget=group.worldToLocal(target.clone());
    const thinking=clamp(Number(state.thinkBlend)||0)*(hand.key==='R'?1:0);
    const open=clamp(Number(state['palmOpen'+hand.key])||0),mouseGrip=clamp(Number(state['mouseGrip'+hand.key])||0);
    const explicitLap=state['handLap'+hand.key];
    const lap=Number.isFinite(explicitLap)&&explicitLap>=0?clamp(explicitLap):clamp((.86-localTarget.z)/.23)*clamp((2.20-localTarget.y)/.45);
    // At the lap the fingers follow the downward forearm. On the desktop
    // they rest almost level. Neither pose locks the wrist at a right angle.
    const forward=V(-hand.side*(.10+.08*lap),-.06-.64*lap,1-.24*lap).normalize();
    const explaining=clamp(Number(state['explain'+hand.key])||0);
    forward.lerp(V(hand.side*.54,.07,.84).normalize(),explaining).normalize();
    forward.lerp(V(.10,-.22,1).normalize(),mouseGrip).normalize();
    let orientation=frameQuaternion(forward,V(0,-1,0));
    // Turning a palm upward is a continuous forearm/wrist roll. Slerping a
    // separate chin frame also avoids the old 180-degree opacity threshold.
    const openRoll=Q().setFromAxisAngle(forward,-hand.side*Math.PI*(open+(1-open)*explaining));
    orientation.premultiply(openRoll);
    const chin=frameQuaternion(V(-hand.side*.12,1,-.18),V(hand.side*.10,-.15,-1));
    const support=clamp(Number(state.thinkSupport)||0);
    if(support)chin.slerp(frameQuaternion(V(-hand.side*.08,.93,-.36),V(hand.side*.10,-.35,-1)),support);
    orientation.slerp(chin,thinking);
    const standingHands=Number.isFinite(state.standHands)?clamp(state.standHands):clamp(Number(state.stand)||0);
    if(standingHands){
      // Fingers hang down beside the thighs, with palms turned inward. This is
      // a continuous frame blend, including when the hands leave the keyboard.
      const down=frameQuaternion(V(-hand.side*.06,-1,.10),V(-hand.side,0,0));
      orientation.slerp(down,standingHands);
    }
    let fingerForward=V(1,0,0).applyQuaternion(orientation);
    const wristRoll=clamp(Number(state['wristRoll'+hand.key])||0,-.55,.55);
    orientation.premultiply(Q().setFromAxisAngle(fingerForward,wristRoll));
    fingerForward=V(1,0,0).applyQuaternion(orientation);
    const palmNormal=V(0,1,0).applyQuaternion(orientation),lateral=V(0,0,1).applyQuaternion(orientation);
    return {fingerForward,palmNormal,lateral,thinking,open,lap,mouseGrip};
  }
  function handOrientation(hand,state,frame){
    const {fingerForward,palmNormal,lateral,thinking,open,lap,mouseGrip}=frame;
    const desiredFrame=Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(fingerForward,palmNormal,lateral));
    const desiredQ=worldQ(group).multiply(desiredFrame).multiply(hand.restFrameQ.clone().invert()).multiply(hand.restHandQ);
    setWorldQ(hand.hand,desiredQ);
    // Fingers have different resting curls; the ring and little finger close
    // a little more. An open explaining hand remains soft, rather than rigid.
    const bendAxis=axisWorld(lateral);
    const press=clamp((Number(state['fingerTap'+hand.key])||0)+(hand.key==='L'?(Number(state.press)||0):0));
    const curls={index:.085,middle:.13,ring:.18,pinky:.23};
    for(const finger of hand.fingers){
      const match=finger.name.match(/_(index|middle|ring|pinky)_0([123])_/),type=match[1],segment=Number(match[2]);
      const isIndex=type==='index',segmentWeight=segment===1?.8:segment===2?1.12:.72;
      const hanging=Number.isFinite(state.standHands)?clamp(state.standHands):clamp(Number(state.stand)||0);
      const gripCurl={index:.16,middle:.20,ring:.40,pinky:.46}[type];
      const relaxed=(curls[type]*(1-mouseGrip)+gripCurl*mouseGrip+lap*.045+hanging*.10+(hand.side===1?.012:0))*segmentWeight;
      const curl=relaxed*(1-open*.82)+thinking*(isIndex?.035:.18)+thinking*clamp(Number(state.thinkSupport)||0)*(isIndex?.64:.52)+(isIndex?press*(segment===2?.18:.10):0);
      rotateWorld(finger,bendAxis,curl);
    }
    for(const thumb of hand.thumbs)rotateWorld(thumb,axisWorld(palmNormal),hand.side*(.10+.08*lap+.18*mouseGrip)*(1-open*.65));
  }
  // Allocate weight bindings and scratch math once. Each frame only updates
  // their values from the live skeleton; the verified corrective is unchanged.
  const clothScratch={sum:new THREE.Matrix4(),bone:new THREE.Matrix4(),position:V(),normal:V()};
  if(clothCorrection){
    const bindings=new Map();
    const binding=(ids,weights)=>{const key=ids.join(',')+'|'+weights.join(',');if(!bindings.has(key))bindings.set(key,{offsets:ids.map(i=>i*16),weights,matrix:new THREE.Matrix4(),inverse:new THREE.Matrix4(),normal:new THREE.Matrix3(),normalInverse:new THREE.Matrix3()});return bindings.get(key);};
    for(const v of clothCorrection.vertices){v.fitBinding=binding(v.fitIds,v.fitWeights);v.targetBinding=binding(v.newIds,v.newWeights);}
    clothCorrection.bindings=[...bindings.values()];
  }
  function correctClothing(standing){
    if(!clothCorrection)return;
    const {mesh,vertices,bindings}=clothCorrection,positions=mesh.geometry.attributes.position,normals=mesh.geometry.attributes.normal;
    const {sum,bone,position:posedPosition,normal:posedNormal}=clothScratch;
    if(standing<1)for(const record of bindings){
      sum.elements.fill(0);
      for(let j=0;j<4;j++){bone.fromArray(mesh.skeleton.boneMatrices,record.offsets[j]);for(let k=0;k<16;k++)sum.elements[k]+=bone.elements[k]*record.weights[j];}
      record.matrix.copy(mesh.bindMatrixInverse).multiply(sum).multiply(mesh.bindMatrix);
      record.inverse.copy(record.matrix).invert();record.normal.setFromMatrix4(record.matrix);record.normalInverse.copy(record.normal).invert();
    }
    // A pose-space corrective preserves the verified seated knee/hem fit.
    // It blends actual geometry into the continuous standing gusset after
    // rising. GPU rendering and CPU intersection checks see the same surface.
    for(const v of vertices){
      let position=v.position,normal=v.normal;
      if(standing<1){
        position=posedPosition.copy(v.fitPosition).applyMatrix4(v.fitBinding.matrix).applyMatrix4(v.targetBinding.inverse).lerp(v.position,standing);
        normal=posedNormal.copy(v.fitNormal).applyMatrix3(v.fitBinding.normal).applyMatrix3(v.targetBinding.normalInverse).normalize().lerp(v.normal,standing).normalize();
      }
      positions.setXYZ(v.i,position.x,position.y,position.z);normals.setXYZ(v.i,normal.x,normal.y,normal.z);
    }
    positions.needsUpdate=true;normals.needsUpdate=true;
  }
  let last={};
  function pose(state={}){
    for(const r of rest){r.bone.position.copy(r.position);r.bone.quaternion.copy(r.quaternion);r.bone.scale.copy(r.scale);}
    const stand=clamp(Number(state.stand)||0),bow=clamp(Number(state.bow)||0)*stand;
    const stanceLower=clamp(Number(state.stanceLower)||0,0,.18)*stand;
    const rootOffset=Array.isArray(state.rootOffset)?state.rootOffset:[0,0,0];
    group.position.set(2.65+(Number(rootOffset[0])||0),Number(rootOffset[1])||0,2.5+(Number(rootOffset[2])||0));
    group.rotation.set(0,Number.isFinite(state.yaw)?state.yaw:-2.42,0);
    model.position.copy(seatedModelPosition);
    model.position.y+=(standingPelvis-seatedPelvisHeight)*stand-.045*bow-stanceLower;
    model.position.z-=.09*bow;
    group.updateMatrixWorld(true);
    // All weight shifts come from the finite episode state, with the pelvis
    // seated and both feet solved back to the floor. There is no idle drift.
    const lean=Number.isFinite(state.lean)?state.lean:.12;
    const bodyRoll=clamp(Number(state.bodyRoll)||0,-.15,.15),bodyYaw=clamp(Number(state.bodyYaw)||0,-.35,.35);
    rotateWorld(hip,axisWorld([0,0,1]),bodyRoll*.15+clamp(Number(state.pelvisSway)||0,-.06,.06));
    // Most of the 30-degree bow is a hip hinge; the remainder rounds the spine
    // gently. Solving both legs afterwards keeps the ankles on their anchors.
    rotateWorld(hip,axisWorld([1,0,0]),bow*Math.PI/6*.78);
    rotateWorld(spine,axisWorld([1,0,0]),lean*.65);
    rotateWorld(chest,axisWorld([1,0,0]),lean*.35+clamp(Number(state.chestBreath)||0,-.02,.02));
    rotateWorld(spine,axisWorld([1,0,0]),bow*Math.PI/6*.15);
    rotateWorld(chest,axisWorld([1,0,0]),bow*Math.PI/6*.07);
    rotateWorld(spine,axisWorld([0,0,1]),bodyRoll*.55);
    rotateWorld(chest,axisWorld([0,0,1]),bodyRoll*.30);
    rotateWorld(spine,axisWorld([0,1,0]),bodyYaw*.55);
    rotateWorld(chest,axisWorld([0,1,0]),bodyYaw*.45);
    const headRoll=clamp(Number(state.headRoll)||0,-.25,.25);
    rotateWorld(neck,axisWorld([0,0,1]),headRoll*.25);
    const neckFollow=clamp(Number(state.neckFollow)||0),headYaw=Number(state.headYaw)||0,headPitch=Number(state.headPitch)||0;
    rotateWorld(neck,axisWorld([0,1,0]),headYaw*.30*neckFollow);
    rotateWorld(neck,axisWorld([1,0,0]),headPitch*.25*neckFollow);
    rotateWorld(head,axisWorld([0,1,0]),headYaw*(1-.30*neckFollow));
    rotateWorld(head,axisWorld([1,0,0]),headPitch*(1-.25*neckFollow));
    rotateWorld(head,axisWorld([0,0,1]),headRoll*.75);
    rotateWorld(jaw,axisWorld([1,0,0]),clamp(Number(state.mouth)||0)*.14);
    for(const eye of [bone('eye_l'),bone('eye_r')]){
      rotateWorld(eye,axisWorld([0,1,0]),clamp(Number(state.gazeYaw)||0,-.15,.15));
      rotateWorld(eye,axisWorld([1,0,0]),clamp(Number(state.gazePitch)||0,-.15,.15));
    }
    for(let j=0;j<7;j++)authoredRotation(state,j);
    last={hands:{},feet:{},standing:{stand,bow,pelvisHeight:seatedPelvisHeight+(standingPelvis-seatedPelvisHeight)*stand-.045*bow-stanceLower,bowDegrees:bow*30,rootOffset:group.position.clone().sub(V(2.65,0,2.5)).toArray()}};
    for(const leg of legs){
      const lag=clamp(Number(state.footYawLag)||0,-.20,.20);
      const stance=leg.side===1?[.34,.225,.97]:[-.29,.25,.81];
      const standingStance=leg.side===1?[.29,.225,.12]:[-.29,.25,.04];
      const feetBlend=Number.isFinite(state.footPlant)?clamp(state.footPlant):stand;
      const localFoot=V(...stance).lerp(V(...standingStance),feetBlend);
      const explicitFoot=state[leg.side===1?'footL':'footR'];
      const anchorBlend=Number.isFinite(state.footAnchorBlend)?clamp(state.footAnchorBlend):Array.isArray(explicitFoot)?1:0;
      const target=toWorld(localFoot.applyAxisAngle(V(0,1,0),-lag));
      if(Array.isArray(explicitFoot)&&anchorBlend)target.lerp(V(...explicitFoot),anchorBlend);
      target.y-=soleAdjustment;
      last.feet[leg.side===1?'left':'right']=solveLimb(leg.upper,leg.lower,leg.foot,target,toWorld([leg.side*.44,1.4+.15*stand,1.55-1.0*stand]));
      // A staggered stance and modest toe-out read as sitting comfortably;
      // the original sole pitch remains level and the feet stay grounded.
      const toeOut=leg.side===1?.10:-.14;
      const footYaw=state[leg.side===1?'footYawL':'footYawR'];
      const footFrame=worldQ(group);
      if(Number.isFinite(footYaw)&&anchorBlend)footFrame.slerp(Q().setFromAxisAngle(V(0,1,0),footYaw),anchorBlend);
      setWorldQ(leg.foot,footFrame.multiply(Q().setFromAxisAngle(V(0,1,0),toeOut-lag)).multiply(restWorldQ.get(leg.foot)));
    }
    for(const hand of hands){
      const fallback=hand.key==='R'?[1.98,1.93,1.85]:[3.30,2.12,1.88];
      const target=V(...(state['hand'+hand.key]||fallback));
      if(hand.key==='R'&&state.chinFollow){
        const chin=headWorld().add(V(.12,-.37,.40).applyQuaternion(worldQ(group)));
        target.lerp(chin,clamp(Number(state.chinFollow)||0)*clamp(Number(state.thinkBlend)||0));
      }
      if(hand.key==='R'&&Array.isArray(state.gestureOffset))target.add(V(...state.gestureOffset).applyQuaternion(worldQ(group)));
      const standingHands=Number.isFinite(state.standHands)?clamp(state.standHands):stand;
      if(standingHands){
        const pelvisY=last.standing.pelvisHeight;
        const restingHand=toWorld([hand.side*(.61-.02*bow),pelvisY+.10-.24*stand-.10*bow,.60-.47*stand+.38*bow]);
        target.lerp(restingHand,standingHands);
      }
      let frame=handFrame(hand,state,target);
      // Scene targets describe the visible palm/contact area, not the wrist
      // joint. Retaining that offset avoids stretching a scanned arm to a key.
      let palmOffset=axisWorld(frame.fingerForward).multiplyScalar(.22).addScaledVector(axisWorld(frame.palmNormal),.055);
      const relax=Number.isFinite(state.shoulderRelax)?clamp(state.shoulderRelax):.8;
      rotateWorld(hand.shoulder,axisWorld([0,0,1]),-hand.side*(.17*relax+(Number(state.shoulderBreath)||0)));
      rotateWorld(hand.shoulder,axisWorld([0,1,0]),-hand.side*.09*relax);
      rotateWorld(hand.shoulder,axisWorld([0,0,1]),hand.side*(Number(state['shoulderGesture'+hand.key])||0));
      const spread=Number.isFinite(state['elbowSpread'+hand.key])?clamp(state['elbowSpread'+hand.key]):.15;
      const pole=toWorld([hand.side*(.52+spread*.65),1.88+(standingPelvis-seatedPelvisHeight)*stand-.24*bow-stanceLower+frame.open*.12,.30+.26*bow+frame.thinking*.12]);
      if(hand.key==='R'&&state.thinkingClearance)pole.add(axisWorld([1,0,0]).multiplyScalar(.36*state.thinkingClearance)).add(axisWorld([0,0,1]).multiplyScalar(.48*state.thinkingClearance));
      if(standingHands)pole.lerp(toWorld([hand.side*.60,last.standing.pelvisHeight+.60,-.32+.28*bow]),standingHands);
      if(Array.isArray(state['elbowMotion'+hand.key]))pole.add(V(...state['elbowMotion'+hand.key]).applyQuaternion(worldQ(group)));
      if(Array.isArray(state['gestureElbow'+hand.key]))pole.add(V(...state['gestureElbow'+hand.key]).applyQuaternion(worldQ(group)));
      const follow=clamp(Number(state['handFollow'+hand.key])||0),baseFrame=frame;
      // Iteratively couple the palm to its solved forearm. This retains the
      // visible palm target while freeing the old fixed, horizontal wrist.
      for(let iteration=0;iteration<(follow?4:1);iteration++){
        palmOffset=axisWorld(frame.fingerForward).multiplyScalar(.22).addScaledVector(axisWorld(frame.palmNormal),.055);
        last.hands[hand.key]=solveLimb(hand.upper,hand.lower,hand.hand,target.clone().sub(palmOffset),pole);
        if(follow&&iteration<3){
          const forward=world(hand.hand).sub(world(hand.lower)).normalize().applyQuaternion(worldQ(group).invert());
          const q=frameQuaternion(forward,V(0,1,0)),lateral=V(0,0,1).applyQuaternion(q);
          q.premultiply(Q().setFromAxisAngle(lateral,Number(state['handPitch'+hand.key])||0));
          const f=baseFrame.fingerForward.clone().lerp(V(1,0,0).applyQuaternion(q),follow).normalize();
          const n=baseFrame.palmNormal.clone().lerp(V(0,1,0).applyQuaternion(q),follow).normalize();
          const orientation=frameQuaternion(f,n);
          frame={...baseFrame,fingerForward:V(1,0,0).applyQuaternion(orientation),palmNormal:V(0,1,0).applyQuaternion(orientation),lateral:V(0,0,1).applyQuaternion(orientation)};
        }
      }
      // Supination belongs mostly to the forearm. Share the explaining roll
      // there before setting the hand's absolute orientation, keeping the
      // wrist contact fixed instead of twisting the hand alone.
      const forearmAxis=world(hand.hand).sub(world(hand.lower)).normalize();
      const forearmRoll=-hand.side*Math.PI*frame.open*.68*(1-frame.thinking)+(Number(state['wristRoll'+hand.key])||0)*.45;
      rotateWorld(hand.lower,forearmAxis,forearmRoll);
      handOrientation(hand,state,frame);
      hand.palmOffset=palmOffset;
      hand.palmLocalOffset=palmOffset.clone().applyQuaternion(worldQ(hand.hand).invert());
      hand.frame=frame;
      last.hands[hand.key].palmTarget=target.toArray();
      last.hands[hand.key].palmActual=world(hand.hand).add(palmOffset).toArray();
    }
    for(let j=7;j<motionNames.length;j++){
      const side=motionNames[j].endsWith('_l')?'R':'L';
      authoredRotation(state,j,clamp(Number(state['armFreedom'+side])||0));
    }
    const closingWeight=clamp(Number(state.closingWeight)||0);
    if(closingWeight&&Array.isArray(state.closingPose)&&closingBones.length){
      const previousFeet=legs.map(leg=>world(leg.foot));
      for(let j=0;j<closingBones.length;j++)if(closingBones[j])closingBones[j].quaternion.slerp(Q().fromArray(state.closingPose,j*4).normalize(),closingWeight);
      const fingerWeight=closingWeight*clamp(Number(state.danceWeight)||0);
      if(fingerWeight&&Array.isArray(state.closingFingerPose))for(let j=0;j<danceFingerBones.length;j++)if(danceFingerBones[j])danceFingerBones[j].quaternion.slerp(Q().fromArray(state.closingFingerPose,j*4).normalize(),fingerWeight);
      group.updateMatrixWorld(true);
      const desiredPelvis=V(...state.closingPelvis),currentPelvis=group.worldToLocal(world(hip));
      model.position.add(desiredPelvis.sub(currentPelvis).multiplyScalar(closingWeight));
      group.updateMatrixWorld(true);
      for(let j=0;j<legs.length;j++){
        const leg=legs[j],orientation=worldQ(leg.foot);
        const anchor=toWorld(state.closingFeet.slice(j*3,j*3+3));
        const target=previousFeet[j].lerp(anchor,closingWeight),knee=world(leg.lower);
        // The captured knee direction drives the pole. IK only corrects the
        // planted foot after blending; it no longer authors the primary gait.
        const pole=knee.clone().add(knee.clone().sub(world(leg.upper).lerp(world(leg.foot),.5)).normalize());
        last.feet[leg.side===1?'left':'right']=solveLimb(leg.upper,leg.lower,leg.foot,target,pole);
        const side=leg.side===1?'l':'r',locked=window.DECK_RIG_MOTION?.dance?.endingFootOrientations?.[side],lock=Number(state.closingFootLock?.[j])||0;
        if(locked&&lock){const desired=worldQ(group).multiply(Q().fromArray(locked).normalize());orientation.slerp(desired,clamp(lock));}
        setWorldQ(leg.foot,orientation);
      }
      last.standing.pelvisHeight=group.worldToLocal(world(hip)).y;
      last.standing.fullBodySource=state.closingSource||'Mesh2Motion: Sitting_Exit → Turn_Left_90 → Bow';
      last.standing.fullBodyWeight=closingWeight;
      last.standing.danceWeight=Number(state.danceWeight)||0;
    }
    // Lift the stepping shoe clear of the caster during the initial chair
    // retreat. Apply after body blending so its baked ankle cannot cancel it.
    const clearanceTargets=legs.map(leg=>{
      const lift=Math.max(0,Number(state[leg.side===1?'closingFootLiftL':'closingFootLiftR'])||0),outward=Math.max(0,Number(state[leg.side===1?'closingFootOutL':'closingFootOutR'])||0);
      return {leg,lift,outward,orientation:worldQ(leg.foot),target:world(leg.foot).add(V(0,lift,0)).add(axisWorld([leg.side,0,0]).multiplyScalar(outward))};
    });
    if(clearanceTargets.some(t=>t.lift+t.outward>1e-8)){
      let lower=0;
      for(const {leg,target}of clearanceTargets){const root=world(leg.upper),length=root.distanceTo(world(leg.lower))+world(leg.lower).distanceTo(world(leg.foot))-.015,horizontal=(target.x-root.x)**2+(target.z-root.z)**2;lower=Math.max(lower,root.y-target.y-Math.sqrt(Math.max(0,length*length-horizontal)));}
      // Transfer weight into a little knee flexion so the wider support foot
      // can actually reach the floor, rather than hovering at full leg extension.
      if(lower>0){model.position.y-=lower;group.updateMatrixWorld(true);}
      for(const {leg,target,orientation}of clearanceTargets){
        last.feet[leg.side===1?'left':'right']=solveLimb(leg.upper,leg.lower,leg.foot,target,world(leg.lower));setWorldQ(leg.foot,orientation);
      }
      last.standing.pelvisHeight=group.worldToLocal(world(hip)).y;
    }
    const handoffLift=Math.max(0,Number(state.handoffHandLift)||0);
    if(handoffLift>1e-8)for(const hand of hands){
      const orientation=worldQ(hand.hand),target=world(hand.hand).add(V(0,handoffLift,0));
      const pole=world(hand.lower).add(V(0,handoffLift*.65,.08));
      solveLimb(hand.upper,hand.lower,hand.hand,target,pole);setWorldQ(hand.hand,orientation);
    }
    for(const hand of hands){
      hand.palmOffset=hand.palmLocalOffset.clone().applyQuaternion(worldQ(hand.hand));
      const actual=world(hand.hand).add(hand.palmOffset);
      last.hands[hand.key].palmActual=actual.toArray();
      last.hands[hand.key].contactPinned=!closingWeight&&(Number(state['armFreedom'+hand.key])||0)<.001;
      last.hands[hand.key].physicalContactError=actual.distanceTo(V(...last.hands[hand.key].palmTarget));
      if(closingWeight){last.hands[hand.key].actual=world(hand.hand).toArray();last.hands[hand.key].joint=world(hand.lower).toArray();last.hands[hand.key].root=world(hand.upper).toArray();}
    }
    group.updateMatrixWorld(true);
    for(const {joint,upper,lower}of shareJoints){
      const a=worldQ(upper).multiply(restWorldQ.get(upper).clone().invert());
      const b=worldQ(lower).multiply(restWorldQ.get(lower).clone().invert());
      setWorldQ(joint,a.slerp(b,.5).multiply(restWorldQ.get(joint)));
    }
    for(const mesh of meshes)mesh.skeleton.update();
    correctClothing(Number.isFinite(state.clothStanding)?clamp(state.clothStanding):stand);
    return group;
  }
  function headWorld(target=V()){
    return target.copy(world(bone('eye_l'))).add(world(bone('eye_r'))).multiplyScalar(.5);
  }
  function inspect(){
    const bounds=new THREE.Box3().setFromObject(group,true);
    return {boneCount:bones.length,meshCount:meshes.length,wardrobeRepair,hiddenCoveredBodyProxies:meshes.filter(m=>m.userData.coveredBodyProxy&&!m.visible).map(m=>m.name),scale:uniformScale,
      head:headWorld().toArray(),pelvis:world(hip).toArray(),bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
      finite:bones.every(b=>b.matrixWorld.elements.every(Number.isFinite)),
      handFrames:Object.fromEntries(hands.map(h=>[h.key,{forward:h.frame.fingerForward.toArray(),normal:h.frame.palmNormal.toArray(),thinking:h.frame.thinking,lap:h.frame.lap}])),...last};
  }
  pose();
  return {group,model,pose,headWorld,inspect,
    handWorld:(key,target=V())=>{const hand=hands.find(h=>h.key===key)||hands[0];return target.copy(world(hand.hand)).add(hand.palmOffset||V());},
    metadata:{standingHeight:4.5,pelvisHeight:seatedPelvisHeight,standingPelvisHeight:standingPelvis,boneCount:bones.length,originalSkin:true,source:isStudent?'Free Stylized Cartoon Game Boy Character Rigged · Canino3d':'Nathan Animated 003 - Walking 3D Man'}};
};

/* Closing scene blocking: chair retreat, contact hand-off and episode flags.
 * The primary rise, pelvis/root shift, footwork, turn and bow come from the
 * full-body clips in DECK_RIG_MOTION.closing, applied at the end of pose().
 * These contact targets only lead into that layer and preserve navigation's
 * exact seated endpoint. The scene owns screen power, clock and chair object.
 */
window.ReactionBow = (() => {
  const danceDuration=10,danceStart=6.15*14/12,duration=14+danceDuration,seatedYaw=-2.42,audienceYaw=-.58,origin=[2.65,0,2.5];
  const clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
  const ramp=(s,a,b)=>smooth((s-a)/(b-a));
  const clock=seconds=>{const s=Math.max(0,Math.min(duration,Number(seconds)||0));return (s-Math.max(0,Math.min(danceDuration,s-danceStart)))*12/14;};
  const danceWeight=seconds=>ramp(seconds,danceStart,danceStart+2.2)*(1-ramp(seconds,danceStart+danceDuration-2,danceStart+danceDuration));
  const mix=(a,b,u)=>a+(b-a)*u;
  const vectorMix=(a,b,u)=>a.map((v,i)=>mix(v,b[i],u));
  const add=(a,b)=>a.map((v,i)=>v+b[i]);
  const scale=(a,k)=>a.map(v=>v*k);
  const forward=yaw=>[Math.sin(yaw),0,Math.cos(yaw)];
  function localWorld(local,yaw,offset=[0,0,0]){
    const c=Math.cos(yaw),s=Math.sin(yaw);
    return [origin[0]+offset[0]+local[0]*c+local[2]*s,origin[1]+offset[1]+local[1],origin[2]+offset[2]-local[0]*s+local[2]*c];
  }
  function step(a,b,u,height){const p=vectorMix(a,b,u);p[1]+=4*u*(1-u)*height;return p;}
  const retreat=[.65,0,1.30],riseAdvance=scale(forward(seatedYaw),.45),audienceAdvance=scale(forward(audienceYaw),.55);
  const risenOffset=add(retreat,riseAdvance),finalOffset=add(risenOffset,audienceAdvance);
  function sample(seconds,options={}){
    const s=clock(seconds);
    const retreatBlend=ramp(s,.20,1.40),stand=ramp(s,1.65,3.05),turn=ramp(s,3.40,5.40);
    const bow=ramp(s,6.2,7.5)*(1-ramp(s,8.5,9.75));
    const standHands=ramp(s,.65,1.40),stanceLower=0;
    const rootOffset=scale(retreat,retreatBlend);
    // After the pelvis leaves the cushion, let the chair coast clear of the
    // turning feet. The former .25 retreat left its seat and caster base in
    // the standing person's leg path.
    const chairOffset=add(add(scale(retreat,retreatBlend),scale(forward(seatedYaw),-1.15*ramp(s,1.40,2.85))),scale([.85,0,.40],ramp(s,3.0,5.7)));
    const seatedFeet=[[.34,.225,.97],[-.29,.25,.81]],standingFeet=[[.29,.225,.12],[-.29,.25,.04]];
    const feet=seatedFeet.map((local,i)=>{
      const first=localWorld(local,seatedYaw),retreated=localWorld(local,seatedYaw,retreat);
      const planted=localWorld(standingFeet[i],seatedYaw,risenOffset);
      const final=localWorld(standingFeet[i],audienceYaw,finalOffset);
      const a=i===0?[.20,1.10]:[.60,1.40],b=i===0?[20,21]:[20,21],c=i===0?[22,23]:[22,23];
      if(s<a[1])return step(first,retreated,ramp(s,...a),.045);
      if(s<b[1])return step(retreated,planted,ramp(s,...b),.09);
      return step(planted,final,ramp(s,...c),.09);
    });
    const originalR=options.handR||localWorld([.32,1.70,.64],seatedYaw);
    const originalL=options.handL||localWorld([-.30,1.68,.70],seatedYaw);
    const anticipation=ramp(s,2.60,3.70),straighten=ramp(s,3.95,5.40);
    return {
      stand,bow,standHands,stanceLower,rootOffset,chairOffset,chairYaw:seatedYaw,
      closingFootLiftL:.065*ramp(s,.18,.50)*(1-ramp(s,.78,1.10)),closingFootLiftR:0,
      // Transfer the caster-clearance offset into the baked support path while
      // the body layer takes over. No second procedural lift during the turn.
      closingFootOutL:.32*ramp(s,.18,.62)*(1-ramp(s,1.10,1.40)*(()=>{const u=clamp((s-.55)/.85);return u*u*(3-2*u);})()),closingFootOutR:0,
      footAnchorBlend:1,footL:feet[0],footR:feet[1],
      footYawL:mix(seatedYaw,audienceYaw,ramp(s,5.65,6.45)),footYawR:mix(seatedYaw,audienceYaw,ramp(s,6.35,7.15)),
      yaw:seatedYaw,lean:(.07*(1-anticipation)+.43*anticipation)*(1-straighten),
      headYaw:.22*(1-ramp(s,5.45,7.15))+.15*ramp(s,5.45,5.95)*(1-ramp(s,5.95,7.15)),
      headPitch:.01*(1-stand)+.045*bow,headRoll:-.018*(1-stand),bodyRoll:-.018*(1-stand)+.020*ramp(s,5.5,5.85)*(1-ramp(s,6.3,6.7))-.018*ramp(s,6.3,6.65)*(1-ramp(s,7.2,7.55)),bodyYaw:.13*ramp(s,5.55,6.0)*(1-ramp(s,6.5,7.35)),
      pelvisSway:.016*ramp(s,5.55,5.9)*(1-ramp(s,6.4,6.8))-.014*ramp(s,6.4,6.7)*(1-ramp(s,7.2,7.55)),
      shoulderRelax:mix(.88,.86,standHands),wristRollR:mix(.10,.04,standHands),wristRollL:mix(-.07,-.04,standHands),
      elbowSpreadR:mix(.10,.06,standHands),elbowSpreadL:mix(.16,.08,standHands),
      handR:add(originalR,rootOffset),handL:add(originalL,rootOffset)
    };
  }
  return Object.freeze({duration,sample,clock,danceWeight,danceStart,danceDuration,localWorld,finalOffset:Object.freeze(finalOffset)});
})();
