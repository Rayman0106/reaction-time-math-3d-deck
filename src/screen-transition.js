/* Two-way slide handoffs through the imported monitor's actual screen.
 * Geometry is fitted from position/UV attributes, then transformed through the
 * screen's live matrixWorld. No assumed PlaneGeometry, placement or Euler axes.
 * All camera motion is an absolute function of progress, including endpoints.
 */
window.createScreenTransition = function createScreenTransition(THREE, screen) {
  'use strict';
  const clamp = x => Math.max(0,Math.min(1,Number(x)||0));
  const smooth = x => {x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
  const positions=screen.geometry?.getAttribute('position'),uv=screen.geometry?.getAttribute('uv');
  if(!positions||!uv||positions.count!==uv.count)throw new Error('Monitor transition requires the imported screen positions and UVs.');
  const V=()=>new THREE.Vector3(),Q=()=>new THREE.Quaternion();
  let meanU=0,meanV=0,uMin=Infinity,uMax=-Infinity,vMin=Infinity,vMax=-Infinity;
  const meanP=V();
  for(let i=0;i<positions.count;i++){
    const u=uv.getX(i),v=uv.getY(i);meanU+=u;meanV+=v;
    uMin=Math.min(uMin,u);uMax=Math.max(uMax,u);vMin=Math.min(vMin,v);vMax=Math.max(vMax,v);
    meanP.add(V().fromBufferAttribute(positions,i));
  }
  meanU/=positions.count;meanV/=positions.count;meanP.multiplyScalar(1/positions.count);
  let suu=0,svv=0,suv=0;const sup=V(),svp=V();
  for(let i=0;i<positions.count;i++){
    const u=uv.getX(i)-meanU,v=uv.getY(i)-meanV,p=V().fromBufferAttribute(positions,i).sub(meanP);
    suu+=u*u;svv+=v*v;suv+=u*v;sup.addScaledVector(p,u);svp.addScaledVector(p,v);
  }
  const determinant=suu*svv-suv*suv;
  if(Math.abs(determinant)<1e-12)throw new Error('Monitor UVs do not span a two-dimensional image.');
  const du=sup.clone().multiplyScalar(svv).addScaledVector(svp,-suv).multiplyScalar(1/determinant);
  const dv=svp.clone().multiplyScalar(suu).addScaledVector(sup,-suv).multiplyScalar(1/determinant);
  const origin=meanP.clone().addScaledVector(du,-meanU).addScaledVector(dv,-meanV);
  const centerLocal=origin.clone().addScaledVector(du,(uMin+uMax)/2).addScaledVector(dv,(vMin+vMax)/2);
  let fitResidual=0;
  for(let i=0;i<positions.count;i++){
    const fitted=origin.clone().addScaledVector(du,uv.getX(i)).addScaledVector(dv,uv.getY(i));
    fitResidual=Math.max(fitResidual,fitted.distanceTo(V().fromBufferAttribute(positions,i)));
  }
  function geometry(){
    screen.updateWorldMatrix(true,false);
    const linear=new THREE.Matrix3().setFromMatrix4(screen.matrixWorld);
    const uAxis=du.clone().multiplyScalar(uMax-uMin).applyMatrix3(linear);
    const vAxis=dv.clone().multiplyScalar(vMax-vMin).applyMatrix3(linear);
    const right=uAxis.clone().normalize(),rawUp=vAxis.clone().normalize();
    const normal=V().crossVectors(right,rawUp).normalize(),up=V().crossVectors(normal,right).normalize(),center=centerLocal.clone().applyMatrix4(screen.matrixWorld);
    return {center,right,up,normal,width:uAxis.length(),height:vAxis.length(),fitResidual,
      corners:[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([u,v])=>center.clone().addScaledVector(uAxis,u).addScaledVector(vAxis,v)),
      uvRange:{uMin,uMax,vMin,vMax},orthogonality:Math.abs(right.dot(rawUp))};
  }
  function imageRect(imageAspect=16/9){
    const g=geometry(),screenAspect=g.width/g.height;
    const width=Math.min(1,imageAspect/screenAspect),height=Math.min(1,screenAspect/imageAspect);
    // Paint a complete slide within this UV rectangle. The small unused strips
    // fall outside the final viewport, making its text match the 2D page exactly.
    return {x:(1-width)/2,y:(1-height)/2,width,height,screenAspect,imageAspect};
  }
  function endPose(cameraOrOptions={}){
    // The final camera passes in front of the seated investigator, instead of
    // stopping inside a shoulder. Its fixed lens also makes static page 6 and
    // transition arrival agree regardless of the calling camera's current FOV.
    const g=geometry(),aspect=Number(cameraOrOptions.aspect)||16/9,fov=62;
    const tangent=Math.tan(THREE.MathUtils.degToRad(fov)/2);
    // Cover the 16:9 viewport. For this monitor the UV image is near 16:9;
    // inspect() exposes any fractional edge crop rather than hiding it.
    const distance=Math.min(g.height/(2*tangent),g.width/(2*tangent*aspect));
    const orientation=Q().setFromRotationMatrix(new THREE.Matrix4().makeBasis(g.right,g.up,g.normal)).normalize();
    return {position:g.center.clone().addScaledVector(g.normal,distance),quaternion:orientation,fov,distance,geometry:g};
  }
  function apply(camera,startPose,progress){
    const p=clamp(progress),end=endPose({aspect:camera.aspect});
    const sourcePosition=startPose.position.clone(),sourceQuaternion=startPose.quaternion.clone();
    const sourceFov=startPose.fov||34;
    // A direct dolly with one clock for position, orientation and lens. The
    // shortest quaternion arc aligns the screen without an overhead waypoint
    // or a late look-at flip. Keep the final 10% for the registered 2D handoff.
    const u=smooth(p/.90);
    camera.position.lerpVectors(sourcePosition,end.position,u);
    camera.quaternion.copy(sourceQuaternion).slerp(end.quaternion,u);
    camera.fov=sourceFov+(end.fov-sourceFov)*u;
    // Assign the endpoint exactly throughout the 2D handoff.
    if(p>=.90){camera.position.copy(end.position);camera.quaternion.copy(end.quaternion);camera.fov=end.fov;}
    camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    return {progress:p,reveal:p>=1?1:smooth((p-.90)/.10),screenReady:p>=.08,geometry:end.geometry,endPose:end};
  }
  function applyExit(camera,widePose,progress){
    // First exchange the flat page for its registered monitor image with the
    // camera still. Then retrace the direct dolly; the conclusion reveals as
    // the camera gently finishes, without a separate wide-pose hold.
    // Sampling 1-progress traverses exactly the same path when going back.
    const p=clamp(progress),travel=clamp((p-.18)/.82);
    const entryProgress=.90*(1-travel);
    const state=apply(camera,widePose,entryProgress);
    return {progress:p,entryProgress,handoff:smooth((p-.06)/.12),reveal:smooth((p-.86)/.14),
      settled:p>=1,geometry:state.geometry,endPose:state.endPose};
  }
  function inspect(cameraOrOptions={}){
    const end=endPose(cameraOrOptions),g=end.geometry;
    const camera=new THREE.PerspectiveCamera(end.fov,Number(cameraOrOptions.aspect)||16/9,.08,100);
    camera.position.copy(end.position);camera.quaternion.copy(end.quaternion);camera.updateMatrixWorld(true);
    const projected=g.corners.map(p=>p.clone().project(camera).toArray());
    return {center:g.center.toArray(),right:g.right.toArray(),up:g.up.toArray(),normal:g.normal.toArray(),
      width:g.width,height:g.height,aspect:g.width/g.height,uvRange:g.uvRange,fitResidual:g.fitResidual,orthogonality:g.orthogonality,
      endPosition:end.position.toArray(),endQuaternion:end.quaternion.toArray(),distance:end.distance,projectedCorners:projected,imageRect:imageRect(camera.aspect)};
  }
  return {apply,applyExit,reverse:applyExit,endPose,geometry,imageRect,inspect};
};
