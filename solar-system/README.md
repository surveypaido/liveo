# Live Solar System — Real-Time Orbital Visualizer

A fully static, 3D, real-time solar system you can open in any browser — no
install, no server, no API keys, no ongoing cost. It works by calculating real
planetary physics with math (the same family of equations astronomers use),
not by looping a canned animation.

## What's actually accurate here

- **Positions**: every planet's location is calculated live from real J2000
  Keplerian orbital elements (Standish/JPL). This is genuinely correct
  orbital mechanics — elliptical orbits, correct relative speeds, correct
  current positions — not placeholder circles.
- **Rotation**: each planet spins at its real relative day-length (including
  Venus and Uranus, which behave unusually in real life — Venus rotates
  backwards, and Uranus rotates on its side).
- **The Moon**: uses a simplified real lunar-position formula (the largest
  terms of the standard low-precision lunar theory), so its phase and
  position are realistically close to the truth, not just decorative.
- **Jupiter's four largest moons**: real orbital periods and real relative
  ordering/distance, with distances compressed for visibility (noted below).
- **Time travel**: you can jump to any date, including BCE dates, and every
  position recalculates for real.

## Where it's an approximation, on purpose

- **Distant dates**: the orbital math is highly accurate for roughly the
  last few centuries. Dates before 1000 CE or after 3000 CE will show a
  small "approximate long-range estimate" note — the physics is still real,
  it's just that small uncertainties compound further from the present.
  This is genuinely how orbital mechanics works, not a limitation of this
  particular site.
- **Visual scale mode**: planet sizes are enlarged relative to their real
  orbital distances so you can actually see them. Toggle to "True scale" to
  see real relative sizes — most planets shrink to barely visible dots
  against real distances, which is itself the point (space is mostly empty).
- **Moon distances**: the Moon and Jupiter's moons are placed at a fixed
  visual distance from their planet in "Visual" scale mode (their real
  distances are too small to see clearly at solar-system-wide zoom). In
  "True" scale mode, their real distance ratio to their planet is preserved
  faithfully.
- **Textures**: planet surfaces are procedurally generated (canvas-based
  color/noise), not real satellite imagery, so there are no licensing
  concerns and nothing to download.

## Running it locally

No build step, no npm install. Just serve the folder over HTTP (opening
`index.html` directly with `file://` will block the ES module imports in
most browsers, so use a tiny local server instead):

```bash
cd solar-system
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

(If you don't have Python, any static server works — e.g. `npx serve .`)

## Deploying it for free, permanently

**Option A — Netlify (drag and drop, easiest)**
1. Go to https://app.netlify.com and sign up free.
2. Drag the whole `solar-system` folder onto the Netlify dashboard.
3. It gives you a live URL immediately (e.g. `yoursite.netlify.app`).
4. In Site settings → Domain management → Add custom domain, follow the DNS
   instructions it gives you, and paste those records into your domain
   registrar's DNS settings.

**Option B — GitHub Pages**
1. Create a new GitHub repository and upload this folder's contents to it.
2. In the repo, go to Settings → Pages → set Source to your main branch.
3. GitHub gives you a live URL (e.g. `yourname.github.io/repo-name`).
4. Add your custom domain in the same Pages settings screen, and add the
   DNS records it shows you at your domain registrar.

Either option costs nothing on an ongoing basis — you only pay for the
domain name itself.

## File structure

```
solar-system/
  index.html          — page structure and UI controls
  style.css            — visual design (dark observatory theme)
  js/
    orbitalMechanics.js — real orbital math (Kepler's equation, positions)
    planetData.js       — static facts, sizes, rotation periods
    textures.js          — procedural canvas textures (no image downloads)
    main.js              — scene setup, animation loop, all UI wiring
```

## Extending it later

Ideas from later conversation (not built here, since they need a backend/
hosting decision first): teacher "AI scenario builder" for custom what-if
simulations, quiz mode, accounts + subscriptions via Stripe, real eclipse/
conjunction prediction, retrograde motion trails, and day/night terminator
rendering on Earth. All are compatible with this same orbital-mechanics
foundation — the hard part (real physics) is already done here.
