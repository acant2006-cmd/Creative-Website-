import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Plus, Minus, Play, Pause, ArrowUpRight } from 'lucide-react';
import './coach.css';

const asset = (name: string) => `${import.meta.env.BASE_URL}coach/${name}`;
type Controls = { reset: () => void; zoom: (factor: number) => void; play: (value: boolean) => void; rotate: (horizontal: number, vertical: number) => void; view: (side: boolean) => void };

export default function CoachHero({ opacity = 1 }: { opacity?: number }) {
  const host = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [staticMode, setStaticMode] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [side, setSide] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (staticMode || !host.current) return;
    let disposed = false;
    let cleanup = () => {};
    setStatus('loading');
    const mount = host.current;
    async function start() {
      const [THREE, { OrbitControls }, { GLTFLoader }] = await Promise.all([
        import('three'), import('three/addons/controls/OrbitControls.js'), import('three/addons/loaders/GLTFLoader.js'),
      ]);
      if (disposed) return;
      // WebGL construction is intentionally guarded: the confirmed preview remains usable on failure.
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mount.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, .5, 5000);
      const orbit = new OrbitControls(camera, renderer.domElement);
      orbit.enableDamping = true;
      orbit.enablePan = false;
      orbit.enableZoom = false; // Keep wheel scrolling available for the original doorway journey.
      orbit.minPolarAngle = .3;
      orbit.maxPolarAngle = Math.PI * .8;
      const ambient = new THREE.HemisphereLight(0xf8fff0, 0x8e9c74, 2.5);
      const key = new THREE.DirectionalLight(0xfff8e1, 3.2);
      key.position.set(-200, 350, 250);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, { left: -300, right: 300, top: 350, bottom: -300, far: 1500 });
      key.shadow.normalBias = .12;
      const fill = new THREE.DirectionalLight(0xe0f4ff, 1.5);
      fill.position.set(200, 150, -180);
      scene.add(ambient, key, fill);
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(800, 800), new THREE.ShadowMaterial({ opacity: .22 }));
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);
      let mixer: InstanceType<typeof THREE.AnimationMixer> | undefined;
      let animate = false;
      let visible = true;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
      const stopMotion = () => { if (reduced.matches) { animate = false; setPlaying(false); } };
      reduced.addEventListener('change', stopMotion);
      const contextLost = (event: Event) => { event.preventDefault(); renderer.setAnimationLoop(null); setStatus('fallback'); setPlaying(false); };
      renderer.domElement.addEventListener('webglcontextlost', contextLost);
      const visibility = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; });
      visibility.observe(mount);
      let frame = () => {};
      const resize = new ResizeObserver(() => {
        const { width, height } = mount.getBoundingClientRect();
        renderer.setSize(width, height);
        camera.aspect = width / Math.max(height, 1);
        camera.updateProjectionMatrix();
        frame();
      });
      resize.observe(mount);
      const clock = new THREE.Clock();
      renderer.setAnimationLoop(() => {
        const dt = Math.min(clock.getDelta(), .05);
        if (!visible || document.hidden) return;
        if (animate && mixer) mixer.update(dt);
        orbit.update();
        renderer.render(scene, camera);
      });
      cleanup = () => {
        renderer.setAnimationLoop(null);
        reduced.removeEventListener('change', stopMotion);
        renderer.domElement.removeEventListener('webglcontextlost', contextLost);
        resize.disconnect(); visibility.disconnect(); orbit.dispose();
        mixer?.stopAllAction();
        const textures = new Set<InstanceType<typeof THREE.Texture>>();
        scene.traverse(object => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
              for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
              material.dispose();
            }
          }
        });
        textures.forEach(texture => texture.dispose());
        renderer.dispose(); renderer.domElement.remove(); controls.current = null;
      };
      const response = await fetch(asset('model-manifest.json'));
      if (!response.ok) throw new Error('Model settings unavailable');
      const manifest = await response.json();
      const gltf = await new GLTFLoader().loadAsync(asset('model.glb'));
      if (disposed) {
        gltf.scene.traverse(object => {
          if (object instanceof THREE.Mesh) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => material.dispose()); }
        });
        return;
      }
      scene.add(gltf.scene);
      gltf.scene.traverse(object => { if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; } });
      if (gltf.animations.length) {
        mixer = new THREE.AnimationMixer(gltf.scene);
        gltf.animations.forEach(clip => mixer!.clipAction(clip).play());
        mixer.setTime(0);
      }
      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const size = bounds.getSize(new THREE.Vector3());
      const target = new THREE.Vector3().fromArray(manifest.camera.target);
      const direction = new THREE.Vector3().fromArray(manifest.camera.position).sub(target).normalize();
      floor.position.y = bounds.min.y - .2;
      // Manifest supplies the framing direction; fit distance adapts it to a tall hero slot.
      frame = () => {
        const rect = mount.getBoundingClientRect();
        camera.aspect = rect.width / Math.max(rect.height, 1);
        const vertical = size.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
        const horizontal = Math.hypot(size.x, size.z) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
        const distance = Math.max(vertical, horizontal) * 1.15;
        camera.position.copy(target).addScaledVector(direction, distance);
        orbit.target.copy(target); camera.updateProjectionMatrix(); orbit.update();
      };
      controls.current = {
        reset() { direction.fromArray(manifest.camera.position).sub(target).normalize(); frame(); mixer?.setTime(0); animate = false; },
        zoom(factor) {
          const offset = camera.position.clone().sub(orbit.target);
          const distance = THREE.MathUtils.clamp(offset.length() * factor, size.y * 1.1, size.y * 5);
          camera.position.copy(orbit.target).add(offset.normalize().multiplyScalar(distance)); orbit.update();
        },
        play(value) { animate = value; },
        rotate(horizontal, vertical) {
          const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(orbit.target));
          spherical.theta += horizontal; spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, .3, Math.PI * .8);
          camera.position.copy(orbit.target).add(new THREE.Vector3().setFromSpherical(spherical)); orbit.update();
        },
        view(useSide) { direction.set(useSide ? 1 : 0, .16, useSide ? 0 : 1).normalize(); frame(); },
      };
      frame(); setStatus('ready');
    }
    start().catch(() => { if (!disposed) { cleanup(); setStatus('fallback'); } });
    return () => { disposed = true; cleanup(); };
  }, [staticMode, attempt]);

  const reset = () => { controls.current?.reset(); setPlaying(false); setSide(false); };
  const fallback = staticMode || status === 'fallback';
  return <aside className="coach-hero" style={{ opacity, pointerEvents: opacity > 0 ? 'auto' : 'none' }} aria-hidden={opacity === 0} aria-label="Meet the Threshold Fit coach">
    <div className="coach-heading"><span className="coach-dot" /><span>YOUR CORNER. YOUR COACH.</span><span className="coach-edition">01 / THRESHOLD FIT</span></div>
    <div className="coach-stage" tabIndex={status === 'ready' && !fallback ? 0 : -1} role="group" aria-label={fallback ? 'Static preview of the Threshold Fit lifting coach' : 'Interactive lifting coach. Drag to rotate. Arrow keys rotate, plus and minus zoom, Home resets.'}
      onKeyDown={event => {
        const canvas = host.current?.querySelector('canvas');
        if (['+', '=', '-', 'Home'].includes(event.key)) {
          event.preventDefault(); if (event.key === 'Home') reset(); else controls.current?.zoom(event.key === '-' ? 1.12 : .89);
        }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && canvas) {
          event.preventDefault();
          controls.current?.rotate(event.key === 'ArrowLeft' ? -.15 : event.key === 'ArrowRight' ? .15 : 0, event.key === 'ArrowUp' ? -.1 : event.key === 'ArrowDown' ? .1 : 0);
        }
      }}>
      <img className={`coach-preview ${status === 'ready' && !fallback ? 'coach-preview-hidden' : ''}`} src={asset('preview.png')} alt="Threshold Fit coach holding two 100 LB dumbbells" />
      <div ref={host} className={`coach-canvas ${fallback ? 'coach-canvas-hidden' : ''}`} />
      <span className="coach-status" role="status">{fallback ? 'Static model preview' : status === 'loading' ? 'Opening your coach in 3D…' : 'Drag to rotate · Touch to explore'}</span>
    </div>
    <div className="coach-controls" aria-label="Coach view controls">
      {!fallback && status === 'ready' && <>
        <button aria-label="Zoom in" onClick={() => controls.current?.zoom(.89)}><Plus size={15} /></button>
        <button aria-label="Zoom out" onClick={() => controls.current?.zoom(1.12)}><Minus size={15} /></button>
        <button aria-label="Reset coach view" onClick={reset}><RotateCcw size={14} /></button>
        <button aria-label={side ? 'Show front view' : 'Show side view'} onClick={() => { controls.current?.view(!side); setSide(!side); }}>{side ? 'Front' : 'Side'}</button>
        <button className="coach-play" aria-pressed={playing} onClick={() => { controls.current?.play(!playing); setPlaying(!playing); }}>{playing ? <Pause size={13} /> : <Play size={13} />}{playing ? 'Pause' : 'See the curl'}</button>
      </>}
      <button className="coach-preview-toggle" onClick={() => { setStaticMode(!fallback); if (fallback) { setStatus('loading'); setAttempt(value => value + 1); } setPlaying(false); }}>{fallback ? 'Try 3D' : 'Static preview'}</button>
    </div>
    <a className="coach-invitation" href="#sample-day">A little encouragement. A place to start. <ArrowUpRight size={14} /></a>
  </aside>;
}
