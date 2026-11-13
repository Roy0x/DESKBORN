# DESKBORN — Seed

A hands-first mixed-reality game for the Meta VR Start Developer Competition 2026.

## Current build: 0.5 — XR-Native Presentation

Build 0.5 keeps the verified interaction loop and moves the important onboarding and game-state communication into the XR world itself.

### Core loop

- Meta IWSDK / WebXR mixed reality
- Surface hit-test and seed placement on a real tabletop
- Miniature village growth
- 8 autonomous citizens
- Hand/controller ray hover
- Pinch/select hold to grab, move and release citizens
- Storm warning and citizen panic
- Rain, clouds and darker storm lighting
- Open-right-hand shield over the settlement
- Desktop `H` fallback for shield verification
- Saved and damaged outcomes

### New in build 0.5

- XR-native floating instruction panel beside the placement seed
- In-world planting instructions visible after entering XR
- In-world citizen interaction guidance
- In-world storm warning
- In-world shield/protection status
- In-world **VILLAGE SAVED** and **VILLAGE DAMAGED** results
- Color-coded neutral / action / success / danger states
- Browser HUD retained as a desktop debugging companion

## Update and run

```powershell
cd C:\Users\dmano\Desktop\DESKBORN-LIVE
git pull
npm install
npm run typecheck
npm run build
npm run dev
```

After dependencies are installed and unchanged:

```powershell
cd C:\Users\dmano\Desktop\DESKBORN-LIVE
git pull
npm run dev
```

## Build 0.5 verification

1. Enter XR and confirm a floating **Aim at a surface** panel is visible with the seed.
2. Aim at the coffee table; confirm it changes to **Pinch / trigger to plant**.
3. Plant the village.
4. Confirm the XR panel moves to the village experience and gives citizen guidance.
5. Target/grab/release a citizen and confirm the in-world panel changes state.
6. Wait for the storm and confirm the warning appears inside XR.
7. During the storm, confirm protection/time status is visible inside XR.
8. Hold `H` for desktop shield testing and confirm the in-world result says **VILLAGE SAVED**.
9. Reset with `R`, let the storm pass unprotected, and confirm **VILLAGE DAMAGED**.

## Stack

Meta IWSDK · WebXR · TypeScript · Three.js · Vite
