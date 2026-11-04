import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { zipSync, strToU8 } from 'fflate';
import './style.css';

const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const loader = new GLTFLoader(), exporter = new GLTFExporter();
let model, selected, mixer, clips = [], playing = false, time = 0;
let references = [], history = [], future = [], restoring = false, ready = false;
let baseTransforms = {}, confirmedURL, revision = 0, view = 'iso';
let env = {background:'#e7ebdf',lighting:'studio',grid:true,axes:false,shadows:true,projection:'perspective'};
const meta = {name:'Threshold Fit coach',description:'A friendly lifting coach for Threshold Fit: strength, nutrition and balance.',type:'Mascot',units:'cm'};
const viewport = $('#viewport');
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
viewport.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-label','Editable three-dimensional model. Select components in the Scene objects list for keyboard editing.');
const scene = new THREE.Scene();
const perspective = new THREE.PerspectiveCamera(35,1,.1,20000);
const orthographic = new THREE.OrthographicCamera(-200,200,200,-200,.1,20000);
let camera = perspective;
let orbit = new OrbitControls(camera,renderer.domElement); orbit.enableDamping = true; orbit.dampingFactor = .09; orbit.minDistance = 1; orbit.maxDistance = 10000;
const transform = new TransformControls(camera,renderer.domElement); transform.setSize(.8); scene.add(transform.getHelper());
const selectionBox = new THREE.BoxHelper(new THREE.Object3D(),0x8ca851); selectionBox.visible = false; scene.add(selectionBox);
const hemi = new THREE.HemisphereLight(0xf8fff0,0x8e9c74,2.5); scene.add(hemi);
const key = new THREE.DirectionalLight(0xfff8e1,3.2); key.position.set(-200,350,250); key.castShadow = true;
key.shadow.mapSize.set(2048,2048); key.shadow.camera.left=-300;key.shadow.camera.right=300;key.shadow.camera.top=350;key.shadow.camera.bottom=-300;key.shadow.camera.far=1500;key.shadow.normalBias=.12; scene.add(key);
const fill = new THREE.DirectionalLight(0xe0f4ff,1.5);fill.position.set(200,150,-180);scene.add(fill);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.ShadowMaterial({opacity:.13}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true; scene.add(floor);
const grid = new THREE.GridHelper(1200,60,0xb7c4a7,0xd0d9c3); grid.material.transparent=true;grid.material.opacity=.35;scene.add(grid);
const axes = new THREE.AxesHelper(120);axes.visible=false;scene.add(axes);
const clock = new THREE.Clock();

function notify(message,error=false){const t=$('#toast');t.textContent=message;t.style.background=error?'#733d2c':'#1b3c2d';t.style.display='block';clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.style.display='none',error?10000:4300)}
function status(text){$('#save-state').textContent=text}
function fail(e){console.error(e);notify(e.message||String(e),true)}
function safe(fn){return async(...args)=>{try{return await fn(...args)}catch(e){fail(e)}finally{const target=args[0]?.target;if(target?.type==='file')target.value=''}}}
function download(data,name,type='application/octet-stream'){const blob=data instanceof Blob?data:new Blob([data],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function buf64(buffer){const bytes=new Uint8Array(buffer);let out='';for(let i=0;i<bytes.length;i+=32768)out+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(out)}
function from64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer}
function blobURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)})}
async function imageData(file,max=1600){const bitmap=await createImageBitmap(file);const c=document.createElement('canvas');const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();return c.toDataURL('image/png')}
const dbPromise = new Promise((resolve,reject)=>{const req=indexedDB.open('Venture3DStudio',1);req.onupgradeneeded=()=>req.result.createObjectStore('projects');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});
async function dbGet(key){const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction('projects');const r=tx.objectStore('projects').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function dbPut(key,value){const db=await dbPromise;return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(value,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}

function snapshot(){
  if(!model)throw Error('Open a model before saving.');
  const wasPlaying=playing;playing=false;
  // Keep all embedded image data and geometries in this portable Three.js document.
  const doc={schemaVersion:'1.0.0',application:'Venture 3D Studio',savedAt:new Date().toISOString(),meta:{...meta},environment:{...env},camera:{position:camera.position.toArray(),target:orbit.target.toArray(),view},references:structuredClone(references),scene:model.toJSON(),animations:clips.map(c=>THREE.AnimationClip.toJSON(c)),baseTransforms:structuredClone(baseTransforms),animationTime:time};
  playing=wasPlaying;return doc;
}
function edited(){revision++;status('Unsaved changes');$('#review-step').classList.remove('complete');clearTimeout(edited.timer);edited.timer=setTimeout(()=>save(false),2500)}
function remember(){if(restoring||!model)return;history.push(snapshot());if(history.length>12)history.shift();future=[];updateUndo()}
function updateUndo(){$('#undo').disabled=!history.length;$('#redo').disabled=!future.length}
async function save(manual=true){if(!ready)return;const rev=revision;try{await dbPut('latest',snapshot());if(revision===rev)status('Saved on this browser');if(manual)notify('Project saved, including your references and textures.')}catch(e){status('Save unavailable — download backup');if(manual)fail(new Error('Browser storage is unavailable or full. Download an editable backup to keep your work.'))}}
async function restore(doc){
  if(doc?.application!=='Venture 3D Studio'||doc.schemaVersion!=='1.0.0'||!doc.scene?.object)throw Error('Choose a Venture 3D Studio project.json or editable backup.');
  const parsed=await new THREE.ObjectLoader().parseAsync(doc.scene);
  let count=0;parsed.traverse(o=>{if(o.isMesh)count++});if(!count)throw Error('This project contains no 3D meshes.');
  restoring=true;try{Object.assign(meta,doc.meta);Object.assign(env,doc.environment);references=doc.references||[];setModel(parsed,(doc.animations||[]).map(c=>THREE.AnimationClip.parse(c)));baseTransforms=doc.baseTransforms||{};time=Number(doc.animationTime)||0;if(mixer)mixer.setTime(time);syncMeta();renderReferences();applyEnvironment();switchProjection(env.projection,false);if(doc.camera){camera.position.fromArray(doc.camera.position);orbit.target.fromArray(doc.camera.target);view=doc.camera.view||'iso';orbit.update()}select(null);edited()}finally{restoring=false}
}
function captureTransforms(){baseTransforms={};model.traverse(o=>baseTransforms[o.uuid]={position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray()})}
function setModel(root,animations=[]){
  select(null);playing=false;time=0;updatePlay();if(mixer){mixer.stopAllAction();mixer.uncacheRoot(model)}if(model)scene.remove(model);model=root;model.name=model.name||'Model';scene.add(model);clips=animations;
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.geometry.normalizeNormals();const mats=Array.isArray(o.material)?o.material:[o.material];o.material=mats.map(m=>m.clone());if(o.material.length===1)o.material=o.material[0]}});
  mixer=clips.length?new THREE.AnimationMixer(model):null;if(mixer)clips.forEach(c=>mixer.clipAction(c).play());
  if(mixer)mixer.setTime(0);captureTransforms();updateObjects();updateAnimationUI();frameView('iso');updateFloor();
}
async function openAsset(kind,rememberChange=true){
  if(rememberChange)remember();$('#loading').style.display='grid';$('#loading').textContent='Opening editable geometry…';
  try{const gltf=await loader.loadAsync(`${import.meta.env.BASE_URL}assets/threshold-fit-${kind==='coach'?'coach-animated':'emblem'}.glb`);const root=gltf.scene;const b=new THREE.Box3().setFromObject(root);const size=b.getSize(new THREE.Vector3());const factor=(kind==='coach'?180:30)/size.y;root.scale.multiplyScalar(factor);root.position.y-=b.min.y*factor;root.name=kind==='coach'?'Threshold Fit lifting coach':'Threshold Fit brand emblem';
  setModel(root,gltf.animations);meta.name=kind==='coach'?'Threshold Fit coach':'Threshold Fit emblem';meta.type=kind==='coach'?'Mascot':'Symbolic sculpture';meta.units='cm';syncMeta();if(rememberChange)edited();}finally{$('#loading').style.display='none'}
}
function syncMeta(){$('#project-name').value=meta.name;$('#project-label').textContent=meta.name;$('#description').value=meta.description;$('#model-type').value=meta.type;$('#units').value=meta.units;$('#dimension-units').textContent=meta.units.toUpperCase()}
function meshes(root=selected){const arr=[];root?.traverse(o=>{if(o.isMesh)arr.push(o)});return arr}
function materials(){return [...new Set(meshes().flatMap(o=>Array.isArray(o.material)?o.material:[o.material]))]}
function select(obj){
  selected=obj;playing=false;updatePlay();transform.detach();selectionBox.visible=!!obj;
  if(obj){transform.attach(obj);selectionBox.setFromObject(obj)}
  $('#object-name').disabled=!obj;$('#object-name').value=obj?.name||'';
  for(const id of ['duplicate','delete','reset-object'])$('#'+id).disabled=!obj||obj===model&&id==='delete';
  const hasMat=materials().length>0;for(const id of ['color','roughness','metalness','opacity','material','texture-repeat','texture-rotation'])$('#'+id).disabled=!hasMat;
  $('#selected-label').textContent=obj?.name||'Select a component to start designing';$('#selection-hint').textContent=obj?'Animation pauses while editing. Joint motion resumes when you press Play.':'Click a component to edit it. Animation pauses while you design.';
  updateInspector();updateObjects(false);
}
function updateObjects(rebuild=true){
  const list=$('#object-list');if(rebuild){list.replaceChildren();model?.traverse(o=>{if(!o.isMesh&&!o.children.length)return;if(o===model)return;const b=document.createElement('button');b.className='object-row';b.textContent=o.name||'Unnamed component';b.title=b.textContent;b.dataset.uuid=o.uuid;b.setAttribute('role','listitem');b.onclick=()=>select(o);list.appendChild(b)});$('#object-count').textContent=meshes(model).length;}
  $$('#object-list button').forEach(b=>{const active=b.dataset.uuid===selected?.uuid;b.classList.toggle('selected',active);b.setAttribute('aria-current',active?'true':'false')});$('#select-root').classList.toggle('selected',selected===model);
}
const transformFields=[['position','Position'],['rotation','Rotate °'],['scale','Scale']];
for(const [prop,label] of transformFields){const row=document.createElement('div');row.className='transform-row';const title=document.createElement('span');title.textContent=label;row.appendChild(title);for(const axis of ['x','y','z']){const l=document.createElement('label');const span=document.createElement('span');span.textContent=axis.toUpperCase();const input=document.createElement('input');input.type='number';input.step=prop==='rotation'?'5':'0.1';input.disabled=true;input.dataset.prop=prop;input.dataset.axis=axis;input.setAttribute('aria-label',`${label} ${axis.toUpperCase()}`);input.onchange=()=>{if(!selected)return;const value=Number(input.value);if(!Number.isFinite(value)||prop==='scale'&&value<=0){updateInspector();return}remember();selected[prop][axis]=prop==='rotation'?THREE.MathUtils.degToRad(value):value;selected.updateMatrixWorld(true);updateInspector();updateFloor();edited()};l.append(span,input);row.appendChild(l)}$('#transform-inputs').appendChild(row)}
function updateInspector(){
  $$('#transform-inputs input').forEach(i=>{i.disabled=!selected;const v=selected?.[i.dataset.prop][i.dataset.axis]||0;i.value=selected?Number((i.dataset.prop==='rotation'?THREE.MathUtils.radToDeg(v):v).toFixed(2)):''});
  if(selected){selected.updateWorldMatrix(true,true);const size=new THREE.Box3().setFromObject(selected).getSize(new THREE.Vector3());$('#dimensions').textContent=[size.x,size.y,size.z].map(v=>v.toFixed(1)).join(' × ')}else $('#dimensions').textContent='— × — × —';
  const mat=materials()[0];if(mat){$('#color').value='#'+mat.color.getHexString();for(const id of ['roughness','metalness','opacity']){$('#'+id).value=mat[id];$('#'+id+'-value').textContent=Number(mat[id].toFixed(2))}$('#texture-repeat').value=mat.map?.repeat.x||1;$('#texture-rotation').value=THREE.MathUtils.radToDeg(mat.map?.rotation||0)}
}
transform.addEventListener('dragging-changed',e=>{orbit.enabled=!e.value;if(e.value)remember();else{updateFloor();edited()}});transform.addEventListener('objectChange',()=>{selectionBox.update();updateInspector()});
let down;renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY]});
renderer.domElement.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4||transform.axis||e.button!==0)return;const r=renderer.domElement.getBoundingClientRect();const pointer=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(pointer,camera);select(ray.intersectObject(model,true).find(h=>h.object.isMesh)?.object||null)});
function frameView(next='iso'){
  if(!model)return;view=next;const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3()),max=Math.max(s.x,s.y,s.z,1);const dirs={front:[0,.06,1],side:[1,.06,0],top:[0,1,.001],iso:[.62,.3,1]};const d=new THREE.Vector3(...dirs[next]).normalize();const dist=max*1.9/Math.min(1,Math.max(.35,viewport.clientWidth/viewport.clientHeight));camera.position.copy(center).addScaledVector(d,dist);orbit.target.copy(center);camera.near=Math.max(.01,max/100);camera.far=Math.max(100,max*50);if(camera.isOrthographicCamera){const half=max*.76,aspect=viewport.clientWidth/viewport.clientHeight;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.zoom=1}camera.updateProjectionMatrix();orbit.update();$$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));
}
function switchProjection(mode,frame=true){
  const pos=camera.position.clone(),target=orbit.target.clone();orbit.dispose();camera=mode==='orthographic'?orthographic:perspective;camera.position.copy(pos);orbit=new OrbitControls(camera,renderer.domElement);orbit.target.copy(target);orbit.enableDamping=true;orbit.minDistance=1;orbit.maxDistance=10000;transform.camera=camera;env.projection=mode;$('#projection').textContent=mode==='perspective'?'Perspective':'Orthographic';resize();if(frame)frameView(view)
}
function resize(){const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h);perspective.aspect=w/h;perspective.updateProjectionMatrix();const half=(orthographic.top-orthographic.bottom)/2;orthographic.left=-half*w/h;orthographic.right=half*w/h;orthographic.updateProjectionMatrix()}
new ResizeObserver(resize).observe(viewport);
function updateFloor(){if(!model)return;model.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(model);floor.position.y=b.min.y-.15;grid.position.y=b.min.y-.2;axes.position.y=b.min.y;key.target.position.copy(b.getCenter(new THREE.Vector3()));scene.add(key.target)}
function applyEnvironment(){
  viewport.style.background=env.background;hemi.intensity=env.lighting==='dramatic'?1.1:2.5;key.intensity=env.lighting==='warm'?3.8:env.lighting==='dramatic'?5:3.2;key.color.set(env.lighting==='warm'?0xffd6a0:0xfff8e1);fill.intensity=env.lighting==='dramatic'?.3:1.5;grid.visible=env.grid;axes.visible=env.axes;floor.visible=env.shadows;renderer.shadowMap.enabled=env.shadows;$('#background').value=env.background;$('#lighting').value=env.lighting;$('#shadows').checked=env.shadows;for(const id of ['grid','axes']){$('#'+id+'-toggle').classList.toggle('active',env[id]);$('#'+id+'-toggle').setAttribute('aria-pressed',env[id])}
}
function updatePlay(){$('#play').textContent=playing?'Ⅱ Pause curls':'▶ Play curls'}
function updateAnimationUI(){$('#animation-label').textContent=clips.length?'Coach animation':'Static model';$('#play').disabled=!clips.length;$('#timeline').disabled=!clips.length;$('#timeline').max=clips[0]?.duration||1;$('#timeline').value=time;$('#time-label').textContent=time.toFixed(1)+' s'}
renderer.setAnimationLoop(()=>{const dt=clock.getDelta();orbit.update();if(playing&&mixer){time=(time+Math.min(dt,.05))%(clips[0]?.duration||4.8);mixer.setTime(time);$('#timeline').value=time;$('#time-label').textContent=time.toFixed(1)+' s'}if(selected)selectionBox.update();renderer.render(scene,camera)});

function renderReferences(){
  const container=$('#references');container.replaceChildren();references.forEach((ref,index)=>{const card=document.createElement('div');card.className='reference';const img=document.createElement('img');img.src=ref.data;img.alt=ref.name;const bar=document.createElement('div');bar.className='reference-bar';const span=document.createElement('span');span.textContent=ref.name;span.title=ref.name;const select=document.createElement('select');select.setAttribute('aria-label','Reference view');for(const value of ['Concept','Front','Side','Back']){const op=document.createElement('option');op.textContent=value;select.appendChild(op)}select.value=ref.view||'Concept';select.onchange=()=>{remember();ref.view=select.value;edited()};const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label','Remove reference');remove.onclick=()=>{remember();references.splice(index,1);renderReferences();edited()};bar.append(span,select,remove);card.append(img,bar);container.appendChild(card)})
}
$('#reference-input').onchange=safe(async e=>{const files=[...e.target.files];if(!files.length)return;const refs=await Promise.all(files.map(async f=>({name:f.name,view:'Concept',data:await imageData(f)})));remember();references.push(...refs);renderReferences();edited();e.target.value='';notify('Reference images imported separately from your 3D model.')});
$('#load-coach').onclick=safe(()=>openAsset('coach'));$('#load-emblem').onclick=safe(()=>openAsset('emblem'));
$('#model-input').onchange=safe(async e=>{const f=e.target.files[0];if(!f)return;if(f.size>50*1024*1024)throw Error('Choose a GLB smaller than 50 MB for browser editing.');const gltf=await loader.parseAsync(await f.arrayBuffer(),'');remember();setModel(gltf.scene,gltf.animations);meta.name=f.name.replace(/\.glb$/i,'');syncMeta();edited();e.target.value='';notify('GLB imported as editable geometry, including embedded textures.')});
$('#project-input').onchange=safe(async e=>{const f=e.target.files[0];if(!f)return;const doc=JSON.parse(await f.text());remember();await restore(doc);e.target.value='';notify('Editable project restored.')});
$('#save').onclick=()=>save();$('#backup').onclick=safe(()=>download(JSON.stringify(snapshot()),`${meta.name.replace(/[^a-z0-9-]/gi,'_')}-editable-project.json`,'application/json'));
$('#restore-confirmed').onclick=safe(async()=>{const doc=await dbGet('confirmed');if(!doc)throw Error('Confirm a model first to create a confirmed snapshot.');remember();await restore(doc);notify('Last confirmed design restored.')});
$('#undo').onclick=safe(async()=>{if(!history.length)return;future.push(snapshot());await restore(history.pop());updateUndo()});$('#redo').onclick=safe(async()=>{if(!future.length)return;history.push(snapshot());await restore(future.pop());updateUndo()});
$('#project-name').onchange=()=>{remember();meta.name=$('#project-name').value.trim()||'Untitled venture';syncMeta();edited()};$('#description').onchange=()=>{remember();meta.description=$('#description').value;edited()};$('#model-type').onchange=()=>{remember();meta.type=$('#model-type').value;edited()};
$('#units').onchange=()=>{remember();const conversion={cm:.01,m:1,in:.0254};const next=$('#units').value;const factor=conversion[meta.units]/conversion[next];model.scale.multiplyScalar(factor);model.position.multiplyScalar(factor);meta.units=next;syncMeta();frameView(view);updateFloor();updateInspector();edited()};
$('#object-name').onchange=()=>{if(!selected)return;remember();const old=selected.name;const next=$('#object-name').value.trim()||'Component';for(const clip of clips)for(const track of clip.tracks){const binding=THREE.PropertyBinding.parseTrackName(track.name);if(binding.nodeName===old)track.name=track.name.replace(old,selected.uuid)}selected.name=next;updateObjects();$('#selected-label').textContent=selected.name;edited()};
$('#select-root').onclick=()=>select(model);$$('[data-tool]').forEach(b=>b.onclick=()=>{transform.setMode(b.dataset.tool);$$('[data-tool]').forEach(t=>t.classList.toggle('active',t===b))});
$$('[data-view]').forEach(b=>b.onclick=()=>frameView(b.dataset.view));$('#reset-view').onclick=()=>frameView('iso');$('#projection').onclick=()=>{remember();switchProjection(env.projection==='perspective'?'orthographic':'perspective');edited()};
for(const name of ['grid','axes'])$('#'+name+'-toggle').onclick=()=>{remember();env[name]=!env[name];applyEnvironment();edited()};
for(const name of ['lighting','background','shadows'])$('#'+name).onchange=()=>{remember();env[name]=name==='shadows'?$('#'+name).checked:$('#'+name).value;applyEnvironment();edited()};
$('#play').onclick=()=>{playing=!playing;updatePlay();if(playing){transform.detach();selectionBox.visible=false}else if(selected){transform.attach(selected);selectionBox.visible=true}};
$('#timeline').oninput=()=>{playing=false;time=Number($('#timeline').value);mixer?.setTime(time);updatePlay();$('#time-label').textContent=time.toFixed(1)+' s'};$('#timeline').onchange=()=>edited();
function changeMaterial(fn){if(!selected)return notify('Select a component first.');remember();materials().forEach(m=>{fn(m);m.needsUpdate=true});updateInspector();edited()}
$('#color').onchange=()=>changeMaterial(m=>m.color.set($('#color').value));$$('[data-color]').forEach(b=>b.onclick=()=>changeMaterial(m=>m.color.set(b.dataset.color)));
for(const name of ['roughness','metalness','opacity']){$('#'+name).oninput=()=>{$('#'+name+'-value').textContent=$('#'+name).value};$('#'+name).onchange=()=>changeMaterial(m=>{m[name]=Number($('#'+name).value);if(name==='opacity'){m.transparent=m.opacity<1;m.depthWrite=m.opacity>=1}})}
$('#material').onchange=()=>{const presets={matte:[.85,0,1],plastic:[.25,0,1],metal:[.4,.85,1],glass:[.18,.1,.35]};const p=presets[$('#material').value];if(p)changeMaterial(m=>{[m.roughness,m.metalness,m.opacity]=p;m.transparent=m.opacity<1;m.depthWrite=!m.transparent})};
$('#texture-input').onchange=safe(async e=>{const f=e.target.files[0];if(!f)return;if(!selected)throw Error('Select a component before applying an image texture.');const targets=meshes().filter(m=>m.geometry.attributes.uv);if(!targets.length)throw Error('This component has no texture coordinates. Select a different component or add a box.');const url=await imageData(f,2048);const texture=await new THREE.TextureLoader().loadAsync(url);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.flipY=false;remember();for(const mesh of targets){for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){mat.map=texture;mat.color.set('#ffffff');mat.needsUpdate=true}}updateInspector();edited();e.target.value='';notify('Image texture applied and included in project exports.')});
$('#remove-texture').onclick=()=>changeMaterial(m=>m.map=null);
$('#texture-repeat').onchange=()=>changeMaterial(m=>{if(m.map){m.map=m.map.clone();m.map.wrapS=m.map.wrapT=THREE.RepeatWrapping;m.map.repeat.setScalar(Math.max(.1,Math.min(20,Number($('#texture-repeat').value)||1)))}});
$('#texture-rotation').onchange=()=>changeMaterial(m=>{if(m.map){m.map=m.map.clone();m.map.center.set(.5,.5);m.map.rotation=THREE.MathUtils.degToRad(Number($('#texture-rotation').value)||0)}});
$('#reset-object').onclick=()=>{if(!selected)return;const t=baseTransforms[selected.uuid];if(!t)return notify('This component has no saved starting transform.');remember();selected.position.fromArray(t.position);selected.rotation.fromArray(t.rotation);selected.scale.fromArray(t.scale);updateInspector();updateFloor();edited()};
$('#duplicate').onclick=()=>{if(!selected)return;remember();const copy=cloneSkeleton(selected);copy.name=selected.name+' copy';copy.traverse(o=>{if(o.isMesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone()});if(selected===model){const wrapper=new THREE.Group();wrapper.name='Venture model';scene.remove(model);wrapper.add(model);scene.add(wrapper);model=wrapper;model.add(copy);copy.position.x+=30}else{selected.parent.add(copy);copy.position.x+=Math.max(.1,1/selected.parent.getWorldScale(new THREE.Vector3()).x*15)}copy.traverse(o=>baseTransforms[o.uuid]={position:o.position.toArray(),rotation:o.rotation.toArray(),scale:o.scale.toArray()});updateObjects();select(copy);edited()};
$('#delete').onclick=()=>{if(!selected||selected===model)return;remember();const remove=selected;select(null);remove.removeFromParent();const removed=new Set();remove.traverse(o=>{removed.add(o.uuid);removed.add(o.name)});clips=clips.map(c=>{const clip=c.clone();clip.tracks=clip.tracks.filter(t=>!removed.has(THREE.PropertyBinding.parseTrackName(t.name).nodeName));return clip}).filter(c=>c.tracks.length);if(mixer){mixer.stopAllAction();mixer.uncacheRoot(model);mixer=clips.length?new THREE.AnimationMixer(model):null;clips.forEach(c=>mixer.clipAction(c).play())}updateAnimationUI();updateObjects();updateFloor();edited()};

function primitive(type,size=24,color='#c7e976'){
  const geometry=type==='sphere'?new THREE.SphereGeometry(size/2,32,24):type==='cylinder'?new THREE.CylinderGeometry(size/2,size/2,size,40):type==='cone'?new THREE.ConeGeometry(size/2,size,40):new THREE.BoxGeometry(size,size,size);
  return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.65}));
}
$('#add').onclick=()=>{remember();const mesh=primitive($('#primitive').value);mesh.name='New '+$('#primitive').value;mesh.position.set(0,30,0);model.worldToLocal(mesh.position);const sc=model.getWorldScale(new THREE.Vector3());mesh.scale.set(1/sc.x,1/sc.y,1/sc.z);model.add(mesh);mesh.castShadow=true;mesh.receiveShadow=true;baseTransforms[mesh.uuid]={position:mesh.position.toArray(),rotation:mesh.rotation.toArray(),scale:mesh.scale.toArray()};updateObjects();select(mesh);edited()};
const templateInfo=[['bottle','♙','Bottle','Body, lid & label'],['box','▣','Product box','Box, band & label'],['bag','▱','Everyday bag','Body, handles & pocket'],['mascot','☻','Friendly mascot','Head, face, body & limbs'],['merch','♜','Branded merchandise','Mug, handle & badge'],['room','⌂','Service space','Room, counter & seating'],['sculpture','◈','Symbolic sculpture','Plinth, rings & shapes']];
function createTemplate(type){
  const root=new THREE.Group();root.name=templateInfo.find(t=>t[0]===type)[2];
  const add=(name,geometry,pos,color,scale=[1,1,1],rotation=[0,0,0])=>{const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.65}));mesh.name=name;mesh.position.fromArray(pos);mesh.scale.fromArray(scale);mesh.rotation.fromArray(rotation);root.add(mesh);return mesh};
  const box=(name,pos,size,color)=>add(name,new THREE.BoxGeometry(...size),pos,color);
  const sphere=(name,pos,size,color)=>add(name,new THREE.SphereGeometry(1,32,24),pos,color,size);
  const cylinder=(name,pos,top,bottom,h,color)=>add(name,new THREE.CylinderGeometry(top,bottom,h,48),pos,color);
  const torus=(name,pos,r,t,color,rotation=[0,0,0])=>add(name,new THREE.TorusGeometry(r,t,16,64),pos,color,[1,1,1],rotation);
  const green='#173f2e',lime='#c7e976',cream='#f4e8c7',orange='#d96e43';
  if(type==='bottle'){cylinder('Bottle body',[0,25,0],10,10,40,green);cylinder('Shoulder',[0,47,0],4,10,6,green);cylinder('Cap',[0,54,0],4.5,4.5,8,lime);cylinder('Label band',[0,26,0],10.1,10.1,17,cream);box('Front brand badge',[0,26,10.3],[8,9,.5],lime)}
  if(type==='box'){box('Package body',[0,21,0],[32,42,19],cream);box('Lime top',[0,43,0],[33,3,20],lime);box('Forest brand band',[0,20,9.7],[32,13,.6],green);box('Orange badge',[0,30,10],[9,5,1],orange)}
  if(type==='bag'){box('Bag body',[0,24,0],[40,40,17],green);box('Front pocket',[0,21,9],[27,19,3],lime);torus('Front handle',[0,48,6],11,2,cream);torus('Back handle',[0,48,-6],11,2,cream);box('Brand patch',[0,23,11],[12,5,.5],cream)}
  if(type==='mascot'){sphere('Body',[0,37,0],[15,20,12],green);sphere('Head',[0,66,0],[17,16,14],lime);sphere('Left eye',[-6,69,13],[2,3,1.4],green);sphere('Right eye',[6,69,13],[2,3,1.4],green);const smile=add('Smile',new THREE.TorusGeometry(5,.7,12,32,Math.PI),[0,63,13],green);smile.rotation.z=Math.PI;for(const side of [-1,1]){sphere(side<0?'Left arm':'Right arm',[side*20,39,0],[7,13,6],lime);sphere(side<0?'Left foot':'Right foot',[side*9,10,3],[8,10,12],cream)}box('Chest badge',[0,42,12],[8,8,1],cream)}
  if(type==='merch'){const shape=new THREE.Shape();shape.absarc(0,0,15,0,Math.PI*2,false);const hole=new THREE.Path();hole.absarc(0,0,12,0,Math.PI*2,true);shape.holes.push(hole);const mug=add('Hollow mug',new THREE.ExtrudeGeometry(shape,{depth:32,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:1,bevelThickness:1,curveSegments:48}),[0,1,0],cream);mug.rotation.x=-Math.PI/2;cylinder('Mug base',[0,1,0],14,14,2,cream);torus('Handle',[20,18,0],10,2.8,green);box('Brand badge',[0,19,15],[14,12,1],lime)}
  if(type==='room'){box('Floor',[0,0,0],[180,3,150],cream);box('Back wall',[0,55,-74],[180,110,3],green);box('Side wall',[-89,55,0],[3,110,150],green);box('Welcome counter',[15,25,-30],[85,50,30],lime);box('Counter top',[15,52,-30],[90,4,34],cream);box('Wall brand sign',[15,80,-71],[55,14,2],lime);for(const x of [-35,45]){cylinder('Seat',[x,22,30],13,13,7,orange);cylinder('Seat leg',[x,10,30],3,3,20,green)}}
  if(type==='sculpture'){cylinder('Plinth',[0,6,0],26,26,12,green);torus('Lime balance ring',[0,40,0],24,4,lime);torus('Cream balance ring',[0,40,0],19,3,cream,[0,Math.PI/2,0]);sphere('Core',[0,40,0],[9,9,9],orange);sphere('Upper form',[0,72,0],[6,10,6],green)}
  remember();setModel(root,[]);meta.name='My '+root.name.toLowerCase();meta.type=type==='room'?'Service environment':type==='mascot'?'Mascot':type==='sculpture'?'Symbolic sculpture':'Physical product';meta.units='cm';syncMeta();edited();$('#template-dialog').close();notify('Editable template opened. You can Undo to return to your previous model.');
}
for(const [id,icon,name,caption] of templateInfo){const button=document.createElement('button');const span=document.createElement('span');span.textContent=icon;const strong=document.createElement('strong');strong.textContent=name;const small=document.createElement('small');small.textContent=caption;button.append(span,strong,small);button.onclick=()=>createTemplate(id);$('#template-grid').appendChild(button)}
$('#templates').onclick=()=>$('#template-dialog').showModal();$('#help').onclick=()=>$('#help-dialog').showModal();$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());

async function exportGLB(){
  if(!model||!meshes(model).length)throw Error('Add at least one mesh before exporting.');
  let triangles=0;model.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;if(!p||!p.count)throw Error(`Component “${o.name}” has no usable geometry.`);for(let i=0;i<p.array.length;i++)if(!Number.isFinite(p.array[i]))throw Error(`Component “${o.name}” contains invalid coordinates.`);triangles+=(o.geometry.index?.count||p.count)/3});if(!triangles)throw Error('The model contains no triangles.');
  const wasPlaying=playing;playing=false;const pose=time;
  try{
    // Export the rest pose with the original clips. This avoids baking a mid-curl
    // pose as the base transform and preserves animated joint motion.
    if(mixer)mixer.setTime(0);model.updateMatrixWorld(true);
    const buffer=await exporter.parseAsync(model,{binary:true,animations:clips,trs:true,onlyVisible:true,maxTextureSize:2048});
    if(!(buffer instanceof ArrayBuffer)||new DataView(buffer).getUint32(0,true)!==0x46546c67)throw Error('The model exporter did not return a valid binary GLB.');
    // An independent loader verifies that exported geometry and textures reopen.
    const check=await loader.parseAsync(buffer,'');let count=0;check.scene.traverse(o=>{if(o.isMesh)count++});if(!count)throw Error('The exported GLB could not be reopened as a usable model.');
    return buffer;
  }finally{if(mixer)mixer.setTime(pose);playing=wasPlaying;updatePlay()}
}
$('#export-glb').onclick=safe(async()=>{status('Validating GLB export…');const buffer=await exportGLB();download(buffer,'model.glb','model/gltf-binary');status('GLB exported and reimported');notify('GLB exported and independently reimported successfully.')});
async function confirmModel(){
  const btn=$('#confirm');btn.disabled=true;btn.textContent='Validating model…';
  try{
    playing=false;updatePlay();const buffer=await exportGLB();const doc=snapshot();
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(n=>n.toString(16).padStart(2,'0')).join('');
    const b=new THREE.Box3().setFromObject(model),size=b.getSize(new THREE.Vector3());const timestamp=new Date().toISOString();const previous=await dbGet('manifest').catch(()=>null);
    const manifest={schemaVersion:'1.0.0',handoffVersion:(previous?.handoffVersion||0)+1,projectName:meta.name,modelName:model.name,modelType:meta.type,confirmedAt:timestamp,dimensions:{width:size.x,height:size.y,depth:size.z,units:meta.units,axis:'Y-up',front:'+Z',measurement:'Axis-aligned bounds of the current pose; animation may change bounds.'},camera:{projection:env.projection,position:camera.position.toArray(),target:orbit.target.toArray(),view},environment:{background:env.background,lighting:env.lighting},description:meta.description,hotspots:[],animation:{clips:clips.map(c=>({name:c.name,duration:c.duration})),previewTime:time,modelBasePose:'Animation rest pose'},files:{model:'model.glb',manifest:'model-manifest.json',project:'project.json',preview:'preview.png',instructions:'README.txt'},integrity:{algorithm:'SHA-256',modelChecksum:hash,modelBytes:buffer.byteLength}};
    const visible=selectionBox.visible;const helperVisible=transform.getHelper().visible;const gridVisible=grid.visible;const axesVisible=axes.visible;
    selectionBox.visible=false;transform.getHelper().visible=false;grid.visible=false;axes.visible=false;
    let preview;try{renderer.setClearColor(env.background,1);renderer.render(scene,camera);preview=renderer.domElement.toDataURL('image/png')}finally{renderer.setClearColor(0x000000,0);selectionBox.visible=visible;transform.getHelper().visible=helperVisible;grid.visible=gridVisible;axes.visible=axesVisible}
    const readme=`VENTURE 3D STUDIO — CONFIRMED HANDOFF\nProject: ${meta.name}\nVersion: ${manifest.handoffVersion}\nConfirmed: ${timestamp}\n\nCarry this entire ZIP into Mission 3.\nmodel.glb contains the actual 3D meshes, materials, embedded textures and supported animation.\nmodel-manifest.json describes scale, camera, design, relative files and SHA-256 integrity.\nproject.json is your editable backup. Restore it through Restore project in Venture 3D Studio. References stay separate from the 3D scene and are embedded in that backup.\npreview.png shows your current view.\n\nScale: model coordinates are ${meta.units}. Y points up; +Z is front. glTF viewers commonly assume meters: apply a conversion factor of ${{cm:'.01',m:'1',in:'.0254'}[meta.units]} to display at physical size in a meter-based scene.\n\nThe coach is a stylized model with rigid joint animation. It is not an anatomical or exact image reconstruction. Its base pose is exported with animation clips. The preview uses the selected animation time. Background and studio lights are described in the manifest, not baked into the model.\n\nThis confirmation does not publish or modify your venture website.\n`;
    const zip=zipSync({'model.glb':new Uint8Array(buffer),'model-manifest.json':strToU8(JSON.stringify(manifest,null,2)),'project.json':strToU8(JSON.stringify(doc)),'preview.png':new Uint8Array(from64(preview.split(',')[1])),'README.txt':strToU8(readme)},{level:6});
    // Do not report confirmation until the editable snapshot is safely stored.
    await dbPut('confirmed',doc);await dbPut('manifest',manifest);await dbPut('latest',doc);
    if(import.meta.env.DEV){const response=await fetch('/__local_handoff',{method:'POST',body:zip});if(!response.ok)console.warn('Local handoff copy could not be saved. Browser download is still available.');}
    if(confirmedURL)URL.revokeObjectURL(confirmedURL);confirmedURL=URL.createObjectURL(new Blob([zip],{type:'application/zip'}));$('#download-handoff').href=confirmedURL;$('#confirmed-preview').src=preview;$('#confirmed-details').textContent=`${meta.name} · Version ${manifest.handoffVersion} · ${(buffer.byteLength/1048576).toFixed(1)} MB GLB · ${clips.length} animation clip${clips.length===1?'':'s'}`;$('#confirm-dialog').showModal();$('#review-step').classList.add('complete');status('Confirmed snapshot saved');notify('Model validated, reopened and packaged. Download your handoff ZIP.');
    return {manifest,project:doc,zip,preview,buffer};
  }finally{btn.disabled=false;btn.innerHTML='Confirm model <span>↗</span>'}
}
$('#confirm').onclick=safe(confirmModel);
document.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();(e.shiftKey?$('#redo'):$('#undo')).click()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();save()}if(e.key==='Escape')select(null)});
window.addEventListener('beforeunload',e=>{if($('#save-state').textContent==='Unsaved changes'){e.preventDefault();e.returnValue=''}});
async function start(){
  try{
    const saved=await dbGet('latest').catch(()=>null);
    if(saved){await restore(saved);status('Restored saved project')}else{const res=await fetch(`${import.meta.env.BASE_URL}assets/concept-reference.png`);if(!res.ok)throw Error('The concept image could not load.');references=[{name:'Threshold Fit concept',view:'Concept',data:await blobURL(await res.blob())}];renderReferences();await openAsset('coach',false);status('Ready to customize')}
    applyEnvironment();ready=true;updateUndo();$('#loading').style.display='none';
  }catch(e){$('#loading').textContent='Your model could not open. Try importing a GLB or choosing a template.';fail(e);ready=true}
}

start();
