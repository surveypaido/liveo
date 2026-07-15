import * as THREE from 'three';

function hexToRgb(hex) {
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Simple value-noise generator (deterministic per seed) for planet mottling.
function makeNoise2D(seed) {
  let s = seed;
  function rand() {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  }
  const grid = [];
  const size = 32;
  for (let i = 0; i < size * size; i++) grid.push(rand());
  return function (x, y) {
    const xi = Math.floor(x * size) % size;
    const yi = Math.floor(y * size) % size;
    return grid[(yi * size + xi + size * size) % (size * size)];
  };
}

// Builds a mottled/banded sphere texture for a planet using its base/accent color.
export function makePlanetTexture(baseColor, accentColor, banded = false, seed = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const base = hexToRgb(baseColor);
  const accent = hexToRgb(accentColor);
  const noise = makeNoise2D(seed * 97 + 13);

  const img = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width;
      const v = y / canvas.height;
      let t = noise(u * 4, v * 4) * 0.5 + noise(u * 9, v * 9) * 0.3 + noise(u * 17, v * 17) * 0.2;
      if (banded) {
        t = t * 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(v * Math.PI * 10 + noise(u * 3, v) * 2));
      }
      t = Math.min(1, Math.max(0, t));
      const idx = (y * canvas.width + x) * 4;
      img.data[idx] = lerp(base.r, accent.r, t);
      img.data[idx + 1] = lerp(base.g, accent.g, t);
      img.data[idx + 2] = lerp(base.b, accent.b, t);
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

// Soft radial glow sprite texture, used for the Sun's halo and star bloom.
export function makeGlowTexture(color = '255,220,150') {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, `rgba(${color},0.9)`);
  grad.addColorStop(0.3, `rgba(${color},0.45)`);
  grad.addColorStop(1, `rgba(${color},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

// Saturn/Uranus style ring texture: concentric bands of varying opacity.
export function makeRingTexture(baseColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const base = hexToRgb(baseColor);
  let s = 42;
  function rand() { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }
  for (let x = 0; x < canvas.width; x++) {
    const t = x / canvas.width;
    const edgeFade = Math.sin(t * Math.PI);
    const band = 0.5 + 0.5 * Math.sin(t * 60) * 0.4 + rand() * 0.3;
    const alpha = Math.max(0, Math.min(1, band * edgeFade * 1.1));
    ctx.fillStyle = `rgba(${base.r},${base.g},${base.b},${alpha})`;
    ctx.fillRect(x, 0, 1, canvas.height);
  }
  return new THREE.CanvasTexture(canvas);
}

// Star field as a point sprite (soft dot) used for all background stars.
export function makeStarSpriteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.7)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}
