/* Art pass: a quiet, daylight study with graphite hardware and muted books.
 * Imported geometry, UVs, skin, screen and action anchors remain unchanged.
 * Every appearance edit uses a cloned material; the three source GLBs are inputs.
 */
window.createStudyArtDirection = function createStudyArtDirection(THREE, context) {
  'use strict';
  const {scene, renderer, props, character, environment} = context;
  const cache = new Map(), ownedMaterials = new Set();
  const report = {theme: 'daylight study', modifiedMaterials: [], environmentGenerated: false,
    originalGeometryRetained: true, originalTexturesRetained: true};
  const luminance = 'vec3(0.2126, 0.7152, 0.0722)';

  function mutedTexture(material, saturation, emissiveSaturation = saturation, woodLift = false) {
    // Desaturate after texture/vertex colour multiplication, retaining real UV
    // detail, luminance and alpha. Tinting a rainbow map alone retains its hues.
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb = mix(vec3(dot(diffuseColor.rgb, ${luminance})),
            diffuseColor.rgb, ${saturation.toFixed(4)});
          ${woodLift ? 'diffuseColor.rgb = mix(vec3(0.14, 0.12, 0.095), diffuseColor.rgb, 0.68);' : ''}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          totalEmissiveRadiance = mix(vec3(dot(totalEmissiveRadiance, ${luminance})),
            totalEmissiveRadiance, ${emissiveSaturation.toFixed(4)});`);
    };
    material.customProgramCacheKey = () => `study-muted-v1:${saturation}:${emissiveSaturation}:${woodLift}`;
  }

  function restyle(object, role, edit) {
    object.traverse(mesh => {
      if (!mesh.isMesh || mesh === props.screen) return;
      const originals = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const styled = originals.map(original => {
        const key = original.uuid + ':' + role;
        if (!cache.has(key)) {
          const material = original.clone();
          material.name = original.name + '__study_' + role;
          material.userData = {...original.userData, studyRole: role, sourceMaterialName: original.name};
          edit(material, original, mesh);
          cache.set(key, material); ownedMaterials.add(material);
          report.modifiedMaterials.push({source: original.name, role,
            colour: material.color?.getHexString(), roughness: material.roughness,
            metalness: material.metalness, emissiveIntensity: material.emissiveIntensity});
        }
        return cache.get(key);
      });
      mesh.material = Array.isArray(mesh.material) ? styled : styled[0];
    });
  }

  function matte(material, colour, roughness = .8) {
    material.color.set(colour); material.roughness = roughness; material.metalness = 0;
    if ('clearcoat' in material) {material.clearcoat = 0; material.clearcoatRoughness = .7;}
    if (material.emissive) material.emissive.set(0);
    material.envMapIntensity = .28;
  }

  // The old wall's imported base colour is literally black. More light cannot
  // reveal that surface: it needs a plausible, nonzero diffuse reflectance.
  restyle(environment.wall, 'plaster', material => {
    matte(material, '#687773', .96); material.map = null;
  });
  restyle(environment.floor, 'smoked-oak', material => {
    matte(material, '#b7ae96', .83); mutedTexture(material, .16, .16, true);
    if(material.map){
      material.map=material.map.clone();material.map.wrapS=material.map.wrapT=THREE.RepeatWrapping;
      material.map.repeat.multiplyScalar(2.2);material.map.offset.addScalar(-.6);material.map.needsUpdate=true;
    }
  });
  const bookPalette = {'book5':'#b7aa8d', 'book4.001':'#92796b', 'book3.001':'#73858a',
    'book2.001':'#738d81', 'book.001':'#b1a697'};
  restyle(environment.bookshelf, 'library', (material, original) => {
    const book = bookPalette[original.name];
    const texturedBook=original.name==='Book';
    matte(material, texturedBook?'#ffffff':original.name==='Bookshelf'?'#d2c6b1':book || '#8e8a78', book || texturedBook ? .9 : .72);
    mutedTexture(material, texturedBook ? .58 : book ? .45 : .22);
  });
  restyle(environment.windows, 'window', material => {
    matte(material, '#9caaa3', .72); material.map = null;
  });
  restyle(environment.art, 'wall-detail', (material, original) => {
    matte(material, original.name === 'Material.024' ? '#a49077' : '#708d86', .88);
    material.map = null;
  });
  restyle(environment.lightStrip, 'cove', material => {
    matte(material, '#c5c2ae', .7); material.emissive?.set('#ded3b8'); material.emissiveIntensity = .12;
  });
  restyle(environment.desk, 'desk', (material, original) => {
    matte(material, original.name === 'lever' ? '#7c8a87' : '#747e75', .69);
    material.map = null;
  });
  restyle(environment.towerStand, 'cabinet', (material, original) => {
    matte(material, original.name === 'lever' ? '#82908b' : '#68766e', .75);
    material.map = null;
  });
  restyle(environment.chair, 'chair', (material, original) => {
    if (original.name === 'lever') {
      material.color.set('#65736f'); material.roughness = .46; material.metalness = .65;
    } else {
      matte(material, original.name === 'Material.001' ? '#63726c' : '#344440', .88);
      material.map = null;
    }
    material.envMapIntensity = .45;
  });

  props.monitor.traverse(mesh=>{if(mesh.isMesh)mesh.userData.studyMonitor=true;});
  restyle(props.group, 'hardware', (material, original, mesh) => {
    if(original.userData.studyHardwarePart){
      // Preserve each physical material rather than desaturating the whole
      // speaker into one grey metallic surface.
      return;
    }
    if(mesh.userData.studyMonitor){
      const metal=/Material\.(055|043|044)/.test(original.name);
      material.color.set(metal?'#555b60':'#252a30');
      material.roughness=metal?.30:.43;material.metalness=metal?1:0;
      material.envMapIntensity=metal?.9:.50;
      if(material.emissive)material.emissive.set(0);
      // Keep decals/UVs, including manufacturer marks; the live canvas screen
      // is excluded by restyle() and retains its colour-managed image.
      if(material.map)material.color.set('#e6e6e6');
      return;
    }
    material.roughness = Math.max(.42, material.roughness ?? .6);
    material.metalness = Math.min(.85, material.metalness ?? 0);
    material.envMapIntensity = .7;
    if ('clearcoat' in material) {material.clearcoat = Math.min(.15, material.clearcoat); material.clearcoatRoughness = .5;}
    if (material.color && Math.max(material.color.r, material.color.g, material.color.b) < .004) material.color.set('#202a29');
    if (original.emissive && original.emissive.r + original.emissive.g + original.emissive.b > 0) {
      // A dim neutral status light instead of 8–10x rainbow emission. Keep the
      // original emitter map so fan rings, key legends and their masks survive.
      material.emissive.set('#d4e5dd'); material.emissiveIntensity = .18;
    }
    mutedTexture(material, .10, .025);
  });
  restyle(character.group, 'character', (material, original) => {
    material.roughness = /phong5/.test(original.name) ? .28 : /Skin_Head/.test(original.name) ? .68 : .88;
    material.metalness = 0; material.envMapIntensity = .22;
    if(/Eyelash|lambert12/.test(original.name)){
      material.transparent=false;material.alphaTest=.35;material.alphaToCoverage=true;material.depthWrite=true;
    }
    // Preserve the authored face, clothing, normal maps and original skin.
  });
  character.group.traverse(mesh => {if (mesh.isSkinnedMesh) mesh.receiveShadow = true;});

  scene.background = new THREE.Color('#344544');
  scene.fog = null;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // A small, prefiltered studio supplies the missing broad metal reflections.
  // It is generated once at load time, never in the animation/render loop.
  let reflectionTarget = null;
  if (renderer.isWebGLRenderer) {
    const studio = new THREE.Scene(); studio.background = new THREE.Color('#777e7a');
    const temporary = [];
    function card(position, size, radiance) {
      const geometry = new THREE.PlaneGeometry(...size);
      const material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, toneMapped: false});
      material.color.setRGB(...radiance);
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.lookAt(0, 0, 0);
      studio.add(mesh); temporary.push(geometry, material);
    }
    card([-5, 7, 4], [7, 5], [3.6, 3.45, 3.15]);
    card([6, 3, 3], [4, 5], [1.4, 1.65, 1.65]);
    card([0, 6, -5], [6, 3], [1.25, 1.2, 1.05]);
    const generator = new THREE.PMREMGenerator(renderer);
    reflectionTarget = generator.fromScene(studio, .03, .1, 30);
    scene.environment = reflectionTarget.texture;
    generator.dispose(); temporary.forEach(resource => resource.dispose());
    report.environmentGenerated = true;
  }

  const hemi = new THREE.HemisphereLight('#edf1e9', '#716d61', .9); scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff1df', 2.15); key.position.set(-4, 8, 6);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, {left:-10, right:10, top:9, bottom:-7, near:.5, far:35});
  key.shadow.bias = -.00018; key.shadow.normalBias = .018;
  key.shadow.radius = 3;
  key.target.position.set(1.5, 2, 0); scene.add(key, key.target);
  const fill = new THREE.DirectionalLight('#dbe9e8', .85); fill.position.set(6, 5, 6); scene.add(fill);
  const rim = new THREE.DirectionalLight('#f0e4ce', .95); rim.position.set(3, 7, -5); scene.add(rim);
  const bounce = new THREE.PointLight('#e2d6be', 8, 16, 2); bounce.position.set(4, 4, -3); scene.add(bounce);
  const signalLight = new THREE.PointLight('#c6e9da', .12, 4, 2); signalLight.position.set(0, 3.6, .1); scene.add(signalLight);

  return {signalLight, report, dispose(){reflectionTarget?.dispose(); ownedMaterials.forEach(material => material.dispose());}};
};
