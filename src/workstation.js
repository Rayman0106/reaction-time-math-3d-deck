/* Human-scale workstation arrangement. Call after the scene's .65 monitor and
 * speaker resize, before playing any episode. Props must be under an identity
 * scene parent; all returned anchors are world coordinates.
 */
window.arrangeReactionWorkstation = function arrangeReactionWorkstation(THREE, props) {
  const up = new THREE.Vector3(0, 1, 0), yaw = .72, keyboardYaw = .62;
  // Move the input devices together toward the elbow axis; preserve their
  // measured gap and mouse depth instead of extending the arm to its limit.
  const deskShift=new THREE.Vector3(Math.cos(-2.42)*.03,0,-Math.sin(-2.42)*.03);
  props.group.updateMatrixWorld(true);
  const bounds = object => new THREE.Box3().setFromObject(object, true);
  const center = object => bounds(object).getCenter(new THREE.Vector3());
  function floorCenter(object) {
    const box = bounds(object), point = box.getCenter(new THREE.Vector3());
    point.y = box.min.y;
    return point;
  }
  function place(object, sourceAnchor, targetAnchor, turn, factor = 1) {
    const before = object.matrixWorld.clone();
    object.position.sub(sourceAnchor).multiplyScalar(factor).applyAxisAngle(up, turn).add(targetAnchor);
    object.rotation.y += turn;
    object.scale.multiplyScalar(factor);
    object.updateMatrixWorld(true);
    // Transform an existing world-space contact point with the same placement.
    const change = object.matrixWorld.clone().multiply(before.invert());
    return point => new THREE.Vector3(...point).applyMatrix4(change).toArray();
  }
  const screenBefore = center(props.screen);
  place(props.monitor, screenBefore, new THREE.Vector3(1.10, screenBefore.y, .75), yaw);
  const keyboardTransform = place(props.keyboard, floorCenter(props.keyboard), new THREE.Vector3(2.10, 1.68, 1.60).add(deskShift), keyboardYaw, .92);
  // Ahead of the seated shoulder, with an oriented gap beside the keyboard.
  // Moving closer to the keyboard's center would overlap its imported casing.
  const mouseTransform = place(props.mouse, floorCenter(props.mouse), new THREE.Vector3(3.12, 1.68, 1.27).add(deskShift), keyboardYaw);
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  props.speakers.forEach((speaker, i) => {
    const side = i === 0 ? -1 : 1;
    // Clear the monitor's splayed feet with the actual cabinet footprint.
    // The left edge of the desk is shallower in these rotated monitor axes.
    const target = new THREE.Vector3(1.10, 1.68, .75)
      .addScaledVector(right, side * (side < 0 ? 1.87 : 2.04))
      .addScaledVector(forward, side < 0 ? -.32 : -.24);
    place(speaker, floorCenter(speaker), target, yaw);
    speaker.userData.desktopAnchor = target.toArray();
  });
  // A separate imported cabinet supports the tower at the desk's top height.
  // Keep the original case proportions and side-panel materials.
  props.case.position.y += 1.68 - bounds(props.case).min.y;
  props.group.updateMatrixWorld(true);
  const keyboardForward = new THREE.Vector3(Math.sin(keyboardYaw), 0, Math.cos(keyboardYaw));
  const typing = point => new THREE.Vector3(...keyboardTransform(point)).addScaledVector(keyboardForward, .16).toArray();
  const normal = new THREE.Vector3().fromBufferAttribute(props.screen.geometry.attributes.normal, 0)
    .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(props.screen.matrixWorld)).normalize();
  const anchors = {
    ...props.anchors,
    screenCenter: center(props.screen).toArray(), screenNormal: normal.toArray(),
    keyboardCenter: new THREE.Vector3(2.10,1.68,1.60).add(deskShift).toArray(),
    typingRight: typing(props.anchors.typingRight), typingLeft: typing(props.anchors.typingLeft),
    mouseContact: mouseTransform(props.anchors.mouseContact), reactionHand: mouseTransform(props.anchors.reactionHand),
    shutdownContact: keyboardTransform(props.anchors.shutdownContact), shutdownHand: keyboardTransform(props.anchors.shutdownHand),
    seatedPosition: [2.65, 0, 2.5], seatedYaw: -2.42,
    monitorFacingYaw: yaw, keyboardFacingYaw: keyboardYaw
  };
  const boxes = {};
  for (const [name, object] of Object.entries({monitor: props.monitor, keyboard: props.keyboard, mouse: props.mouse, speakerLeft: props.speakers[0], speakerRight: props.speakers[1], tower: props.case})) {
    const box = bounds(object);
    boxes[name] = {min: box.min.toArray(), max: box.max.toArray(), size: box.getSize(new THREE.Vector3()).toArray()};
  }
  return {anchors, bounds: boxes, monitorFacingYaw: yaw, keyboardFacingYaw: keyboardYaw};
};
