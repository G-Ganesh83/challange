# Heist Game — Task Tracker

## DONE
- [x] OwnerAI: alert phase (2.2s look-around before chase), triggers from sleeping+patrol
- [x] NoiseSystem: tiered suspicion decay (0-25 fast → 75-100 very slow)
- [x] TimerSystem: configurable duration, Room 1 = 90s
- [x] GameScene: onCaught() fixed (no chaseMode guard, safeZone protects)
- [x] GameScene: ownerSleepTexture / ownerSleepScale scene props set
- [x] OwnerAI.resetToSleep: now uses scene.ownerSleepTexture / ownerSleepScale
- [x] Room2Scene: COMPLETE fresh build
  - Reference image layout followed
  - TOP-LEFT: cpDesk + gamingChair
  - TOP-CENTER: gmgTable (shelf)
  - TOP-RIGHT: wardrobe (SAFE ZONE, cyan glow)
  - BOTTOM-LEFT: techBag + plant1
  - BOTTOM-RIGHT: sofa (owner) + plant2
  - MID-RIGHT: cable zone (60px glowing ring, passive noise)
  - 5 loot items: GPU, headphones, keyboard, mouse, USB
  - Harder AI: wakeThreshold 0.72, chaseSpeed 88, patrol 5 points
  - 120s timer
  - FurnitureSystem footprints for all pieces
  - Full systems: noise, timer, ownerAI, rankSystem, safe zone, exit

## KNOWN MINOR THINGS
- owner2.png is a full scene PNG (same 1536x1024 as bg) — _cropTex handles it
  but it may show as a flat image. If owner looks bad in-game, swap to char asset.
- Git push still failing (no credentials). User aware.

## TODO
- Test in-browser: press 2 in Room 1 to jump to Room 2
- If owner texture looks wrong, may need dedicated owner character PNG for Room 2
- Room 3 (future)
