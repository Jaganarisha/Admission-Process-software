import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const HOTSPOTS = [
  { id: 'green-campus', title: '25+ Acres Green Campus', desc: 'Original campus view on Chennai-Bangalore National Highway, nestled in scenic hills', pos: [0, 1.8, 2.2] },
  { id: 'hitech-infra', title: 'Hi-Tech Infrastructure', desc: 'Modern computing labs, digital classrooms, and Wi-Fi enabled academic spaces', pos: [-1.9, 1.8, -1.1] },
  { id: 'adv-eng', title: 'Advanced Engineering', desc: 'Hands-on mechanical labs, robotics workshops, and state-of-the-art research centers', pos: [1.9, 1.8, -1.1] },
  { id: 'bec-crest', title: 'Official BEC Crest', desc: 'Institutional insignia of Bharathidasan Engineering College, Nattrampalli', pos: [0, 3.8, 0] },
];

export default function Campus3DViewer({
  modelType: initialModel = 'prism',
  compact = false,
  allowSwitch = true,
  height = '100%',
  onExplore = null,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [modelType, setModelType] = useState(initialModel);
  const [theme, setTheme] = useState('day'); // 'day' | 'night'
  const [autoRotate, setAutoRotate] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [showHotspots, setShowHotspots] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // References for animation loop and interaction
  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    modelGroup: null,
    tasselMesh: null,
    gimbalRings: [],
    orbitNodes: [],
    particles: null,
    prismGroup: null,
    isDragging: false,
    prevMousePos: { x: 0, y: 0 },
    spherical: { radius: 13, theta: 0.4, phi: 1.1 },
    targetSpherical: { radius: 13, theta: 0.4, phi: 1.1 },
    center: new THREE.Vector3(0, 1.8, 0),
    autoRotate: true,
    theme: 'day',
    modelType: initialModel,
    reqId: null,
    time: 0,
    textures: {},
  });

  // Sync state ref
  useEffect(() => {
    stateRef.current.autoRotate = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    stateRef.current.theme = theme;
    if (stateRef.current.scene) {
      applyTheme(stateRef.current.scene, theme);
    }
  }, [theme]);

  // Update theme colors and lighting
  const applyTheme = (scene, currentTheme) => {
    const isNight = currentTheme === 'night';
    const hemiLight = scene.getObjectByName('hemiLight');
    const dirLight = scene.getObjectByName('dirLight');
    const ambLight = scene.getObjectByName('ambLight');
    const pointLights = scene.getObjectsByProperty('isPointLight', true);

    if (hemiLight) {
      hemiLight.color.setHex(isNight ? 0x223366 : 0xffffff);
      hemiLight.groundColor.setHex(isNight ? 0x050814 : 0x608050);
      hemiLight.intensity = isNight ? 0.6 : 1.15;
    }
    if (dirLight) {
      dirLight.color.setHex(isNight ? 0x6688ff : 0xfffaed);
      dirLight.intensity = isNight ? 0.8 : 1.85;
      dirLight.position.set(isNight ? -8 : 12, 18, isNight ? -6 : 14);
    }
    if (ambLight) {
      ambLight.intensity = isNight ? 0.35 : 0.65;
    }
    pointLights.forEach((pl) => {
      if (pl.name.startsWith('lantern_')) {
        pl.intensity = isNight ? 2.5 : 1.0;
        pl.distance = isNight ? 8 : 5;
      }
    });

    if (scene.fog) {
      scene.fog.color.setHex(isNight ? 0x08112a : 0xe4edfb);
      scene.fog.near = isNight ? 14 : 20;
      scene.fog.far = isNight ? 42 : 52;
    }
    if (stateRef.current.renderer) {
      stateRef.current.renderer.setClearColor(isNight ? 0x070e24 : 0x000000, 0);
    }
  };

  // Switch Model Builder
  useEffect(() => {
    stateRef.current.modelType = modelType;
    if (!stateRef.current.scene) return;

    // Remove old model
    if (stateRef.current.modelGroup) {
      stateRef.current.scene.remove(stateRef.current.modelGroup);
      disposeHierarchy(stateRef.current.modelGroup);
      stateRef.current.modelGroup = null;
    }

    // Clear trackers
    stateRef.current.gimbalRings = [];
    stateRef.current.orbitNodes = [];
    stateRef.current.tasselMesh = null;
    stateRef.current.particles = null;
    stateRef.current.prismGroup = null;
    setActiveHotspot(null);

    // Build selected model
    const group = new THREE.Group();
    if (modelType === 'prism') {
      buildBecPhotoPrismModel(group, stateRef.current);
      stateRef.current.targetSpherical = { radius: compact ? 13 : 11.5, theta: 0.4, phi: 1.1 };
      stateRef.current.center.set(0, 1.8, 0);
    } else if (modelType === 'cap') {
      buildGraduationCapModel(group, stateRef.current);
      stateRef.current.targetSpherical = { radius: 10, theta: 0.4, phi: 1.05 };
      stateRef.current.center.set(0, 0.5, 0);
    } else if (modelType === 'tech') {
      buildTechCoreModel(group, stateRef.current);
      stateRef.current.targetSpherical = { radius: 11, theta: 0.7, phi: 1.15 };
      stateRef.current.center.set(0, 0, 0);
    }

    stateRef.current.scene.add(group);
    stateRef.current.modelGroup = group;
  }, [modelType, compact]);

  // Main Three.js Initialization & Lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 400;
    const heightPx = container.clientHeight || 350;

    // Preload textures
    const tl = new THREE.TextureLoader();
    const loadTex = (url) => {
      const tex = tl.load(url);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };

    stateRef.current.textures = {
      becLogo: loadTex('/images/bec-logo.png'),
      campus: loadTex('/images/campus.jpg'),
      banner: loadTex('/images/campus-banner.jpg'),
      mech: loadTex('/images/mech-block.jpg'),
    };

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xe4edfb, 20, 52);
    stateRef.current.scene = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(42, width / heightPx, 0.1, 100);
    stateRef.current.camera = camera;

    // Renderer
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, heightPx);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      stateRef.current.renderer = renderer;
    } catch {
      return;
    }

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x608050, 1.15);
    hemiLight.name = 'hemiLight';
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.85);
    dirLight.name = 'dirLight';
    dirLight.position.set(12, 18, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -12;
    dirLight.shadow.camera.right = 12;
    dirLight.shadow.camera.top = 12;
    dirLight.shadow.camera.bottom = -12;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.65);
    ambLight.name = 'ambLight';
    scene.add(ambLight);

    // Initial Model Build
    const initialGroup = new THREE.Group();
    if (modelType === 'prism') {
      buildBecPhotoPrismModel(initialGroup, stateRef.current);
      stateRef.current.targetSpherical = { radius: compact ? 13 : 11.5, theta: 0.4, phi: 1.1 };
      stateRef.current.center.set(0, 1.8, 0);
    } else if (modelType === 'cap') {
      buildGraduationCapModel(initialGroup, stateRef.current);
      stateRef.current.targetSpherical = { radius: 10, theta: 0.4, phi: 1.05 };
      stateRef.current.center.set(0, 0.5, 0);
    } else {
      buildTechCoreModel(initialGroup, stateRef.current);
      stateRef.current.targetSpherical = { radius: 11, theta: 0.7, phi: 1.15 };
      stateRef.current.center.set(0, 0, 0);
    }
    scene.add(initialGroup);
    stateRef.current.modelGroup = initialGroup;

    // Apply initial theme
    applyTheme(scene, theme);

    // Animation Loop
    let lastTime = performance.now();
    const animate = (now) => {
      stateRef.current.reqId = requestAnimationFrame(animate);
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      stateRef.current.time += delta;
      const t = stateRef.current.time;

      const sph = stateRef.current.spherical;
      const targetSph = stateRef.current.targetSpherical;

      if (stateRef.current.autoRotate && !stateRef.current.isDragging) {
        targetSph.theta += 0.22 * delta;
      }

      sph.theta += (targetSph.theta - sph.theta) * 0.1;
      sph.phi += (targetSph.phi - sph.phi) * 0.1;
      sph.radius += (targetSph.radius - sph.radius) * 0.1;

      const sinPhi = Math.sin(sph.phi);
      const cosPhi = Math.cos(sph.phi);
      const sinTheta = Math.sin(sph.theta);
      const cosTheta = Math.cos(sph.theta);

      camera.position.x = stateRef.current.center.x + sph.radius * sinPhi * sinTheta;
      camera.position.y = stateRef.current.center.y + sph.radius * cosPhi;
      camera.position.z = stateRef.current.center.z + sph.radius * sinPhi * cosTheta;
      camera.lookAt(stateRef.current.center);

      // Model animations
      if (stateRef.current.modelType === 'prism') {
        if (stateRef.current.prismGroup) {
          stateRef.current.prismGroup.rotation.y = t * 0.45;
        }
      } else if (stateRef.current.modelType === 'cap') {
        if (stateRef.current.tasselMesh) {
          stateRef.current.tasselMesh.rotation.z = Math.sin(t * 2.4) * 0.18;
          stateRef.current.tasselMesh.rotation.x = Math.cos(t * 1.8) * 0.12;
        }
        if (stateRef.current.particles) {
          stateRef.current.particles.rotation.y = t * 0.2;
        }
      } else if (stateRef.current.modelType === 'tech') {
        stateRef.current.gimbalRings.forEach((ring, idx) => {
          const speed = (idx + 1) * 0.45;
          ring.rotation.x += speed * delta * (idx % 2 === 0 ? 1 : -1);
          ring.rotation.y += speed * 0.7 * delta;
        });
        stateRef.current.orbitNodes.forEach((node, idx) => {
          const angle = t * 0.8 + (idx * Math.PI * 2) / 5;
          const r = 4.2;
          node.position.x = Math.cos(angle) * r;
          node.position.z = Math.sin(angle) * r;
          node.position.y = Math.sin(t * 1.5 + idx) * 0.8;
          node.rotation.y = -angle;
        });
      }

      renderer.render(scene, camera);
    };

    stateRef.current.reqId = requestAnimationFrame(animate);

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      if (stateRef.current.reqId) cancelAnimationFrame(stateRef.current.reqId);
      if (stateRef.current.modelGroup) {
        disposeHierarchy(stateRef.current.modelGroup);
      }
      renderer.dispose();
    };
  }, []);

  // Mouse & Touch Orbit Event Handlers
  const handlePointerDown = (e) => {
    stateRef.current.isDragging = true;
    stateRef.current.prevMousePos = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!stateRef.current.isDragging) return;
    const dx = e.clientX - stateRef.current.prevMousePos.x;
    const dy = e.clientY - stateRef.current.prevMousePos.y;
    stateRef.current.prevMousePos = { x: e.clientX, y: e.clientY };

    const targetSph = stateRef.current.targetSpherical;
    targetSph.theta -= dx * 0.008;
    targetSph.phi -= dy * 0.008;

    targetSph.phi = Math.max(0.18, Math.min(Math.PI / 2 + 0.08, targetSph.phi));
  };

  const handlePointerUp = () => {
    stateRef.current.isDragging = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
    const targetSph = stateRef.current.targetSpherical;
    const minR = 5;
    const maxR = 18;
    targetSph.radius = Math.max(minR, Math.min(maxR, targetSph.radius * zoomFactor));
  };

  const resetCamera = () => {
    if (modelType === 'prism') {
      stateRef.current.targetSpherical = { radius: compact ? 13 : 11.5, theta: 0.4, phi: 1.1 };
      stateRef.current.center.set(0, 1.8, 0);
    } else if (modelType === 'cap') {
      stateRef.current.targetSpherical = { radius: 10, theta: 0.4, phi: 1.05 };
      stateRef.current.center.set(0, 0.5, 0);
    } else {
      stateRef.current.targetSpherical = { radius: 11, theta: 0.7, phi: 1.15 };
      stateRef.current.center.set(0, 0, 0);
    }
  };

  const handleHotspotClick = (spot) => {
    setActiveHotspot(spot);
    stateRef.current.targetSpherical.theta = Math.atan2(spot.pos[0], spot.pos[2]) + 0.35;
    stateRef.current.targetSpherical.phi = 1.0;
    stateRef.current.targetSpherical.radius = compact ? 13 : 11;
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      ref={containerRef}
      className={`campus-3d-container ${compact ? 'compact' : ''} ${isFullscreen ? 'fullscreen-mode' : ''}`}
      style={{ height: isFullscreen ? '100vh' : height }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      <canvas ref={canvasRef} className="campus-3d-canvas" />

      {/* Top Floating Control Bar */}
      <div className="campus-3d-topbar">
        <div className="campus-3d-badge">
          <span className="live-dot pulse"></span>
          <span><b>3D Interactive BEC Model</b></span>
          <span className="badge-hint">Drag to rotate · Scroll to zoom</span>
        </div>

        <div className="campus-3d-actions">
          <button
            type="button"
            className={`ctrl-btn ${autoRotate ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); setAutoRotate(!autoRotate); }}
            title={autoRotate ? 'Pause 360° Rotation' : 'Start 360° Rotation'}
            aria-label="Toggle Auto Rotation"
          >
            {autoRotate ? '⏸️' : '▶️'}
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={(e) => { e.stopPropagation(); setTheme(theme === 'day' ? 'night' : 'day'); }}
            title={theme === 'day' ? 'Switch to Cyber Twilight' : 'Switch to Daylight Campus'}
            aria-label="Toggle Day / Night lighting"
          >
            {theme === 'day' ? '☀️ Day' : '🌙 Dusk'}
          </button>
          {modelType === 'prism' && (
            <button
              type="button"
              className={`ctrl-btn ${showHotspots ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); setShowHotspots(!showHotspots); }}
              title="Toggle Photo Hotspots"
              aria-label="Toggle Hotspots"
            >
              📍 Pins
            </button>
          )}
          <button
            type="button"
            className="ctrl-btn"
            onClick={(e) => { e.stopPropagation(); resetCamera(); }}
            title="Reset Camera View"
            aria-label="Reset View"
          >
            🎯
          </button>
          <button
            type="button"
            className="ctrl-btn"
            onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Expand Fullscreen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
        </div>
      </div>

      {/* Model Selector Tabs */}
      {allowSwitch && (
        <div className="campus-3d-model-tabs" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`tab-chip ${modelType === 'prism' ? 'active' : ''}`}
            onClick={() => setModelType('prism')}
          >
            💎 3D BEC Photo Prism
          </button>
          <button
            type="button"
            className={`tab-chip ${modelType === 'cap' ? 'active' : ''}`}
            onClick={() => setModelType('cap')}
          >
            🎓 Graduation Honours
          </button>
          <button
            type="button"
            className={`tab-chip ${modelType === 'tech' ? 'active' : ''}`}
            onClick={() => setModelType('tech')}
          >
            🌐 Tech &amp; Innovation
          </button>
        </div>
      )}

      {/* Interactive 3D Hotspot Pills on the bottom */}
      {modelType === 'prism' && showHotspots && (
        <div className="campus-3d-hotspots-bar" onClick={(e) => e.stopPropagation()}>
          <div className="hotspots-scroller">
            {HOTSPOTS.map((spot) => (
              <button
                key={spot.id}
                type="button"
                className={`hotspot-pill ${activeHotspot?.id === spot.id ? 'active' : ''}`}
                onClick={() => handleHotspotClick(spot)}
              >
                <span>📍</span>
                <b>{spot.title}</b>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Hotspot Info Card Modal */}
      {activeHotspot && (
        <div className="campus-3d-hotspot-card" onClick={(e) => e.stopPropagation()}>
          <div className="hotspot-card-header">
            <h4>{activeHotspot.title}</h4>
            <button
              type="button"
              className="card-close"
              onClick={() => setActiveHotspot(null)}
              aria-label="Close details"
            >
              ✕
            </button>
          </div>
          <p>{activeHotspot.desc}</p>
          <div className="hotspot-card-footer">
            <span className="badge tone-amber">Bharathidasan Eng. College</span>
            {onExplore && (
              <button type="button" className="btn btn-sm btn-gold" onClick={() => onExplore(activeHotspot)}>
                Learn More →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}



// ==========================================
// 3D MODEL 2: 3D ROTATING BEC PHOTO PRISM
// ==========================================
function buildBecPhotoPrismModel(group, state) {
  const textures = state.textures || {};

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xf4c20d,
    roughness: 0.25,
    metalness: 0.85,
  });
  const navyMat = new THREE.MeshStandardMaterial({
    color: 0x0f2158,
    roughness: 0.4,
    metalness: 0.5,
  });

  // Base plinth
  const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 0.3, 32), navyMat);
  baseMesh.position.y = -0.15;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  const baseRim = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.06, 8, 32), goldMat);
  baseRim.rotateX(Math.PI / 2);
  group.add(baseRim);

  // Rotating Central Prism Group
  const prismGroup = new THREE.Group();
  prismGroup.position.set(0, 1.8, 0);

  const sideW = 3.6;
  const sideH = 3.2;
  const radius = sideW / (2 * Math.tan(Math.PI / 3)); // ~1.04 distance from center

  const sides = [
    { tex: textures.campus, title: '25+ Acres Green Campus', angle: 0 },
    { tex: textures.banner, title: 'Hi-Tech Infrastructure', angle: (2 * Math.PI) / 3 },
    { tex: textures.mech, title: 'Advanced Engineering', angle: (4 * Math.PI) / 3 },
  ];

  sides.forEach((item) => {
    if (!item.tex) return;
    const sideG = new THREE.Group();
    sideG.rotation.y = item.angle;

    // Outer gold frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(sideW + 0.2, sideH + 0.25, 0.08), goldMat);
    frame.position.set(0, 0, radius);
    sideG.add(frame);

    // Photo Plane
    const photo = new THREE.Mesh(
      new THREE.PlaneGeometry(sideW, sideH),
      new THREE.MeshStandardMaterial({ map: item.tex, roughness: 0.25 })
    );
    photo.position.set(0, 0, radius + 0.05);
    sideG.add(photo);

    prismGroup.add(sideG);
  });

  // Top triangular cap with BEC Logo
  const capMesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.2, radius * 1.2, 0.18, 3), goldMat);
  capMesh.position.y = sideH / 2 + 0.12;
  prismGroup.add(capMesh);

  // Center rotating BEC crest token on top
  if (textures.becLogo) {
    const token = new THREE.Mesh(
      new THREE.CircleGeometry(0.7, 32),
      new THREE.MeshStandardMaterial({
        map: textures.becLogo,
        transparent: true,
        roughness: 0.2,
        side: THREE.DoubleSide,
      })
    );
    token.position.y = sideH / 2 + 0.95;
    prismGroup.add(token);

    const tokenRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.04, 8, 32), goldMat);
    tokenRing.position.y = sideH / 2 + 0.95;
    prismGroup.add(tokenRing);
  }

  group.add(prismGroup);
  state.prismGroup = prismGroup;
}



// ==========================================
// 3D MODEL 3: GRADUATION & DEGREE HONOURS
// ==========================================
function buildGraduationCapModel(group, state) {
  const textures = state.textures || {};

  const capBlackMat = new THREE.MeshStandardMaterial({
    color: 0x111625,
    roughness: 0.35,
    metalness: 0.15,
  });
  const goldSilkMat = new THREE.MeshStandardMaterial({
    color: 0xf4c20d,
    roughness: 0.3,
    metalness: 0.8,
  });
  const parchmentMat = new THREE.MeshStandardMaterial({
    color: 0xfbf6e9,
    roughness: 0.8,
  });
  const waxSealMat = new THREE.MeshStandardMaterial({
    color: 0xb71c1c,
    roughness: 0.3,
    metalness: 0.4,
  });

  // Mortarboard Cap Board
  const boardGeom = new THREE.BoxGeometry(4.2, 0.12, 4.2);
  const board = new THREE.Mesh(boardGeom, capBlackMat);
  board.position.set(0, 1.8, 0);
  board.rotation.y = Math.PI / 4;
  board.castShadow = true;
  group.add(board);

  // Skull cap below board
  const skullGeom = new THREE.CylinderGeometry(1.6, 1.4, 0.9, 32);
  const skull = new THREE.Mesh(skullGeom, capBlackMat);
  skull.position.set(0, 1.3, 0);
  skull.castShadow = true;
  group.add(skull);

  // Central Gold Button
  const buttonGeom = new THREE.CylinderGeometry(0.2, 0.22, 0.12, 24);
  const button = new THREE.Mesh(buttonGeom, goldSilkMat);
  button.position.set(0, 1.9, 0);
  group.add(button);

  // Gold Tassel String & Swaying Tail
  const tasselGroup = new THREE.Group();
  tasselGroup.position.set(0, 1.92, 0);

  const stringGeom = new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8);
  stringGeom.rotateZ(Math.PI / 2.6);
  const stringMesh = new THREE.Mesh(stringGeom, goldSilkMat);
  stringMesh.position.set(1.0, -0.15, 0.9);
  tasselGroup.add(stringMesh);

  const brushGeom = new THREE.ConeGeometry(0.2, 0.9, 16);
  const brush = new THREE.Mesh(brushGeom, goldSilkMat);
  brush.position.set(2.0, -0.9, 1.8);
  brush.rotation.x = Math.PI;
  tasselGroup.add(brush);

  group.add(tasselGroup);
  state.tasselMesh = tasselGroup;

  // Rolled Diploma Parchment Scroll
  const scrollGroup = new THREE.Group();
  scrollGroup.position.set(0, -0.6, 0.4);
  scrollGroup.rotation.z = 0.2;
  scrollGroup.rotation.y = -0.4;

  const scrollGeom = new THREE.CylinderGeometry(0.42, 0.42, 4.2, 32);
  scrollGeom.rotateZ(Math.PI / 2);
  const scrollMesh = new THREE.Mesh(scrollGeom, parchmentMat);
  scrollMesh.castShadow = true;
  scrollGroup.add(scrollMesh);

  // Red Ribbon Wrap
  const ribbonGeom = new THREE.CylinderGeometry(0.45, 0.45, 0.6, 32);
  ribbonGeom.rotateZ(Math.PI / 2);
  const ribbonMesh = new THREE.Mesh(ribbonGeom, waxSealMat);
  scrollGroup.add(ribbonMesh);

  // Wax Seal with BEC Logo
  const sealGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 24);
  sealGeom.rotateX(Math.PI / 2);
  let sealMat = waxSealMat;
  if (textures.becLogo) {
    sealMat = new THREE.MeshStandardMaterial({
      map: textures.becLogo,
      roughness: 0.3,
      metalness: 0.3,
    });
  }
  const seal = new THREE.Mesh(sealGeom, sealMat);
  seal.position.set(0, 0.35, 0.4);
  scrollGroup.add(seal);

  group.add(scrollGroup);

  // Orbiting Gold Laurel Ring
  const haloGeom = new THREE.TorusGeometry(3.6, 0.08, 16, 64);
  haloGeom.rotateX(Math.PI / 3);
  const halo = new THREE.Mesh(haloGeom, goldSilkMat);
  halo.position.y = 1.2;
  group.add(halo);

  // Orbiting Golden Stars
  const starCount = 30;
  const starGeom = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const angle = (i / starCount) * Math.PI * 2;
    const rad = 3.6 + (Math.random() - 0.5) * 1.5;
    starPos[i * 3] = Math.cos(angle) * rad;
    starPos[i * 3 + 1] = 1.2 + (Math.random() - 0.5) * 1.8;
    starPos[i * 3 + 2] = Math.sin(angle) * rad;
  }
  starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffd700,
    size: 0.22,
    transparent: true,
    opacity: 0.85,
  });
  const starPoints = new THREE.Points(starGeom, starMat);
  group.add(starPoints);
  state.particles = starPoints;
}

// ==========================================
// 3D MODEL 4: TECH & INNOVATION CORE
// ==========================================
function buildTechCoreModel(group, state) {
  const textures = state.textures || {};

  const neonBlueMat = new THREE.MeshStandardMaterial({
    color: 0x00d2ff,
    emissive: 0x0077b6,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.9,
  });
  const goldMetallicMat = new THREE.MeshStandardMaterial({
    color: 0xf4c20d,
    roughness: 0.2,
    metalness: 0.95,
  });
  const wireMat = new THREE.MeshStandardMaterial({
    color: 0x48cae4,
    wireframe: true,
    roughness: 0.1,
  });

  // Central Core
  const innerSphere = new THREE.Mesh(new THREE.SphereGeometry(1.2, 32, 32), neonBlueMat);
  group.add(innerSphere);

  const outerIcosa = new THREE.Mesh(new THREE.IcosahedronGeometry(1.7, 1), wireMat);
  group.add(outerIcosa);

  // Center BEC floating circular emblem
  if (textures.becLogo) {
    const tokenGeom = new THREE.CircleGeometry(0.75, 32);
    const tokenMat = new THREE.MeshStandardMaterial({
      map: textures.becLogo,
      transparent: true,
      emissive: 0x0077b6,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    });
    const tokenMesh = new THREE.Mesh(tokenGeom, tokenMat);
    group.add(tokenMesh);
  }

  // Gimbal / Gyroscope Rotating Rings
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.08, 16, 64), goldMetallicMat);
  ring1.rotation.x = Math.PI / 4;
  group.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.08, 16, 64), neonBlueMat);
  ring2.rotation.y = Math.PI / 3;
  group.add(ring2);

  const ring3 = new THREE.Mesh(new THREE.TorusGeometry(3.7, 0.08, 16, 64), goldMetallicMat);
  ring3.rotation.z = Math.PI / 6;
  group.add(ring3);

  state.gimbalRings = [ring1, ring2, ring3];

  // Orbiting Discipline Nodes
  const disciplines = ['CSE', 'AI & DS', 'ECE', 'MECH', 'CIVIL'];
  disciplines.forEach((disp, idx) => {
    const nodeGroup = new THREE.Group();
    const nodeSphere = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), goldMetallicMat);
    nodeGroup.add(nodeSphere);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 8, 24), neonBlueMat);
    halo.rotation.x = Math.PI / 2;
    nodeGroup.add(halo);

    group.add(nodeGroup);
    state.orbitNodes.push(nodeGroup);
  });
}

// Safe cleanup utility
function disposeHierarchy(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
}
