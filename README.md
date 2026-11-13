# DESKBORN — Seed

A hands-first mixed-reality game for the Meta VR Start Developer Competition 2026.

## Current build: 0.4 — Storm + Open-Palm Shield

The core five-minute loop now includes a dramatic hand-driven event:

- Mixed-reality surface placement with IWSDK environment raycast
- Seed planting and miniature village growth
- 8 autonomous citizens with hover, pinch/hold grab, move and release
- Citizens panic and run toward the village center when danger arrives
- Storm clouds, rain streaks and darker lighting
- Real open-hand protection using tracked right-hand position + pinch strength
- A glowing shield follows the open hand above the village
- Protection is scored by keeping the shield centered during the storm
- Clear village-saved / village-damaged result state
- Lightweight procedural visuals designed for Quest performance

## Run

```powershell
cd C:\Users\dmano\Downloads\DESKBORN
git pull
npm install
npm run dev
```

If dependencies are already installed, future runs only need:

```powershell
git pull
npm run dev
```

## Test sequence

1. Place the seed on the coffee table.
2. Wait for the miniature village to finish growing.
3. Confirm citizens walk and remain grabbable.
4. After about 6 seconds, the storm warning begins and citizens panic.
5. About 2.5 seconds later, rain starts.
6. Switch/use the right tracked hand and hold an **open palm** above the village center.
7. A cyan/green shield should appear beneath the hand.
8. Keep the palm centered for at least half of the 10-second storm.
9. Verify the result says **VILLAGE SAVED**.
10. Reset with `R` and allow the storm to pass without shielding; verify **VILLAGE DAMAGED**.

### Emulator fallback

For quick desktop verification only, hold the `H` key during the storm to simulate a perfectly centered open-palm shield. This is a test fallback; the real gameplay path uses tracked hand position and open-hand state.

Press `R` to reset the whole experience.

## Stack

Meta IWSDK · WebXR · TypeScript · Three.js · Vite
