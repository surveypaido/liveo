import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  PLANET_ORDER,
  heliocentricPosition,
  sampleOrbitPath,
  moonPositionRelativeToEarth,
  GALILEAN_MOONS,
  galileanMoonPosition,
} from './orbitalMechanics.js';
import { PLANET_DATA, SUN_DATA } from './planetData.js';
import { makePlanetTexture, makeGlowTexture, makeRingTexture, makeStarSpriteTexture } from './textures.js';

// ---------------------------------------------------------------------------
// Constants & scale model
// ---------------------------------------------------------------------------
const UNITS_PER_AU = 40;
const EARTH_RADIUS_KM = 6371;
const AU_KM = 149597870.7;
const TRUE_SCALE_BOOST = 30; // uniform boost so true-scale bodies stay visible/clickable

function visualRadiusUnits(radiusKm) {
  const ratio = radiusKm / EARTH_RADIUS_KM;
  return Math.min(0.7 + Math.sqrt(ratio) * 0.9, 3.2);
}
function trueRadiusUnits(radiusKm) {
  return (radiusKm / AU_KM) * UNITS_PER_AU * TRUE_SCALE_BOOST;
}
const SUN_VISUAL_RADIUS = 4.6;
function sunRadiusUnits(mode) {
  return mode === 'true' ? (SUN_DATA.radiusKm / AU_KM) * UNITS_PER_AU * TRUE_SCALE_BOOST : SUN_VISUAL_RADIUS;
}

const SPEED_STEPS = [
  { label: 'Real time', daysPerSecond: 1 / 86400 },
  { label: '1 hour / sec', daysPerSecond: 1 / 24 },
  { label: '1 day / sec', daysPerSecond: 1 },
  { label: '1 month / sec', daysPerSecond: 30 },
  { label: '1 year / sec', daysPerSecond: 365.25 },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let currentDate = new Date();
let playing = true;
let speedIndex = 1; // default: 1 day/sec, since true real-time is too slow to see anything
let scaleMode = 'visual';
let focusedPlanet = null;
let lastFrameTime = performance.now();

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020306);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 20000);
camera.position.set(0, 90, 170);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2;
controls.maxDistance = 6000;
controls.target.set(0, 0, 0);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Starfield
// ---------------------------------------------------------------------------
function buildStarfield() {
  const starCount = 6000;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const radius = 2000 + Math.random() * 3000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 2.2,
    map: makeStarSpriteTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.85,
  });
  scene.add(new THREE.Points(geo, mat));
}
buildStarfield();

// ---------------------------------------------------------------------------
// Sun
// ---------------------------------------------------------------------------
const sunGeometry = new THREE.SphereGeometry(1, 48, 48);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffe9b0 });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.scale.setScalar(sunRadiusUnits(scaleMode));
sunMesh.userData.isSun = true;
scene.add(sunMesh);

const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: makeGlowTexture('255,220,150'),
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
}));
glowSprite.scale.setScalar(sunRadiusUnits(scaleMode) * 7);
scene.add(glowSprite);

const sunLight = new THREE.PointLight(0xffffff, 3.2, 0, 0.15);
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x2a2f45, 0.55));

// ---------------------------------------------------------------------------
// Label sprites
// ---------------------------------------------------------------------------
function makeLabelSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.font = 'italic 600 34px "Cormorant Garamond", serif';
  ctx.fillStyle = 'rgba(236,230,214,0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 6;
  ctx.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(9, 2.25, 1);
  return sprite;
}

// ---------------------------------------------------------------------------
// Planets
// ---------------------------------------------------------------------------
const planetGroup = new THREE.Group();
scene.add(planetGroup);
const orbitGroup = new THREE.Group();
scene.add(orbitGroup);

const planets = {}; // key -> { mesh, pivot(for rings), data, label, ringMesh? }
const clickableMeshes = [];

function buildOrbitRing(key, color) {
  const points = sampleOrbitPath(key, currentDate, 256).map(
    p => new THREE.Vector3(p.x * UNITS_PER_AU, p.z * UNITS_PER_AU, p.y * UNITS_PER_AU)
  );
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28 });
  const line = new THREE.LineLoop(geo, mat);
  orbitGroup.add(line);
}

PLANET_ORDER.forEach((key) => {
  const data = PLANET_DATA[key];
  const isBanded = key === 'jupiter' || key === 'saturn' || key === 'uranus' || key === 'neptune';
  const texture = makePlanetTexture(data.baseColor, data.accentColor, isBanded, PLANET_ORDER.indexOf(key) + 1);

  const geo = new THREE.SphereGeometry(1, 40, 40);
  const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.planetKey = key;
  mesh.rotation.z = THREE.MathUtils.degToRad(data.axialTiltDeg);
  planetGroup.add(mesh);
  clickableMeshes.push(mesh);

  const label = makeLabelSprite(data.label);
  planetGroup.add(label);

  let ringMesh = null;
  if (data.hasRings) {
    const ringGeo = new THREE.RingGeometry(1.5, 2.6, 64);
    // RingGeometry UVs need remapping for a radial gradient texture to read correctly
    const uv = ringGeo.attributes.uv;
    const posAttr = ringGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i), y = posAttr.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const t = (dist - 1.5) / (2.6 - 1.5);
      uv.setXY(i, t, 0.5);
    }
    const ringTex = makeRingTexture(data.accentColor);
    const ringMat = new THREE.MeshBasicMaterial({
      map: ringTex, transparent: true, side: THREE.DoubleSide, opacity: 0.85, depthWrite: false,
    });
    ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    planetGroup.add(ringMesh);
  }

  buildOrbitRing(key, data.baseColor);

  const rotationPeriodDays = Math.abs(data.rotationHours) / 24;
  const rotDirection = data.rotationHours < 0 ? -1 : 1;
  const radiansPerDay = (2 * Math.PI / rotationPeriodDays) * rotDirection;

  planets[key] = { mesh, label, ringMesh, data, radiansPerDay };
});

// Earth's Moon
const moonTexture = makePlanetTexture(0xb9b3a6, 0x8f887a, false, 99);
const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 24), new THREE.MeshStandardMaterial({ map: moonTexture, roughness: 1 }));
planetGroup.add(moonMesh);
clickableMeshes.push(moonMesh);
moonMesh.userData.planetKey = 'moon';
const moonLabel = makeLabelSprite('Moon');
moonLabel.scale.set(5, 1.25, 1);
planetGroup.add(moonLabel);

// Jupiter's Galilean moons
const galileanMeshes = GALILEAN_MOONS.map((m, i) => {
  const tex = makePlanetTexture(0xcbbfae, 0x8f8574, false, 200 + i);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshStandardMaterial({ map: tex, roughness: 1 }));
  mesh.scale.setScalar(0.18);
  planetGroup.add(mesh);
  return mesh;
});

// ---------------------------------------------------------------------------
// Raycasting: hover + click
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const hoverLabelEl = document.createElement('div');
hoverLabelEl.id = 'hoverLabel';
document.body.appendChild(hoverLabelEl);

function setPointerFromEvent(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
}

renderer.domElement.addEventListener('pointermove', (e) => {
  setPointerFromEvent(e);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(clickableMeshes.concat(sunMesh));
  if (hits.length > 0) {
    renderer.domElement.style.cursor = 'pointer';
    const key = hits[0].object.userData.planetKey || (hits[0].object.userData.isSun ? 'sun' : null);
    const label = key === 'sun' ? 'Sun' : key === 'moon' ? 'Moon' : PLANET_DATA[key]?.label;
    if (label) {
      hoverLabelEl.textContent = label;
      hoverLabelEl.style.display = 'block';
      hoverLabelEl.style.left = e.clientX + 'px';
      hoverLabelEl.style.top = e.clientY + 'px';
    }
  } else {
    renderer.domElement.style.cursor = 'default';
    hoverLabelEl.style.display = 'none';
  }
});

renderer.domElement.addEventListener('pointerleave', () => { hoverLabelEl.style.display = 'none'; });

renderer.domElement.addEventListener('click', (e) => {
  setPointerFromEvent(e);
  raycaster.setFromCamera(pointerNdc, camera);
  const hits = raycaster.intersectObjects(clickableMeshes.concat(sunMesh));
  if (hits.length > 0) {
    const obj = hits[0].object;
    const key = obj.userData.planetKey || (obj.userData.isSun ? 'sun' : null);
    if (key) {
      focusedPlanet = key === 'moon' ? null : key; // camera-follow only for planets/sun
      showInfoPanel(key);
    }
  }
});

document.getElementById('resetView').addEventListener('click', () => {
  focusedPlanet = null;
  controls.target.set(0, 0, 0);
});

// ---------------------------------------------------------------------------
// Info panel
// ---------------------------------------------------------------------------
const infoPanel = document.getElementById('infoPanel');
const panelName = document.getElementById('panelName');
const panelStats = document.getElementById('panelStats');
const panelFacts = document.getElementById('panelFacts');

function showInfoPanel(key) {
  infoPanel.hidden = false;
  document.getElementById('aboutPanel').hidden = true;

  if (key === 'sun') {
    panelName.textContent = 'The Sun';
    panelStats.innerHTML = `<dt>Radius</dt><dd>${SUN_DATA.radiusKm.toLocaleString()} km</dd>`;
    panelFacts.innerHTML = SUN_DATA.facts.map(f => `<li>${f}</li>`).join('');
    return;
  }
  if (key === 'moon') {
    const pos = moonPositionRelativeToEarth(currentDate);
    panelName.textContent = 'The Moon';
    panelStats.innerHTML = `
      <dt>Distance from Earth</dt><dd>${Math.round(pos.distKm).toLocaleString()} km</dd>
      <dt>Orbital period</dt><dd>~27.3 days</dd>`;
    panelFacts.innerHTML = '<li>The same face always points toward Earth, a result of tidal locking.</li>';
    return;
  }

  const data = PLANET_DATA[key];
  const pos = heliocentricPosition(key, currentDate);
  const earthPos = heliocentricPosition('earth', currentDate);
  const dx = pos.x - earthPos.x, dy = pos.y - earthPos.y, dz = pos.z - earthPos.z;
  const distFromEarthAU = Math.sqrt(dx * dx + dy * dy + dz * dz);

  panelName.textContent = data.label;
  panelStats.innerHTML = `
    <dt>Distance from Sun</dt><dd>${pos.r.toFixed(3)} AU</dd>
    <dt>Distance from Earth</dt><dd>${distFromEarthAU.toFixed(3)} AU</dd>
    <dt>Orbital period</dt><dd>${data.orbitalPeriodDays.toLocaleString()} days</dd>
    <dt>Day length</dt><dd>${Math.abs(data.rotationHours).toFixed(1)} hrs</dd>
    <dt>Axial tilt</dt><dd>${data.axialTiltDeg}°</dd>
    <dt>Moons</dt><dd>${data.moons}</dd>
  `;
  panelFacts.innerHTML = data.facts.map(f => `<li>${f}</li>`).join('');
}

document.getElementById('closePanel').addEventListener('click', () => { infoPanel.hidden = true; });
document.getElementById('infoToggle').addEventListener('click', () => {
  const about = document.getElementById('aboutPanel');
  about.hidden = !about.hidden;
  infoPanel.hidden = true;
});
document.getElementById('closeAbout').addEventListener('click', () => { document.getElementById('aboutPanel').hidden = true; });

// ---------------------------------------------------------------------------
// Time controls
// ---------------------------------------------------------------------------
const playPauseBtn = document.getElementById('playPause');
const iconPlay = document.getElementById('iconPlay');
const iconPause = document.getElementById('iconPause');
playPauseBtn.addEventListener('click', () => {
  playing = !playing;
  iconPlay.hidden = playing;
  iconPause.hidden = !playing;
});

const speedSlider = document.getElementById('speed');
const speedLabel = document.getElementById('speedLabel');
speedSlider.addEventListener('input', () => {
  speedIndex = parseInt(speedSlider.value, 10);
  speedLabel.textContent = SPEED_STEPS[speedIndex].label;
});
speedLabel.textContent = SPEED_STEPS[speedIndex].label;

document.getElementById('resetNow').addEventListener('click', () => {
  currentDate = new Date();
  syncDateInputsFromCurrentDate();
});

document.getElementById('scaleToggle').addEventListener('click', () => {
  scaleMode = scaleMode === 'visual' ? 'true' : 'visual';
  document.getElementById('scaleLabel').textContent = scaleMode === 'visual' ? 'Visual' : 'True';
  document.getElementById('scaleToggle').setAttribute('aria-pressed', scaleMode === 'true');
  applyScaleMode();
});

function applyScaleMode() {
  sunMesh.scale.setScalar(sunRadiusUnits(scaleMode));
  glowSprite.scale.setScalar(sunRadiusUnits(scaleMode) * 7);
  PLANET_ORDER.forEach((key) => {
    const data = PLANET_DATA[key];
    const r = scaleMode === 'visual' ? visualRadiusUnits(data.radiusKm) : trueRadiusUnits(data.radiusKm);
    planets[key].mesh.scale.setScalar(r);
    if (planets[key].ringMesh) planets[key].ringMesh.scale.setScalar(r);
  });
}
applyScaleMode();

// --- Date jump inputs ---
const yearInput = document.getElementById('year');
const eraSelect = document.getElementById('era');
const monthSelect = document.getElementById('month');
const dayInput = document.getElementById('day');

function setDateFromInputs() {
  let year = parseInt(yearInput.value, 10) || 2026;
  if (eraSelect.value === 'BCE') year = -(year - 1); // 1 BCE = astronomical year 0
  const month = parseInt(monthSelect.value, 10) - 1;
  const day = parseInt(dayInput.value, 10) || 1;
  const d = new Date(0);
  d.setUTCFullYear(year, month, day);
  d.setUTCHours(12, 0, 0, 0);
  currentDate = d;
}

document.getElementById('jumpDate').addEventListener('click', setDateFromInputs);

function syncDateInputsFromCurrentDate() {
  const y = currentDate.getUTCFullYear();
  if (y < 1) {
    eraSelect.value = 'BCE';
    yearInput.value = Math.abs(y) + 1;
  } else {
    eraSelect.value = 'CE';
    yearInput.value = y;
  }
  monthSelect.value = String(currentDate.getUTCMonth() + 1);
  dayInput.value = currentDate.getUTCDate();
}
syncDateInputsFromCurrentDate();

// --- Presets ---
const presetSelect = document.getElementById('presetSelect');
presetSelect.addEventListener('change', () => {
  const val = presetSelect.value;
  const d = new Date(0);
  if (val === 'today') {
    currentDate = new Date();
  } else if (val === 'moon-landing') {
    d.setUTCFullYear(1969, 6, 20); d.setUTCHours(20, 17, 0, 0); currentDate = d;
  } else if (val === 'caesar') {
    d.setUTCFullYear(-43, 2, 15); d.setUTCHours(12, 0, 0, 0); currentDate = d; // 44 BCE = astro year -43
  } else if (val === 'gaugamela') {
    d.setUTCFullYear(-330, 9, 1); d.setUTCHours(12, 0, 0, 0); currentDate = d; // 331 BCE = astro year -330
  }
  if (val) {
    syncDateInputsFromCurrentDate();
    presetSelect.value = '';
  }
});

// ---------------------------------------------------------------------------
// UI: live date readout + accuracy disclaimer
// ---------------------------------------------------------------------------
const dateReadoutEl = document.getElementById('dateReadout');
const disclaimerEl = document.getElementById('disclaimer');
const liveLabelEl = document.getElementById('liveLabel');
const liveDotEl = document.getElementById('liveDot');

function formatDateReadout(date) {
  const y = date.getUTCFullYear();
  const displayYear = y < 1 ? `${Math.abs(y) + 1} BCE` : `${y} CE`;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getUTCMonth()]} ${date.getUTCDate()}, ${displayYear} · ${String(date.getUTCHours()).padStart(2,'0')}:${String(date.getUTCMinutes()).padStart(2,'0')} UTC`;
}

function updateLiveUI() {
  dateReadoutEl.textContent = formatDateReadout(currentDate);
  const y = currentDate.getUTCFullYear();
  disclaimerEl.hidden = !(y < 1000 || y > 3000);
  const isRealNow = playing && speedIndex === 0;
  liveLabelEl.textContent = isRealNow ? 'LIVE' : 'TIME TRAVEL';
  liveDotEl.style.background = isRealNow ? '#e0623f' : '#5fa8a0';
  liveDotEl.style.boxShadow = isRealNow ? '0 0 8px #e0623f' : '0 0 8px #5fa8a0';
}

// ---------------------------------------------------------------------------
// Animation loop
// ---------------------------------------------------------------------------
function updatePositions() {
  PLANET_ORDER.forEach((key) => {
    const pos = heliocentricPosition(key, currentDate);
    const p = planets[key];
    // Map heliocentric ecliptic (x,y,z) -> three.js (x, z-up-ish 'y', y)
    const wx = pos.x * UNITS_PER_AU;
    const wy = pos.z * UNITS_PER_AU;
    const wz = pos.y * UNITS_PER_AU;
    p.mesh.position.set(wx, wy, wz);
    if (p.ringMesh) p.ringMesh.position.set(wx, wy, wz);
    p.label.position.set(wx, wy + (p.mesh.scale.x + 1.6), wz);
  });

  // Moon: keep true relative direction/phase (real astronomy), but choose the
  // display distance per scale mode so it never renders inside Earth.
  // - Visual mode: fixed multiple of Earth's (exaggerated) visual radius, for legibility.
  // - True mode: real distance scaled the same way planet radii are boosted, which
  //   preserves the real ~60-Earth-radii ratio faithfully.
  const earth = planets['earth'];
  const moonRel = moonPositionRelativeToEarth(currentDate);
  const moonDistAU = moonRel.distKm / AU_KM;
  const moonDir = { x: moonRel.x / moonDistAU, y: moonRel.y / moonDistAU, z: moonRel.z / moonDistAU };
  const moonDistUnits = scaleMode === 'visual'
    ? earth.mesh.scale.x * 2.6
    : trueRadiusUnits(moonRel.distKm);
  moonMesh.position.set(
    earth.mesh.position.x + moonDir.x * moonDistUnits,
    earth.mesh.position.y + moonDir.z * moonDistUnits,
    earth.mesh.position.z + moonDir.y * moonDistUnits
  );
  moonMesh.scale.setScalar(scaleMode === 'visual' ? 0.35 : trueRadiusUnits(1737.4));
  moonLabel.position.set(moonMesh.position.x, moonMesh.position.y + moonMesh.scale.x + 0.5, moonMesh.position.z);

  // Galilean moons: same principle, spaced by a fixed multiple of Jupiter's
  // visual radius in visual mode, or the real (boosted) distance in true mode —
  // both preserve Io < Europa < Ganymede < Callisto ordering and true angular motion.
  const jupiter = planets['jupiter'];
  const visualMultipliers = [1.9, 2.4, 3.1, 4.3];
  GALILEAN_MOONS.forEach((m, i) => {
    const rel = galileanMoonPosition(m, currentDate);
    const relDistAU = m.distKm / AU_KM;
    const dirX = rel.x / relDistAU, dirY = rel.y / relDistAU;
    const distUnits = scaleMode === 'visual'
      ? jupiter.mesh.scale.x * visualMultipliers[i]
      : trueRadiusUnits(m.distKm);
    galileanMeshes[i].position.set(
      jupiter.mesh.position.x + dirX * distUnits,
      jupiter.mesh.position.y,
      jupiter.mesh.position.z + dirY * distUnits
    );
  });
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const dt = Math.min((now - lastFrameTime) / 1000, 0.25); // seconds, clamped for tab-switch safety
  lastFrameTime = now;

  let simDaysThisFrame = 0;
  if (playing) {
    const daysPerSecond = SPEED_STEPS[speedIndex].daysPerSecond;
    simDaysThisFrame = daysPerSecond * dt;
    currentDate = new Date(currentDate.getTime() + simDaysThisFrame * 86400000);
  }

  updatePositions();

  // Axial spin, applied around each planet's local (tilted) Y axis
  PLANET_ORDER.forEach((key) => {
    const p = planets[key];
    p.mesh.rotation.y += p.radiansPerDay * simDaysThisFrame;
  });

  if (focusedPlanet) {
    const target = focusedPlanet === 'sun' ? sunMesh.position : planets[focusedPlanet].mesh.position;
    controls.target.lerp(target, 0.08);
  }

  controls.update();
  updateLiveUI();
  renderer.render(scene, camera);
}

lastFrameTime = performance.now();
animate();
