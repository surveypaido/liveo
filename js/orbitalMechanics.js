// ============================================================================
// Real orbital mechanics using J2000 osculating Keplerian elements
// Source basis: Standish/JPL "Keplerian Elements for Approximate Positions
// of the Major Planets" — accurate to a small fraction of a degree for
// dates roughly between 1800 CE and 2050 CE, and reasonable (visually and
// physically correct in overall behavior) for several millennia further
// out in either direction. Degrades gradually outside that range.
// ============================================================================

export const ELEMENTS = {
  mercury: { a: [0.38709927, 0.00000037], e: [0.20563593, 0.00001906], I: [7.00497902, -0.00594749], L: [252.25032350, 149472.67411175], peri: [77.45779628, 0.16047689], node: [48.33076593, -0.12534081] },
  venus:   { a: [0.72333566, 0.00000390], e: [0.00677672, -0.00004107], I: [3.39467605, -0.00078890], L: [181.97909950, 58517.81538729], peri: [131.60246718, 0.00268329], node: [76.67984255, -0.27769418] },
  earth:   { a: [1.00000261, 0.00000562], e: [0.01671123, -0.00004392], I: [-0.00001531, -0.01294668], L: [100.46457166, 35999.37244981], peri: [102.93768193, 0.32327364], node: [0.0, 0.0] },
  mars:    { a: [1.52371034, 0.00001847], e: [0.09339410, 0.00007882], I: [1.84969142, -0.00813131], L: [-4.55343205, 19140.30268499], peri: [-23.94362959, 0.44441088], node: [49.55953891, -0.29257343] },
  jupiter: { a: [5.20288700, -0.00011607], e: [0.04838624, -0.00013253], I: [1.30439695, -0.00183714], L: [34.39644051, 3034.74612775], peri: [14.72847983, 0.21252668], node: [100.47390909, 0.20469106] },
  saturn:  { a: [9.53667594, -0.00125060], e: [0.05386179, -0.00050991], I: [2.48599187, 0.00193609], L: [49.95424423, 1222.49362201], peri: [92.59887831, -0.41897216], node: [113.66242448, -0.28867794] },
  uranus:  { a: [19.18916464, -0.00196176], e: [0.04725744, -0.00004397], I: [0.77263783, -0.00242939], L: [313.23810451, 428.48202785], peri: [170.95427630, 0.40805281], node: [74.01692503, 0.04240589] },
  neptune: { a: [30.06992276, 0.00026291], e: [0.00859048, 0.00005105], I: [1.77004347, 0.00035372], L: [-55.12002969, 218.45945325], peri: [44.96476227, -0.32241464], node: [131.78422574, -0.00508664] },
};

export const PLANET_ORDER = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

function deg2rad(d) { return d * Math.PI / 180; }

function norm180(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

// Julian Day from a JS Date (UTC). Works correctly for negative years (BCE)
// because JS Date internally tracks a signed millisecond timestamp.
export function toJulianDay(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

// Solves Kepler's equation M = E - e*sin(E) for the eccentric anomaly E,
// using the standard iterative scheme from the JPL approximate-positions memo.
function solveKepler(Mdeg, e) {
  const eStar = e * 180 / Math.PI;
  let En = Mdeg + eStar * Math.sin(deg2rad(Mdeg));
  for (let i = 0; i < 12; i++) {
    const dM = Mdeg - (En - eStar * Math.sin(deg2rad(En)));
    const dE = dM / (1 - e * Math.cos(deg2rad(En)));
    En += dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return En; // degrees
}

// Returns heliocentric ecliptic position in AU for a planet at a given Date.
export function heliocentricPosition(planetKey, date) {
  const el = ELEMENTS[planetKey];
  const jd = toJulianDay(date);
  const T = (jd - 2451545.0) / 36525;

  const a = el.a[0] + el.a[1] * T;
  const e = el.e[0] + el.e[1] * T;
  const I = el.I[0] + el.I[1] * T;
  const L = el.L[0] + el.L[1] * T;
  const peri = el.peri[0] + el.peri[1] * T;
  const node = el.node[0] + el.node[1] * T;

  const w = peri - node;
  const M = norm180(L - peri);
  const Edeg = solveKepler(M, e);
  const E = deg2rad(Edeg);

  const xOrb = a * (Math.cos(E) - e);
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const wr = deg2rad(w), Ir = deg2rad(I), nr = deg2rad(node);
  const cosW = Math.cos(wr), sinW = Math.sin(wr);
  const cosI = Math.cos(Ir), sinI = Math.sin(Ir);
  const cosN = Math.cos(nr), sinN = Math.sin(nr);

  const x = (cosN * cosW - sinN * sinW * cosI) * xOrb + (-cosN * sinW - sinN * cosW * cosI) * yOrb;
  const y = (sinN * cosW + cosN * sinW * cosI) * xOrb + (-sinN * sinW + cosN * cosW * cosI) * yOrb;
  const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;

  return { x, y, z, r: Math.sqrt(x * x + y * y + z * z), a, e };
}

// Samples a full orbit ellipse (using the CURRENT osculating elements, i.e.
// treating them as fixed for the purposes of drawing the path) into points
// for rendering an orbit ring. Precession over a human timescale is tiny
// compared to the ellipse itself, so this is a faithful visual guide.
export function sampleOrbitPath(planetKey, date, segments = 256) {
  const el = ELEMENTS[planetKey];
  const jd = toJulianDay(date);
  const T = (jd - 2451545.0) / 36525;
  const a = el.a[0] + el.a[1] * T;
  const e = el.e[0] + el.e[1] * T;
  const I = deg2rad(el.I[0] + el.I[1] * T);
  const peri = el.peri[0] + el.peri[1] * T;
  const node = el.node[0] + el.node[1] * T;
  const w = deg2rad(peri - node);
  const nr = deg2rad(node);

  const cosW = Math.cos(w), sinW = Math.sin(w);
  const cosI = Math.cos(I), sinI = Math.sin(I);
  const cosN = Math.cos(nr), sinN = Math.sin(nr);

  const points = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2; // true anomaly
    const r = a * (1 - e * e) / (1 + e * Math.cos(theta));
    const xOrb = r * Math.cos(theta);
    const yOrb = r * Math.sin(theta);
    const x = (cosN * cosW - sinN * sinW * cosI) * xOrb + (-cosN * sinW - sinN * cosW * cosI) * yOrb;
    const y = (sinN * cosW + cosN * sinW * cosI) * xOrb + (-sinN * sinW + cosN * cosW * cosI) * yOrb;
    const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;
    points.push({ x, y, z });
  }
  return points;
}

// --- Moon (simplified low-precision lunar longitude, Meeus-style, mean terms only) ---
// Gives a realistic current phase/position without the full perturbation series.
export function moonPositionRelativeToEarth(date) {
  const jd = toJulianDay(date);
  const T = (jd - 2451545.0) / 36525;
  const Lp = norm180(218.3164477 + 481267.88123421 * T); // mean longitude
  const D = norm180(297.8501921 + 445267.1114034 * T);   // mean elongation from sun
  const M = norm180(357.5291092 + 35999.0502909 * T);    // sun mean anomaly
  const Mp = norm180(134.9633964 + 477198.8675055 * T);  // moon mean anomaly
  const F = norm180(93.2720950 + 483202.0175233 * T);    // argument of latitude

  // A handful of the largest perturbation terms (good enough for a visual):
  let lon = Lp
    + 6.288774 * Math.sin(deg2rad(Mp))
    + 1.274027 * Math.sin(deg2rad(2 * D - Mp))
    + 0.658314 * Math.sin(deg2rad(2 * D))
    + 0.213618 * Math.sin(deg2rad(2 * Mp))
    - 0.185116 * Math.sin(deg2rad(M));
  let lat = 5.128122 * Math.sin(deg2rad(F))
    + 0.280602 * Math.sin(deg2rad(Mp + F))
    + 0.277693 * Math.sin(deg2rad(Mp - F));
  const distKm = 385000.56 - 20905.355 * Math.cos(deg2rad(Mp));

  const lonR = deg2rad(lon), latR = deg2rad(lat);
  const distAU = distKm / 149597870.7;
  const x = distAU * Math.cos(latR) * Math.cos(lonR);
  const y = distAU * Math.cos(latR) * Math.sin(lonR);
  const z = distAU * Math.sin(latR);
  return { x, y, z, distKm };
}

// --- Jupiter's Galilean moons (approximate circular orbits, real periods/distances) ---
export const GALILEAN_MOONS = [
  { name: 'Io', distKm: 421700, periodDays: 1.769137786, phase0: 84.0 },
  { name: 'Europa', distKm: 671034, periodDays: 3.551181, phase0: 265.0 },
  { name: 'Ganymede', distKm: 1070412, periodDays: 7.15455296, phase0: 5.0 },
  { name: 'Callisto', distKm: 1882709, periodDays: 16.6890184, phase0: 309.0 },
];

export function galileanMoonPosition(moon, date) {
  const jd = toJulianDay(date);
  const angle = deg2rad(moon.phase0 + 360 * (jd / moon.periodDays));
  const distAU = moon.distKm / 149597870.7;
  return { x: distAU * Math.cos(angle), y: distAU * Math.sin(angle), z: 0 };
}
