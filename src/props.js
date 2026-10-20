/* Imported desktop props from Yolala1232's Gaming Desktop PC (CC BY 4.0).
 * Raw asset and its attribution remain separate. No original material is tinted
 * or replaced except the narrative screen, whose material the caller supplies.
 *
 * Usage:
 *   const props = await createGamingProps(THREE, gltf,
 *     {screenMaterial, mergeGeometries});
 *   scene.add(props.group);
 *
 * The factory clones and bakes geometry using the loaded scene's full world
 * transforms. It never reparents or modifies the imported glTF. Positions are
 * scene-world coordinates: do not put props.group below the old raised desk root.
 */
window.createGamingProps = async function createGamingProps(THREE, gltf, options) {
  'use strict';
  options = options || {};
  if (!gltf?.scene || !gltf?.parser) throw new Error('Gaming props require a loaded GLTFLoader result.');
  if (!options.screenMaterial) throw new Error('Gaming props require the narrative screen material.');
  const merge = options.mergeGeometries;
  const sourceRoot = gltf.scene;
  sourceRoot.updateMatrixWorld(true);
  const sequence = (first, last, step = 2) => Array.from({length: Math.floor((last - first) / step) + 1}, (_, i) => first + i * step);
  const rootChildren = gltf.parser.json.nodes[2].children;
  const groups = {
    monitor: [235, ...sequence(277, 305)],
    speakerRight: [107, 115, 117],
    speakerLeft: [119, 121, 123],
    mouse: [...sequence(197, 217), 239, 241, 243, 245, 255],
    keyboard: rootChildren.filter(i => i >= 307)
  };
  const excluded = new Set([3, 179, 237, 257, 269, 271, 273, 275]);
  const assigned = new Set(Object.values(groups).flat());
  groups.pcTower = rootChildren.filter(i => !excluded.has(i) && !assigned.has(i));
  const placements = {
    monitor: {scale: .7, translation: [2.102837507929559, 1.4990727093129017, .45323568120817004]},
    keyboard: {scale: .4423767417588562, translation: [3.8831602870635518, 1.5663432317754407, 1.1955111059881798]},
    mouse: {scale: .65, translation: [3.122232706448957, 1.5041027584744804, 1.2017963019471014]},
    speakerRight: {scale: 1.15, translation: [2.0117870357803316, 1.3746749312229096, 1.9746941300358385]},
    speakerLeft: {scale: 1.15, translation: [4.891475466424412, 1.3746749312229114, 1.9746941300358385]},
    pcTower: {scale: .55, translation: [2.7031416879884853, -.11012934958877382, -.15471044178897003]}
  };
  const associations = gltf.parser.associations;
  const nodes = new Map();
  sourceRoot.traverse(object => {
    const index = associations?.get(object)?.nodes;
    if (Number.isInteger(index)) nodes.set(index, object);
  });
  async function node(index) {
    if (!nodes.has(index)) nodes.set(index, await gltf.parser.getDependency('node', index));
    return nodes.get(index);
  }
  const screenSource = await node(288);
  const group = new THREE.Group();
  group.name = 'Sketchfab_Gaming_Props';
  group.userData.source = 'https://sketchfab.com/3d-models/gaming-desktop-pc-d1d8282c9916438091f11aeb28787b66';
  group.userData.author = 'Yolala1232';
  group.userData.license = 'CC-BY-4.0';
  const outputs = {}, ownedGeometry = new Set();
  const stats = {sourceMeshes: 0, outputMeshes: 0, groups: {}};
  let screen = null;

  function geometrySignature(geometry) {
    const attributes = Object.keys(geometry.attributes).sort().map(name => {
      const a = geometry.attributes[name];
      const array = a.isInterleavedBufferAttribute ? a.data.array : a.array;
      return [name, a.itemSize, a.normalized, a.isInterleavedBufferAttribute ? 'interleaved' : array.constructor.name].join(':');
    });
    const morph = Object.keys(geometry.morphAttributes).sort().join(',');
    return [(geometry.index ? 'indexed' : 'plain'), geometry.morphTargetsRelative, morph, ...attributes].join('|');
  }
  function materialParts(mesh) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (materials.length === 1) return [{geometry: mesh.geometry.clone(), material: materials[0]}];
    if (!mesh.geometry.groups.length) throw new Error('An imported multi-material mesh lacks geometry groups.');
    // glTF usually supplies a separate Mesh per primitive. This path also handles
    // a conventional indexed BufferGeometry that uses multiple material groups.
    return mesh.geometry.groups.map(part => {
      const geometry = mesh.geometry.clone();
      const sourceIndex = mesh.geometry.index;
      const indices = sourceIndex
        ? Array.from(sourceIndex.array.slice(part.start, part.start + part.count))
        : sequence(part.start, part.start + part.count - 1, 1);
      geometry.setIndex(indices);
      geometry.clearGroups();
      geometry.setDrawRange(0, Infinity);
      return {geometry, material: materials[part.materialIndex]};
    });
  }
  function makeMesh(geometry, material, name) {
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    ownedGeometry.add(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
  function preserveWindingAfterReflection(geometry, worldMatrix) {
    if (worldMatrix.determinant() >= 0) return;
    // The source renderer compensates for a reflected Object3D transform. Once
    // that transform is baked into vertices, retain the same front-face winding.
    if (!geometry.index) geometry.setIndex(sequence(0, geometry.attributes.position.count - 1, 1));
    for (let i = 0; i < geometry.index.count; i += 3) {
      const second = geometry.index.getX(i + 1);
      geometry.index.setX(i + 1, geometry.index.getX(i + 2));
      geometry.index.setX(i + 2, second);
    }
    geometry.index.needsUpdate = true;
  }
  for (const [key, indices] of Object.entries(groups)) {
    const prop = new THREE.Group();
    prop.name = 'Sketchfab_' + key;
    prop.userData.sourceNodeIndices = [...indices];
    const buckets = new Map();
    const seen = new Set();
    let sourceCount = 0;
    for (const index of indices) {
      const source = await node(index);
      source.traverse(object => {
        if (!object.isMesh || seen.has(object)) return;
        if (object.isSkinnedMesh) throw new Error('Gaming desktop asset unexpectedly contains a skinned mesh.');
        seen.add(object); sourceCount++;
        const sourceIndex = associations?.get(object)?.nodes;
        const isScreen = object === screenSource || sourceIndex === 288;
        for (const part of materialParts(object)) {
          const geometry = part.geometry;
          // Original node ancestors include exporter rotation and 0.01 unit scale.
          geometry.applyMatrix4(object.matrixWorld);
          preserveWindingAfterReflection(geometry, object.matrixWorld);
          if (isScreen) {
            if (screen) throw new Error('Gaming desktop has more than one narrative screen primitive.');
            screen = makeMesh(geometry, options.screenMaterial, 'Sketchfab_narrative_screen');
            screen.castShadow = false;
            screen.receiveShadow = false;
            screen.userData.sourceNodeIndex = 288;
            prop.add(screen);
          } else {
            const bucketKey = part.material.uuid + '|' + geometrySignature(geometry);
            if (!buckets.has(bucketKey)) buckets.set(bucketKey, {material: part.material, geometries: [], sourceNames: []});
            const bucket = buckets.get(bucketKey);
            bucket.geometries.push(geometry);
            bucket.sourceNames.push(object.name);
          }
        }
      });
    }
    for (const bucket of buckets.values()) {
      let geometry = null;
      if (typeof merge === 'function' && bucket.geometries.length > 1) geometry = merge(bucket.geometries, false);
      if (geometry) {
        for (const original of bucket.geometries) original.dispose();
        const mesh = makeMesh(geometry, bucket.material, key + '_merged_' + bucket.material.name);
        mesh.userData.sourceMeshNames = bucket.sourceNames;
        prop.add(mesh);
      } else {
        bucket.geometries.forEach((item, i) => prop.add(makeMesh(item, bucket.material, bucket.sourceNames[i])));
      }
    }
    const placement = placements[key];
    prop.position.fromArray(placement.translation);
    prop.rotation.y = -Math.PI / 2;
    prop.scale.setScalar(placement.scale);
    group.add(prop);
    outputs[key] = prop;
    const outputCount = prop.children.length;
    stats.groups[key] = {sourceMeshes: sourceCount, outputMeshes: outputCount};
    stats.sourceMeshes += sourceCount;
    stats.outputMeshes += outputCount;
  }
  if (!screen) throw new Error('Narrative screen node 288 was not found in the gaming desktop asset.');
  group.updateMatrixWorld(true);
  function placed(key, point) {
    return outputs[key].localToWorld(new THREE.Vector3(...point)).toArray();
  }
  const mouseContact = placed('mouse', [1.043390304696767, .5209810868677072, -.27348814392468096]);
  // This is the broad Enter key in the model, used for a shutdown confirmation.
  // It is intentionally not described as a physical power button.
  const shutdownContact = placed('keyboard', [1.5888794733988125, .4790453679127429, 3.5954058636290664]);
  const handAbove = point => [point[0], point[1] + .045, point[2]];
  const anchors = {
    screenCenter: [0, 3.6, -.5],
    screenNormal: [-7.531399036421875e-8, .06975652523166367, .9975640466594606],
    mouseContact,
    reactionHand: handAbove(mouseContact),
    keyboardCenter: [2.1, 1.67, 1.85],
    typingRight: [1.98, 1.87, 1.85],
    typingLeft: [2.60, 1.87, 1.85],
    shutdownContact,
    shutdownHand: handAbove(shutdownContact),
    shutdownAction: 'Confirm the shutdown command with Enter.'
  };
  const bounds = {};
  for (const [name, prop] of Object.entries(outputs)) {
    const box = new THREE.Box3().setFromObject(prop, true);
    bounds[name] = {min: box.min.toArray(), max: box.max.toArray(), size: box.getSize(new THREE.Vector3()).toArray()};
  }
  return {
    group, monitor: outputs.monitor, keyboard: outputs.keyboard,
    mouse: outputs.mouse, speakers: [outputs.speakerLeft, outputs.speakerRight],
    case: outputs.pcTower, screen, anchors, bounds, stats,
    dispose() { ownedGeometry.forEach(geometry => geometry.dispose()); ownedGeometry.clear(); }
  };
};
