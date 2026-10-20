/* Gaming Room by Marcitos, CC BY 4.0.
 * https://sketchfab.com/3d-models/gaming-room-0d582face68e499390e765f38a844b54
 * This adapter reuses the downloaded room's actual meshes and original materials.
 * It removes the bed and original computer, separates the imported desk/chair,
 * and moves the original window blinds onto a rear wall for the story camera.
 * All placements are world coordinates. Do not parent below the old lab root.
 */
window.createRoomEnvironment = async function createRoomEnvironment(THREE, gltf, options) {
  'use strict';
  options = options || {};
  if (!gltf?.scene || !gltf?.parser) throw new Error('A loaded Gaming Room GLTF is required.');
  gltf.scene.updateMatrixWorld(true);
  const merge = options.mergeGeometries;
  const owned = new Set(), group = new THREE.Group(), parts = {};
  group.name = 'Sketchfab_Marcitos_Room';
  group.userData.source = 'https://sketchfab.com/3d-models/gaming-room-0d582face68e499390e765f38a844b54';
  group.userData.author = 'Marcitos';
  group.userData.license = 'CC-BY-4.0';
  const stats = {sourceMeshes: 0, outputMeshes: 0, triangles: 0, groups: {}};
  const nodes = new Map();
  gltf.scene.traverse(object => {
    const index = gltf.parser.associations.get(object)?.nodes;
    if (Number.isInteger(index)) nodes.set(index, object);
  });
  async function sourceNode(index) {
    if (!nodes.has(index)) nodes.set(index, await gltf.parser.getDependency('node', index));
    return nodes.get(index);
  }
  function signature(geometry) {
    return [geometry.index ? 'indexed' : 'plain', ...Object.keys(geometry.attributes).sort().map(key => {
      const a = geometry.attributes[key];
      return [key, a.itemSize, a.normalized, a.isInterleavedBufferAttribute ? a.data.array.constructor.name : a.array.constructor.name].join(':');
    })].join('|');
  }
  function reverseReflection(geometry, matrix) {
    if (matrix.determinant() >= 0) return;
    if (!geometry.index) geometry.setIndex(Array.from({length: geometry.attributes.position.count}, (_, i) => i));
    for (let i = 0; i < geometry.index.count; i += 3) {
      const second = geometry.index.getX(i + 1);
      geometry.index.setX(i + 1, geometry.index.getX(i + 2));
      geometry.index.setX(i + 2, second);
    }
    geometry.index.needsUpdate = true;
  }
  async function build(name, indices) {
    const object = new THREE.Group(), buckets = new Map(), seen = new Set();
    object.name = 'Imported_' + name;
    object.userData.sourceNodeIndices = indices;
    let sourceMeshes = 0, triangles = 0;
    for (const index of indices) {
      const node = await sourceNode(index);
      node.traverse(mesh => {
        if (!mesh.isMesh || seen.has(mesh)) return;
        seen.add(mesh);
        if (mesh.isSkinnedMesh || Array.isArray(mesh.material)) throw new Error('Unexpected room mesh format.');
        const geometry = mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrixWorld);
        reverseReflection(geometry, mesh.matrixWorld);
        const key = mesh.material.uuid + '|' + signature(geometry);
        if (!buckets.has(key)) buckets.set(key, {material: mesh.material, geometries: [], names: []});
        buckets.get(key).geometries.push(geometry);
        buckets.get(key).names.push(mesh.name);
        sourceMeshes++;
        triangles += (geometry.index?.count || geometry.attributes.position.count) / 3;
      });
    }
    function attach(geometry, material, names) {
      geometry.computeBoundingBox(); geometry.computeBoundingSphere(); owned.add(geometry);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = name + '_' + material.name;
      mesh.castShadow = name !== 'floor' && name !== 'wall';
      mesh.receiveShadow = true;
      mesh.userData.sourceMeshNames = names;
      object.add(mesh);
    }
    for (const bucket of buckets.values()) {
      const combined = bucket.geometries.length > 1 && typeof merge === 'function' ? merge(bucket.geometries, false) : null;
      if (combined) {
        bucket.geometries.forEach(g => g.dispose());
        attach(combined, bucket.material, bucket.names);
      } else bucket.geometries.forEach((g, i) => attach(g, bucket.material, [bucket.names[i]]));
    }
    stats.groups[name] = {sourceMeshes, outputMeshes: object.children.length, triangles};
    stats.sourceMeshes += sourceMeshes; stats.outputMeshes += object.children.length; stats.triangles += triangles;
    parts[name] = object;
    return object;
  }
  function box(object) { object.updateMatrixWorld(true); return new THREE.Box3().setFromObject(object, true); }
  function fit(object, min, max) {
    const original = box(object), size = original.getSize(new THREE.Vector3());
    object.scale.set((max[0]-min[0])/size.x, (max[1]-min[1])/size.y, (max[2]-min[2])/size.z);
    object.position.set(min[0]-original.min.x*object.scale.x,min[1]-original.min.y*object.scale.y,min[2]-original.min.z*object.scale.z);
    return object;
  }
  function placeUniform(object, scale, center, rotationY = 0) {
    object.scale.setScalar(scale); object.rotation.y = rotationY; object.updateMatrixWorld(true);
    const current = box(object).getCenter(new THREE.Vector3());
    object.position.set(center[0]-current.x,center[1]-current.y,center[2]-current.z);
    return object;
  }
  const floor = fit(await build('floor',[63]),[-7,-.13,-6.12],[8,0,6.2]);
  const wall = fit(await build('wall',[65]),[-14,0,-6.12],[16,9,-5.94]);
  // The original left wall is omitted: the camera approaches from front-left.
  // The actual Venetian meshes are rotated inward and mounted on the rear wall.
  const windows = placeUniform(await build('venetianWindows',[5,33]),1.95,[-3.6,4.25,-5.78],-Math.PI/2);
  const shelfNodes = [3,180,182,184,186,188,...Array.from({length:20},(_,i)=>440+i*2)];
  const bookshelf = placeUniform(await build('bookshelf',shelfNodes),2.4,[5.7,4.1,-5.45]);
  const art = placeUniform(await build('wallArt',[123,125,127,198,200,202]),1.65,[1.05,5.65,-5.79]);
  const lightStrip = fit(await build('lightStrip',[206]),[-6.8,6.8,-5.85],[7.8,6.91,-5.76]);
  group.add(floor,wall,windows,bookshelf,art,lightStrip);

  const desk = new THREE.Group(); desk.name = 'Sketchfab_Desk';
  // The tower stands beside the desk on a cabinet reused from the room model.
  // Its base and the desktop are both at y=1.68.
  const deskTop = fit(await build('deskTop',[94]),[-3.75,1.58,-1.7],[3.85,1.68,2.30]);
  const drawerLeft = fit(await build('deskDrawerLeft',[78,80,86,88,97]),[-3.65,0,-1.6],[-2.65,1.58,1.8]);
  const drawerRight = fit(await build('deskDrawerRight',[82,84,90,92,99]),[3.18,0,-1.6],[3.80,1.58,1.8]);
  desk.add(deskTop,drawerLeft,drawerRight); group.add(desk);
  const towerStand = fit(await build('towerStand',[78,80,86,88,97]),[4.04,0,-1.83],[5.26,1.68,.53]);
  group.add(towerStand);

  const chairIndices = [144,146,148,150,153,155,157,159,161,163];
  const chair = await build('chair',chairIndices);
  chair.name = 'Sketchfab_Swivel_Chair';
  // Preserve all imported wheel/cushion/back proportions. Source seat is y .45,
  // source swivel spindle [-8.55,0,-1.01]. Its pose faces toward negative Z.
  const chairOrigin = new THREE.Matrix4().makeTranslation(8.55,0,1.01);
  chair.traverse(mesh => { if(mesh.isMesh) { mesh.geometry.applyMatrix4(chairOrigin); mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere(); } });
  chair.scale.setScalar(3);
  chair.position.set(2.65,-.04,2.70);
  group.add(chair);
  group.updateMatrixWorld(true);
  const bounds = {};
  for (const [name,object] of Object.entries({...parts,desk,chair})) {
    const b = box(object);
    bounds[name] = {min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new THREE.Vector3()).toArray()};
  }
  const overall = box(group);
  bounds.overall = {min:overall.min.toArray(),max:overall.max.toArray(),size:overall.getSize(new THREE.Vector3()).toArray()};
  return {
    group,desk,chair,floor,wall,windows,bookshelf,art,lightStrip,towerStand,bounds,stats,
    anchors:{deskTopY:1.68,deskTopBounds:{min:[-3.75,1.68,-1.7],max:[3.85,1.68,2.30]},chairSeat:[2.65,1.31,2.7],chairPivot:[2.65,0,2.7],backWallZ:-5.94},
    omitted:{sourceRootNodes:[67,70,72,74,76,190,192,194,196],reason:'Camera-facing left wall and bed removed; original PC, monitors, keyboard, mouse and loudspeakers are replaced by the selected Gaming Desktop PC asset.'},
    dispose(){owned.forEach(g=>g.dispose());owned.clear();}
  };
};
