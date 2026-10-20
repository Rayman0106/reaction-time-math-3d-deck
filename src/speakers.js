/* Native detailed desktop monitors. Imported speaker meshes are retained but
 * hidden; placement comes from the already-arranged source models. */
window.createStudySpeakers = function createStudySpeakers(THREE, props) {
  'use strict';
  const materials={
    cabinet:new THREE.MeshStandardMaterial({color:'#292c30',roughness:.40,metalness:0}),
    front:new THREE.MeshStandardMaterial({color:'#171b20',roughness:.52,metalness:0}),
    cone:new THREE.MeshStandardMaterial({color:'#33373c',roughness:.82,metalness:0}),
    surround:new THREE.MeshStandardMaterial({color:'#101317',roughness:.94,metalness:0}),
    trim:new THREE.MeshStandardMaterial({color:'#969d9f',roughness:.29,metalness:1}),
    dome:new THREE.MeshStandardMaterial({color:'#20252b',roughness:.67,metalness:0}),
    rubber:new THREE.MeshStandardMaterial({color:'#111316',roughness:.96,metalness:0}),
    indicator:new THREE.MeshStandardMaterial({color:'#bac8c4',emissive:'#b4c9c1',emissiveIntensity:.12,roughness:.55})
  };
  for(const [part,material] of Object.entries(materials)){
    material.name='speaker_'+part;material.envMapIntensity=part==='trim'?.8:.48;
    material.userData.studyHardwarePart=part;
  }
  const geometries=new Set();
  function roundedPanel(w,h,d,r,drivers=false,driverOffset=0){
    const x=-w/2,y=0,s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
    if(drivers)for(const [y,radius] of [[.305,.162],[.622,.063]]){const hole=new THREE.Path();hole.absarc(0,y+driverOffset,radius,0,Math.PI*2,true);s.holes.push(hole);}
    const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.013,bevelThickness:.013,curveSegments:8});g.translate(0,0,-d/2);return g;
  }
  // Real cavities behind both drivers: a solid box front used to intersect
  // the recessed woofer and flatten its shading into a grey disk.
  const body=roundedPanel(.56,.82,.48,.035,true,.018),baffle=roundedPanel(.513,.77,.028,.033,true);
  const back=roundedPanel(.52,.78,.018,.027);
  const ring=new THREE.TorusGeometry(.171,.012,12,64);
  const cone=new THREE.LatheGeometry([[0,-.043],[.042,-.043],[.075,-.035],[.115,-.020],[.146,.002],[.157,.007],[.165,.007]].map(p=>new THREE.Vector2(...p)),64);
  const wooferDome=new THREE.SphereGeometry(.045,32,20),tweeterRing=new THREE.TorusGeometry(.071,.008,10,48),tweeter=new THREE.SphereGeometry(.057,32,20);
  const screw=new THREE.SphereGeometry(.006,10,8),knob=new THREE.CylinderGeometry(.019,.019,.022,28),led=new THREE.SphereGeometry(.005,12,8),foot=new THREE.CylinderGeometry(.045,.045,.035,24);
  const speakers=[];
  function mesh(parent,g,m,x=0,y=0,z=0){geometries.add(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
  for(const [i,source] of props.speakers.entries()){
    source.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(source,true),center=bounds.getCenter(new THREE.Vector3());
    source.visible=false;
    const anchor=source.userData.desktopAnchor||[center.x,bounds.min.y,center.z];
    const group=new THREE.Group();group.name='Detailed_studio_speaker_'+i;group.position.set(anchor[0],anchor[1]+.018,anchor[2]);group.rotation.y=.72;
    group.userData={procedural:true,role:'two-way desktop monitor',bevelledCabinet:true,radialSegments:64};props.group.add(group);
    mesh(group,body,materials.cabinet,0,.018,0);
    mesh(group,back,materials.front,0,.038,-.231);
    mesh(group,baffle,materials.front,0,.042,.257);
    mesh(group,ring,materials.surround,0,.347,.317);
    const driver=mesh(group,cone,materials.cone,0,.347,.305);driver.rotation.x=Math.PI/2;
    mesh(group,wooferDome,materials.dome,0,.347,.266).scale.z=.55;
    mesh(group,tweeterRing,materials.trim,0,.664,.307);
    mesh(group,tweeter,materials.dome,0,.664,.296).scale.z=.38;
    for(const x of [-.218,.218])for(const y of [.084,.779])mesh(group,screw,materials.trim,x,y,.285);
    const control=mesh(group,knob,materials.trim,.153,.114,.284);control.rotation.x=Math.PI/2;
    mesh(group,led,materials.indicator,.153,.071,.283);
    for(const x of [-.18,.18])for(const z of [-.15,.15])mesh(group,foot,materials.rubber,x,0,z);
    speakers.push(group);
  }
  props.group.updateMatrixWorld(true);
  return {speakers,report:{count:2,sourceSpeakersHidden:props.speakers.every(o=>!o.visible),smoothDrivers:64,bevelSegments:3,driverCavities:true,materialRoles:Object.keys(materials)},dispose(){for(const g of geometries)g.dispose();for(const m of Object.values(materials))m.dispose();}};
};
