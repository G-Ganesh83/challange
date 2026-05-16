# TINY THIEF — Full Opening Flow

## Scenes to create
1. BootScene      — preloads all assets globally, then → IntroScene
2. IntroScene     — "GANESH GAMES" neon flicker ~2s → MainMenuScene
3. MainMenuScene  — rainy alley BG, thief silhouette, PLAY/SETTINGS/QUIT
4. MissionScene   — mission card, SPACE to start → GameScene
5. TransitionScene — room-complete cinematic between Room1 → Room2

## Existing scenes
- GameScene (Room1) — working
- Room2Scene        — working

## Audio
- Reuse existing sounds
- Generate music via `music` command: lofi stealth menu track
- Ambient rain, neon buzz via `sound-effects`
- AudioManager singleton for cross-scene fade

## Key connections
main.js → [BootScene, IntroScene, MainMenuScene, MissionScene, GameScene, Room2Scene, TransitionScene]

## Status
- [ ] BootScene
- [ ] IntroScene
- [ ] MainMenuScene (generated BG image)
- [ ] MissionScene
- [ ] TransitionScene
- [ ] AudioManager
- [ ] Wire main.js
- [ ] Test full flow
