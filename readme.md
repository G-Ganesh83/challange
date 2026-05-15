# 🕵️ Meme Panic Stealth — Project Analysis

## Overview

**Project Name:** `stealth-bedroom-prototype`  
**Game Title:** *Meme Panic Stealth*  
**Engine:** [Phaser 3](https://phaser.io/) `v3.80.1`  
**Build Tool:** [Vite](https://vitejs.dev/) `v5.4.10`  
**Type:** Browser-based 2D top-down stealth game (Tutorial Room / Room 1)

---

## 📁 Project Structure

```
challange/
├── index.html              # Game shell + HUD layout (DOM UI)
├── main.js                 # Phaser config + entry point
├── style.css               # Full visual design system
├── package.json            # Deps: phaser + vite
├── scenes/
│   └── GameScene.js        # ⭐ Core game logic (~1660 lines)
└── assets/
    ├── background/
    │   └── room.png
    ├── characters/
    │   ├── thief_idle.png, thief_walk_1.png, thief_walk_2.png, walk_up.png
    │   └── owner_sleep.png, owner_alert.png
    ├── furniture/
    │   ├── bed.png, closet.png, desk.png, chair.png, books.png, lamp.png, plant.png
    ├── props/
    │   ├── bottle.png, gem.png, gold.png, key.png
    └── sounds/
        ├── footstep.mp3, fahh.mp3, enter.mp3, pickup.mp3, core_transition.mp3
        ├── out.mp3, safe.mp3, transfer.mp3
```

---

## 🎮 Game Mechanics

### Player
- **Controls:** WASD / Arrow keys to move, SHIFT to sprint, E to interact/collect/escape
- **Collision:** 22×16 hitbox anchored to feet, collides with walls, furniture, and plant cores
- **Animation:** 4 textures (idle, walk L/R, walk up); frame-swapped at 140ms intervals
- **Physics:** Smooth velocity lerp (`0.28` factor), drag of `1000` on both axes

### Noise / Suspicion System
| Action | Noise Added | Risk Level |
|---|---|---|
| Sprinting | +0.12/sec | Low |
| Wall bump | +0.08 | Medium |
| Furniture bump | +0.06 | Medium |
| Plant bump | +0.04 | Low |
| Bottle pickup | +0.45 | High |
| Passive decay | −0.035/sec (−0.02 in chase) | - |

- **Thresholds:** `0.55` → owner stirs (?), `0.8` → **Chase Mode** triggered.

### Loot System
- **Total:** 4 items (Bottle, Gold, Key, Gem)
- **Mechanic:** Items must be collected before the exit unlocks. Trying to exit without all loot will shake the screen and deny the escape.

### ⏱ Timer & Urgency System
- **Timer:** Starts at `02:30` (150 seconds). 
- **Urgent State:** Under 30 seconds, timer turns red and blinks.
- **Full Panic Mode:** At `00:00`, the owner permanently wakes up (`TIME'S UP!`), triggering Chase Mode, intense screen shaking, and forcing the player into a clutch escape or getting caught.

### Safe Zone (Closet)
- Entering during chase fades the player and avoids detection.
- 5 seconds of staying hidden resets the owner back to sleep.

### Escape & Stealth Ranks
Escaping the room successfully triggers a cinematic fade out and awards a **Stealth Rank**:
- **PERFECT THIEF 🐱** (Low noise, no panic, no chase)
- **CLEAN ESCAPE 🕶️** (No panic, no chase)
- **SILENT RAT 🐀** (Successfully hid during a chase)
- **PANIC SURVIVOR 🏃** (Survived Time's Up chase)
- **CHAOS GOBLIN 🤌** (High noise, chaotic escape)

---

## 🖼️ Rendering & Visual Systems

- **Texture Pipeline:** Custom canvas-based image processor (`prepareVisualTexture`) auto-crops and keys out background colors to produce perfect pixel-art sprites.
- **Visual Polish:** 
  - Floating dust particles.
  - Ambient sinusoidal room glow, vignette, and floor shadows.
  - Exit door subtly pulses when all loot is collected.
  - Pulsing `ADD-blend` circles around uncollected items.
  - Player outline behind the sprite for readability.
  - UI shake animations when trying to exit early without all loot.

## 🎵 Audio
SFX are fully integrated with a `minGap` cooldown system to prevent audio spam:
- **Footsteps** interval shifts between walk (260ms) and sprint (180ms).
- Cinematic stingers on owner wake up, caught (`fahh`), and successful escapes.

---

## ✅ Latest Updates
- **Timer System:** Added full HUD timer with blinking urgent states.
- **Panic Mode:** Implemented a frantic final survival phase when time runs out.
- **Exit Polish:** Exit door rejects the player (with UI shake) if loot is missing. Pulses when ready.
- **End Screens:** Replaced instant restarts with "ESCAPED!" / "BUSTED!" overlays, rank evaluations, detailed stats (noise amount, chase count), and a Play Again button.
- **Desk Obstacle:** Removed the buggy desk collision to allow smooth pathing around the desk.

## 🚀 Suggested Next Steps
- **New Rooms/Levels:** Add sequential levels with new layouts.
- **Enemy Varieties:** Add guards or different obstacles with vision cones.
- **Loot Upgrades:** Add gadgets (like a noise-maker) to distract the owner.
- **Mobile Support:** Add touch controls / virtual joystick overlay.
