# Stick Fight Club

First playable desktop survival slice. Vite + TypeScript + Phaser 3; no external assets, accounts, or backend.

## Run

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` typechecks and creates `dist/`; `npm run preview` serves that production build. `npm test` checks combat interactions, healing, collision reactions, difficulty and score invariants (Node 22.18+).

## Controls

| Key | Action |
| --- | --- |
| Left / Right arrows | Move left / right through the hallway |
| Ctrl + Left / Right | Sprint (uses stamina) |
| Space | Jump |
| A | Punch / hand attacks |
| S | Kick / foot attacks |
| A, A, S | Rising kick launcher |
| Up + A | Uppercut |
| Down + S or airborne S | Ground slam / aerial kick |
| D | Rising launcher kick; follow with Space, then A / S in midair |
| W | Dodge |
| Escape | Pause / resume |
| M | Toggle impact audio |
| Enter / click | Start or restart |

Holding Ctrl while moving sprints at 480 units/second and drains 28 stamina/second. Stamina refills at 22/second after a 0.65-second delay; exhaustion requires 20 stamina before sprinting resumes. Only sprinting toward an opponent creates directional motion blur trails and speed lines. Up/Down are attack modifiers, not depth movement.
Enemies telegraph attacks with a red marker. Heavyweights arrive after 35 seconds when a spawn slot is available, then every 42 seconds. Killing one heals exactly 12 HP, capped at 100. There is no regeneration.

## Architecture

- `src/game/Arena.ts`: scene, combat orchestration, AI, spawn loop, body integration, HUD, restart.
- `src/game/Fighter.ts`: fighter state and attack data.
- `src/game/StickFigure.ts`: rounded articulated limbs, two-segment joint solving, grounded fighting stances, smoothed attack poses and body-centered launch rotation.
- `src/game/Hallway.ts`: repeating hallway architecture and parallax marks; the scene follows the player horizontally while the HUD stays fixed.
- `src/game/Input.ts`: keyboard-to-action adapter, separated for a future controller adapter.
- `src/game/balance.ts`: difficulty caps, health, movement and score tuning.
- `src/game/Sound.ts`: optional synthesized impact audio.

## Scope and compromises

This is a combat prototype, not a completed animation system. Characters use procedural joints and continuous attack curves, with smoothed pose transitions across cancels. Physics uses a separate jump height above a fixed hallway floor, axis-based hit volumes, gravity, friction, floor bounce and whole-body tumble. It is ragdoll-like, not a constrained per-limb physics simulation. AI is deliberately simple. The scene keeps orchestration in one place; rendering, state, input, sound and balance are separate. Some attack values remain next to the combat code pending tuning.

Normal enemies have 80 HP; Fatty has 160. Active enemies cap at 12 and corpses at 10 with a 2.6-second lifetime. Collision checks are bounded. Performance targets 60 FPS but needs profiling on target hardware.

## First playtest priorities

1. Run into an enemy, A → A → S, Space, A or S. Tune launcher height, follow speed and air hit reach before adding features.
2. Press D near an enemy, wait briefly, jump with Space, then punch with A or spike them down with S. Check air reach and follow-up timing.
3. Tune pose curves, punch reach, input buffer and recovery; add better grounded knockdown poses.
4. Test Fatty at low health and tune its telegraph, weight and frequency.
5. Test a six-minute survival run for difficulty, readability and frame pacing.

No campaign, progression, inventory, multiplayer or additional enemy types are included.



The hallway is a bounded arena `B.arenaWidth` units wide with walls at both ends; the camera and the player both stop there, so retreating forever is no longer an option. Up/Down only modify attacks; they do not move characters in depth. Enemies walk in from just beyond the view on either side, falling back to the far side when the player is pinned against a wall.



## Combat animation and pacing

Enemies are dark red from head to feet; the player remains black. Normal grounded punches and kicks use a short held pain pose rather than launching the target. Jab/cross alternates arms, kicks have a wind-up and impact hold, and aerial kicks tuck the legs before extension. Deaths collapse onto the floor and settle before fading.

Fatty takes damage from launcher/rising kicks but cannot be lifted by kicks. The opening caps active enemies at two for 0–20 seconds, three for 20–50 seconds, then four and gradually more (maximum 12). Spawn intervals start at 2.5 seconds and aggression increases over time. Enemies start at 150 units/second and top out at 210, which keeps them slower than the 285 walk and well under the 480 sprint.
