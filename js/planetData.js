// Static reference data. Distances/positions are computed live elsewhere;
// this is only the descriptive and physical-size data that doesn't change
// moment to moment.
export const PLANET_DATA = {
  mercury: {
    label: 'Mercury',
    radiusKm: 2439.7,
    rotationHours: 1407.6,
    orbitalPeriodDays: 87.969,
    axialTiltDeg: 0.03,
    moons: 0,
    baseColor: 0x9c8f7c,
    accentColor: 0x6b5f52,
    facts: [
      'The smallest and innermost planet, with almost no atmosphere to hold in heat.',
      'A day on Mercury (sunrise to sunrise) lasts about 176 Earth days, even though it spins fast.',
    ],
  },
  venus: {
    label: 'Venus',
    radiusKm: 6051.8,
    rotationHours: -5832.5, // retrograde rotation
    orbitalPeriodDays: 224.701,
    axialTiltDeg: 177.4,
    moons: 0,
    baseColor: 0xd9b98a,
    accentColor: 0xc79a5e,
    facts: [
      'Rotates backwards compared to most planets, and its day is longer than its year.',
      'Thick carbon dioxide clouds trap heat, making it the hottest planet despite not being closest to the Sun.',
    ],
  },
  earth: {
    label: 'Earth',
    radiusKm: 6371.0,
    rotationHours: 23.934,
    orbitalPeriodDays: 365.256,
    axialTiltDeg: 23.44,
    moons: 1,
    baseColor: 0x2f6fb0,
    accentColor: 0x3f8f4f,
    facts: [
      'The only known planet with liquid water oceans covering most of its surface.',
      'Its axial tilt is what gives us seasons as it travels around the Sun.',
    ],
  },
  mars: {
    label: 'Mars',
    radiusKm: 3389.5,
    rotationHours: 24.623,
    orbitalPeriodDays: 686.980,
    axialTiltDeg: 25.19,
    moons: 2,
    baseColor: 0xb1543a,
    accentColor: 0x8a3d29,
    facts: [
      'Home to Olympus Mons, the largest known volcano in the solar system.',
      'Iron oxide (rust) covering its surface gives Mars its reddish color.',
    ],
  },
  jupiter: {
    label: 'Jupiter',
    radiusKm: 69911,
    rotationHours: 9.925,
    orbitalPeriodDays: 4332.59,
    axialTiltDeg: 3.13,
    moons: 95,
    baseColor: 0xc9a97a,
    accentColor: 0xa9835a,
    facts: [
      'The largest planet — its Great Red Spot is a storm bigger than Earth that has raged for centuries.',
      'Jupiter has more mass than all other planets in the solar system combined.',
    ],
  },
  saturn: {
    label: 'Saturn',
    radiusKm: 58232,
    rotationHours: 10.656,
    orbitalPeriodDays: 10759.22,
    axialTiltDeg: 26.73,
    moons: 146,
    baseColor: 0xe0c98f,
    accentColor: 0xc7ab6d,
    hasRings: true,
    facts: [
      'Its iconic rings are made almost entirely of water ice, with particles from dust-sized to house-sized.',
      'Saturn is so low-density it would float in water, if you could find a bathtub big enough.',
    ],
  },
  uranus: {
    label: 'Uranus',
    radiusKm: 25362,
    rotationHours: -17.24,
    orbitalPeriodDays: 30688.5,
    axialTiltDeg: 97.77,
    moons: 28,
    baseColor: 0x9fd6d6,
    accentColor: 0x7cb8b8,
    hasRings: true,
    facts: [
      'Rotates on its side, likely due to an ancient collision, so its poles take turns facing the Sun.',
      'Its pale blue-green color comes from methane in its atmosphere absorbing red light.',
    ],
  },
  neptune: {
    label: 'Neptune',
    radiusKm: 24622,
    rotationHours: 16.11,
    orbitalPeriodDays: 60182,
    axialTiltDeg: 28.32,
    moons: 16,
    baseColor: 0x3a5fcd,
    accentColor: 0x2c4aa3,
    facts: [
      'The windiest planet, with storms clocked at over 1,900 km/h (1,200 mph).',
      'It takes 165 Earth years to complete one orbit of the Sun.',
    ],
  },
};

export const SUN_DATA = {
  label: 'Sun',
  radiusKm: 696340,
  facts: [
    'Contains about 99.8% of all the mass in the solar system.',
    'Light from the Sun takes about 8 minutes and 20 seconds to reach Earth.',
  ],
};
