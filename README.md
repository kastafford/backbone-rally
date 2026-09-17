# Backbone Rally

A browser marble racer: follow a real protein's N-to-C backbone through helices, sheets, and loops.

**[Play Backbone Rally in your browser →](https://kastafford.github.io/backbone-rally/)**

*Coming soon: the game is currently being tested privately. This project URL will become available when GitHub Pages is enabled.*

Built by Kate Stafford **with Astra in Codex**—a deliberately vibe-coded experiment in turning a protein-structure game idea into something playable. Kate supplied the concept, scientific direction, and playtesting feedback; Astra wrote and iterated on the game, visuals, sound effects, trailer, and deployment setup. The game uses Three.js and Vite.

[Watch or download the 20-second trailer](public/media/backbone-rally-trailer.mp4). The deployed site also includes a `trailer.html` watch page.

## How to play

- W / up: accelerate; S / down: brake.
- A / left and D / right: steer across the ribbon.
- Space: jump. Shift: consume a collected water for a short boost.
- Escape: pause. R: restart the race.
- Reach the C terminus to win. Falls return you to the latest checkpoint; time continues running.
- Drag and scroll the overview to inspect the protein. Touch steering, throttle, braking, and jump controls appear on narrow screens during a race.

Crambin (1CRN, 46 residues), ubiquitin (1UBQ, 76 residues), and myoglobin (1MBN, 153 residues) are bundled locally. Other classic four-character PDB IDs download directly from RCSB over HTTPS. Invalid IDs, network failures, and unsupported structures produce an inline error and preserve the previous course. Best completion times are saved locally per PDB ID.

The marble has a camera-facing 3D face independent of its rolling shell. Pupils track the upcoming ribbon; it blinks, smiles with sparkles for waters and boosts, winces after collisions, and frowns with tears during falls and briefly after respawning. Jumps get a surprised expression. Reactions freeze while paused.

Short original synthesized effects play for starting, jumping/landing, collecting waters, boosts, bumps, checkpoints, falls, respawning, and finishing. There is no background music during play. Use **Sound on/off** to mute; the preference is saved locally. Audio starts after a user gesture and is cancelled on pause or restart.

## Develop locally

These instructions are for running your own copy after cloning the repository. Once published, the hosted GitHub Pages version requires no checkout or installation.

From the checked-out repository directory:

```sh
npm ci
npm run dev
```

For local development, open http://127.0.0.1:5173. Requires a current WebGL-capable browser and Node.js 22.12+ (or a newer supported Node release).

```sh
npm test      # parsing, shortcut discovery, reactions, and sound lifecycle
npm run build # production output in dist/
npm run preview
```

## Molecular model and deliberate simplifications

The centerline is a centripetal Catmull–Rom spline through experimental Cα coordinates. HELIX and SHEET records determine terrain colors and widths. Parallel-transport frames orient the ribbon; this is a game track, not a conventional carbonyl-oriented molecular cartoon renderer. It retains the folded 3D centerline, with game-scale track widths.

Only the first model and first protein chain with Cα atoms are used, with blank/A alternate conformations deduplicated by residue and insertion code. Chains from 8 to 600 resolved residues are supported. This prototype accepts legacy PDB format, not mmCIF or extended accessions. Structures without HELIX/SHEET annotations appear as loops; secondary structure is not inferred.

Arc-length distance and lateral momentum drive the marble. Adhesion keeps it on curved and inverted track surfaces; jumping lifts it along the local normal. This is intentionally arcade physics, without full world-space rigid-body collisions. Every course runs a deterministic search for up to two shortcuts between nearby, sequence-distant sections. Each shortcut skips at most 20% of the ribbon and at most 80 Å along the course, so even two hops leave most of the run to play. The search favors wider landings and structured terrain, excludes endpoints near gaps and obstacles, and samples candidate arcs for ribbon clearance. It tries several arc heights and separates launch zones to avoid redundant choices. Structures without suitable routes show a clear message. Near a cyan launch ring, hold Jump to pause forward motion and preview the flight. A/D moves the landing point; release Jump to leap. A red ring means the landing misses the ribbon. Successful landings set a checkpoint; missed landings return to the previous checkpoint. The camera turns toward the destination strand. Ordinary jumps elsewhere behave as before. Transfers follow a guided world-space arc; they are not a general-purpose ballistic or atom-level collision simulation. The bundled and custom-PDB courses use the same discovery code. Flight paths remain guided; the clearance check is a sampled approximation, not continuous collision detection.

Dark red water spheres and tryptophan side-chain obstacles are procedurally placed gameplay objects. Waters use an oxygen-style sphere without explicit hydrogens. The obstacles use the 10 heavy atoms and 11 bonds of an ideal tryptophan side chain from the [RCSB Chemical Component Dictionary](https://files.rcsb.org/ligands/download/TRP.cif), scaled for gameplay; carbon atoms are warm tan and nitrogen is blue. Each obstacle is merged into three meshes to keep rendering inexpensive. These objects do **not** represent waters or side chains at their experimental positions in the selected protein.

The terrain palette is dusty rose for helices, soft gold for sheets, and muted teal for loops.

Cα discontinuities over 5.5 Å flag backbone breaks. Short breaks (up to 16 Å of spline) omit the middle 40% of ribbon to create jumpable gaps. Longer breaks are bridged to keep the course traversable. The UI reports breaks when present. The three bundled structures have continuous backbones. Other folds can self-intersect or produce awkward tracks; arbitrary-PDB playability is experimental.

During a race, the immediate track stays solid and the rest of the fold becomes a faint context outline, preventing other folds from hiding the marble. The course overview shows the whole ribbon.

## Data and implementation

- [Crambin / 1CRN](https://www.rcsb.org/structure/1CRN)
- [Ubiquitin / 1UBQ](https://www.rcsb.org/structure/1UBQ)
- [Myoglobin / 1MBN](https://www.rcsb.org/structure/1MBN)
- Coordinates downloaded from [RCSB PDB](https://www.rcsb.org/); bundled in `public/structures/`.
- `src/protein.js`: PDB parser and shared formatting.
- `src/main.js`: course geometry, game state, rendering, and controls.
- `src/style.css`: responsive interface.
- `src/marble-face.js`: 3D face, gaze tracking, and timed reactions.

- `src/shortcut-discovery.js`: finds up to two local fold shortcuts with sampled clearance checks.
- `src/jump.js` and `src/shortcuts.js`: jump arcs, aiming, flight, and landing.
- `src/progress-shortcuts.js`: shortcut positions on the N-to-C progress bar.
- `src/sidechain.js` and `src/tryptophan.json`: inexpensive ball-and-stick obstacles.
- `src/sound.js`: gesture-activated Web Audio sound effects.
- `src/trailer.js`: development-only cinematic staging and canvas recording.
- `public/trailer.html` and `public/media/`: static trailer player and final MP4.

To change course feel, start with `sample()`, `makeCourse()`, and `updateGame()` in `src/main.js`. To change shortcut selection, start with `findShortcuts()` in `src/shortcut-discovery.js`. Tests live alongside their modules and use Node's built-in test runner.

Future possibilities: better ribbon orientation at tight turns, generated difficulty ratings, experimental atom positions for obstacles, and gamepad support.

## Promotional trailer

Open `http://127.0.0.1:5173/?trailer=1` while running the development server, then click **Record 20-second trailer**. This opt-in page stages an in-engine montage using the same course and character assets; it does not change ordinary gameplay or saved race records. It includes an orbit overview, a driving/jumping shot, a sad-face fall, a preview/flight/landing on an actual discovered fold shortcut, and a C-terminus celebration. The stripe is hidden in cinematic close-ups to keep expressions unobscured. During the fall, the sphere clears the solid ribbon before dropping; its contact shadow fades at the edge. Tears originate beneath the eyes and fade as they descend.

The local-only Vite export middleware saves the recording in `artifacts/`. `scripts/trailer-audio.py` synthesizes an original music bed and expression cues without external recordings. The final MP4 combines this audio with the browser capture.


The final H.264/AAC trailer is tracked at `public/media/backbone-rally-trailer.mp4` (about 3.7 MB). Old takes, review images, raw recordings, and generated audio in `artifacts/` are ignored. To regenerate it, install Python 3 and FFmpeg, record using the development page above, then run:

```sh
sh scripts/render-trailer.sh
```

Set `FFMPEG=/path/to/ffmpeg` if it is not on your PATH. The script replaces the tracked final MP4, synthesizes the soundtrack, and exports exactly 20 seconds at 1280 × 720, 30 fps. Neither Python nor FFmpeg is needed to play, build, or deploy the game. Trailer recording is available only in development; the published site plays the finished video.

## Publish on GitHub Pages

The site is entirely static: no backend, API key, database, or paid service is required. The workflow in `.github/workflows/pages.yml` installs the lockfile, runs the tests, builds the site, and deploys `dist/` on pushes to `main` only when the repository variable `PUBLISH_PAGES` is `true`. Pull requests run the tests and build without deploying.

This project's repository is [kastafford/backbone-rally](https://github.com/kastafford/backbone-rally), owned by Kate's personal account. Both the source repository and website are being kept private during testing: the repository is private and the website is **not deployed**. GitHub Pages on a personal account would expose the website publicly even with a private source repository, so publication is explicitly gated.

When ready to publish:

1. Decide whether to make the repository public as well. Publishing from a private personal repository requires GitHub Pro; a public repository supports Pages on GitHub Free.
2. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
3. In **Settings → Secrets and variables → Actions → Variables**, create a repository variable named `PUBLISH_PAGES` with the value `true`. This enables public website deployment.
4. Open **Actions → Test and deploy GitHub Pages → Run workflow**.
5. Play at **https://kastafford.github.io/backbone-rally/** or watch the trailer at **https://kastafford.github.io/backbone-rally/trailer.html**. This project site leaves `kastafford.github.io` available for a separate personal site.

While `PUBLISH_PAGES` is unset or false, pushes and pull requests run tests and builds only. After a site has been published, turning the variable off stops future deployments; it does not unpublish the existing site. Use Settings → Pages to unpublish it if needed.

Vite uses relative asset URLs, including the bundled PDB fetches, so any repository name works without editing paths. It also works at a user-site root or custom domain. See the [official Vite deployment guide](https://vite.dev/guide/static-deploy#github-pages) for GitHub's setup steps. Only built files are uploaded; the development recording endpoint is not deployed.

Custom structures require a browser connection to `files.rcsb.org`; the three bundled courses need no PDB download from an external service. Google Fonts is optional and falls back to local fonts. Scores and sound preferences remain in the player's browser.

## Repository history

The initial commits separate protein parsing/shortcut search, the playable game, trailer assets and recording, Pages deployment, and this guide. Dependencies, generated builds, and intermediate trailer artifacts are excluded. Use `git log --oneline --reverse` to explore the implementation in that order.
