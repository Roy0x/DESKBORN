# DESKBORN — Seed

A hands-first mixed-reality game for the Meta VR Start Developer Competition 2026.

## Current build: 0.3 — Living Citizens + Hand Interaction

- Meta IWSDK / WebXR
- Mixed-reality passthrough
- Environment raycast / hit-test surface placement
- Green placement reticle on valid horizontal surfaces
- Pinch/select plants the seed and grows the miniature village
- 8 lightweight autonomous citizens wander around the settlement
- Hand-ray hover gives visual feedback
- Pinch-and-hold grabs a citizen; move your hand and release to relocate them
- Citizens pause while targeted to make hand acquisition comfortable
- Lightweight procedural Three.js visuals designed for Quest performance

## Run locally

First setup:

```powershell
git clone https://github.com/Roy0x/DESKBORN.git
cd DESKBORN
npm install
npm run dev
```

After future updates:

```powershell
cd DESKBORN
git pull
npm run dev
```

Open the HTTPS runtime URL reported by IWSDK and enter XR.

### Emulator testing

Aim the right-hand/controller ray at a tabletop and select to plant.
After the village finishes growing, target a citizen and pinch/select-hold to grab.
Press `Space` as a desktop placement fallback.
Press `R` to reset the experience.

## Stack

Meta IWSDK · WebXR · TypeScript · Three.js · Vite
