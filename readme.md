# Tiny Thief

Tiny Thief is a browser-based 2D stealth game built with Phaser 3 and Vite.
The current version is a polished two-room prototype with a cinematic intro,
main menu, mission briefing, room transition, sound-based stealth, loot-gated
escape, timer pressure, chase states, audio controls, and end screens.

## Tech Stack

- Phaser 3 for canvas rendering, Arcade physics, tweens, audio, and scenes
- Vite for local development and production builds
- Plain HTML/CSS for the outer HUD, sidebar, objective panel, and end screen
- ES modules for scene and system organization

## Run The Project

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://127.0.0.1:5173/
```

Build for production:

```bash
npm run build
```

## Controls

| Input | Action |
| --- | --- |
| W / A / S / D | Move |
| Arrow keys | Move |
| Shift | Run, creates more noise |
| E | Interact, collect loot, hide, escape |
| 1 | Dev shortcut to Room 1 from Room 2 |
| 2 | Dev shortcut to Room 2 from Room 1 |

## Game Flow

```text
BootScene
  -> IntroScene
  -> MainMenuScene
  -> MissionScene
  -> GameScene
  -> TransitionScene
  -> Room2Scene
```

- `BootScene` preloads shared images and audio.
- `IntroScene` shows the "GANESH GAMES" neon intro.
- `MainMenuScene` shows the rainy neon menu.
- `MissionScene` explains the rules before the heist starts.
- `GameScene` is Room 1, the tutorial/cozy bedroom heist.
- `TransitionScene` plays a cinematic inter-room transition.
- `Room2Scene` is the harder gamer/tech room.

## Gameplay

The player must collect every loot item in the current room and escape through
the exit without getting caught. Noise events are direct and dangerous: wall
bumps, furniture bumps, loud running, and noisy interactions can wake the owner
or trigger a chase.

Room 1 has 4 loot items:

- Bottle
- Gold
- Key
- Gem

Room 2 has 5 loot items:

- GPU
- Headphones
- Keyboard
- Gaming Mouse
- Crypto USB

Each room has a safe zone:

- Room 1: closet
- Room 2: wardrobe

If the owner wakes up, enter the safe zone or wardrobe quickly and stay there
for about 5 seconds to calm the owner down.

## Core Systems

The project has reusable systems under `scenes/systems/`:

- `NoiseSystem.js` tracks internal noise events and forwards sound reactions.
- `OwnerAI.js` controls sleep, stir, alert, patrol, chase, and reset behavior.
- `LootSystem.js` controls Room 1 loot creation, pickup, VFX, and HUD syncing.
- `TimerSystem.js` controls countdown, urgent state, and full panic mode.
- `RankSystem.js` calculates escape/busted results and renders end screens.
- `FurnitureSystem.js` creates invisible furniture collision footprints.
- `AudioManager.js` stores global ambient/SFX mute state across scenes.
- `MuteButton.js` renders the in-game audio toggle buttons.

Room 2 currently has its own local loot methods inside `Room2Scene.js` because
its loot set and risk rules differ from Room 1.

## Project Structure

```text
challange/
├── index.html
├── main.js
├── style.css
├── package.json
├── vite.config.js
├── scenes/
│   ├── BootScene.js
│   ├── IntroScene.js
│   ├── MainMenuScene.js
│   ├── MissionScene.js
│   ├── GameScene.js
│   ├── Room2Scene.js
│   ├── TransitionScene.js
│   └── systems/
│       ├── AudioManager.js
│       ├── FurnitureSystem.js
│       ├── LootSystem.js
│       ├── MuteButton.js
│       ├── NoiseSystem.js
│       ├── OwnerAI.js
│       ├── RankSystem.js
│       └── TimerSystem.js
├── assets/
│   ├── background/
│   ├── characters/
│   ├── furniture/
│   ├── props/
│   ├── room2/
│   └── sounds/
├── public/assets/
└── projectAnalysis.md
```

## Debugging

Append this query string to the local URL to show wall and furniture collision
overlays:

```text
?debugWalls=true
```

Example:

```text
http://127.0.0.1:5173/?debugWalls=true
```

## Current Known Cleanup Items

- Room 2 footstep audio should respect the SFX mute toggle.
- The DOM HUD/sidebar starts with Room 1 copy and should become scene-aware.
- `assets/` and `public/assets/` currently duplicate the same media.
- Some assets are preloaded in `BootScene` and again in gameplay scenes.
- `projectAnalysis.md` should stay in sync as rooms and systems evolve.
