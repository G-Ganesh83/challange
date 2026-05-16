# Room 2 Plan

## Architecture
- New Phaser Scene: `Room2Scene.js` in `scenes/`
- Reuses all 5 systems (NoiseSystem, LootSystem, OwnerAI, TimerSystem, RankSystem)
- Player passes in automatically from Room 1 escape via `this.scene.start('Room2Scene')`
- `main.js` must register Room2Scene

## Room 2 Identity: Gamer / Tech Room
- Atmosphere: dark, RGB lighting overlay, slightly chaotic, cozy-but-intense
- Same 960x640 canvas, same room.png background with RGB color grading
- Furniture: gaming desk, PC tower, monitor, chair, shelves, cables on floor
- Uses existing asset keys where possible + new ones for tech props

## Loot Items (5 total)
1. `headphones` — near desk, medium risk, noise 0.06
2. `keyboard`   — on desk, medium risk, noise 0.08
3. `gaming_mouse` — desk corner, low risk, noise 0.04
4. `gpu`         — near PC/shelf, high risk, noise 0.10
5. `crypto`      — hidden corner joke item, low noise 0.03

## New Mechanic: Noisy Floor Zone
- A rectangular "cable zone" area on the floor (visually: slightly different overlay)
- When player walks through it, `noiseSystem.add(0.008 * delta/16)` per frame
- Subtle visual: flickering orange/red tint overlay on that zone
- Prompt appears first time: "Careful — cables crunch underfoot!"

## Owner Changes (Room 2 harder)
- Chase speed: 72 → 95
- Stir threshold: noise >= 0.45 (was 0.55)
- Wake threshold: noise >= 0.65 (was 0.80)
- Timer: 120s (was 150s)
- Owner PATROLS when not chasing:
  - 3 patrol waypoints across the room
  - Moves slowly (speed ~38) between them
  - If patrol path crosses cable zone, increases noise slightly

## Owner Patrol Logic (in OwnerAI or new PatrolOwnerAI)
- Option: extend OwnerAI with a `patrolPoints` config + patrol state
- Cleanest: pass `config` object to OwnerAI constructor with overrides
- Add patrol state to existing state machine: sleeping → patrol → stir → chase

## Files to create/modify
1. `scenes/Room2Scene.js` — new full scene (mirrors GameScene structure)
2. `scenes/systems/OwnerAI.js` — add patrol support via config
3. `main.js` — register Room2Scene
4. `scenes/GameScene.js` — change `completeRoom()` to `scene.start('Room2Scene')`

## Sequence
1. Patch OwnerAI for configurable thresholds + patrol
2. Write Room2Scene
3. Wire up main.js + GameScene transition
4. Test

## Risks
- No new art assets yet — use placeholder colored rectangles for new loot, 
  or reuse existing sprite keys with tint. Decision: reuse gem/gold/key/bottle
  with tints + rename in HUD until real art lands.
- Cable zone rect must not overlap safe zone or exit zone.
